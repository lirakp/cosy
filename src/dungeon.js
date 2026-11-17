import { RARITIES, getItem, rollItem } from './items.js';
import { state } from './state.js';
import * as buildings from './buildings.js';
import * as buffs from './buffs.js';
import { createParty, emptyMember } from './party.js';
import * as magic from './magic.js';

// Dungeon: Bis zu fünf ausgerüstete Helden ziehen für eine feste Zeit los. Die
// Dauer ist zugleich die Gefahrenstufe – längere Dungeons bringen mehr, sind aber
// schwerer. Helden und Ausrüstung funktionieren wie in der Bossarena.

export const MAX_HEROES = 5;

// need: nötige Team-Stärke für die beste Erfolgschance (gleiche Rechnung wie in der Arena)
// gold: Gold bei Erfolg (±20 %)
// standard: garantierte D-Rang-Stücke · bonus: zusätzliche Stücke ab Rang `minTier`
export const LEVELS = [
  { rank: 'D', name: 'Mooskeller', seconds: 30, need: 30, gold: 15, standard: 0, bonus: 1, minTier: 0 },
  { rank: 'C', name: 'Alte Krypta', seconds: 60, need: 90, gold: 35, standard: 3, bonus: 1, minTier: 0 },
  { rank: 'B', name: 'Kristallmine', seconds: 300, need: 210, gold: 150, standard: 3, bonus: 2, minTier: 1 },
  { rank: 'A', name: 'Drachenhort', seconds: 900, need: 420, gold: 500, standard: 3, bonus: 3, minTier: 1 },
  { rank: 'S', name: 'Schattenfeste', seconds: 1800, need: 750, gold: 1200, standard: 3, bonus: 4, minTier: 2 },
  { rank: 'SS', name: 'Abgrund der Ewigkeit', seconds: 3600, need: 1275, gold: 3000, standard: 3, bonus: 5, minTier: 3 },
];

export const MIN_CHANCE = 0.05;
export const MAX_CHANCE = 0.95;

const d = () => state.dungeon;

// Dungeon-Team: fünf Plätze; gesperrt, solange eine Erkundung läuft.
// Wer in der Arena kämpft, kann nicht in den Dungeon und umgekehrt.
export const party = createParty({
  name: 'dungeon',
  members: () => state.dungeon.team,
  tier: () => buildings.tier('dungeon'),
  other: () => state.arena.team,
  locked: () => !!state.dungeon.run,
  bonus: 'dungeonPower',
});
export { emptyMember };

export const power = () => party.teamPower();

// Erfolgschance: Team-Stärke im Verhältnis zur Anforderung, nie ganz sicher, nie ganz aussichtslos.
export function chance(level, teamPower = power()) {
  if (!teamPower) return 0;
  return buffs.gladiator(Math.max(MIN_CHANCE, Math.min(MAX_CHANCE, teamPower / LEVELS[level].need)));
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

export function start(level, now = Date.now()) {
  const heroes = party.heroIds();
  if (run() || !LEVELS[level] || !unlocked(level) || !heroes.length) return false;
  // Die Stärke beim Aufbruch zählt – das Team ist bis zur Rückkehr gesperrt.
  d().run = { level, heroes, power: power(), shield: magic.useShield(), start: now, end: now + LEVELS[level].seconds * 1000 };
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
  // ältere Erkundungen ohne gespeicherte Stärke: Stärke der losgezogenen Helden
  const fallback = () => r.heroes.reduce((sum, id) => sum + (getItem(id) ? party.heroPower(getItem(id)) : 0), 0);
  const base = chance(r.level, r.power ?? fallback());
  const odds = r.shield ? magic.shielded(base, r.shield) : base;
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
    state.addItems(found, 'dungeon');
  }
  state.addGold(result.gold, 'dungeon');
  return result;
}

export const rankOf = (tier) => RARITIES[tier].id;
