from flask import Flask, request, jsonify
from flask_cors import CORS

from ultralytics import YOLO

import cv2
import numpy as np

# =========================================================
# FLASK
# =========================================================
app = Flask(__name__)

CORS(app)

# =========================================================
# LOAD MODEL
# =========================================================
model = YOLO("best.pt")

# =========================================================
# CONFIG
# =========================================================
CONFIDENCE_THRESHOLD = 0.80

# =========================================================
# CLASS COLOR
# =========================================================
CLASS_COLORS = {
    "berdiri": (0, 255, 0),
    "rukuk": (0, 255, 255),
    "sujud": (0, 0, 255),
    "duduk": (255, 0, 0)
}

# =========================================================
# HOME
# =========================================================
@app.route("/")
def home():

    return jsonify({
        "message": "YOLOv8 Prayer Detection API Running"
    })

# =========================================================
# DETECT
# =========================================================
@app.route("/detect", methods=["POST"])
def detect():

    try:

        # =================================================
        # CHECK IMAGE
        # =================================================
        if "image" not in request.files:

            return jsonify({
                "success": False,
                "message": "No image uploaded"
            }), 400

        file = request.files["image"]

        # =================================================
        # READ IMAGE
        # =================================================
        img_bytes = file.read()

        npimg = np.frombuffer(
            img_bytes,
            np.uint8
        )

        img = cv2.imdecode(
            npimg,
            cv2.IMREAD_COLOR
        )

        if img is None:

            return jsonify({
                "success": False,
                "message": "Invalid image"
            }), 400

        # =================================================
        # YOLO INFERENCE
        # =================================================
        results = model.predict(
            source=img,
            conf=CONFIDENCE_THRESHOLD,
            verbose=False
        )

        result = results[0]

        detections = []

        # =================================================
        # LOOP DETECTIONS
        # =================================================
        for box in result.boxes:

            # CLASS ID
            cls_id = int(box.cls[0])

            # LABEL
            label = model.names[cls_id]

            # CONFIDENCE
            confidence = float(box.conf[0])

            # FILTER LOW CONF
            if confidence < CONFIDENCE_THRESHOLD:
                continue

            # BBOX
            x1, y1, x2, y2 = map(
                int,
                box.xyxy[0]
            )

            # AREA FILTER
            width = x2 - x1
            height = y2 - y1

            area = width * height

            # SKIP TOO SMALL
            if area < 15000:
                continue

            # SAVE DETECTION
            detections.append({

                "label": label,

                "confidence": round(
                    confidence,
                    4
                ),

                "bbox": {
                    "x1": x1,
                    "y1": y1,
                    "x2": x2,
                    "y2": y2
                }
            })

        # =================================================
        # SORT BEST CONFIDENCE
        # =================================================
        detections = sorted(
            detections,
            key=lambda x: x["confidence"],
            reverse=True
        )

        # =================================================
        # RETURN
        # =================================================
        return jsonify({

            "success": True,

            "total_detection": len(detections),

            "detections": detections
        })

    except Exception as e:

        return jsonify({

            "success": False,

            "message": str(e)

        }), 500

# =========================================================
# RUN
# =========================================================
if __name__ == "__main__":

    app.run(
        debug=True,
        host="0.0.0.0",
        port=5000
    )