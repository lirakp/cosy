import { CATEGORIES, RARITIES, PER_GROUP, getGroup } from './items.js';
import { state } from './state.js';

// Sammel-Sets: Wer alle 50 Stücke einer Kategorie in einem Rang besitzt,
// bekommt einen dauerhaften Bonus. Jede Kategorie stärkt ein anderes System,
// höhere Ränge geben mehr.

// Bonus in Prozent je vollständigem Set, nach Rang D … SS
export const SET_BONUS = [2, 3, 4, 6, 8, 12];

export const CATEGORY_BONUS = {
  lebewesen: { key: 'expGold', text: 'Gold aus der Expedition' },
  monster: { key: 'mineOre', text: 'Erz in der Mine' },
  waffen: { key: 'arenaPower', text: 'Team-Stärke in der Bossarena' },
  ruestung: { key: 'dungeonPower', text: 'Team-Stärke im Dungeon' },
  // Münzen sind nur 10 Gold wert – hier gibt es feste Gold-Beträge statt Prozenten
  relikte: { key: 'coins', text: 'Gold pro Münze auf dem Weg', flat: [1, 1, 2, 3, 4, 6] },
  artefakte: { key: 'glut', text: 'Nachladetempo der Schmiedeglut' },
  helden: { key: 'wellDiscount', text: 'Rabatt am Wunschbrunnen' },
};

export const progress = (cat, tier) => getGroup(cat, RARITIES[tier].id).reduce((n, item) => n + (state.count(item.id) ? 1 : 0), 0);
export const complete = (cat, tier) => progress(cat, tier) >= PER_GROUP;

// Zwischenspeicher: wird bei jeder Änderung am Spielstand neu berechnet
let cache = null;
let known = null;
const listeners = new Set();

function compute() {
  const done = [];
  const bonus = {};
  for (const c of CATEGORIES) {
    for (let t = 0; t < RARITIES.length; t++) {
      if (!complete(c.id, t)) continue;
      done.push(`${c.id}:${t}`);
      const k = CATEGORY_BONUS[c.id].key;
      const b = CATEGORY_BONUS[c.id];
      bonus[k] = (bonus[k] || 0) + (b.flat ? b.flat[t] : SET_BONUS[t] / 100);
    }
  }
  return { done, bonus };
}

function current() {
  if (!cache) cache = compute();
  return cache;
}

state.onChange(() => {
  cache = null;
  const now = current().done;
  if (known) {
    for (const key of now) {
      if (known.has(key)) continue;
      const [cat, t] = key.split(':');
      for (const fn of listeners) fn(cat, Number(t));
    }
  }
  known = new Set(now);
});
known = new Set(current().done);

// Summe der Boni einer Art als Anteil (0,05 = 5 %); bei festen Boni der Betrag
export const bonus = (key) => current().bonus[key] || 0;
export const completedCount = () => current().done.length;
export const onComplete = (fn) => listeners.add(fn);

// Neu laden (z. B. nach einem importierten Spielstand)
export function refresh() {
  cache = null;
  known = new Set(current().done);
}

// Brunnenpreis nach Helden-Rabatt
export const pullCost = (base) => Math.round(base * (1 - bonus('wellDiscount')));

export function describe(cat, tier) {
  const b = CATEGORY_BONUS[cat];
  return b.flat ? `+${b.flat[tier]} ${b.text}` : `+${SET_BONUS[tier]} % ${b.text}`;
}

// Liste aller aktiven Boni für die Anzeige
export function activeBonuses() {
  return Object.values(CATEGORY_BONUS)
    .filter((b) => bonus(b.key) > 0)
    .map((b) => (b.flat ? `+${bonus(b.key)} ${b.text}` : `+${Math.round(bonus(b.key) * 100)} % ${b.text}`));
}
