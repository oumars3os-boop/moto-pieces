// 🧽 ISOLATION DE L'OBJET : retire l'arrière-plan d'une photo et ne garde que l'objet.
// Méthode : on mesure la couleur du fond sur les BORDS de la photo, puis on efface tout ce qui y ressemble
// en partant des bords (donc l'intérieur de l'objet reste intact). Le fond devient blanc et la photo est rognée autour de l'objet.
// Si le fond est trop chargé pour être retiré proprement (décor, mains, motifs), on renvoie null :
// la photo d'origine est alors utilisée et l'IA reçoit la consigne d'ignorer l'arrière-plan.

const distance = (r1, g1, b1, r2, g2, b2) => Math.sqrt((r1 - r2) * (r1 - r2) + (g1 - g2) * (g1 - g2) + (b1 - b2) * (b1 - b2));

/**
 * Calcule quels pixels appartiennent à l'objet.
 * @param {Uint8ClampedArray} data - pixels RGBA
 * @returns {null | {masque: Uint8Array, bbox: {x0,y0,x1,y1}, fraction: number}} null si le fond ne peut pas être retiré proprement
 */
export function calculerMasque(data, w, h) {
  const n = w * h;
  if (n < 64) return null;

  // 1) Échantillons de couleur sur une bande le long des bords
  const e = Math.max(2, Math.round(Math.min(w, h) * 0.04));
  const ech = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if ((x < e || y < e || x >= w - e || y >= h - e) && ((x + y) & 1) === 0) ech.push(y * w + x);
    }
  }
  if (ech.length < 20) return null;
  const lum = (i) => data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114;
  ech.sort((a, b) => lum(a) - lum(b));

  // 2) Couleurs du fond : 3 groupes (k-moyennes), pour couvrir un fond avec ombre ou dégradé
  let centres = [0.1, 0.5, 0.9].map(q => { const i = ech[Math.floor(q * (ech.length - 1))]; return [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]; });
  let aff = new Int32Array(ech.length);
  for (let tour = 0; tour < 8; tour++) {
    const somme = centres.map(() => [0, 0, 0, 0]);
    for (let k = 0; k < ech.length; k++) {
      const i = ech[k] * 4; let meilleur = 0, dmin = Infinity;
      for (let c = 0; c < centres.length; c++) {
        const d = distance(data[i], data[i + 1], data[i + 2], centres[c][0], centres[c][1], centres[c][2]);
        if (d < dmin) { dmin = d; meilleur = c; }
      }
      aff[k] = meilleur;
      somme[meilleur][0] += data[i]; somme[meilleur][1] += data[i + 1]; somme[meilleur][2] += data[i + 2]; somme[meilleur][3]++;
    }
    centres = centres.map((c, j) => somme[j][3] ? [somme[j][0] / somme[j][3], somme[j][1] / somme[j][3], somme[j][2] / somme[j][3]] : c);
  }
  const modeles = [];
  for (let c = 0; c < centres.length; c++) {
    let nb = 0, tot = 0;
    for (let k = 0; k < ech.length; k++) {
      if (aff[k] !== c) continue;
      const i = ech[k] * 4;
      tot += distance(data[i], data[i + 1], data[i + 2], centres[c][0], centres[c][1], centres[c][2]); nb++;
    }
    if (nb >= ech.length * 0.06) modeles.push({ c: centres[c], sigma: tot / nb });
  }
  if (modeles.length === 0) return null;
  if (Math.max(...modeles.map(m => m.sigma)) > 42) return null;          // bord trop chargé (décor, motifs) : on n'y touche pas
  const seuils = modeles.map(m => Math.min(70, Math.max(26, 2.4 * m.sigma + 12)));

  const ressembleAuFond = (p) => {
    const i = p * 4;
    for (let m = 0; m < modeles.length; m++) {
      if (distance(data[i], data[i + 1], data[i + 2], modeles[m].c[0], modeles[m].c[1], modeles[m].c[2]) < seuils[m]) return true;
    }
    return false;
  };

  // 3) Le fond = ce qui ressemble au fond ET qu'on atteint en partant des bords
  const fond = new Uint8Array(n);
  const file = new Int32Array(n);
  let tete = 0, queue = 0;
  const poser = (p) => { if (!fond[p] && ressembleAuFond(p)) { fond[p] = 1; file[queue++] = p; } };
  for (let x = 0; x < w; x++) { poser(x); poser((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { poser(y * w); poser(y * w + w - 1); }
  while (tete < queue) {
    const p = file[tete++]; const x = p % w, y = (p / w) | 0;
    if (x > 0) poser(p - 1);
    if (x < w - 1) poser(p + 1);
    if (y > 0) poser(p - w);
    if (y < h - 1) poser(p + w);
  }

  // 4) L'objet = le reste. On enlève les petites poussières et on garde les morceaux importants (objet en plusieurs parties)
  const etiquette = new Int32Array(n);
  const tailles = [0];
  let nbComp = 0;
  for (let p0 = 0; p0 < n; p0++) {
    if (fond[p0] || etiquette[p0]) continue;
    nbComp++; let taille = 0; tete = 0; queue = 0;
    etiquette[p0] = nbComp; file[queue++] = p0;
    while (tete < queue) {
      const p = file[tete++]; taille++;
      const x = p % w, y = (p / w) | 0;
      const voisins = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
      for (const q of voisins) if (q >= 0 && !fond[q] && !etiquette[q]) { etiquette[q] = nbComp; file[queue++] = q; }
    }
    tailles.push(taille);
  }
  if (nbComp === 0) return null;
  const plusGrand = Math.max(...tailles);
  const minimum = Math.max(n * 0.004, plusGrand * 0.2);
  const masque = new Uint8Array(n);
  let total = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let p = 0; p < n; p++) {
    const c = etiquette[p];
    if (c && tailles[c] >= minimum) {
      masque[p] = 1; total++;
      const x = p % w, y = (p / w) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }

  // 5) Contrôle de bon sens : un objet occupe entre 3 % et 85 % de la photo
  const fraction = total / n;
  if (fraction < 0.03 || fraction > 0.85) return null;
  return { masque, bbox: { x0, y0, x1, y1 }, fraction };
}

// Agrandit l'objet d'un pixel dans toutes les directions : on ne coupe jamais ses contours
function dilater(masque, w, h) {
  const sortie = new Uint8Array(masque.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (masque[p] || (x > 0 && masque[p - 1]) || (x < w - 1 && masque[p + 1]) || (y > 0 && masque[p - w]) || (y < h - 1 && masque[p + w])) sortie[p] = 1;
    }
  }
  return sortie;
}

function traiter(img, { coteMasque = 360, coteSortie = 1024 } = {}) {
  const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
  if (!W || !H) return null;

  // Calcul du masque sur une petite version (rapide)
  const echM = Math.min(1, coteMasque / Math.max(W, H));
  const mw = Math.max(8, Math.round(W * echM)), mh = Math.max(8, Math.round(H * echM));
  const c1 = document.createElement("canvas"); c1.width = mw; c1.height = mh;
  const x1 = c1.getContext("2d", { willReadFrequently: true });
  x1.drawImage(img, 0, 0, mw, mh);
  const m = calculerMasque(x1.getImageData(0, 0, mw, mh).data, mw, mh);
  if (!m) return null;
  const masque = dilater(m.masque, mw, mh);

  // Application sur l'image en bonne taille : fond blanc, puis rognage autour de l'objet
  const echS = Math.min(1, coteSortie / Math.max(W, H));
  const sw = Math.max(8, Math.round(W * echS)), sh = Math.max(8, Math.round(H * echS));
  const c2 = document.createElement("canvas"); c2.width = sw; c2.height = sh;
  const x2 = c2.getContext("2d", { willReadFrequently: true });
  x2.drawImage(img, 0, 0, sw, sh);
  const pixels = x2.getImageData(0, 0, sw, sh);
  for (let y = 0; y < sh; y++) {
    const my = Math.min(mh - 1, Math.floor(y * mh / sh));
    for (let x = 0; x < sw; x++) {
      const mx = Math.min(mw - 1, Math.floor(x * mw / sw));
      if (!masque[my * mw + mx]) { const i = (y * sw + x) * 4; pixels.data[i] = 255; pixels.data[i + 1] = 255; pixels.data[i + 2] = 255; pixels.data[i + 3] = 255; }
    }
  }
  x2.putImageData(pixels, 0, 0);

  const bw0 = ((m.bbox.x1 - m.bbox.x0 + 1) * sw) / mw, bh0 = ((m.bbox.y1 - m.bbox.y0 + 1) * sh) / mh;
  const marge = Math.round(Math.max(bw0, bh0) * 0.06) + 2;
  const bx = Math.max(0, Math.floor((m.bbox.x0 * sw) / mw) - marge), by = Math.max(0, Math.floor((m.bbox.y0 * sh) / mh) - marge);
  const bw = Math.min(sw - bx, Math.ceil(bw0) + 2 * marge), bh = Math.min(sh - by, Math.ceil(bh0) + 2 * marge);
  const c3 = document.createElement("canvas"); c3.width = Math.max(1, bw); c3.height = Math.max(1, bh);
  c3.getContext("2d").drawImage(c2, bx, by, bw, bh, 0, 0, bw, bh);
  return { dataUrl: c3.toDataURL("image/jpeg", 0.88), fraction: m.fraction };
}

/**
 * Retire l'arrière-plan d'une photo et garde uniquement l'objet (fond blanc, photo rognée).
 * @param {string} dataUrl
 * @returns {Promise<null | {dataUrl: string, fraction: number}>} null = fond impossible à retirer proprement (photo d'origine utilisée)
 */
export function isolerObjet(dataUrl, options = {}) {
  return new Promise((resolve) => {
    try {
      if (typeof document === "undefined" || typeof Image === "undefined" || !dataUrl) return resolve(null);
      const img = new Image();
      img.onload = () => { try { resolve(traiter(img, options)); } catch (e) { resolve(null); } };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    } catch (e) { resolve(null); }
  });
}
