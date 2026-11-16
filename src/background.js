import { VIEW_W, VIEW_H, WORLD_W } from './config.js';
import { PAL } from './palette.js';
import { rng, makeCanvas, rect, px, circle, dither, tri } from './utils.js';

// Der Hintergrund besteht aus mehreren Ebenen. Jede Ebene scrollt
// unterschiedlich schnell mit der Kamera (Parallax) – ferne Dinge langsam,
// nahe schnell. Das erzeugt Tiefe.

const SCROLL = WORLD_W - VIEW_W;
const layerWidth = (factor) => Math.ceil(VIEW_W + SCROLL * factor);

function makeSky() {
  const [c, ctx] = makeCanvas(VIEW_W, VIEW_H);
  const stops = PAL.sky;
  const horizon = 128;
  for (let y = 0; y < VIEW_H; y++) {
    const t = Math.min(y / horizon, 1) * (stops.length - 1);
    const i = Math.min(Math.floor(t), stops.length - 2);
    for (let x = 0; x < VIEW_W; x++) {
      px(ctx, x, y, dither(x, y, t - i) ? stops[i + 1] : stops[i]);
    }
  }
  return c;
}

function makeMoon() {
  const [c, ctx] = makeCanvas(25, 25);
  circle(ctx, 12, 12, 11, PAL.moon);
  circle(ctx, 8, 9, 2, PAL.moonShade);
  circle(ctx, 15, 15, 3, PAL.moonShade);
  px(ctx, 16, 7, PAL.moonShade);
  px(ctx, 9, 17, PAL.moonShade);
  return c;
}

function makeStars() {
  const r = rng(7);
  return Array.from({ length: 46 }, () => ({
    x: Math.floor(r() * VIEW_W),
    y: Math.floor(r() * r() * 78),
    big: r() < 0.15,
    phase: r() * 10,
    speed: 0.6 + r() * 1.6,
  }));
}

function makeCloud(r) {
  const w = 30 + Math.floor(r() * 26);
  const [c, ctx] = makeCanvas(w, 14);
  const puffs = [];
  for (let x = 5; x < w - 5; x += 4 + Math.floor(r() * 4)) {
    puffs.push([x, 9 - Math.floor(r() * 3), 3 + Math.floor(r() * 3)]);
  }
  for (const [x, y, s] of puffs) circle(ctx, x, y, s, PAL.cloud);
  for (const [x, y, s] of puffs) circle(ctx, x - 1, y - 2, Math.max(1, s - 2), PAL.cloudLight);
  ctx.clearRect(0, 11, w, 3); // flache Unterseite
  return c;
}

function makeClouds() {
  const r = rng(21);
  return Array.from({ length: 6 }, (_, i) => ({
    img: makeCloud(r),
    x: r() * (VIEW_W + 80),
    y: 22 + Math.floor(r() * 60),
    speed: 1.5 + r() * 2.5 + i * 0.2,
  }));
}

// Kantige Bergkette als Silhouette, unten im Dunst verlaufend.
function makeMountains(factor, baseY, amp, seed, color) {
  const w = layerWidth(factor);
  const [c, ctx] = makeCanvas(w, VIEW_H);
  const r = rng(seed);
  const p1 = r(), p2 = r(), p3 = r();
  for (let x = 0; x < w; x++) {
    const h = tri(x / 97 + p1) * 0.55 + tri(x / 41 + p2) * 0.3 + tri(x / 17 + p3) * 0.15;
    const top = Math.round(baseY - h * amp);
    rect(ctx, x, top, 1, VIEW_H - top, color);
    for (let y = top; y < VIEW_H; y++) {
      const amount = (y - (baseY - amp * 0.35)) / (amp * 0.9);
      if (amount > 0 && dither(x, y, amount * 0.7)) px(ctx, x, y, PAL.haze);
    }
  }
  return { img: c, factor };
}

function pine(ctx, x, baseY, h, color) {
  rect(ctx, x, baseY - 2, 1, 3, color);
  const top = baseY - 2 - h;
  for (let i = 0; i < h; i++) {
    const half = (i % 4) + Math.floor(i / 4);
    rect(ctx, x - half, top + i, half * 2 + 1, 1, color);
  }
}

// Sanfte Hügel mit Tannen.
function makeHills(factor, baseY, amp, seed, color, pineColor, pineCount) {
  const w = layerWidth(factor);
  const [c, ctx] = makeCanvas(w, VIEW_H);
  const r = rng(seed);
  const p1 = r() * 6, p2 = r() * 6;
  const height = (x) =>
    Math.round(baseY - (Math.sin(x / 53 + p1) * 0.6 + Math.sin(x / 23 + p2) * 0.4) * amp);

  for (let i = 0; i < pineCount; i++) {
    const x = Math.floor(r() * w);
    pine(ctx, x, height(x) + 2, 8 + Math.floor(r() * 9), pineColor);
  }
  for (let x = 0; x < w; x++) {
    const top = height(x);
    rect(ctx, x, top, 1, VIEW_H - top, color);
  }
  return { img: c, factor };
}

export function createBackground() {
  const sky = makeSky();
  const moon = makeMoon();
  const stars = makeStars();
  const clouds = makeClouds();
  const layers = [
    makeMountains(0.08, 118, 46, 3, PAL.mountainFar),
    makeMountains(0.16, 128, 40, 11, PAL.mountainNear),
    makeHills(0.3, 128, 7, 5, PAL.hillBack, PAL.pineBack, 26),
    makeHills(0.55, 140, 6, 9, PAL.hillFront, PAL.pineFront, 22),
  ];

  return {
    update(dt) {
      for (const c of clouds) {
        c.x += c.speed * dt;
        if (c.x > VIEW_W + 40) c.x = -c.img.width - 20;
      }
    },

    draw(ctx, camX, time) {
      ctx.drawImage(sky, 0, 0);

      for (const s of stars) {
        const twinkle = Math.sin(time * s.speed + s.phase);
        if (twinkle < -0.6) continue;
        px(ctx, s.x, s.y, PAL.star);
        if (s.big && twinkle > 0.3) {
          rect(ctx, s.x - 1, s.y, 3, 1, PAL.star);
          rect(ctx, s.x, s.y - 1, 1, 3, PAL.star);
        }
      }

      ctx.drawImage(moon, 236 - Math.round(camX * 0.02), 20);

      for (const c of clouds) {
        ctx.drawImage(c.img, Math.round(c.x - camX * 0.04) - 40, c.y);
      }
      for (const l of layers) {
        ctx.drawImage(l.img, -Math.round(camX * l.factor), 0);
      }
    },
  };
}
