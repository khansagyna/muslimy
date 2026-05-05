# 🕌 Muslimy - AI Prayer Movement Detection

**Muslimy** adalah aplikasi berbasis AI untuk mendeteksi gerakan sholat secara real-time menggunakan model **YOLOv8**. Proyek ini terdiri dari backend berbasis Flask yang melayani inferensi model dan frontend berbasis React yang menampilkan hasil deteksi secara interaktif melalui webcam.

---

## 🚀 Fitur Utama
- **Deteksi Real-time**: Mendeteksi gerakan sholat langsung dari webcam.
- **High Confidence**: Menggunakan threshold 0.75 untuk akurasi yang lebih baik.
- **Modern UI**: Antarmuka web yang responsif dengan efek glassmorphism dan visualisasi bounding box yang futuristik.
- **Standalone Script**: Tersedia script Python untuk pengujian lokal tanpa browser.

---

## 🛠️ Tech Stack
### **Backend**
- **Python 3.x**
- **Flask**: Web framework untuk API.
- **Ultralytics (YOLOv8)**: Framework Deep Learning untuk deteksi objek.
- **OpenCV**: Pengolahan gambar dan akses kamera.
- **NumPy**: Komputasi numerik.

### **Frontend**
- **React.js**: Library UI.
- **Axios**: HTTP client untuk komunikasi dengan backend.
- **Canvas API**: Untuk menggambar bounding box secara dinamis.

---

## 📂 Struktur Proyek
```text
muslimy/
├── backend/            # Flask API & Model YOLO
│   ├── app.py          # Entry point backend
│   ├── camera.py       # Script deteksi lokal (OpenCV)
│   ├── best.pt         # Model YOLOv8 yang sudah dilatih
│   └── ...
└── frontend/           # Aplikasi React
    ├── src/
    │   ├── App.js      # Logika utama & UI
    │   └── ...
    └── package.json
```

---

## ⚙️ Instalasi & Penggunaan

### **1. Persiapan Backend**
Masuk ke direktori backend dan instal dependensi yang diperlukan:
```bash
cd backend
# Disarankan menggunakan virtual environment
python -m venv venv
source venv/bin/activate  # Untuk Windows: venv\Scripts\activate

pip install flask flask-cors ultralytics opencv-python numpy
```

Jalankan server backend:
```bash
python app.py
```
Server akan berjalan di `http://127.0.0.1:5000`.

### **2. Persiapan Frontend**
Masuk ke direktori frontend dan instal dependensi node:
```bash
cd frontend
npm install
```

Jalankan aplikasi React:
```bash
npm start
```
Aplikasi akan terbuka di `http://localhost:3000`.

---

## 📸 Penggunaan Script Lokal
Jika Anda ingin mencoba deteksi langsung tanpa melalui web browser, jalankan script berikut di direktori backend:
```bash
python camera.py
```
*Tekan tombol 'Q' pada keyboard untuk keluar dari jendela deteksi.*

---

## 📝 Catatan Model
Model `best.pt` dilatih khusus untuk mengenali berbagai gerakan sholat (seperti Takbir, Ruku, Sujud, dll). Pastikan pencahayaan cukup untuk hasil deteksi maksimal.

---

## 🤝 Kontribusi
Kontribusi selalu terbuka! Silakan lakukan fork dan kirimkan Pull Request (PR) jika Anda ingin meningkatkan fitur atau memperbaiki bug.

---

**Dibuat dengan ❤️ untuk membantu meningkatkan kualitas ibadah.**
