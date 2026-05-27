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
# LOAD MODEL
model = YOLO("best.pt")

# WARMUP
dummy = np.zeros((640, 640, 3), dtype=np.uint8)

model.predict(
    dummy,
    imgsz=640,
    verbose=False
)

# =========================================================
# CONFIG
# =========================================================
CONFIDENCE_THRESHOLD = 0.65

IMG_SIZE = 832

# =========================================================
# STABILIZER
# =========================================================
last_label = ""

same_count = 0

stable_label = ""

# =========================================================
# CLASS COLORS
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

        "success": True,

        "message": "YOLOv8 Prayer Detection API Running"

    })

# =========================================================
# DETECT
# =========================================================
@app.route("/detect", methods=["POST"])
def detect():

    global last_label
    global same_count
    global stable_label

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

        frame = cv2.imdecode(
            npimg,
            cv2.IMREAD_COLOR
        )

        if frame is None:

            return jsonify({

                "success": False,

                "message": "Invalid image"

            }), 400

        # =================================================
        # FLIP CAMERA
        # =================================================
        frame = cv2.flip(frame, 1)

        # =================================================
        # ORIGINAL SIZE
        # =================================================
        original_h, original_w = frame.shape[:2]

        # =================================================
        # YOLO INFERENCE
        # =================================================
        results = model.predict(

            source=frame,

            conf=CONFIDENCE_THRESHOLD,

            imgsz=IMG_SIZE,

            iou=0.45,

            verbose=False,
            
            half=True
        )

        result = results[0]

        detections = []

        # =================================================
        # LOOP DETECTION
        # =================================================
        for box in result.boxes:

            # =============================================
            # CLASS
            # =============================================
            cls_id = int(box.cls[0])

            label = model.names[cls_id]

            # =============================================
            # CONFIDENCE
            # =============================================
            confidence = float(box.conf[0])

            if confidence < CONFIDENCE_THRESHOLD:
                continue

            # =============================================
            # BBOX
            # =============================================
            x1, y1, x2, y2 = map(
                int,
                box.xyxy[0]
            )

            width = x2 - x1

            height = y2 - y1

            area = width * height

            # =============================================
            # FILTER OBJECT TERLALU KECIL
            # =============================================
            if area < 15000:
                continue

            # =============================================
            # FILTER OBJECT TERLALU TIPIS
            # =============================================
            if width < 120 or height < 120:
                continue

            # =============================================
            # FILTER RUKUK PALSU
            # =============================================
            if label == "rukuk":

                ratio = width / height

                # kalau terlalu tegak
                if ratio < 0.55:
                    continue

            # =============================================
            # FILTER SUJUD PALSU
            # =============================================
            if label == "sujud":

                # sujud harus cukup lebar
                ratio = width / height

                if ratio < 0.8:
                    continue

            # =============================================
            # SAVE DETECTION
            # =============================================
            detections.append({

                "label": label,

                "confidence": round(
                    confidence,
                    2
                ),

                "bbox": {

                    "x1": x1,
                    "y1": y1,
                    "x2": x2,
                    "y2": y2
                }
            })

        # =================================================
        # SORT CONFIDENCE
        # =================================================
        detections = sorted(

            detections,

            key=lambda x: x["confidence"],

            reverse=True
        )

        # =================================================
        # NO DETECTION
        # =================================================
        if len(detections) == 0:

            stable_label = ""

            return jsonify({

                "success": False,

                "message": "No posture detected",

                "detections": []

            })

        # =================================================
        # BEST DETECTION
        # =================================================
        best = detections[0]

        current_label = best["label"]

        # =================================================
        # STABILIZER
        # =================================================
        if current_label == last_label:

            same_count += 1

        else:

            same_count = 1

        last_label = current_label

        # HARUS SAMA 3 FRAME
        if same_count >= 3:

            stable_label = current_label

        # =================================================
        # RETURN
        # =================================================
        return jsonify({

            "success": True,

            "label": current_label,

            "stable_label": stable_label,

            "confidence": best["confidence"],

            "same_count": same_count,

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