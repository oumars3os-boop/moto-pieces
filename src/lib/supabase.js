import { createClient } from "@supabase/supabase-js";

// Valeurs de secours si les variables d'environnement ne sont pas encore configurées
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://ikgsdrjgrvrymwnwzltu.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_PyeqRFOgHo1aomCeP9CEiQ_gPx3jLrE";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: { params: { eventsPerSecond: 20 } },
});

/* ------------------------------------------------------------------ */
/* Utilitaires                                                         */
/* ------------------------------------------------------------------ */

function prixDeLigne(it) {
  return it.prixLigne ?? (it.p ? it.p.prix : it.prix) ?? 0;
}

function totalDeVente(vente) {
  return (
    vente.total ||
    (vente.items || []).reduce((s, it) => s + prixDeLigne(it) * (it.qte || 1), 0) ||
    0
  );
}

function lignesDeVente(vente, saleId) {
  return (vente.items || []).map((it) => ({
    sale_id: saleId,
    // Les articles de la boutique ne sont pas dans la table "parts" : pas de référence
    part_id: null,
    nom: it.p?.nom || it.nom || "Article",
    quantite: it.qte || 1,
    prix_unitaire: prixDeLigne(it),
    photo: it.photo || it.p?.photo || null,
  }));
}

/** Abonnement générique : appelle callback à chaque changement d'une table. */
function abonnerTable(nomCanal, table, callback) {
  try {
    const canal = supabase
      .channel(nomCanal)
      .on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
        try { callback && callback(payload); } catch (e) { console.warn("Callback temps réel:", e); }
      })
      .subscribe();
    return canal;
  } catch (err) {
    console.warn("Abonnement temps réel impossible (" + table + "):", err);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Comptes utilisateurs                                                */
/* ------------------------------------------------------------------ */

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
    if (error) console.warn("Synchronisation Supabase users:", error.message);
    return { data, error };
  } catch (err) {
    console.warn("Erreur réseau synchronisation users:", err);
    return { error: err };
  }
}

export async function chargerComptesSupabaseListe() {
  try {
    const { data, error } = await supabase.from("users").select("*");
    if (error) { console.warn("Chargement users:", error.message); return []; }
    return data || [];
  } catch (err) {
    console.warn("Erreur réseau chargement users:", err);
    return [];
  }
}

/** NOUVEAU : temps réel sur les comptes (création, modification, blocage, suppression). */
export function abonnerComptesTempsReel(callback) {
  return abonnerTable("comptes-temps-reel", "users", callback);
}

/* ------------------------------------------------------------------ */
/* Ventes                                                              */
/* ------------------------------------------------------------------ */

export async function enregistrerVenteSupabase(vente) {
  try {
    const { data: saleData, error: saleError } = await supabase
      .from("sales")
      .insert([
        {
          vendeur_nom: vente.vendeur || "MotoPièces Principal",
          client_nom: vente.client || "Client",
          client_tel: vente.tel || "",
          total: totalDeVente(vente),
          statut: vente.statut || "payée",
          date_vente: vente.date || new Date().toLocaleString("fr-FR"),
        },
      ])
      .select()
      .single();

    if (saleError) {
      console.warn("Écriture Supabase sales:", saleError.message);
      return { success: false, error: saleError };
    }

    if (saleData && vente.items && vente.items.length > 0) {
      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(lignesDeVente(vente, saleData.id));
      if (itemsError) console.warn("Écriture Supabase sale_items:", itemsError.message);
    }
    return { success: true, data: saleData };
  } catch (err) {
    console.warn("Erreur réseau écriture vente:", err);
    return { success: false, error: err };
  }
}

export async function majVenteSupabase(vente) {
  try {
    const idSup = vente?.supabase_id;
    if (!idSup) return enregistrerVenteSupabase(vente);

    const { error: majError } = await supabase
      .from("sales")
      .update({
        total: totalDeVente(vente),
        statut: vente.statut || "payée",
        date_vente: vente.date || new Date().toLocaleString("fr-FR"),
      })
      .eq("id", idSup);

    if (majError) {
      console.warn("Mise à jour Supabase sales:", majError.message);
      return { success: false, error: majError };
    }

    await supabase.from("sale_items").delete().eq("sale_id", idSup);
    const payload = lignesDeVente(vente, idSup);
    if (payload.length > 0) {
      const { error: itemsError } = await supabase.from("sale_items").insert(payload);
      if (itemsError) console.warn("Mise à jour Supabase sale_items:", itemsError.message);
    }
    return { success: true };
  } catch (err) {
    console.warn("Erreur réseau mise à jour vente:", err);
    return { success: false, error: err };
  }
}

export async function chargerVentesSupabase() {
  try {
    const { data: sales, error } = await supabase
      .from("sales")
      .select("*, sale_items (*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Chargement Supabase sales:", error.message);
      return [];
    }

    return (sales || []).map((s) => ({
      id: s.id,
      supabase_id: s.id,
      vendeur: s.vendeur_nom,
      client: s.client_nom,
      tel: s.client_tel,
      total: Number(s.total) || 0,
      statut: s.statut,
      date: s.date_vente || s.created_at,
      items: (s.sale_items || []).map((it) => ({
        nom: it.nom,
        qte: it.quantite,
        prix: Number(it.prix_unitaire) || 0,
        prixLigne: Number(it.prix_unitaire) || 0,
        photo: it.photo || null,
        p: { nom: it.nom, prix: Number(it.prix_unitaire) || 0, photo: it.photo || null },
      })),
    }));
  } catch (err) {
    console.warn("Erreur réseau chargement ventes:", err);
    return [];
  }
}

