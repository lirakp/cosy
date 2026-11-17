import { RARITIES, CATEGORIES, getItem, rollItem } from './items.js';
import { state } from './state.js';
import * as buildings from './buildings.js';
import * as buffs from './buffs.js';
import { createParty, emptyMember } from './party.js';
import * as magic from './magic.js';
import * as realm from './realm.js';
import * as companions from './companions.js';

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

// Drei Arten von Dungeons, jede in allen sechs Rängen (18 Dungeons):
//   needMult  – wie viel mehr Stärke nötig ist · goldMult – mehr Gold
//   extraStandard / extraBonus – zusätzliche Stücke · tierUp – Bonus-Stücke einen Rang höher
//   trap      – Fallen: so viel Erfolgschance geht verloren (je Rang)
//   weights   – Anteil der Beute aus diesen Kategorien (der Rest verteilt sich auf die übrigen)
export const TYPES = [
  {
    id: 'blut', name: 'Blutdungeon', icon: '🩸',
    text: 'Gefährlicher und stärker bewacht – dafür mehr Beute auf höherem Rang, vor allem Waffen und Rüstungen.',
    needMult: 1.4, goldMult: 1.5, extraStandard: 0, extraBonus: 1, tierUp: 1,
    weights: { waffen: 0.4, ruestung: 0.4 },
    names: ['Blutkeller', 'Rote Gruft', 'Blutkristallmine', 'Hort des Blutdrachen', 'Blutfeste', 'Abgrund der roten Ewigkeit'],
  },
  {
    id: 'dornen', name: 'Dornendungeon', icon: '🌿',
    text: 'Voller Fallen, Ranken und Stachelgruben – die Fallen kosten Erfolgschance. Dafür viele Lebewesen und Relikte.',
    needMult: 1.15, goldMult: 1.2, extraStandard: 2, extraBonus: 1, tierUp: 0,
    trap: [0.08, 0.1, 0.12, 0.14, 0.17, 0.2],
    weights: { lebewesen: 0.4, relikte: 0.4 },
    names: ['Dornenkeller', 'Rankenkrypta', 'Dornenschlucht', 'Fallengarten des Drachen', 'Dornenfeste', 'Labyrinth der tausend Dornen'],
  },
  {
    id: 'schleife', name: 'Schleifendungeon', icon: '⌛',
    text: 'Eine Zeitschleife: Die Helden durchleben Erinnerungen an grausame alte Zeiten. Hier gibt es am meisten Monster und Artefakte.',
    needMult: 1.25, goldMult: 1.3, extraStandard: 0, extraBonus: 1, tierUp: 0,
    weights: { monster: 0.45, artefakte: 0.45 },
    memories: true,
    names: ['Echo des Kellers', 'Krypta der Erinnerung', 'Schleife der Kristallmine', 'Drachenhort der Vergangenheit', 'Feste der verlorenen Stunde', 'Schleife der Ewigkeit'],
  },
];
export const type = (id) => TYPES.find((t) => t.id === id) || TYPES[0];

// Erinnerungen aus dem Schleifendungeon – sie werden in der Chronik gesammelt
export const MEMORIES = [
  { id: 'rabenfurt', title: 'Das Erntefest von Rabenfurt', text: 'Laternen, Musik, der Duft von frischem Brot. Dann verstummte die Musik. Am Morgen fand man nur noch die umgestürzten Tische – und die Laternen brannten weiter, als hätte niemand bemerkt, dass keiner mehr da war.' },
  { id: 'nordtor', title: 'Die letzte Wache am Nordtor', text: 'Sieben Wächter hielten das Tor, als die Schattenreiter kamen. Sie hielten es bis zum Morgengrauen. Als die Sonne aufging, stand nur noch das Tor.' },
  { id: 'bibliothek', title: 'Die Bibliothek in Flammen', text: 'Ein alter Gelehrter trug Buch um Buch hinaus, während das Dach brannte. Er rettete dreiundvierzig. Das vierundvierzigste hielt er noch in den Armen, als man ihn fand.' },
  { id: 'silbersee', title: 'Der Brunnen von Silbersee', text: 'Jemand vergiftete den Dorfbrunnen in einer stillen Nacht. Die Glocke läutete drei Tage lang. Danach läutete sie nie wieder.' },
  { id: 'bankett', title: 'Das Bankett des Königs', text: 'Hundert Gäste, ein Trinkspruch auf den Frieden. Nur der König rührte seinen Becher nicht an. Die Erinnerung endet mit klirrenden Gläsern – und einer Stille, die nicht mehr aufhört.' },
  { id: 'dornwall', title: 'Die Belagerung von Dornwall', text: 'Vierzig Tage Hunger hinter den Mauern. Am einundvierzigsten öffnete jemand das Tor. Niemand weiß, wer – nur, dass danach keiner mehr übrig war, um es zu erzählen.' },
  { id: 'kloster', title: 'Das versunkene Kloster', text: 'Die Mönche sangen, als das Wasser stieg. Sie sangen weiter, auch als es die Glocken erreichte. Manchmal hört man das Lied noch unter dem See.' },
  { id: 'kreuzweg', title: 'Der Verrat am Kreuzweg', text: 'Zwei Brüder trafen sich, um Frieden zu schließen. Nur einer kam zurück – und er trug die Krone des anderen.' },
  { id: 'rotmond', title: 'Die Nacht der roten Monde', text: 'Als drei Monde rot wurden, erwachten die Toten im Hügelgrab. Das Dorf am Fuß des Hügels steht noch: leer, mit gedeckten Tischen.' },
  { id: 'aschefeld', title: 'Die Schlacht am Aschefeld', text: 'Zwei Heere, ein Nebelmorgen. Als sich der Nebel hob, hatten beide verloren. Nur die Raben zählten die Gefallenen.' },
  { id: 'turm', title: 'Der Pakt im Turm', text: 'Ein Magier tauschte die Seelen seiner Schüler gegen ewige Jugend. Er ist immer noch jung. Und immer noch allein in seinem Turm.' },
  { id: 'weisswald', title: 'Das letzte Lied der Elfen', text: 'Die Elfen des Weißwalds sangen, während die Äxte kamen. Mit jedem Baum wurde ein Lied stiller. Der letzte fiel mitten in einer Strophe.' },
];
export const memory = (id) => MEMORIES.find((m) => m.id === id);
export const memoriesSeen = () => d().memories || [];
// Erinnerung für einen Durchlauf: zuerst eine noch nicht gesehene
function pickMemory(r = Math.random) {
  const fresh = MEMORIES.filter((m) => !memoriesSeen().includes(m.id));
  const pool = fresh.length ? fresh : MEMORIES;
  return pool[Math.floor(r() * pool.length)];
}

