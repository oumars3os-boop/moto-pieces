import { createWorker } from "tesseract.js";
import { lireImageMistralOCR } from "./mistral.js";

/**
 * Extraction automatique des codes et références de pièces dans un texte lu
 * (ex: ART-001, CG125, HJ110-3, 428H, etc.)
 */
export function extraireReferences(texte) {
  const refRegex = /\b(ART-\d{3}|CG\d+|HJ\d+[-]?\d*|X-1|GN|110|125|150|180|428H|[A-Z0-9]{4,12})\b/gi;
  const correspondances = (texte || "").match(refRegex) || [];
  return Array.from(new Set(correspondances));
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
 * Extrait automatiquement le texte et les références de pièces d'une photo/image.
 * 1) 🔍 OCR MISTRAL (mistral-ocr-latest) : la lecture est faite par l'API de Mistral AI,
 *    rapide et sans aucun téléchargement de modèle sur le téléphone.
 * 2) Secours : OCR Tesseract local (si l'API Mistral est injoignable).
 * @param {string | File | Blob} imageSource - Fichier image ou URL base64
 * @returns {Promise<{ success: boolean, text: string, references: string[], error?: string }>}
 */
export async function extraireTexteImage(imageSource) {
  // 🔍 1) D'ABORD L'OCR DE MISTRAL
  try {
    let dataUrl = imageSource;
    if (imageSource && typeof imageSource !== "string") {
      dataUrl = await versDataUrl(imageSource);
    }
    if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
      const resMistral = await lireImageMistralOCR(dataUrl);
      if (resMistral && resMistral.success && resMistral.text) {
        return {
          success: true,
          text: resMistral.text,
          references: extraireReferences(resMistral.text),
        };
      }
    }
  } catch (error) {
    console.warn("Avertissement OCR Mistral:", error);
  }

  // 2) SECOURS : OCR TESSERACT LOCAL
  try {
    const worker = await createWorker("fra");
    const { data } = await worker.recognize(imageSource);
    await worker.terminate();

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
      error: error?.message || "Erreur de lecture de l'image",
    };
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
