import { calculerMasque } from "../src/lib/objet.js";
let graine = 12345; const alea = () => (graine = (graine * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const creer = (w, h, fond) => { const d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; const [r, g, b] = fond(x, y); d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; } return d; };
const dessiner = (d, w, h, test, couleur) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (test(x, y)) { const i = (y * w + x) * 4; const bruit = (alea() - 0.5) * 10; d[i] = couleur[0] + bruit; d[i + 1] = couleur[1] + bruit; d[i + 2] = couleur[2] + bruit; } };
let ok = 0, total = 0; const t = (nom, c, detail = "") => { total++; if (c) ok++; console.log((c ? "✔ " : "✘ ") + nom + (detail ? "  [" + detail + "]" : "")); };
const W = 240, H = 240;
const bruitGris = (base) => () => { const v = base + (alea() - 0.5) * 10; return [v, v, v]; };

// 1) fond gris uni + disque sombre au centre
{ const d = creer(W, H, bruitGris(200)); dessiner(d, W, H, (x, y) => (x - 120) ** 2 + (y - 120) ** 2 < 55 ** 2, [60, 50, 45]);
  const m = calculerMasque(d, W, H); const b = m && m.bbox;
  t("fond uni + objet rond : objet trouvé au bon endroit", m && Math.abs(b.x0 - 65) <= 3 && Math.abs(b.x1 - 175) <= 3 && Math.abs(b.y0 - 65) <= 3 && Math.abs(b.y1 - 175) <= 3, m ? "boîte " + b.x0 + "-" + b.x1 + " × " + b.y0 + "-" + b.y1 + ", " + (m.fraction * 100).toFixed(1) + " %" : "null");
  t("le coin de la photo est bien retiré, le centre est gardé", m && m.masque[5 * W + 5] === 0 && m.masque[120 * W + 120] === 1); }

// 2) fond en dégradé + objet brun rectangulaire
{ const d = creer(W, H, (x) => { const v = 150 + (x / W) * 60 + (alea() - 0.5) * 8; return [v, v, v - 5]; }); dessiner(d, W, H, (x, y) => x > 80 && x < 170 && y > 90 && y < 160, [110, 70, 40]);
  const m = calculerMasque(d, W, H);
  t("fond en dégradé : objet isolé", m && m.fraction > 0.095 && m.fraction < 0.12 && m.bbox.x0 >= 76 && m.bbox.x1 <= 174, m ? (m.fraction * 100).toFixed(1) + " % (attendu ≈ 10,7 % : 89 × 69 px sur 240 × 240)" : "null"); }

// 3) objet creux (anneau) : l'intérieur reste dans l'objet, il n'est pas troué
{ const d = creer(W, H, bruitGris(205)); dessiner(d, W, H, (x, y) => { const r = Math.hypot(x - 120, y - 120); return r < 60 && r > 25; }, [40, 40, 50]);
  const m = calculerMasque(d, W, H); t("pièce creuse (anneau) : trouvée, boîte complète", m && m.bbox.x0 <= 62 && m.bbox.x1 >= 178, m ? "ok" : "null"); }

// 4) deux pièces séparées (deux vis) : les deux sont gardées
{ const d = creer(W, H, bruitGris(210)); dessiner(d, W, H, (x, y) => Math.hypot(x - 70, y - 120) < 28, [30, 30, 30]); dessiner(d, W, H, (x, y) => Math.hypot(x - 170, y - 120) < 28, [30, 30, 30]);
  const m = calculerMasque(d, W, H); t("deux pièces : les deux conservées", m && m.bbox.x0 <= 44 && m.bbox.x1 >= 196, m ? "boîte " + m.bbox.x0 + "-" + m.bbox.x1 : "null"); }

// 5) poussières dans le fond : ignorées
{ const d = creer(W, H, bruitGris(200)); dessiner(d, W, H, (x, y) => (x - 120) ** 2 + (y - 120) ** 2 < 45 ** 2, [60, 50, 45]); dessiner(d, W, H, (x, y) => x > 20 && x < 25 && y > 30 && y < 35, [20, 20, 20]);
  const m = calculerMasque(d, W, H); t("petite tache dans un coin ignorée (pas de rognage inutile)", m && m.bbox.x0 > 60, m ? "x0=" + m.bbox.x0 : "null"); }

// 6) fond très chargé (décor aléatoire) : on ne touche pas à la photo
{ const d = creer(W, H, (x, y) => { const bloc = ((Math.floor(x / 12) * 7 + Math.floor(y / 12) * 13) % 5); const c = [[220, 40, 40], [30, 160, 60], [40, 60, 200], [240, 220, 60], [120, 120, 120]][bloc]; return c; });
  dessiner(d, W, H, (x, y) => Math.hypot(x - 120, y - 120) < 50, [60, 50, 45]);
  t("décor très chargé : renvoie null (photo d'origine conservée)", calculerMasque(d, W, H) === null); }

// 7) photo sans objet
{ const d = creer(W, H, bruitGris(190)); t("photo vide (sans objet) : renvoie null", calculerMasque(d, W, H) === null); }
// 8) objet qui remplit presque toute la photo
{ const d = creer(W, H, bruitGris(200)); dessiner(d, W, H, (x, y) => x > 8 && x < 232 && y > 8 && y < 232, [70, 60, 50]); t("objet qui remplit tout le cadre : renvoie null", calculerMasque(d, W, H) === null); }
// 9) objet blanc sur fond blanc : ne retire rien de faux
{ const d = creer(W, H, bruitGris(235)); dessiner(d, W, H, (x, y) => Math.hypot(x - 120, y - 120) < 50, [232, 232, 232]); const m = calculerMasque(d, W, H); t("objet de la même couleur que le fond : renvoie null plutôt que de le supprimer", m === null); }
// 10) vitesse
{ const d = creer(360, 270, bruitGris(200)); dessiner(d, 360, 270, (x, y) => Math.hypot(x - 180, y - 135) < 80, [60, 50, 45]); const t0 = Date.now(); calculerMasque(d, 360, 270); const ms = Date.now() - t0; t("rapide (photo 360×270)", ms < 400, ms + " ms"); }
console.log("\nRÉSULTAT : " + ok + "/" + total);
