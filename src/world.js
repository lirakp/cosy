import { VIEW_W, VIEW_H, WORLD_W, GROUND_Y, WALK_Y, WELL_X, CAMP_X, CHEST_X, DUNGEON_X, ARENA_X, MINE_X, TRADER_X, FORGE_X, GARDEN_BED_X, GARDEN_BED_STEP, VILLAGE_SIGN_X, TOWER_X, PORTAL_X } from './config.js';
import * as realm from './realm.js';
import * as magic from './magic.js';
import * as garden from './garden.js';
import * as gardener from './gardener.js';
import * as trader from './trader.js';
import * as mine from './mine.js';
import * as dungeon from './dungeon.js';
import * as buildings from './buildings.js';
import { audio } from './audio.js';
import { itemImage } from './items.js';
import * as expedition from './expedition.js';
import { state } from './state.js';
import * as buffs from './buffs.js';
import { PAL } from './palette.js';
import * as companions from './companions.js';
import { rng, makeCanvas, rect, px, circle, dither } from './utils.js';

// Die Spielebene: Wiese, Weg, Häuschen, Bäume – plus alles, was sich bewegt
// (Rauch, Glühwürmchen, Lichtschein).

const COTTAGE_X = 196;
const LANTERN_X = 392;

function drawGround(ctx, r) {
  rect(ctx, 0, GROUND_Y, WORLD_W, VIEW_H - GROUND_Y, PAL.grass);
  rect(ctx, 0, GROUND_Y, WORLD_W, 1, PAL.grassLight);

  // nach unten wird die Wiese dunkler
  for (let y = GROUND_Y + 16; y < VIEW_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      if (dither(x, y, (y - GROUND_Y - 16) / 18)) px(ctx, x, y, PAL.grassDark);
    }
  }

  // Trampelpfad mit ausgefransten Rändern
  const top = WALK_Y - 4;
  for (let x = 0; x < WORLD_W; x++) {
    const wobble = Math.round(Math.sin(x / 19) + Math.sin(x / 7) * 0.5);
    rect(ctx, x, top + wobble, 1, 7, PAL.path);
    px(ctx, x, top + wobble + 6, PAL.pathDark);
    if (r() < 0.3) px(ctx, x, top + wobble - 1, PAL.path);
    if (r() < 0.06) px(ctx, x, top + wobble + 1 + Math.floor(r() * 4), PAL.pathDark);
  }

  // Grasbüschel und Blümchen
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(r() * WORLD_W);
    const y = GROUND_Y + 2 + Math.floor(r() * (VIEW_H - GROUND_Y - 3));
    if (y > top - 3 && y < top + 10) continue;
    const light = y < GROUND_Y + 18;
    px(ctx, x, y, light ? PAL.grassLight : PAL.grass);
    px(ctx, x + 1, y - 1, light ? PAL.grassLight : PAL.grass);
    if (r() < 0.16) px(ctx, x + 1, y - 2, PAL.flowers[Math.floor(r() * PAL.flowers.length)]);
  }
}

function drawTree(ctx, x, r) {
  const h = 16 + Math.floor(r() * 8);
  const base = GROUND_Y + 3;
  rect(ctx, x - 2, base - h, 4, h, PAL.wood);
  rect(ctx, x + 1, base - h, 1, h, PAL.woodDark);
  rect(ctx, x - 3, base - 1, 6, 1, PAL.wood);

  const cy = base - h - 6;
  const blobs = [[0, 0, 11], [-9, 5, 7], [9, 4, 8], [-4, -8, 7], [6, -6, 6]];
  for (const [dx, dy, s] of blobs) circle(ctx, x + dx, cy + dy, s, PAL.leafDark);
  for (const [dx, dy, s] of blobs) circle(ctx, x + dx - 1, cy + dy - 2, s - 2, PAL.leaf);
  for (const [dx, dy, s] of blobs) circle(ctx, x + dx - 3, cy + dy - 4, Math.max(1, s - 6), PAL.leafLight);
}

function drawBush(ctx, x, r) {
  const y = GROUND_Y + 1;
  for (const dx of [-5, 0, 5]) circle(ctx, x + dx, y - 3, 4 + Math.floor(r() * 2), PAL.leafDark);
  for (const dx of [-5, 0, 5]) circle(ctx, x + dx - 1, y - 5, 2, PAL.leaf);
  rect(ctx, x - 10, y + 1, 21, 3, PAL.grass);
}

function drawFence(ctx, x0, x1) {
  const y = GROUND_Y + 2;
  rect(ctx, x0, y - 6, x1 - x0, 1, PAL.woodLight);
  rect(ctx, x0, y - 3, x1 - x0, 1, PAL.wood);
  for (let x = x0; x <= x1; x += 7) {
    rect(ctx, x, y - 8, 2, 9, PAL.woodLight);
    px(ctx, x + 1, y - 8, PAL.wood);
  }
}

function drawCottage(ctx, x) {
  const base = GROUND_Y + 3;
  const w = 50;
  const wallH = 24;
  const wallTop = base - wallH;

  // Schornstein (hinter dem Dach)
  rect(ctx, x + 35, wallTop - 22, 7, 14, PAL.brick);
  rect(ctx, x + 34, wallTop - 23, 9, 2, PAL.stone);

  // Wände
  rect(ctx, x, wallTop, w, wallH, PAL.wall);
  rect(ctx, x + w - 5, wallTop, 5, wallH, PAL.wallShade);
  rect(ctx, x, wallTop, w, 2, PAL.wallShade);
  rect(ctx, x, base - 3, w, 3, PAL.stone);

  // Dach: Schindelreihen, nach oben schmaler
  const roofH = 17;
  for (let i = 0; i < roofH; i++) {
    const inset = Math.floor((roofH - 1 - i) * 1.1);
    const y = wallTop - roofH + 1 + i;
    rect(ctx, x - 5 + inset, y, w + 10 - inset * 2, 1, i % 4 === 3 ? PAL.roofDark : PAL.roof);
    px(ctx, x - 5 + inset, y, PAL.roofLight);
  }
  rect(ctx, x - 5 + 18, wallTop - roofH, w + 10 - 36, 1, PAL.roofLight);
  // Schnee auf dem Dach (Winterland)
  if (PAL.snow) {
    for (let i = 0; i < 5; i++) {
      const inset = Math.floor((roofH - 1 - i) * 1.1);
      rect(ctx, x - 5 + inset, wallTop - roofH + 1 + i, w + 10 - inset * 2, 1, i < 4 ? '#f4f8ff' : '#d8e4f4');
    }
    for (let k = 0; k < w + 6; k += 5) rect(ctx, x - 3 + k, wallTop - roofH + 6, 2, 1 + (k % 3), '#f4f8ff');
    rect(ctx, x + 34, wallTop - 23, 9, 2, '#f4f8ff');
  }
  rect(ctx, x - 5, wallTop + 1, w + 10, 1, PAL.roofDark);

  // Tür
  rect(ctx, x + 8, base - 17, 11, 17, PAL.woodDark);
  rect(ctx, x + 9, base - 16, 9, 16, PAL.wood);
  rect(ctx, x + 13, base - 16, 1, 16, PAL.woodDark);
  px(ctx, x + 16, base - 8, PAL.glow);
  rect(ctx, x + 6, base, 15, 1, PAL.stone);

  // leuchtendes Fenster
  rect(ctx, x + 26, wallTop + 6, 14, 12, PAL.woodDark);
  rect(ctx, x + 27, wallTop + 7, 12, 10, PAL.glow);
  rect(ctx, x + 27, wallTop + 7, 5, 4, PAL.glowLight);
  rect(ctx, x + 32, wallTop + 7, 1, 10, PAL.woodDark);
  rect(ctx, x + 27, wallTop + 11, 12, 1, PAL.woodDark);
  rect(ctx, x + 25, wallTop + 18, 16, 1, PAL.woodLight);
  // Blumenkasten
  rect(ctx, x + 26, wallTop + 19, 14, 2, PAL.wood);
  for (let i = 0; i < 5; i++) px(ctx, x + 27 + i * 3, wallTop + 18, PAL.flowers[i % 3]);
}

function drawLantern(ctx, x) {
  const base = GROUND_Y + 5;
  rect(ctx, x, base - 22, 2, 22, PAL.woodDark);
  rect(ctx, x - 1, base - 1, 4, 1, PAL.woodDark);
  rect(ctx, x - 4, base - 22, 5, 1, PAL.woodDark);
  rect(ctx, x - 5, base - 21, 3, 1, PAL.ink);
  rect(ctx, x - 5, base - 20, 3, 4, PAL.glow);
  px(ctx, x - 4, base - 19, PAL.glowLight);
  rect(ctx, x - 5, base - 16, 3, 1, PAL.ink);
}

