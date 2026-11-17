import { VIEW_W, VIEW_H, GROUND_Y, WALK_Y } from './config.js';
import { PAL } from './palette.js';
import { rng, makeCanvas, rect, px, circle, dither } from './utils.js';
import * as village from './village.js';
import * as fishtrap from './fishtrap.js';
import * as magic from './magic.js';
import { state } from './state.js';

// Das Dorf von außen: Häuser, Rathaus, Marktstand, Teich mit Steg.
// Links wird geangelt, rechts geht es zurück zum Hof.

export const VILLAGE_W = 640;
export const VILLAGE_BOUNDS = [46, VILLAGE_W - 12];
export const VILLAGE_SPAWN = VILLAGE_W - 40;
const POND_W = 98;
const BOB = { x: 26, y: 165 };

export function zoneAt(x) {
  if (x < 72) return 'fishing';
  if (x >= 76 && x <= 98) return 'fishbook';
  if (x > 98 && x <= 112) return 'trap';
  if (x > VILLAGE_W - 34) return 'farm';
  if (Math.abs(x - village.MARKET.x) < 14) return 'market';
  for (const v of village.VILLAGERS) if (Math.abs(x - v.x) < 10) return `npc:${v.id}`;
  return null;
}

// ---------------------------------------------------------------- statische Teile

function house(ctx, x, w, wall, roof, roofDark, deco) {
  const base = GROUND_Y + 3;
  const wallH = 22;
  const top = base - wallH;
  rect(ctx, x, top, w, wallH, wall);
  rect(ctx, x + w - 4, top, 4, wallH, 'rgba(42, 33, 64, 0.18)');
  rect(ctx, x, base - 3, w, 3, PAL.stone);
  const roofH = 14;
  for (let i = 0; i < roofH; i++) {
    const inset = Math.floor((roofH - 1 - i) * 1.15);
    rect(ctx, x - 4 + inset, top - roofH + 1 + i, w + 8 - inset * 2, 1, i % 4 === 3 ? roofDark : roof);
  }
  rect(ctx, x - 4, top + 1, w + 8, 1, roofDark);
  // Tür und Fenster
  const door = x + 6;
  rect(ctx, door, base - 15, 9, 15, PAL.woodDark);
  rect(ctx, door + 1, base - 14, 7, 14, PAL.wood);
  px(ctx, door + 6, base - 7, PAL.coin);
  rect(ctx, x + w - 18, top + 6, 11, 9, PAL.woodDark);
  rect(ctx, x + w - 17, top + 7, 9, 7, '#3a3a5a');
  rect(ctx, x + w - 13, top + 7, 1, 7, PAL.woodDark);
  deco?.(ctx, x, top, base, w);
  return { window: [x + w - 17, top + 7, 9, 7] };
}

function drawPond(ctx) {
  const top = GROUND_Y + 1;
  for (let y = top; y < VIEW_H; y++) {
    const edge = POND_W - 6 + Math.round(Math.sin(y / 3) * 2);
    rect(ctx, 0, y, edge, 1, y < top + 3 ? '#4a7ab0' : '#3a6aa0');
    rect(ctx, edge, y, 2, 1, PAL.grassDark);
  }
  // Schilf und Seerosen
  for (const [x, h] of [[6, 9], [9, 12], [12, 8], [84, 10], [88, 13]]) {
    rect(ctx, x, top - h + 4, 1, h, PAL.leaf);
    rect(ctx, x, top - h + 3, 1, 3, PAL.woodDark);
  }
  for (const [x, y] of [[40, 172], [62, 176], [18, 176]]) {
    circle(ctx, x, y, 2, PAL.leaf);
    px(ctx, x, y - 1, '#f2a0b0');
  }
  // Steg
  rect(ctx, 44, WALK_Y - 1, POND_W - 40, 4, PAL.wood);
  rect(ctx, 44, WALK_Y - 1, POND_W - 40, 1, PAL.woodLight);
  for (let x = 46; x < POND_W + 2; x += 6) rect(ctx, x, WALK_Y - 1, 1, 4, PAL.woodDark);
  for (const x of [46, 70]) rect(ctx, x, WALK_Y + 3, 2, 10, PAL.woodDark);
}

