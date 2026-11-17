import { RARITIES } from './items.js';
import { state } from './state.js';
import * as buildings from './buildings.js';
import * as mine from './mine.js';
import { render, M, ramp } from './art/core.js';

// Edelsteine: In der Schmiede aus Erz geschliffen (Rang des Edelsteins = Rang
// des Erzes, höchstens bis zum Rang der Schmiede). Jeder Held in Arena,
// Dungeon und Bossrush hat einen Edelstein-Platz. Vier Arten mit eigenen Wirkungen.

export const GEMS = [
  { id: 'rubin', name: 'Rubin', effect: 'Stärke', hue: 350, values: [0.04, 0.07, 0.1, 0.14, 0.2, 0.3], text: (v) => `+${pct(v)} Stärke für diesen Helden` },
  { id: 'saphir', name: 'Saphir', effect: 'Gold', hue: 215, values: [0.05, 0.08, 0.12, 0.18, 0.25, 0.35], text: (v) => `+${pct(v)} Gold aus Dungeon, Abstieg und Bossrush` },
  { id: 'smaragd', name: 'Smaragd', effect: 'Glück', hue: 140, values: [0.01, 0.015, 0.02, 0.03, 0.04, 0.06], text: (v) => `+${pct(v)} Erfolgschance für das Team` },
  { id: 'topas', name: 'Topas', effect: 'Beute', hue: 42, values: [0.03, 0.05, 0.08, 0.11, 0.15, 0.2], text: (v) => `+${pct(v)} Chance auf Extra-Beute (Sammelstück bzw. Seide)` },
];
const pct = (v) => `${Math.round(v * 1000) / 10} %`.replace('.', ',');
export const gem = (id) => GEMS.find((g) => g.id === id);

// Kosten je Rang: Erz dieses Rangs und Gold
export const ORE_COST = [6, 6, 8, 10, 12, 15];
export const GOLD_COST = [60, 150, 400, 1000, 2500, 6000];

// Edelstein-Schlüssel: 'rubin-3' = Rubin vom Rang A
export const key = (id, tier) => `${id}-${tier}`;
export const parse = (k) => {
  const [id, t] = String(k).split('-');
  return { id, tier: Number(t), gem: gem(id) };
};
export const value = (k) => {
  const { gem: g, tier } = parse(k);
  return g ? g.values[tier] : 0;
};

const store = () => (state.forge.gems ||= {});
export const count = (k) => store()[k] || 0;
export const owned = () => Object.entries(store()).filter(([, n]) => n > 0).map(([k]) => k);

export function blocker(id, tier) {
  if (!buildings.owned('forge')) return 'Erst die Schmiede bauen.';
  if (tier > buildings.tier('forge')) return `Schmiede-Rang ${RARITIES[tier].id} nötig.`;
  if (mine.ore(tier) < ORE_COST[tier]) return `${ORE_COST[tier]}× ${mine.LEVELS[tier].ore} nötig.`;
  if (state.gold < GOLD_COST[tier]) return `${GOLD_COST[tier]} Gold nötig.`;
  return null;
}

export function craft(id, tier) {
  if (!gem(id) || blocker(id, tier)) return false;
  if (!mine.spendOre(tier, ORE_COST[tier]) || !state.spend(GOLD_COST[tier], 'schmiede')) return false;
  store()[key(id, tier)] = count(key(id, tier)) + 1;
  state.changed();
  return true;
}

// Bild eines Edelsteins (16×16)
const cache = new Map();
export function image(k) {
  if (!cache.has(k)) {
    const { gem: g, tier } = parse(k);
    const draw = (gr) => {
      gr.rows(3, [2, 4, 5, 6, 6, 5, 4, 3, 2, 1], M.main);
      gr.swap(M.main, M.second, (x, y) => x < 8 && y < 7);
      gr.pts(M.white, [[6, 5], [7, 4], [6, 4]]);
      gr.pts(M.glow, [[9, 8], [8, 9]]);
      return { [M.main]: ramp(g.hue, 70, 45), [M.second]: ramp(g.hue, 60, 65) };
    };
    cache.set(k, render(draw, 8800 + g.hue + tier, tier));
  }
  return cache.get(k);
}
