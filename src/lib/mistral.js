// 🔐 Appels à Mistral AI — TOUS passent par le service relais « mistral-proxy » hébergé sur Supabase.
// La clé Mistral n'est PAS dans l'application : elle reste dans les secrets de Supabase (voir MISTRAL-SECURISE.md).
import { supabaseUrl, supabaseAnonKey } from "./supabase";

const URL_RELAIS = String(supabaseUrl).replace(/\/+$/, "") + "/functions/v1/mistral-proxy";

/** Envoie une demande au relais. Ne lance jamais d'erreur : renvoie { ok, status, data } ou { ok:false, reseau:true }. */
async function relais(action, charge, delaiMs = 30000) {
  const controleur = typeof AbortController !== "undefined" ? new AbortController() : null;
  const minuteur = controleur ? setTimeout(() => controleur.abort(), delaiMs) : null;
  try {
    const r = await fetch(URL_RELAIS, {
      method: "POST",
      // La clé « publiable » du projet va dans l'en-tête apikey (et non dans Authorization)
      headers: { "Content-Type": "application/json", apikey: supabaseAnonKey },
      signal: controleur ? controleur.signal : undefined,
      body: JSON.stringify({ action, ...charge }),
    });
    let data = null;
    try { data = await r.json(); } catch (e) { data = null; }
    return { ok: r.ok, status: r.status, data };
  } catch (error) {
    return { ok: false, status: 0, data: null, reseau: true, delai: !!(error && error.name === "AbortError") };
  } finally {
    if (minuteur) clearTimeout(minuteur);
  }
}

/** Message clair pour la personne, selon la réponse du relais. */
function messageErreur(res) {
  if (res.reseau) return res.delai ? "Le service d'analyse n'a pas répondu à temps" : "Service d'analyse injoignable (réseau)";
  if (res.status === 404) return "Le service d'analyse n'est pas encore installé sur Supabase (fonction « mistral-proxy »)";
  if (res.status === 401 || res.status === 403) return "Accès refusé au service d'analyse (clé du projet ou site non autorisé)";
  if (res.status === 429) return "Trop de demandes : réessaie dans une minute";
  if (res.data && res.data.erreur) return String(res.data.erreur);
  return "Le service d'analyse a répondu avec l'erreur " + res.status;
}

/**
 * Lit le texte écrit sur une photo (OCR Mistral).
 * @param {string} dataUrl - photo (data:image/jpeg;base64,…)
 */
export async function lireImageMistralOCR(dataUrl) {
  const res = await relais("ocr", { image: dataUrl }, 25000);
  if (!res.ok) {
    console.warn("Avertissement OCR Mistral:", res.status, res.data);
    return { success: false, text: "", status: res.status, message: messageErreur(res) };
  }
  // L'OCR Mistral renvoie des pages : on rassemble tout le texte lu (markdown)
  const texte = ((res.data && res.data.pages) || [])
    .map(p => p.markdown || "")
    .join(" ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")   // retire les balises d'images du markdown
    .replace(/\s+/g, " ")
    .trim();
  return { success: texte.length > 0, text: texte, message: texte.length > 0 ? "" : "Aucun texte lisible sur la photo" };
}

/**
 * Assistant virtuel spécialisé en pièces détachées moto.
 * @param {Array<{role: string, content: string}>} messages - discussion (rôles « user » et « assistant »)
 * @param {string} systemPrompt - instructions de l'assistant
 * @returns {Promise<string>} réponse (vide en cas de problème)
 */
export async function demanderAssistantMistral(messages, systemPrompt = "") {
  const propres = (messages || [])
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }))
    .slice(-20);
  if (propres.length === 0) return "";
  const res = await relais("chat", { messages: propres, system: String(systemPrompt || "").slice(0, 4000) }, 30000);
  if (!res.ok) { console.warn("Avertissement assistant Mistral:", res.status, res.data); return ""; }
  return (res.data && res.data.choices && res.data.choices[0] && res.data.choices[0].message && res.data.choices[0].message.content) || "";
}

