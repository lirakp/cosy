import { RARITIES, rollItem, getItem } from './items.js';
import { state } from './state.js';
import * as buildings from './buildings.js';
import * as buffs from './buffs.js';
import * as realm from './realm.js';
import * as companions from './companions.js';
import { party, type, pickCat, pickMemory, memoriesSeen, MIN_CHANCE } from './dungeon.js';
import { runChance } from './bossrush.js';
import * as magic from './magic.js';
import * as guild from './guild.js';

// Abstieg: Das Dungeon-Team steigt Etage für Etage hinab – alle FLOOR_SECONDS
// eine, auch offline – bis es fällt. Jede Etage ist schwerer; alle 5 Etagen
// wartet ein Wächter, alle 10 ein Etagenboss mit sicherem Sammelstück.
// Zwischendurch gibt es Ereignis-Räume. Die Beute sammelt sich im Rucksack:
// Heimkehren sichert alles, wer nach einer Niederlage aufgibt, verliert die Hälfte.

export const FLOOR_SECONDS = 10;
export const MAX_FLOORS_PER_TICK = 20; // Sicherung: höchstens so viele Etagen auf einmal
// Läuft nur, solange gespielt wird (wie der Bossrush): nach einer Pause wird nichts nachgeholt
export const PAUSE_GAP = 30;
export const BASE_NEED = 40; // Stärke für Etage 1 (× Art)
export const GUARD_EVERY = 5;
export const BOSS_EVERY = 10;
export const GUARD_MULT = 1.5;
export const BOSS_MULT = 2.5;
export const ITEM_CHANCE = 0.08; // Sammelstück auf einer normalen Etage
export const GUARD_ITEM_CHANCE = 0.5; // Sammelstück beim Wächter (Etagenboss: immer)
// Lange Läufe: höchstens so hohe Siegchance je Etage (ein starkes Team hält Stunden durch)
export const RUN_MAX_CHANCE = 0.9998;
// Anforderung wächst linear mit der Tiefe
export const LINEAR = 0.03;
export const EVENT_CHANCE = 0.25; // Ereignis-Raum statt Kampf (nicht auf Wächter-/Boss-Etagen)
export const REVIVE_BASE = 300;
export const REVIVE_STEP = 150;
export const REVIVE_MAX = 15000;
export const RETREAT_LOSS = 0.5; // so viel geht verloren, wer nach einer Niederlage aufgibt
export const TRAP_MALUS = 0.1; // Falle: −10 % Stärke für den Rest des Laufs
export const MERCHANT_BOOST = 0.15; // Händler: +15 % Stärke
export const MAX_BOOST = 0.5; // Stärkungen durch Händler und Erinnerungen zusammen höchstens +50 %
export const MERCHANT_PRICE = (floor) => Math.min(8000, 200 + floor * 60);

// Ereignis-Räume und ihre Gewichte je Dungeon-Art
export const EVENTS = {
  schatz: { name: 'Schatzraum', text: 'Eine vergessene Truhe – ein Sammelstück mehr im Rucksack.' },
  quelle: { name: 'Heilende Quelle', text: 'Das Team füllt eine Flasche: Die nächste Niederlage wird kostenlos überstanden.' },
  haendler: { name: 'Händler im Dunkeln', text: 'Ein Händler bietet Stärkungen an – gegen Gold.' },
  falle: { name: 'Fallenkorridor', text: 'Stacheln und Speere! Das Team ist für den Rest des Laufs geschwächt.' },
  erinnerung: { name: 'Erinnerung', text: 'Die Zeitschleife zeigt eine Szene aus alten Zeiten.' },
};
const EVENT_WEIGHTS = {
  blut: { schatz: 3, quelle: 2, haendler: 2, falle: 2 },
  dornen: { schatz: 3, quelle: 2, haendler: 1, falle: 5 },
  schleife: { schatz: 3, quelle: 2, haendler: 2, falle: 1, erinnerung: 4 },
};

const d = () => state.dungeon;
export const current = () => d().descent || null;
export const best = (t) => d().depthBest?.[t] || 0;

