import { ITEMS, getItem } from './items.js';

// Spielstand: Gold und gesammelte Stücke. Wird im Browser gespeichert.

const KEY = 'cosy-save-v1';
const START_GOLD = 500;

export const PULL_COST = 50;
export const PULL_10_COST = 450; // zehn Züge zum Preis von neun
export const COIN_VALUE = 10;

const newExpedition = () => ({
  evo: {}, // Entwicklungsstufe je Lebewesen (0 = D … 5 = SS)
  leader: 'mira',
  leaderEvo: {},
  last: 0, // Zeitpunkt der letzten Abrechnung
  gold: 0, // Gold in der Truhe
  frac: 0, // angebrochene Minute für die Fund-Würfe
  loot: [], // gefundene Stücke in der Truhe
});

const listeners = new Set();
const data = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved.gold === 'number' && saved.owned) {
      saved.exp = { ...newExpedition(), ...saved.exp };
      saved.dungeon = { run: null, ...saved.dungeon };
      return saved;
    }
  } catch {
    // kein oder kaputter Spielstand -> neu anfangen
  }
  return { gold: START_GOLD, owned: {}, pulls: 0, exp: newExpedition(), dungeon: { run: null } };
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Speichern nicht möglich (z. B. privates Fenster) – das Spiel läuft trotzdem
  }
}

function changed() {
  save();
  for (const fn of listeners) fn();
}

export const state = {
  get gold() {
    return data.gold;
  },
  get pulls() {
    return data.pulls;
  },
  get exp() {
    return data.exp;
  },
  get dungeon() {
    return data.dungeon;
  },
  save,
  changed,
  count: (id) => data.owned[id] || 0,
  onChange: (fn) => listeners.add(fn),

  addGold(amount) {
    data.gold += amount;
    changed();
  },

  // Bezahlt und trägt die gezogenen Stücke ein. Liefert false, wenn das Gold nicht reicht.
  pull(cost, items) {
    if (data.gold < cost) return false;
    data.gold -= cost;
    data.pulls += items.length;
    for (const item of items) data.owned[item.id] = (data.owned[item.id] || 0) + 1;
    changed();
    return true;
  },

  spend(cost) {
    if (data.gold < cost) return false;
    data.gold -= cost;
    changed();
    return true;
  },

  // Stücke ohne Bezahlung eintragen (z. B. Expeditionsfunde)
  addItems(items) {
    for (const item of items) data.owned[item.id] = (data.owned[item.id] || 0) + 1;
    changed();
  },

  // Verbraucht ein Duplikat; das letzte Exemplar bleibt unangetastet.
  useDuplicate(id) {
    if ((data.owned[id] || 0) > 1) data.owned[id]--;
  },

  duplicates: (id) => Math.max(0, (data.owned[id] || 0) - 1),

  // Verkauft alle überzähligen Exemplare eines Stücks; eines bleibt immer in der Sammlung.
  sellDuplicates(id) {
    const extra = state.duplicates(id);
    if (!extra) return 0;
    const gain = extra * getItem(id).sell;
    data.owned[id] = 1;
    data.gold += gain;
    changed();
    return gain;
  },

  duplicateValue() {
    let sum = 0;
    for (const id in data.owned) sum += state.duplicates(id) * (getItem(id)?.sell || 0);
    return sum;
  },

  sellAllDuplicates() {
    const gain = state.duplicateValue();
    if (!gain) return 0;
    for (const id in data.owned) if (data.owned[id] > 1) data.owned[id] = 1;
    data.gold += gain;
    changed();
    return gain;
  },

  collected: (items = ITEMS) => items.reduce((n, item) => n + (data.owned[item.id] ? 1 : 0), 0),
};
