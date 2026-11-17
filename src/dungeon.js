import { ITEMS, RARITIES, getItem, rollItem } from './items.js';
import { state } from './state.js';
import * as buildings from './buildings.js';
import * as buffs from './buffs.js';

// Dungeon: Bis zu fünf Helden ziehen für eine feste Zeit los. Die Dauer ist
// zugleich die Gefahrenstufe – längere Dungeons bringen mehr, sind aber schwerer.

export const MAX_HEROES = 5;

// Stärke eines Helden nach seinem Rang (D … SS).
export const HERO_POWER = [1, 2, 4, 7, 12, 20];

// need: nötige Team-Stärke für die beste Erfolgschance
// gold: Gold bei Erfolg (±20 %)
// standard: garantierte D-Rang-Stücke · bonus: zusätzliche Stücke ab Rang `minTier`
export const LEVELS = [
  { rank: 'D', name: 'Mooskeller', seconds: 30, need: 2, gold: 15, standard: 0, bonus: 1, minTier: 0 },
  { rank: 'C', name: 'Alte Krypta', seconds: 60, need: 6, gold: 35, standard: 3, bonus: 1, minTier: 0 },
  { rank: 'B', name: 'Kristallmine', seconds: 300, need: 14, gold: 150, standard: 3, bonus: 2, minTier: 1 },
  { rank: 'A', name: 'Drachenhort', seconds: 900, need: 28, gold: 500, standard: 3, bonus: 3, minTier: 1 },
  { rank: 'S', name: 'Schattenfeste', seconds: 1800, need: 50, gold: 1200, standard: 3, bonus: 4, minTier: 2 },
  { rank: 'SS', name: 'Abgrund der Ewigkeit', seconds: 3600, need: 85, gold: 3000, standard: 3, bonus: 5, minTier: 3 },
];

export const MIN_CHANCE = 0.05;
export const MAX_CHANCE = 0.95;

const HEROES = ITEMS.filter((item) => item.cat === 'helden');
const d = () => state.dungeon;

// Alle eigenen Helden, die stärksten zuerst.
export const heroes = () => HEROES.filter((h) => state.count(h.id)).sort((a, b) => b.tier - a.tier);

export const power = (ids) => ids.reduce((sum, id) => sum + (HERO_POWER[getItem(id)?.tier] || 0), 0);

// Erfolgschance: Team-Stärke im Verhältnis zur Anforderung, nie ganz sicher, nie ganz aussichtslos.
export function chance(level, ids) {
  if (!ids.length) return 0;
  return buffs.gladiator(Math.max(MIN_CHANCE, Math.min(MAX_CHANCE, power(ids) / LEVELS[level].need)));
}

// Der Rang des Tors bestimmt, welche Gefahrenstufen offen sind.
export const unlocked = (level) => level <= buildings.tier('dungeon');

export const run = () => d().run;

export function status(now = Date.now()) {
  const r = run();
  if (!r) return 'idle';
  return now >= r.end ? 'done' : 'running';
}

export const remaining = (now = Date.now()) => (run() ? Math.max(0, Math.ceil((run().end - now) / 1000)) : 0);

export function start(level, ids, now = Date.now()) {
  ids = ids.filter((id) => state.count(id) && getItem(id)?.cat === 'helden').slice(0, MAX_HEROES);
  if (run() || !LEVELS[level] || !unlocked(level) || !ids.length) return false;
  d().run = { level, heroes: ids, start: now, end: now + LEVELS[level].seconds * 1000 };
  state.changed();
  return true;
}

// Holt die Helden vorzeitig zurück – ohne Beute.
export function abort() {
  d().run = null;
  state.changed();
}

// Wertet einen beendeten Dungeon aus und trägt die Beute ein.
export function collect() {
  if (status() !== 'done') return null;
  const r = run();
  const level = LEVELS[r.level];
  const odds = chance(r.level, r.heroes);
  const result = { level, odds, success: Math.random() < odds, gold: 0, items: [] };
  d().run = null;

  if (result.success) {
    result.gold = Math.round(level.gold * (0.8 + Math.random() * 0.4));
    const found = [];
    for (let i = 0; i < level.standard; i++) found.push(rollItem({ tier: 0 }));
    for (let i = 0; i < level.bonus; i++) found.push(rollItem({ minTier: level.minTier }));
    found.sort((a, b) => a.tier - b.tier);
    const seen = new Set();
    result.items = found.map((item) => {
      const isNew = !state.count(item.id) && !seen.has(item.id);
      seen.add(item.id);
      return { item, isNew };
    });
    state.addItems(found);
  }
  state.addGold(result.gold);
  return result;
}

export const rankOf = (tier) => RARITIES[tier].id;
