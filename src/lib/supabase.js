import { createClient } from "@supabase/supabase-js";

// Valeurs de secours sécurisées si les variables d'environnement Vercel ne sont pas encore configurées
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://ikgsdrjgrvrymwnwzltu.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_PyeqRFOgHo1aomCeP9CEiQ_gPx3jLrE";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Synchronise ou insère explicitement un compte utilisateur dans la table public.users de Supabase
 */
export async function synchroniserCompteSupabase(compte) {
  try {
    const { data, error } = await supabase
      .from("users")
      .upsert(
        {
          nom: compte.nom,
          tel: compte.tel,
          pin: compte.pin,
          role: compte.role || "vendeur",
          cle: compte.cle || null,
          bloque: Boolean(compte.bloque),
        },
        { onConflict: "tel" }
      );

    if (error) {
      console.warn("Avis synchronisation Supabase public.users:", error.message);
    }
    return { data, error };
  } catch (err) {
    console.warn("Erreur réseau synchronisation Supabase public.users:", err);
    return { error: err };
  }
}
