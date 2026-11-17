import { VIEW_W, VIEW_H, WALK_Y } from './config.js';
import { PAL } from './palette.js';
import { makeCanvas, rect, px, circle, dither } from './utils.js';
import { ITEMS, itemImage } from './items.js';
import { state } from './state.js';

// Das Innere des Häuschens: ein einziges Zimmer, so breit wie der Bildschirm.
// Durch das Fenster sieht man den echten Himmel draußen.

const FLOOR = 141; // Oberkante des Bodens
const WIN = { x: 62, y: 42, w: 40, h: 38 };
const FIRE_X = 160;
const CANDLE = { x: 83, y: 112 };

// begehbarer Bereich und die Stellen, an denen man etwas tun kann
export const ROOM_BOUNDS = [22, 300];
export const DOOR_SPAWN = 36;
export function zoneAt(x) {
  if (x < 48) return 'door';
  if (x >= 134 && x <= 186) return 'kitchen';
  if (x >= 198 && x <= 246) return 'wardrobe';
  if (x >= 252) return 'bed';
  return null;
}

const WOOD_WALL = '#9a6a48';
const WOOD_WALL_DARK = '#7a5038';
const PAPER = '#e8c9a0';
const PAPER_DOT = '#d8b488';
const FLOOR_A = '#a8784e';
const FLOOR_B = '#946642';
const QUILT = ['#c0504a', '#e8c070', '#4f8f8a', '#f2a0b0'];

function drawWalls(ctx) {
  // Tapete mit kleinem Muster
  rect(ctx, 0, 0, VIEW_W, FLOOR, PAPER);
  for (let y = 12; y < 98; y += 6) {
    for (let x = (y / 6) % 2 ? 3 : 0; x < VIEW_W; x += 6) px(ctx, x, y, PAPER_DOT);
  }
  // Holzvertäfelung unten
  rect(ctx, 0, 98, VIEW_W, FLOOR - 98, WOOD_WALL);
  rect(ctx, 0, 98, VIEW_W, 2, PAL.woodLight);
  for (let x = 6; x < VIEW_W; x += 12) rect(ctx, x, 101, 1, FLOOR - 101, WOOD_WALL_DARK);
  rect(ctx, 0, FLOOR - 3, VIEW_W, 3, PAL.woodDark);
  // Deckenbalken und Pfosten
  rect(ctx, 0, 0, VIEW_W, 9, PAL.woodDark);
  rect(ctx, 0, 9, VIEW_W, 1, PAL.ink);
  for (const x of [0, 316]) rect(ctx, x, 0, 4, FLOOR, PAL.woodDark);
  for (let x = 40; x < VIEW_W; x += 80) {
    rect(ctx, x, 0, 6, 12, PAL.wood);
    rect(ctx, x, 12, 6, 1, PAL.ink);
  }
}

function drawFloor(ctx) {
  for (let y = FLOOR; y < VIEW_H; y++) {
    const row = Math.floor((y - FLOOR) / 6);
    rect(ctx, 0, y, VIEW_W, 1, row % 2 ? FLOOR_B : FLOOR_A);
  }
  for (let row = 0; row * 6 + FLOOR < VIEW_H; row++) {
    const y = FLOOR + row * 6;
    rect(ctx, 0, y, VIEW_W, 1, PAL.woodDark);
    for (let x = (row * 37) % 50; x < VIEW_W; x += 50) rect(ctx, x, y, 1, 6, PAL.woodDark);
  }
  // nach vorne etwas dunkler
  for (let y = 166; y < VIEW_H; y++) {
    for (let x = 0; x < VIEW_W; x++) if (dither(x, y, (y - 166) / 20)) px(ctx, x, y, PAL.woodDark);
  }
}

function drawRug(ctx) {
  const x0 = 104, x1 = 216, y0 = 150, y1 = 168;
  rect(ctx, x0, y0, x1 - x0, y1 - y0, '#8a3c44');
  rect(ctx, x0 + 3, y0 + 2, x1 - x0 - 6, y1 - y0 - 4, '#b0504a');
  rect(ctx, x0 + 6, y0 + 4, x1 - x0 - 12, y1 - y0 - 8, '#8a3c44');
  for (let x = x0 + 10; x < x1 - 10; x += 8) {
    px(ctx, x, y0 + 8, PAL.coin);
    px(ctx, x + 4, y0 + 10, PAL.coin);
  }
  for (let x = x0; x < x1; x += 3) {
    px(ctx, x, y0 - 1, '#e8c070');
    px(ctx, x + 1, y1, '#e8c070');
  }
}