function drawWell(ctx, x) {
  const base = GROUND_Y + 4;
  rect(ctx, x - 9, base - 22, 2, 14, PAL.woodDark);
  rect(ctx, x + 7, base - 22, 2, 14, PAL.woodDark);
  rect(ctx, x - 7, base - 20, 14, 1, PAL.wood);
  rect(ctx, x, base - 19, 1, 6, PAL.woodLight);
  rect(ctx, x - 1, base - 13, 3, 3, PAL.wood);
  for (let i = 0; i < 6; i++) {
    rect(ctx, x - 4 - i * 2, base - 28 + i, 8 + i * 4, 1, i % 3 === 2 ? PAL.roofDark : PAL.roof);
    px(ctx, x - 4 - i * 2, base - 28 + i, PAL.roofLight);
  }
  rect(ctx, x - 11, base - 9, 22, 9, PAL.stone);
  rect(ctx, x + 7, base - 9, 4, 9, PAL.ink);
  rect(ctx, x + 7, base - 9, 4, 9, 'rgba(122, 106, 122, 0.55)');
  for (let row = 0; row < 3; row++) {
    for (let bx = x - 11 + (row % 2) * 3; bx < x + 11; bx += 6) px(ctx, bx, base - 7 + row * 3, PAL.ink);
    rect(ctx, x - 11, base - 6 + row * 3, 22, 1, 'rgba(42, 33, 64, 0.25)');
  }
  rect(ctx, x - 12, base - 11, 24, 2, PAL.stoneLight);
  rect(ctx, x - 9, base - 11, 18, 1, PAL.magic);
}

function drawDungeonGate(ctx, x) {
  const base = GROUND_Y + 4;
  rect(ctx, x - 15, base - 25, 30, 25, PAL.stone);
  rect(ctx, x - 13, base - 28, 26, 3, PAL.stone);
  rect(ctx, x - 13, base - 28, 26, 1, PAL.stoneLight);
  rect(ctx, x - 15, base - 25, 2, 1, PAL.stoneLight);
  rect(ctx, x + 13, base - 25, 2, 1, PAL.stoneLight);
  rect(ctx, x + 11, base - 27, 4, 27, 'rgba(42, 33, 64, 0.35)');
  for (let row = 0; row < 8; row++) {
    for (let bx = x - 15 + (row % 2) * 4; bx < x + 15; bx += 7) px(ctx, bx, base - 24 + row * 3, PAL.ink);
  }
  // Torbogen
  rect(ctx, x - 9, base - 20, 18, 20, PAL.stoneLight);
  rect(ctx, x - 7, base - 22, 14, 2, PAL.stoneLight);
  rect(ctx, x - 7, base - 18, 14, 18, PAL.ink);
  rect(ctx, x - 5, base - 20, 10, 2, PAL.ink);
  rect(ctx, x - 1, base - 25, 2, 2, PAL.roof);
  // Moos und Stufen
  for (const [dx, dy] of [[-14, -26], [-12, -27], [-13, -24], [9, -28], [12, -26], [-15, -9], [13, -13], [-10, -21]]) {
    px(ctx, x + dx, base + dy, PAL.leaf);
    px(ctx, x + dx + 1, base + dy, PAL.leafLight);
  }
  rect(ctx, x - 9, base, 18, 1, PAL.stone);
  rect(ctx, x - 11, base + 1, 22, 1, PAL.stoneLight);
  // Fackelhalter
  rect(ctx, x - 13, base - 14, 1, 5, PAL.woodDark);
  rect(ctx, x + 12, base - 14, 1, 5, PAL.woodDark);
}

// Bauplatz für eine Anlage, die noch nicht gekauft wurde.
function drawSite(ctx, x) {
  const base = GROUND_Y + 4;
  rect(ctx, x - 1, base - 14, 2, 14, PAL.woodDark);
  rect(ctx, x - 8, base - 17, 16, 9, PAL.ink);
  rect(ctx, x - 7, base - 16, 14, 7, PAL.woodLight);
  rect(ctx, x - 7, base - 10, 14, 1, PAL.wood);
  rect(ctx, x - 5, base - 14, 10, 1, PAL.woodDark);
  rect(ctx, x - 5, base - 12, 7, 1, PAL.woodDark);
  for (const [dx, w] of [[-16, 5], [-13, 4], [10, 6], [12, 3]]) {
    rect(ctx, x + dx, base - (w > 4 ? 3 : 5), w, 3, PAL.stone);
    rect(ctx, x + dx, base - (w > 4 ? 3 : 5), w, 1, PAL.stoneLight);
  }
  rect(ctx, x - 20, base - 1, 9, 1, PAL.wood);
  rect(ctx, x - 19, base - 2, 9, 1, PAL.woodLight);
}

function drawArena(ctx, x) {
  const base = GROUND_Y + 4;
  for (const [px0, dir] of [[x - 21, 1], [x + 20, -1]]) {
    rect(ctx, px0, base - 36, 1, 14, PAL.woodDark);
    rect(ctx, px0 + (dir > 0 ? 1 : -5), base - 36, 5, 3, PAL.roof);
    rect(ctx, px0 + (dir > 0 ? 1 : -3), base - 33, 3, 1, PAL.roofDark);
  }
  rect(ctx, x - 22, base - 22, 44, 22, PAL.stone);
  for (let i = 0; i < 8; i++) {
    rect(ctx, x - 22 + i * 6, base - 25, 3, 3, PAL.stone);
    rect(ctx, x - 22 + i * 6, base - 25, 3, 1, PAL.stoneLight);
  }
  rect(ctx, x - 22, base - 22, 44, 1, PAL.stoneLight);
  rect(ctx, x - 22, base - 15, 44, 1, PAL.stoneLight);
  for (let row = 0; row < 7; row++) {
    for (let bx = x - 22 + (row % 2) * 4; bx < x + 22; bx += 7) px(ctx, bx, base - 20 + row * 3, PAL.ink);
  }
  rect(ctx, x + 16, base - 22, 6, 22, 'rgba(42, 33, 64, 0.35)');
  for (const ax of [x - 17, x + 11]) {
    rect(ctx, ax, base - 10, 6, 10, PAL.ink);
    rect(ctx, ax + 1, base - 12, 4, 2, PAL.ink);
  }
  rect(ctx, x - 6, base - 13, 12, 13, PAL.stoneLight);
  rect(ctx, x - 5, base - 12, 10, 12, PAL.ink);
  rect(ctx, x - 3, base - 14, 6, 2, PAL.ink);
  for (let gx = x - 4; gx < x + 5; gx += 2) rect(ctx, gx, base - 12, 1, 7, PAL.stone);
  rect(ctx, x - 2, base - 19, 4, 3, PAL.coin);
  px(ctx, x - 1, base - 18, PAL.coinDark);
}

// Schmiede-Anbau links am Haus: Steinmauern, Pultdach, Esse, offene Feuerstelle, Amboss
function drawForge(ctx, x) {
  const base = GROUND_Y + 3;
  const left = x - 14;
  const right = x + 15;
  // Mauern
  rect(ctx, left, base - 18, right - left, 18, PAL.stone);
  for (let row = 0; row < 6; row++) {
    for (let bx = left + (row % 2) * 3; bx < right; bx += 6) px(ctx, bx, base - 16 + row * 3, PAL.ink);
    rect(ctx, left, base - 15 + row * 3, right - left, 1, 'rgba(42, 33, 64, 0.2)');
  }
  rect(ctx, left, base - 18, right - left, 1, PAL.stoneLight);
  // Esse
  rect(ctx, left + 4, base - 36, 6, 18, PAL.brick);
  rect(ctx, left + 3, base - 37, 8, 2, PAL.stone);
  for (let y = base - 34; y < base - 20; y += 3) px(ctx, left + 6, y, PAL.ink);
  // Pultdach, zum Haus hin höher
  for (let i = 0; i <= right - left + 1; i++) {
    const top = base - 20 - Math.floor((i * 8) / (right - left + 1));
    rect(ctx, left - 1 + i, top, 1, base - 18 - top, i % 4 === 3 ? PAL.roofDark : PAL.roof);
    px(ctx, left - 1 + i, top, PAL.roofLight);
  }
  // offene Feuerstelle
  rect(ctx, x - 7, base - 13, 14, 13, PAL.ink);
  rect(ctx, x - 5, base - 15, 10, 2, PAL.ink);
  rect(ctx, x - 9, base - 15, 2, 15, PAL.woodDark);
  rect(ctx, x + 7, base - 15, 2, 15, PAL.woodDark);
  rect(ctx, x - 9, base - 16, 18, 2, PAL.woodDark);
  // Schild mit Hammer
  rect(ctx, left - 2, base - 16, 1, 3, PAL.woodDark);
  rect(ctx, left - 6, base - 13, 9, 7, PAL.woodLight);
  rect(ctx, left - 4, base - 12, 5, 2, PAL.stone);
  rect(ctx, left - 2, base - 10, 1, 3, PAL.woodDark);
  // Amboss
  rect(ctx, left - 18, base - 7, 11, 2, PAL.stone);
  rect(ctx, left - 21, base - 7, 3, 1, PAL.stone);
  rect(ctx, left - 15, base - 5, 5, 3, PAL.ink);
  rect(ctx, left - 17, base - 2, 9, 2, PAL.woodDark);
  rect(ctx, left - 18, base - 7, 11, 1, PAL.stoneLight);
}

