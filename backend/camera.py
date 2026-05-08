from ultralytics import YOLO
import cv2
import time

# =========================
# LOAD MODEL
# =========================
model = YOLO("best.pt")  
# ganti path kalau model kamu beda lokasi

# =========================
# CLASS NAME
# =========================
class_names = {
    0: "berdiri",
    1: "duduk",
    2: "rukuk",
    3: "sujud"
}

# =========================
# BUKA KAMERA
# =========================
cap = cv2.VideoCapture(0)

# resolusi kamera
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

# cek kamera
if not cap.isOpened():
    print("Kamera gagal dibuka")
    exit()

prev_time = 0

# =========================
# LOOP DETEKSI
# =========================
while True:
    ret, frame = cap.read()

    if not ret:
        break

    # =========================
    # INFERENCE YOLO
    # =========================
    results = model(
        frame,
        conf=0.5,     # confidence threshold
        iou=0.5,
        verbose=False
    )

    annotated_frame = frame.copy()

    # =========================
    # AMBIL HASIL DETEKSI
    # =========================
    for r in results:
        boxes = r.boxes

        if boxes is None:
            continue

        for box in boxes:

            # koordinat bbox
            x1, y1, x2, y2 = map(int, box.xyxy[0])

            # confidence
            conf = float(box.conf[0])

            # class id
            cls_id = int(box.cls[0])

            # nama class
            label = class_names.get(cls_id, "unknown")

            # text label
            text = f"{label} {conf:.2f}"

            # =========================
            # WARNA TIAP CLASS
            # =========================
            if label == "berdiri":
                color = (0,255,0)

            elif label == "duduk":
                color = (255,0,0)

            elif label == "rukuk":
                color = (0,255,255)

            elif label == "sujud":
                color = (0,0,255)

            else:
                color = (255,255,255)

            # =========================
            # DRAW BOX
            # =========================
            cv2.rectangle(
                annotated_frame,
                (x1,y1),
                (x2,y2),
                color,
                3
            )

            # background text
            cv2.rectangle(
                annotated_frame,
                (x1, y1 - 35),
                (x1 + 220, y1),
                color,
                -1
            )

            # text
            cv2.putText(
                annotated_frame,
                text,
                (x1 + 5, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (255,255,255),
                2
            )

    # =========================
    # FPS COUNTER
    # =========================
    current_time = time.time()
    fps = 1 / (current_time - prev_time)
    prev_time = current_time

    cv2.putText(
        annotated_frame,
        f"FPS: {int(fps)}",
        (20,40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0,255,0),
        2
    )

    # =========================
    # JUDUL
    # =========================
    cv2.putText(
        annotated_frame,
        "YOLOv8 Sholat Posture Detection",
        (20,80),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (255,255,255),
        2
    )

    # =========================
    # TAMPILKAN
    # =========================
    cv2.imshow("Deteksi Gerakan Sholat", annotated_frame)

    # ESC untuk keluar
    key = cv2.waitKey(1)

    if key == 27:
        break

# =========================
# RELEASE
# =========================
cap.release()
cv2.destroyAllWindows()