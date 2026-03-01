import json
import base64
import io
from PIL import Image
from model_handler import ModelHandler

def init_context(context):
    context.logger.info("Init context...  0%")
    try:
        model = ModelHandler()
        context.user_data.model = model
        context.logger.info("Init context...100%")
    except Exception as e:
        context.logger.error(f"Failed to init model: {e}")
        raise e

def handler(context, event):
    context.logger.info("Run YOLOv8-Seg Model")
    
    data = event.body
    if isinstance(data, (bytes, str)):
        try:
            data = json.loads(data)
        except Exception:
            pass

    buf = io.BytesIO(base64.b64decode(data["image"]))
    threshold = float(data.get("threshold", 0.5))
    image = Image.open(buf).convert("RGB")
    
    # Notice we simply call infer once!
    results = context.user_data.model.infer(image, threshold)

    return context.Response(
        body=json.dumps(results),
        headers={},
        content_type="application/json",
        status_code=200
    )