// Wegweiser „Zum Dorf“ mit Pfeil nach links
function drawVillageSign(ctx, x) {
  const base = GROUND_Y + 4;
  rect(ctx, x, base - 22, 2, 22, PAL.woodDark);
  rect(ctx, x - 10, base - 22, 20, 8, PAL.woodLight);
  rect(ctx, x - 12, base - 21, 2, 6, PAL.woodLight);
  px(ctx, x - 13, base - 18, PAL.woodLight);
  rect(ctx, x - 8, base - 20, 14, 1, PAL.woodDark);
  rect(ctx, x - 8, base - 17, 10, 1, PAL.woodDark);
  // kleine Häuschen-Silhouette auf dem Schild
  rect(ctx, x + 4, base - 19, 4, 3, PAL.roof);
  rect(ctx, x + 5, base - 21, 2, 2, PAL.roof);
}

// Magierturm: schmaler Steinturm mit Sternendach und Kristallkugel
// Dimensionsportal: ein Steinbogen mit Runen; der Wirbel darin wird in den Lichtern gemalt
function drawPortal(ctx, x) {
  const base = GROUND_Y + 4;
  // Sockel
  rect(ctx, x - 16, base - 3, 32, 3, PAL.stone);
  rect(ctx, x - 16, base - 3, 32, 1, PAL.stoneLight);
  // zwei Säulen und ein runder Bogen
  for (const sx of [x - 15, x + 10]) {
    rect(ctx, sx, base - 30, 5, 27, PAL.stone);
    rect(ctx, sx, base - 30, 1, 27, PAL.stoneLight);
    for (let y = base - 27; y < base - 4; y += 6) px(ctx, sx + 2, y, PAL.magic);
  }
  for (let a = 0; a <= 20; a++) {
    const ang = Math.PI * (a / 20);
    const bx = Math.round(x - 0.5 + Math.cos(ang) * 13);
    const by = Math.round(base - 30 - Math.sin(ang) * 10);
    rect(ctx, bx - 2, by - 1, 4, 3, PAL.stone);
    px(ctx, bx - 2, by - 1, PAL.stoneLight);
  }
  rect(ctx, x - 2, base - 43, 4, 4, PAL.magic);
  px(ctx, x - 1, base - 42, '#ffffff');
}

function drawTower(ctx, x) {
  const base = GROUND_Y + 3;
  const w = 16;
  const left = x - w / 2;
  const top = base - 44;
  rect(ctx, left, top, w, base - top, '#8a7a9a');
  rect(ctx, left, top, 2, base - top, '#a898b8');
  rect(ctx, left + w - 3, top, 3, base - top, '#6a5a7a');
  for (let row = 0; row < 14; row++) {
    for (let bx = left + (row % 2) * 3; bx < left + w; bx += 6) px(ctx, bx, top + 2 + row * 3, '#5a4a6a');
  }
  // Spitzdach mit Sternen
  for (let i = 0; i < 18; i++) {
    const half = Math.floor(i * 0.62) + 1;
    rect(ctx, x - half, top - 18 + i, half * 2, 1, i % 4 === 3 ? '#3a2c6a' : '#4b3b8a');
  }
  for (const [dx, dy] of [[-2, -12], [3, -8], [-5, -4], [4, -3], [0, -15]]) px(ctx, x + dx, top + dy, '#ffd978');
  rect(ctx, x - 1, top - 22, 2, 4, PAL.woodDark);
  // Fenster (leuchten in den Lichtern) und Tür
  rect(ctx, x - 2, top + 8, 4, 6, PAL.ink);
  rect(ctx, x - 2, top + 22, 4, 6, PAL.ink);
  rect(ctx, x - 3, base - 11, 6, 11, PAL.woodDark);
  rect(ctx, x - 2, base - 10, 4, 10, '#6a4a8a');
  px(ctx, x + 1, base - 5, PAL.coin);
  rect(ctx, left - 2, base - 1, w + 4, 2, PAL.stone);
}

function drawMineEntrance(ctx, x) {
  const base = GROUND_Y + 4;
  // felsiger Hügel
  for (const [dx, dy, r] of [[-20, -10, 12], [18, -12, 13], [0, -20, 15], [-8, -26, 9], [10, -28, 8]]) circle(ctx, x + dx, base + dy, r, PAL.stone);
  for (const [dx, dy, r] of [[-22, -14, 6], [16, -18, 7], [-4, -30, 5], [6, -24, 6]]) circle(ctx, x + dx, base + dy, r, PAL.stoneLight);
  for (const [dx, dy] of [[-26, -18], [20, -26], [-10, -34], [26, -10]]) {
    px(ctx, x + dx, base + dy, PAL.leaf);
    px(ctx, x + dx + 1, base + dy, PAL.leafLight);
  }
  rect(ctx, x - 34, base - 2, 68, 2, PAL.stone);
  // Stollenöffnung mit Holzrahmen
  rect(ctx, x - 9, base - 22, 18, 22, PAL.ink);
  rect(ctx, x - 11, base - 24, 22, 3, PAL.woodDark);
  rect(ctx, x - 11, base - 24, 22, 1, PAL.wood);
  rect(ctx, x - 11, base - 21, 3, 21, PAL.woodDark);
  rect(ctx, x + 8, base - 21, 3, 21, PAL.woodDark);
  // Schienen heraus
  rect(ctx, x - 7, base - 1, 1, 7, PAL.stoneLight);
  rect(ctx, x + 6, base - 1, 1, 7, PAL.stoneLight);
  for (let y = base; y < base + 7; y += 2) rect(ctx, x - 8, y, 16, 1, PAL.woodDark);
  // Lore mit Erz
  rect(ctx, x + 14, base - 8, 14, 7, PAL.stone);
  rect(ctx, x + 14, base - 8, 14, 1, PAL.stoneLight);
  for (let i = 0; i < 5; i++) circle(ctx, x + 16 + i * 2.5, base - 9 - (i % 2), 1, i % 2 ? PAL.coin : '#d07a4a');
  circle(ctx, x + 17, base - 1, 1, PAL.ink);
  circle(ctx, x + 25, base - 1, 1, PAL.ink);
  // Schild
  rect(ctx, x - 26, base - 18, 1, 18, PAL.woodDark);
  rect(ctx, x - 31, base - 20, 12, 6, PAL.woodLight);
  rect(ctx, x - 29, base - 18, 2, 2, PAL.ink);
  rect(ctx, x - 26, base - 18, 2, 2, PAL.ink);
  rect(ctx, x - 23, base - 18, 2, 2, PAL.ink);
}

function drawTent(ctx, x) {
  const base = GROUND_Y + 4;
  rect(ctx, x, base - 24, 1, 6, PAL.woodDark);
  rect(ctx, x + 1, base - 24, 4, 2, PAL.roof);
  px(ctx, x + 5, base - 23, PAL.roof);
  for (let i = 0; i < 19; i++) {
    const half = Math.floor(i * 0.75) + 1;
    const y = base - 19 + i;
    rect(ctx, x - half, y, half * 2, 1, PAL.wall);
    rect(ctx, x + Math.floor(half / 3), y, half - Math.floor(half / 3), 1, PAL.wallShade);
    px(ctx, x - half, y, PAL.glowLight);
    if (i > 6) rect(ctx, x - Math.floor((i - 6) / 4) - 1, y, Math.floor((i - 6) / 4) * 2 + 2, 1, PAL.ink);
  }
  rect(ctx, x - 15, base - 1, 30, 1, PAL.roof);
}

// Die Truhe füllt sich sichtbar; liegt ein Fund darin, funkelt sie.
function drawChest(ctx, x, base, fill, hasLoot, time) {
  rect(ctx, x - 8, base - 8, 16, 9, PAL.ink);
  rect(ctx, x - 7, base - 7, 14, 7, PAL.wood);
  rect(ctx, x - 7, base - 1, 14, 1, PAL.woodDark);
  rect(ctx, x - 4, base - 7, 1, 7, PAL.coinDark);
  rect(ctx, x + 3, base - 7, 1, 7, PAL.coinDark);
  if (fill <= 0 && !hasLoot) {
    rect(ctx, x - 8, base - 12, 16, 5, PAL.ink);
    rect(ctx, x - 7, base - 11, 14, 4, PAL.woodLight);
    rect(ctx, x - 7, base - 8, 14, 1, PAL.woodDark);
    rect(ctx, x - 4, base - 11, 1, 4, PAL.coinDark);
    rect(ctx, x + 3, base - 11, 1, 4, PAL.coinDark);
    rect(ctx, x - 1, base - 8, 2, 2, PAL.coin);
    return;
  }
  rect(ctx, x - 8, base - 15, 16, 4, PAL.ink);
  rect(ctx, x - 7, base - 14, 14, 2, PAL.woodDark);
  rect(ctx, x - 7, base - 14, 14, 1, PAL.wood);
  rect(ctx, x - 7, base - 12, 14, 5, PAL.ink);
  const pile = 1 + Math.round(fill * 3);
  for (let k = 0; k < pile; k++) {
    rect(ctx, x - 6 + k, base - 8 - k, 12 - k * 2, 1, PAL.coin);
    px(ctx, x - 4 + k * 2, base - 8 - k, PAL.glowLight);
    px(ctx, x + 2 - k, base - 8 - k, PAL.coinDark);
  }
  if (hasLoot) {
    const y = base - 20 + Math.round(Math.sin(time * 4));
    rect(ctx, x - 1, y, 3, 1, PAL.magic);
    rect(ctx, x, y - 1, 1, 3, PAL.magic);
    px(ctx, x, y, PAL.glowLight);
    px(ctx, x - 5, base - 15 - (Math.floor(time * 6) % 4), PAL.glowLight);
    px(ctx, x + 5, base - 14 - (Math.floor(time * 6 + 2) % 4), PAL.magic);
  }
}