// Name, Anforderung und Gold eines Dungeons (Art × Rang)
export function info(level, typeId) {
  const t = type(typeId);
  const l = LEVELS[level];
  return {
    ...l,
    type: t.id,
    typeName: t.name,
    name: t.names[level],
    need: Math.round(l.need * t.needMult),
    gold: Math.round(l.gold * t.goldMult),
    standard: l.standard + (l.standard || level > 0 ? t.extraStandard : 0),
    bonus: l.bonus + t.extraBonus,
    minTier: Math.min(5, l.minTier + t.tierUp),
    trap: t.trap ? t.trap[level] : 0,
  };
}

// Kategorie der Beute nach den Schwerpunkten der Dungeon-Art
function pickCat(t, r) {
  let u = r();
  for (const [cat, w] of Object.entries(t.weights)) {
    u -= w;
    if (u < 0) return cat;
  }
  const rest = CATEGORIES.filter((c) => !(c.id in t.weights));
  return rest[Math.floor(r() * rest.length)].id;
}

export const MIN_CHANCE = 0.05;
export const MAX_CHANCE = 0.95;

const d = () => state.dungeon;

// Dungeon-Team: fünf Plätze; gesperrt, solange eine Erkundung läuft.
// Wer in der Arena kämpft, kann nicht in den Dungeon und umgekehrt.
export const party = createParty({
  name: 'dungeon',
  members: () => state.dungeon.team,
  tier: () => buildings.tier('dungeon'),
  other: () => [...state.arena.team, ...(state.bossrush?.team || [])],
  locked: () => !!state.dungeon.run,
  bonus: 'dungeonPower',
});
export { emptyMember };

export const power = () => party.teamPower();

// Erfolgschance: Team-Stärke im Verhältnis zur Anforderung, nie ganz sicher, nie ganz aussichtslos.
// Im Dornendungeon kosten Fallen zusätzlich Erfolgschance.
export function chance(level, teamPower = power(), typeId = 'blut') {
  if (!teamPower) return 0;
  const l = info(level, typeId);
  const base = Math.min(MAX_CHANCE, teamPower / l.need) * (1 - l.trap);
  return buffs.gladiator(Math.max(MIN_CHANCE, base));
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

export function start(level, typeId = 'blut', now = Date.now()) {
  if (typeof typeId === 'number') [now, typeId] = [typeId, 'blut'];
  const heroes = party.heroIds();
  if (run() || !LEVELS[level] || !unlocked(level) || !heroes.length) return false;
  // Die Stärke beim Aufbruch zählt – das Team ist bis zur Rückkehr gesperrt.
  d().run = { level, type: type(typeId).id, heroes, power: power(), shield: magic.useShield(), start: now, end: now + LEVELS[level].seconds * 1000 };
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
  const level = info(r.level, r.type);
  const t = type(r.type);
  // ältere Erkundungen ohne gespeicherte Stärke: Stärke der losgezogenen Helden
  const fallback = () => r.heroes.reduce((sum, id) => sum + (getItem(id) ? party.heroPower(getItem(id)) : 0), 0);
  const base = chance(r.level, r.power ?? fallback(), t.id);
  const odds = r.shield ? magic.shielded(base, r.shield) : base;
  const result = { level, odds, success: Math.random() < odds, gold: 0, items: [], trapped: false, memory: null };
  d().run = null;
  // Dornendungeon: wer scheitert, ist meist in eine Falle getappt
  if (!result.success && level.trap) result.trapped = true;
  // Schleifendungeon: eine Erinnerung an alte Zeiten (auch beim Scheitern)
  if (t.memories) {
    result.memory = pickMemory();
    result.newMemory = !memoriesSeen().includes(result.memory.id);
    if (result.newMemory) d().memories = [...memoriesSeen(), result.memory.id];
  }

  if (result.success) {
    result.gold = Math.round(level.gold * (0.8 + Math.random() * 0.4) * realm.goldFactor() * (1 + companions.bonus('dungeonGold')));
    const found = [];
    for (let i = 0; i < level.standard; i++) found.push(rollItem({ tier: 0, cat: pickCat(t, Math.random) }));
    for (let i = 0; i < level.bonus; i++) found.push(rollItem({ minTier: level.minTier, cat: pickCat(t, Math.random) }));
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
