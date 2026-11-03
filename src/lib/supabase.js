import { createClient } from "@supabase/supabase-js";

// Utilisation des variables d'environnement avec valeurs de secours sécurisées
// pour éviter que l'application ne plante (écran blanc) sur Vercel si les variables ne sont pas encore configurées.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://ikgsdrjgrvrymwnwzltu.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_PyeqRFOgHo1aomCeP9CEiQ_gPx3jLrE";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
