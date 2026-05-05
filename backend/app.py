from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import numpy as np

app = Flask(__name__)
CORS(app)

# 🔥 load model
model = YOLO("best.pt")

CONF_THRESHOLD = 0.75  # 🔥 filter confidence

@app.route("/detect", methods=["POST"])
def detect():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files["image"]

    img_bytes = file.read()
    npimg = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

    if img is None:
        return jsonify({"error": "Invalid image"}), 400

    results = model(img)[0]

    detections = []

    for box in results.boxes:
        cls = int(box.cls[0])
        conf = float(box.conf[0])

        # 🔥 FILTER CONFIDENCE
        if conf < CONF_THRESHOLD:
            continue

        label = model.names[cls]
        x1, y1, x2, y2 = map(int, box.xyxy[0])

        detections.append({
            "label": label,
            "confidence": round(conf, 2),
            "box": [x1, y1, x2, y2]
        })

    return jsonify(detections)

if __name__ == "__main__":
    app.run(debug=True, port=5000)
