import { ITEMS, RARITIES, getItem, rollItem } from './items.js';
import { state } from './state.js';
import { render } from './art/core.js';
import { LEADER_ART } from './art/leaders.js';
import * as buildings from './buildings.js';
import { dupValue, payWithDuplicates } from './dupes.js';
import * as buffs from './buffs.js';
import * as sets from './sets.js';
import * as companions from './companions.js';

// Expedition: Die vier stärksten Lebewesen sammeln laufend Gold in eine Truhe
// und finden ab und zu ein Sammelstück. Ein Expeditionsleiter verstärkt beides.

export const TEAM_SIZE = 4;
const MAX_TIER = RARITIES.length - 1;

// Gold pro Minute nach Ausgangsrang (D … SS) – nur dieser Grundwert hängt am Rang.
export const BASE_RATE = [7, 11, 18, 30, 52, 110];
// Faktor nach Rang des Expeditionslagers (D … SS): Ausbauen lohnt sich spürbar.
// Bezugspunkt: Lager Rang B, vier Lebewesen Rang C auf Stufe B, Leitung auf B → rund 500 Gold/min.
export const CAMP_MULT = [1, 2, 4, 5, 6, 7];
// Faktor nach Entwicklungsstufe (D … SS). Jedes Lebewesen beginnt auf Stufe D.
export const EVO_MULT = [1, 1.5, 2.25, 3.5, 5, 8];
// Preis der nächsten Stufe, bezahlt mit Lebewesen-Duplikaten (gerechnet in deren Verkaufswert).
export const EVO_COST = [30, 80, 200, 600, 2000];

// Chance pro Expeditionsminute, ein Sammelstück zu finden.
export const LOOT_CHANCE = 0.02;
// Die Truhe fasst den Ertrag von vier Stunden und höchstens fünf Funde.
export const CHEST_MINUTES = 240;
export const CHEST_LOOT_MAX = 5;

// Leiter: Bonus je Stufe, gewichtet nach Spezialgebiet. Entwickelt wird mit Gold.
const LEADER_STEP = [0, 0.1, 0.25, 0.45, 0.7, 1];
export const LEADER_COST = [300, 900, 2500, 7000, 20000];
export const LEADERS = [
  { id: 'mira', name: 'Kartografin Mira', role: 'Ausgewogen', gold: 1, loot: 1, seed: 4711 },
  { id: 'bodo', name: 'Schatzmeister Bodo', role: 'Mehr Gold', gold: 1.6, loot: 0.4, seed: 815 },
  { id: 'yuna', name: 'Fährtenleserin Yuna', role: 'Mehr Funde', gold: 0.4, loot: 1.6, seed: 2342 },
];

const CREATURES = ITEMS.filter((item) => item.cat === 'lebewesen');
const e = () => state.exp;

// ---------------------------------------------------------------- Lebewesen

// Der Rang des Lagers begrenzt, wie weit entwickelt werden kann (und was davon zählt).
const campTier = () => buildings.tier('camp');
const rawEvo = (id) => e().evo[id] || 0;
export const evoOf = (id) => Math.max(0, Math.min(rawEvo(id), campTier()));
// true, wenn nur noch der Lager-Rang die nächste Entwicklung verhindert
export const capped = (tier) => tier < MAX_TIER && tier >= campTier();
export const rateOf = (item, tier = evoOf(item.id)) => BASE_RATE[item.tier] * EVO_MULT[tier] * CAMP_MULT[Math.max(0, campTier())];

// Alle eigenen Lebewesen, die stärksten zuerst.
export function roster() {
  // der Gartenhelfer bleibt zu Hause
  return CREATURES.filter((item) => state.count(item.id) && item.id !== state.garden.helper?.creature).sort((a, b) => rateOf(b) - rateOf(a) || b.tier - a.tier);
}
export const team = () => (buildings.owned('camp') ? roster().slice(0, TEAM_SIZE) : []);

// Wert aller Lebewesen-Duplikate – das Material für Entwicklungen.
export const material = () => dupValue(CREATURES);

export const evolveCost = (item) => (rawEvo(item.id) < MAX_TIER && rawEvo(item.id) < campTier() ? EVO_COST[rawEvo(item.id)] : null);

