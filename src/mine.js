import { ITEMS, RARITIES } from './items.js';
import { state } from './state.js';
import * as buildings from './buildings.js';
import { dupValue, payWithDuplicates } from './dupes.js';
import { render } from './art/core.js';
import { oreDraw } from './art/ores.js';

// Mine: sechs Ebenen, jede liefert Erz ihres Rangs. Bis zu drei Monster pro
// Ebene hacken laufend Erz – auch, während das Spiel geschlossen ist.

export const LEVELS = [
  { name: 'Lehmstollen', ore: 'Kupfererz' },
  { name: 'Felsengang', ore: 'Eisenerz' },
  { name: 'Silberader', ore: 'Silbererz' },
  { name: 'Goldkammer', ore: 'Golderz' },
  { name: 'Kristallhöhle', ore: 'Mithrilerz' },
  { name: 'Sternengrund', ore: 'Sternenerz' },
];
export const SLOTS = 3;
const MAX_TIER = RARITIES.length - 1;

// Hiebe pro Minute nach Rang des Monsters (D … SS)
export const BASE_DIGS = [2, 2.5, 3.2, 4, 5, 6.5];
// Verbesserung (Stufe D … SS): schneller hacken und mehr Erz pro Hieb
export const SPEED = [1, 1.25, 1.55, 1.9, 2.3, 2.8];
export const YIELD = [1, 1, 2, 2, 3, 4];
export const LEVEL_COST = [30, 80, 200, 600, 2000];
// Je tiefer, desto seltener ist das Erz im Gestein
export const DEPTH = [1, 0.6, 0.4, 0.25, 0.15, 0.08];
// Höchstens so lange wird offline weitergehackt
export const MAX_OFFLINE_MINUTES = 480;

const MONSTERS = ITEMS.filter((i) => i.cat === 'monster');
const m = () => state.mine;

export const unlocked = (level) => level <= buildings.tier('mine');
export const depth = () => buildings.tier('mine');

// ---------------------------------------------------------------- Monster

const rawLevel = (id) => m().lvl[id] || 0;
export const levelOf = (id) => Math.max(0, Math.min(rawLevel(id), buildings.tier('mine')));
export const capped = (level) => level < MAX_TIER && level >= buildings.tier('mine');
export const digsPerMinute = (item, level = levelOf(item.id)) => BASE_DIGS[item.tier] * SPEED[level];
export const yieldOf = (item, level = levelOf(item.id)) => YIELD[level];
export const material = () => dupValue(MONSTERS);
export const levelCost = (item) => (rawLevel(item.id) < MAX_TIER && rawLevel(item.id) < buildings.tier('mine') ? LEVEL_COST[rawLevel(item.id)] : null);

export function levelUp(item) {
  const cost = levelCost(item);
  if (cost === null || !state.count(item.id) || !payWithDuplicates(MONSTERS, cost)) return false;
  tick();
  m().lvl[item.id] = rawLevel(item.id) + 1;
  state.changed();
  return true;
}

export const candidates = () =>
  MONSTERS.filter((i) => state.count(i.id)).sort((a, b) => digsPerMinute(b) * yieldOf(b) - digsPerMinute(a) * yieldOf(a) || b.tier - a.tier);

export const workers = (level) => m().slots[level].map((id) => (id && state.count(id) ? ITEMS.find((i) => i.id === id) : null));
export const assignedAt = (id) => m().slots.findIndex((row) => row.includes(id));

export function assign(level, slot, id) {
  if (!unlocked(level)) return;
  tick();
  if (id) for (const row of m().slots) for (let i = 0; i < row.length; i++) if (row[i] === id) row[i] = null;
  m().slots[level][slot] = id || null;
  state.changed();
}

// Füllt alle offenen Ebenen mit den besten Monstern, die tiefste zuerst.
export function autoAssign() {
  tick();
  const pool = candidates();
  for (let l = 0; l < m().slots.length; l++) m().slots[l] = [null, null, null];
  for (let l = depth(); l >= 0; l--) for (let s = 0; s < SLOTS; s++) m().slots[l][s] = pool.shift()?.id || null;
  state.changed();
}

// ---------------------------------------------------------------- Erz

export const workerRate = (item, level) => digsPerMinute(item) * yieldOf(item) * DEPTH[level];
export const levelRate = (level) => (unlocked(level) ? workers(level).reduce((sum, w) => sum + (w ? workerRate(w, level) : 0), 0) : 0);
export const ore = (tier) => m().ore[tier];

// Rechnet die vergangene Zeit ab. Liefert das neu gewonnene Erz je Ebene.
export function tick(now = Date.now()) {
  const x = m();
  const minutes = x.last ? Math.min(MAX_OFFLINE_MINUTES, Math.max(0, (now - x.last) / 60000)) : 0;
  x.last = now;
  const gained = [0, 0, 0, 0, 0, 0];
  if (!buildings.owned('mine') || !minutes) return gained;
  for (let l = 0; l <= depth(); l++) {
    x.frac[l] += levelRate(l) * minutes;
    const whole = Math.floor(x.frac[l]);
    if (whole > 0) {
      x.frac[l] -= whole;
      x.ore[l] += whole;
      gained[l] = whole;
    }
  }
  return gained;
}

export function spendOre(tier, amount) {
  if (m().ore[tier] < amount) return false;
  m().ore[tier] -= amount;
  state.changed();
  return true;
}

const oreCache = new Map();
export function oreImage(tier) {
  if (!oreCache.has(tier)) oreCache.set(tier, render(oreDraw(tier), 6100 + tier * 7, tier));
  return oreCache.get(tier);
}
