import { ITEMS, RARITIES, getItem, rollItem } from './items.js';
import { state } from './state.js';
import { render } from './art/core.js';
import { LEADER_ART } from './art/leaders.js';

// Expedition: Die vier stärksten Lebewesen sammeln laufend Gold in eine Truhe
// und finden ab und zu ein Sammelstück. Ein Expeditionsleiter verstärkt beides.

export const TEAM_SIZE = 4;
const MAX_TIER = RARITIES.length - 1;

// Gold pro Minute nach Ausgangsrang (D … SS) – nur dieser Grundwert hängt am Rang.
export const BASE_RATE = [2, 3, 5, 8, 14, 30];
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

export const evoOf = (id) => e().evo[id] || 0;
export const rateOf = (item, tier = evoOf(item.id)) => BASE_RATE[item.tier] * EVO_MULT[tier];

// Alle eigenen Lebewesen, die stärksten zuerst.
export function roster() {
  return CREATURES.filter((item) => state.count(item.id)).sort((a, b) => rateOf(b) - rateOf(a) || b.tier - a.tier);
}
export const team = () => roster().slice(0, TEAM_SIZE);

// Wert aller Lebewesen-Duplikate – das Material für Entwicklungen.
export function material() {
  return CREATURES.reduce((sum, item) => sum + state.duplicates(item.id) * item.sell, 0);
}

export const evolveCost = (item) => (evoOf(item.id) < MAX_TIER ? EVO_COST[evoOf(item.id)] : null);

export function evolve(item) {
  const cost = evolveCost(item);
  if (cost === null || !state.count(item.id) || material() < cost) return false;

  // Die günstigsten Duplikate zuerst nehmen …
  const pool = CREATURES.filter((c) => state.duplicates(c.id)).sort((a, b) => a.tier - b.tier);
  const used = [];
  let sum = 0;
  for (const c of pool) {
    for (let i = 0; i < state.duplicates(c.id) && sum < cost; i++) {
      used.push(c);
      sum += c.sell;
    }
  }
  // … und wieder zurücklegen, was am Ende doch nicht gebraucht wird.
  for (let i = 0; i < used.length; ) {
    if (sum - used[i].sell >= cost) {
      sum -= used[i].sell;
      used.splice(i, 1);
    } else i++;
  }
  for (const c of used) state.useDuplicate(c.id);
  e().evo[item.id] = evoOf(item.id) + 1;
  refresh();
  // Ein Überschuss wird wie ein Verkauf in Gold ausgezahlt, damit nichts verloren geht.
  state.addGold(sum - cost);
  return true;
}

// ---------------------------------------------------------------- Leiter

export const leader = () => LEADERS.find((l) => l.id === e().leader) || LEADERS[0];
export const leaderTier = (id = leader().id) => e().leaderEvo[id] || 0;
export const goldBonus = (l = leader(), tier = leaderTier(l.id)) => LEADER_STEP[tier] * l.gold;
export const lootBonus = (l = leader(), tier = leaderTier(l.id)) => LEADER_STEP[tier] * l.loot;
export const leaderCost = (id = leader().id) => (leaderTier(id) < MAX_TIER ? LEADER_COST[leaderTier(id)] : null);

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
  if (!state.spend(cost)) return false;
  e().leaderEvo[id] = leaderTier(id) + 1;
  refresh();
  state.changed();
  return true;
}

// ---------------------------------------------------------------- Truhe

export const goldPerMinute = () => team().reduce((sum, item) => sum + rateOf(item), 0) * (1 + goldBonus());
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
  state.addItems(items.map((i) => i.item));
  state.addGold(gold);
  refresh();
  return { gold, items };
}

refresh();
