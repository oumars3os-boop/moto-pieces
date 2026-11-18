import fs from "fs";
const src = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const bloc = src.slice(src.indexOf("const canon = (v) => {"), src.indexOf("const sigImage = (src)"));
const { canon, fusionnerParId, lireMontant } = new Function(bloc + "; return { canon, fusionnerParId, lireMontant };")();
let ok = 0, total = 0;
const t = (nom, cond) => { total++; if (cond) ok++; console.log((cond ? "✔ " : "✘ ") + nom); };

// 1) la base réordonne les champs : l'ancienne comparaison se trompait, la nouvelle non
const local = { marques: ["A", "B"], categories: [{ id: 1, nom: "x" }], credits: [{ id: 5, nom: "Paul", montant: 1000, versements: [] }] };
const serveur = { credits: [{ montant: 1000, nom: "Paul", versements: [], id: 5 }], marques: ["A", "B"], categories: [{ nom: "x", id: 1 }] };
t("ancienne comparaison : se croyait différente (cause de la boucle)", JSON.stringify(local) !== JSON.stringify(serveur));
t("nouvelle comparaison : reconnaît le même contenu quel que soit l'ordre", canon(local) === canon(serveur));
t("un vrai changement est bien détecté", canon(local) !== canon({ ...serveur, marques: ["A"] }));

// 2) un crédit saisi pendant un rechargement n'est plus écrasé
const credLocal = [{ id: 200, nom: "Nouveau (tout juste saisi)", montant: 5000, versements: [], statut: "en cours" }, { id: 100, nom: "Ancien", montant: 2000, versements: [], statut: "en cours" }];
const credServeur = [{ id: 100, nom: "Ancien", montant: 2000, versements: [], statut: "en cours" }];
const f = fusionnerParId(credLocal, credServeur);
t("crédit tout juste saisi conservé après rechargement du serveur", f.some(c => c.id === 200) && f.length === 2);
t("ordre : le plus récent en premier", f[0].id === 200);

// 3) un versement fait ici n'est pas annulé par une vieille copie du serveur
const avecVersement = [{ id: 100, nom: "Ancien", montant: 2000, versements: [{ montant: 500 }], statut: "en cours" }];
t("versement local conservé face à la copie du serveur sans versement", fusionnerParId(avecVersement, credServeur)[0].versements.length === 1);
// 4) un crédit soldé sur un autre téléphone reste soldé
const soldeServeur = [{ id: 100, nom: "Ancien", montant: 2000, versements: [{ montant: 2000 }], statut: "payé" }];
t("crédit soldé ailleurs reste soldé", fusionnerParId(credServeur, soldeServeur)[0].statut === "payé");
// 5) deux téléphones ajoutent chacun un crédit : aucun n'est perdu
t("deux crédits ajoutés sur deux téléphones : les deux restent", fusionnerParId([{ id: 3, versements: [] }], [{ id: 4, versements: [] }]).length === 2);
// 6) montants
t("montant « 10 000 » lu comme 10000", lireMontant("10 000") === 10000);
t("montant « 2500,50 » lu comme 2500.5", lireMontant("2500,50") === 2500.5);
t("montant vide ou texte → 0", lireMontant("") === 0 && lireMontant("abc") === 0);
t("montant « 15\u00a0000 » (espace insécable) lu comme 15000", lireMontant("15\u00a0000") === 15000);
console.log("\nRÉSULTAT : " + ok + "/" + total);
