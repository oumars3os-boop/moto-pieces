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

/**
 * Exécute une requête d'écriture serveur directe dans la table d'historique des ventes public.sales de Supabase
 */
export async function enregistrerVenteSupabase(vente) {
  try {
    const totalVente = vente.total || (vente.items || []).reduce((s, it) => {
      const p = it.prixLigne ?? (it.p ? it.p.prix : it.prix) ?? 0;
      return s + (p * (it.qte || 1));
    }, 0) || 0;

    // Écriture serveur directe vers la table sales
    const { data: saleData, error: saleError } = await supabase
      .from("sales")
      .insert([
        {
          vendeur_nom: vente.vendeur || "MotoPièces Principal",
          client_nom: vente.client || "Client",
          client_tel: vente.tel || "",
          total: totalVente,
          statut: vente.statut || "payée",
          date_vente: vente.date || new Date().toLocaleString("fr-FR"),
        }
      ])
      .select()
      .single();

    if (saleError) {
      console.warn("Notice écriture serveur Supabase sales:", saleError.message);
      return { success: false, error: saleError };
    }

    // Écriture serveur directe des lignes d'articles vers la table sale_items
    if (saleData && vente.items && vente.items.length > 0) {
      const itemsPayload = vente.items.map((it) => ({
        sale_id: saleData.id,
        part_id: typeof it.p?.id === "number" ? it.p.id : (typeof it.id === "number" ? it.id : null),
        nom: it.p?.nom || it.nom || "Article",
        quantite: it.qte || 1,
        prix_unitaire: it.prixLigne ?? (it.p ? it.p.prix : it.prix) ?? 0,
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(itemsPayload);

      if (itemsError) {
        console.warn("Notice écriture serveur Supabase sale_items:", itemsError.message);
      }
    }

    return { success: true, data: saleData };
  } catch (err) {
    console.warn("Erreur réseau écriture vente Supabase:", err);
    return { success: false, error: err };
  }
}

/**
 * Récupère l'historique complet des transactions terminées depuis la base de données Supabase
 */
export async function chargerVentesSupabase() {
  try {
    const { data: sales, error } = await supabase
      .from("sales")
      .select(`
        *,
        sale_items (*)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Notice chargement ventes Supabase:", error.message);
      return [];
    }

    return (sales || []).map((s) => ({
      id: s.id,
      vendeur: s.vendeur_nom || "Vendeur",
      client: s.client_nom || "Client",
      tel: s.client_tel || "",
      total: Number(s.total) || 0,
      statut: s.statut || "payée",
      date: s.date_vente || new Date(s.created_at).toLocaleString("fr-FR"),
      items: (s.sale_items || []).map((it) => ({
        id: it.part_id || it.id,
        nom: it.nom,
        qte: it.quantite,
        prix: Number(it.prix_unitaire),
      })),
    }));
  } catch (err) {
    console.warn("Erreur réseau chargement ventes Supabase:", err);
    return [];
  }
}
