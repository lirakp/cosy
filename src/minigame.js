import { VIEW_W, VIEW_H } from './config.js';
import { rect, px, circle } from './utils.js';
import { rollItem } from './items.js';
import { state } from './state.js';
import * as village from './village.js';
import * as companions from './companions.js';
import * as realm from './realm.js';

// Minispiele der Dörfer in den Dimensionen (im Heimatdorf wird geangelt):
//   Hölle  – Höllenschmiede am Lavasee: im richtigen Moment zuschlagen
//   Himmel – Sternenfang: fallende Sterne mit dem Wolkenkorb auffangen
// Punkte werden zu Glutsteinen bzw. Sternensplittern, dazu Gold und mit
// gutem Ergebnis ein Sammelstück der Dimension.

export const FORGE = {
  strikes: 8,
  bar: 200, // Breite der Leiste
  good: 30, // Breite der „gut“-Zone
  perfect: 8, // Breite der „perfekt“-Zone
  speed: [110, 260], // Geschwindigkeit des Zeigers (erster … letzter Schlag)
  points: { perfekt: 3, gut: 1, daneben: 0 },
};
export const STARS = {
  seconds: 25,
  every: 0.42, // neuer Stern alle … Sekunden
  golden: 0.08, // goldener Stern: +5
  storm: 0.1, // Blitz: −3 und kurz betäubt
  basket: 150, // Korb-Geschwindigkeit (Pixel/s)
};
export const GOLD_PER_POINT = 15;
// Sammelstück ab so vielen Punkten (Rang B+), ab dem zweiten Wert Rang A+
export const ITEM_AT = { hoelle: [18, 24], himmel: [30, 50] };

// Belohnung für ein Ergebnis (ohne Gold-Faktor der Dimension)
export function reward(type, points, r = Math.random) {
  const boost = 1 + companions.bonus('minigame');
  const shards = Math.round(points * boost);
  const gold = Math.round(points * GOLD_PER_POINT * boost);
  const [b, a] = ITEM_AT[type];
  const minTier = points >= a ? 3 : points >= b ? 2 : null;
  const item = minTier === null ? null : rollItem({ minTier, world: type, random: r });
  return { type, points, shards, gold, item };
}

export function applyReward(res) {
  village.addShards(res.type, res.shards);
  if (res.gold) state.addGold(res.gold * realm.goldFactor(), 'minispiel');
  if (res.item) {
    res.isNew = !state.count(res.item.id);
    state.addItems([res.item], 'minispiel');
  }
  const best = state.village.best || {};
  res.record = res.points > (best[res.type] || 0);
  state.village.best = { ...best, [res.type]: Math.max(best[res.type] || 0, res.points) };
  state.changed();
  return res;
}

