import { lireImageMistralOCR } from "./mistral.js";

/**
 * Extraction automatique des codes et références de pièces dans un texte lu
 * (ex: ART-001, CG125, HJ110-3, 428H, etc.)
 */
export function extraireReferences(texte) {
  const brut = (texte || "").match(/[A-Za-z0-9][A-Za-z0-9-]{2,14}/g) || [];
  const codes = [];
  const marques = [];
  brut.forEach(m => {
    const t = m.replace(/-+$/, "");
    if (t.length < 3) return;
    if (/\d/.test(t) && /[A-Za-z]/.test(t) || /^\d{3,4}$/.test(t)) codes.push(t);          // ex. CG125, HJ110-3, 428H, 125
    else if (/^[A-Z]{4,}$/.test(t)) marques.push(t);                                      // ex. HONDA, YAMAHA (écrit en majuscules)
  });
  // Les vrais codes passent en premier : c'est le premier qui sert de mot-clé du nouvel article
  return Array.from(new Set([...codes, ...marques]));
}

/**
 * Convertit un File/Blob en data URL (nécessaire pour l'envoi à l'OCR Mistral).
 */
const versDataUrl = (fichier) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = rej;
  r.readAsDataURL(fichier);
});

/**
 * Réduit une photo (max 1600 px, JPEG) : les photos de téléphone font plusieurs Mo,
 * trop lourdes et trop lentes à envoyer. En cas de souci, on garde l'image d'origine.
 */
export const reduireImage = (dataUrl, maxCote = 1600, qualite = 0.85) => new Promise((resolve) => {
  try {
    const img = new Image();
    img.onload = () => {
      try {
        const echelle = Math.min(1, maxCote / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
        if (echelle >= 1 && dataUrl.length < 1500000) return resolve(dataUrl);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round((img.naturalWidth || img.width) * echelle));
        canvas.height = Math.max(1, Math.round((img.naturalHeight || img.height) * echelle));
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", qualite));
      } catch (e) { resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  } catch (e) { resolve(dataUrl); }
});

/**
 * OCR exclusivement avec Mistral. Aucun moteur local de secours.
 * En cas d'échec réseau/API, l'erreur est remontée clairement.
 */
export async function extraireTexteImage(imageSource) {
  try {
    let dataUrl = imageSource;
    if (imageSource && typeof imageSource !== "string") {
      dataUrl = await versDataUrl(imageSource);
    }
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image")) {
      return { success: false, text: "", references: [], error: "Image invalide ou illisible" };
    }

    const imageOptimisee = await reduireImage(dataUrl);
    const resultat = await lireImageMistralOCR(imageOptimisee);
    if (!resultat?.success || !resultat.text?.trim()) {
      return {
        success: false,
        text: "",
        references: [],
        error: resultat?.message || "Mistral OCR n'a reconnu aucun texte",
      };
    }

    const texte = resultat.text.trim();
    return { success: true, text: texte, references: extraireReferences(texte) };
  } catch (error) {
    console.error("Erreur OCR Mistral:", error);
    return {
      success: false,
      text: "",
      references: [],
      error: error?.message || "Impossible de joindre Mistral OCR",
    };
  }
}