const FLOATERS = ['Falter', 'Fisch'];

function makeGround() {
  const [c, ctx] = makeCanvas(WORLD_W, VIEW_H);
  const r = rng(42);
  drawGround(ctx, r);
  for (const x of [22, 134, 482, 664, 778, 836, 952]) drawTree(ctx, x, r);
  for (const x of [300, 634]) drawBush(ctx, x, r);
  drawFence(ctx, COTTAGE_X + 58, COTTAGE_X + 58 + 84);
  drawCottage(ctx, COTTAGE_X);
  drawVillageSign(ctx, VILLAGE_SIGN_X);
  drawLantern(ctx, LANTERN_X);
  drawWell(ctx, WELL_X);
  return c;
}

// Dunkle Gräser ganz vorne, die schneller scrollen als die Welt.
const FRONT_FACTOR = 1.35;
function makeForeground() {
  const w = Math.ceil(VIEW_W + (WORLD_W - VIEW_W) * FRONT_FACTOR);
  const [c, ctx] = makeCanvas(w, VIEW_H);
  const r = rng(99);
  for (let x = 0; x < w; x++) {
    const h = 3 + Math.round(Math.sin(x / 31) * 2 + Math.sin(x / 9) * 1.5 + r() * 3);
    rect(ctx, x, VIEW_H - h, 1, h, PAL.grassDeep);
  }
  for (let i = 0; i < 14; i++) {
    circle(ctx, Math.floor(r() * w), VIEW_H + 2, 7 + Math.floor(r() * 6), PAL.grassDeep);
  }
  return c;
}

// Gerasterter Lichtschein: innen dichter, außen lockerer.
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

// ---------------------------------------------------------------- Ausbaustufen der Anlagen

// Rangfarben wie in den Menüs (D … SS); SS schimmert zusätzlich in den Lichtern
export const RANK_COLORS = ['#9a9aa8', '#6fbf6a', '#5aa0e0', '#b888f0', '#ffc940', '#ff6a9a'];
const GOLD = '#ffd04a';
const GOLD_DARK = '#c98a2a';
const CRYSTAL = '#9be8e0';
const CRYSTAL_DARK = '#4fa8b0';

// Fahne an einer Stange; dir 1 = weht nach rechts, -1 = nach links
function rankFlag(ctx, x, top, height, tier, dir = 1) {
  rect(ctx, x, top, 1, height, PAL.woodDark);
  px(ctx, x, top - 1, GOLD);
  const fx = dir > 0 ? x + 1 : x - 7;
  rect(ctx, fx, top + 1, 7, 4, RANK_COLORS[tier]);
  rect(ctx, fx, top + 5, 7, 1, 'rgba(42, 33, 64, 0.35)');
}

function crate(ctx, x, y) {
  rect(ctx, x, y, 6, 5, PAL.wood);
  rect(ctx, x, y, 6, 1, PAL.woodLight);
  rect(ctx, x, y + 2, 6, 1, PAL.woodDark);
  rect(ctx, x + 2, y, 1, 5, PAL.woodDark);
}

function crystals(ctx, x, y) {
  for (const [dx, h] of [[0, 6], [2, 9], [4, 5]]) {
    rect(ctx, x + dx, y - h, 2, h, CRYSTAL);
    px(ctx, x + dx, y - h, '#fdf6e3');
    rect(ctx, x + dx + 1, y - h + 2, 1, h - 2, CRYSTAL_DARK);
  }
}

