import { useEffect, useRef, useState } from "react";
import axios from "axios";

import berdiriImg from "./assets/berdiri.png";
import rukukImg from "./assets/rukuk.png";
import sujudImg from "./assets/sujud.png";
import dudukImg from "./assets/duduk.png";

function App() {

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [score, setScore] = useState(0);

  const [currentQuestion, setCurrentQuestion] =
    useState(0);

  const [message, setMessage] =
    useState("Ayo ikuti gerakannya 😊");

  const [detectedPose, setDetectedPose] =
    useState("-");

  const [confidence, setConfidence] =
    useState(0);

  // ======================================================
  // QUIZ DATA
  // ======================================================

  const questions = [
    {
      pose: "berdiri",
      image: berdiriImg
    },

    {
      pose: "rukuk",
      image: rukukImg
    },

    {
      pose: "sujud",
      image: sujudImg
    },

    {
      pose: "duduk",
      image: dudukImg
    }
  ];

  // ======================================================
  // START CAMERA
  // ======================================================

  useEffect(() => {

    startCamera();

  }, []);

  const startCamera = async () => {

    try {

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: true
        });

      videoRef.current.srcObject = stream;

    } catch (err) {

      console.log(err);
    }
  };

  // ======================================================
  // DETECTION LOOP
  // ======================================================

  useEffect(() => {

    const interval = setInterval(() => {

      captureFrame();

    }, 500);

    return () => clearInterval(interval);

  }, [currentQuestion]);

  // ======================================================
  // CAPTURE FRAME
  // ======================================================

  const captureFrame = async () => {

    const video = videoRef.current;

    if (!video || video.videoWidth === 0) return;

    const tempCanvas =
      document.createElement("canvas");

    tempCanvas.width =
      video.videoWidth;

    tempCanvas.height =
      video.videoHeight;

    const ctx =
      tempCanvas.getContext("2d");

    ctx.drawImage(video, 0, 0);

    tempCanvas.toBlob(async (blob) => {

      try {

        const formData =
          new FormData();

        formData.append(
          "image",
          blob
        );

        const res =
          await axios.post(
            "http://127.0.0.1:5000/detect",
            formData
          );

        const detections =
          res.data.detections;

        if (
          detections &&
          detections.length > 0
        ) {

          const best =
            detections[0];

          setDetectedPose(
            best.label
          );

          setConfidence(
            (
              best.confidence * 100
            ).toFixed(1)
          );

          drawBoxes(detections);

          checkAnswer(
            best.label
          );
        }

      } catch (err) {

        console.log(err);
      }

    }, "image/jpeg");
  };

  // ======================================================
  // CHECK ANSWER
  // ======================================================

  const checkAnswer = (label) => {

    const target =
      questions[currentQuestion]
        .pose;

    if (label === target) {

      setMessage(
        "🎉 Hebat! Gerakan benar!"
      );

      setScore(prev => prev + 10);

      setTimeout(() => {

        nextQuestion();

      }, 1800);

    } else {

      setMessage(
        "😊 Yuk coba lagi!"
      );
    }
  };

  // ======================================================
  // NEXT QUESTION
  // ======================================================

  const nextQuestion = () => {

    if (
      currentQuestion <
      questions.length - 1
    ) {

      setCurrentQuestion(
        prev => prev + 1
      );

    } else {

      setMessage(
        "🏆 Semua gerakan selesai!"
      );
    }
  };

  // ======================================================
  // DRAW AI BOX
  // ======================================================

  const drawBoxes = (boxes) => {

    const canvas =
      canvasRef.current;

    const ctx =
      canvas.getContext("2d");

    const video =
      videoRef.current;

    canvas.width =
      video.videoWidth;

    canvas.height =
      video.videoHeight;

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    boxes.forEach((b) => {

      const {
        x1,
        y1,
        x2,
        y2
      } = b.bbox;

      const width =
        x2 - x1;

      const height =
        y2 - y1;

      let color =
        "#22C55E";

      if (
        b.label === "rukuk"
      ) {
        color = "#FACC15";
      }

      if (
        b.label === "sujud"
      ) {
        color = "#EF4444";
      }

      if (
        b.label === "duduk"
      ) {
        color = "#3B82F6";
      }

      // =========================================
      // BOX
      // =========================================

      ctx.strokeStyle =
        color;

      ctx.lineWidth = 5;

      ctx.shadowColor =
        color;

      ctx.shadowBlur = 15;

      ctx.strokeRect(
        x1,
        y1,
        width,
        height
      );

      ctx.shadowBlur = 0;

      // =========================================
      // LABEL BOX
      // =========================================

      const text =
        `${b.label.toUpperCase()} ${(
          b.confidence * 100
        ).toFixed(1)}%`;

      ctx.font =
        "bold 22px Arial";

      const textWidth =
        ctx.measureText(text)
          .width;

      ctx.fillStyle =
        color;

      ctx.fillRect(
        x1,
        y1 - 40,
        textWidth + 25,
        38
      );

      ctx.fillStyle =
        "white";

      ctx.fillText(
        text,
        x1 + 12,
        y1 - 13
      );
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
        background:
          "linear-gradient(to bottom, #D6EEFF, #FFF6D8)",
        fontFamily:
          "Comic Sans MS",
        display: "flex",
        flexDirection: "column"
      }}
    >

      {/* HEADER */}

      <div
        style={{
          height: "85px",
          display: "flex",
          flexDirection: "column",
          justifyContent:
            "center",
          alignItems:
            "center",
          flexShrink: 0
        }}
      >

        <h1
          style={{
            margin: 0,
            color: "#1E3A8A",
            fontSize: "36px"
          }}
        >
          🕌 Belajar Gerakan
          Sholat
        </h1>

        <p
          style={{
            marginTop: "5px",
            fontSize: "18px",
            fontWeight: "bold"
          }}
        >
          Belajar sholat bersama
          AI ✨
        </p>

      </div>

      {/* MAIN */}

      <div
        style={{
          flex: 1,
          display: "flex",
          gap: "15px",
          padding: "15px",
          overflow: "hidden",
          boxSizing:
            "border-box"
        }}
      >

        {/* LEFT PANEL */}

        <div
          style={{
            width: "260px",
            minWidth: "260px",
            background:
              "white",
            borderRadius: "24px",
            padding: "18px",
            display: "flex",
            flexDirection:
              "column",
            justifyContent:
              "space-between",
            boxSizing:
              "border-box",
            boxShadow:
              "0 5px 15px rgba(0,0,0,0.12)"
          }}
        >

          {/* QUESTION */}

          <div>

            <h2
              style={{
                marginTop: 0,
                color:
                  "#1E3A8A",
                fontSize: "26px",
                lineHeight:
                  "32px"
              }}
            >
              📖 Ikuti Gerakan
            </h2>

            <img
              src={
                questions[
                  currentQuestion
                ].image
              }
              alt="pose"
              style={{
                width: "72%",
                display:
                  "block",
                margin:
                  "15px auto"
              }}
            />

            <h1
              style={{
                textAlign:
                  "center",
                color:
                  "#2563EB",
                fontSize: "36px",
                marginTop:
                  "10px",
                marginBottom:
                  "10px"
              }}
            >
              {
                questions[
                  currentQuestion
                ].pose.toUpperCase()
              }
            </h1>

          </div>

          {/* RESULT */}

          <div>

            {/* AI DETECTION */}

            <div
              style={{
                background:
                  "#DBEAFE",
                borderRadius:
                  "20px",
                padding:
                  "14px",
                textAlign:
                  "center",
                marginBottom:
                  "14px"
              }}
            >

              <h3
                style={{
                  margin: 0,
                  fontSize:
                    "20px"
                }}
              >
                🤖 AI Deteksi
              </h3>

              <h1
                style={{
                  color:
                    "#2563EB",
                  marginTop:
                    "10px",
                  marginBottom:
                    "5px",
                  fontSize:
                    "30px"
                }}
              >
                {detectedPose.toUpperCase()}
              </h1>

              <p
                style={{
                  margin: 0,
                  color:
                    "#16A34A",
                  fontWeight:
                    "bold",
                  fontSize:
                    "20px"
                }}
              >
                Confidence:
                {confidence}%
              </p>

            </div>

            {/* SCORE */}

            <div
              style={{
                background:
                  "#FEF3C7",
                borderRadius:
                  "20px",
                padding:
                  "14px",
                textAlign:
                  "center",
                marginBottom:
                  "14px"
              }}
            >

              <h3
                style={{
                  margin: 0
                }}
              >
                ⭐ Score
              </h3>

              <h1
                style={{
                  margin: 0,
                  marginTop:
                    "8px",
                  fontSize:
                    "52px",
                  color:
                    "#D97706"
                }}
              >
                {score}
              </h1>

            </div>

            {/* MESSAGE */}

            <div
              style={{
                background:
                  "#DCFCE7",
                borderRadius:
                  "20px",
                padding:
                  "14px",
                textAlign:
                  "center",
                fontWeight:
                  "bold",
                color:
                  "#166534",
                fontSize:
                  "19px",
                lineHeight:
                  "26px"
              }}
            >
              {message}
            </div>

          </div>

        </div>

        {/* CAMERA AREA */}

        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent:
              "center",
            alignItems:
              "center"
          }}
        >

          <div
            style={{
              width: "78%",
              height: "78%",
              position:
                "relative",
              borderRadius:
                "24px",
              overflow:
                "hidden",
              background:
                "#000",
              boxShadow:
                "0 6px 18px rgba(0,0,0,0.18)"
            }}
          >

            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: "100%",
                height:
                  "100%",
                objectFit:
                  "contain"
              }}
            />

            {/* AI BOX */}

            <canvas
              ref={canvasRef}
              style={{
                position:
                  "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height:
                  "100%"
              }}
            />

          </div>

        </div>

      </div>

    </div>
  );
}

export default App;