function drawDoor(ctx) {
  const x = 12, y = 92, w = 26, h = FLOOR - y;
  rect(ctx, x - 3, y - 3, w + 6, h + 3, PAL.woodDark);
  rect(ctx, x, y, w, h, PAL.wood);
  for (let i = 1; i < 4; i++) rect(ctx, x + i * 6.5, y, 1, h, PAL.woodDark);
  rect(ctx, x, y + 10, w, 2, PAL.woodDark);
  rect(ctx, x, y + h - 14, w, 2, PAL.woodDark);
  rect(ctx, x + w - 6, y + 26, 3, 3, PAL.coin);
  px(ctx, x + w - 6, y + 26, PAL.glowLight);
  // Fußmatte
  rect(ctx, x - 2, 148, w + 4, 4, '#6a8a4a');
  for (let i = 0; i < w + 4; i += 2) px(ctx, x - 2 + i, 151, '#4f6f3a');
}

function drawWindow(ctx) {
  const { x, y, w, h } = WIN;
  rect(ctx, x - 4, y - 4, w + 8, h + 8, PAL.woodDark);
  ctx.clearRect(x, y, w, h); // hier scheint der Himmel durch
  rect(ctx, x + w / 2 - 1, y, 2, h, PAL.woodDark);
  rect(ctx, x, y + h / 2 - 1, w, 2, PAL.woodDark);
  rect(ctx, x - 6, y + h + 4, w + 12, 3, PAL.woodLight);
  // Vorhänge
  for (const [cx, dir] of [[x - 9, 1], [x + w + 3, -1]]) {
    for (let i = 0; i < h + 6; i++) {
      const wave = Math.round(Math.sin(i / 4) * 1);
      rect(ctx, cx + wave + (dir > 0 ? 0 : 0), y - 6 + i, 6, 1, i % 6 < 3 ? '#c0504a' : '#a8404a');
    }
  }
  rect(ctx, x - 12, y - 8, w + 24, 3, PAL.woodDark);
}

function drawTable(ctx) {
  rect(ctx, 66, 120, 34, 3, PAL.wood);
  rect(ctx, 66, 120, 34, 1, PAL.woodLight);
  rect(ctx, 69, 123, 3, FLOOR - 123, PAL.woodDark);
  rect(ctx, 94, 123, 3, FLOOR - 123, PAL.woodDark);
  // Kerze
  rect(ctx, CANDLE.x - 1, CANDLE.y, 3, 8, '#fdf6e3');
  rect(ctx, CANDLE.x - 3, CANDLE.y + 7, 7, 1, PAL.coinDark);
  // Teetasse und Buch
  rect(ctx, 70, 115, 6, 5, '#e8e0d0');
  rect(ctx, 76, 116, 2, 2, '#e8e0d0');
  rect(ctx, 88, 116, 9, 4, '#4a6ab0');
  rect(ctx, 88, 115, 9, 1, '#fdf6e3');
}

function drawFireplace(ctx) {
  const x0 = FIRE_X - 24, x1 = FIRE_X + 24, top = 90;
  rect(ctx, x0, top, x1 - x0, FLOOR - top, PAL.stone);
  for (let y = top + 2; y < FLOOR; y += 5) {
    for (let x = x0 + ((y / 5) % 2 ? 3 : 0); x < x1; x += 7) {
      rect(ctx, x, y, 6, 4, PAL.stoneLight);
      px(ctx, x + 5, y + 3, PAL.ink);
    }
  }
  rect(ctx, x0 - 5, top - 4, x1 - x0 + 10, 4, PAL.woodDark);
  rect(ctx, x0 - 5, top - 4, x1 - x0 + 10, 1, PAL.wood);
  // Feueröffnung
  rect(ctx, FIRE_X - 14, 110, 28, FLOOR - 110, PAL.ink);
  rect(ctx, FIRE_X - 12, 106, 24, 4, PAL.ink);
  // Holzscheite
  rect(ctx, FIRE_X - 10, FLOOR - 4, 20, 3, PAL.woodDark);
  rect(ctx, FIRE_X - 8, FLOOR - 6, 16, 2, PAL.wood);
}

function drawPicture(ctx) {
  const x = 112, y = 40;
  rect(ctx, x, y, 22, 18, PAL.coinDark);
  rect(ctx, x + 2, y + 2, 18, 14, '#8ac0e8');
  rect(ctx, x + 2, y + 10, 18, 6, '#4f8f55');
  circle(ctx, x + 15, y + 6, 2, '#fff1b8');
  rect(ctx, x + 5, y + 7, 4, 3, '#e8c9a0');
  rect(ctx, x + 4, y + 6, 6, 1, '#a8504a');
}

