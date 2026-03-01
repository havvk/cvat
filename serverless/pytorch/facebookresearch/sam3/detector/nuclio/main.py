import json
import base64
import io
from PIL import Image
import os
from model_handler import ModelHandler

def init_context(context):
    context.logger.info('Init context...  0%')
    
    # In newer Nuclio, function.yaml is not always mounted at /opt/nuclio.
    # CVAT actually doesn't strictly require us to parse function.yaml in init_context for detectors,
    # because the user can map labels dynamically. However, defining a dummy label dict here prevents init errors.
    # The actual mappings are usually passed to model_handler.
    
    labels = {} 
    
    try:
        # Fallback reading from environmental variable if needed, or simply empty.
        model = ModelHandler(labels)
        context.user_data.model = model
        context.logger.info('Init context...100%')
    except Exception as e:
        context.logger.error(f'Failed to init model: {e}')
        raise e

def handler(context, event):
    context.logger.info('Run SAM3 PCS Model')
    data = event.body
    buf = io.BytesIO(base64.b64decode(data['image']))
    threshold = float(data.get('threshold', 0.5))
    image = Image.open(buf).convert('RGB')
    
    # We can try to extract dynamic labels mapping from the request if CVAT provides them
    # But since CVAT standard detector doesn't send prompt string, we look at event.headers or hardcode a fallback
    
    results = context.user_data.model.infer(image, threshold)

    return context.Response(
        body=json.dumps(results),
        headers={},
        content_type='application/json',
        status_code=200
    )
