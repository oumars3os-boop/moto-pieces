import { GestionnaireAppel, traduireErreurMedia } from "../src/lib/appels.js";

const attendre = (ms = 15) => new Promise(r => setTimeout(r, ms));
class FauxTrack { constructor(kind) { this.kind = kind; this.enabled = true; this.arrete = false; } stop() { this.arrete = true; } }
class FauxFlux { constructor(video, face = "user") { this.pistes = [new FauxTrack("audio")]; if (video) this.pistes.push(Object.assign(new FauxTrack("video"), { face })); }
  getTracks() { return [...this.pistes]; } getAudioTracks() { return this.pistes.filter(t => t.kind === "audio"); } getVideoTracks() { return this.pistes.filter(t => t.kind === "video"); }
  removeTrack(t) { this.pistes = this.pistes.filter(x => x !== t); } addTrack(t) { this.pistes.push(t); } }
class FauxPeer {
  constructor(cfg) { this.cfg = cfg; this.senders = []; this.remote = null; this.ajoutes = []; this.connectionState = "new"; this.restarts = 0; this.ferme = false; }
  addTrack(t) { const s = { track: t, replaceTrack: async (n) => { s.track = n; } }; this.senders.push(s); return s; }
  getSenders() { return this.senders; }
  async createOffer(o) { return { type: "offer", sdp: o && o.iceRestart ? "offre-redemarrage" : "offre" }; }
  async createAnswer() { return { type: "answer", sdp: "reponse" }; }
  async setLocalDescription() { setTimeout(() => this.onicecandidate && this.onicecandidate({ candidate: { toJSON: () => ({ candidate: "cand-" + Math.random() }) } }), 0); }
  async setRemoteDescription(d) { this.remote = d; }
  async addIceCandidate(c) { if (!this.remote) throw new Error("description distante absente"); this.ajoutes.push(c); }
  restartIce() { this.restarts++; }
  close() { this.ferme = true; }
  etat(s) { this.connectionState = s; this.onconnectionstatechange && this.onconnectionstatechange(); }
}
function monde(options = {}) {
  const gens = {}; const journal = []; const medias = []; const peers = {};
  const creer = (tel, nom, opt = {}) => {
    const g = new GestionnaireAppel({
      monTel: tel, monNom: nom,
      envoyer: (vers, msg) => setTimeout(() => gens[vers] && gens[vers].recevoir({ ...msg, de: tel, nom }), 1),
      obtenirIce: async () => [{ urls: "stun:test" }],
      obtenirMedia: async (c) => { medias.push({ tel, ...c }); if (opt.mediaErreur) { const e = new Error("x"); e.name = opt.mediaErreur; throw e; } return new FauxFlux(c.video, c.facingMode); },
      creerPeer: (cfg) => (peers[tel] = new FauxPeer(cfg)),
      surChangement: () => {}, surJournal: (e) => journal.push({ par: tel, ...e }),
      delaiSonnerie: options.delaiSonnerie ?? 80, delaiReconnexion: options.delaiReconnexion ?? 60,
    });
    gens[tel] = g; return g;
  };
  return { gens, journal, medias, peers, creer };
}
let ok = 0, total = 0; const t = (nom, c, d = "") => { total++; if (c) ok++; console.log((c ? "✔ " : "✘ ") + nom + (d ? "  [" + d + "]" : "")); };

// 1) appel audio normal, de bout en bout
{ const m = monde(); const A = m.creer("A", "Alice"), B = m.creer("B", "Bruno");
  const r = await A.appeler("B", "Bruno", "audio"); await attendre();
  t("A appelle : A sonne, B reçoit l'appel entrant avec le nom de A", r.ok && A.etat.phase === "sortant" && B.etat.phase === "entrant" && B.etat.avec.nom === "Alice" && B.etat.media === "audio");
  t("appel audio : seul le micro est demandé (pas la caméra)", m.medias.length === 1 && m.medias[0].video === false);
  await B.accepter(); await attendre(40);
  t("B décroche : les deux passent en « connexion », échange offre/réponse fait", A.etat.phase === "connexion" && B.etat.phase === "connexion" && m.peers.A.remote?.type === "answer" && m.peers.B.remote?.type === "offer");
  t("les candidats réseau arrivent des deux côtés, sans erreur", m.peers.A.ajoutes.length > 0 && m.peers.B.ajoutes.length > 0);
  m.peers.A.etat("connected"); m.peers.B.etat("connected");
  t("liaison établie : les deux sont « actif » (appel en cours)", A.etat.phase === "actif" && B.etat.phase === "actif" && A.etat.debut > 0);
  await attendre(1100); A.terminer(); await attendre();
  t("A raccroche : B est prévenu et les deux micros sont coupés", B.etat.phase === "fin" && A.etat.phase === "fin" && m.peers.A.ferme && m.peers.B.ferme);
  t("trace dans la conversation : « terminé » avec une durée (écrite par l'appelant seulement)", m.journal.length === 1 && m.journal[0].par === "A" && m.journal[0].statut === "termine" && m.journal[0].duree >= 1, JSON.stringify(m.journal[0]));
  await attendre(2300); t("l'écran se remet au repos après quelques secondes", A.etat.phase === "repos" && B.etat.phase === "repos"); }

