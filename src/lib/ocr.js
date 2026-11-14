import { createWorker } from "tesseract.js";
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
const reduireImage = (dataUrl, maxCote = 1600, qualite = 0.85) => new Promise((resolve) => {
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
 * Extrait automatiquement le texte et les références de pièces d'une photo/image.
 * 1) 🔍 OCR MISTRAL (mistral-ocr-latest) : la lecture est faite par l'API de Mistral AI,
 *    rapide et sans aucun téléchargement de modèle sur le téléphone.
 * 2) Secours : OCR Tesseract local (si l'API Mistral est injoignable).
 * @param {string | File | Blob} imageSource - Fichier image ou URL base64
 * @returns {Promise<{ success: boolean, text: string, references: string[], error?: string }>}
 */
export async function extraireTexteImage(imageSource) {
  // 🔍 1) D'ABORD L'OCR DE MISTRAL
  let raisonMistral = "";
  try {
    let dataUrl = imageSource;
    if (imageSource && typeof imageSource !== "string") {
      dataUrl = await versDataUrl(imageSource);
    }
    if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
      const petite = await reduireImage(dataUrl);
      const resMistral = await lireImageMistralOCR(petite);
      if (resMistral && resMistral.success && resMistral.text) {
        return {
          success: true,
          text: resMistral.text,
          references: extraireReferences(resMistral.text),
        };
      }
      raisonMistral = (resMistral && resMistral.message) || "";
    }
  } catch (error) {
    console.warn("Avertissement OCR Mistral:", error);
  }

  // 2) SECOURS : OCR TESSERACT LOCAL (limité à 30 s pour ne jamais bloquer l'écran)
  let worker = null;
  try {
    worker = await createWorker("fra");
    const lecture = worker.recognize(imageSource);
    const delai = new Promise((_, rejeter) => setTimeout(() => rejeter(new Error("Lecture trop longue")), 30000));
    const { data } = await Promise.race([lecture, delai]);

    const textNettoye = (data.text || "").trim();
    return {
      success: textNettoye.length > 0,
      text: textNettoye,
      references: extraireReferences(textNettoye),
    };
  } catch (error) {
    console.warn("Avertissement analyseur OCR Tesseract:", error);
    return {
      success: false,
      text: "",
      references: [],
      error: raisonMistral || error?.message || "Erreur de lecture de l'image",
    };
  } finally {
    try { if (worker) await worker.terminate(); } catch (e) {}
  }
}

/**
 * 🔍 Recherche la marchandise correspondant au texte lu par OCR sur la pièce.
 * Compare le texte et les références extraits au code, au nom et aux mots-clés
 * de chaque article de la boutique ; renvoie les meilleures correspondances,
 * triées par score décroissant : [{ p, score }].
 */
export function faireCorrespondreOCR(texte, references, produits, seuil = 10) {
  const normaliser = (t) => (t == null ? "" : String(t))
    .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
  const texteComplet = normaliser((texte || "") + " " + (references || []).join(" "));
  if (!texteComplet) return [];
  const mots = texteComplet.split(" ");
  const motPresent = (mot) => mot && mots.includes(mot);
  const contient = (mot) => mot && texteComplet.includes(mot);
  const resultats = [];
  (produits || []).forEach(p => {
    let score = 0;
    const code = normaliser(p.code);
    if (code && (references || []).some(r => normaliser(r) === code)) score += 200;
    else if (code && contient(code)) score += 100;
    (p.motcle || "").toString().split(/[\s,;]+/).forEach(m => {
      const mn = normaliser(m);
      if (mn.length >= 2 && contient(mn)) score += 25;
    });
    normaliser(p.nom).split(" ").forEach(m => { if (m.length >= 3 && motPresent(m)) score += 15; });
    if (score >= seuil) resultats.push({ p, score });
  });
  resultats.sort((a, b) => b.score - a.score);
  return resultats.slice(0, 5);
}
