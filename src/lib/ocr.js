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
export function faireCorrespondreOCR(texte, references, produits, seuil = 10, max = 5) {
  const normaliser = (t) => (t == null ? "" : String(t))
    .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
  const compact = (t) => normaliser(t).replace(/ /g, "");
  // Lettres que la lecture d'une photo confond souvent : 0/o, 1/l/i, 5/s, 8/b
  const confus = (t) => t.replace(/0/g, "o").replace(/[1i]/g, "l").replace(/5/g, "s").replace(/8/g, "b");
  const MOTS_VIDES = new Set(["de", "du", "des", "la", "le", "les", "un", "une", "pour", "avec", "sans", "et", "ou", "en", "sur", "par", "au", "aux"]);

  const texteComplet = normaliser((texte || "") + " " + (references || []).join(" "));
  if (!texteComplet) return [];
  const motsTexte = Array.from(new Set(texteComplet.split(" ").filter(Boolean)));
  const texteCompact = texteComplet.replace(/ /g, "");
  const texteConfus = confus(texteCompact);

  // Distance de Levenshtein (nombre de lettres à changer pour passer d'un mot à l'autre)
  const distance = (x, y) => {
    if (x === y) return 0;
    if (Math.abs(x.length - y.length) > 2) return 3;
    const d = Array.from({ length: x.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= y.length; j++) d[0][j] = j;
    for (let i = 1; i <= x.length; i++) {
      for (let j = 1; j <= y.length; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
      }
    }
    return d[x.length][y.length];
  };

  // Un mot du nom de l'article est-il dans le texte lu ?  1 = exact · 0.7 = presque (pluriel, faute de lecture, collé à un autre mot) · 0 = non
  const trouve = (mot) => {
    if (!mot) return 0;
    if (motsTexte.includes(mot)) return 1;
    if (mot.length >= 4) {
      const tol = mot.length <= 8 ? 1 : 2;   // une seule lettre d'écart pour les mots courts et moyens (chaine ≠ china)
      for (const w of motsTexte) {
        if (w.length < 3) continue;
        if (Math.abs(w.length - mot.length) <= 2 && distance(w, mot) <= tol) return 0.7;       // petite faute de lecture
        if (w.length >= 4 && (w.startsWith(mot) || mot.startsWith(w)) && Math.abs(w.length - mot.length) <= 3) return 0.7; // pluriel, féminin
      }
      if (mot.length >= 5 && texteCompact.includes(mot)) return 0.7;                            // mots collés : « plaquettefrein »
      if (mot.length >= 5 && texteConfus.includes(confus(mot))) return 0.6;                    // 0/O, 1/I/L, 5/S confondus
    }
    return 0;
  };

  // Mots très répandus dans le catalogue (ex. « frein », « avant ») : ils pèsent moins
  const listeProduits = produits || [];
  const frequence = new Map();
  listeProduits.forEach(p => {
    new Set(normaliser(p.nom).split(" ").filter(m => m.length >= 3 && !MOTS_VIDES.has(m))).forEach(m => frequence.set(m, (frequence.get(m) || 0) + 1));
  });
  const poidsDe = (mot) => {
    if (/\d/.test(mot) && /[a-z]/.test(mot)) return 1.4;     // modèle ou référence (ex. cg125, 428h) : très spécifique
    if (/^\d{3,}$/.test(mot)) return 1.1;
    if (listeProduits.length >= 8 && (frequence.get(mot) || 0) / listeProduits.length >= 0.25) return 0.5;
    return 1;
  };

  const resultats = [];
  listeProduits.forEach(p => {
    let score = 0;

    // 1) Code de l'article (seulement s'il est vraiment écrit sur la pièce ; les codes ART-xxx de l'application n'y sont pas)
    const code = compact(p.code);
    if (code && !/^art\d+$/.test(code)) {
      if ((references || []).some(r => compact(r) === code)) score += 200;
      else if (code.length >= 4 && texteCompact.includes(code)) score += 120;
    }

    // 2) Mots-clés choisis par le vendeur : signal fort
    (p.motcle || "").toString().split(/[\s,;]+/).forEach(m => {
      const mn = normaliser(m).replace(/ /g, "");
      if (mn.length < 2) return;
      if (mn.length >= 4) { const t = trouve(mn); if (t) score += 35 * (t === 1 ? 1 : 0.8); }
      else if (motsTexte.includes(mn)) score += 20;
    });

    // 3) Mots du nom de l'article
    const motsNom = Array.from(new Set(normaliser(p.nom).split(" ").filter(m => m.length >= 3 && !MOTS_VIDES.has(m))));
    let trouves = 0;
    motsNom.forEach(m => {
      const t = trouve(m);
      if (t > 0) { trouves++; score += 25 * t * poidsDe(m); }
    });
    // bonus : la plupart des mots du nom sont là
    if (motsNom.length >= 2 && trouves / motsNom.length >= 0.6) score += 25;

    score = Math.round(score);
    if (score >= seuil) resultats.push({ p, score });
  });
  resultats.sort((x, y) => y.score - x.score);
  return resultats.slice(0, max);
}