// 2) appel vidéo : micro + caméra
{ const m = monde(); const A = m.creer("A", "Alice"), B = m.creer("B", "Bruno");
  await A.appeler("B", "Bruno", "video"); await attendre(); await B.accepter(); await attendre(30);
  t("appel vidéo : micro ET caméra demandés des deux côtés", m.medias.every(x => x.video === true) && m.medias.length === 2);
  m.peers.A.etat("connected"); m.peers.B.etat("connected");
  A.basculerMicro(); t("couper le micro : la piste audio est désactivée (l'autre n'entend plus)", A.fluxLocal.getAudioTracks()[0].enabled === false && A.etat.micro === false);
  A.basculerMicro(); t("réactiver le micro", A.fluxLocal.getAudioTracks()[0].enabled === true);
  A.basculerCamera(); t("couper la caméra", A.fluxLocal.getVideoTracks()[0].enabled === false && A.etat.camera === false);
  const r = await A.changerCamera();
  t("caméra avant → arrière : nouvelle piste envoyée à l'autre sans couper l'appel", r.ok && A.etat.face === "environment" && A.fluxLocal.getVideoTracks()[0].face === "environment" && m.peers.A.senders.find(s => s.track.kind === "video").track.face === "environment" && A.etat.phase === "actif");
  t("…et la caméra reste coupée si elle l'était", A.fluxLocal.getVideoTracks()[0].enabled === false);
  A.terminer(); await attendre(); }

// 3) refus
{ const m = monde(); const A = m.creer("A", "Alice"), B = m.creer("B", "Bruno");
  await A.appeler("B", "Bruno"); await attendre(); B.refuser(); await attendre();
  t("B refuse : A est prévenu, trace « refusé »", A.etat.phase === "fin" && B.etat.phase === "fin" && m.journal[0]?.statut === "refuse"); }

// 4) correspondant déjà en appel
{ const m = monde(); const A = m.creer("A", "Alice"), B = m.creer("B", "Bruno"), C = m.creer("C", "Chloé");
  await A.appeler("B", "Bruno"); await attendre(); await B.accepter(); await attendre(30); m.peers.A.etat("connected"); m.peers.B.etat("connected");
  await C.appeler("B", "Bruno"); await attendre(30);
  t("B est déjà en appel : C reçoit « occupé » (trace) et l'appel A–B n'est pas perturbé", C.etat.phase === "fin" && m.journal.find(j => j.par === "C")?.statut === "occupe" && A.etat.phase === "actif" && B.etat.phase === "actif"); }

// 5) pas de réponse : appel manqué
{ const m = monde({ delaiSonnerie: 60 }); const A = m.creer("A", "Alice"), B = m.creer("B", "Bruno");
  await A.appeler("B", "Bruno"); await attendre(15); t("B voit l'appel qui sonne", B.etat.phase === "entrant"); await attendre(120);
  t("sans réponse : A abandonne, trace « manqué », B n'a plus de sonnerie", A.etat.phase === "fin" && m.journal[0]?.statut === "manque" && B.etat.phase === "fin"); }

// 6) l'appelant annule avant la réponse
{ const m = monde(); const A = m.creer("A", "Alice"), B = m.creer("B", "Bruno");
  await A.appeler("B", "Bruno"); await attendre(); A.terminer(); await attendre();
  t("A annule pendant que ça sonne : la sonnerie de B s'arrête, trace « annulé »", B.etat.phase === "fin" && m.journal[0]?.statut === "annule"); }

// 7) autorisation micro refusée chez l'appelant
{ const m = monde(); const A = m.creer("A", "Alice", { mediaErreur: "NotAllowedError" }), B = m.creer("B", "Bruno");
  const r = await A.appeler("B", "Bruno"); await attendre();
  t("autorisation refusée chez l'appelant : message clair, personne n'est appelé", !r.ok && /Autorisation refusée/.test(r.erreur) && B.etat.phase === "repos" && A.etat.phase === "repos"); }

