import os
import cv2
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
                
                mask_np = mask_data.cpu().numpy().astype(np.uint8)

                # Denoise mask: keep only the largest connected component
                # This explicitly removes any structural noise (disconnected floating points) from the boolean mask itself
                num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask_np, connectivity=8)
                if num_labels > 1:
                    # background is label 0, find largest component among the rest
                    areas = stats[1:, cv2.CC_STAT_AREA]
                    largest_label = 1 + np.argmax(areas)
                    mask_np = (labels == largest_label).astype(np.uint8)
                else:
                    # Empty mask gracefully skipped
                    continue

                # 1. Output polygon points
                contours = find_contours(mask_np, 0.5)
                points_out = []
                if len(contours) > 0:
                    largest_contour = max(contours, key=len)
                    contour = np.flip(largest_contour, axis=1)
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
                # Skip invalid polygons (less than 3 points) to prevent CVAT backend from rejecting the entire batch
                if len(points_out) < 6:
                    continue
                
                results_out.append({
                    "confidence": float(conf),
                    "label": label_name,
                    "type": "mask",
                    "mask": flat_mask,
                    "points": points_out
                })

        return results_out
