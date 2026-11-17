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

const member = () => ({ hero: null, gear: { waffen: null, ruestung: null, relikte: null, artefakte: null } });

const newArena = () => ({
  team: Array.from({ length: 3 }, member),
  lvl: {}, // Stufe je Held und Ausrüstungsstück (0 = D … 5 = SS)
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

const newStats = (now = Date.now()) => ({
  since: now, // Beginn der Aufzeichnung
  played: 0, // Sekunden mit sichtbarem Spiel
  gold: {}, // eingenommenes Gold je Quelle
  spent: {}, // ausgegebenes Gold je Zweck
  items: {}, // erhaltene Stücke je Quelle: { n, dupes, dupValue }
});

const newGarden = () => ({
  beds: [null, null], // je Beet: { crop, planted } oder null
  crops: {}, // Ernte-Vorrat je Pflanze
});

const newVillage = () => ({
  quests: {}, // offene Aufgabe je Bewohner
  next: {}, // ab wann ein Bewohner eine neue Aufgabe hat
  done: 0,
  fish: {}, // gefangene Fische je Rang
  caught: 0,
  seeds: {}, // Saatpäckchen auf Vorrat
  market: { stock: [], wants: [], refreshAt: 0 },
});

const fresh = () => ({
  gold: START_GOLD,
  owned: {},
  pulls: 0,
  exp: newExpedition(),
  dungeon: { run: null, team: Array.from({ length: 5 }, member) },
  buildings: { camp: -1, dungeon: -1, arena: -1, mine: -1, forge: -1 },
  arena: newArena(),
  mine: newMine(),
  forge: { glut: 3, last: 0, made: 0 },
  stats: newStats(),
  garden: newGarden(),
  village: newVillage(),
});

// Ergänzt fehlende Teile (ältere Spielstände) und prüft die Grundform.
function normalize(saved) {
  if (!saved || typeof saved !== 'object' || typeof saved.gold !== 'number' || !saved.owned || typeof saved.owned !== 'object') return null;
  const base = fresh();
  return {
    ...base,
    ...saved,
    exp: { ...base.exp, ...saved.exp },
    dungeon: { ...base.dungeon, ...saved.dungeon },
    buildings: { ...base.buildings, ...saved.buildings },
    arena: { ...base.arena, ...saved.arena },
    mine: { ...base.mine, ...saved.mine, trader: { ...base.mine.trader, ...saved.mine?.trader } },
    forge: { ...base.forge, ...saved.forge },
    stats: { ...base.stats, ...saved.stats },
    garden: { ...base.garden, ...saved.garden },
    village: { ...base.village, ...saved.village, market: { ...base.village.market, ...saved.village?.market } },
  };
}

const listeners = new Set();
let data = load();

function load() {
  try {
    const saved = normalize(JSON.parse(localStorage.getItem(KEY)));
    if (saved) return saved;
  } catch {
    // kein oder kaputter Spielstand -> neu anfangen
  }
  return fresh();
}

// ---------------------------------------------------------------- Statistik

function track(group, key, amount) {
  const g = data.stats[group];
  g[key] = (g[key] || 0) + amount;
}

function trackItems(items, source) {
  const entry = (data.stats.items[source] ||= { n: 0, dupes: 0, dupValue: 0 });
  for (const item of items) {
    entry.n++;
    if (data.owned[item.id]) {
      entry.dupes++;
      entry.dupValue += item.sell;
    }
  }
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
  get forge() {
    return data.forge;
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

  // source: woher das Gold kommt (für die Statistik)
  addGold(amount, source = 'sonstiges') {
    data.gold += amount;
    if (amount > 0) track('gold', source, amount);
    changed();
  },

  // Bezahlt und trägt die gezogenen Stücke ein. Liefert false, wenn das Gold nicht reicht.
  pull(cost, items) {
    if (data.gold < cost) return false;
    data.gold -= cost;
    data.pulls += items.length;
    track('spent', 'brunnen', cost);
    for (const item of items) {
      trackItems([item], 'brunnen');
      data.owned[item.id] = (data.owned[item.id] || 0) + 1;
    }
    changed();
    return true;
  },

  // purpose: wofür das Gold ausgegeben wird (für die Statistik)
  spend(cost, purpose = 'sonstiges') {
    if (data.gold < cost) return false;
    data.gold -= cost;
    if (cost > 0) track('spent', purpose, cost);
    changed();
    return true;
  },

  // Stücke ohne Bezahlung eintragen (z. B. Expeditionsfunde)
  addItems(items, source = 'sonstiges') {
    for (const item of items) {
      trackItems([item], source);
      data.owned[item.id] = (data.owned[item.id] || 0) + 1;
    }
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
    track('gold', 'verkauf', gain);
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
    track('gold', 'verkauf', gain);
    changed();
    return gain;
  },

  get village() {
    return data.village;
  },
  get garden() {
    return data.garden;
  },
  get stats() {
    return data.stats;
  },
  addPlayed(seconds) {
    data.stats.played += seconds;
  },
  resetStats() {
    data.stats = newStats();
    changed();
  },

  // ---------------------------------------------------------------- Sichern und Laden

  // Spielstand als Text für eine Datei
  exportSave() {
    return JSON.stringify({ game: 'cosy', version: 1, savedAt: new Date().toISOString(), data }, null, 1);
  },

  // Prüft eine Sicherungsdatei; liefert den Spielstand oder wirft einen Fehler mit Erklärung.
  parseSave(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('Die Datei ist keine Cosy-Sicherung (kein gültiges JSON).');
    }
    const loaded = normalize(parsed?.game === 'cosy' ? parsed.data : parsed);
    if (!loaded) throw new Error('Die Datei enthält keinen gültigen Cosy-Spielstand.');
    return loaded;
  },

  // Ersetzt den kompletten Spielstand (Import, Neustart, Tests).
  replace(next) {
    data = normalize(next) || fresh();
    changed();
  },
  reset() {
    data = fresh();
    changed();
  },

  collected: (items = ITEMS) => items.reduce((n, item) => n + (data.owned[item.id] ? 1 : 0), 0),
};