// Pult mit dem Angelbuch am Ende des Stegs
function drawBookStand(ctx, x) {
  const top = WALK_Y - 18;
  rect(ctx, x, top + 5, 2, 12, PAL.woodDark);
  rect(ctx, x - 3, WALK_Y - 2, 8, 1, PAL.woodDark);
  rect(ctx, x - 6, top + 3, 14, 3, PAL.wood);
  rect(ctx, x - 6, top + 3, 14, 1, PAL.woodLight);
  rect(ctx, x - 5, top, 12, 3, '#fdf6e3');
  rect(ctx, x, top, 1, 3, '#c8b8a0');
  rect(ctx, x - 4, top + 1, 3, 1, '#4a86c0');
  rect(ctx, x + 2, top + 1, 4, 1, '#c8b8a0');
  rect(ctx, x - 6, top - 1, 14, 1, '#8a3c44');
}

function drawStall(ctx, x) {
  const base = GROUND_Y + 4;
  // Pfosten und gestreiftes Dach
  rect(ctx, x - 20, base - 28, 2, 28, PAL.woodDark);
  rect(ctx, x + 18, base - 28, 2, 28, PAL.woodDark);
  for (let i = 0; i < 44; i++) rect(ctx, x - 22 + i, base - 32, 1, 6, Math.floor(i / 4) % 2 ? '#fdf6e3' : '#c0504a');
  for (let i = 0; i < 44; i += 4) rect(ctx, x - 22 + i, base - 26, 2, 2, '#c0504a');
  // Theke mit Waren
  rect(ctx, x - 20, base - 11, 40, 11, PAL.wood);
  rect(ctx, x - 20, base - 11, 40, 2, PAL.woodLight);
  for (let i = 0; i < 4; i++) rect(ctx, x - 18 + i * 10, base - 8, 8, 6, PAL.woodDark);
  const goods = ['#e86a3a', '#ffd04a', '#6fbf6a', '#c0504a', '#a8b0c0', '#f2a0b0'];
  for (let i = 0; i < 12; i++) circle(ctx, x - 16 + i * 3, base - 13, 1, goods[i % goods.length]);
  // Schild
  rect(ctx, x - 8, base - 40, 16, 7, PAL.woodLight);
  rect(ctx, x - 6, base - 38, 12, 1, PAL.woodDark);
  rect(ctx, x - 6, base - 36, 8, 1, PAL.woodDark);
}

function drawTree(ctx, x, r) {
  const base = GROUND_Y + 2;
  const h = 14 + Math.floor(r() * 6);
  rect(ctx, x - 2, base - h, 4, h, PAL.wood);
  const cy = base - h - 5;
  for (const [dx, dy, s] of [[0, 0, 9], [-7, 4, 6], [7, 3, 7], [-3, -6, 6]]) circle(ctx, x + dx, cy + dy, s, PAL.leafDark);
  for (const [dx, dy, s] of [[0, 0, 9], [-7, 4, 6], [7, 3, 7], [-3, -6, 6]]) circle(ctx, x + dx - 1, cy + dy - 2, s - 2, PAL.leaf);
}

function drawSignpost(ctx, x, label) {
  const base = GROUND_Y + 4;
  rect(ctx, x, base - 20, 2, 20, PAL.woodDark);
  rect(ctx, x - 9, base - 20, 18, 7, PAL.woodLight);
  rect(ctx, x + 9, base - 19, 2, 5, PAL.woodLight);
  px(ctx, x + 11, base - 17, PAL.woodLight);
  rect(ctx, x - 7, base - 18, label, 1, PAL.woodDark);
  rect(ctx, x - 7, base - 16, label - 4, 1, PAL.woodDark);
}

