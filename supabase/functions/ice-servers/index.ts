// ============================================================
// Supabase Edge Function « ice-servers »
// Fournit aux téléphones des accès TEMPORAIRES (6 h) à un serveur relais (TURN) Cloudflare.
// Sans relais, un appel entre deux téléphones sur des réseaux 4G différents échoue souvent.
// Les identifiants Cloudflare restent ICI (secrets), jamais dans l'application.
//
// Secrets à créer dans Supabase (Edge Functions → Secrets) :
//   CF_TURN_KEY_ID     = identifiant de la clé TURN Cloudflare
//   CF_TURN_API_TOKEN  = jeton secret de cette clé
//   ALLOWED_ORIGINS    = adresse de ton site (comme pour mistral-proxy)
// ============================================================

const ID_CLE = Deno.env.get("CF_TURN_KEY_ID") ?? "";
const JETON = Deno.env.get("CF_TURN_API_TOKEN") ?? "";
const ORIGINES = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean);
const DUREE_SECONDES = 6 * 3600;
const LIMITE_MINUTE = 10;
const LIMITE_HEURE = 60;
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
  if (valides.length === 0) return recue.length > 0;
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
    "Cache-Control": "no-store",
  };
}
const reponse = (req: Request, statut: number, corps: unknown) =>
  new Response(JSON.stringify(corps), { status: statut, headers: entetes(req) });

function limiteAtteinte(ip: string): boolean {
  const maintenant = Date.now();
  const liste = (compteurs.get(ip) ?? []).filter((t) => maintenant - t < 3_600_000);
  const derniereMinute = liste.filter((t) => maintenant - t < 60_000).length;
  if (derniereMinute >= LIMITE_MINUTE || liste.length >= LIMITE_HEURE) { compteurs.set(ip, liste); return true; }
  liste.push(maintenant); compteurs.set(ip, liste);
  if (compteurs.size > 5000) compteurs.clear();
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: entetes(req) });
  if (req.method !== "POST") return reponse(req, 405, { erreur: "Méthode non permise." });

  const origine = (req.headers.get("origin") ?? "").replace(/\/+$/, "");
  if (ORIGINES.length > 0 && !ORIGINES.includes(origine)) return reponse(req, 403, { erreur: "Site non autorisé." });
  if (!cleOk(req)) return reponse(req, 401, { erreur: "Clé du projet manquante ou incorrecte." });
  if (!ID_CLE || !JETON) return reponse(req, 500, { erreur: "Les secrets CF_TURN_KEY_ID et CF_TURN_API_TOKEN ne sont pas configurés." });

  const ip = (req.headers.get("x-forwarded-for") ?? "inconnue").split(",")[0].trim();
  if (limiteAtteinte(ip)) return reponse(req, 429, { erreur: "Trop de demandes : réessaie dans une minute." });

  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), 10_000);
  try {
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(ID_CLE)}/credentials/generate-ice-servers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${JETON}` },
      body: JSON.stringify({ ttl: DUREE_SECONDES }),
      signal: controleur.signal,
    });
    if (!r.ok) return reponse(req, 502, { erreur: "Cloudflare a refusé la demande de relais (code " + r.status + "). Vérifie les secrets." });
    const j = await r.json();
    // Cloudflare renvoie une liste (ou un seul élément) : on garde les adresses utilisables par un navigateur (le port 53 est bloqué)
    const brut = Array.isArray(j.iceServers) ? j.iceServers : (j.iceServers ? [j.iceServers] : []);
    const iceServers = brut.map((s: { urls?: string | string[]; username?: string; credential?: string }) => {
      const urls = (Array.isArray(s.urls) ? s.urls : s.urls ? [s.urls] : []).filter((u) => !/:53(\?|$)/.test(u));
      return { urls, ...(s.username ? { username: s.username } : {}), ...(s.credential ? { credential: s.credential } : {}) };
    }).filter((s: { urls: string[] }) => s.urls.length > 0);
    if (iceServers.length === 0) return reponse(req, 502, { erreur: "Réponse de Cloudflare inattendue." });
    return reponse(req, 200, { iceServers, duree: DUREE_SECONDES });
  } catch (e) {
    const delai = e instanceof Error && e.name === "AbortError";
    return reponse(req, 504, { erreur: delai ? "Cloudflare n'a pas répondu à temps." : "Cloudflare est injoignable." });
  } finally {
    clearTimeout(minuteur);
  }
});
