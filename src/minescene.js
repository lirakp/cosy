import { VIEW_W, VIEW_H, WALK_Y } from './config.js';
import { PAL } from './palette.js';
import { rng, makeCanvas, rect, px, circle, dither } from './utils.js';
import { RARITIES, itemImage } from './items.js';
import * as mine from './mine.js';
import { ORE_COLORS } from './art/ores.js';

// Eine Ebene der Mine von innen: Felswand, Erzadern, Stützbalken, Laternen,
// links der Aufzug. Die Monster hacken an Erzbrocken.

const FLOOR = 141;
export const MINE_BOUNDS = [26, 304];
export const LIFT_SPAWN = 44;
export const SLOT_X = [118, 182, 246];
export const zoneAt = (x) => (x < 66 ? 'lift' : null);

// Gestein je Ebene: Grundfarbe, helle Kante, dunkle Fugen
const ROCK = [
  ['#6a4a3a', '#8a6248', '#4a3228'],
  ['#4a4a58', '#64646f', '#33333f'],
  ['#3a4664', '#52608a', '#283048'],
  ['#4a3a30', '#66503e', '#30241c'],
  ['#3a2c5a', '#54407a', '#261c40'],
  ['#1e1a34', '#2e2850', '#120f22'],
];
const hsl = ([h, s, l], dl = 0) => `hsl(${h} ${s}% ${Math.max(5, Math.min(95, l + dl))}%)`;

function makeLevel(level) {
  const [c, ctx] = makeCanvas(VIEW_W, VIEW_H);
  const [base, light, dark] = ROCK[level];
  const r = rng(300 + level);
  const oreLight = hsl(ORE_COLORS[level], 12);
  const oreBase = hsl(ORE_COLORS[level]);

  // Felswand aus unregelmäßigen Brocken
  rect(ctx, 0, 0, VIEW_W, FLOOR, base);
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(r() * VIEW_W);
    const y = Math.floor(r() * FLOOR);
    const w = 6 + Math.floor(r() * 14);
    const h = 4 + Math.floor(r() * 8);
    rect(ctx, x, y, w, 1, light);
    rect(ctx, x, y + h, w, 1, dark);
    rect(ctx, x + w, y, 1, h + 1, dark);
  }
  // nach oben dunkler
  for (let y = 0; y < 60; y++) {
    for (let x = 0; x < VIEW_W; x++) if (dither(x, y, (60 - y) / 70)) px(ctx, x, y, dark);
  }
  // Erzadern
  for (let v = 0; v < 9; v++) {
    let x = 70 + Math.floor(r() * 240);
    let y = 20 + Math.floor(r() * 90);
    for (let s = 0; s < 14; s++) {
      px(ctx, x, y, oreBase);
      if (s % 3 === 0) px(ctx, x, y - 1, oreLight);
      x += Math.round(r() * 2 - 0.6);
      y += Math.round(r() * 2 - 1);
    }
  }

  // Boden mit Schienen
  rect(ctx, 0, FLOOR, VIEW_W, VIEW_H - FLOOR, dark);
  rect(ctx, 0, FLOOR, VIEW_W, 1, light);
  for (let i = 0; i < 120; i++) px(ctx, Math.floor(r() * VIEW_W), FLOOR + 2 + Math.floor(r() * 36), base);
  for (let x = 4; x < VIEW_W; x += 9) rect(ctx, x, 165, 5, 3, PAL.woodDark);
  rect(ctx, 0, 164, VIEW_W, 1, PAL.stoneLight);
  rect(ctx, 0, 168, VIEW_W, 1, PAL.stoneLight);

  // Stützbalken
  for (const x of [84, 150, 214, 280]) {
    rect(ctx, x, 14, 6, FLOOR - 14, PAL.woodDark);
    rect(ctx, x + 1, 14, 2, FLOOR - 14, PAL.wood);
  }
  rect(ctx, 70, 10, VIEW_W - 70, 6, PAL.woodDark);
  rect(ctx, 70, 11, VIEW_W - 70, 2, PAL.wood);

  // Aufzugsschacht links
  rect(ctx, 6, 0, 56, FLOOR, '#120f22');
  for (let y = 0; y < FLOOR; y += 10) rect(ctx, 6, y, 56, 1, '#1e1a34');
  rect(ctx, 6, 0, 3, FLOOR, PAL.woodDark);
  rect(ctx, 59, 0, 3, FLOOR, PAL.woodDark);
  rect(ctx, 33, 0, 1, 92, PAL.stone);
  // Förderkorb
  rect(ctx, 14, 92, 40, 3, PAL.stone);
  rect(ctx, 14, FLOOR - 2, 40, 2, PAL.stone);
  for (let x = 14; x <= 52; x += 6) rect(ctx, x, 95, 1, FLOOR - 97, PAL.stoneLight);
  rect(ctx, 30, 86, 7, 6, PAL.stone);

  // Schild mit Rang der Ebene
  rect(ctx, 66, 30, 14, 12, PAL.woodDark);
  rect(ctx, 67, 31, 12, 10, PAL.woodLight);

  // Lore mit Erz
  rect(ctx, 286, 148, 26, 12, PAL.stone);
  rect(ctx, 286, 148, 26, 2, PAL.stoneLight);
  rect(ctx, 288, 150, 22, 8, '#5a4a5a');
  for (let i = 0; i < 9; i++) circle(ctx, 290 + i * 2.5, 147 - (i % 3), 2, i % 2 ? oreBase : oreLight);
  for (const x of [290, 306]) {
    circle(ctx, x, 161, 2, PAL.ink);
    px(ctx, x, 161, PAL.stoneLight);
  }

  // Erzbrocken an den Arbeitsplätzen
  for (const sx of SLOT_X) {
    const bx = sx + 17;
    const by = WALK_Y - 6;
    rect(ctx, bx - 10, WALK_Y, 21, 2, '#120f22');
    circle(ctx, bx, by, 7, dark);
    circle(ctx, bx - 1, by - 1, 6, base);
    for (const [dx, dy] of [[-3, -4], [2, -1], [-1, 2], [3, -5], [-4, 0]]) {
      px(ctx, bx + dx, by + dy, oreBase);
      px(ctx, bx + dx + 1, by + dy, oreLight);
    }
  }
  return c;
}

