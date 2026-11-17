import { VIEW_W, VIEW_H, WORLD_W } from './config.js';
import { PAL } from './palette.js';
import { rng, makeCanvas, rect, px, circle, dither, tri } from './utils.js';
import { SKIES, CLOUDS, sunPos, moonPos } from './daycycle.js';

// Der Hintergrund besteht aus mehreren Ebenen. Jede Ebene scrollt
// unterschiedlich schnell mit der Kamera (Parallax) – ferne Dinge langsam,
// nahe schnell. Das erzeugt Tiefe.

const SCROLL = WORLD_W - VIEW_W;
const layerWidth = (factor) => Math.ceil(VIEW_W + SCROLL * factor);

function makeSky(stops) {
  const [c, ctx] = makeCanvas(VIEW_W, VIEW_H);
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

function makeCloud(r, colors) {
  const w = 30 + Math.floor(r() * 26);
  const puffs = [];
  for (let x = 5; x < w - 5; x += 4 + Math.floor(r() * 4)) {
    puffs.push([x, 9 - Math.floor(r() * 3), 3 + Math.floor(r() * 3)]);
  }
  // dieselbe Wolke in den Farben jeder Tageszeit
  const imgs = {};
  for (const [key, [base, light]] of Object.entries(colors)) {
    const [c, ctx] = makeCanvas(w, 14);
    for (const [x, y, s] of puffs) circle(ctx, x, y, s, base);
    for (const [x, y, s] of puffs) circle(ctx, x - 1, y - 2, Math.max(1, s - 2), light);
    ctx.clearRect(0, 11, w, 3); // flache Unterseite
    imgs[key] = c;
  }
  return imgs;
}

function makeClouds(colors = CLOUDS) {
  const r = rng(21);
  const list = Array.from({ length: 6 }, (_, i) => ({
    imgs: makeCloud(r, colors),
    w: 0,
    x: r() * (VIEW_W + 80),
    y: 22 + Math.floor(r() * 60),
    speed: 1.5 + r() * 2.5 + i * 0.2,
  }));
  for (const c of list) c.w = c.imgs.day.width;
  return list;
}

// Kantige Bergkette als Silhouette, unten im Dunst verlaufend.
// Dieselbe Bergkette einmal in Abendfarben und einmal in Tagesfarben.
function makeMountains(factor, baseY, amp, seed, colors, snowcaps = false) {
  const w = layerWidth(factor);
  const r = rng(seed);
  const p1 = r(), p2 = r(), p3 = r();
  const imgs = {};
  for (const [key, [color, haze]] of Object.entries(colors)) {
    const [c, ctx] = makeCanvas(w, VIEW_H);
    for (let x = 0; x < w; x++) {
      const h = tri(x / 97 + p1) * 0.55 + tri(x / 41 + p2) * 0.3 + tri(x / 17 + p3) * 0.15;
      const top = Math.round(baseY - h * amp);
      rect(ctx, x, top, 1, VIEW_H - top, color);
      // Schneekappen auf den höchsten Gipfeln
      const snowLine = baseY - amp * 0.62;
      if (snowcaps && top < snowLine) rect(ctx, x, top, 1, Math.round((snowLine - top) * 0.8) + 1, key === 'day' ? '#f4f8ff' : '#f0dce6');
      for (let y = top; y < VIEW_H; y++) {
        const amount = (y - (baseY - amp * 0.35)) / (amp * 0.9);
        if (amount > 0 && dither(x, y, amount * 0.7)) px(ctx, x, y, haze);
      }
    }
    imgs[key] = c;
  }
  return { imgs, factor };
}

// Meer mit Inseln statt Bergen (Küste)
function makeSea(factor, horizon, seed) {
  const w = layerWidth(factor);
  const r = rng(seed);
  const islands = Array.from({ length: Math.ceil(w / 90) }, () => [Math.floor(r() * w), 8 + Math.floor(r() * 18), 3 + Math.floor(r() * 7)]);
  const colors = { dusk: ['#6a5a98', '#d0889a', '#4a3e70'], day: ['#3c78b8', '#a8d4f0', '#5a7a5a'] };
  const imgs = {};
  for (const [key, [sea, shine, island]] of Object.entries(colors)) {
    const [c, ctx] = makeCanvas(w, VIEW_H);
    for (const [ix, iw, ih] of islands) {
      for (let dx = -iw; dx <= iw; dx++) {
        const h = Math.round(ih * Math.sqrt(1 - (dx / (iw + 1)) ** 2));
        rect(ctx, ix + dx, horizon - h, 1, h, island);
      }
    }
    rect(ctx, 0, horizon, w, VIEW_H - horizon, sea);
    rect(ctx, 0, horizon, w, 1, shine);
    for (let y = horizon + 3; y < VIEW_H; y += 4) {
      for (let x = (y * 7) % 11; x < w; x += 9 + (y % 5)) rect(ctx, x, y, 3, 1, shine);
    }
    imgs[key] = c;
  }
  return { imgs, factor };
}

// Tagsüber bekommen die Berge ihre eigenen Farben, sonst die Abendfarben.
const mountainKey = (sky) => (sky === 'day' ? 'day' : 'dusk');

function pine(ctx, x, baseY, h, color) {
  rect(ctx, x, baseY - 2, 1, 3, color);
  const top = baseY - 2 - h;
  for (let i = 0; i < h; i++) {
    const half = (i % 4) + Math.floor(i / 4);
    rect(ctx, x - half, top + i, half * 2 + 1, 1, color);
  }
}

// Sanfte Hügel mit Tannen.
function makeHills(factor, baseY, amp, seed, color, pineColor, pineCount, snowy = false) {
  const w = layerWidth(factor);
  const [c, ctx] = makeCanvas(w, VIEW_H);
  const r = rng(seed);
  const p1 = r() * 6, p2 = r() * 6;
  const height = (x) =>
    Math.round(baseY - (Math.sin(x / 53 + p1) * 0.6 + Math.sin(x / 23 + p2) * 0.4) * amp);

  for (let i = 0; i < pineCount; i++) {
    const x = Math.floor(r() * w);
    const h = 8 + Math.floor(r() * 9);
    pine(ctx, x, height(x) + 2, h, pineColor);
    if (snowy) for (let i = 0; i < h; i += 4) rect(ctx, x - Math.floor(i / 4) - (i % 4), height(x) - h + i, Math.floor(i / 4) * 2 + 1, 1, '#f4f8ff');
  }
  for (let x = 0; x < w; x++) {
    const top = height(x);
    rect(ctx, x, top, 1, VIEW_H - top, color);
  }
  return { img: c, factor };
}

function makeSun() {
  const [c, ctx] = makeCanvas(31, 31);
  for (let y = 0; y < 31; y++) {
    for (let x = 0; x < 31; x++) {
      const d = Math.hypot(x - 15, y - 15);
      if (d > 10 && d < 15 && dither(x, y, (15 - d) / 6)) px(ctx, x, y, '#fff1b8');
    }
  }
  circle(ctx, 15, 15, 9, '#ffe27a');
  circle(ctx, 14, 14, 7, '#fff1b8');
  circle(ctx, 12, 12, 3, '#fffbe6');
  return c;
}

export function createBackground(theme = {}) {
  const skies = Object.fromEntries(Object.entries({ ...SKIES, ...theme.skies }).map(([k, stops]) => [k, makeSky(stops)]));
  const moon = makeMoon();
  const sun = makeSun();
  const stars = makeStars();
  const clouds = makeClouds(theme.clouds || CLOUDS);
  const layers = [
    ...(theme.terrain === 'sea'
      ? [makeSea(0.12, 124, 3)]
      : [
          makeMountains(0.08, 118, 46, 3, { dusk: [PAL.mountainFar, PAL.haze], day: [PAL.mountainFarDay, PAL.hazeDay] }, theme.snowcaps),
          makeMountains(0.16, 128, 40, 11, { dusk: [PAL.mountainNear, PAL.haze], day: [PAL.mountainNearDay, PAL.hazeDay] }, theme.snowcaps),
        ]),
  ];
  const hills = [
    makeHills(0.3, 128, 7, 5, PAL.hillBack, PAL.pineBack, theme.terrain === 'sea' ? 8 : 26, theme.snowcaps),
    makeHills(0.55, 140, 6, 9, PAL.hillFront, PAL.pineFront, theme.terrain === 'sea' ? 6 : 22, theme.snowcaps),
  ];

  // Zeichnet ein Bild der Tageszeit A und blendet Tageszeit B darüber.
  function blend(ctx, imgs, ph, x, y) {
    ctx.drawImage(imgs[ph.skyA], x, y);
    if (ph.mix > 0) {
      ctx.globalAlpha = ph.mix;
      ctx.drawImage(imgs[ph.skyB], x, y);
      ctx.globalAlpha = 1;
    }
  }

  return {
    update(dt) {
      for (const c of clouds) {
        c.x += c.speed * dt;
        if (c.x > VIEW_W + 40) c.x = -c.w - 20;
      }
    },

    // Himmel mit Sternen, Sonne, Mond und Wolken – wird nicht eingefärbt.
    drawSky(ctx, camX, time, ph) {
      blend(ctx, skies, ph, 0, 0);

      if (ph.night > 0.05) {
        ctx.globalAlpha = Math.min(1, ph.night * 1.2);
        for (const s of stars) {
          const twinkle = Math.sin(time * s.speed + s.phase);
          if (twinkle < -0.6) continue;
          px(ctx, s.x, s.y, PAL.star);
          if (s.big && twinkle > 0.3) {
            rect(ctx, s.x - 1, s.y, 3, 1, PAL.star);
            rect(ctx, s.x, s.y - 1, 1, 3, PAL.star);
          }
        }
        ctx.globalAlpha = 1;
      }

      const shift = Math.round(camX * 0.02);
      const s = sunPos(ph.t, VIEW_W);
      if (s) ctx.drawImage(sun, Math.round(s.x) - 15 - shift, Math.round(s.y) - 15);
      const m = moonPos(ph.t, VIEW_W);
      if (m) ctx.drawImage(moon, Math.round(m.x) - 12 - shift, Math.round(m.y) - 12);

      for (const c of clouds) blend(ctx, c.imgs, ph, Math.round(c.x - camX * 0.04) - 40, c.y);
    },

    // Berge und Hügel – landen in der Szene, die je nach Tageszeit getönt wird.
    drawLand(ctx, camX, ph) {
      const look = { ...ph, skyA: mountainKey(ph.skyA), skyB: mountainKey(ph.skyB) };
      if (look.skyA === look.skyB) look.mix = 0;
      for (const l of layers) blend(ctx, l.imgs, look, -Math.round(camX * l.factor), 0);
      for (const l of hills) ctx.drawImage(l.img, -Math.round(camX * l.factor), 0);
    },
  };
}
