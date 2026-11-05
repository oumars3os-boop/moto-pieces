import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { verifierQualiteImage } from "@/lib/imageProcessor";

/**
 * Composant de scan AUTOMATIQUE de caméra en direct.
 * Dès l'ouverture de la caméra : analyse continue des images.
 * Si l'image est propre (article bien cadré, net, lumineux),
 * la photo est prise SEULE et la recherche démarre automatiquement.
 */
export default function ModeRech({ onCaptureAuto, onFermer }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [erreur, setErreur] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [statut, setStatut] = useState("⏳ Démarrage de la caméra...");
  const [captureEnCours, setCaptureEnCours] = useState(false);

  // État de la boucle d'analyse (en refs pour ne pas la relancer à chaque rendu)
  const stopBoucle = useRef(false);
  const bonsCadres = useRef(0);
  const dernierShot = useRef(0);

  useEffect(() => {
    let currentStream = null;
    stopBoucle.current = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } }
        });
        currentStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
          setStatut("🔍 Analyse automatique en cours...");
          boucleAnalyse();
        }
      } catch (err) {
        console.error("Erreur lors de l'accès à la caméra :", err);
        setErreur("Accès caméra non disponible. Utilisez l'import d'image.");
      }
    }

    // Prend une image du flux vidéo et la renvoie en DataURL
    const prendreImage = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !video.videoWidth) return null;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.85);
    };

    // Boucle d'analyse automatique : toutes les ~1,2 s, on vérifie la qualité de l'image
    async function boucleAnalyse() {
      while (!stopBoucle.current) {
        await new Promise((r) => setTimeout(r, 1200));
        if (stopBoucle.current || !videoRef.current) continue;
        if (Date.now() - dernierShot.current < 3000) continue; // pause après une capture

        const image = prendreImage();
        if (!image) continue;

        try {
          const resultat = await verifierQualiteImage(image);

          if (stopBoucle.current) return;

          if (resultat && resultat.valide && (resultat.score ?? 0) >= 55) {
            bonsCadres.current += 1;
            if (bonsCadres.current >= 2) {
              // Image propre et stable sur 2 passages → capture automatique
              bonsCadres.current = 0;
              dernierShot.current = Date.now();
              setStatut("✅ Image propre — capture automatique !");
              capturer(resultat.dataUrl || image);
              return; // la boucle s'arrête : l'analyse est lancée par l'app
            }
            setStatut(`✅ Article détecté — maintenez... (${bonsCadres.current}/2)`);
          } else {
            bonsCadres.current = 0;
            setStatut(resultat && resultat.message ? resultat.message : "⚠️ Cadrez mieux l'article (net, lumineux, centré).");
          }
        } catch (e) {
          bonsCadres.current = 0;
        }
      }
    }

    // Capture finale : reconstruit le fichier image depuis le DataURL et lance la recherche
    function capturer(dataUrl) {
      setCaptureEnCours(true);
      try {
        const [meta, contenu] = String(dataUrl).split(",");
        const mime = (meta.match(/data:([^;]+)/) || [null, "image/jpeg"])[1];
        const bin = atob(contenu);
        const octets = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) octets[i] = bin.charCodeAt(i);
        const file = new File([octets], "capture_auto.jpg", { type: mime });

        if (onCaptureAuto) {
          onCaptureAuto(file);
        }
        // Fermeture automatique du scanner après la capture
        setTimeout(() => { if (onFermer) onFermer(); }, 400);
      } catch (e) {
        console.error("Erreur de capture automatique :", e);
        setCaptureEnCours(false);
        setStatut("⚠️ Capture impossible, réessayez.");
      }
    }

    startCamera();

    return () => {
      stopBoucle.current = true;
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const captureManuelle = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      stopBoucle.current = true;
      bonsCadres.current = 2;
      setStatut("📸 Capture manuelle...");
      const [meta, contenu] = dataUrl.split(",");
      const bin = atob(contenu);
      const octets = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) octets[i] = bin.charCodeAt(i);
      const file = new File([octets], "capture_auto.jpg", { type: "image/jpeg" });
      if (onCaptureAuto) onCaptureAuto(file);
      setTimeout(() => { if (onFermer) onFermer(); }, 400);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-zinc-900 text-white rounded-xl shadow-2xl max-w-md w-full mx-auto">
      <div className="w-full flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold flex items-center gap-2">📷 Scan automatique en direct</h3>
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

          {/* Cadre de visée + retour en direct */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className={`w-4/5 h-3/5 border-2 rounded-xl transition-colors duration-300 ${captureEnCours ? "border-green-400" : bonsCadres.current > 0 ? "border-amber-400" : "border-white/60"}`} />
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[11px] text-center py-1 px-2">
            {statut}
          </div>
        </div>
      )}

      <p className="text-[11px] text-zinc-400 mt-2 text-center leading-relaxed">
        🤖 La photo est prise <b>toute seule</b> dès que l'article est net et bien cadré.<br />
        Pas besoin d'appuyer sur un bouton — la recherche démarre automatiquement.
      </p>

      <div className="flex items-center gap-2 mt-2 w-full">
        <Button
          onClick={captureManuelle}
          className="flex-1 bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs h-9"
          disabled={!cameraActive}
        >
          📸 Capture manuelle (secours)
        </Button>
        {onFermer && (
          <Button variant="outline" size="sm" className="bg-zinc-800 border-zinc-700 text-zinc-300 text-xs h-9" onClick={onFermer}>
            Fermer
          </Button>
        )}
      </div>
    </div>
  );
}