/** NOUVEAU : temps réel sur les ventes ET leurs lignes d'articles. */
export function abonnerVentesTempsReel(callback) {
  try {
    const canal = supabase
      .channel("ventes-temps-reel")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, (p) => {
        try { callback && callback(p); } catch (e) {}
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "sale_items" }, (p) => {
        try { callback && callback(p); } catch (e) {}
      })
      .subscribe();
    return canal;
  } catch (err) {
    console.warn("Abonnement ventes impossible:", err);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Produits (sauvegardés par équipe dans produits_data)                */
/* ------------------------------------------------------------------ */

export async function sauvegarderProduitsSupabase(equipe, produits) {
  try {
    if (!equipe) return { success: false };
    const liste = Array.isArray(produits) ? produits : [];
    const { error } = await supabase
      .from("produits_data")
      .upsert({ equipe, contenu: liste, maj: new Date().toISOString() }, { onConflict: "equipe" });
    if (error) {
      console.warn("Sauvegarde produits_data:", error.message);
      return { success: false, error };
    }
    return { success: true };
  } catch (err) {
    console.warn("Erreur réseau sauvegarde produits:", err);
    return { success: false, error: err };
  }
}

export async function chargerProduitsSupabase(equipe) {
  try {
    if (!equipe) return [];
    const { data, error } = await supabase
      .from("produits_data")
      .select("contenu")
      .eq("equipe", equipe)
      .maybeSingle();
    if (error) { console.warn("Chargement produits_data:", error.message); return []; }
    const liste = data?.contenu;
    return Array.isArray(liste) ? liste : [];
  } catch (err) {
    console.warn("Erreur réseau chargement produits:", err);
    return [];
  }
}

export async function chargerTousProduitsSupabase() {
  try {
    const { data, error } = await supabase.from("produits_data").select("equipe, contenu");
    if (error) { console.warn("Chargement public produits_data:", error.message); return []; }
    const tout = [];
    (data || []).forEach((ligne) => {
      const liste = ligne.contenu;
      if (Array.isArray(liste)) {
        liste.forEach((p) => tout.push({ ...p, equipe: p.equipe || ligne.equipe }));
      }
    });
    return tout;
  } catch (err) {
    console.warn("Erreur réseau chargement public produits:", err);
    return [];
  }
}

export function abonnerProduitsTempsReel(callback) {
  return abonnerTable("produits-temps-reel", "produits_data", callback);
}

/* ------------------------------------------------------------------ */
/* Publicités                                                          */
/* ------------------------------------------------------------------ */

export async function chargerPublicitesSupabase() {
  try {
    const { data, error } = await supabase
      .from("publicites_data")
      .select("*")
      .order("cree_le", { ascending: false });
    if (error) { console.warn("Chargement publicités:", error.message); return []; }
    // Les champs gardent exactement les noms utilisés par l'application (expire_le, cree_par...)
    return data || [];
  } catch (err) {
    console.warn("Erreur réseau chargement publicités:", err);
    return [];
  }
}

export async function ajouterPubliciteSupabase(pub) {
  try {
    const { data, error } = await supabase
      .from("publicites_data")
      .insert([
        {
          titre: pub.titre || "",
          image: pub.image || pub.photo || null,
          date: pub.date || new Date().toLocaleString("fr-FR"),
          jours: pub.jours || 1,
          expire_le: pub.expire_le || null,
          cree_par: pub.cree_par || null,
        },
      ])
      .select()
      .single();
    if (error) { console.warn("Ajout publicité:", error.message); return { success: false, error }; }
    return { success: true, data };
  } catch (err) {
    console.warn("Erreur réseau ajout publicité:", err);
    return { success: false, error: err };
  }
}

export async function supprimerPubliciteSupabase(id) {
  try {
    const { error } = await supabase.from("publicites_data").delete().eq("id", id);
    if (error) { console.warn("Suppression publicité:", error.message); return { success: false, error }; }
    return { success: true };
  } catch (err) {
    console.warn("Erreur réseau suppression publicité:", err);
    return { success: false, error: err };
  }
}

export function abonnerPublicitesTempsReel(callback) {
  return abonnerTable("publicites-temps-reel", "publicites_data", callback);
}

/* ------------------------------------------------------------------ */
/* Réglages partagés (durée des publicités)                            */
/* ------------------------------------------------------------------ */

export async function chargerDureePubliciteSupabase() {
  try {
    const { data, error } = await supabase
      .from("parametres_data")
      .select("valeur")
      .eq("cle", "duree_publicite")
      .maybeSingle();
    if (error) { console.warn("Chargement durée publicité:", error.message); return null; }
    const n = Number(data?.valeur);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch (err) {
    console.warn("Erreur réseau durée publicité:", err);
    return null;
  }
}

export async function sauvegarderDureePubliciteSupabase(jours) {
  try {
    const { error } = await supabase
      .from("parametres_data")
      .upsert({ cle: "duree_publicite", valeur: String(jours) }, { onConflict: "cle" });
    if (error) { console.warn("Sauvegarde durée publicité:", error.message); return { success: false, error }; }
    return { success: true };
  } catch (err) {
    console.warn("Erreur réseau sauvegarde durée:", err);
    return { success: false, error: err };
  }
}

/** NOUVEAU : temps réel sur les réglages partagés. */
export function abonnerParametresTempsReel(callback) {
  return abonnerTable("parametres-temps-reel", "parametres_data", callback);
}