export function evolve(item) {
  const cost = evolveCost(item);
  if (cost === null || !state.count(item.id)) return false;

  if (!payWithDuplicates(CREATURES, cost)) return false;
  e().evo[item.id] = rawEvo(item.id) + 1;
  refresh();
  state.changed();
  return true;
}

// ---------------------------------------------------------------- Leiter

export const leader = () => LEADERS.find((l) => l.id === e().leader) || LEADERS[0];
const rawLeader = (id) => e().leaderEvo[id] || 0;
export const leaderTier = (id = leader().id) => Math.max(0, Math.min(rawLeader(id), campTier()));
export const goldBonus = (l = leader(), tier = leaderTier(l.id)) => LEADER_STEP[tier] * l.gold;
export const lootBonus = (l = leader(), tier = leaderTier(l.id)) => LEADER_STEP[tier] * l.loot;
export const leaderCost = (id = leader().id) => (rawLeader(id) < MAX_TIER && rawLeader(id) < campTier() ? LEADER_COST[rawLeader(id)] : null);

const leaderCache = new Map();
export function leaderImage(l = leader(), tier = leaderTier(l.id)) {
  const key = `${l.id}-${tier}`;
  if (!leaderCache.has(key)) leaderCache.set(key, render(LEADER_ART[l.id], l.seed, tier));
  return leaderCache.get(key);
}

export function setLeader(id) {
  tick();
  e().leader = id;
  refresh();
  state.changed();
}

export function evolveLeader(id = leader().id) {
  const cost = leaderCost(id);
  if (cost === null) return false;
  tick();
  if (!state.spend(cost, 'leitung')) return false;
  e().leaderEvo[id] = rawLeader(id) + 1;
  refresh();
  state.changed();
  return true;
}

// ---------------------------------------------------------------- Truhe

export const goldPerMinute = () => team().reduce((sum, item) => sum + rateOf(item), 0) * (1 + goldBonus()) * buffs.expeditionFactor() * (1 + sets.bonus('expGold')) * (1 + companions.bonus('expedition'));
export const lootChance = () => LOOT_CHANCE * (1 + lootBonus());

// Momentaufnahme für Anzeige und Welt, damit nicht jedes Bild neu gerechnet wird.
export const live = { team: [], rate: 0, gold: 0, cap: 0, loot: 0 };
function refresh() {
  live.team = team();
  live.rate = goldPerMinute();
  live.cap = Math.floor(live.rate * CHEST_MINUTES);
  live.gold = Math.min(Math.floor(e().gold), live.cap || Infinity);
  live.loot = e().loot.length;
}

// Rechnet die seit dem letzten Aufruf vergangene Zeit ab – auch die, in der
// das Spiel geschlossen war. Liefert die Zahl der neuen Funde.
export function tick(now = Date.now()) {
  const x = e();
  let minutes = x.last ? (now - x.last) / 60000 : 0;
  x.last = now;
  const rate = goldPerMinute();
  let found = 0;
  if (minutes > 0 && rate > 0) {
    // Ist die Truhe voll, wartet das Team, bis sie geleert wird.
    minutes = Math.min(minutes, Math.max(0, rate * CHEST_MINUTES - x.gold) / rate);
    x.gold += rate * minutes;
    x.frac += minutes;
    const chance = lootChance();
    while (x.frac >= 1) {
      x.frac -= 1;
      if (x.loot.length < CHEST_LOOT_MAX && Math.random() < chance) {
        x.loot.push(rollItem().id);
        found++;
      }
    }
  }
  refresh();
  return found;
}

// Nach Bau oder Ausbau des Lagers neu rechnen.
export function rebuilt() {
  tick();
}

// Leert die Truhe: Gold aufs Konto, Funde in die Sammlung.
export function collect() {
  tick();
  const x = e();
  const gold = Math.floor(x.gold);
  const seen = new Set();
  const items = x.loot.map(getItem).filter(Boolean).map((item) => {
    const isNew = !state.count(item.id) && !seen.has(item.id);
    seen.add(item.id);
    return { item, isNew };
  });
  if (!gold && !items.length) return null;
  x.gold -= gold;
  x.loot = [];
  state.addItems(items.map((i) => i.item), 'expedition');
  state.addGold(gold, 'expedition');
  refresh();
  return { gold, items };
}

refresh();
