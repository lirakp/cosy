import { rng, makeCanvas } from '../utils.js';

// Kern des Sammelstück-Zeichners. Jedes Motiv wird in ein 16×16-Raster aus
// „Materialien“ gemalt; Schattierung, Umriss und Glitzer entstehen danach
// automatisch. So sehen alle 2100 Stücke wie aus einem Guss aus.

export const N = 16;

// Material-Nummern
export const M = {
  main: 1, second: 2, accent: 3, metal: 4, wood: 5,
  glow: 6, ink: 7, white: 8, skin: 9, hair: 10,
};

export class Grid {
  constructor() {
    this.d = new Uint8Array(N * N);
  }
  get(x, y) {
    return x < 0 || y < 0 || x >= N || y >= N ? 0 : this.d[y * N + x];
  }
  set(x, y, m) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < N && y < N) this.d[y * N + x] = m;
  }
  // spiegelt den Punkt an der Mittelachse
  sym(x, y, m) {
    this.set(x, y, m);
    this.set(N - 1 - x, y, m);
  }
  pts(m, list) {
    for (const [x, y] of list) this.set(x, y, m);
  }
  spts(m, list) {
    for (const [x, y] of list) this.sym(x, y, m);
  }
  rect(x, y, w, h, m) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, m);
  }
  // mittige Zeile mit halber Breite hw (hw = 3 -> 6 Pixel breit)
  row(y, hw, m) {
    for (let x = 8 - hw; x <= 7 + hw; x++) this.set(x, y, m);
  }
  rows(y0, hws, m) {
    hws.forEach((hw, i) => hw > 0 && this.row(y0 + i, hw, m));
  }
  line(x0, y0, x1, y1, m) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let i = 0; i <= steps; i++) {
      this.set(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps, m);
    }
  }
  ellipse(cx, cy, rx, ry, m) {
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.001) this.set(x, y, m);
      }
    }
  }
  // Schräge von links unten nach rechts oben
  diag(x, y, len, m, thick = 1) {
    for (let t = 0; t < len; t++) {
      this.set(x + t, y - t, m);
      if (thick > 1) this.set(x + t + 1, y - t, m);
      if (thick > 2) this.set(x + t + 1, y - t + 1, m);
    }
  }
  // ersetzt Material `from` überall dort, wo `test` zutrifft
  swap(from, to, test) {
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (this.get(x, y) === from && (!test || test(x, y))) this.set(x, y, to);
      }
    }
  }
  onEdge(x, y) {
    return !this.get(x - 1, y) || !this.get(x + 1, y) || !this.get(x, y - 1) || !this.get(x, y + 1);
  }
  // färbt den Rand der Form um
  rim(m) {
    const edge = [];
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) if (this.get(x, y) && this.onEdge(x, y)) edge.push([x, y]);
    }
    this.pts(m, edge);
  }
}

// Zufall mit ein paar Bequemlichkeiten
export function rand(seed) {
  const r = rng(seed);
  r.i = (a, b) => a + Math.floor(r() * (b - a + 1));
  r.pick = (list) => list[Math.floor(r() * list.length)];
  r.chance = (p) => r() < p;
  return r;
}

export const ramp = (h, s, l) => ({ h, s, l });
const flat = (color) => ({ flat: color });

const INK = '#1d1528';
const WHITE = '#fdf6e3';

const css = (h, s, l) =>
  `hsl(${Math.round(((h % 360) + 360) % 360)} ${Math.round(Math.max(0, Math.min(100, s)))}% ${Math.round(
    Math.max(4, Math.min(96, l))
  )}%)`;

// Je höher der Rang, desto kräftiger und edler die Farben.
const SAT = [20, 38, 52, 64, 76, 88];
const LIG = [42, 46, 48, 50, 53, 57];
const METAL = [
  [22, 24, 40], // D: Rost
  [220, 7, 52], // C: Eisen
  [212, 14, 64], // B: Stahl
  [195, 34, 70], // A: Mithril
  [44, 82, 56], // S: Gold
  [185, 78, 74], // SS: Sternenglas
];

function palette(r, tier) {
  const sat = SAT[tier] + r() * 8;
  const h1 = r() * 360;
  const h2 = h1 + (r.chance(0.5) ? 1 : -1) * (25 + r() * 35);
  const h3 = h1 + 150 + r() * 60;
  const mats = [];
  mats[M.main] = ramp(h1, sat, LIG[tier]);
  mats[M.second] = ramp(h2, sat * 0.85, LIG[tier] + 16);
  mats[M.accent] = ramp(h3, Math.min(sat + 18, 95), 56);
  mats[M.metal] = ramp(...METAL[tier]);
  mats[M.wood] = ramp(22 + r() * 12, 38, 30);
  mats[M.glow] = flat(css(h3, 100, 80));
  mats[M.ink] = flat(INK);
  mats[M.white] = flat(WHITE);
  mats[M.skin] = ramp(26, 52, 74);
  mats[M.hair] = ramp(25, 45, 28);
  return mats;
}

function color(mat, shade, shift) {
  if (mat.flat) return mat.flat;
  if (shade < 0) return css(mat.h - 10 + shift, mat.s * 0.9, mat.l + 17);
  if (shade > 0) return css(mat.h + 14 + shift, mat.s + 8, mat.l - 17);
  return css(mat.h + shift, mat.s, mat.l);
}

const SPARKLES = [0, 0, 0, 1, 3, 5];

// Malt ein Motiv. `draw(grid, zufall, edel)` füllt das Raster und darf
// einzelne Materialien überschreiben (Rückgabewert).
export function render(draw, seed, tier) {
  const r = rand(seed);
  const g = new Grid();
  const mats = palette(r, tier);
  Object.assign(mats, draw(g, r, tier / 5) || {});

  const [canvas, ctx] = makeCanvas(N, N);
  const taken = new Uint8Array(N * N);

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const m = g.get(x, y);
      if (!m) {
        if (g.get(x - 1, y) || g.get(x + 1, y) || g.get(x, y - 1) || g.get(x, y + 1)) {
          ctx.fillStyle = INK;
          ctx.fillRect(x, y, 1, 1);
          taken[y * N + x] = 1;
        }
        continue;
      }
      taken[y * N + x] = 1;
      const lit = !g.get(x, y - 1) || !g.get(x - 1, y);
      const dark = !g.get(x, y + 1) || !g.get(x + 1, y);
      const shade = lit && !dark ? -1 : dark && !lit ? 1 : 0;
      // SS-Stücke schimmern in Regenbogenfarben
      const prism = tier === 5 && m !== M.wood && m !== M.skin && m !== M.hair;
      ctx.fillStyle = color(mats[m], shade, prism ? (x + y) * 11 : 0);
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Glitzer in freien Ecken für die hohen Ränge
  ctx.fillStyle = WHITE;
  const free = (x, y) => x >= 0 && y >= 0 && x < N && y < N && !taken[y * N + x];
  for (let i = 0, tries = 0; i < SPARKLES[tier] && tries < 200; tries++) {
    const x = r.i(0, N - 1);
    const y = r.i(0, N - 1);
    if (!free(x, y)) continue;
    ctx.fillRect(x, y, 1, 1);
    taken[y * N + x] = 1;
    if (i === 0 && tier >= 4 && free(x - 1, y) && free(x + 1, y) && free(x, y - 1) && free(x, y + 1)) {
      ctx.fillRect(x - 1, y, 3, 1);
      ctx.fillRect(x, y - 1, 1, 3);
    }
    i++;
  }
  return canvas;
}