function drawWardrobe(ctx) {
  const x0 = 204, x1 = 242, top = 74;
  rect(ctx, x0 - 2, top - 4, x1 - x0 + 4, 4, PAL.woodDark);
  rect(ctx, x0, top, x1 - x0, FLOOR - top - 2, PAL.wood);
  rect(ctx, x0, top, x1 - x0, 1, PAL.woodLight);
  rect(ctx, x0, top, 1, FLOOR - top, PAL.woodDark);
  rect(ctx, x1 - 1, top, 1, FLOOR - top, PAL.woodDark);
  rect(ctx, (x0 + x1) / 2, top + 2, 1, FLOOR - top - 10, PAL.woodDark);
  for (const [dx, dy] of [[4, 6], [4, 34], [21, 6], [21, 34]]) {
    rect(ctx, x0 + dx, top + dy, 13, 24, PAL.woodDark);
    rect(ctx, x0 + dx + 1, top + dy + 1, 11, 22, '#9a6e48');
  }
  px(ctx, (x0 + x1) / 2 - 2, top + 32, PAL.coin);
  px(ctx, (x0 + x1) / 2 + 2, top + 32, PAL.coin);
  rect(ctx, x0, FLOOR - 6, x1 - x0, 4, PAL.woodDark);
  rect(ctx, x0 + 2, FLOOR - 2, 3, 2, PAL.woodDark);
  rect(ctx, x1 - 5, FLOOR - 2, 3, 2, PAL.woodDark);
  // Hut obenauf
  rect(ctx, x0 + 10, top - 9, 10, 5, PAL.coin);
  rect(ctx, x0 + 7, top - 5, 16, 1, PAL.woodDark);
}

function drawBed(ctx) {
  const x0 = 252, x1 = 308;
  // Kopfteil rechts
  rect(ctx, x1 - 6, 100, 6, FLOOR - 100, PAL.woodDark);
  rect(ctx, x1 - 5, 101, 4, 6, PAL.wood);
  circle(ctx, x1 - 3, 99, 3, PAL.woodDark);
  // Fußteil links
  rect(ctx, x0, 114, 4, FLOOR - 114, PAL.woodDark);
  // Matratze und Bettrahmen
  rect(ctx, x0 + 4, 128, x1 - x0 - 10, 8, PAL.wood);
  rect(ctx, x0 + 4, 128, x1 - x0 - 10, 1, PAL.woodLight);
  rect(ctx, x0 + 4, 122, x1 - x0 - 10, 6, '#fdf6e3');
  // Kissen
  rect(ctx, x1 - 20, 116, 13, 7, '#fdf6e3');
  rect(ctx, x1 - 20, 122, 13, 1, '#d8d0c0');
  // Flickendecke
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 2; j++) rect(ctx, x0 + 4 + i * 6, 118 + j * 6, 6, 6, QUILT[(i + j * 3) % QUILT.length]);
  }
  rect(ctx, x0 + 4, 130, 36, 2, '#8a3c44');
  rect(ctx, x0 + 3, FLOOR - 4, 3, 4, PAL.woodDark);
  rect(ctx, x1 - 8, FLOOR - 4, 3, 4, PAL.woodDark);
}

function drawPlant(ctx) {
  const x = 52;
  rect(ctx, x - 5, FLOOR - 10, 10, 10, '#b0604a');
  rect(ctx, x - 6, FLOOR - 11, 12, 2, '#c87a5a');
  for (const [dx, dy, r] of [[0, -16, 4], [-4, -13, 3], [4, -13, 3], [-2, -20, 3], [3, -19, 2]]) circle(ctx, x + dx, FLOOR + dy, r, PAL.leaf);
  for (const [dx, dy] of [[-1, -18], [3, -15], [-4, -14]]) px(ctx, x + dx, FLOOR + dy, PAL.leafLight);
}

function makeRoom() {
  const [c, ctx] = makeCanvas(VIEW_W, VIEW_H);
  drawWalls(ctx);
  drawFloor(ctx);
  drawRug(ctx);
  drawWindow(ctx);
  drawPicture(ctx);
  drawDoor(ctx);
  drawPlant(ctx);
  drawTable(ctx);
  drawFireplace(ctx);
  drawWardrobe(ctx);
  drawBed(ctx);
  return c;
}

