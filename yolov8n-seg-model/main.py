import json
import base64
from PIL import Image
import io
import torch
from ultralytics import YOLO
import supervision as sv
from skimage.measure import approximate_polygon, find_contours

def init_context(context):
    context.logger.info("Initializing context for YOLOv8 segmentation...")
    # 模型路径由 function.yaml 定义并由 Nuclio 挂载
    model_path = "/opt/nuclio/best.pt"
    model = YOLO(model_path, task="segment")
    context.user_data.model = model
    context.logger.info("Context initialized successfully.")

def handler(context, event):
    context.logger.info("Running YOLOv8 segmentation model")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"]))
    threshold = float(data.get("threshold", 0.5))
    tolerance = float(data.get("tolerance", 2.5))
    
    image = Image.open(buf)
    
    # 执行推理
    yolo_results = context.user_data.model(image, conf=threshold)[0]
    labels = yolo_results.names
    
    detections = sv.Detections.from_ultralytics(yolo_results)
    detections = detections[detections.confidence > threshold]
    
    results = []
    if len(detections) > 0 and detections.mask is not None:
        for i in range(len(detections.xyxy)):
            box = detections.xyxy[i].astype(int)
            mask = detections.mask[i].astype(bool)
            class_id = detections.class_id[i]
            
            # 将掩码转换为多边形
            contours = find_contours(mask, 0.5)
            for contour in contours:
                contour = approximate_polygon(contour, tolerance=tolerance)

                # Swap (row, col) to (x, y) for CVAT
                contour = contour[:, [1, 0]]

                if len(contour) < 3:
                    continue
                
                results.append({
                    "confidence": str(detections.confidence[i]),
                    "label": labels[class_id],
                    "points": contour.ravel().tolist(),
                    "type": "polygon",
                })

    return context.Response(body=json.dumps(results),
                            headers={},
                            content_type='application/json',
                            status_code=200)