function glow(ctx, cx, cy, radius, alpha, color) {
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

// Spitzhacke: erhoben (Ausholen) oder unten (Schlag)
function pickaxe(ctx, x, y, down) {
  if (down) {
    rect(ctx, x + 8, y + 6, 1, 1, PAL.woodDark);
    for (let i = 0; i < 7; i++) px(ctx, x + 8 + i, y + 6 + Math.floor(i / 2), PAL.wood);
    rect(ctx, x + 13, y + 6, 2, 6, PAL.stoneLight);
    px(ctx, x + 15, y + 12, PAL.stone);
  } else {
    for (let i = 0; i < 7; i++) px(ctx, x + 9 + Math.floor(i / 2), y + 6 - i, PAL.wood);
    rect(ctx, x + 9, y - 2, 7, 2, PAL.stoneLight);
    px(ctx, x + 16, y - 1, PAL.stone);
    px(ctx, x + 8, y - 1, PAL.stone);
  }
}

export function createMineScene({ onStrike } = {}) {
  const levels = Array.from({ length: 6 }, (_, l) => makeLevel(l));
  const chips = [];
  const pops = [];
  const lastPhase = [0, 0, 0];

  return {
    update(dt, level, time) {
      const workers = mine.workers(level);
      workers.forEach((w, i) => {
        if (!w) return;
        const period = 1.5 / mine.SPEED[mine.levelOf(w.id)];
        const phase = ((time / period) + i * 0.37) % 1;
        // Moment des Schlags: Funken und Gesteinssplitter
        if (phase >= 0.62 && lastPhase[i] < 0.62) {
          const bx = SLOT_X[i] + 11;
          for (let k = 0; k < 5; k++) {
            chips.push({ x: bx, y: WALK_Y - 9, vx: 10 + Math.random() * 30, vy: -20 - Math.random() * 30, age: 0, spark: k < 2, tier: level });
          }
          onStrike?.(i);
        }
        lastPhase[i] = phase;
      });
      for (const c of chips) {
        c.age += dt;
        c.vy += 120 * dt;
        c.x += c.vx * dt;
        c.y = Math.min(WALK_Y + 1, c.y + c.vy * dt);
      }
      while (chips.length && chips[0].age > 0.7) chips.shift();
      for (const p of pops) p.age += dt;
      while (pops.length && pops[0].age > 1.2) pops.shift();
    },

    // neues Erz auf dieser Ebene: kleines Erz-Symbol steigt über einem Arbeiter auf
    addPop(level, amount) {
      const busy = mine.workers(level).map((w, i) => (w ? i : -1)).filter((i) => i >= 0);
      if (!busy.length) return;
      for (let n = 0; n < Math.min(amount, 3); n++) {
        const i = busy[Math.floor(Math.random() * busy.length)];
        pops.push({ x: SLOT_X[i] + 14 + n * 5, age: -n * 0.15 });
      }
    },

    draw(ctx, level, time) {
      ctx.drawImage(levels[level], 0, 0);
      // Rang der Ebene auf dem Schild
      ctx.fillStyle = PAL.ink;
      const rank = RARITIES[level].id;
      drawRank(ctx, rank, 68, 33);

      mine.workers(level).forEach((w, i) => {
        const x = SLOT_X[i] - 8;
        const y = WALK_Y - 15;
        if (!w) {
          // leerer Platz: Spitzhacke lehnt am Brocken
          for (let k = 0; k < 8; k++) px(ctx, SLOT_X[i] + 6 + Math.floor(k / 3), WALK_Y - k, PAL.wood);
          rect(ctx, SLOT_X[i] + 6, WALK_Y - 9, 6, 2, PAL.stoneLight);
          return;
        }
        const period = 1.5 / mine.SPEED[mine.levelOf(w.id)];
        const phase = ((time / period) + i * 0.37) % 1;
        const down = phase >= 0.62;
        const bob = down ? 1 : 0;
        ctx.drawImage(itemImage(w), x, y + bob);
        pickaxe(ctx, x, y + bob, down);
      });

      for (const c of chips) {
        if (c.spark) px(ctx, Math.round(c.x), Math.round(c.y), PAL.glowLight);
        else rect(ctx, Math.round(c.x), Math.round(c.y), 2, 2, hsl(ORE_COLORS[c.tier], -10));
      }
    },

    drawLights(ctx, level, time) {
      const flicker = Math.sin(time * 10) > 0.4 ? 1 : 0;
      for (const x of [117, 247]) {
        rect(ctx, x, 16, 1, 8, PAL.ink);
        rect(ctx, x - 2, 24, 5, 6, PAL.ink);
        rect(ctx, x - 1, 25, 3, 4, PAL.glow);
        glow(ctx, x, 28, 26 + flicker, 0.22, PAL.glow);
      }
      glow(ctx, 34, 120, 18, 0.12, PAL.magic);
      for (const c of chips) if (c.spark) px(ctx, Math.round(c.x), Math.round(c.y), PAL.glowLight);
      for (const p of pops) {
        if (p.age < 0) continue;
        const y = WALK_Y - 28 - Math.round(p.age * 18);
        ctx.globalAlpha = Math.max(0, 1 - p.age / 1.2);
        ctx.drawImage(mine.oreImage(level), Math.round(p.x) - 4, y, 8, 8);
        ctx.globalAlpha = 1;
      }
    },
  };
}

// winzige Pixelbuchstaben für das Rangschild (D, C, B, A, S)
const GLYPHS = {
  D: ['110', '101', '101', '101', '110'],
  C: ['011', '100', '100', '100', '011'],
  B: ['110', '101', '110', '101', '110'],
  A: ['010', '101', '111', '101', '101'],
  S: ['011', '100', '010', '001', '110'],
};
function drawRank(ctx, rank, x, y) {
  const letters = rank.split('');
  const start = x + Math.round((10 - letters.length * 4) / 2);
  letters.forEach((ch, n) => {
    GLYPHS[ch].forEach((row, j) => [...row].forEach((b, i) => b === '1' && ctx.fillRect(start + n * 4 + i, y + j, 1, 1)));
  });
}
