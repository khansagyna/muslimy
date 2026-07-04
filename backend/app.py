from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
from collections import deque

import cv2
import numpy as np
import threading

# =========================================================
# FLASK
# =========================================================
app = Flask(__name__)
CORS(app)

# =========================================================
# LOAD MODEL
# =========================================================
model = YOLO("best.pt")

# WARMUP
dummy = np.zeros((640, 640, 3), dtype=np.uint8)
model.predict(dummy, imgsz=640, verbose=False)

# =========================================================
# CONFIG
# =========================================================
# Diturunkan dari 0.65 ke 0.45 agar AI lebih berani mendeteksi
CONFIDENCE_THRESHOLD = 0.45
IMG_SIZE             = 832

# =========================================================
# STABILIZER  — thread-safe pakai Lock
# =========================================================
# Window dan threshold diturunkan agar respons lebih cepat
# karena di Frontend (React) juga sudah ada stabilizer.
STABLE_WINDOW    = 3   # tadinya 5
STABLE_THRESHOLD = 2   # tadinya 4

_stab_lock       = threading.Lock()
_label_history   = deque(maxlen=STABLE_WINDOW)
_stable_label    = ""

def update_stabilizer(new_label: str) -> str:
    """
    Tambah label baru ke rolling window.
    Kembalikan label stabil (modus >= threshold) atau string kosong.
    """
    global _stable_label

    with _stab_lock:
        _label_history.append(new_label)

        freq = {}
        for l in _label_history:
            freq[l] = freq.get(l, 0) + 1

        top_label = max(freq, key=freq.get)
        top_count = freq[top_label]

        if top_count >= STABLE_THRESHOLD:
            _stable_label = top_label
        # jika belum stabil, _stable_label tetap label terakhir yang stabil

        return _stable_label

def reset_stabilizer():
    global _stable_label
    with _stab_lock:
        _label_history.clear()
        _stable_label = ""

# =========================================================
# FILTER HELPERS
# =========================================================

def is_valid_detection(label: str, x1, y1, x2, y2) -> bool:
    """
    Kumpulan semua filter geometri dalam satu fungsi agar mudah diaudit.
    """
    width  = x2 - x1
    height = y2 - y1
    area   = width * height

    # 1. Filter area diperkecil agar kalau agak jauh dari kamera tetap terdeteksi
    if area < 5000:
        return False

    # 2. Filter dimensi diperkecil
    if width < 50 or height < 50:
        return False

    # 3. Filter Ratio DIMATIKAN sementara.
    # Karena postur manusia sangat bergantung pada angle kamera (depan/samping/miring).
    # Biarkan AI YOLO yang menentukan berdasarkan bentuk visualnya.
    
    # ratio = width / height if height > 0 else 0
    # if label == "rukuk" and ratio < 0.55:
    #     return False
    # if label == "sujud" and ratio < 0.8:
    #     return False
    # if label == "berdiri" and ratio > 1.8:
    #     return False

    return True

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
# RESET  — endpoint untuk reset stabilizer dari frontend
# =========================================================
@app.route("/reset", methods=["POST"])
def reset():
    reset_stabilizer()
    return jsonify({"success": True, "message": "Stabilizer reset"})

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
        # DECODE IMAGE
        # =================================================
        img_bytes = file.read()
        npimg     = np.frombuffer(img_bytes, np.uint8)
        frame     = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify({
                "success": False,
                "message": "Invalid image"
            }), 400

        # =================================================
        # FLIP (mirror kamera selfie)
        # =================================================
        frame = cv2.flip(frame, 1)

        # =================================================
        # YOLO INFERENCE
        # =================================================
        results = model.predict(
            source=frame,
            conf=CONFIDENCE_THRESHOLD,
            imgsz=IMG_SIZE,
            iou=0.45,
            verbose=False,
            half=True          # FP16 untuk GPU; otomatis fallback ke FP32 di CPU
        )

        result     = results[0]
        detections = []

        # =================================================
        # PARSE + FILTER DETEKSI
        # =================================================
        for box in result.boxes:

            cls_id     = int(box.cls[0])
            label      = model.names[cls_id]
            confidence = float(box.conf[0])

            # Double-check confidence (YOLO sudah filter, tapi jaga-jaga)
            if confidence < CONFIDENCE_THRESHOLD:
                continue

            x1, y1, x2, y2 = map(int, box.xyxy[0])

            # Terapkan semua filter geometri yang sudah dilonggarkan
            if not is_valid_detection(label, x1, y1, x2, y2):
                continue

            detections.append({
                "label":      label,
                "confidence": round(confidence, 2),
                "bbox": {
                    "x1": x1,
                    "y1": y1,
                    "x2": x2,
                    "y2": y2
                }
            })

        # =================================================
        # SORT BY CONFIDENCE (tertinggi di index 0)
        # =================================================
        detections.sort(key=lambda x: x["confidence"], reverse=True)

        # =================================================
        # TIDAK ADA DETEKSI VALID
        # =================================================
        if not detections:
            # Reset stabilizer supaya tidak tercemar frame kosong
            reset_stabilizer()

            return jsonify({
                "success":    False,
                "message":    "No posture detected",
                "detections": []
            })

        # =================================================
        # STABILIZER
        # =================================================
        best          = detections[0]
        current_label = best["label"]
        stable        = update_stabilizer(current_label)

        # =================================================
        # RESPONSE
        # =================================================
        return jsonify({
            "success":      True,
            "label":        current_label,
            "stable_label": stable,
            "confidence":   best["confidence"],
            "detections":   detections
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
    # threaded=True supaya Flask bisa tangani beberapa request paralel
    app.run(
        debug=True,
        host="0.0.0.0",
        port=5000,
        threaded=True
    )