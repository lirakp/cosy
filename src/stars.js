import { VIEW_W } from './config.js';
import { rollItem } from './items.js';
import { state } from './state.js';
import * as magic from './magic.js';

// Sternschnuppen: nachts zieht ab und zu eine über den Himmel. Wer sie
// rechtzeitig anklickt, darf sich etwas wünschen.

export const SPAWN_SECONDS = [20, 60]; // Abstand zwischen zwei Sternschnuppen (Spielzeit, nur nachts)
export const LIFE = 1.8; // so lange ist eine zu sehen
export const ITEM_CHANCE = 0.05; // selten ein Sammelstück ab Rang C
export const MANA_CHANCE = 0.45; // mit Magierturm: Mana
export const MANA = 12;
export const GOLD = [40, 120];
const HIT = 14; // großzügige Trefferfläche in Spielpixeln

let star = null;
let wait = 8 + Math.random() * 10;
let showerLeft = 0; // Sternschnuppen aus einem Zauber, die noch kommen
export const SHOWER_GAP = 1.6; // Sekunden zwischen zwei Schnuppen beim Zauber

// Zauber: n Sternschnuppen kurz hintereinander (auch am Tag)
export function shower(n) {
  showerLeft += n;
  wait = Math.min(wait, 0.4);
}
export const showerPending = () => showerLeft;

// dt: vergangene Spielzeit; night: ist es Nacht; sky: ist der Himmel sichtbar?
export function update(dt, night, sky = night) {
  if (star) {
    star.t += dt;
    if (star.t > LIFE) star = null;
    return;
  }
  if (!sky || (!night && !showerLeft)) return;
  wait -= dt;
  if (wait > 0) return;
  if (showerLeft > 0) {
    showerLeft--;
    wait = showerLeft ? SHOWER_GAP : SPAWN_SECONDS[0] + Math.random() * (SPAWN_SECONDS[1] - SPAWN_SECONDS[0]);
  } else wait = SPAWN_SECONDS[0] + Math.random() * (SPAWN_SECONDS[1] - SPAWN_SECONDS[0]);
  const fromLeft = Math.random() < 0.5;
  star = {
    x: fromLeft ? 30 + Math.random() * 120 : VIEW_W - 30 - Math.random() * 120,
    y: 12 + Math.random() * 30,
    vx: (fromLeft ? 1 : -1) * (90 + Math.random() * 40),
    vy: 28 + Math.random() * 18,
    t: 0,
  };
}

export const current = () => star;
export const position = () => (star ? { x: star.x + star.vx * star.t, y: star.y + star.vy * star.t } : null);

// Würfelt den Wunsch aus und schreibt ihn gut
export function wish(r = Math.random) {
  const s = state.magic;
  s.stars = (s.stars || 0) + 1;
  if (r() < ITEM_CHANCE) {
    const item = rollItem({ minTier: 1, random: r });
    const isNew = !state.count(item.id);
    state.addItems([item], 'sternschnuppe');
    return { item, isNew };
  }
  if (magic.owned() && r() < MANA_CHANCE) {
    s.mana = Math.min(magic.maxMana(), s.mana + MANA);
    state.changed();
    return { mana: MANA };
  }
  const gold = GOLD[0] + Math.floor(r() * (GOLD[1] - GOLD[0] + 1));
  state.addGold(gold, 'sternschnuppe');
  return { gold };
}

// Klick in Spielkoordinaten; liefert den Wunsch oder null
export function tryCatch(x, y) {
  const p = position();
  if (!p || Math.hypot(x - p.x, y - p.y) > HIT) return null;
  star = null;
  return wish();
}

export function draw(ctx, time) {
  const p = position();
  if (!p) return;
  const fade = Math.min(1, (LIFE - star.t) / 0.4, star.t / 0.15);
  ctx.globalAlpha = Math.max(0, fade);
  // Schweif
  for (let i = 0; i < 18; i++) {
    const u = i / 18;
    ctx.fillStyle = i < 4 ? '#fffbe6' : i < 10 ? '#ffe9a8' : '#b8c8ff';
    ctx.globalAlpha = Math.max(0, fade * (1 - u));
    ctx.fillRect(Math.round(p.x - star.vx * 0.012 * i), Math.round(p.y - star.vy * 0.012 * i), 1, 1);
  }
  ctx.globalAlpha = Math.max(0, fade);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y), 3, 1);
  ctx.fillRect(Math.round(p.x), Math.round(p.y) - 1, 1, 3);
  if (Math.floor(time * 10) % 2) {
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(Math.round(p.x) - 2, Math.round(p.y), 1, 1);
    ctx.fillRect(Math.round(p.x) + 2, Math.round(p.y), 1, 1);
  }
  ctx.globalAlpha = 1;
}
