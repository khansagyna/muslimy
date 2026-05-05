from ultralytics import YOLO
import cv2

model = YOLO("best.pt")

results = model("tes3.jpeg")

annotated = results[0].plot()

# resize gambar jadi kecil
h, w = annotated.shape[:2]

scale = 0.5
small = cv2.resize(annotated, (int(w*scale), int(h*scale)))

cv2.imshow("Hasil Deteksi", small)
cv2.waitKey(0)
cv2.destroyAllWindows()    