/**
 * 👁️ RECONNAISSANCE PAR IA (vision Mistral) : l'IA regarde la photo comme une personne.
 * - Sans catalogue : elle décrit seulement l'objet et recopie le texte lisible.
 * - Avec catalogue : elle dit en plus quels articles enregistrés sont LE MÊME type d'objet (ou aucun).
 * @param {string} dataUrl - photo (data:image/jpeg;base64,…)
 * @param {string[]|null} lignesCatalogue - lignes « id | nom | marque | catégorie | mots-clés »
 */
export async function analyserObjetMistral(dataUrl, lignesCatalogue = null) {
  if (!dataUrl || !String(dataUrl).startsWith("data:image")) return { success: false, message: "Photo illisible" };
  const avecCatalogue = Array.isArray(lignesCatalogue) && lignesCatalogue.length > 0;

  const consigne = [
    "Tu es un vendeur expert en pièces détachées de motos et accessoires, avec un très bon œil. On te montre la photo d'UN objet.",
    "",
    "ÉTAPE 1 — Regarde la photo comme le ferait une personne : quel est cet objet (type de pièce, marque ou modèle si visibles, couleur, état) ? Recopie aussi tout texte lisible dessus (marque, référence, code).",
    avecCatalogue ? "ÉTAPE 2 — Dis lesquels des articles du catalogue ci-dessous sont EXACTEMENT ce même type d'objet." : "",
    avecCatalogue ? "\nCATALOGUE (identifiant | nom | marque | catégorie | mots-clés) :\n" + lignesCatalogue.join("\n") : "",
    "",
    "RÈGLES STRICTES :",
    "- Ne regarde que l'OBJET PRINCIPAL. L'arrière-plan (table, mur, sol, mains, décor, autres objets) ne compte pas : ignore-le complètement.",
    "- Réponds uniquement d'après ce que tu VOIS sur la photo.",
    avecCatalogue ? "- Choisis un article seulement si tu es sûr qu'il s'agit du même type de pièce. Une ressemblance de forme ou de couleur ne suffit pas." : "",
    avecCatalogue ? "- Si l'objet n'est pas dans le catalogue, si la photo est floue ou sombre, ou si elle ne montre pas une pièce, laisse la liste \"correspondances\" VIDE. Vide est une bonne réponse." : "",
    avecCatalogue ? "- Utilise uniquement les identifiants de la liste. N'en invente jamais." : "",
    avecCatalogue ? "- \"confiance\" vaut \"haute\" (certain), \"moyenne\" (probable) ou \"faible\" (doute)." : "",
    "",
    "Réponds UNIQUEMENT avec ce JSON, sans aucun autre texte :",
    avecCatalogue
      ? "{\"objet\":\"description courte en français\",\"texte_lu\":\"texte lisible sur la pièce\",\"correspondances\":[{\"id\":12,\"confiance\":\"haute\",\"raison\":\"pourquoi\"}]}"
      : "{\"objet\":\"description courte en français\",\"texte_lu\":\"texte lisible sur la pièce\"}",
  ].filter(l => l !== "").join("\n");

  const res = await relais("vision", { texte: consigne, image: dataUrl }, 35000);
  if (!res.ok) {
    console.warn("Avertissement vision Mistral:", res.status, res.data);
    return { success: false, status: res.status, message: messageErreur(res) };
  }
  try {
    let contenu = res.data && res.data.choices && res.data.choices[0] && res.data.choices[0].message && res.data.choices[0].message.content;
    if (Array.isArray(contenu)) contenu = contenu.map(c => (c && c.text) || "").join(" ");
    const brut = String(contenu || "");
    const debut = brut.indexOf("{");
    const fin = brut.lastIndexOf("}");
    if (debut < 0 || fin <= debut) return { success: false, message: "Réponse de l'IA illisible" };
    const json = JSON.parse(brut.slice(debut, fin + 1));
    return {
      success: true,
      objet: String(json.objet || ""),
      texte_lu: String(json.texte_lu || ""),
      correspondances: Array.isArray(json.correspondances) ? json.correspondances : [],
    };
  } catch (error) {
    console.warn("Réponse de vision illisible:", error);
    return { success: false, message: "Réponse de l'IA illisible" };
  }
}