const kindOf = (floor) => (floor % BOSS_EVERY === 0 ? 'boss' : floor % GUARD_EVERY === 0 ? 'waechter' : 'etage');
export const KIND_NAMES = { etage: 'Etage', waechter: 'Wächter', boss: 'Etagenboss' };

// Stärke, die eine Etage verlangt
export function need(floor, typeId) {
  const mult = kindOf(floor) === 'boss' ? BOSS_MULT : kindOf(floor) === 'waechter' ? GUARD_MULT : 1;
  return Math.round(BASE_NEED * type(typeId).needMult * (1 + LINEAR * (floor - 1)) * mult);
}
export const effectivePower = (x = current()) => Math.round(x.power * (1 + x.boost - x.malus));
export function chance(floor, x = current()) {
  // Fallen schwächen das Team (statt direkt Erfolgschance zu kosten)
  const trap = type(x.type).trap ? type(x.type).trap[Math.min(5, Math.floor(floor / 100))] : 0;
  return buffs.gladiator(runChance((effectivePower(x) * (1 - trap)) / need(floor, x.type) + party.gemSum('smaragd')));
}
export const reviveCost = (x = current()) => Math.min(REVIVE_MAX, REVIVE_BASE + REVIVE_STEP * (x?.floor || 0));
export const remaining = (now = Date.now()) => (current()?.status === 'running' ? Math.max(0, Math.ceil((current().next - now) / 1000)) : 0);
// Mindest-Rang der Beute: alle 10 Etagen einer mehr
// Mindest-Rang der Beute: alle 100 Etagen einer mehr, höchstens A (Etagenboss: einer mehr)
const minTierAt = (floor) => Math.min(3, Math.floor(floor / 100));

export function start(typeId, now = Date.now()) {
  if (d().run || current() || !buildings.owned('dungeon') || !party.heroIds().length) return false;
  d().descent = newRun(typeId, now);
  state.changed();
  return true;
}
function newRun(typeId, now) {
  return {
    type: type(typeId).id,
    power: party.teamPower(),
    boost: 0,
    malus: 0,
    floor: 1, // Etage, die als Nächstes ansteht
    status: 'running', // running · down · merchant
    next: now + FLOOR_SECONDS * 1000,
    heal: 0,
    revives: 0,
    loot: { gold: 0, items: [] },
    log: [],
    memories: [],
  };
}

function addItem(x, minTier, rand) {
  const t = type(x.type);
  const item = rollItem({ minTier, cat: pickCat(t, rand), random: rand });
  x.loot.items.push(item.id);
  return item;
}

function log(x, entry) {
  x.log.unshift(entry);
  x.log.length = Math.min(x.log.length, 8);
}

function pickEvent(x, rand) {
  const w = EVENT_WEIGHTS[x.type] || EVENT_WEIGHTS.blut;
  let u = rand() * Object.values(w).reduce((a, b) => a + b, 0);
  for (const [id, n] of Object.entries(w)) {
    u -= n;
    if (u < 0) return id;
  }
  return 'schatz';
}

// Eine Etage auswerten
function resolve(x, rand) {
  const floor = x.floor;
  const kind = kindOf(floor);
  if (kind === 'etage' && rand() < EVENT_CHANCE) {
    const ev = pickEvent(x, rand);
    if (ev === 'schatz') addItem(x, minTierAt(floor), rand);
    if (ev === 'quelle') x.heal++;
    if (ev === 'falle') x.malus = Math.min(0.6, x.malus + TRAP_MALUS);
    if (ev === 'erinnerung') {
      const m = pickMemory(rand);
      x.memories.push(m.id);
      if (!memoriesSeen().includes(m.id)) d().memories = [...memoriesSeen(), m.id];
      // die Szene stärkt oder erschüttert das Team
      x.boost = Math.max(-0.3, Math.min(MAX_BOOST, x.boost + (rand() < 0.5 ? 0.1 : -0.05)));
    }
    log(x, { floor, event: ev });
    if (ev === 'haendler') {
      x.status = 'merchant';
      return;
    }
    x.floor++;
    return;
  }
  const odds = chance(floor, x);
  if (rand() < odds) {
    guild.record('descent');
    // Gold wächst mit der Tiefe, aber gebremst (Wurzel) – lange Läufe sollen nicht ausufern
    const gold = Math.round(4 * (1 + Math.sqrt(floor)) * type(x.type).goldMult * realm.goldFactor() * (1 + companions.bonus('dungeonGold')) * (kind === 'boss' ? 5 : kind === 'waechter' ? 2 : 1) * (1 + party.gemSum('saphir')));
    x.loot.gold += gold;
    const itemChance = kind === 'boss' ? 1 : kind === 'waechter' ? GUARD_ITEM_CHANCE : ITEM_CHANCE;
    if (rand() < itemChance + party.gemSum('topas')) addItem(x, Math.min(5, minTierAt(floor) + (kind === 'boss' ? 1 : 0)), rand);
    log(x, { floor, kind, win: true, odds });
    x.floor++;
    return;
  }
  log(x, { floor, kind, win: false, odds });
  // heilende Quelle: einmal kostenlos weiter
  if (x.heal > 0) {
    x.heal--;
    log(x, { floor, event: 'geheilt' });
    return;
  }
  // Schutzzauber (Kampf-Schule): wehrt eine Niederlage ab
  if (magic.useWard()) {
    log(x, { floor, event: 'geschuetzt' });
    return;
  }
  x.status = 'down';
}

