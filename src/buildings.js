import { RARITIES } from './items.js';
import { state } from './state.js';

// Zusatzanlagen: Sie müssen erst gebaut werden und starten auf Rang D.
// Jeder Ausbau schaltet den nächsten Rang frei (C, B, A, S, SS).

export const BUILDINGS = {
  camp: {
    name: 'Expeditionslager',
    buy: 250,
    upgrades: [1000, 3000, 8000, 20000, 50000],
    pitch: 'Deine vier stärksten Lebewesen sammeln hier laufend Gold und finden ab und zu ein Sammelstück.',
    unlocks: 'Lebewesen und Expeditionsleitung lassen sich bis zum Rang des Lagers entwickeln.',
  },
  dungeon: {
    name: 'Dungeon-Tor',
    buy: 400,
    upgrades: [800, 2500, 7000, 18000, 45000],
    pitch: 'Schicke bis zu fünf Helden auf Erkundung, um Gold und Sammelstücke zu erbeuten.',
    unlocks: 'Gefahrenstufen sind bis zum Rang des Tors zugänglich.',
  },
  arena: {
    name: 'Bossarena',
    buy: 600,
    upgrades: [1200, 3500, 9000, 22000, 55000],
    pitch: 'Rüste drei Helden aus und lass sie gegen Bosse kämpfen. Siege bringen Stoff und Seide für den Arena-Händler.',
    unlocks: 'Bosse lassen sich bis zum Rang der Arena gezielt herausfordern, Ausrüstung bis zu diesem Rang verbessern.',
  },
};

const MAX_TIER = RARITIES.length - 1;

// -1 = noch nicht gebaut, 0 = Rang D … 5 = Rang SS
export const tier = (id) => state.buildings[id] ?? -1;
export const owned = (id) => tier(id) >= 0;
export const rank = (id) => (owned(id) ? RARITIES[tier(id)].id : null);

// Preis des nächsten Schritts (Bau oder Ausbau); null, wenn alles ausgebaut ist.
export function nextCost(id) {
  const t = tier(id);
  if (t < 0) return BUILDINGS[id].buy;
  return t < MAX_TIER ? BUILDINGS[id].upgrades[t] : null;
}

export function advance(id) {
  const cost = nextCost(id);
  if (cost === null || !state.spend(cost)) return false;
  state.buildings[id] = tier(id) + 1;
  state.changed();
  return true;
}
