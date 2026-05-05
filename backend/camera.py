from ultralytics import YOLO
import cv2

# Load model
model = YOLO("best.pt")

# buka kamera laptop
cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()

    if not ret:
        break

    # prediksi realtime
    results = model(frame, conf=0.75, imgsz=640)

    # gambar hasil deteksi
    annotated = results[0].plot()

    # resize biar kecil
    annotated = cv2.resize(annotated, (800, 600))

    cv2.imshow("Muslimy Detection", annotated)

    # pencet Q buat keluar
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()