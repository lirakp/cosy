import { ITEMS, getItem } from './items.js';
import * as realm from './realm.js';

// Spielstand: Gold und gesammelte Stücke. Wird im Browser gespeichert.

const KEY = 'cosy-save-v1';
const START_GOLD = 500;

export const PULL_COST = 100;
export const PULL_10_COST = 850; // zehn Züge mit Mengenrabatt
// Duplikat-Wunsch: nur Stücke, die man schon besitzt (Material zum Leveln), je Zug teurer
export const DUPE_EXTRA = 50;

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
  last: [], // zuletzt gepflanzt je Beet
  helper: { creature: null, sell: false, reserve: 5, plan: [], purse: 0, last: 0, harvests: 0, sold: 0, spent: 0 },
});

const newVillage = () => ({
  quests: {}, // offene Aufgabe je Bewohner
  next: {}, // ab wann ein Bewohner eine neue Aufgabe hat
  done: 0,
  fish: {}, // gefangene Fische je Rang (Vorrat)
  caught: 0,
  caughtBy: {}, // je Art insgesamt gefangen, dazu Flaschenposts (fürs Angelbuch)
  trap: { level: -1, stored: {}, last: 0, frac: 0 }, // Fischreuse
  seeds: {}, // Saatpäckchen auf Vorrat
  market: { stock: [], wants: [], refreshAt: 0 },
  shards: {}, // Glutsteine und Sternensplitter aus den Minispielen der Dimensionen
});

const fresh = () => ({
  gold: START_GOLD,
  owned: {},
  pulls: 0,
  exp: newExpedition(),
  dungeon: { run: null, team: Array.from({ length: 5 }, member), descent: null, depthBest: {} },
  // Bossrush: 10 Plätze für Helden und Monster, laufender Rush, bester Lauf
  bossrush: { team: Array.from({ length: 10 }, member), run: null, best: 0 },
  buildings: { camp: -1, dungeon: -1, arena: -1, mine: -1, forge: -1, well: 0, portal: -1 },
  well: { pityA: 0, pityS: 0, freeNext: false, dailyDay: -1, dailyUsed: 0, spiritGift: false, spiritWishes: 0 },
  arena: newArena(),
  mine: newMine(),
  forge: { glut: 3, last: 0, made: 0 },
  stats: newStats(),
  garden: newGarden(),
  village: newVillage(),
  magic: { mana: 0, last: 0, learned: [], cd: {}, lure: false, luckyPull: false, shield: false },
  companions: { owned: [], active: null, pts: {}, gifts: 0 },
  tailor: { capes: [0, 0, 0, 0, 0, 0], sewn: [], decor: [] },
  // Dimensionsportal: welche Welt dahinter liegt, ob man gerade dort ist, und
  // der Spielstand der Welt, in der man gerade NICHT ist
  // type: die erste Portalwelt (Zufall beim Bau) · inside: Welt, in der man gerade ist (null = Heimat)
  // stash: gemerkter Stand der Welten, in denen man gerade NICHT ist · visited: schon betreten
  realm: { type: null, inside: null, stash: {}, visited: {} },
});

// Diese Teile hat jede Welt für sich (Gebäude, Expedition, Dungeon, Arena,
// Mine, Schmiede, Brunnen, Garten). Alles andere – Gold, Sammlung, Begleiter,
// Haus, Dorf, Magie – teilen sich beide Welten.
export const WORLD_KEYS = ['buildings', 'exp', 'dungeon', 'arena', 'mine', 'forge', 'well', 'garden', 'bossrush'];

// Neue Portalwelt: alles noch unbebaut, nur Brunnen und Portal (für den Rückweg) stehen.
function freshRealmWorld() {
  const f = fresh();
  const w = Object.fromEntries(WORLD_KEYS.map((k) => [k, f[k]]));
  // Portalwelten starten bei Rang B: der Brunnen steht schon auf B, das Portal für den Rückweg ist da
  w.buildings = { ...w.buildings, well: 2, portal: 0 };
  return w;
}

// Ergänzt fehlende Teile eines Welt-Spielstands
function mergeWorld(saved = {}, base) {
  return {
    exp: { ...base.exp, ...saved.exp },
    dungeon: { ...base.dungeon, ...saved.dungeon },
    bossrush: { ...base.bossrush, ...saved.bossrush },
    buildings: { ...base.buildings, ...saved.buildings },
    arena: { ...base.arena, ...saved.arena },
    mine: { ...base.mine, ...saved.mine, trader: { ...base.mine.trader, ...saved.mine?.trader } },
    forge: { ...base.forge, ...saved.forge },
    well: { ...base.well, ...saved.well },
    garden: { ...base.garden, ...saved.garden, helper: { ...base.garden.helper, ...saved.garden?.helper } },
  };
}

// Ältere Spielstände zählten Fische nur nach Rang (0 … 5) – das waren genau diese Arten.
const OLD_FISH = ['weissfisch', 'forelle', 'karpfen', 'hecht', 'goldkarpfen', 'mondfisch'];
function migrateFish(map = {}) {
  const out = {};
  for (const [k, n] of Object.entries(map)) {
    const key = /^\d$/.test(k) ? OLD_FISH[Number(k)] : k;
    out[key] = (out[key] || 0) + n;
  }
  return out;
}

