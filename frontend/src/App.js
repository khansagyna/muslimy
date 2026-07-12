import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";

// --- Assets ---
import berdiriImg from "./assets/berdiri.jpg";
import rukukImg from "./assets/rukuk.jpg";
import sujudImg from "./assets/sujud.jpg";
import dudukImg from "./assets/duduk.jpg";

import suaraBerdiri from "./assets/berdiri.mp3";
import suaraRukuk from "./assets/rukuk.mp3";
import suaraSujud from "./assets/sujud.mp3";
import suaraDuduk from "./assets/duduk.mp3";
import horeSound from "./assets/hore.mp3";

// Gunakan URL lokal untuk testing, ganti ke domain publik saat siap deploy
const BASE_URL = process.env.NODE_ENV === "development" ? "http://127.0.0.1:5000" : "https://muslimy-api.yusufghazali.com"; 

const questions = [
  { pose: "berdiri", image: berdiriImg, sound: suaraBerdiri },
  { pose: "rukuk", image: rukukImg, sound: suaraRukuk },
  { pose: "sujud", image: sujudImg, sound: suaraSujud },
  { pose: "duduk", image: dudukImg, sound: suaraDuduk },
];

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const lockedRef = useRef(false);
  const currentQuestionRef = useRef(0);

  const [score, setScore] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [message, setMessage] = useState("Ayo ikuti gerakannya 😊");
  const [detectedPose, setDetectedPose] = useState("-");
  const [gameFinished, setGameFinished] = useState(false);

  // --- Audio Logic ---
  useEffect(() => {
    if (gameFinished) {
      new Audio(horeSound).play().catch(console.error);
    } else {
      const audio = new Audio(questions[currentQuestion].sound);
      audio.play().catch(console.error);
    }
  }, [currentQuestion, gameFinished]);

  // --- Camera Logic ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { console.error("Camera error:", err); }
  };

  useEffect(() => { startCamera(); }, []);

  // --- Drawing Logic ---
  const drawBoxes = (boxes) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const video = videoRef.current;
    if (!video) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    boxes.forEach((b) => {
      const { x1, y1, x2, y2 } = b.bbox;
      let color = "#22C55E"; // Hijau
      if (b.label === "rukuk") color = "#FACC15";
      if (b.label === "sujud") color = "#EF4444";
      if (b.label === "duduk") color = "#3B82F6";

      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      
      ctx.fillStyle = color;
      ctx.fillRect(x1, y1 - 35, 120, 35);
      ctx.fillStyle = "white";
      ctx.font = "bold 18px Arial";
      ctx.fillText(b.label.toUpperCase(), x1 + 10, y1 - 10);
    });
  };

  // --- Game Logic ---
  const resetStabilization = () => {
    axios.post(`${BASE_URL}/reset`, {}).catch(() => {});
  };

  const checkAnswer = useCallback((label) => {
    if (lockedRef.current) return;
    if (label === questions[currentQuestionRef.current].pose) {
      lockedRef.current = true;
      setMessage("🎉 Hebat! Gerakan benar!");
      setScore((prev) => prev + 25);
      setTimeout(() => {
        const next = currentQuestionRef.current + 1;
        if (next < questions.length) {
          currentQuestionRef.current = next;
          setCurrentQuestion(next);
          setMessage("Ayo ikuti gerakannya 😊");
        } else {
          setGameFinished(true);
        }
        lockedRef.current = false;
        resetStabilization();
      }, 1800);
    }
  }, []);

  // --- AI Capture Logic (Optimized) ---
  useEffect(() => {
    if (gameFinished) return;
    
    let isProcessing = false;

    const interval = setInterval(async () => {
      if (isProcessing) return;
      
      const video = videoRef.current;
      if (!video || video.videoWidth === 0) return;
      
      isProcessing = true;
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      tempCanvas.getContext("2d").drawImage(video, 0, 0);
      
      tempCanvas.toBlob(async (blob) => {
        if (!blob) { isProcessing = false; return; }
        const formData = new FormData();
        formData.append("image", blob, "frame.jpg");
        try {
          const res = await axios.post(`${BASE_URL}/detect`, formData);
          if (res.data.success) {
            setDetectedPose(res.data.label);
            drawBoxes(res.data.detections);
            checkAnswer(res.data.stable_label);
          }
        } catch (err) { console.error("Detect error:", err); }
        finally { isProcessing = false; }
      }, "image/jpeg");
    }, 500);
    
    return () => clearInterval(interval);
  }, [gameFinished, checkAnswer]);

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "linear-gradient(to bottom, #D9F1FF, #FFF7D6)", fontFamily: "Comic Sans MS", display: "flex", flexDirection: "column" }}>
      <div style={{ height: "100px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <h1 style={{ margin: 0, color: "#1E40AF", fontSize: "34px" }}>🕌 Muslimy</h1>
        <p style={{ marginTop: "4px", fontWeight: "bold", fontSize: "16px" }}>Yuk belajar gerakan sholat ✨</p>
      </div>

      <div style={{ flex: 1, display: "flex", gap: "18px", padding: "18px", boxSizing: "border-box", overflow: "hidden" }}>
        <div style={{ width: "58%", background: "white", borderRadius: "24px", padding: "14px", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 5px 14px rgba(0,0,0,0.1)" }}>
          {!gameFinished ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", height: "65%" }}>
                <div style={{ width: "45%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <img src={questions[currentQuestion].image} alt="Pose" style={{ width: "100%", maxHeight: "200px", objectFit: "contain" }} />
                  <p style={{ fontSize: "9px", color: "#9CA3AF", textAlign: "center", fontStyle: "italic", marginTop: "8px" }}>Sumber: Buku "Anak Soleh Belajar Gerakan dan Bacaan Shalat"</p>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <h2 style={{ color: "#1E40AF", fontSize: "24px" }}>📖 Ikuti Gerakan</h2>
                  <h1 style={{ color: "#2563EB", fontSize: "48px", marginTop: "0px", marginBottom: "22px" }}>{questions[currentQuestion].pose.toUpperCase()}</h1>
                  <div style={{ background: "#DCFCE7", padding: "12px", borderRadius: "14px", fontWeight: "bold", color: "#166534", fontSize: "26px" }}>{message}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "15px", marginTop: "15px" }}>
                <div style={{ flex: 1, background: "#FEF3C7", borderRadius: "24px", padding: "18px", textAlign: "center" }}>
                  <h3 style={{ margin: 0, fontSize: "24px" }}>⭐ Score</h3>
                  <h1 style={{ margin: 0, marginTop: "12px", color: "#D97706", fontSize: "56px" }}>{score}</h1>
                </div>
                <div style={{ flex: 1, background: "#DBEAFE", borderRadius: "24px", padding: "18px", textAlign: "center" }}>
                  <h3 style={{ margin: 0, fontSize: "24px" }}>🤖 AI Deteksi</h3>
                  <h1 style={{ marginTop: "12px", marginBottom: "10px", color: "#2563EB", fontSize: "42px" }}>{detectedPose.toUpperCase()}</h1>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px" }}>
              <div style={{ fontSize: "80px" }}>🏆</div>
              <h1 style={{ fontSize: "48px", color: "#16A34A" }}>Selesai! 🎉</h1>
              <button onClick={() => window.location.reload()} style={{ padding: "16px 48px", fontSize: "22px", borderRadius: "20px", background: "#2563EB", color: "white", border: "none", cursor: "pointer" }}>🔄 Ulangi</button>
            </div>
          )}
        </div>

        <div style={{ flex: 1, background: "#000", borderRadius: "24px", overflow: "hidden", position: "relative", boxShadow: "0 5px 14px rgba(0,0,0,0.15)" }}>
          <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
        </div>
      </div>
    </div>
  );
}

export default App;