// Jede Anlage bekommt pro Rang etwas dazu (kumulativ). x ist die Mitte der Anlage.
const UPGRADES = {
  tower(ctx, x, t) {
    const base = GROUND_Y + 3;
    rankFlag(ctx, x + 10, base - 70, 12, t, 1);
    if (t >= 1) {
      // Balkon mit Geländer
      rect(ctx, x - 11, base - 30, 22, 2, PAL.woodDark);
      for (let k = -10; k <= 10; k += 3) rect(ctx, k + x, base - 33, 1, 3, PAL.wood);
    }
    if (t >= 2) {
      // schwebende Kristalle neben dem Turm
      crystals(ctx, x - 18, base - 34);
      crystals(ctx, x + 13, base - 26);
    }
    if (t >= 3) {
      // Goldkante am Dach
      for (let i = 0; i < 18; i++) {
        const half = Math.floor(i * 0.62) + 1;
        px(ctx, x - half, base - 62 + i, GOLD);
        px(ctx, x + half - 1, base - 62 + i, GOLD);
      }
    }
    if (t >= 4) {
      // Anbau mit Kuppel
      rect(ctx, x + 9, base - 22, 12, 22, '#7a6a8a');
      circle(ctx, x + 15, base - 22, 6, '#4b3b8a');
      px(ctx, x + 15, base - 28, GOLD);
      rect(ctx, x + 13, base - 14, 4, 5, PAL.ink);
    }
    if (t >= 5) {
      // Sternenring um die Spitze
      for (let k = 0; k < 12; k++) px(ctx, x + Math.round(Math.cos(k / 12 * Math.PI * 2) * 12), base - 66 + Math.round(Math.sin(k / 12 * Math.PI * 2) * 3), '#fdf6e3');
    }
  },

  camp(ctx, x, t) {
    const base = GROUND_Y + 4;
    rect(ctx, x + 1, base - 24, 4, 2, RANK_COLORS[t]); // Zeltwimpel in Rangfarbe
    px(ctx, x + 5, base - 23, RANK_COLORS[t]);
    if (t >= 1) rankFlag(ctx, x - 21, base - 26, 26, t, -1);
    if (t >= 2) {
      crate(ctx, x + 13, base - 6);
      crate(ctx, x + 15, base - 11);
      // Feuerstelle mit Steinen (Flammen in den Lichtern)
      for (const dx of [-30, -28, -26, -24, -22]) rect(ctx, x + dx, base - 2, 2, 2, PAL.stone);
      rect(ctx, x - 28, base - 4, 5, 2, PAL.woodDark);
    }
    if (t >= 3) {
      // zweites, kleineres Zelt
      for (let i = 0; i < 12; i++) {
        const half = Math.floor(i * 0.7) + 1;
        rect(ctx, x - 40 - half, base - 12 + i, half * 2, 1, i % 3 ? '#c8b088' : '#b09870');
      }
      rect(ctx, x - 41, base - 4, 2, 4, PAL.ink);
    }
    if (t >= 4) {
      // Goldsaum am Zelt und Wimpelkette
      for (let i = 0; i < 19; i++) px(ctx, x - Math.floor(i * 0.75) - 1, base - 19 + i, GOLD);
      for (let i = 0; i < 14; i++) px(ctx, x - 20 + i, base - 25 + Math.floor(i / 3), i % 3 ? RANK_COLORS[i % 6] : GOLD);
    }
    if (t >= 5) {
      // Sternenmuster auf dem Zelt
      for (const [dx, dy] of [[-4, -12], [3, -8], [-7, -5], [6, -3], [0, -15]]) {
        px(ctx, x + dx, base + dy, '#fdf6e3');
        px(ctx, x + dx + 1, base + dy, '#b888f0');
      }
    }
  },

  dungeon(ctx, x, t) {
    const base = GROUND_Y + 4;
    rankFlag(ctx, x + 19, base - 34, 34, t, 1);
    if (t >= 1) {
      // hochgezogenes Fallgitter
      for (let gx = x - 6; gx <= x + 5; gx += 2) rect(ctx, gx, base - 18, 1, 5, PAL.stone);
      rect(ctx, x - 7, base - 13, 14, 1, PAL.stone);
    }
    if (t >= 2) {
      // Banner an den Seiten
      for (const bx of [x - 14, x + 11]) {
        rect(ctx, bx, base - 22, 3, 9, '#8a3c44');
        px(ctx, bx + 1, base - 13, '#8a3c44');
        px(ctx, bx + 1, base - 19, GOLD);
      }
    }
    if (t >= 3) {
      // goldener Schlussstein und Zierkante
      rect(ctx, x - 13, base - 28, 26, 1, GOLD);
      rect(ctx, x - 2, base - 23, 4, 3, GOLD);
      px(ctx, x - 1, base - 22, GOLD_DARK);
    }
    if (t >= 4) {
      // Obelisken mit Runen (Leuchten in den Lichtern)
      for (const ox of [x - 23, x + 22]) {
        rect(ctx, ox, base - 18, 4, 18, PAL.stone);
        rect(ctx, ox + 1, base - 20, 2, 2, PAL.stone);
        rect(ctx, ox, base - 18, 1, 18, PAL.stoneLight);
      }
    }
    if (t >= 5) crystals(ctx, x - 3, base - 28);
  },

  arena(ctx, x, t) {
    const base = GROUND_Y + 4;
    // vorhandene Fahnen in Rangfarbe
    rect(ctx, x - 20, base - 36, 5, 3, RANK_COLORS[t]);
    rect(ctx, x + 15, base - 36, 5, 3, RANK_COLORS[t]);
    if (t >= 1) {
      for (const bx of [x - 15, x + 9]) {
        rect(ctx, bx, base - 21, 5, 8, RANK_COLORS[t]);
        px(ctx, bx + 2, base - 13, RANK_COLORS[t]);
        rect(ctx, bx, base - 21, 5, 1, PAL.woodDark);
      }
    }
    const tower = (tx) => {
      rect(ctx, tx, base - 32, 8, 32, PAL.stone);
      rect(ctx, tx, base - 32, 1, 32, PAL.stoneLight);
      for (let i = 0; i < 3; i++) rect(ctx, tx + i * 3, base - 35, 2, 3, PAL.stone);
      rect(ctx, tx + 3, base - 24, 2, 4, PAL.ink);
    };
    if (t >= 2) tower(x + 22);
    if (t >= 3) {
      // Goldwappen über dem Tor und Goldzinnen
      rect(ctx, x - 4, base - 21, 8, 6, GOLD);
      rect(ctx, x - 3, base - 20, 6, 4, GOLD_DARK);
      px(ctx, x, base - 19, GOLD);
      for (let i = 0; i < 8; i++) rect(ctx, x - 22 + i * 6, base - 25, 3, 1, GOLD);
    }
    if (t >= 4) {
      tower(x - 30);
      rankFlag(ctx, x - 27, base - 47, 12, t, -1);
      rankFlag(ctx, x + 26, base - 47, 12, t, 1);
    }
    if (t >= 5) crystals(ctx, x - 3, base - 25);
  },

  mine(ctx, x, t) {
    const base = GROUND_Y + 4;
    rankFlag(ctx, x + 6, base - 50, 18, t, 1);
    if (t >= 1) {
      // Laterne am Stollenrahmen (Licht in den Lichtern)
      rect(ctx, x - 1, base - 27, 1, 3, PAL.woodDark);
      rect(ctx, x - 2, base - 24, 3, 3, PAL.ink);
    }
    if (t >= 2) {
      // zweite Lore
      rect(ctx, x - 31, base - 9, 15, 9, PAL.ink);
      rect(ctx, x - 30, base - 8, 13, 7, PAL.wood);
      rect(ctx, x - 30, base - 8, 13, 1, PAL.woodLight);
      rect(ctx, x - 30, base - 5, 13, 1, PAL.woodDark);
      for (let i = 0; i < 4; i++) circle(ctx, x - 28 + i * 3, base - 9 - (i % 2), 1, i % 2 ? '#a8b0c0' : '#d07a4a');
      circle(ctx, x - 27, base - 1, 1, PAL.ink);
      circle(ctx, x - 20, base - 1, 1, PAL.ink);
    }
    if (t >= 3) {
      // Golderz-Haufen
      for (const [dx, dy] of [[30, -2], [33, -2], [36, -2], [31, -4], [34, -4], [32, -6]]) {
        rect(ctx, x + dx, base + dy, 3, 2, GOLD);
        px(ctx, x + dx, base + dy, '#fff1b8');
      }
    }
    if (t >= 4) {
      crystals(ctx, x - 22, base - 22);
      crystals(ctx, x + 18, base - 26);
    }
    if (t >= 5) {
      // Sternenerz in der Felswand
      for (const [dx, dy] of [[-12, -30], [8, -34], [-24, -12], [22, -16]]) {
        rect(ctx, x + dx, base + dy, 2, 2, '#ff8ad0');
        px(ctx, x + dx, base + dy, '#fdf6e3');
      }
    }
  },

  portal() {},

  // Der Brunnen selbst liegt im Boden-Bild; hier nur der Schmuck je Rang
  well(ctx, x, t) {
    const base = GROUND_Y + 4;
    if (t >= 1) {
      rankFlag(ctx, x - 17, base - 24, 24, t, -1);
      for (const [dx, c] of [[13, '#ff8ab0'], [15, '#ffd04a'], [17, '#b888f0'], [-21, '#ff8ab0'], [-23, '#9be8e0']]) {
        rect(ctx, x + dx, base - 3, 1, 3, PAL.leaf);
        px(ctx, x + dx, base - 4, c);
        px(ctx, x + dx - 1, base - 2, PAL.leafLight);
      }
    }
    if (t >= 2) {
      // Laterne an einem Pfahl (Licht in den Lichtern)
      rect(ctx, x + 20, base - 16, 1, 16, PAL.woodDark);
      rect(ctx, x + 18, base - 16, 3, 1, PAL.woodDark);
      rect(ctx, x + 17, base - 15, 3, 4, PAL.ink);
      rect(ctx, x + 18, base - 14, 1, 2, '#ffd04a');
    }
    if (t >= 3) {
      // Goldkante am Dach und am Rand
      for (let i = 0; i < 6; i++) px(ctx, x - 4 - i * 2, base - 28 + i, GOLD);
      for (let i = 0; i < 6; i++) px(ctx, x + 3 + i * 2, base - 28 + i, GOLD);
      rect(ctx, x - 12, base - 11, 24, 1, GOLD);
      px(ctx, x, base - 29, GOLD);
    }
    if (t >= 4) {
      crystals(ctx, x - 30, base);
      crystals(ctx, x + 24, base);
    }
    if (t >= 5) {
      // Regenbogen-Bogen über dem Dach
      for (let i = 0; i <= 16; i++) {
        const dx = i - 8;
        const dy = Math.round((dx * dx) / 10);
        RANK_COLORS.slice(1).forEach((col, k) => px(ctx, x + dx, base - 38 + dy - k, col));
      }
    }
  },

  forge(ctx, x, t) {
    const base = GROUND_Y + 3;
    const left = x - 14;
    rankFlag(ctx, x + 11, base - 36, 16, t, 1);
    if (t >= 1) {
      // höhere Esse
      rect(ctx, left + 4, base - 44, 6, 8, PAL.brick);
      rect(ctx, left + 3, base - 45, 8, 2, PAL.stone);
      px(ctx, left + 6, base - 41, PAL.ink);
    }
    if (t >= 2) {
      // Waffen an der Wand
      rect(ctx, x + 10, base - 15, 1, 9, PAL.stoneLight);
      rect(ctx, x + 9, base - 8, 3, 1, PAL.woodDark);
      rect(ctx, x + 12, base - 14, 1, 8, PAL.stoneLight);
      rect(ctx, x + 11, base - 8, 3, 1, PAL.woodDark);
    }
    if (t >= 3) {
      // Goldrahmen ums Schild
      rect(ctx, left - 7, base - 14, 11, 1, GOLD);
      rect(ctx, left - 7, base - 6, 11, 1, GOLD);
      rect(ctx, left - 7, base - 14, 1, 9, GOLD);
      rect(ctx, left + 3, base - 14, 1, 9, GOLD);
    }
    if (t >= 4) {
      // zweiter Amboss mit Goldkante
      rect(ctx, left - 32, base - 6, 9, 2, PAL.stone);
      rect(ctx, left - 34, base - 6, 2, 1, PAL.stone);
      rect(ctx, left - 30, base - 4, 4, 2, PAL.ink);
      rect(ctx, left - 31, base - 2, 7, 2, PAL.woodDark);
      rect(ctx, left - 32, base - 6, 9, 1, GOLD);
    }
    if (t >= 5) crystals(ctx, left + 5, base - 45);
  },
};

// Bild einer Anlage im angegebenen Rang (breite Leinwand, Mitte bei 56)
const PROP_W = 112;
// Grundbilder (Funktionsdeklarationen weiter oben, daher hier schon verfügbar)
const BASE_DRAW = { well: () => {}, portal: drawPortal, camp: drawTent, dungeon: drawDungeonGate, arena: drawArena, mine: drawMineEntrance, forge: drawForge, tower: drawTower };
const propCache = new Map();
export function buildingProp(name, tier) {
  const key = `${name}-${tier}`;
  if (!propCache.has(key)) {
    const [c, ctx] = makeCanvas(PROP_W, VIEW_H);
    BASE_DRAW[name](ctx, PROP_W / 2);
    UPGRADES[name](ctx, PROP_W / 2, tier);
    propCache.set(key, c);
  }
  return propCache.get(key);
}

// einfache Requisite (Bauplatz)
function prop(draw) {
  const [c, ctx] = makeCanvas(48, VIEW_H);
  draw(ctx, 24);
  return c;
}