// 8) autorisation refusée chez celui qui décroche
{ const m = monde(); const A = m.creer("A", "Alice"), B = m.creer("B", "Bruno", { mediaErreur: "NotAllowedError" });
  await A.appeler("B", "Bruno", "video"); await attendre(); const r = await B.accepter(); await attendre();
  t("autorisation refusée au moment de décrocher : message clair, A est prévenu", !r.ok && /caméra/.test(r.erreur) && A.etat.phase === "fin" && m.journal[0]?.statut === "refuse"); }

// 9) messages réseau arrivés dans le désordre
{ const m = monde(); const A = m.creer("A", "Alice"), B = m.creer("B", "Bruno");
  await A.appeler("B", "Bruno"); await attendre(); await B.accepter();   // aucune attente : l'offre de A n'est pas encore arrivée
  const id = B.etat.id; const avant = m.peers.B.ajoutes.length;
  await B.recevoir({ type: "ice", id, de: "A", candidat: { candidate: "trop-tot" } });
  t("candidat réseau reçu avant la description distante : réellement mis de côté (1 en attente)", B.descriptionDistanteFaite === false && B.iceEnAttente.length === 1);
  await attendre(40);
  t("…puis appliqué dès que possible", m.peers.B.ajoutes.length > avant && B.iceEnAttente.length === 0);
  const etatAvant = B.etat.phase;
  await B.recevoir({ type: "fin", id: "ancien-appel", de: "A" }); await B.recevoir({ type: "fin", id, de: "Z" });
  t("messages d'un ancien appel ou d'un inconnu : ignorés", B.etat.phase === etatAvant); }

// 10) l'autre raccroche pendant l'appel
{ const m = monde(); const A = m.creer("A", "Alice"), B = m.creer("B", "Bruno");
  await A.appeler("B", "Bruno"); await attendre(); await B.accepter(); await attendre(30); m.peers.A.etat("connected"); m.peers.B.etat("connected"); await attendre(1100);
  B.terminer(); await attendre();
  t("B raccroche : A termine aussi, et c'est A qui écrit la trace avec la durée", A.etat.phase === "fin" && m.journal.length === 1 && m.journal[0].par === "A" && m.journal[0].statut === "termine" && m.journal[0].duree >= 1); }

// 11) coupure réseau puis retour
{ const m = monde({ delaiReconnexion: 80 }); const A = m.creer("A", "Alice"), B = m.creer("B", "Bruno");
  await A.appeler("B", "Bruno"); await attendre(); await B.accepter(); await attendre(30); m.peers.A.etat("connected"); m.peers.B.etat("connected");
  m.peers.A.etat("disconnected"); await attendre(10);
  t("liaison coupée : « Reconnexion… » affiché, l'appelant relance la liaison", A.etat.connexion === "Reconnexion…" && m.peers.A.restarts >= 1 && A.etat.phase === "actif");
  await attendre(20); m.peers.A.etat("connected"); await attendre(120);
  t("liaison revenue à temps : l'appel continue", A.etat.phase === "actif" && A.etat.connexion === "Connecté"); }

// 12) coupure définitive
{ const m = monde({ delaiReconnexion: 40 }); const A = m.creer("A", "Alice"), B = m.creer("B", "Bruno");
  await A.appeler("B", "Bruno"); await attendre(); await B.accepter(); await attendre(30); m.peers.A.etat("connected"); m.peers.B.etat("connected");
  m.peers.A.etat("failed"); await attendre(250);
  t("liaison perdue pour de bon : l'appel s'arrête proprement des deux côtés, trace « échec »", A.etat.phase === "fin" && B.etat.phase === "fin" && A.etat.erreur === "Connexion perdue." && m.journal.some(j => j.statut === "echec" || j.statut === "termine")); }

// 13) règles de base
{ const m = monde(); const A = m.creer("A", "Alice"), B = m.creer("B", "Bruno");
  t("on ne peut pas s'appeler soi-même", (await A.appeler("A", "Alice")).ok === false);
  await A.appeler("B", "Bruno"); await attendre();
  const r2 = await A.appeler("B", "Bruno"); t("un deuxième appel pendant le premier est refusé", r2.ok === false && /déjà en cours/.test(r2.erreur));
  A.terminer(); await attendre(); }

// 14) messages d'erreur
t("erreurs de micro traduites en français clair", /Autorisation refusée/.test(traduireErreurMedia({ name: "NotAllowedError" }, true)) && /Aucun micro/.test(traduireErreurMedia({ name: "NotFoundError" })) && /autre application/.test(traduireErreurMedia({ name: "NotReadableError" })) && /https/.test(traduireErreurMedia({ name: "NO_MEDIA" })));
console.log("\nRÉSULTAT : " + ok + "/" + total);
