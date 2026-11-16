// Kleine Helfer für pixelgenaues Zeichnen.

// Deterministischer Zufall: gleiche Zahl rein, gleiche Landschaft raus.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

export function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

export function px(ctx, x, y, color) {
  rect(ctx, x, y, 1, 1, color);
}

// Gefüllter Kreis ohne Kantenglättung.
export function circle(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy) + 0.5);
    ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
  }
}

// Bayer-Matrix: sorgt für das typische Raster-Muster (Dithering) bei Farbübergängen.
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// true, wenn der Pixel (x, y) bei einer Deckung von 0..1 gesetzt werden soll.
export function dither(x, y, amount) {
  return amount > (BAYER[y & 3][x & 3] + 0.5) / 16;
}

// Dreieckswelle 0..1, Basis für kantige Bergrücken.
export function tri(t) {
  const f = t - Math.floor(t);
  return 1 - Math.abs(f * 2 - 1);
}
