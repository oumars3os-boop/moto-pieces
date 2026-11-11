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
          // Photo de profil (enregistrée en direct)
          photo: compte.photo || null,
          // Équipe : le téléphone de l'administrateur qui a créé ce compte
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
    // Correctif : part_id mis à null — les articles de la boutique ne sont pas dans la table
    // en ligne "parts" (vide), et une référence inexistante fait échouer SILENCIEUSEMENT
    // l'enregistrement des lignes, ce qui vidait les ventes après actualisation.
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
 * Met à jour une vente déjà enregistrée dans Supabase (prix et statut réels après validation),
 * au lieu d'insérer une seconde ligne. Crée la vente si elle n'existe pas encore en ligne.
 */
export async function majVenteSupabase(vente) {
  try {
    const idSup = vente?.supabase_id;
    const totalVente = vente.total || (vente.items || []).reduce((s, it) => {
      const p = it.prixLigne ?? (it.p ? it.p.prix : it.prix) ?? 0;
      return s + (p * (it.qte || 1));
    }, 0) || 0;

    if (!idSup) return enregistrerVenteSupabase(vente); // pas encore en ligne : première insertion

    // 1) Mettre à jour la ligne principale (total réel + statut payée)
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

    // 2) Réécrire les lignes d'articles avec les prix réels (prix fixés par le vendeur/secrétaire)
    await supabase.from("sale_items").delete().eq("sale_id", idSup);
    const itemsPayload = (vente.items || []).map((it) => ({
      sale_id: idSup,
      part_id: null, // même correctif : jamais de référence à la table "parts" vide
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

/**
 * v61 — Sauvegarde la liste complète des articles d'une équipe dans public.produits_data.
 * La base de données devient la copie de sécurité officielle : plus aucune perte d'articles.
 */
export async function sauvegarderProduitsSupabase(equipe, produits) {
  try {
    const liste = Array.isArray(produits) ? produits : [];
    const { data, error } = await supabase
      .from("produits_data")
      .upsert(
        { equipe: equipe, contenu: liste, maj: new Date().toISOString() },
        { onConflict: "equipe" }
      );
    if (error) console.warn("Notice sauvegarde articles Supabase:", error.message);
    return { data, error };
  } catch (err) {
    console.warn("Erreur réseau sauvegarde articles Supabase:", err);
    return { error: err };
  }
}

/**
 * v61 — Récupère la liste des articles d'une équipe depuis la base de données.
 */
export async function chargerProduitsSupabase(equipe) {
  try {
    const { data, error } = await supabase
      .from("produits_data")
      .select("contenu")
      .eq("equipe", equipe)
      .maybeSingle();
    if (error) {
      console.warn("Notice chargement articles Supabase:", error.message);
      return [];
    }
    const liste = data && data.contenu;
    return Array.isArray(liste) ? liste : [];
  } catch (err) {
    console.warn("Erreur réseau chargement articles Supabase:", err);
    return [];
  }
}

/**
 * v64 — Récupère TOUS les articles de toutes les boutiques, sans compte.
 * Le site devient public : dès l'ouverture, tout s'affiche, comme un vrai site de vente en ligne.
 */
export async function chargerTousProduitsSupabase() {
  try {
    const { data, error } = await supabase
      .from("produits_data")
      .select("equipe, contenu");
    if (error) {
      console.warn("Notice chargement articles public Supabase:", error.message);
      return [];
    }
    const tout = [];
    (data || []).forEach((ligne) => {
      const liste = ligne && ligne.contenu;
      const eq = (ligne && ligne.equipe) || "";
      if (Array.isArray(liste)) {
        liste.forEach((p) => tout.push({ ...p, equipe: p.equipe || eq }));
      }
    });
    return tout;
  } catch (err) {
    console.warn("Erreur réseau chargement articles public Supabase:", err);
    return [];
  }
}

/**
 * v64 — Temps réel : prévient le site dès qu'un article change dans la base de données.
 */
export function abonnerProduitsTempsReel(callback) {
  try {
    const canal = supabase
      .channel("produits-temps-reel", { config: { broadcast: { self: false } } })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "produits_data" },
        () => { try { callback(); } catch (e) {} }
      )
      .subscribe();
    return canal;
  } catch (err) {
    console.warn("Erreur abonnement temps réel produits:", err);
    return null;
  }
}

/**
 * v67 — Publicités en temps réel : les publicités sont stockées dans la base
 * de données, donc tous les téléphones les voient en même temps.
 */
export async function chargerPublicitesSupabase() {
  try {
    const { data, error } = await supabase
      .from("publicites_data")
      .select("*")
      .order("id", { ascending: false });
    if (error) {
      console.warn("Notice chargement publicites Supabase:", error.message);
      return null;
    }
    return (data || []).map((l) => ({
      id: l.id,
      titre: l.titre,
      image: l.image,
      date: l.date,
      jours: l.jours || 1,
      expire_le: l.expire_le || null,
      cree_par: l.cree_par || "",
    }));
  } catch (err) {
    console.warn("Erreur réseau chargement publicites:", err);
    return null;
  }
}

export async function ajouterPubliciteSupabase(pub) {
  try {
    const { error } = await supabase.from("publicites_data").insert({
      titre: pub.titre || "",
      image: pub.image || "",
      date: pub.date || "",
      jours: pub.jours || 1,
      expire_le: pub.expire_le || null,
      cree_par: pub.cree_par || "",
    });
    if (error) console.warn("Notice enregistrement publicite:", error.message);
    return !error;
  } catch (err) {
    console.warn("Erreur reseau enregistrement publicite:", err);
    return false;
  }
}

export async function supprimerPubliciteSupabase(id) {
  try {
    const { error } = await supabase.from("publicites_data").delete().eq("id", id);
    if (error) console.warn("Notice suppression publicite:", error.message);
    return !error;
  } catch (err) {
    console.warn("Erreur reseau suppression publicite:", err);
    return false;
  }
}

/**
 * v67 — Temps réel : prévient le site dès qu'une publicité change dans la base.
 */
export function abonnerPublicitesTempsReel(callback) {
  try {
    const canal = supabase
      .channel("publicites-temps-reel", { config: { broadcast: { self: false } } })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "publicites_data" },
        () => { try { callback(); } catch (e) {} }
      )
      .subscribe();
    return canal;
  } catch (err) {
    console.warn("Erreur abonnement temps reel publicites:", err);
    return null;
  }
}

/**
 * v67 — Durée des publicités (nombre de jours), décidée par le développeur.
 */
export async function chargerDureePubliciteSupabase() {
  try {
    const { data, error } = await supabase
      .from("parametres_data")
      .select("valeur")
      .eq("cle", "duree_publicite")
      .maybeSingle();
    if (error || !data) return null;
    const j = parseInt(data.valeur);
    return isNaN(j) ? null : j;
  } catch (err) {
    return null;
  }
}

export async function sauvegarderDureePubliciteSupabase(jours) {
  try {
    const { error } = await supabase
      .from("parametres_data")
      .upsert({ cle: "duree_publicite", valeur: String(jours) }, { onConflict: "cle" });
    if (error) console.warn("Notice sauvegarde duree publicite:", error.message);
    return !error;
  } catch (err) {
    console.warn("Erreur reseau sauvegarde duree publicite:", err);
    return false;
  }
}
