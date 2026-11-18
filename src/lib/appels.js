// 📞 MOTEUR DES APPELS AUDIO ET VIDÉO (WebRTC)
// Ce fichier ne dépend ni de React ni du navigateur : tout ce qui touche au réseau, au micro et à la caméra lui est fourni.
// C'est ce qui permet de le tester à fond (voir tests) sans téléphone.
//
// Messages échangés entre deux téléphones (« signalisation ») :
//   invite {id, media}   → « je t'appelle » (media = "audio" ou "video")
//   accepte {id}         → « je décroche »
//   refuse {id, raison}  → « je refuse »            occupe {id} → « je suis déjà en appel »
//   offre {id, sdp}  /  reponse {id, sdp}  /  ice {id, candidat}   → établissement de la liaison
//   fin {id, raison}     → « je raccroche »

export const DELAI_SONNERIE = 45000;   // l'appelant abandonne après 45 s sans réponse
export const DELAI_RECONNEXION = 8000; // liaison coupée : on laisse 8 s pour se rétablir avant d'abandonner

/** Texte compréhensible pour une erreur de micro / caméra. */
export function traduireErreurMedia(e, avecVideo = false) {
  const nom = (e && e.name) || "";
  const cible = avecVideo ? "le micro et la caméra" : "le micro";
  if (nom === "NotAllowedError" || nom === "PermissionDeniedError") return "Autorisation refusée : autorise " + cible + " dans les réglages du navigateur, puis réessaie.";
  if (nom === "NotFoundError" || nom === "DevicesNotFoundError") return avecVideo ? "Micro ou caméra introuvable sur cet appareil." : "Aucun micro trouvé sur cet appareil.";
  if (nom === "NotReadableError" || nom === "TrackStartError") return "Le micro ou la caméra est déjà utilisé par une autre application.";
  if (nom === "OverconstrainedError") return "Cette caméra n'est pas disponible.";
  if (nom === "SecurityError" || nom === "NO_MEDIA") return "Les appels demandent une connexion sécurisée (https) et un navigateur récent.";
  return "Impossible d'accéder à " + cible + ".";
}

const nouvelId = (tel) => tel + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);

export class GestionnaireAppel {
  /**
   * @param {object} o
   * @param {string} o.monTel, o.monNom
   * @param {(versTel: string, message: object) => void} o.envoyer      envoie un message de signalisation
   * @param {() => Promise<object[]>} o.obtenirIce                      serveurs STUN/TURN
   * @param {(contraintes: {video: boolean, facingMode?: string}) => Promise<MediaStream>} o.obtenirMedia
   * @param {(config: object) => RTCPeerConnection} o.creerPeer
   * @param {(etat: object) => void} o.surChangement                    l'écran se met à jour
   * @param {(entree: object) => void} o.surJournal                     garde une trace dans la conversation
   */
  constructor(o) {
    this.monTel = o.monTel; this.monNom = o.monNom;
    this.envoyer = o.envoyer; this.obtenirIce = o.obtenirIce; this.obtenirMedia = o.obtenirMedia; this.creerPeer = o.creerPeer;
    this.surChangement = o.surChangement || (() => {}); this.surJournal = o.surJournal || (() => {});
    this.delaiSonnerie = o.delaiSonnerie ?? DELAI_SONNERIE;
    this.delaiReconnexion = o.delaiReconnexion ?? DELAI_RECONNEXION;
    this.peer = null; this.fluxLocal = null; this.fluxDistant = null;
    this.iceEnAttente = []; this.descriptionDistanteFaite = false;
    this.minuteurSonnerie = null; this.minuteurReconnexion = null; this.minuteurFin = null;
    this.relances = 0;
    this.etat = this._etatVide();
  }

  _etatVide() {
    return { phase: "repos", id: null, media: "audio", avec: null, sens: null, micro: true, camera: true, face: "user",
      connexion: "", debut: null, erreur: "", raison: "", fluxLocal: null, fluxDistant: null };
  }
  _maj(partiel) { this.etat = { ...this.etat, ...partiel, fluxLocal: this.fluxLocal, fluxDistant: this.fluxDistant }; this.surChangement(this.etat); }
  get occupe() { return this.etat.phase !== "repos" && this.etat.phase !== "fin"; }

  // ---------------------------------------------------------------- actions de la personne

