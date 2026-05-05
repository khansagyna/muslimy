import { useRef, useEffect, useState } from "react";
import axios from "axios";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detections, setDetections] = useState([]);

  useEffect(() => {
    startCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const captureFrame = async () => {
    if (isProcessing) return;

    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    setIsProcessing(true);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      try {
        const formData = new FormData();
        formData.append("image", blob, "frame.jpg");

        const res = await axios.post(
          "http://127.0.0.1:5000/detect",
          formData
        );

        setDetections(res.data);
        drawBoxes(res.data);
      } catch (err) {
        console.error("API error:", err);
      } finally {
        setIsProcessing(false);
      }
    }, "image/jpeg");
  };

  const drawBoxes = (boxes) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const video = videoRef.current;

    const width = video.clientWidth;
    const height = video.clientHeight;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    const scaleX = width / video.videoWidth;
    const scaleY = height / video.videoHeight;

    boxes.forEach((b) => {
      const [x1, y1, x2, y2] = b.box;

      const x = x1 * scaleX;
      const y = y1 * scaleY;
      const w = (x2 - x1) * scaleX;
      const h = (y2 - y1) * scaleY;

      // 🔲 BOX (TEBAL & KEREN)
      ctx.strokeStyle = "#00FFAA";
      ctx.lineWidth = 5;
      ctx.shadowColor = "#00FFAA";
      ctx.shadowBlur = 10;
      ctx.strokeRect(x, y, w, h);
      ctx.shadowBlur = 0;

      // 🏷️ TEXT (GEDE BANGET & JELAS)
      const text = `${b.label.toUpperCase()} (${b.confidence})`;

      ctx.font = "bold 32px Arial"; // 🔥 BESARIN DI SINI
      const textWidth = ctx.measureText(text).width;

      // background box
      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      ctx.fillRect(x, y - 45, textWidth + 20, 45);

      // text shadow
      ctx.fillStyle = "black";
      ctx.fillText(text, x + 12, y - 12);

      // text utama
      ctx.fillStyle = "#00FFAA";
      ctx.fillText(text, x + 10, y - 14);
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      captureFrame();
    }, 350);

    return () => clearInterval(interval);
  }, [isProcessing]);

  return (
    <div
      style={{
        textAlign: "center",
        background: "linear-gradient(to bottom, #020617, #0f172a)",
        minHeight: "100vh",
        padding: "20px",
        color: "white",
      }}
    >
      <h1 style={{ marginBottom: "20px", fontSize: "32px" }}>
        🕌 Deteksi Gerakan Sholat
      </h1>

      <div
        style={{
          position: "relative",
          display: "inline-block",
          width: "100%",
          maxWidth: "1000px",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 0 30px rgba(0,255,170,0.3)",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          style={{
            width: "100%",
            borderRadius: "16px",
          }}
        />

        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
          }}
        />
      </div>

      {/* INFO DETEKSI */}
      <div
        style={{
          marginTop: "25px",
          padding: "20px",
          background: "#020617",
          borderRadius: "12px",
          display: "inline-block",
          boxShadow: "0 0 20px rgba(0,255,170,0.2)",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "24px" }}>
          Gerakan Terdeteksi
        </h2>

        <p
          style={{
            fontSize: "30px",
            marginTop: "10px",
            color: "#00FFAA",
            fontWeight: "bold",
          }}
        >
          {detections[0]?.label?.toUpperCase() || "-"}
        </p>
      </div>
    </div>
  );
}

export default App;
