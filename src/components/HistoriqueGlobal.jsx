import React, { useState, useEffect } from "react";
import { chargerVentesSupabase } from "@/lib/supabase";

export default function HistoriqueGlobal({ ventes: ventesProps = [] }) {
  const [ventes, setVentes] = useState([]);

  useEffect(() => {
    async function chargerVentesCompletes() {
      try {
        const ventesSupabase = await chargerVentesSupabase();
        // Correctif : on ne garde que les ventes complètes et valides.
        // Les vieilles lignes « payées à 0 FCFA » sans article (ancien bug) ne s'afficheront plus jamais.
        const lignesValides = (ventesSupabase || []).filter(v =>
          (v.items || []).length > 0 && (v.statut === "payée" ? Number(v.total) > 0 : true));
        if (lignesValides.length > 0) {
          setVentes(lignesValides);
          return;
        }
      } catch (e) {
        console.warn("Avis chargement Supabase:", e);
      }

      const local = JSON.parse(localStorage.getItem("motopieces_ventes")) ||
                    JSON.parse(localStorage.getItem("historique_ventes")) || [];
      // Même filtre de sécurité sur les ventes locales
      const localValide = local.filter(v =>
        (v.items || []).length > 0 && !(v.statut === "payée" && !(Number(v.total) > 0)));
      setVentes(localValide.length ? localValide : ventesProps);
    }

    chargerVentesCompletes();
  }, [ventesProps]);

  const listeEffective = ventes.length ? ventes : ventesProps;

  // Regrouper automatiquement toutes les ventes par jour
  const ventesParJour = listeEffective.reduce((acc, vente) => {
    const dateVente = vente.date ? vente.date.split(" à ")[0] : new Date().toLocaleDateString("fr-FR");
    if (!acc[dateVente]) {
      acc[dateVente] = [];
    }
    acc[dateVente].push(vente);
    return acc;
  }, {});

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">📊 Historique Global des Ventes</h2>
        <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">
          Visible par toute l'équipe (Vendeurs, Secrétariat & Admin)
        </span>
      </div>

      {Object.keys(ventesParJour).length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
          Aucun historique enregistré pour le moment.
        </div>
      ) : (
        Object.keys(ventesParJour).map((date) => (
          <div key={date} className="mb-6 bg-white shadow-md rounded-lg p-4 border border-gray-200">
            {/* En-tête de la date */}
            <h3 className="text-lg font-semibold text-blue-600 mb-4 border-b pb-2 flex items-center">
              📅 Date : {date} <span className="ml-auto text-xs font-normal text-gray-500">({ventesParJour[date].length} transaction(s))</span>
            </h3>

            <div className="space-y-4">
              {ventesParJour[date].map((vente, index) => {
                const totalMontant = vente.total || vente.montant || (vente.items || []).reduce((s, it) => s + ((it.prixLigne ?? it.prix ?? it.p?.prix ?? 0) * (it.qte || 1)), 0);
                const articles = vente.items || [];

                return (
                  <div key={vente.id || index} className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50 p-4 rounded-lg border border-gray-100 hover:shadow-sm transition">

                    {/* Détails de la commande + TOUTES les photos des articles */}
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-bold text-gray-800">Commande #{vente.id || index + 1} — Client : {vente.client || "Comptoir"}</p>
                          <p className="text-sm text-gray-600">
                            👤 Vendeur : <span className="font-medium text-blue-700">{vente.vendeur || "MotoPièces"}</span> | ⏰ Date : {vente.date || "--:--"}
                          </p>
                          <p className="text-xs text-gray-500">
                            Articles : {articles.length} article(s) inclus
                          </p>
                        </div>
                      </div>

                      {/* Toutes les photos des articles de la commande */}
                      {articles.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
                          {articles.map((it, i) => {
                            const photoArt = it.photo || it.p?.photo || null;
                            const nomArt = it.p?.nom || it.nom || "Article";
                            return (
                              <div key={i} className="bg-white rounded-md border border-gray-200 p-1.5 text-center">
                                {photoArt ? (
                                  <img src={photoArt} alt={nomArt} className="w-full h-16 object-cover rounded border border-gray-200" />
                                ) : (
                                  <div className="w-full h-16 bg-gray-200 rounded flex items-center justify-center text-lg">📦</div>
                                )}
                                <p className="text-[10px] font-semibold text-gray-700 mt-1 leading-tight truncate">{nomArt}</p>
                                <p className="text-[10px] text-gray-500">{it.qte || 1} × {Number(it.prixLigne ?? it.prix ?? it.p?.prix ?? 0).toLocaleString("fr-FR")} F</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Montant total et Statut de la commande */}
                    <div className="mt-4 md:mt-0 flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-xs text-gray-400 uppercase font-semibold">Montant Total</p>
                        <p className="text-xl font-extrabold text-green-600">
                          {Number(totalMontant).toLocaleString("fr-FR")} FCFA
                        </p>
                      </div>
                      <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm ${
                        vente.statut === "payée" || vente.statut === "Payée" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {vente.statut === "payée" || vente.statut === "Payée" ? "Payée ✅" : "En attente"}
                      </span>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
