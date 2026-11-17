import { ITEMS, getItem } from './items.js';

// Spielstand: Gold und gesammelte Stücke. Wird im Browser gespeichert.

const KEY = 'cosy-save-v1';
const START_GOLD = 500;

export const PULL_COST = 65;
export const PULL_10_COST = 585; // zehn Züge zum Preis von neun

const newExpedition = () => ({
  evo: {}, // Entwicklungsstufe je Lebewesen (0 = D … 5 = SS)
  leader: 'mira',
  leaderEvo: {},
  last: 0, // Zeitpunkt der letzten Abrechnung
  gold: 0, // Gold in der Truhe
  frac: 0, // angebrochene Minute für die Fund-Würfe
  loot: [], // gefundene Stücke in der Truhe
});

const newArena = () => ({
  team: Array.from({ length: 3 }, () => ({ hero: null, gear: { waffen: null, ruestung: null, relikte: null, artefakte: null } })),
  lvl: {}, // Stufe je Ausrüstungsstück (0 = D … 5 = SS)
  boss: null, // wartender Boss: { tier, kind }
  mats: { stoff: [0, 0, 0, 0, 0, 0], seide: [0, 0, 0, 0, 0, 0] },
  wins: 0,
});

const newMine = () => ({
  lvl: {}, // Stufe je Monster (0 = D … 5 = SS)
  slots: Array.from({ length: 6 }, () => [null, null, null]), // Arbeiter je Ebene
  ore: [0, 0, 0, 0, 0, 0], // Erzvorrat je Rang
  frac: [0, 0, 0, 0, 0, 0], // angefangenes Erz
  last: 0,
  trader: { until: 0, nextRoll: 0, offers: [], surprise: 0 },
});

const listeners = new Set();
const data = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved.gold === 'number' && saved.owned) {
      saved.exp = { ...newExpedition(), ...saved.exp };
      saved.dungeon = { run: null, ...saved.dungeon };
      saved.buildings = { camp: -1, dungeon: -1, arena: -1, ...saved.buildings };
      saved.arena = { ...newArena(), ...saved.arena };
      saved.mine = { ...newMine(), ...saved.mine };
      saved.buildings.mine ??= -1;
      return saved;
    }
  } catch {
    // kein oder kaputter Spielstand -> neu anfangen
  }
  return { gold: START_GOLD, owned: {}, pulls: 0, exp: newExpedition(), dungeon: { run: null }, buildings: { camp: -1, dungeon: -1, arena: -1, mine: -1 }, arena: newArena(), mine: newMine() };
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
  get mine() {
    return data.mine;
  },
  get arena() {
    return data.arena;
  },
  // Tageszeit 0…1; ohne Spielstand beginnt das Spiel am frühen Abend.
  get day() {
    return typeof data.day === 'number' ? data.day : 0.72;
  },
  set day(value) {
    data.day = value;
  },
  get outfit() {
    return data.outfit || 'wanderer';
  },
  set outfit(id) {
    data.outfit = id;
    changed();
  },
  // aktiver Rausch nach dem Schlafen: { id, until } oder null
  get buff() {
    return data.buff || null;
  },
  set buff(value) {
    data.buff = value;
    changed();
  },
  get buildings() {
    return data.buildings;
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
