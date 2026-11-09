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
          photo: compte.photo || null,
          equipe: compte.equipe || null,
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
 * Enregistre ou met à jour un article/produit dans la table public.parts de Supabase
 * Inclut impérativement le champ 'equipe' pour la synchronisation multi-téléphones
 */
export async function enregistrerProduitSupabase(p) {
  try {
    const motsArray = Array.isArray(p.mots)
      ? p.mots
      : (p.mots || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

    const payload = {
      nom: p.nom,
      code: p.code || `ART-${String(p.id || Date.now()).slice(-4)}`,
      cat: p.cat || "moteur",
      marque: p.marque || "Générique",
      prix: Number(p.prix) || 0,
      stock: Number(p.stock) || 0,
      photo: p.photo || null,
      note: p.note || 4.5,
      mots: motsArray,
      boutique: p.boutique || "MotoPièces Principal",
      equipe: p.equipe || null, // numéro de téléphone du compte administrateur créateur
    };

    if (typeof p.id === "number" && p.id > 0) {
      payload.id = p.id;
    }

    const { data, error } = await supabase
      .from("parts")
      .upsert(payload, { onConflict: "code" })
      .select();

    if (error) {
      console.warn("Avis enregistrement produit Supabase:", error.message);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err) {
    console.warn("Erreur réseau enregistrement produit Supabase:", err);
    return { success: false, error: err };
  }
}

/**
 * Récupère tous les articles/produits enregistrés depuis la base de données Supabase
 * Restitue la propriété 'equipe' pour que les articles s'affichent sur tous les téléphones connectés au même compte
 */
export async function chargerProduitsSupabase() {
  try {
    const { data, error } = await supabase
      .from("parts")
      .select("*")
      .neq("boutique", "PROMO_BANNER")
      .order("id", { ascending: true });

    if (error) {
      console.warn("Avis chargement produits Supabase:", error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((p) => ({
      id: p.id,
      code: p.code,
      nom: p.nom,
      cat: p.cat,
      marque: p.marque,
      prix: Number(p.prix) || 0,
      stock: Number(p.stock) || 0,
      stockInit: Number(p.stock_init || p.stock) || 0,
      photo: p.photo || null,
      note: Number(p.note) || 4.5,
      mots: Array.isArray(p.mots) ? p.mots : [],
      boutique: p.boutique || "MotoPièces Principal",
      equipe: p.equipe || null, // propriété equipe indispensable pour la synchronisation multi-téléphones
    }));
  } catch (err) {
    console.warn("Erreur réseau chargement produits Supabase:", err);
    return [];
  }
}

/**
 * Enregistre une bannière publicitaire / image promotionnelle dans Supabase
 */
export async function enregistrerPubliciteSupabase(pub) {
  try {
    const { data, error } = await supabase
      .from("parts")
      .upsert({
        code: `PROMO-${pub.id || Date.now()}`,
        nom: pub.titre || "Offre Spéciale MotoPièces",
        cat: "accessoires",
        marque: "Promo",
        prix: 0,
        stock: 1,
        photo: pub.image,
        description: pub.date || new Date().toLocaleDateString("fr-FR"),
        boutique: "PROMO_BANNER",
      }, { onConflict: "code" })
      .select();

    if (error) {
      console.warn("Avis enregistrement pub Supabase:", error.message);
    }
    return { data, error };
  } catch (err) {
    console.warn("Erreur réseau pub Supabase:", err);
    return { error: err };
  }
}

/**
 * Récupère toutes les bannières publicitaires enregistrées sur Supabase
 */
export async function chargerPublicitesSupabase() {
  try {
    const { data, error } = await supabase
      .from("parts")
      .select("*")
      .eq("boutique", "PROMO_BANNER")
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map((p) => ({
      id: p.id,
      titre: p.nom,
      image: p.photo,
      date: p.description || new Date(p.created_at).toLocaleDateString("fr-FR"),
    }));
  } catch (err) {
    console.warn("Erreur réseau chargement bannières Supabase:", err);
    return [];
  }
}

/**
 * Supprime une bannière publicitaire de Supabase
 */
export async function supprimerPubliciteSupabase(id) {
  try {
    await supabase.from("parts").delete().eq("id", id);
  } catch (err) {
    console.warn("Erreur suppression pub Supabase:", err);
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

    if (saleData && vente.items && vente.items.length > 0) {
      const itemsPayload = vente.items.map((it) => ({
        sale_id: saleData.id,
        part_id: null,
        nom: it.p?.nom || it.nom || "Article",
        quantite: it.qte || 1,
        prix_unitaire: it.prixLigne ?? (it.p ? it.p.prix : it.prix) ?? 0,
        photo: it.photo || it.p?.photo || null,
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
 * Met à jour une vente déjà enregistrée dans Supabase (prix et statut réels après validation)
 */
export async function majVenteSupabase(vente) {
  try {
    const idSup = vente?.supabase_id;
    const totalVente = vente.total || (vente.items || []).reduce((s, it) => {
      const p = it.prixLigne ?? (it.p ? it.p.prix : it.prix) ?? 0;
      return s + (p * (it.qte || 1));
    }, 0) || 0;

    if (!idSup) return enregistrerVenteSupabase(vente);

    const { error: majError } = await supabase
      .from("sales")
      .update({
        total: totalVente,
        statut: vente.statut || "payée",
        date_vente: vente.date || new Date().toLocaleString("fr-FR"),
      })
      .eq("id", idSup);

    if (majError) {
      console.warn("Notice mise à jour Supabase sales:", majError.message);
      return { success: false, error: majError };
    }

    await supabase.from("sale_items").delete().eq("sale_id", idSup);
    const itemsPayload = (vente.items || []).map((it) => ({
      sale_id: idSup,
      part_id: null,
      nom: it.p?.nom || it.nom || "Article",
      quantite: it.qte || 1,
      prix_unitaire: it.prixLigne ?? (it.p ? it.p.prix : it.prix) ?? 0,
      photo: it.photo || it.p?.photo || null,
    }));
    if (itemsPayload.length > 0) {
      const { error: itemsError } = await supabase.from("sale_items").insert(itemsPayload);
      if (itemsError) console.warn("Notice mise à jour Supabase sale_items:", itemsError.message);
    }
    return { success: true };
  } catch (err) {
    console.warn("Erreur réseau mise à jour vente Supabase:", err);
    return { error: err };
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
      supabase_id: s.id,
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
        photo: it.photo || null,
      })),
    }));
  } catch (err) {
    console.warn("Erreur réseau chargement ventes Supabase:", err);
    return [];
  }
}
