# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
import numpy as np
import json
import base64
from PIL import Image
import io
from model_handler import ModelHandler


def init_context(context):
    context.logger.info("Init context...  0%")
    model = ModelHandler()
    context.user_data.model = model
    context.logger.info("Init context...100%")


def handler(context, event):
    try:
        context.logger.info("call handler")
        data = event.body
        buf = io.BytesIO(base64.b64decode(data["image"]))
        image = Image.open(buf)
        image = image.convert("RGB")

        pos_points = data.get("pos_points", [])
        neg_points = data.get("neg_points", [])
        obj_bbox = data.get("obj_bbox", None)
        
        if obj_bbox and len(obj_bbox) == 2 and len(obj_bbox[0]) == 2:
            obj_bbox = [obj_bbox[0][0], obj_bbox[0][1], obj_bbox[1][0], obj_bbox[1][1]]

        mask = context.user_data.model.handle(image, obj_bbox, pos_points, neg_points)

        return context.Response(
            body=json.dumps({
                "mask": mask.tolist()
            }),
            headers={},
            content_type='application/json',
            status_code=200
        )

    except Exception as e:
        import traceback
        context.logger.error(f"Error: {str(e)}")
        context.logger.error(traceback.format_exc())
        return context.Response(
            body=json.dumps({'error': str(e)}),
            headers={},
            content_type='application/json',
            status_code=500
        )
