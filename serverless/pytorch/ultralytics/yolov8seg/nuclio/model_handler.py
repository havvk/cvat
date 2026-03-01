import os
import torch
import numpy as np
from PIL import Image
from skimage.measure import find_contours, approximate_polygon
from ultralytics import YOLO

class ModelHandler:
    def __init__(self, labels_from_yaml=None):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model_path = os.environ.get("MODEL_WEIGHT_PATH", "/app/model/best.pt")
        
        print(f"Loading YOLOv8 Model from {self.model_path} onto {self.device}")
        self.model = YOLO(self.model_path)
        self.labels = getattr(self.model, "names", {})

    def infer(self, image, default_threshold):
        results_out = []
        
        predictions = self.model.predict(
            source=image,
            conf=default_threshold,
            device=self.device,
            retina_masks=True,
            verbose=False
        )

        for result in predictions:
            if result.masks is None:
                continue

            for box, mask_data in zip(result.boxes, result.masks.data):
                conf = float(box.conf.item())
                if conf < default_threshold:
                    continue

                class_id = int(box.cls.item())
                label_name = self.labels.get(class_id, str(class_id))
                mapping = {
                    "单根划痕": "scratch",
                    "夹杂物": "inclusion",
                    "坑洞": "pit",
                    "无划痕": "no_scratch",
                    "较少划痕": "minor_scratch",
                    "较多划痕": "moderate_scratch",
                    "很多划痕": "severe_scratch"
                }
                label_name = mapping.get(label_name, label_name)
                
                mask_np = mask_data.cpu().numpy().astype(np.uint8)

                # 1. Output polygon points
                contours = find_contours(mask_np, 0.5)
                points_out = []
                if len(contours) > 0:
                    contour = contours[0]
                    contour = np.flip(contour, axis=1)
                    contour = approximate_polygon(contour, tolerance=2.0)
                    if len(contour) >= 3:
                        points_out = contour.ravel().tolist()

                # 2. Output flat boolean mask in F-order for Pycocotools via CVAT Django
                x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
                h, w = mask_np.shape
                x1 = max(0, x1)
                y1 = max(0, y1)
                x2_ceil = min(w, x2)
                y2_ceil = min(h, y2)
                
                flat_mask = []
                if x2_ceil > x1 and y2_ceil > y1:
                    cropped = mask_np[y1:y2_ceil, x1:x2_ceil]
                    x_br = x2_ceil - 1
                    y_br = y2_ceil - 1
                    flat_mask = cropped.flatten(order='C').tolist()
                    flat_mask.extend([x1, y1, x_br, y_br])
                
                # CVAT Django backend expects both, and delegates based on its own internal state switch
                results_out.append({
                    "confidence": float(conf),
                    "label": label_name,
                    "type": "mask",
                    "mask": flat_mask,
                    "points": points_out
                })

        return results_out