// Wetter je Landschaft: fallende Teilchen vor der Szene
const WEATHER = {
  snow: { n: 60, fall: 14, drift: 6, sway: 3, colors: ['#ffffff', '#f4f8ff', '#dce6f2'], size: [1, 1, 2] },
  leaves: { n: 18, fall: 9, drift: 10, sway: 6, colors: ['#d0702a', '#f0a040', '#9a4028', '#e8c050'], size: [2, 2, 2] },
  petals: { n: 26, fall: 7, drift: 8, sway: 5, colors: ['#f8c0d8', '#f2a0b0', '#fff0f6'], size: [1, 2, 1] },
  // Portalwelten: aufsteigende Funken (Hölle) und sanft fallende Federn (Himmel)
  embers: { n: 40, fall: -12, drift: 4, sway: 4, colors: ['#ff8a3a', '#ffd04a', '#ff5a2a', '#ffb070'], size: [1, 1, 2] },
  feathers: { n: 16, fall: 5, drift: 6, sway: 8, colors: ['#ffffff', '#fff6e6', '#ffe8f0'], size: [2, 2, 1] },
};

function drawWeather(ctx, kind, time) {
  const w = WEATHER[kind];
  if (!w) return;
  for (let i = 0; i < w.n; i++) {
    const seed = Math.sin(i * 12.9898) * 43758.5453;
    const u = seed - Math.floor(seed);
    const speed = 0.6 + u * 0.8;
    const x = ((i * 61.7 + time * w.drift * speed) % (VIEW_W + 20)) - 10 + Math.sin(time * 1.3 + i) * w.sway;
    const span = VIEW_H + 10;
    const y = ((((u * VIEW_H + time * w.fall * speed) % span) + span) % span) - 5;
    const size = w.size[i % w.size.length];
    ctx.fillStyle = w.colors[i % w.colors.length];
    // Laub dreht sich: abwechselnd breit und schmal
    const flip = kind === 'leaves' && Math.floor(time * 4 + i) % 2;
    ctx.fillRect(Math.round(x), Math.round(y), flip ? 1 : size, size === 2 && kind === 'leaves' ? 1 + (flip ? 1 : 0) : size);
  }
}

