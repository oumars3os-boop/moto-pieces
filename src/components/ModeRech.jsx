import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Composant de scan automatique de caméra en direct (Mobile & Desktop)
 */
export default function ModeRech({ onCaptureAuto, onFermer }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [erreur, setErreur] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    let currentStream = null;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } }
        });
        currentStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } catch (err) {
        console.error("Erreur lors de l'accès à la caméra :", err);
        setErreur("Accès caméra non disponible. Utilisez l'import d'image.");
      }
    }

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const captureAndProcess = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], "capture_auto.jpg", { type: "image/jpeg" });
            if (onCaptureAuto) {
              onCaptureAuto(file);
            }
          }
        },
        "image/jpeg",
        0.85
      );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-zinc-900 text-white rounded-xl shadow-2xl max-w-md w-full mx-auto">
      <div className="w-full flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold flex items-center gap-2">📷 Scan caméra en direct</h3>
        {onFermer && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-zinc-400 hover:text-white" onClick={onFermer}>
            ✕
          </Button>
        )}
      </div>

      {erreur ? (
        <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-xs text-red-200 text-center w-full my-2">
          {erreur}
        </div>
      ) : (
        <div className="relative w-full overflow-hidden rounded-lg shadow bg-black aspect-video flex items-center justify-center border border-zinc-700">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />

          {!cameraActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs text-zinc-400">
              Démarrage de la caméra...
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mt-3 w-full">
        <Button
          onClick={captureAndProcess}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 text-xs shadow-md"
          disabled={!cameraActive}
        >
          📷 Capturer & Scanner l'article
        </Button>
        {onFermer && (
          <Button variant="outline" size="sm" className="bg-zinc-800 border-zinc-700 text-zinc-300 text-xs h-10" onClick={onFermer}>
            Fermer
          </Button>
        )}
      </div>
    </div>
  );
}
