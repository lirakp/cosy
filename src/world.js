import { VIEW_W, VIEW_H, WORLD_W, GROUND_Y, WALK_Y, WELL_X } from './config.js';
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

function makeGround() {
  const [c, ctx] = makeCanvas(WORLD_W, VIEW_H);
  const r = rng(42);
  drawGround(ctx, r);
  for (const x of [34, 118, 482, 572]) drawTree(ctx, x, r);
  for (const x of [80, 300, 520, 620]) drawBush(ctx, x, r);
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

export function createWorld() {
  const ground = makeGround();
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

  return {
    update(dt, player) {
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
