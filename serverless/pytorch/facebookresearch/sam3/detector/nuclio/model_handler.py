import os
import torch
import torch.nn.functional as F
import numpy as np
from PIL import Image
from skimage.measure import find_contours, approximate_polygon
from transformers import Sam3Model, Sam3Processor

class ModelHandler:
    def __init__(self, labels):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model_path = os.environ.get("SAM3_MODEL_PATH", "/opt/nuclio/models/sam3")
        self.labels = labels

        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.allow_tf32 = True

        print(f"Loading SAM3 Model from {self.model_path} onto {self.device}")
        self.model = Sam3Model.from_pretrained(self.model_path).to(self.device).eval()
        self.processor = Sam3Processor.from_pretrained(self.model_path)
        print("Model loaded successfully.")

    def infer(self, image, default_threshold):
        results = []

        concept_prompts = [name for id, name in self.labels.items() if name.lower() != 'background']
        if not concept_prompts:
            concept_prompts = ["object"]

        print(f"Running SAM3 PCS detection for concepts: {concept_prompts}")
        orig_w, orig_h = image.size

        for prompt in concept_prompts:
            inputs = self.processor(
                images=image,
                text=[prompt],
                return_tensors="pt"
            ).to(self.device)

            with torch.inference_mode():
                outputs = self.model(**inputs)

            # SAM3 (DETR-style) outputs:
            #   pred_masks: [batch, num_queries, mask_h, mask_w]  e.g. [1, 200, 288, 288]
            #   pred_logits: [batch, num_queries]  e.g. [1, 200]
            #   pred_boxes: [batch, num_queries, 4]
            pred_logits = outputs.pred_logits[0]  # [200]
            pred_masks = outputs.pred_masks[0]    # [200, 288, 288]

            # Convert logits to confidence scores via sigmoid
            confidences = pred_logits.sigmoid()

            # Filter by threshold
            keep = confidences > default_threshold
            keep_indices = keep.nonzero(as_tuple=True)[0]

            for idx in keep_indices:
                conf = float(confidences[idx].item())
                mask = pred_masks[idx]  # [288, 288]

                # Resize mask to original image size
                mask_resized = F.interpolate(
                    mask.unsqueeze(0).unsqueeze(0).float(),
                    size=(orig_h, orig_w),
                    mode="bilinear",
                    align_corners=False
                ).squeeze()

                # Binarize
                mask_np = (mask_resized.sigmoid() > 0.5).cpu().numpy().astype(np.uint8)

                # Skip empty masks
                if mask_np.sum() == 0:
                    continue

                contours = find_contours(mask_np, 0.5)

                for contour in contours:
                    contour = np.flip(contour, axis=1)  # (row, col) -> (x, y)
                    contour = approximate_polygon(contour, tolerance=2.0)
                    if len(contour) < 3:
                        continue

                    results.append({
                        "confidence": str(conf),
                        "label": prompt,
                        "points": contour.ravel().tolist(),
                        "type": "polygon"
                    })

        return results