// Ergänzt fehlende Teile (ältere Spielstände) und prüft die Grundform.
// Zauber vor den Schriftrollen-Zaubern → Zauber derselben Schule (Schriftrolle als Id)
const LEGACY_SPELLS = {
  wachstum: 'relikte-D-5',
  sternenregen: 'relikte-D-16',
  lockruf: 'relikte-C-27',
  glueck: 'relikte-B-38',
  zeitsprung: 'relikte-A-5',
  schild: 'relikte-S-49',
};
function migrateMagic(x) {
  x.learned = [...new Set((x.learned || []).map((id) => LEGACY_SPELLS[id] || id))];
  if (x.lure === true) x.lure = { n: 1, v: 1 };
  if (x.luckyPull === true) x.luckyPull = { n: 1, v: 1 };
  if (x.shield === true) x.shield = { n: 1, v: 0.15 };
  x.cd = { ...x.cd };
  for (const k of Object.keys(LEGACY_SPELLS)) delete x.cd[k];
  return x;
}

function normalize(saved) {
  if (!saved || typeof saved !== 'object' || typeof saved.gold !== 'number' || !saved.owned || typeof saved.owned !== 'object') return null;
  const base = fresh();
  const merged = {
    ...base,
    ...saved,
    ...mergeWorld(saved, base),
    stats: { ...base.stats, ...saved.stats },
    magic: { ...base.magic, ...saved.magic },
    companions: { ...base.companions, ...saved.companions },
    tailor: { ...base.tailor, ...saved.tailor },
    realm: { ...base.realm, ...saved.realm },
    village: { ...base.village, ...saved.village, market: { ...base.village.market, ...saved.village?.market }, trap: { ...base.village.trap, ...saved.village?.trap } },
  };
  merged.village.fish = migrateFish(merged.village.fish);
  merged.village.caughtBy = migrateFish(merged.village.caughtBy);
  merged.magic = migrateMagic(merged.magic);
  merged.realm = migrateRealm(merged.realm);
  // gemerkte Welten ebenfalls ergänzen
  for (const [w, part] of Object.entries(merged.realm.stash)) merged.realm.stash[w] = mergeWorld(part, w === 'normal' ? fresh() : freshRealmWorld());
  if (merged.realm.inside) merged.buildings.portal = 0;
  return merged;
}

// Ältere Spielstände kannten nur eine Portalwelt: { type, inside: true/false, other, visited: true/false }
function migrateRealm(r) {
  const out = { type: r.type || null, inside: null, stash: { ...r.stash }, visited: typeof r.visited === 'object' && r.visited ? { ...r.visited } : {} };
  if (r.visited === true && r.type) out.visited[r.type] = true;
  if (typeof r.inside === 'string') out.inside = r.inside;
  else if (r.inside === true && r.type) out.inside = r.type;
  if (r.other) out.stash[out.inside ? 'normal' : r.type] = r.other;
  if (out.inside && !out.type) out.inside = null;
  return out;
}

const listeners = new Set();
let data = load();
syncRealm();

// Merkt sich für die übrigen Module, in welcher Welt man gerade ist
function syncRealm() {
  realm.setCurrent(data.realm.inside || 'normal');
}

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
  get bossrush() {
    return data.bossrush;
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
  // gewählte Figur: { id, tone } (null = noch nie gewählt)
  get character() {
    return data.character || null;
  },
  set character(c) {
    data.character = { id: c.id, tone: c.tone ?? null };
    changed();
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

  // gewählte Landschaft (oder „jahreszeiten“) und gezählte Spieltage
  get theme() {
    return data.theme || 'bergland';
  },
  set theme(id) {
    data.theme = id;
    changed();
  },
  get dayCount() {
    return data.dayCount || 0;
  },
  set dayCount(n) {
    data.dayCount = n;
  },
  get tailor() {
    return data.tailor;
  },
  get well() {
    return data.well;
  },
  get companions() {
    return data.companions;
  },
  get magic() {
    return data.magic;
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
    syncRealm();
    changed();
  },
  reset() {
    data = fresh();
    syncRealm();
    changed();
  },

  // ------------------------------------------------------------ Portalwelt
  get realm() {
    return data.realm;
  },
  // Wechselt die Welt: merkt sich die Welt-Teile der aktuellen Welt und lädt die der Ziel-Welt.
  // Ohne Ziel: von der Heimat in die erste Portalwelt bzw. zurück in die Heimat.
  switchWorld(target) {
    const r = data.realm;
    if (!r.type) return false;
    const from = r.inside || 'normal';
    target ??= from === 'normal' ? r.type : 'normal';
    if (target === from || (target !== 'normal' && !realm.WORLDS[target])) return false;
    r.stash[from] = Object.fromEntries(WORLD_KEYS.map((k) => [k, data[k]]));
    const next = r.stash[target] || (target === 'normal' ? fresh() : freshRealmWorld());
    delete r.stash[target];
    for (const k of WORLD_KEYS) data[k] = next[k];
    r.inside = target === 'normal' ? null : target;
    syncRealm();
    changed();
    return true;
  },
  // Gebäude-Stand der Heimat (auch wenn man gerade in einer Portalwelt ist)
  homeBuildings() {
    return data.realm.inside ? data.realm.stash.normal?.buildings || {} : data.buildings;
  },

  collected: (items = ITEMS) => items.reduce((n, item) => n + (data.owned[item.id] ? 1 : 0), 0),
};