  /** Appeler quelqu'un. Renvoie { ok } ou { ok:false, erreur }. */
  async appeler(tel, nom, media = "audio") {
    if (!tel || tel === this.monTel) return { ok: false, erreur: "Impossible d'appeler ce numéro." };
    if (this.occupe) return { ok: false, erreur: "Un appel est déjà en cours." };
    this._nettoyerFin();
    let flux;
    try { flux = await this.obtenirMedia({ video: media === "video", facingMode: "user" }); }
    catch (e) { return { ok: false, erreur: traduireErreurMedia(e, media === "video") }; }
    if (this.occupe) { this._arreter(flux); return { ok: false, erreur: "Un appel est arrivé pendant ce temps." }; }
    this.fluxLocal = flux; this.fluxDistant = null;
    const id = nouvelId(this.monTel);
    this.etat = this._etatVide();
    this._maj({ phase: "sortant", id, media, avec: { tel, nom: nom || tel }, sens: "sortant", connexion: "Appel en cours…" });
    this.envoyer(tel, { type: "invite", id, media, nom: this.monNom });
    this.minuteurSonnerie = setTimeout(() => this._finir("manque", { prevenir: true }), this.delaiSonnerie);
    return { ok: true, id };
  }

  /** Décrocher un appel entrant. */
  async accepter() {
    if (this.etat.phase !== "entrant") return { ok: false, erreur: "Aucun appel à décrocher." };
    const { id, media, avec } = this.etat;
    clearTimeout(this.minuteurSonnerie);
    let flux;
    try { flux = await this.obtenirMedia({ video: media === "video", facingMode: "user" }); }
    catch (e) {
      const erreur = traduireErreurMedia(e, media === "video");
      this.envoyer(avec.tel, { type: "refuse", id, raison: "media" });
      this._finir("erreur-media", { erreur });
      return { ok: false, erreur };
    }
    if (this.etat.id !== id || this.etat.phase !== "entrant") { this._arreter(flux); return { ok: false, erreur: "L'appel s'est terminé." }; }
    this.fluxLocal = flux;
    this._maj({ phase: "connexion", connexion: "Connexion…" });
    try { await this._creerPeer(); }
    catch (e) { this.envoyer(avec.tel, { type: "fin", id, raison: "echec" }); this._finir("echec", { erreur: "Connexion impossible." }); return { ok: false, erreur: "Connexion impossible." }; }
    this.envoyer(avec.tel, { type: "accepte", id });
    return { ok: true };
  }

  /** Refuser un appel entrant. */
  refuser() {
    if (this.etat.phase !== "entrant") return;
    this.envoyer(this.etat.avec.tel, { type: "refuse", id: this.etat.id, raison: "refus" });
    this._finir("refuse-local");
  }

  /** Raccrocher (ou annuler un appel qui sonne encore). */
  terminer() {
    if (!this.occupe) return;
    const { phase, id, avec } = this.etat;
    this.envoyer(avec.tel, { type: "fin", id, raison: phase === "sortant" ? "annule" : "termine" });
    this._finir(phase === "sortant" ? "annule" : "termine");
  }

  basculerMicro() {
    if (!this.fluxLocal) return;
    const actif = !this.etat.micro;
    this.fluxLocal.getAudioTracks().forEach(t => { t.enabled = actif; });
    this._maj({ micro: actif });
  }
  basculerCamera() {
    if (!this.fluxLocal || this.etat.media !== "video") return;
    const actif = !this.etat.camera;
    this.fluxLocal.getVideoTracks().forEach(t => { t.enabled = actif; });
    this._maj({ camera: actif });
  }
  /** Téléphone : passer de la caméra avant à la caméra arrière (et inversement). */
  async changerCamera() {
    if (!this.fluxLocal || this.etat.media !== "video") return { ok: false };
    const face = this.etat.face === "user" ? "environment" : "user";
    let nouveau;
    try { nouveau = await this.obtenirMedia({ video: true, facingMode: face, sansAudio: true }); }
    catch (e) { return { ok: false, erreur: "Cette caméra n'est pas disponible." }; }
    const piste = nouveau.getVideoTracks()[0];
    if (!piste) return { ok: false };
    piste.enabled = this.etat.camera;
    const envoyeur = this.peer && this.peer.getSenders().find(s => s.track && s.track.kind === "video");
    if (envoyeur) await envoyeur.replaceTrack(piste);
    this.fluxLocal.getVideoTracks().forEach(t => { this.fluxLocal.removeTrack(t); t.stop(); });
    this.fluxLocal.addTrack(piste);
    this._maj({ face });
    return { ok: true };
  }

  // ---------------------------------------------------------------- messages reçus de l'autre téléphone