function makeGround() {
  const [c, ctx] = makeCanvas(VILLAGE_W, VIEW_H);
  const r = rng(77);
  rect(ctx, 0, GROUND_Y, VILLAGE_W, VIEW_H - GROUND_Y, PAL.grass);
  rect(ctx, 0, GROUND_Y, VILLAGE_W, 1, PAL.grassLight);
  for (let y = GROUND_Y + 16; y < VIEW_H; y++) {
    for (let x = 0; x < VILLAGE_W; x++) if (dither(x, y, (y - GROUND_Y - 16) / 18)) px(ctx, x, y, PAL.grassDark);
  }
  // Pflasterweg
  const top = WALK_Y - 4;
  rect(ctx, POND_W, top, VILLAGE_W - POND_W, 8, PAL.stone);
  for (let x = POND_W; x < VILLAGE_W; x += 5) {
    for (let row = 0; row < 2; row++) {
      rect(ctx, x + (row ? 2 : 0), top + 1 + row * 4, 4, 3, PAL.stoneLight);
    }
  }
  rect(ctx, POND_W, top + 8, VILLAGE_W - POND_W, 1, PAL.woodDark);
  for (const x of [112, 196, 362, 430, 600]) drawTree(ctx, x, r);
  return { canvas: c, ctx };
}

const WINDOWS = [];

function makeVillage() {
  WINDOWS.length = 0; // beim Neuzeichnen (Landschaftswechsel) nicht doppelt sammeln
  const { canvas, ctx } = makeGround();
  drawPond(ctx);
  drawBookStand(ctx, 86);
  // Bäckerei mit Brezel-Schild
  WINDOWS.push(house(ctx, 128, 46, '#e8c9a0', PAL.roof, PAL.roofDark, (c, x, top) => {
    rect(c, x + 18, top - 4, 1, 4, PAL.woodDark);
    circle(c, x + 18, top + 1, 3, PAL.coinDark);
    circle(c, x + 18, top + 1, 1, '#e8c9a0');
  }).window);
  // Fischerhütte mit Netz
  WINDOWS.push(house(ctx, 214, 42, '#a8c0d8', '#4a6a8a', '#3a5070', (c, x, top, base) => {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) px(c, x + 18 + i, base - 14 + j * 2, PAL.stoneLight);
  }).window);
  // Rathaus: breiter, mit Uhr und Fahne
  WINDOWS.push(house(ctx, 292, 58, '#d8d0c0', '#6a5a8a', '#4a3a6a', (c, x, top) => {
    circle(c, x + 29, top - 7, 4, '#fdf6e3');
    circle(c, x + 29, top - 7, 3, '#e8e0d0');
    rect(c, x + 29, top - 9, 1, 2, PAL.ink);
    rect(c, x + 29, top - 7, 2, 1, PAL.ink);
    rect(c, x + 29, top - 30, 1, 12, PAL.woodDark);
    rect(c, x + 30, top - 30, 6, 4, PAL.roof);
  }).window);
  // Gärtnerhaus mit Blumenkästen
  WINDOWS.push(house(ctx, 448, 44, '#f0d8b0', '#4f8f55', '#3a7050', (c, x, top) => {
    for (let i = 0; i < 5; i++) px(c, x + 27 + i * 2, top + 16, PAL.flowers[i % 3]);
    rect(c, x + 26, top + 17, 11, 2, PAL.wood);
  }).window);
  // Haus des Abenteurers
  WINDOWS.push(house(ctx, 528, 40, '#c8a888', '#8a5a3a', '#6a4028', (c, x, top) => {
    rect(c, x + 16, top + 4, 3, 8, PAL.stone);
    rect(c, x + 15, top + 4, 5, 1, PAL.stoneLight);
  }).window);
  drawStall(ctx, village.MARKET.x);
  drawSignpost(ctx, VILLAGE_W - 22, 10);
  // Laternen
  for (const x of [186, 372, 512]) {
    rect(ctx, x, GROUND_Y - 16, 2, 22, PAL.woodDark);
    rect(ctx, x - 3, GROUND_Y - 16, 5, 1, PAL.woodDark);
    rect(ctx, x - 4, GROUND_Y - 15, 3, 4, PAL.glow);
  }
  return canvas;
}

