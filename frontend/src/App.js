import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";

import berdiriImg from "./assets/berdiri.png";
import rukukImg from "./assets/rukuk.png";
import sujudImg from "./assets/sujud.png";
import dudukImg from "./assets/duduk.png";

// ======================================================
// STABILIZATION CONFIG
// ======================================================

const STABILITY_WINDOW    = 5;
const STABILITY_THRESHOLD = 4;
const CONFIDENCE_MIN      = 0.55;
const CORRECT_HOLD_FRAMES = 3;

function App() {

  const videoRef        = useRef(null);
  const canvasRef       = useRef(null);
  const poseHistoryRef  = useRef([]);
  const correctCountRef = useRef(0);
  const lockedRef       = useRef(false);

  // Simpan currentQuestion di ref juga supaya tidak stale closure
  const currentQuestionRef = useRef(0);

  const [score,           setScore]           = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [message,         setMessage]         = useState("Ayo ikuti gerakannya 😊");
  const [detectedPose,    setDetectedPose]    = useState("-");
  const [confidence,      setConfidence]      = useState("0%");
  const [gameFinished,    setGameFinished]    = useState(false);

  const questions = [
    { pose: "berdiri", image: berdiriImg },
    { pose: "rukuk",   image: rukukImg   },
    { pose: "sujud",   image: sujudImg   },
    { pose: "duduk",   image: dudukImg   },
  ];

  // ======================================================
  // STABILIZATION
  // ======================================================

  const getStableLabel = useCallback((newLabel) => {
    const history = poseHistoryRef.current;
    history.push(newLabel);
    if (history.length > STABILITY_WINDOW) history.shift();

    const freq = {};
    for (const l of history) freq[l] = (freq[l] || 0) + 1;

    let topLabel = null, topCount = 0;
    for (const [label, count] of Object.entries(freq)) {
      if (count > topCount) { topCount = count; topLabel = label; }
    }
    return topCount >= STABILITY_THRESHOLD ? topLabel : null;
  }, []);

  const resetStabilization = useCallback(() => {
    poseHistoryRef.current  = [];
    correctCountRef.current = 0;
  }, []);

  // ======================================================
  // RESET GAME
  // ======================================================

  const resetGame = () => {
    setScore(0);
    setCurrentQuestion(0);
    currentQuestionRef.current = 0;
    setMessage("Ayo ikuti gerakannya 😊");
    setDetectedPose("-");
    setConfidence("0%");
    setGameFinished(false);
    lockedRef.current = false;
    resetStabilization();

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // ======================================================
  // CAMERA
  // ======================================================

  useEffect(() => { startCamera(); }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
      });
      videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  // ======================================================
  // DETECT LOOP — pakai ref supaya tidak stale
  // ======================================================

  useEffect(() => {
    if (gameFinished) return;
    const interval = setInterval(() => { captureFrame(); }, 800);
    return () => clearInterval(interval);
  }, [gameFinished]); // eslint-disable-line

  // ======================================================
  // CAPTURE
  // ======================================================

  const captureFrame = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const tempCanvas  = document.createElement("canvas");
    tempCanvas.width  = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const ctx         = tempCanvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    tempCanvas.toBlob(async (blob) => {
      try {
        const formData = new FormData();
        formData.append("image", blob, "frame.jpg");

        const res = await axios.post("http://127.0.0.1:5000/detect", formData);
        if (!res.data.success) { setDetectedPose("-"); return; }

        const detections = res.data.detections;
        if (detections && detections.length > 0) {
          const best = detections[0];
          if (best.confidence < CONFIDENCE_MIN) return;

          const rawLabel    = res.data.stable_label || best.label;
          const stableLabel = getStableLabel(rawLabel);

          setDetectedPose(rawLabel);
          setConfidence(`${(best.confidence * 100).toFixed(1)}%`);
          drawBoxes(detections);

          if (stableLabel) checkAnswer(stableLabel);
        }
      } catch (err) {
        console.error("Detect error:", err);
      }
    }, "image/jpeg");
  };

  // ======================================================
  // CHECK ANSWER — pakai ref untuk currentQuestion
  // ======================================================

  const checkAnswer = (label) => {
    if (lockedRef.current) return;

    // Gunakan ref bukan state supaya tidak stale di dalam interval
    const target = questions[currentQuestionRef.current].pose;

    if (label === target) {
      correctCountRef.current += 1;

      if (correctCountRef.current >= CORRECT_HOLD_FRAMES) {
        lockedRef.current = true;
        setMessage("🎉 Hebat! Gerakan benar!");
        setScore((prev) => prev + 10);

        setTimeout(() => {
          nextQuestion();
          lockedRef.current = false;
          resetStabilization();
        }, 1800);

      } else {
        setMessage(`✅ Tahan sebentar... (${correctCountRef.current}/${CORRECT_HOLD_FRAMES})`);
      }

    } else {
      correctCountRef.current = 0;
      setMessage("😊 Yuk coba lagi!");
    }
  };

  // ======================================================
  // NEXT QUESTION — update ref DAN state bersamaan
  // ======================================================

  const nextQuestion = () => {
    const next = currentQuestionRef.current + 1;

    if (next < questions.length) {
      // Masih ada soal
      currentQuestionRef.current = next;
      setCurrentQuestion(next);
      setMessage("Ayo ikuti gerakannya 😊");

    } else {
      // Semua soal selesai
      setGameFinished(true);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  // ======================================================
  // DRAW BOUNDING BOX
  // ======================================================

  const drawBoxes = (boxes) => {
    const canvas  = canvasRef.current;
    const ctx     = canvas.getContext("2d");
    const video   = videoRef.current;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    boxes.forEach((b) => {
      const { x1, y1, x2, y2 } = b.bbox;
      const width  = x2 - x1;
      const height = y2 - y1;

      let color = "#22C55E";
      if (b.label === "rukuk") color = "#FACC15";
      if (b.label === "sujud") color = "#EF4444";
      if (b.label === "duduk") color = "#3B82F6";

      ctx.strokeStyle = color;
      ctx.lineWidth   = 3;
      ctx.shadowBlur  = 0;
      ctx.strokeRect(x1, y1, width, height);

      const text      = `${b.label.toUpperCase()}`;
      ctx.font        = "bold 22px Arial";
      const textWidth = ctx.measureText(text).width;

      ctx.fillStyle = color;
      ctx.fillRect(x1, y1 - 42, textWidth + 25, 38);
      ctx.fillStyle = "white";
      ctx.fillText(text, x1 + 12, y1 - 15);
    });
  };

  // ======================================================
  // UI
  // ======================================================

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "linear-gradient(to bottom, #D9F1FF, #FFF7D6)",
        fontFamily: "Comic Sans MS",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          height: "100px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0, color: "#1E40AF", fontSize: "34px" }}>
          🕌 Muslimy
        </h1>
        <p style={{ marginTop: "4px", fontWeight: "bold", fontSize: "16px" }}>
          Yuk belajar gerakan sholat ✨
        </p>
      </div>

      {/* MAIN */}
      <div
        style={{
          flex: 1,
          display: "flex",
          gap: "18px",
          padding: "18px",
          boxSizing: "border-box",
        }}
      >
        {/* LEFT */}
        <div
          style={{
            width: "58%",
            background: "white",
            borderRadius: "24px",
            padding: "14px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 5px 14px rgba(0,0,0,0.1)",
          }}
        >

          {gameFinished ? (

            /* ====================== LAYAR SELESAI ====================== */
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "20px",
                padding: "20px",
              }}
            >
              <div style={{ fontSize: "80px", lineHeight: 1 }}>🏆</div>

              <h1
                style={{
                  margin: 0,
                  color: "#16A34A",
                  fontSize: "48px",
                  textAlign: "center",
                }}
              >
                Selesai! 🎉
              </h1>

              <p style={{ margin: 0, fontSize: "20px", color: "#374151", textAlign: "center" }}>
                Kamu sudah berhasil melakukan semua gerakan sholat!
              </p>

              {/* SCORE BESAR */}
              <div
                style={{
                  background: "linear-gradient(135deg, #FEF3C7, #FDE68A)",
                  borderRadius: "24px",
                  padding: "20px 48px",
                  textAlign: "center",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              >
                <p style={{ margin: 0, fontSize: "18px", color: "#92400E", fontWeight: "bold" }}>
                  ⭐ Total Score
                </p>
                <h1 style={{ margin: 0, fontSize: "72px", color: "#D97706" }}>
                  {score}
                </h1>
                <p style={{ margin: 0, fontSize: "16px", color: "#92400E" }}>
                  dari {questions.length * 10} poin
                </p>
              </div>

              {/* CHECKLIST GERAKAN */}
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
                {questions.map((q) => (
                  <div
                    key={q.pose}
                    style={{
                      background: "#DCFCE7",
                      borderRadius: "14px",
                      padding: "10px 18px",
                      fontWeight: "bold",
                      color: "#16A34A",
                      fontSize: "18px",
                    }}
                  >
                    ✅ {q.pose.charAt(0).toUpperCase() + q.pose.slice(1)}
                  </div>
                ))}
              </div>

              {/* TOMBOL ULANG */}
              <button
                onClick={resetGame}
                style={{
                  marginTop: "8px",
                  padding: "16px 48px",
                  fontSize: "22px",
                  fontFamily: "Comic Sans MS",
                  fontWeight: "bold",
                  color: "white",
                  background: "linear-gradient(135deg, #2563EB, #1E40AF)",
                  border: "none",
                  borderRadius: "20px",
                  cursor: "pointer",
                  boxShadow: "0 6px 16px rgba(37,99,235,0.4)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                🔄 Ulangi Lagi
              </button>
            </div>

          ) : (

            /* ====================== LAYAR MAIN ====================== */
            <>
              {/* TOP CONTENT */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  height: "65%",
                }}
              >
                {/* IMAGE */}
                <div style={{ width: "45%" }}>
                  <img
                    src={questions[currentQuestion].image}
                    alt="pose"
                    style={{ width: "100%", objectFit: "contain" }}
                  />
                </div>

                {/* INFO */}
                <div style={{ flex: 1, textAlign: "center" }}>
                  <h2 style={{ color: "#1E40AF", fontSize: "24px" }}>
                    📖 Ikuti Gerakan
                  </h2>
                  <h1
                    style={{
                      color: "#2563EB",
                      fontSize: "48px",
                      marginTop: "0px",
                      marginBottom: "22px",
                    }}
                  >
                    {questions[currentQuestion].pose.toUpperCase()}
                  </h1>
                  <div
                    style={{
                      background: "#DCFCE7",
                      padding: "12px",
                      borderRadius: "14px",
                      fontWeight: "bold",
                      color: "#166534",
                      fontSize: "26px",
                    }}
                  >
                    {message}
                  </div>
                </div>
              </div>

              {/* BOTTOM CARD */}
              <div style={{ display: "flex", gap: "15px", marginTop: "15px" }}>
                {/* SCORE */}
                <div
                  style={{
                    flex: 1,
                    background: "#FEF3C7",
                    borderRadius: "24px",
                    padding: "18px",
                    textAlign: "center",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "24px" }}>⭐ Score</h3>
                  <h1 style={{ margin: 0, marginTop: "12px", color: "#D97706", fontSize: "56px" }}>
                    {score}
                  </h1>
                </div>

                {/* AI */}
                <div
                  style={{
                    flex: 1,
                    background: "#DBEAFE",
                    borderRadius: "24px",
                    padding: "18px",
                    textAlign: "center",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "24px" }}>🤖 AI Deteksi</h3>
                  <h1
                    style={{
                      marginTop: "12px",
                      marginBottom: "10px",
                      color: "#2563EB",
                      fontSize: "42px",
                    }}
                  >
                    {detectedPose.toUpperCase()}
                  </h1>
                  <p style={{ margin: 0, fontWeight: "bold", color: "#16A34A", fontSize: "22px" }}>
                    Confidence: {confidence}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* RIGHT CAMERA */}
        <div style={{ width: "800px", display: "flex", alignItems: "stretch" }}>
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#000",
              borderRadius: "24px",
              overflow: "hidden",
              position: "relative",
              boxShadow: "0 5px 14px rgba(0,0,0,0.15)",
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
              }}
            />

            {/* OVERLAY SELESAI DI KAMERA */}
            {gameFinished && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.65)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "16px",
                  borderRadius: "24px",
                }}
              >
                <div style={{ fontSize: "80px" }}>🎊</div>
                <p
                  style={{
                    color: "white",
                    fontSize: "32px",
                    fontWeight: "bold",
                    fontFamily: "Comic Sans MS",
                    textAlign: "center",
                    margin: 0,
                  }}
                >
                  Semua Gerakan
                  <br />
                  Berhasil!
                </p>
                <div
                  style={{
                    background: "#22C55E",
                    borderRadius: "50px",
                    padding: "10px 32px",
                    color: "white",
                    fontWeight: "bold",
                    fontSize: "22px",
                    fontFamily: "Comic Sans MS",
                  }}
                >
                  ✅ SELESAI
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
