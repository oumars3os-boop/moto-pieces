// 👁️ RECONNAISSANCE D'ARTICLE PAR PHOTO — comme une personne :
//   1) l'IA regarde la photo et dit quels articles ENREGISTRÉS sont le même type d'objet (ou aucun) ;
//   2) chaque réponse de l'IA est contrôlée (l'identifiant existe, la description colle à l'article) ;
//   3) si l'IA est injoignable, on lit le texte écrit sur la pièce (règle stricte) ;
//   4) sinon : « aucun article » — jamais un article choisi au hasard.
// L'analyse ne peut JAMAIS rester bloquée : limite de temps sur chaque appel et sur l'ensemble.
import { extraireTexteImage, faireCorrespondreOCR, reduireImage } from "./ocr";
import { analyserObjetMistral } from "./mistral";

const nettoyer = (t, n = 90) => String(t == null ? "" : t).replace(/[\r\n|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const ligneCatalogue = (p) => [p.id, nettoyer(p.nom), nettoyer(p.marque, 30), nettoyer(p.cat || p.categorie, 30), nettoyer(p.motcle, 40)].join(" | ");

const aucun = (objet, extra = {}) => ({
  trouves: [], sur: false, statut: "aucun", objet: objet || "", source: "",
  message: (objet ? "Objet vu : " + objet + ". " : "") + "Aucun article enregistré ne correspond.", ...extra,
});

async function reconnaitreInterne(src, produits) {
  const liste = (produits || []).filter(p => p && p.id != null && p.nom);
  if (!liste.length) return { trouves: [], sur: false, statut: "aucun", objet: "", source: "", message: "Aucun article enregistré pour le moment." };

  const petite = await reduireImage(src, 1024, 0.82);

  // ---------- A) L'IA regarde la photo ----------
  let candidats = liste;
  let vision = null;
  if (liste.length > 250) {
    // Catalogue très grand : on décrit d'abord l'objet, puis on ne garde que les articles qui peuvent correspondre
    const premiere = await analyserObjetMistral(petite, null);
    if (premiere.success) {
      const pre = faireCorrespondreOCR((premiere.objet || "") + " " + (premiere.texte_lu || ""), [], liste, 5, 80);
      if (pre.length === 0) return aucun(premiere.objet);
      candidats = pre.map(x => x.p);
    } else {
      vision = premiere;
    }
  }
  if (!vision) vision = await analyserObjetMistral(petite, candidats.map(ligneCatalogue));

  if (vision && vision.success) {
    const objet = vision.objet || "";
    const description = objet + " " + (vision.texte_lu || "");
    const parId = new Map(liste.map(p => [String(p.id), p]));
    const vus = new Set();
    const gardes = [];
    for (const c of (vision.correspondances || [])) {
      const p = c && parId.get(String(c.id));
      if (!p || vus.has(String(p.id))) continue;              // identifiant inventé ou en double : ignoré
      vus.add(String(p.id));
      const conf = String(c.confiance || "").toLowerCase();
      const m = faireCorrespondreOCR(description, [], [p], 0)[0];
      const s = m ? m.score : 0;                               // la description de l'IA colle-t-elle à l'article ?
      if (conf.startsWith("haut") && s >= 10) gardes.push({ p, s, haute: true });
      else if (conf.startsWith("moy") && s >= 25) gardes.push({ p, s, haute: false });
    }
    gardes.sort((x, y) => (y.haute - x.haute) || (y.s - x.s));
    if (gardes.length) {
      return { trouves: gardes.slice(0, 3).map(g => g.p), sur: gardes[0].haute, statut: "ok", objet, source: "vision", message: "" };
    }
    // L'IA a regardé et ne voit rien de pareil. Une référence écrite sur la pièce reste un signal fiable :
    const fort = vision.texte_lu ? faireCorrespondreOCR(vision.texte_lu, [], liste, 100) : [];
    if (fort.length) return { trouves: fort.slice(0, 3).map(x => x.p), sur: false, statut: "ok", objet, source: "texte", message: "" };
    return aucun(objet);
  }

  // ---------- B) L'IA n'a pas répondu (clé, réseau, délai) : on lit le texte écrit sur la pièce ----------
  try {
    const ocr = await extraireTexteImage(petite);
    if (ocr && ocr.success) {
      const m = faireCorrespondreOCR(ocr.text, ocr.references, liste).filter(x => x.score >= 60);
      if (m.length) return { trouves: m.slice(0, 3).map(x => x.p), sur: false, statut: "ok", objet: "", source: "texte", message: "" };
      return { trouves: [], sur: false, statut: "aucun", objet: "", source: "", message: "Aucun article enregistré ne correspond au texte lu sur la photo." };
    }
  } catch (e) { console.warn("Lecture du texte (secours):", e); }

  return { trouves: [], sur: false, statut: "erreur", objet: "", source: "", message: (vision && vision.message) || "Analyse impossible pour le moment (connexion ou clé Mistral). Réessaie." };
}

/**
 * Reconnaît l'article d'une photo.
 * @returns {Promise<{trouves: object[], sur: boolean, statut: "ok"|"aucun"|"erreur", objet: string, source: string, message: string}>}
 */
export function reconnaitreArticle(src, produits, { delaiMax = 55000 } = {}) {
  let minuteur;
  const garde = new Promise((res) => {
    minuteur = setTimeout(() => res({ trouves: [], sur: false, statut: "erreur", objet: "", source: "", message: "L'analyse a pris trop de temps. Réessaie avec une photo plus nette." }), delaiMax);
  });
  const travail = reconnaitreInterne(src, produits).catch(e => ({
    trouves: [], sur: false, statut: "erreur", objet: "", source: "", message: "Analyse impossible : " + ((e && e.message) || e),
  }));
  return Promise.race([travail, garde]).finally(() => clearTimeout(minuteur));
}