function drawSprite(ctx, img, x, y, flip) {
  if (!flip) return ctx.drawImage(img, x, y);
  ctx.save();
  ctx.translate(x + img.width, y);
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

function glow(ctx, cx, cy, radius, alpha, color = PAL.glow) {
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const d = Math.sqrt(dx * dx + dy * dy) / radius;
      if (d < 1 && dither(cx + dx, cy + dy, 1 - d)) ctx.fillRect(cx + dx, cy + dy, 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}

// Kleine Pixelzeichen über den Köpfen
const MARK = {
  '?': ['111', '001', '011', '010', '000', '010'],
  '!': ['1', '1', '1', '1', '0', '1'],
};
function mark(ctx, ch, x, y, color) {
  const rows = MARK[ch];
  ctx.fillStyle = PAL.ink;
  rows.forEach((row, j) => [...row].forEach((b, i) => b === '1' && ctx.fillRect(x + i - 1, y + j - 1, 3, 3)));
  ctx.fillStyle = color;
  rows.forEach((row, j) => [...row].forEach((b, i) => b === '1' && ctx.fillRect(x + i, y + j, 1, 1)));
}


// ---------------------------------------------------------------- Seesicht beim Angeln

const SURFACE = 72; // Wasseroberfläche in der Seesicht
const LAKE_BOB = 214; // Schwimmer
const HOOK_Y = SURFACE + 34;
const ROD_TIP = [64, 22];
const WATER = ['#4a86c0', '#3a74b0', '#2e64a0', '#26568e', '#1e467a', '#183a68'];

function makeLake() {
  const [c, ctx] = makeCanvas(VIEW_W, VIEW_H);
  const r = rng(404);
  // gegenüberliegendes Ufer mit Bäumen
  rect(ctx, 0, SURFACE - 8, VIEW_W, 8, PAL.grassDark);
  rect(ctx, 0, SURFACE - 8, VIEW_W, 1, PAL.grassLight);
  for (let x = 4; x < VIEW_W; x += 9 + Math.floor(r() * 8)) {
    const h = 6 + Math.floor(r() * 9);
    if (r() < 0.5) {
      for (let i = 0; i < h; i++) rect(ctx, x - Math.floor(i / 2), SURFACE - 8 - h + i, Math.floor(i / 2) * 2 + 1, 1, PAL.pineFront);
    } else {
      circle(ctx, x, SURFACE - 10 - Math.floor(h / 2), Math.floor(h / 2) + 2, PAL.leafDark);
      circle(ctx, x - 1, SURFACE - 11 - Math.floor(h / 2), Math.floor(h / 2), PAL.leaf);
    }
  }
  // Wasser, nach unten dunkler (gerastert)
  const depth = VIEW_H - SURFACE;
  for (let y = SURFACE; y < VIEW_H; y++) {
    const t = ((y - SURFACE) / depth) * (WATER.length - 1);
    const i = Math.min(Math.floor(t), WATER.length - 2);
    for (let x = 0; x < VIEW_W; x++) px(ctx, x, y, dither(x, y, t - i) ? WATER[i + 1] : WATER[i]);
  }
  rect(ctx, 0, SURFACE, VIEW_W, 1, '#a8d4f0');
  // Grund mit Sand, Steinen und Muscheln
  for (let x = 0; x < VIEW_W; x++) {
    const h = 10 + Math.round(Math.sin(x / 23) * 3 + Math.sin(x / 7));
    rect(ctx, x, VIEW_H - h, 1, h, '#a89060');
    if (x % 3 === 0) px(ctx, x, VIEW_H - h, '#c8b078');
  }
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(r() * VIEW_W);
    circle(ctx, x, VIEW_H - 8, 2 + Math.floor(r() * 3), PAL.stone);
    px(ctx, x - 1, VIEW_H - 10, PAL.stoneLight);
  }
  // Steg im Vordergrund links
  rect(ctx, 0, SURFACE - 4, 54, 4, PAL.wood);
  rect(ctx, 0, SURFACE - 4, 54, 1, PAL.woodLight);
  for (let x = 2; x < 54; x += 6) rect(ctx, x, SURFACE - 4, 1, 4, PAL.woodDark);
  for (const x of [10, 44]) rect(ctx, x, SURFACE, 3, VIEW_H - SURFACE - 8, PAL.woodDark);
  // Seerosen
  for (const x of [120, 268, 300]) {
    rect(ctx, x - 3, SURFACE - 1, 7, 2, PAL.leaf);
    px(ctx, x, SURFACE - 2, '#f2a0b0');
  }
  return c;
}

// ---------------------------------------------------------------- Szene

export function createVillageScene({ onBite, onCatch, onMiss } = {}) {
  const ground = makeVillage();
  const lake = makeLake();
  // Fische, die in der Seesicht umherschwimmen (meist häufige Arten)
  // häufige, gerade aktive Arten schwimmen herum; beim Auswerfen neu gemischt
  const pickSwimmer = (i) => {
    const tier = [0, 0, 0, 1, 1, 2, 0][i];
    const pool = village.activeFish().filter((f) => f.tier === tier);
    const list = pool.length ? pool : village.FISH.filter((f) => f.tier === tier);
    return list[Math.floor(Math.random() * list.length)].id;
  };
  const swimmers = Array.from({ length: 7 }, (_, i) => ({
    species: pickSwimmer(i),
    x: Math.random() * VIEW_W,
    y: SURFACE + 22 + Math.random() * 70,
    dir: Math.random() < 0.5 ? -1 : 1,
    speed: 6 + Math.random() * 10,
    phase: Math.random() * 6,
  }));
  // Angeln: idle → cast → wait → bite → reel → idle
  const fish = { phase: 'idle', t: 0, biteAt: 0, text: '', textT: 0, target: null, from: 1 };

  function say(text) {
    fish.text = text;
    fish.textT = 1.4;
  }

  return {
    fishing: () => fish.phase !== 'idle',
    phase: () => fish.phase,

    // E am Steg: auswerfen oder einholen
    fishPress() {
      if (fish.phase === 'idle') {
        const [a, b] = village.BITE_SECONDS;
        swimmers.forEach((s, i) => (s.species = pickSwimmer(i)));
        // Lockruf: sofortiger Biss und (je nach Zauber) Ränge höher
        const lure = magic.useLure();
        Object.assign(fish, { phase: 'cast', t: 0, biteAt: lure ? 0.9 : a + Math.random() * (b - a), target: village.rollCatch(Math.random, undefined, lure), from: Math.random() < 0.5 ? -1 : 1 });
        return 'cast';
      }
      if (fish.phase === 'bite') {
        Object.assign(fish, { phase: 'reel', t: 0 });
        return 'reel';
      }
      if (fish.phase === 'wait' || fish.phase === 'cast') {
        fish.phase = 'idle';
        say('Zu früh!');
        onMiss?.('early');
        return 'early';
      }
      return null;
    },

    cancelFishing() {
      if (fish.phase !== 'idle' && fish.phase !== 'reel') fish.phase = 'idle';
    },

    update(dt) {
      fish.t += dt;
      for (const s of swimmers) {
        s.x += s.dir * s.speed * dt;
        if (s.x < -20) s.x = VIEW_W + 10;
        if (s.x > VIEW_W + 20) s.x = -10;
      }
      if (fish.textT > 0) fish.textT -= dt;
      if (fish.phase === 'cast' && fish.t > 0.5) Object.assign(fish, { phase: 'wait', t: 0 });
      if (fish.phase === 'wait' && fish.t > fish.biteAt) {
        Object.assign(fish, { phase: 'bite', t: 0 });
        onBite?.();
      }
      if (fish.phase === 'bite' && fish.t > village.REACT_SECONDS) {
        fish.phase = 'idle';
        say('Weg ist er …');
        onMiss?.('late');
      }
      if (fish.phase === 'reel' && fish.t > 0.45) {
        fish.phase = 'idle';
        onCatch?.(village.applyCatch(fish.target));
      }
    },

    draw(ctx, camX, time) {
      const cam = Math.round(camX);
      ctx.drawImage(ground, -cam, 0);
      // Wasser glitzert
      for (let i = 0; i < 6; i++) {
        const x = Math.floor((i * 17 + time * 6) % (POND_W - 14)) + 4 - cam;
        const y = GROUND_Y + 6 + ((i * 7) % 26);
        rect(ctx, x, y, 3, 1, '#8ab8e8');
      }
      // Bewohner und Marktfrau
      for (const v of village.VILLAGERS) {
        const bob = Math.floor(time * 1.5 + v.x) % 2;
        ctx.drawImage(village.villagerImage(v.id), v.x - 8 - cam, WALK_Y - 16 + bob);
      }
      ctx.drawImage(village.villagerImage('hilde'), village.MARKET.x - 8 - cam, WALK_Y - 25);

      // Fischreuse: Pfosten am Ufer, Seil zum Korb im Wasser
      const tx = 106 - cam;
      if (fishtrap.built()) {
        rect(ctx, tx, GROUND_Y - 10, 2, 16, PAL.woodDark);
        rect(ctx, tx - 1, GROUND_Y - 11, 4, 2, PAL.wood);
        const bob = Math.round(Math.sin(time * 2) * 1);
        for (let k = 0; k < 18; k++) px(ctx, tx - k, GROUND_Y - 6 + Math.round(k * 0.7) + (k > 12 ? bob : 0), '#d8c8a0');
        rect(ctx, tx - 24, GROUND_Y + 6 + bob, 9, 6, '#8a6a40');
        for (let k = 0; k < 9; k += 2) rect(ctx, tx - 24 + k, GROUND_Y + 6 + bob, 1, 6, '#5a4028');
        rect(ctx, tx - 22, GROUND_Y + 4 + bob, 3, 2, '#d9574a');
      } else {
        rect(ctx, tx, GROUND_Y - 4, 2, 10, PAL.woodDark);
        rect(ctx, tx - 5, GROUND_Y - 8, 12, 6, PAL.woodLight);
        rect(ctx, tx - 3, GROUND_Y - 6, 8, 1, PAL.woodDark);
      }
    },

    // Angelschnur und Schwimmer (nach der Spielfigur gezeichnet)
    drawFishing(ctx, camX, playerX, time) {
      if (fish.phase === 'idle') return;
      const cam = Math.round(camX);
      const hx = Math.round(playerX) - 6 - cam;
      const hy = WALK_Y - 10;
      const tipX = hx - 8;
      const tipY = hy - 9;
      for (let i = 0; i < 9; i++) px(ctx, hx - i, hy - i, PAL.woodDark);
      let bx = BOB.x - cam;
      let by = BOB.y;
      if (fish.phase === 'cast') {
        const u = Math.min(1, fish.t / 0.5);
        bx = Math.round(tipX + (bx - tipX) * u);
        by = Math.round(tipY + (by - tipY) * u - Math.sin(u * Math.PI) * 14);
      } else if (fish.phase === 'wait') {
        by += Math.round(Math.sin(time * 4) * 0.6);
      } else if (fish.phase === 'bite') {
        by += 2;
      } else if (fish.phase === 'reel') {
        const u = Math.min(1, fish.t / 0.45);
        bx = Math.round(bx + (tipX - bx) * u);
        by = Math.round(by + (tipY - by) * u);
      }
      // Schnur als leicht durchhängende Kurve
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const x = tipX + (bx - tipX) * u;
        const y = tipY + (by - tipY) * u + Math.sin(u * Math.PI) * (fish.phase === 'wait' ? 4 : 1);
        px(ctx, Math.round(x), Math.round(y), '#e8e0d0');
      }
      if (fish.phase === 'reel') {
        rect(ctx, bx - 2, by, 5, 3, '#a8b0c0');
      } else {
        rect(ctx, bx - 1, by - 2, 3, 2, '#d9574a');
        rect(ctx, bx - 1, by, 3, 1, '#fdf6e3');
      }
      if (fish.phase === 'bite') {
        mark(ctx, '!', Math.round(playerX) - cam, WALK_Y - 28 + (Math.floor(time * 10) % 2), PAL.coin);
        for (const [dx, dy] of [[-4, 1], [4, 1], [-3, -1], [3, -1]]) px(ctx, bx + dx, by + dy, '#8ab8e8');
      }
    },

    // Seesicht: Querschnitt durch den Teich, solange geangelt wird
    drawLake(ctx, time) {
      ctx.drawImage(lake, 0, 0);
      // Wellen auf der Oberfläche und Lichtstrahlen
      for (let i = 0; i < 10; i++) {
        const x = Math.floor((i * 37 + time * 8) % (VIEW_W + 20)) - 10;
        rect(ctx, x, SURFACE + 2 + (i % 3) * 3, 5, 1, '#8ab8e8');
      }
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#e8f4ff';
      for (let k = 0; k < 4; k++) {
        const x0 = 40 + k * 80 + Math.sin(time * 0.5 + k) * 6;
        for (let y = SURFACE; y < VIEW_H - 12; y++) {
          const x = Math.round(x0 + (y - SURFACE) * 0.35);
          for (let w = 0; w < 6; w++) if (dither(x + w, y, 0.5)) ctx.fillRect(x + w, y, 1, 1);
        }
      }
      ctx.globalAlpha = 1;
      // Wasserpflanzen wiegen sich
      for (const [x, h] of [[30, 26], [34, 20], [150, 30], [154, 22], [286, 24], [290, 32]]) {
        for (let y = 0; y < h; y++) px(ctx, x + Math.round(Math.sin(time * 1.5 + y / 5 + x) * 2 * (y / h)), VIEW_H - 10 - y, y % 4 ? '#3f7a4a' : '#6aa85a');
      }
      // umherschwimmende Fische
      for (const s of swimmers) {
        const y = Math.round(s.y + Math.sin(time * 2 + s.phase) * 2);
        drawSprite(ctx, village.fishImage(s.species), Math.round(s.x) - 8, y - 8, s.dir < 0);
      }

      // Angelrute vom Steg aus, Schnur zum Schwimmer
      for (let i = 0; i < 26; i++) px(ctx, Math.round(i * 2.4), 46 - Math.round(i * 0.92), i < 6 ? PAL.woodDark : PAL.wood);
      let bx = LAKE_BOB;
      let by = SURFACE - 1;
      if (fish.phase === 'cast') {
        const u = Math.min(1, fish.t / 0.5);
        bx = Math.round(ROD_TIP[0] + (LAKE_BOB - ROD_TIP[0]) * u);
        by = Math.round(ROD_TIP[1] + (SURFACE - 1 - ROD_TIP[1]) * u - Math.sin(u * Math.PI) * 18);
      } else if (fish.phase === 'wait') by += Math.round(Math.sin(time * 3) * 0.7);
      else if (fish.phase === 'bite') by += 3 + (Math.floor(time * 12) % 2);
      for (let i = 0; i <= 30; i++) {
        const u = i / 30;
        const x = ROD_TIP[0] + (bx - ROD_TIP[0]) * u;
        const y = ROD_TIP[1] + (by - ROD_TIP[1]) * u + Math.sin(u * Math.PI) * 8;
        px(ctx, Math.round(x), Math.round(y), '#e8e0d0');
      }

      // Haken unter dem Schwimmer und der Fisch, der gleich anbeißt
      let hookY = HOOK_Y + (fish.phase === 'bite' ? 3 : 0);
      if (fish.phase === 'reel') hookY = Math.round(HOOK_Y - (HOOK_Y - SURFACE + 6) * Math.min(1, fish.t / 0.45));
      if (fish.phase !== 'cast') {
        for (let y = by + 2; y < hookY; y++) px(ctx, bx, y, '#c8d8e8');
        px(ctx, bx, hookY, PAL.stoneLight);
        px(ctx, bx + 1, hookY + 1, PAL.stoneLight);
      }
      const target = fish.target;
      const img = target ? (target.treasure ? village.bottleImage() : village.fishImage(target.species)) : null;
      if (img) {
        const left = fish.from < 0;
        if (fish.phase === 'wait' && fish.t > fish.biteAt - 2.4) {
          const u = Math.min(1, (fish.t - (fish.biteAt - 2.4)) / 2.2);
          const sx = left ? -16 : VIEW_W + 4;
          const x = Math.round(sx + (bx - (left ? 14 : -2) - sx) * u);
          const y = Math.round(HOOK_Y - 6 + Math.sin(time * 3) * 3 * (1 - u));
          drawSprite(ctx, img, x, y, !left);
        } else if (fish.phase === 'bite') {
          const wiggle = Math.floor(time * 14) % 2;
          drawSprite(ctx, img, bx - (left ? 14 : -2) + wiggle, hookY - 6, !left);
        } else if (fish.phase === 'reel') {
          drawSprite(ctx, img, bx - 8, hookY - 4, !left);
        }
      }

      // Schwimmer
      if (fish.phase !== 'reel') {
        rect(ctx, bx - 1, by - 3, 3, 3, '#d9574a');
        rect(ctx, bx - 1, by, 3, 2, '#fdf6e3');
      }
      if (fish.phase === 'bite') {
        const r = 3 + (Math.floor(time * 10) % 3);
        rect(ctx, bx - r - 2, SURFACE, 2, 1, '#e8f4ff');
        rect(ctx, bx + r + 1, SURFACE, 2, 1, '#e8f4ff');
      }
    },

    // Zeichen über der Seesicht (nach der Tönung, damit sie nachts leuchten)
    drawLakeFront(ctx, time) {
      if (fish.phase === 'bite') mark(ctx, '!', LAKE_BOB, SURFACE - 22 + (Math.floor(time * 10) % 2), PAL.coin);
    },

    drawLights(ctx, camX, time, night) {
      const cam = Math.round(camX);
      // Fenster und Laternen
      if (night > 0.05) {
        ctx.globalAlpha = Math.min(1, night * 1.1);
        for (const [x, y, w, h] of WINDOWS) {
          rect(ctx, x - cam, y, w, h, PAL.glow);
          rect(ctx, x + 4 - cam, y, 1, h, PAL.woodDark);
        }
        ctx.globalAlpha = 1;
        for (const [x, y, w] of WINDOWS) glow(ctx, x + w / 2 - cam, y + 4, 9 + Math.round(night * 4), 0.25 * night);
      }
      for (const x of [186, 372, 512]) {
        rect(ctx, x - 4 - cam, GROUND_Y - 15, 3, 4, PAL.glow);
        glow(ctx, x - 3 - cam, GROUND_Y - 13, 10 + Math.round(night * 6), 0.12 + 0.25 * night);
      }
      // Reuse voll: Zeichen über dem Pfosten
      if (fishtrap.full()) mark(ctx, '!', 107 - cam, WALK_Y - 34 + Math.round(Math.sin(time * 3) * 1.5), PAL.coin);
      else if (fishtrap.stored()) ctx.drawImage(village.fishImage(Object.keys(state.village.trap.stored)[0]), 99 - cam, WALK_Y - 36, 16, 16);

      // Aufgaben-Zeichen über den Köpfen
      for (const v of village.VILLAGERS) {
        const q = village.quest(v.id);
        if (!q) continue;
        const ready = village.canComplete(q);
        const y = WALK_Y - 30 + Math.round(Math.sin(time * 3 + v.x) * 1.5);
        mark(ctx, ready ? '!' : '?', v.x - (ready ? 0 : 1) - cam, y, ready ? '#8fe08a' : PAL.coin);
      }
      if (fish.textT > 0) {
        ctx.globalAlpha = Math.min(1, fish.textT);
        ctx.fillStyle = '#fdf6e3';
        ctx.globalAlpha = 1;
      }
    },

    speech: () => (fish.textT > 0 ? fish.text : ''),
  };
}
