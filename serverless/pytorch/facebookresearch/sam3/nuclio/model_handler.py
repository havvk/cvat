import torch
import torch.nn.functional as F
import hashlib
from PIL.Image import Image
from transformers import Sam3TrackerProcessor, Sam3TrackerModel
import numpy as np
from collections import OrderedDict

class LRUCache:
    def __init__(self, maxsize=8):
        self._cache = OrderedDict()
        self._maxsize = maxsize

    def get(self, key):
        if key in self._cache:
            self._cache.move_to_end(key)
            return self._cache[key]
        return None

    def put(self, key, value):
        if key in self._cache:
            self._cache.move_to_end(key)
        else:
            if len(self._cache) >= self._maxsize:
                self._cache.popitem(last=False)
        self._cache[key] = value

class ModelHandler:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model_path = "/models/sam3"
        self.model = Sam3TrackerModel.from_pretrained(self.model_path).to(self.device).eval()
        self.processor = Sam3TrackerProcessor.from_pretrained(self.model_path)
        self.embedding_cache = LRUCache(maxsize=8)
        
        if torch.cuda.is_available() and torch.cuda.get_device_properties(0).major >= 8:
            torch.backends.cuda.matmul.allow_tf32 = True
            torch.backends.cudnn.allow_tf32 = True

    def _get_image_hash(self, image):
        small = image.resize((64, 64))
        return hashlib.md5(small.tobytes()).hexdigest()

    def handle(self, image, obj_bbox, pos_points, neg_points):
        with torch.inference_mode():
            assert isinstance(image, Image)
            orig_w, orig_h = image.size
            
            points = []
            labels = []
            for p in pos_points:
                points.append(p)
                labels.append(1)
            for p in neg_points:
                points.append(p)
                labels.append(0)
                
            input_boxes = None
            input_points = None
            input_labels = None
            
            if len(points) == 0 and obj_bbox:
                input_boxes = [[obj_bbox]]
            else:
                input_points = [[points]]
                input_labels = [[labels]]
                if obj_bbox:
                    input_boxes = [[obj_bbox]]

            img_hash = self._get_image_hash(image)
            cached_embeddings = self.embedding_cache.get(img_hash)
            
            if cached_embeddings is not None:
                # === FAST PATH: cached embeddings, only run decoder ===
                image_embeddings = cached_embeddings["image_embeddings"]
                image_pe = cached_embeddings["image_pe"]
                
                input_image_size = self.model.config.vision_config.image_size
                
                if len(points) > 0:
                    pt = torch.tensor([[points]], dtype=torch.float32, device=self.device)
                    pt[:, :, :, 0] = pt[:, :, :, 0] * (input_image_size / orig_w)
                    pt[:, :, :, 1] = pt[:, :, :, 1] * (input_image_size / orig_h)
                    lb = torch.tensor([[labels]], dtype=torch.int32, device=self.device)
                else:
                    pt = torch.zeros(1, 1, 1, 2, dtype=torch.float32, device=self.device)
                    lb = -torch.ones(1, 1, 1, dtype=torch.int32, device=self.device)
                
                box_input = None
                if obj_bbox:
                    box = [
                        obj_bbox[0] * input_image_size / orig_w,
                        obj_bbox[1] * input_image_size / orig_h,
                        obj_bbox[2] * input_image_size / orig_w,
                        obj_bbox[3] * input_image_size / orig_h,
                    ]
                    box_input = torch.tensor([[box]], dtype=torch.float32, device=self.device)
                
                sparse_embeddings, dense_embeddings = self.model.prompt_encoder(
                    input_points=pt,
                    input_labels=lb,
                    input_boxes=box_input,
                    input_masks=None,
                )
                
                low_res_masks, iou_scores, _, _ = self.model.mask_decoder(
                    image_embeddings=image_embeddings[-1],
                    image_positional_embeddings=image_pe,
                    sparse_prompt_embeddings=sparse_embeddings,
                    dense_prompt_embeddings=dense_embeddings,
                    multimask_output=True,
                    high_resolution_features=image_embeddings[:-1],
                )
            else:
                # === SLOW PATH: Full model, cache embeddings ===
                inputs = self.processor(
                    images=image, 
                    input_points=input_points, 
                    input_labels=input_labels, 
                    input_boxes=input_boxes,
                    return_tensors="pt"
                ).to(self.device)
                
                outputs = self.model(**inputs)
                
                low_res_masks = outputs.pred_masks
                iou_scores = outputs.iou_scores
                
                if outputs.image_embeddings is not None:
                    image_pe = self.model.get_image_wide_positional_embeddings()
                    image_pe = image_pe.repeat(1, 1, 1, 1)
                    self.embedding_cache.put(img_hash, {
                        "image_embeddings": outputs.image_embeddings,
                        "image_pe": image_pe,
                    })
            
            pred_masks = low_res_masks[0, 0]
            iou = iou_scores[0, 0]
            
            best_idx = iou.argmax().item()
            best_mask = pred_masks[best_idx:best_idx+1].unsqueeze(0)
            
            mask_resized = F.interpolate(best_mask, size=(orig_h, orig_w), mode="bilinear", align_corners=False)
            mask_binarized = (mask_resized.sigmoid() > 0.5).squeeze().cpu().numpy()
            
            return mask_binarized