  async recevoir(msg) {
    if (!msg || !msg.type || !msg.id || !msg.de) return;
    try {
      if (msg.type === "invite") return this._surInvite(msg);
      if (msg.id !== this.etat.id || !this.occupe) return;             // message d'un ancien appel : ignoré
      if (msg.de !== (this.etat.avec && this.etat.avec.tel)) return;   // quelqu'un d'autre : ignoré
      switch (msg.type) {
        case "accepte": return await this._surAccepte();
        case "refuse": return this._finir(msg.raison === "media" ? "refuse" : "refuse");
        case "occupe": return this._finir("occupe");
        case "offre": return await this._surOffre(msg);
        case "reponse": return await this._surReponse(msg);
        case "ice": return await this._surIce(msg);
        case "fin": return this._finir(msg.raison === "annule" ? "annule-distant" : msg.raison === "manque" ? "manque-distant" : msg.raison === "echec" ? "echec" : "termine", { distant: true });
        default: return;
      }
    } catch (e) { console.warn("Appel : message ignoré", msg.type, e); }
  }

  _surInvite(msg) {
    if (this.occupe) { this.envoyer(msg.de, { type: "occupe", id: msg.id }); return; }
    this._nettoyerFin();
    this.etat = this._etatVide();
    this.fluxLocal = null; this.fluxDistant = null;
    this._maj({ phase: "entrant", id: msg.id, media: msg.media === "video" ? "video" : "audio", avec: { tel: msg.de, nom: msg.nom || msg.de }, sens: "entrant", connexion: "Appel entrant…" });
    this.minuteurSonnerie = setTimeout(() => this._finir("manque-local"), this.delaiSonnerie + 5000);
  }

  async _surAccepte() {
    if (this.etat.phase !== "sortant") return;
    clearTimeout(this.minuteurSonnerie);
    this._maj({ phase: "connexion", connexion: "Connexion…" });
    await this._creerPeer();
    await this._envoyerOffre(false);
  }

  async _surOffre(msg) {
    if (!this.peer) return;
    await this.peer.setRemoteDescription({ type: "offer", sdp: msg.sdp });
    this.descriptionDistanteFaite = true;
    await this._viderIce();
    const reponse = await this.peer.createAnswer();
    await this.peer.setLocalDescription(reponse);
    this.envoyer(this.etat.avec.tel, { type: "reponse", id: this.etat.id, sdp: reponse.sdp });
  }

  async _surReponse(msg) {
    if (!this.peer) return;
    await this.peer.setRemoteDescription({ type: "answer", sdp: msg.sdp });
    this.descriptionDistanteFaite = true;
    await this._viderIce();
  }

  async _surIce(msg) {
    if (!this.peer || !msg.candidat) return;
    if (!this.descriptionDistanteFaite) { this.iceEnAttente.push(msg.candidat); return; }   // trop tôt : on garde pour plus tard
    try { await this.peer.addIceCandidate(msg.candidat); } catch (e) { /* candidat inutilisable : ignoré */ }
  }
  async _viderIce() {
    const liste = this.iceEnAttente; this.iceEnAttente = [];
    for (const c of liste) { try { await this.peer.addIceCandidate(c); } catch (e) { /* ignoré */ } }
  }

  // ---------------------------------------------------------------- liaison WebRTC

  async _creerPeer() {
    let serveurs = [];
    try { serveurs = await this.obtenirIce(); } catch (e) { serveurs = []; }
    this.peer = this.creerPeer({ iceServers: serveurs });
    this.descriptionDistanteFaite = false; this.iceEnAttente = []; this.relances = 0;
    this.fluxDistant = null;
    const flux = this.fluxLocal;
    flux.getTracks().forEach(t => this.peer.addTrack(t, flux));
    this.peer.onicecandidate = (ev) => {
      if (!ev || !ev.candidate || !this.etat.avec) return;
      const c = typeof ev.candidate.toJSON === "function" ? ev.candidate.toJSON() : ev.candidate;
      this.envoyer(this.etat.avec.tel, { type: "ice", id: this.etat.id, candidat: c });
    };
    this.peer.ontrack = (ev) => {
      this.fluxDistant = (ev.streams && ev.streams[0]) || this.fluxDistant;
      this._maj({});
    };
    this.peer.onconnectionstatechange = () => this._surEtatLiaison();
    if ("oniceconnectionstatechange" in this.peer) this.peer.oniceconnectionstatechange = () => { if (this.peer && this.peer.connectionState === undefined) this._surEtatLiaison(); };
  }

  async _envoyerOffre(redemarrage) {
    const offre = await this.peer.createOffer(redemarrage ? { iceRestart: true } : undefined);
    await this.peer.setLocalDescription(offre);
    this.envoyer(this.etat.avec.tel, { type: "offre", id: this.etat.id, sdp: offre.sdp });
  }