// Rechnet alle fälligen Etagen ab
export function tick(now = Date.now(), rand = Math.random) {
  const x = current();
  if (!x || x.status !== 'running') return 0;
  if (now - x.next > PAUSE_GAP * 1000) {
    x.next = now + FLOOR_SECONDS * 1000;
    state.changed();
    return 0;
  }
  let n = 0;
  while (x.status === 'running' && now >= x.next && n < MAX_FLOORS_PER_TICK) {
    resolve(x, rand);
    x.next += FLOOR_SECONDS * 1000;
    n++;
  }
  if (x.status === 'running' && now >= x.next) x.next = now + FLOOR_SECONDS * 1000;
  if (n) {
    d().depthBest = { ...d().depthBest, [x.type]: Math.max(best(x.type), x.floor - 1) };
    state.changed();
  }
  return n;
}

// Händler: Stärkung kaufen oder ablehnen – danach geht es weiter
export function merchant(buy, now = Date.now()) {
  const x = current();
  if (!x || x.status !== 'merchant') return false;
  if (buy) {
    if (!state.spend(MERCHANT_PRICE(x.floor), 'dungeon')) return false;
    x.boost = Math.min(MAX_BOOST, x.boost + MERCHANT_BOOST);
  }
  x.status = 'running';
  x.floor++;
  x.next = now + FLOOR_SECONDS * 1000;
  state.changed();
  return true;
}

export function revive(now = Date.now()) {
  const x = current();
  if (!x || x.status !== 'down' || !state.spend(reviveCost(), 'dungeon')) return false;
  x.status = 'running';
  x.revives++;
  x.next = now + FLOOR_SECONDS * 1000;
  state.changed();
  return true;
}

// Heimkehren: Rucksack in die Sammlung. Wer nach einer Niederlage aufgibt,
// verliert die Hälfte von Gold und Stücken.
export function retreat(rand = Math.random) {
  const x = current();
  if (!x) return null;
  if (x.status === 'running') tick();
  const y = current();
  const res = bank(y, y.status === 'down', rand);
  d().descent = null;
  state.changed();
  return res;
}

// Rucksack gutschreiben (mit Verlust, wenn man nach einer Niederlage aufgibt)
function bank(x, lost, rand) {
  let gold = x.loot.gold;
  let ids = [...x.loot.items];
  if (lost) {
    gold = Math.round(gold * (1 - RETREAT_LOSS));
    ids = ids.filter(() => rand() >= RETREAT_LOSS);
  }
  const items = ids.map(getItem).filter(Boolean);
  const seen = new Set();
  const result = items.map((item) => {
    const isNew = !state.count(item.id) && !seen.has(item.id);
    seen.add(item.id);
    return { item, isNew };
  });
  state.addGold(gold, 'dungeon');
  state.addItems(items, 'dungeon');
  return { type: x.type, floors: x.floor - 1, gold, items: result, lost, lostItems: x.loot.items.length - items.length };
}

export const rankOf = (t) => RARITIES[t].id;
