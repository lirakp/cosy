import { VIEW_W, VIEW_H, WORLD_W, GROUND_Y, WALK_Y, WELL_X, CAMP_X, CHEST_X, DUNGEON_X } from './config.js';
import * as dungeon from './dungeon.js';
import * as buildings from './buildings.js';
import { itemImage } from './items.js';
import * as expedition from './expedition.js';
import { state, COIN_VALUE } from './state.js';
import { PAL } from './palette.js';
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
  for (const x of [22, 134, 482, 612]) drawTree(ctx, x, r);
  for (const x of [300, 634]) drawBush(ctx, x, r);
  drawFence(ctx, COTTAGE_X + 58, COTTAGE_X + 58 + 84);
  drawCottage(ctx, COTTAGE_X);
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

// Eine Anlage als eigenes Bild, damit sie je nach Baustand ein- oder ausgeblendet werden kann.
function prop(draw) {
  const [c, ctx] = makeCanvas(48, VIEW_H);
  draw(ctx, 24);
  return c;
}

export function createWorld() {
  const ground = makeGround();
  const tent = prop(drawTent);
  const gate = prop(drawDungeonGate);
  const site = prop(drawSite);
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
    ctx.drawImage(buildings.owned('camp') ? tent : site, CAMP_X - 30 - 24 - cam, 0);
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

  return {
    update(dt, player) {
      updateTeam(dt);
      coinTimer -= dt;
      if (coinTimer <= 0) {
        coinTimer = 2.5 + r() * 2;
        const x = 16 + r() * (WORLD_W - 32);
        if (coins.length < 7 && Math.abs(x - player.x) > 40) coins.push({ x, age: 0 });
      }
      for (let i = coins.length - 1; i >= 0; i--) {
        coins[i].age += dt;
        if (Math.abs(coins[i].x - player.x) < 8) {
          pops.push({ x: coins[i].x, age: 0 });
          coins.splice(i, 1);
          state.addGold(COIN_VALUE);
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

      const flicker = Math.sin(time * 9) > 0.4 ? 1 : 0;
      glow(ctx, COTTAGE_X + 33 - cam, GROUND_Y - 9, 15 + flicker, 0.3);
      glow(ctx, LANTERN_X - 4 - cam, GROUND_Y - 13, 12 + flicker, 0.35);

      glow(ctx, WELL_X - cam, GROUND_Y - 8, 13 + flicker, 0.3, PAL.magic);
      for (let i = 0; i < 4; i++) {
        const t = (time * 0.35 + i / 4) % 1;
        if (t > 0.85) continue;
        px(ctx, WELL_X - cam + Math.round(Math.sin(time * 1.3 + i * 2.1) * 6), GROUND_Y - 8 - Math.round(t * 22), i % 2 ? PAL.magic : PAL.glowLight);
      }

      drawTeam(ctx, cam, time);

      // Dungeon-Eingang: Fackeln, Schimmern während einer Erkundung, Ausrufezeichen bei Rückkehr
      const gx = DUNGEON_X - cam;
      const gy = GROUND_Y + 4;
      const hasGate = buildings.owned('dungeon');
      ctx.drawImage(hasGate ? gate : site, gx - 24, 0);
      for (const tx of hasGate ? [gx - 13, gx + 12] : []) {
        const tall = Math.floor(time * 8 + tx) % 3;
        rect(ctx, tx - 1, gy - 17, 3, 3, PAL.roofLight);
        rect(ctx, tx, gy - 18 - (tall ? 1 : 0), 1, 3 + (tall ? 1 : 0), PAL.glow);
        px(ctx, tx, gy - 16, PAL.glowLight);
      }
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

      for (const s of smoke) {
        const life = s.age / 5;
        ctx.globalAlpha = 0.75 * (1 - life);
        circle(ctx, Math.round(s.x) - cam, Math.round(s.y), life < 0.15 ? 1 : life < 0.6 ? 2 : 3, PAL.smoke);
      }
      ctx.globalAlpha = 1;
    },

    // Wird nach der Spielfigur gezeichnet, liegt also vor ihr.
    drawFront(ctx, camX, time) {
      const cam = Math.round(camX);
      for (const f of fireflies) {
        const t = time * f.speed + f.phase;
        const x = Math.round(f.x + Math.sin(t) * 10 + Math.sin(t * 2.3) * 4) - cam;
        const y = Math.round(f.y + Math.cos(t * 1.4) * 5);
        const bright = Math.sin(t * 2.2);
        if (bright < -0.2) continue;
        if (bright > 0.5) {
          ctx.globalAlpha = 0.35;
          rect(ctx, x - 1, y, 3, 1, PAL.glow);
          rect(ctx, x, y - 1, 1, 3, PAL.glow);
          ctx.globalAlpha = 1;
        }
        px(ctx, x, y, PAL.firefly);
      }
      ctx.drawImage(foreground, -Math.round(camX * FRONT_FACTOR), 0);
    },
  };
}
