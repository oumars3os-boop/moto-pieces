import { createWorker } from "tesseract.js";

/**
 * Extrait automatiquement le texte et les références de pièces d'une photo/image
 * @param {string | File | Blob} imageSource - Fichier image ou URL base64
 * @returns {Promise<{ success: boolean, text: string, references: string[], error?: string }>}
 */
export async function extraireTexteImage(imageSource) {
  try {
    const worker = await createWorker("fra");
    const { data } = await worker.recognize(imageSource);
    await worker.terminate();

    const textNettoye = (data.text || "").trim();

    // Extraction automatique des codes et références de pièces (ex: ART-001, CG125, HJ110-3, 428H, etc.)
    const refRegex = /\b(ART-\d{3}|CG\d+|HJ\d+[-]?\d*|X-1|GN|110|125|150|180|428H|[A-Z0-9]{4,12})\b/gi;
    const correspondances = textNettoye.match(refRegex) || [];
    const referencesUnique = Array.from(new Set(correspondances));

    return {
      success: true,
      text: textNettoye,
      references: referencesUnique,
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
