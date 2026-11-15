// ============================================================
// Supabase Edge Function « mistral-proxy »
// La clé Mistral reste ICI, côté serveur (secret MISTRAL_API_KEY).
// Elle n'est JAMAIS envoyée au navigateur ni écrite dans le code de l'application.
// L'application appelle cette fonction, qui appelle Mistral à sa place.
//
// Protections :
//  - clé du projet exigée (en-tête « apikey ») ;
//  - sites autorisés (secret ALLOWED_ORIGINS) ;
//  - 3 actions seulement (ocr, vision, chat), modèles imposés par le serveur ;
//  - taille des demandes limitée ;
//  - nombre de demandes limité par personne (adresse IP).
// ============================================================

const CLE_MISTRAL = Deno.env.get("MISTRAL_API_KEY") ?? "";
const ORIGINES = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean);
const MODELE_VISION = Deno.env.get("MISTRAL_VISION_MODEL") ?? "mistral-small-latest";
const MODELE_CHAT = "mistral-small-latest";
const MODELE_OCR = "mistral-ocr-latest";

const TAILLE_MAX = 8_000_000;          // octets maximum pour une demande
const IMAGE_MAX = 6_000_000;           // caractères maximum pour une photo encodée
const TEXTE_MAX = 40_000;              // caractères maximum pour une consigne
const LIMITE_MINUTE = 20;              // demandes par minute et par personne
const LIMITE_HEURE = 200;              // demandes par heure et par personne

const compteurs = new Map<string, number[]>();

function cleOk(req: Request): boolean {
  const recue = req.headers.get("apikey") ?? "";
  const valides: string[] = [];
  try {
    const o = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    valides.push(...Object.values(o).map(String));
  } catch (_) { /* ignoré */ }
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (anon) valides.push(anon);
  if (valides.length === 0) return recue.length > 0;     // impossible de vérifier : on exige au moins une clé
  return valides.includes(recue);
}

function entetes(req: Request): Record<string, string> {
  const origine = (req.headers.get("origin") ?? "").replace(/\/+$/, "");
  const permis = ORIGINES.length === 0 || ORIGINES.includes(origine);
  return {
    "Access-Control-Allow-Origin": permis && origine ? origine : (ORIGINES[0] ?? "null"),
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
}

function reponse(req: Request, statut: number, corps: unknown): Response {
  return new Response(JSON.stringify(corps), { status: statut, headers: entetes(req) });
}

function limiteAtteinte(ip: string): boolean {
  const maintenant = Date.now();
  const liste = (compteurs.get(ip) ?? []).filter((t) => maintenant - t < 3_600_000);
  const derniereMinute = liste.filter((t) => maintenant - t < 60_000).length;
  if (derniereMinute >= LIMITE_MINUTE || liste.length >= LIMITE_HEURE) { compteurs.set(ip, liste); return true; }
  liste.push(maintenant);
  compteurs.set(ip, liste);
  if (compteurs.size > 5000) compteurs.clear();            // évite que la mémoire grossisse sans fin
  return false;
}

const imageValide = (v: unknown): v is string =>
  typeof v === "string" && /^data:image\/(jpeg|jpg|png|webp);base64,/.test(v) && v.length <= IMAGE_MAX;

async function versMistral(req: Request, chemin: string, corps: unknown): Promise<Response> {
  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), 45_000);
  try {
    const r = await fetch("https://api.mistral.ai" + chemin, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${CLE_MISTRAL}` },
      body: JSON.stringify(corps),
      signal: controleur.signal,
    });
    if (r.status === 401 || r.status === 403) {
      return reponse(req, 502, { erreur: "La clé Mistral enregistrée sur le serveur est refusée par Mistral. Vérifie le secret MISTRAL_API_KEY." });
    }
    return new Response(await r.text(), { status: r.status, headers: entetes(req) });
  } catch (e) {
    const delai = e instanceof Error && e.name === "AbortError";
    return reponse(req, 504, { erreur: delai ? "Mistral n'a pas répondu à temps." : "Mistral est injoignable." });
  } finally {
    clearTimeout(minuteur);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: entetes(req) });
  if (req.method !== "POST") return reponse(req, 405, { erreur: "Méthode non permise." });

  const origine = (req.headers.get("origin") ?? "").replace(/\/+$/, "");
  if (ORIGINES.length > 0 && !ORIGINES.includes(origine)) return reponse(req, 403, { erreur: "Site non autorisé." });
  if (!cleOk(req)) return reponse(req, 401, { erreur: "Clé du projet manquante ou incorrecte." });
  if (!CLE_MISTRAL) return reponse(req, 500, { erreur: "Le secret MISTRAL_API_KEY n'est pas configuré sur Supabase." });

  const ip = (req.headers.get("x-forwarded-for") ?? "inconnue").split(",")[0].trim();
  if (limiteAtteinte(ip)) return reponse(req, 429, { erreur: "Trop de demandes : réessaie dans une minute." });

  const brut = await req.text();
  if (brut.length > TAILLE_MAX) return reponse(req, 413, { erreur: "Demande trop volumineuse." });
  let c: Record<string, unknown>;
  try { c = JSON.parse(brut); } catch (_) { return reponse(req, 400, { erreur: "Demande illisible." }); }

  // ---- 1) Lecture du texte d'une photo ----
  if (c.action === "ocr") {
    if (!imageValide(c.image)) return reponse(req, 400, { erreur: "Photo invalide." });
    return versMistral(req, "/v1/ocr", { model: MODELE_OCR, document: { type: "image_url", image_url: c.image } });
  }

  // ---- 2) Reconnaissance d'un objet sur une photo ----
  if (c.action === "vision") {
    if (!imageValide(c.image)) return reponse(req, 400, { erreur: "Photo invalide." });
    if (typeof c.texte !== "string" || c.texte.length === 0 || c.texte.length > TEXTE_MAX) return reponse(req, 400, { erreur: "Consigne invalide." });
    return versMistral(req, "/v1/chat/completions", {
      model: MODELE_VISION, temperature: 0, max_tokens: 700,
      messages: [{ role: "user", content: [{ type: "text", text: c.texte }, { type: "image_url", image_url: c.image }] }],
    });
  }

  // ---- 3) Assistant virtuel (texte seulement) ----
  if (c.action === "chat") {
    const msgs = Array.isArray(c.messages) ? c.messages : [];
    if (msgs.length === 0 || msgs.length > 20) return reponse(req, 400, { erreur: "Messages invalides." });
    const propres: { role: string; content: string }[] = [];
    if (typeof c.system === "string" && c.system.length > 0) {
      if (c.system.length > 4000) return reponse(req, 400, { erreur: "Consigne trop longue." });
      propres.push({ role: "system", content: c.system });
    }
    for (const m of msgs) {
      const role = (m as { role?: unknown })?.role;
      const contenu = (m as { content?: unknown })?.content;
      if ((role !== "user" && role !== "assistant") || typeof contenu !== "string" || contenu.length > 4000) {
        return reponse(req, 400, { erreur: "Message invalide." });
      }
      propres.push({ role, content: contenu });
    }
    return versMistral(req, "/v1/chat/completions", { model: MODELE_CHAT, messages: propres, temperature: 0.7, max_tokens: 350 });
  }

  return reponse(req, 400, { erreur: "Action inconnue." });
});