// Gerasterter Lichtschein wie draußen
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

export function createInterior() {
  const room = makeRoom();
  let shelf = null;
  let shelfKey = '';

  // Die drei seltensten eigenen Sammelstücke stehen auf dem Kaminsims.
  function shelfItems() {
    const owned = ITEMS.filter((i) => state.count(i.id));
    const key = `${owned.length}:${state.pulls}`;
    if (key !== shelfKey) {
      shelfKey = key;
      shelf = owned.sort((a, b) => b.tier - a.tier || b.seed - a.seed).slice(0, 3);
    }
    return shelf;
  }

  return {
    // Raum ohne Lichter; der Fensterausschnitt bleibt durchsichtig für den Himmel.
    draw(ctx, time) {
      ctx.drawImage(room, 0, 0);
      shelfItems().forEach((item, i) => ctx.drawImage(itemImage(item), FIRE_X - 26 + i * 18, 70));

      // Kaminfeuer
      for (let i = 0; i < 7; i++) {
        const h = 6 + Math.round((Math.sin(time * 9 + i * 1.7) + 1) * 3) + (i % 3 === 1 ? 4 : 0);
        const x = FIRE_X - 9 + i * 3;
        rect(ctx, x, FLOOR - 5 - h, 3, h, PAL.roofLight);
        rect(ctx, x + 1, FLOOR - 5 - Math.round(h * 0.7), 1, Math.round(h * 0.7), PAL.glow);
      }
      rect(ctx, FIRE_X - 7, FLOOR - 7, 14, 2, PAL.glowLight);
      // Kochtopf über dem Feuer
      rect(ctx, FIRE_X, 106, 1, 6, PAL.stone);
      circle(ctx, FIRE_X, FLOOR - 21, 6, PAL.ink);
      circle(ctx, FIRE_X, FLOOR - 21, 5, '#3a3448');
      rect(ctx, FIRE_X - 6, FLOOR - 27, 13, 2, PAL.stone);
      rect(ctx, FIRE_X - 4, FLOOR - 26, 9, 1, '#c87a5a');
      for (let i = 0; i < 2; i++) {
        const t = (time * 0.8 + i * 0.5) % 1;
        px(ctx, FIRE_X - 2 + i * 4 + Math.round(Math.sin(time * 2 + i) * 1), FLOOR - 29 - Math.round(t * 8), PAL.smoke);
      }
      // Kerzenflamme
      const f = Math.floor(time * 7) % 3;
      rect(ctx, CANDLE.x, CANDLE.y - 3 - (f ? 1 : 0), 1, 3 + (f ? 1 : 0), PAL.glow);
      px(ctx, CANDLE.x, CANDLE.y - 1, PAL.glowLight);
    },

    // Lichter nach der Abdunklung: Feuer, Kerze und tagsüber Sonnenlicht durchs Fenster.
    drawLights(ctx, time, night) {
      const flicker = Math.sin(time * 11) > 0.3 ? 1 : 0;
      glow(ctx, FIRE_X, FLOOR - 12, 24 + flicker + Math.round(night * 10), 0.22 + 0.2 * night, PAL.glow);
      glow(ctx, CANDLE.x, CANDLE.y - 2, 9 + flicker + Math.round(night * 5), 0.2 + 0.25 * night);
      for (let i = 0; i < 7; i++) {
        const h = 6 + Math.round((Math.sin(time * 9 + i * 1.7) + 1) * 3) + (i % 3 === 1 ? 4 : 0);
        rect(ctx, FIRE_X - 8 + i * 3, FLOOR - 5 - Math.round(h * 0.7), 1, Math.round(h * 0.7), PAL.glow);
      }
      px(ctx, CANDLE.x, CANDLE.y - 2, PAL.glowLight);

      const sun = 1 - night;
      if (sun > 0.05) {
        // schräger Lichtstrahl vom Fenster auf den Boden
        ctx.fillStyle = PAL.glowLight;
        ctx.globalAlpha = 0.16 * sun;
        for (let y = WIN.y; y < FLOOR + 16; y++) {
          const shift = Math.round((y - WIN.y) * 0.7);
          for (let x = WIN.x + shift; x < WIN.x + WIN.w + shift; x++) {
            if (dither(x, y, 0.5)) ctx.fillRect(x, y, 1, 1);
          }
        }
        ctx.globalAlpha = 1;
      }
    },

    window: WIN,
    walkY: WALK_Y,
  };
}
