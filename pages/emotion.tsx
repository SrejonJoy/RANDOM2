import React, { useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';

export default function EmotionDetection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(`${MODEL_URL}/tiny_face_detector`),
        faceapi.nets.faceExpressionNet.loadFromUri(`${MODEL_URL}/face_expression`)
      ]);
      startVideo();
    };

    const startVideo = () => {
      navigator.mediaDevices
        .getUserMedia({ video: {} })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => console.error('Error accessing webcam: ', err));
    };

    loadModels();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceExpressions();

        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        faceapi.matchDimensions(canvas, displaySize);
        const resized = faceapi.resizeResults(detections, displaySize);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          faceapi.draw.drawDetections(canvas, resized);
          faceapi.draw.drawFaceExpressions(canvas, resized);
        }

        if (detections.length > 0) {
          const expressions = detections[0].expressions;
          const expressionEntries = Object.entries(expressions) as [keyof typeof expressions, number][];
const maxExpression = expressionEntries.reduce((prev, curr) =>
  curr[1] > prev[1] ? curr : prev
)[0];

          const userData = JSON.parse(localStorage.getItem('user') || '{}');
          if (userData.email) {
            await fetch('/api/emotions/save', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: userData.email,
                emotion: maxExpression,
              }),
            }).catch((err) => console.error('Error saving emotion:', err));
          }
        }
      }
    }, 3000); // Save every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Real-Time Emotion Detection</h1>
      <div className="relative">
        <video
          ref={videoRef}
          autoPlay
          muted
          width="720"
          height="560"
          className="rounded-xl border border-gray-300"
        />
        <canvas
          ref={canvasRef}
          width="720"
          height="560"
          className="absolute top-0 left-0"
        />
      </div>
    </div>
  );
}