export function createMinigame({ onEnd, onSfx } = {}) {
  let g = null; // laufendes Spiel

  function finish() {
    const res = applyReward(reward(g.type, Math.max(0, g.points)));
    g = null;
    onEnd?.(res);
  }

  // ------------------------------------------------------------ Schmiede
  function forgeStart() {
    return { type: 'hoelle', points: 0, strike: 0, pos: 0, dir: 1, zone: newZone(), flash: null, flashT: 0, sparks: [], done: 0 };
  }
  function newZone() {
    return 30 + Math.random() * (FORGE.bar - 60);
  }
  function forgePress() {
    if (g.done) return;
    const d = Math.abs(g.pos - g.zone);
    const hit = d <= FORGE.perfect / 2 ? 'perfekt' : d <= FORGE.good / 2 ? 'gut' : 'daneben';
    g.points += FORGE.points[hit];
    g.flash = hit;
    g.flashT = 0.6;
    onSfx?.(hit === 'daneben' ? 'error' : hit === 'perfekt' ? 'levelUp' : 'coin');
    const n = hit === 'perfekt' ? 18 : hit === 'gut' ? 8 : 2;
    for (let i = 0; i < n; i++) g.sparks.push({ x: 160, y: 112, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 90, t: 0 });
    g.strike++;
    g.zone = newZone();
    if (g.strike >= FORGE.strikes) g.done = 1.1;
  }
  function forgeUpdate(dt) {
    const speed = FORGE.speed[0] + (FORGE.speed[1] - FORGE.speed[0]) * (g.strike / (FORGE.strikes - 1));
    g.pos += g.dir * speed * dt;
    if (g.pos > FORGE.bar) (g.pos = FORGE.bar), (g.dir = -1);
    if (g.pos < 0) (g.pos = 0), (g.dir = 1);
    g.flashT = Math.max(0, g.flashT - dt);
    for (const s of g.sparks) {
      s.t += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 160 * dt;
    }
    g.sparks = g.sparks.filter((s) => s.t < 1);
    if (g.done) {
      g.done -= dt;
      if (g.done <= 0) finish();
    }
  }
  function forgeDraw(ctx, time) {
    // Höhle mit Lavasee
    for (let y = 0; y < VIEW_H; y++) rect(ctx, 0, y, VIEW_W, 1, y < 120 ? `rgb(${30 + y / 3} 10 ${14 + y / 10})` : '#1a0c0e');
    for (let y = 140; y < VIEW_H; y++) {
      for (let x = 0; x < VIEW_W; x += 2) {
        const w = Math.sin(x / 9 + time * 2 + y / 3);
        rect(ctx, x, y, 2, 1, w > 0.4 ? '#ffb03a' : w > -0.3 ? '#ff6a2a' : '#c0301c');
      }
    }
    // Amboss und glühendes Eisen
    rect(ctx, 130, 118, 60, 8, '#3a3438');
    rect(ctx, 122, 114, 76, 5, '#4a444a');
    rect(ctx, 150, 126, 20, 14, '#2a2428');
    rect(ctx, 140, 108, 40, 6, g.flashT > 0 && g.flash !== 'daneben' ? '#fff1b8' : '#ff8a3a');
    rect(ctx, 140, 108, 40, 1, '#ffd04a');
    // Hammer
    const lift = g.flashT > 0.4 ? 0 : 14 + Math.sin(time * 6) * 2;
    rect(ctx, 176, 88 - lift, 4, 22, '#6a4a30');
    rect(ctx, 166, 82 - lift, 24, 9, '#5a5460');
    rect(ctx, 166, 82 - lift, 24, 2, '#8a8490');
    for (const s of g.sparks) {
      ctx.globalAlpha = Math.max(0, 1 - s.t);
      px(ctx, Math.round(s.x), Math.round(s.y), s.t < 0.3 ? '#fff1b8' : '#ffb03a');
    }
    ctx.globalAlpha = 1;
    // Leiste
    const x0 = (VIEW_W - FORGE.bar) / 2;
    rect(ctx, x0 - 2, 34, FORGE.bar + 4, 14, '#120408');
    rect(ctx, x0, 36, FORGE.bar, 10, '#3a1418');
    rect(ctx, Math.round(x0 + g.zone - FORGE.good / 2), 36, FORGE.good, 10, '#c0441c');
    rect(ctx, Math.round(x0 + g.zone - FORGE.perfect / 2), 36, FORGE.perfect, 10, '#ffd04a');
    rect(ctx, Math.round(x0 + g.pos) - 1, 31, 3, 20, '#ffffff');
    // Text
    text(ctx, `Schlag ${Math.min(g.strike + 1, FORGE.strikes)} / ${FORGE.strikes}`, 8, 12, '#ffd0a0');
    text(ctx, `Punkte ${g.points}`, VIEW_W - 8, 12, '#ffd04a', 'right');
    if (g.flashT > 0) text(ctx, g.flash.toUpperCase() + (g.flash === 'perfekt' ? '!' : ''), VIEW_W / 2, 70, g.flash === 'perfekt' ? '#ffd04a' : g.flash === 'gut' ? '#ffb070' : '#a89098', 'center');
    else if (!g.strike) text(ctx, 'E im gelben Feld drücken!', VIEW_W / 2, 70, '#ffd0a0', 'center');
  }

  // ------------------------------------------------------------ Sternenfang
  function starsStart() {
    return { type: 'himmel', points: 0, t: 0, spawn: 0.3, x: VIEW_W / 2, stars: [], stun: 0, pops: [] };
  }
  function starsUpdate(dt, axis) {
    g.t += dt;
    if (g.stun > 0) g.stun -= dt;
    else g.x = Math.max(16, Math.min(VIEW_W - 16, g.x + axis * STARS.basket * dt));
    g.spawn -= dt;
    if (g.spawn <= 0 && g.t < STARS.seconds) {
      g.spawn = STARS.every * (0.7 + Math.random() * 0.6);
      const u = Math.random();
      const kind = u < STARS.storm ? 'blitz' : u < STARS.storm + STARS.golden ? 'gold' : 'stern';
      g.stars.push({ x: 12 + Math.random() * (VIEW_W - 24), y: -6, vy: 40 + Math.random() * 35 + g.t * 1.2, kind });
    }
    for (const s of g.stars) s.y += s.vy * dt;
    for (const s of g.stars) {
      if (!s.gone && s.y > 146 && s.y < 160 && Math.abs(s.x - g.x) < 15) {
        s.gone = true;
        const p = s.kind === 'gold' ? 5 : s.kind === 'blitz' ? -3 : 1;
        g.points += p;
        if (s.kind === 'blitz') g.stun = 1;
        g.pops.push({ x: s.x, y: 140, p, t: 0 });
        onSfx?.(s.kind === 'blitz' ? 'error' : s.kind === 'gold' ? 'levelUp' : 'coin');
      }
    }
    g.stars = g.stars.filter((s) => !s.gone && s.y < VIEW_H + 8);
    for (const p of g.pops) p.t += dt;
    g.pops = g.pops.filter((p) => p.t < 0.8);
    if (g.t >= STARS.seconds && !g.stars.length) finish();
  }
  function starsDraw(ctx, time) {
    const top = ['#7ab8f8', '#98cafa', '#b6dafc', '#d0e8fe', '#e8f4ff', '#fffbe6'];
    for (let y = 0; y < VIEW_H; y++) rect(ctx, 0, y, VIEW_W, 1, top[Math.min(5, Math.floor(y / 30))]);
    // Wolken unten
    for (let x = -10; x < VIEW_W + 20; x += 22) circle(ctx, x + Math.round(Math.sin(time + x) * 2), 172, 14, '#ffffff');
    for (const s of g.stars) {
      const x = Math.round(s.x);
      const y = Math.round(s.y);
      if (s.kind === 'blitz') {
        rect(ctx, x - 6, y - 6, 12, 5, '#5a5a7a');
        circle(ctx, x - 3, y - 6, 3, '#5a5a7a');
        circle(ctx, x + 3, y - 7, 4, '#5a5a7a');
        for (const [dx, dy] of [[0, 0], [1, 1], [0, 2], [-1, 3], [0, 4], [1, 5]]) px(ctx, x + dx, y + dy, '#ffe070');
      } else {
        const c = s.kind === 'gold' ? '#ffd04a' : '#fffbe6';
        rect(ctx, x - 2, y, 5, 1, c);
        rect(ctx, x, y - 2, 1, 5, c);
        px(ctx, x, y, '#ffffff');
        if (s.kind === 'gold' && Math.floor(time * 8) % 2) {
          px(ctx, x - 3, y - 3, '#fff1b8');
          px(ctx, x + 3, y + 3, '#fff1b8');
        }
      }
    }
    // Wolkenkorb
    const bx = Math.round(g.x);
    const shake = g.stun > 0 ? Math.round(Math.sin(time * 40)) : 0;
    rect(ctx, bx - 14 + shake, 152, 28, 8, '#d8b860');
    rect(ctx, bx - 14 + shake, 152, 28, 2, '#f0d890');
    for (let i = 0; i < 28; i += 4) rect(ctx, bx - 13 + i + shake, 154, 1, 6, '#b89840');
    circle(ctx, bx - 12 + shake, 150, 4, '#ffffff');
    circle(ctx, bx + 12 + shake, 150, 4, '#ffffff');
    for (const p of g.pops) text(ctx, `${p.p > 0 ? '+' : ''}${p.p}`, Math.round(p.x), Math.round(p.y - p.t * 20), p.p > 0 ? '#c09030' : '#5a5a7a', 'center');
    text(ctx, `Zeit ${Math.max(0, Math.ceil(STARS.seconds - g.t))} s`, 8, 12, '#3a4a8a');
    text(ctx, `Punkte ${g.points}`, VIEW_W - 8, 12, '#c09030', 'right');
    if (g.t < 2.5) text(ctx, '← → bewegen · Sterne fangen, Blitzen ausweichen', VIEW_W / 2, 30, '#3a4a8a', 'center');
  }

  return {
    active: () => !!g,
    type: () => g?.type || null,
    start(type) {
      if (g) return false;
      g = type === 'hoelle' ? forgeStart() : starsStart();
      return true;
    },
    press() {
      if (g?.type === 'hoelle') forgePress();
    },
    cancel() {
      g = null;
    },
    update(dt, axis = 0) {
      if (!g) return;
      if (g.type === 'hoelle') forgeUpdate(dt);
      else starsUpdate(dt, axis);
    },
    draw(ctx, time) {
      if (!g) return;
      if (g.type === 'hoelle') forgeDraw(ctx, time);
      else starsDraw(ctx, time);
    },
  };
}

// kleine Pixel-Schrift über das Canvas (System-Schrift, scharf genug in 320×180)
function text(ctx, s, x, y, color, align = 'left') {
  ctx.font = '8px monospace';
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(20, 10, 30, 0.55)';
  ctx.fillText(s, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
  ctx.textAlign = 'left';
}