export function createWorld(theme = {}) {
  propCache.clear(); // Anlagen in den Farben der Landschaft neu malen
  const ground = makeGround();
  const site = prop(drawSite);
  // gebaute Anlage im aktuellen Rang, sonst Bauplatz
  const drawBuilding = (ctx, name, x, cam) => {
    const t = buildings.tier(name);
    if (t < 0) ctx.drawImage(site, x - 24 - cam, 0);
    else ctx.drawImage(buildingProp(name, t), x - PROP_W / 2 - cam, 0);
  };
  const foreground = makeForeground();
  const r = rng(1234);

  const smoke = [];
  let smokeTimer = 0;

  const fireflies = Array.from({ length: 16 }, () => ({
    x: r() * WORLD_W,
    y: GROUND_Y - 22 + r() * 30,
    phase: r() * 10,
    speed: 0.4 + r() * 0.6,
  }));

  // Münzen erscheinen nach und nach auf dem Weg und werden im Vorbeigehen eingesammelt.
  const coins = [];
  let rain = 0; // Sekunden Sternenregen
  const pops = [];
  let coinTimer = 1;

  // Das Expeditionsteam läuft als kleine Pixelfiguren im Lager umher.
  const actors = new Map();
  function updateTeam(dt) {
    const team = expedition.live.team;
    for (const id of actors.keys()) if (!team.some((item) => item.id === id)) actors.delete(id);
    for (const item of team) {
      if (actors.has(item.id)) continue;
      const slots = [0, 1, 2, 3].filter((s) => ![...actors.values()].some((a) => a.slot === s));
      actors.set(item.id, { item, slot: slots[0], x: CAMP_X - 30 + r() * 80, target: null, wait: r() * 2, dir: 1, speed: 6 + r() * 6, phase: r() * 6 });
    }
    for (const a of actors.values()) {
      if (a.wait > 0) {
        a.wait -= dt;
        continue;
      }
      if (a.target === null) a.target = CAMP_X - 42 + r() * 104;
      const d = a.target - a.x;
      a.dir = d < 0 ? -1 : 1;
      if (Math.abs(d) <= a.speed * dt) {
        a.x = a.target;
        a.target = null;
        a.wait = 1 + r() * 3;
      } else a.x += a.dir * a.speed * dt;
    }
  }

  function drawTeam(ctx, cam, time) {
    drawBuilding(ctx, 'camp', CAMP_X - 30, cam);
    if (!buildings.owned('camp')) return;
    ctx.drawImage(expedition.leaderImage(), CAMP_X - 6 - cam, GROUND_Y - 10);
    for (const a of [...actors.values()].sort((p, q) => p.slot - q.slot)) {
      let y = GROUND_Y - 9 + (a.slot % 2) * 3;
      if (FLOATERS.includes(a.item.kind)) y -= 7 + Math.round(Math.sin(time * 2 + a.phase) * 2);
      else if (a.wait <= 0) y -= Math.floor(time * 7 + a.phase) % 2;
      const x = Math.round(a.x) - 8 - cam;
      if (a.dir < 0) {
        ctx.save();
        ctx.translate(x + 16, y);
        ctx.scale(-1, 1);
        ctx.drawImage(itemImage(a.item), 0, 0);
        ctx.restore();
      } else ctx.drawImage(itemImage(a.item), x, y);
    }
    // die Truhe steht vorne, damit sie immer anklickbar und sichtbar bleibt
    const { gold, cap, loot } = expedition.live;
    drawChest(ctx, CHEST_X - cam, GROUND_Y + 7, cap ? gold / cap : 0, loot > 0, time);
  }

  // Gartenhelfer läuft zwischen den Beeten und arbeitet an ihnen
  const gh = { x: GARDEN_BED_X + 20, target: null, wait: 1, dir: 1, work: 0 };
  function updateGardener(dt) {
    if (!gardener.creature()) return;
    if (gh.work > 0) gh.work -= dt;
    if (gh.wait > 0) {
      gh.wait -= dt;
      return;
    }
    const n = garden.beds().length;
    if (gh.target === null) gh.target = GARDEN_BED_X + 6 + Math.floor(r() * n) * GARDEN_BED_STEP;
    const d = gh.target - gh.x;
    gh.dir = d < 0 ? -1 : 1;
    if (Math.abs(d) <= 14 * dt) {
      gh.x = gh.target;
      gh.target = null;
      gh.wait = 1.5 + r() * 2;
      gh.work = 1.2;
    } else gh.x += gh.dir * 14 * dt;
  }

  return {
    update(dt, player) {
      updateTeam(dt);
      updateGardener(dt);
      coinTimer -= dt;
      rain = Math.max(0, rain - dt);
      if (coinTimer <= 0) {
        // Sternenregen: viele Münzen rund um die Spielfigur
        if (rain > 0) {
          coinTimer = 0.25;
          const x = Math.max(16, Math.min(WORLD_W - 16, player.x + (r() - 0.5) * 240));
          if (coins.length < 30 && Math.abs(x - player.x) > 10) coins.push({ x, age: 0 });
        } else {
          coinTimer = 2.5 + r() * 2;
          const x = 16 + r() * (WORLD_W - 32);
          if (coins.length < 7 && Math.abs(x - player.x) > 40) coins.push({ x, age: 0 });
        }
      }
      for (let i = coins.length - 1; i >= 0; i--) {
        coins[i].age += dt;
        if (Math.abs(coins[i].x - player.x) < 8 + companions.bonus('coinReach')) {
          pops.push({ x: coins[i].x, age: 0 });
          coins.splice(i, 1);
          state.addGold(buffs.coinValue(), 'muenzen');
          audio.play('coin');
        }
      }
      for (const p of pops) p.age += dt;
      while (pops.length && pops[0].age > 0.5) pops.shift();

      smokeTimer -= dt;
      if (smokeTimer <= 0) {
        smokeTimer = 0.55 + r() * 0.35;
        smoke.push({ x: COTTAGE_X + 38, y: GROUND_Y - 46, age: 0, drift: 2 + r() * 3 });
      }
      for (const s of smoke) {
        s.age += dt;
        s.y -= 6 * dt;
        s.x += s.drift * dt;
      }
      while (smoke.length && smoke[0].age > 5) smoke.shift();
    },

    draw(ctx, camX, time) {
      const cam = Math.round(camX);
      ctx.drawImage(ground, -cam, 0);

      drawTeam(ctx, cam, time);

      drawBuilding(ctx, 'well', WELL_X, cam);
      drawBuilding(ctx, 'dungeon', DUNGEON_X, cam);
      drawBuilding(ctx, 'forge', FORGE_X, cam);
      drawBuilding(ctx, 'arena', ARENA_X, cam);
      drawBuilding(ctx, 'mine', MINE_X, cam);
      drawBuilding(ctx, 'tower', TOWER_X, cam);
      drawBuilding(ctx, 'portal', PORTAL_X, cam);

      // Gartenbeete vor dem Zaun
      const now = Date.now();
      garden.beds().forEach((b, i) => {
        const x = GARDEN_BED_X + i * GARDEN_BED_STEP - cam;
        const y = GROUND_Y + 2;
        rect(ctx, x - 1, y - 1, 14, 7, PAL.woodDark);
        rect(ctx, x, y, 12, 5, '#5a3a2e');
        for (let k = 1; k < 12; k += 3) px(ctx, x + k, y + 1 + (k % 2), '#7a5038');
        if (!b) return;
        const g = garden.growth(i, now);
        if (g >= 1) {
          ctx.drawImage(garden.cropImage(b.crop), x + 1, y - 9, 10, 10);
          return;
        }
        const stage = Math.floor(g * 3);
        for (const cx of [x + 3, x + 8]) {
          px(ctx, cx, y - 1, PAL.leafLight);
          if (stage >= 1) {
            px(ctx, cx, y - 2, PAL.leaf);
            px(ctx, cx - 1, y - 2, PAL.leafLight);
            px(ctx, cx + 1, y - 3, PAL.leaf);
          }
          if (stage >= 2) {
            rect(ctx, cx - 1, y - 4, 3, 1, PAL.leaf);
            px(ctx, cx, y - 5, PAL.leafLight);
          }
        }
      });

      // Gartenhelfer
      const helperItem = gardener.creature();
      if (helperItem) {
        const hop = gh.work > 0 ? Math.floor(time * 8) % 2 : gh.wait <= 0 ? Math.floor(time * 6) % 2 : 0;
        const x = Math.round(gh.x) - 8 - cam;
        const y = GROUND_Y - 6 - hop;
        if (gh.dir < 0) {
          ctx.save();
          ctx.translate(x + 16, y);
          ctx.scale(-1, 1);
          ctx.drawImage(itemImage(helperItem), 0, 0);
          ctx.restore();
        } else ctx.drawImage(itemImage(helperItem), x, y);
        if (gh.work > 0) for (let k = 0; k < 3; k++) px(ctx, x + 8 + Math.round(Math.sin(time * 6 + k * 2) * 6), y + 14 - ((Math.floor(time * 10) + k * 3) % 8), k % 2 ? PAL.leafLight : PAL.leaf);
      }

      // Erzhändler am Brunnen, wenn er gerade da ist
      if (trader.present()) {
        const tx = TRADER_X - cam;
        rect(ctx, tx - 11, GROUND_Y + 6, 22, 3, '#8a3c44');
        rect(ctx, tx - 10, GROUND_Y + 7, 20, 1, '#c0504a');
        ctx.drawImage(trader.traderImage(), tx - 8, GROUND_Y - 9);
        for (const [dx, t] of [[-15, 0], [-19, 2], [12, 4]]) ctx.drawImage(mine.oreImage(t), tx + dx, GROUND_Y + 1, 8, 8);
      }

      for (const s of smoke) {
        const life = s.age / 5;
        ctx.globalAlpha = 0.75 * (1 - life);
        circle(ctx, Math.round(s.x) - cam, Math.round(s.y), life < 0.15 ? 1 : life < 0.6 ? 2 : 3, PAL.smoke);
      }
      ctx.globalAlpha = 1;
    },

    coinRain(seconds) {
      rain = seconds;
      coinTimer = 0;
    },

    // Lichter werden nach der Tageszeit-Tönung gezeichnet und leuchten deshalb nachts.
    drawLights(ctx, camX, time, night) {
      const cam = Math.round(camX);
      const flicker = Math.sin(time * 9) > 0.4 ? 1 : 0;
      const lamp = 0.3 + 0.7 * night;

      // Wirbel im Dimensionsportal: Farbe der Welt dahinter (Heimat: Grün und Blau)
      if (buildings.owned('portal')) {
        const px0 = PORTAL_X - cam;
        const py = GROUND_Y + 4 - 18;
        const target = realm.inRealm() ? 'normal' : state.realm.visited[state.realm.type] ? state.realm.type : null;
        const cols = target === 'hoelle' ? ['#ff5a2a', '#ffb03a', '#c0201c'] : target === 'himmel' ? ['#ffe070', '#ffffff', '#9be8ff'] : target === 'normal' ? ['#6fbf6a', '#5aa0e0', '#9be8e0'] : ['#b888f0', '#9be8e0', '#ffffff'];
        ctx.fillStyle = cols[0];
        ctx.globalAlpha = 0.55;
        for (let y = -12; y <= 13; y++) {
          const half = Math.round(Math.sqrt(Math.max(0, 1 - (y / 13) ** 2)) * 9);
          ctx.fillRect(px0 - half, py + y, half * 2, 1);
        }
        ctx.globalAlpha = 1;
        for (let i = 0; i < 26; i++) {
          const a = time * 2.2 + i * 0.7;
          const rad = (i % 9) + 1 + Math.sin(time + i) * 0.5;
          ctx.fillStyle = cols[i % cols.length];
          ctx.fillRect(Math.round(px0 + Math.cos(a) * rad * 0.9), Math.round(py + Math.sin(a) * rad * 1.3), 1, 1);
        }
        glow(ctx, px0, py, 18 + flicker, 0.35, cols[0]);
      }

      // erleuchtete Fensterscheiben und Laternenglas
      if (night > 0.05) {
        ctx.globalAlpha = Math.min(1, night * 1.1);
        const wx = COTTAGE_X + 27 - cam;
        const wy = GROUND_Y - 21 + 7;
        rect(ctx, wx, wy, 12, 10, PAL.glow);
        rect(ctx, wx, wy, 5, 4, PAL.glowLight);
        rect(ctx, wx + 5, wy, 1, 10, PAL.woodDark);
        rect(ctx, wx, wy + 4, 12, 1, PAL.woodDark);
        rect(ctx, LANTERN_X - 5 - cam, GROUND_Y - 15, 3, 4, PAL.glow);
        px(ctx, LANTERN_X - 4 - cam, GROUND_Y - 14, PAL.glowLight);
        ctx.globalAlpha = 1;
      }
      glow(ctx, COTTAGE_X + 33 - cam, GROUND_Y - 9, 15 + flicker + Math.round(night * 6), 0.3 * lamp);
      glow(ctx, LANTERN_X - 4 - cam, GROUND_Y - 13, 12 + flicker + Math.round(night * 6), 0.35 * lamp);

      glow(ctx, WELL_X - cam, GROUND_Y - 8, 13 + flicker, 0.3, PAL.magic);

      // Ausbaustufen, die leuchten oder sich bewegen
      const tierOf = (n) => buildings.tier(n);
      const twinkle = (x, y, i) => {
        if (Math.floor(time * 3 + i * 1.3) % 3 === 0) return;
        rect(ctx, x - 1, y, 3, 1, PAL.glowLight);
        rect(ctx, x, y - 1, 1, 3, PAL.glowLight);
      };
      // Lagerfeuer am Expeditionslager
      if (tierOf('camp') >= 2) {
        const fx = CAMP_X - 30 - 26 - cam;
        const fy = GROUND_Y + 4;
        for (let i = 0; i < 3; i++) {
          const h = 2 + Math.round((Math.sin(time * 11 + i * 2) + 1) * 1.5);
          rect(ctx, fx - 1 + i, fy - 4 - h, 1, h, i === 1 ? PAL.glow : PAL.roofLight);
        }
        glow(ctx, fx, fy - 5, 8 + Math.round(night * 6), 0.18 + 0.25 * night, PAL.roofLight);
      }
      // Laterne an der Mine
      if (tierOf('mine') >= 1) {
        rect(ctx, MINE_X - 1 - cam, GROUND_Y - 19, 1, 2, PAL.glow);
        glow(ctx, MINE_X - 1 - cam, GROUND_Y - 18, 7 + Math.round(night * 5), 0.15 + 0.3 * night);
      }
      // Runen an den Dungeon-Obelisken und Portal im Tor
      if (tierOf('dungeon') >= 4) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 2);
        for (const ox of [DUNGEON_X - 22, DUNGEON_X + 23]) {
          ctx.globalAlpha = 0.5 + 0.5 * pulse;
          for (let k = 0; k < 3; k++) px(ctx, ox + (k % 2) - cam, GROUND_Y - 10 + k * 4, PAL.magic);
          ctx.globalAlpha = 1;
          glow(ctx, ox - cam, GROUND_Y - 6, 5, 0.15 + 0.15 * pulse, PAL.magic);
        }
      }
      if (tierOf('dungeon') >= 5) {
        const gx2 = DUNGEON_X - cam;
        for (let k = 0; k < 8; k++) {
          const a = time * 2 + k * 0.8;
          px(ctx, gx2 + Math.round(Math.cos(a) * 4), GROUND_Y - 5 + Math.round(Math.sin(a) * 6), k % 2 ? '#b888f0' : PAL.magic);
        }
      }
      // Kristalle und Sternenerz funkeln
      if (tierOf('mine') >= 5) [[-12, -26], [8, -30], [-24, -8], [22, -12]].forEach(([dx, dy], i) => twinkle(MINE_X + dx - cam, GROUND_Y + dy, i));
      if (tierOf('arena') >= 5) twinkle(ARENA_X - 1 - cam, GROUND_Y - 30, 1);
      if (tierOf('dungeon') >= 5) twinkle(DUNGEON_X - 1 - cam, GROUND_Y - 34, 2);
      if (tierOf('forge') >= 5) twinkle(FORGE_X - 8 - cam, GROUND_Y - 50, 3);
      // SS: Rangfahnen schimmern in allen Farben
      const hue = `hsl(${Math.round(time * 80) % 360} 85% 65%)`;
      for (const [name, x, y] of [
        ['camp', CAMP_X - 30 - 28, GROUND_Y - 21],
        ['dungeon', DUNGEON_X + 20, GROUND_Y - 29],
        ['arena', ARENA_X + 27, GROUND_Y - 42],
        ['mine', MINE_X + 7, GROUND_Y - 45],
        ['forge', FORGE_X + 12, GROUND_Y - 32],
        ['tower', TOWER_X + 11, GROUND_Y - 66],
      ]) {
        if (tierOf(name) >= 5) rect(ctx, x - cam, y, 7, 4, hue);
      }

      // Magierturm: Kristallkugel an der Spitze und Fenster; Runen leuchten, wenn genug Mana da ist
      if (tierOf('tower') >= 0) {
        const tx = TOWER_X - cam;
        const top = GROUND_Y + 3 - 44;
        const pulse = 0.5 + 0.5 * Math.sin(time * 2.5);
        circle(ctx, tx, top - 24, 2, PAL.magic);
        px(ctx, tx - 1, top - 25, '#fdf6e3');
        glow(ctx, tx, top - 24, 8 + Math.round(pulse * 3), 0.25 + 0.15 * pulse, PAL.magic);
        ctx.globalAlpha = 0.4 + 0.6 * Math.max(night, 0.3);
        rect(ctx, tx - 2, top + 8, 4, 6, '#b888f0');
        rect(ctx, tx - 2, top + 22, 4, 6, '#b888f0');
        ctx.globalAlpha = 1;
        if (magic.mana() >= 15) {
          for (let k = 0; k < 4; k++) {
            const tt = (time * 0.5 + k / 4) % 1;
            px(ctx, tx - 8 + Math.round(Math.sin(time * 2 + k * 1.7) * 10), GROUND_Y - Math.round(tt * 50), k % 2 ? PAL.magic : '#b888f0');
          }
        }
        if (tierOf('tower') >= 5) for (let k = 0; k < 12; k++) {
          const a = time * 0.8 + k / 12 * Math.PI * 2;
          px(ctx, tx + Math.round(Math.cos(a) * 12), top - 22 + Math.round(Math.sin(a) * 3), k % 3 ? '#fdf6e3' : PAL.magic);
        }
      }

      // reife Beete funkeln
      garden.beds().forEach((b, i) => {
        if (!garden.ready(i)) return;
        const x = GARDEN_BED_X + i * GARDEN_BED_STEP - cam + 6;
        const y = GROUND_Y - 9 + Math.round(Math.sin(time * 3 + i) * 1.5);
        if (Math.floor(time * 3 + i) % 3 === 0) return;
        rect(ctx, x - 1, y, 3, 1, PAL.glowLight);
        rect(ctx, x, y - 1, 1, 3, PAL.glowLight);
      });

      // Schmiedefeuer brennt immer, Funken steigen aus der Esse
      if (buildings.owned('forge')) {
        const fx = FORGE_X - cam;
        const base = GROUND_Y + 3;
        const ft = buildings.tier('forge');
        // ab Rang SS brennt eine blaue Zauberflamme, ab Rang C ist die Esse höher
        const [f1, f2, fGlow] = ft >= 5 ? [PAL.magic, '#b888f0', PAL.magic] : [PAL.roofLight, PAL.glow, PAL.roofLight];
        for (let i = 0; i < 5; i++) {
          const h = 2 + Math.round((Math.sin(time * 10 + i * 1.9) + 1) * 2);
          rect(ctx, fx - 5 + i * 2, base - 1 - h, 2, h, i % 2 ? f1 : f2);
        }
        rect(ctx, fx - 6, base - 2, 12, 2, PAL.glowLight);
        glow(ctx, fx, base - 5, 12 + flicker + Math.round(night * 6), 0.25 + 0.2 * night, fGlow);
        const chimneyTop = ft >= 1 ? 46 : 38;
        for (let i = 0; i < 3; i++) {
          const t = (time * 0.6 + i / 3) % 1;
          px(ctx, fx - 7 + Math.round(Math.sin(time * 2 + i * 2) * 2), base - chimneyTop - Math.round(t * 18), t < 0.5 ? PAL.glowLight : ft >= 5 ? PAL.magic : PAL.roofLight);
        }
      }
      if (trader.present()) {
        const tx = TRADER_X - cam;
        rect(ctx, tx + 10, GROUND_Y - 1, 3, 4, PAL.ink);
        rect(ctx, tx + 11, GROUND_Y, 1, 2, PAL.glow);
        glow(ctx, tx + 11, GROUND_Y + 1, 8 + Math.round(night * 6), 0.2 + 0.25 * night);
        // schwebendes Erz über dem Kopf, damit man ihn bemerkt
        const bob = Math.round(Math.sin(time * 3) * 1.5);
        ctx.drawImage(mine.oreImage(3), tx - 4, GROUND_Y - 22 + bob, 8, 8);
      }
      for (let i = 0; i < 4; i++) {
        const t = (time * 0.35 + i / 4) % 1;
        if (t > 0.85) continue;
        px(ctx, WELL_X - cam + Math.round(Math.sin(time * 1.3 + i * 2.1) * 6), GROUND_Y - 8 - Math.round(t * 22), i % 2 ? PAL.magic : PAL.glowLight);
      }

      const gx = DUNGEON_X - cam;
      const gy = GROUND_Y + 4;
      const hasGate = buildings.owned('dungeon');
      for (const tx of hasGate ? [gx - 13, gx + 12] : []) {
        const tall = Math.floor(time * 8 + tx) % 3;
        if (night > 0.2) glow(ctx, tx, gy - 17, 6 + Math.round(night * 4), 0.35 * night);
        rect(ctx, tx - 1, gy - 17, 3, 3, PAL.roofLight);
        rect(ctx, tx, gy - 18 - (tall ? 1 : 0), 1, 3 + (tall ? 1 : 0), PAL.glow);
        px(ctx, tx, gy - 16, PAL.glowLight);
      }
      // Dungeon: Schimmern während einer Erkundung, Ausrufezeichen bei Rückkehr
      const dungeonState = hasGate ? dungeon.status() : 'idle';
      if (dungeonState !== 'idle') {
        for (let i = 0; i < 5; i++) {
          const t = Math.floor(time * 5 + i * 1.7);
          px(ctx, gx - 5 + ((t * 7 + i * 3) % 11), gy - 3 - ((t * 5 + i * 4) % 14), i % 2 ? PAL.magic : '#b888f0');
        }
      }
      if (dungeonState === 'done') {
        const y = gy - 38 + Math.round(Math.sin(time * 5) * 1.5);
        rect(ctx, gx - 2, y - 1, 4, 9, PAL.ink);
        rect(ctx, gx - 1, y, 2, 4, PAL.coin);
        rect(ctx, gx - 1, y + 5, 2, 2, PAL.coin);
      }

      // Münzen glänzen auch nachts
      for (const c of coins) {
        const x = Math.round(c.x) - cam - 2;
        const y = WALK_Y - 8 + Math.round(Math.sin(c.age * 3 + c.x) * 1.5);
        const thin = Math.floor(c.age * 4 + c.x) % 4 === 3;
        rect(ctx, x + (thin ? 1 : 0), y, thin ? 2 : 4, 5, PAL.ink);
        rect(ctx, x - 1 + (thin ? 2 : 0), y + 1, thin ? 2 : 6, 3, PAL.ink);
        rect(ctx, x + (thin ? 1 : 0), y + 1, thin ? 2 : 4, 3, PAL.coin);
        if (!thin) {
          rect(ctx, x + 1, y + 1, 2, 3, PAL.glowLight);
          px(ctx, x + 3, y + 3, PAL.coinDark);
        }
      }
      for (const p of pops) {
        const d = 2 + Math.round(p.age * 12);
        const x = Math.round(p.x) - cam, y = WALK_Y - 6;
        for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) px(ctx, x + dx, y + dy, PAL.glowLight);
      }

      fireflies.forEach((f, i) => {
        if (i >= Math.round(fireflies.length * Math.min(1, night * 1.4))) return;
        const t = time * f.speed + f.phase;
        const x = Math.round(f.x + Math.sin(t) * 10 + Math.sin(t * 2.3) * 4) - cam;
        const y = Math.round(f.y + Math.cos(t * 1.4) * 5);
        const bright = Math.sin(t * 2.2);
        if (bright < -0.2) return;
        if (bright > 0.5) {
          ctx.globalAlpha = 0.35;
          rect(ctx, x - 1, y, 3, 1, PAL.glow);
          rect(ctx, x, y - 1, 1, 3, PAL.glow);
          ctx.globalAlpha = 1;
        }
        px(ctx, x, y, PAL.firefly);
      });
    },

    // Wird nach der Spielfigur gezeichnet, liegt also vor ihr.
    drawFront(ctx, camX, time) {
      const cam = Math.round(camX);
      ctx.drawImage(foreground, -Math.round(camX * FRONT_FACTOR), 0);
      drawWeather(ctx, theme.weather, time);
    },
  };
}