  _surEtatLiaison() {
    if (!this.peer || !this.occupe) return;
    const s = this.peer.connectionState || this.peer.iceConnectionState;
    if (s === "connected" || s === "completed") {
      clearTimeout(this.minuteurReconnexion); this.minuteurReconnexion = null;
      this._maj({ phase: "actif", connexion: "Connecté", debut: this.etat.debut || Date.now() });
    } else if (s === "disconnected" || s === "failed") {
      if (this.etat.phase === "actif" || this.etat.phase === "connexion") this._maj({ connexion: "Reconnexion…" });
      if (this.minuteurReconnexion) return;
      // Seul l'appelant relance la liaison ; dans tous les cas, au bout du délai sans retour, l'appel s'arrête
      if (this.etat.sens === "sortant" && this.relances < 2 && this.peer) { this.relances++; try { this.peer.restartIce && this.peer.restartIce(); } catch (e) { /* ignoré */ } this._envoyerOffre(true).catch(() => {}); }
      this.minuteurReconnexion = setTimeout(() => {
        this.minuteurReconnexion = null;
        const e = this.peer && (this.peer.connectionState || this.peer.iceConnectionState);
        if (e === "connected" || e === "completed") return;
        if (this.etat.sens === "sortant" && this.relances < 2 && this.peer) { this.relances++; this._envoyerOffre(true).catch(() => {}); this.minuteurReconnexion = setTimeout(() => { this.minuteurReconnexion = null; this._echecLiaison(); }, this.delaiReconnexion); return; }
        this._echecLiaison();
      }, this.delaiReconnexion);
    }
  }
  _echecLiaison() {
    if (!this.occupe) return;
    const { id, avec } = this.etat;
    this.envoyer(avec.tel, { type: "fin", id, raison: "echec" });
    this._finir("echec", { erreur: "Connexion perdue." });
  }

  // ---------------------------------------------------------------- fin d'appel

  _arreter(flux) { try { flux && flux.getTracks().forEach(t => t.stop()); } catch (e) { /* ignoré */ } }
  _nettoyerFin() { clearTimeout(this.minuteurFin); this.minuteurFin = null; }

  _finir(raison, opts = {}) {
    if (!this.occupe) return;
    const { avec, sens, media, id, debut } = this.etat;
    clearTimeout(this.minuteurSonnerie); clearTimeout(this.minuteurReconnexion); this.minuteurReconnexion = null;
    if (opts.prevenir && avec) this.envoyer(avec.tel, { type: "fin", id, raison: raison === "manque" ? "manque" : "termine" });
    try { if (this.peer) { this.peer.onicecandidate = null; this.peer.ontrack = null; this.peer.onconnectionstatechange = null; this.peer.close(); } } catch (e) { /* ignoré */ }
    this.peer = null;
    this._arreter(this.fluxLocal); this.fluxLocal = null; this.fluxDistant = null;
    const duree = debut ? Math.max(0, Math.round((Date.now() - debut) / 1000)) : 0;
    // L'APPELANT garde une trace dans la conversation (une seule trace par appel, visible par les deux personnes)
    if (sens === "sortant") {
      const statut = { termine: "termine", manque: "manque", "manque-distant": "manque", refuse: "refuse", occupe: "occupe", annule: "annule", "annule-distant": "annule", echec: "echec" }[raison] || (duree > 0 ? "termine" : "echec");
      this.surJournal({ avec, media, statut, duree });
    }
    this.etat = { ...this._etatVide(), phase: "fin", id, media, avec, sens, raison, duree, erreur: opts.erreur || "" };
    this.surChangement(this.etat);
    this.minuteurFin = setTimeout(() => { this.etat = this._etatVide(); this.surChangement(this.etat); }, 2200);
  }

  /** À appeler quand l'écran se ferme : tout est coupé proprement. */
  detruire() {
    if (this.occupe) { try { this.envoyer(this.etat.avec.tel, { type: "fin", id: this.etat.id, raison: this.etat.phase === "sortant" ? "annule" : "termine" }); } catch (e) { /* ignoré */ } this._finir("termine"); }
    clearTimeout(this.minuteurFin);
  }
}

/** Récupère les serveurs STUN/TURN (relais) auprès de Supabase ; à défaut, uniquement des serveurs STUN publics. */
export async function chargerServeursIce(urlFonction, cleProjet) {
  const stun = [{ urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] }];
  try {
    const r = await fetch(urlFonction, { method: "POST", headers: { "Content-Type": "application/json", apikey: cleProjet }, body: "{}" });
    if (!r.ok) return { serveurs: stun, turn: false };
    const j = await r.json();
    if (Array.isArray(j.iceServers) && j.iceServers.length) return { serveurs: j.iceServers, turn: true };
  } catch (e) { /* ignoré */ }
  return { serveurs: stun, turn: false };
}
