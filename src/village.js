import { ITEMS, RARITIES, CATEGORIES, PER_GROUP, getGroup, getItem, rollTier, rollItem } from './items.js';
import { state } from './state.js';
import * as buildings from './buildings.js';
import * as mine from './mine.js';
import * as garden from './garden.js';
import { render } from './art/core.js';
import { VILLAGER_ART, fishDraw, bottleDraw } from './art/village.js';

// Das Dorf: Bewohner mit Aufgaben, ein Marktstand und Angeln am Teich.

// ---------------------------------------------------------------- Bewohner

export const VILLAGERS = [
  { id: 'greta', name: 'Bäckerin Greta', x: 150, likes: ['crop', 'crop', 'fish'], hello: 'Frisches Brot braucht frische Zutaten!' },
  { id: 'ole', name: 'Fischer Ole', x: 236, likes: ['fish', 'fish', 'ore'], hello: 'Die Fische beißen heute gut, hab ich gehört.' },
  { id: 'anton', name: 'Bürgermeister Anton', x: 318, likes: ['item', 'ore', 'crop', 'fish'], hello: 'Das Dorf freut sich über jede helfende Hand.' },
  { id: 'lotte', name: 'Gärtnerin Lotte', x: 470, likes: ['crop', 'crop', 'item'], hello: 'Mein Garten ist mein ganzer Stolz.' },
  { id: 'jonas', name: 'Abenteurer Jonas', x: 548, likes: ['item', 'ore', 'ore'], hello: 'Ich plane eine große Reise – hilfst du mir?' },
];
export const MARKET = { id: 'hilde', name: 'Marktfrau Hilde', x: 392 };
export const villager = (id) => VILLAGERS.find((v) => v.id === id);

// Schwierigkeit: Gewicht, Belohnung und Wartezeit bis zur nächsten Aufgabe
export const DIFFICULTY = {
  leicht: { weight: 0.5, gold: [40, 100], itemChance: 0, minTier: 0 },
  mittel: { weight: 0.35, gold: [150, 350], itemChance: 0.4, minTier: 1 },
  schwer: { weight: 0.15, gold: [600, 1200], itemChance: 1, minTier: 2 },
};
export const NEXT_QUEST_SECONDS = [60, 180];

const v = () => state.village;
const between = (r, [a, b]) => a + Math.floor(r() * (b - a + 1));
const pick = (r, list) => list[Math.floor(r() * list.length)];

function pickDifficulty(r) {
  let u = r();
  for (const [key, d] of Object.entries(DIFFICULTY)) {
    u -= d.weight;
    if (u < 0) return key;
  }
  return 'leicht';
}

// Erzeugt eine machbare Aufgabe: Erz nur aus offenen Minen-Ebenen.
export function makeQuest(villagerId, r = Math.random) {
  const npc = villager(villagerId);
  const diff = pickDifficulty(r);
  const level = Object.keys(DIFFICULTY).indexOf(diff); // 0, 1, 2
  const depth = mine.depth();
  let types = npc.likes.filter((t) => t !== 'ore' || depth >= 0);
  if (!types.length) types = ['crop', 'fish'];
  const type = pick(r, types);
  let need;
  if (type === 'ore') {
    const tier = level === 0 ? 0 : level === 1 ? Math.ceil(depth * 0.6) : depth;
    need = { type, tier, n: between(r, [[3, 5], [6, 10], [12, 20]][level]) };
  } else if (type === 'crop') {
    const pool = [['karotte', 'weizen', 'kartoffel'], ['beeren', 'kuerbis', 'kartoffel'], ['kuerbis', 'sternenblume']][level];
    const id = pick(r, pool);
    need = { type, id, n: id === 'sternenblume' ? between(r, [1, 2]) : between(r, [[2, 4], [3, 5], [2, 3]][level]) };
  } else if (type === 'fish') {
    need = { type, tier: pick(r, [[0, 1], [1, 2], [3]][level]), n: between(r, [[2, 3], [1, 3], [1, 2]][level]) };
  } else {
    need = { type: 'item', cat: pick(r, CATEGORIES).id, tier: pick(r, [[0], [0, 1], [1, 2]][level]), n: 1 };
  }
  const d = DIFFICULTY[diff];
  const reward = { gold: between(r, d.gold), item: r() < d.itemChance ? d.minTier : null };
  return { villager: villagerId, difficulty: diff, need, reward };
}

export function quest(id, now = Date.now()) {
  const x = v();
  if (!x.quests[id] && (x.next[id] || 0) <= now) {
    x.quests[id] = makeQuest(id);
    state.changed();
  }
  return x.quests[id] || null;
}

// Wie viel vom Verlangten man hat
export function haveFor(need) {
  if (need.type === 'ore') return mine.ore(need.tier);
  if (need.type === 'crop') return garden.have(need.id);
  if (need.type === 'fish') return tierCount(need.tier);
  // Sammelstück: nur Duplikate zählen – das letzte Exemplar bleibt immer
  return getGroup(need.cat, RARITIES[need.tier].id).reduce((n, i) => n + state.duplicates(i.id), 0);
}
export const canComplete = (q) => !!q && haveFor(q.need) >= q.need.n;

export function describeNeed(need) {
  if (need.type === 'ore') return `${need.n}× ${mine.LEVELS[need.tier].ore}`;
  if (need.type === 'crop') return `${need.n}× ${garden.crop(need.id).name}`;
  if (need.type === 'fish') return `${need.n}× Fisch vom Rang ${RARITIES[need.tier].id}`;
  return `${need.n}× ${CATEGORIES.find((c) => c.id === need.cat).name}-Duplikat, Rang ${RARITIES[need.tier].id}`;
}

function takeNeed(need) {
  if (need.type === 'ore') return mine.spendOre(need.tier, need.n);
  if (need.type === 'crop') state.garden.crops[need.id] -= need.n;
  if (need.type === 'fish') {
    // die häufigsten Arten des Rangs zuerst abgeben
    let left = need.n;
    for (const f of FISH.filter((x) => x.tier === need.tier).sort((x, y) => fishCount(y.id) - fishCount(x.id))) {
      const take = Math.min(left, fishCount(f.id));
      v().fish[f.id] -= take;
      left -= take;
    }
  }
  if (need.type === 'item') {
    let left = need.n;
    for (const item of getGroup(need.cat, RARITIES[need.tier].id)) {
      while (left > 0 && state.duplicates(item.id) > 0) {
        state.useDuplicate(item.id);
        left--;
      }
    }
  }
  return true;
}

function cooldown(id, r = Math.random) {
  v().quests[id] = null;
  v().next[id] = Date.now() + between(r, NEXT_QUEST_SECONDS) * 1000;
}

// Gibt die Aufgabe ab. Liefert die Belohnung oder null.
export function complete(id) {
  const q = v().quests[id];
  if (!canComplete(q)) return null;
  takeNeed(q.need);
  const reward = { gold: q.reward.gold, item: null, isNew: false };
  if (q.reward.item !== null) {
    reward.item = rollItem({ minTier: q.reward.item });
    reward.isNew = !state.count(reward.item.id);
    state.addItems([reward.item], 'aufgaben');
  }
  state.addGold(reward.gold, 'aufgaben');
  v().done++;
  cooldown(id);
  state.changed();
  return { quest: q, ...reward };
}

export function decline(id) {
  cooldown(id);
  state.changed();
}

// ---------------------------------------------------------------- Angeln

// Fischarten: Rang (Chance wie am Brunnen), Marktwert, Aktivitätszeit und Aussehen.
// time: 'any' immer · 'day' morgens und tagsüber · 'night' nachts · 'twilight' morgens und abends
export const FISH = [
  // Rang D
  { id: 'weissfisch', name: 'Weißfisch', tier: 0, price: 8, time: 'any', color: [200, 10, 72], info: 'Flink und überall im Teich zu Hause.' },
  { id: 'rotauge', name: 'Rotauge', tier: 0, price: 9, time: 'day', color: [210, 12, 70], fin: [0, 65, 50], info: 'Erkennt man an den roten Augen und Flossen.' },
  { id: 'barsch', name: 'Flussbarsch', tier: 0, price: 10, time: 'day', color: [90, 35, 50], pattern: 'stripes', accent: [100, 40, 28], fin: [10, 70, 50], info: 'Gestreift und neugierig – schnappt nach allem.' },
  { id: 'schleie', name: 'Schleie', tier: 0, price: 10, time: 'twilight', shape: 'round', color: [75, 35, 38], info: 'Kommt in der Dämmerung aus dem Schlamm.' },
  { id: 'gruendling', name: 'Gründling', tier: 0, price: 7, time: 'any', shape: 'small', color: [30, 30, 50], pattern: 'spots', accent: [30, 30, 30], info: 'Klein, gefleckt und immer am Grund.' },
  { id: 'leuchtgrundel', name: 'Leuchtgrundel', tier: 0, price: 12, time: 'night', shape: 'small', color: [230, 25, 35], pattern: 'glow', info: 'Ihre Punkte leuchten nachts wie Glühwürmchen.' },
  // Rang C
  { id: 'forelle', name: 'Forelle', tier: 1, price: 15, time: 'any', color: [10, 50, 60], pattern: 'spots', accent: [0, 40, 30], info: 'Liebt klares, kühles Wasser und schnelle Würfe.' },
  { id: 'aal', name: 'Aal', tier: 1, price: 18, time: 'night', shape: 'eel', color: [60, 25, 30], fin: [60, 20, 20], info: 'Schlängelt sich nachts aus seinem Versteck.' },
  { id: 'brasse', name: 'Brasse', tier: 1, price: 14, time: 'day', shape: 'tall', color: [40, 35, 55], info: 'Hochrückig und glänzend wie Bronze.' },
  { id: 'rotfeder', name: 'Rotfeder', tier: 1, price: 16, time: 'day', color: [45, 45, 65], fin: [5, 75, 52], info: 'Leuchtend rote Flossen im Sonnenlicht.' },
  { id: 'mondbarsch', name: 'Mondbarsch', tier: 1, price: 20, time: 'night', color: [215, 30, 70], pattern: 'stripes', accent: [225, 40, 50], info: 'Silbrig-blau, als hätte er Mondlicht gefangen.' },
  // Rang B
  { id: 'karpfen', name: 'Karpfen', tier: 2, price: 30, time: 'any', shape: 'round', color: [35, 50, 45], info: 'Ein gemütlicher Grundfisch, der sich Zeit lässt.' },
  { id: 'zander', name: 'Zander', tier: 2, price: 34, time: 'twilight', shape: 'long', color: [120, 15, 55], pattern: 'stripes', accent: [120, 15, 35], info: 'Jagt im Zwielicht mit großen, glasigen Augen.' },
  { id: 'wels', name: 'Wels', tier: 2, price: 38, time: 'night', shape: 'long', whiskers: true, color: [260, 12, 30], fin: [260, 10, 22], info: 'Riesig, mit langen Barteln – ein Nachtjäger.' },
  { id: 'regenbogenforelle', name: 'Regenbogenforelle', tier: 2, price: 32, time: 'day', color: [160, 30, 62], pattern: 'rainbow', accent: [330, 70, 65], info: 'Ein rosa Regenbogen zieht sich über ihre Seite.' },
  { id: 'laternenfisch', name: 'Laternenfisch', tier: 2, price: 40, time: 'night', lure: true, color: [250, 40, 25], pattern: 'glow', info: 'Lockt mit einer kleinen Leuchtangel.' },
  // Rang A
  { id: 'hecht', name: 'Hecht', tier: 3, price: 80, time: 'any', shape: 'long', color: [110, 40, 40], pattern: 'spots', accent: [70, 50, 70], info: 'Lauert im Schilf und beißt kräftig zu.' },
  { id: 'stoer', name: 'Stör', tier: 3, price: 95, time: 'twilight', shape: 'long', armor: true, color: [210, 15, 45], info: 'Ein Urzeitfisch mit Knochenplatten auf dem Rücken.' },
  { id: 'geisterkarpfen', name: 'Geisterkarpfen', tier: 3, price: 110, time: 'night', shape: 'round', color: [190, 30, 88], fin: [190, 30, 75], pattern: 'glow', info: 'Durchscheinend blass – man sieht ihn nur nachts.' },
  { id: 'koi', name: 'Koi', tier: 3, price: 100, time: 'day', color: [40, 20, 94], pattern: 'koi', accent: [20, 90, 55], fin: [40, 20, 85], info: 'Weiß mit orangen Flecken – ein Glücksbringer.' },
  // Rang S
  { id: 'goldkarpfen', name: 'Goldkarpfen', tier: 4, price: 300, time: 'any', shape: 'round', color: [45, 90, 55], info: 'Glänzt in der Sonne wie ein kleiner Schatz.' },
  { id: 'nordlichtfisch', name: 'Nordlichtfisch', tier: 4, price: 380, time: 'night', color: [170, 70, 50], pattern: 'aurora', accent: [290, 70, 65], info: 'Schimmert grün und violett wie ein Nordlicht.' },
  // Rang SS
  { id: 'mondfisch', name: 'Mondfisch', tier: 5, price: 1000, time: 'night', shape: 'tall', color: [260, 60, 62], pattern: 'glow', info: 'Man erzählt, er steige nur bei Mondschein auf.' },
  { id: 'drachenfisch', name: 'Drachenfisch', tier: 5, price: 1200, time: 'day', shape: 'long', armor: true, color: [5, 80, 50], pattern: 'spots', accent: [45, 95, 60], info: 'Feuerrot mit goldenen Schuppen – eine Legende.' },
];
export const fishSpec = (id) => FISH.find((f) => f.id === id);

// Aktivität nach Tageszeit (Morgen, Tag, Abend, Nacht aus dem Tag-Nacht-Zyklus)
export const TIME_NAMES = { any: 'immer', day: 'tagsüber', night: 'nachts', twilight: 'in der Dämmerung' };
const ACTIVE = { any: ['Morgen', 'Tag', 'Abend', 'Nacht'], day: ['Morgen', 'Tag'], night: ['Nacht'], twilight: ['Morgen', 'Abend'] };
let dayPhase = 'Tag';
export const setDayPhase = (name) => (dayPhase = name);
export const isActive = (f, phase = dayPhase) => ACTIVE[f.time].includes(phase);
export const activeFish = (phase = dayPhase) => FISH.filter((f) => isActive(f, phase));

export const TREASURE_CHANCE = 0.03; // Flaschenpost mit Sammelstück
export const BITE_SECONDS = [3, 8]; // Wartezeit bis zum Biss
export const REACT_SECONDS = 0.9; // so lange hat man Zeit zum Einholen

// Würfelt aus, was anbeißen wird – beim Auswerfen, damit genau dieser Fisch
// in der Seesicht zum Haken schwimmt. Gutgeschrieben wird erst beim Einholen.
// Erst der Rang (Brunnen-Chancen), dann eine gerade aktive Art dieses Rangs.
// boost: Lockruf – mindestens einen Rang höher, keine Flaschenpost
export function rollCatch(r = Math.random, phase = dayPhase, boost = false) {
  if (!boost && r() < TREASURE_CHANCE) return { treasure: true, item: rollItem({ random: r }) };
  const tier = Math.min(RARITIES.length - 1, rollTier(0, r) + (boost ? Number(boost) : 0));
  const ofTier = FISH.filter((f) => f.tier === tier);
  const pool = ofTier.filter((f) => isActive(f, phase));
  const fish = (pool.length ? pool : ofTier)[Math.floor(r() * (pool.length || ofTier.length))];
  return { species: fish.id, tier, fish };
}

export function applyCatch(res) {
  const by = v().caughtBy;
  if (res.treasure) {
    const isNew = !state.count(res.item.id);
    state.addItems([res.item], 'angeln');
    by.bottle = (by.bottle || 0) + 1;
    return { ...res, isNew };
  }
  const isNew = !by[res.species];
  v().fish[res.species] = (v().fish[res.species] || 0) + 1;
  by[res.species] = (by[res.species] || 0) + 1;
  v().caught++;
  state.changed();
  return { ...res, isNew };
}

export const catchFish = (r = Math.random, phase) => applyCatch(rollCatch(r, phase));

// Bestand und Fangbuch je Art
export const fishCount = (id) => v().fish[id] || 0;
export const caughtTotal = (id) => v().caughtBy[id] || 0;
export const bottlesFound = () => v().caughtBy.bottle || 0;
// Fische eines Rangs zusammen (für Aufgaben)
export const tierCount = (tier) => FISH.filter((f) => f.tier === tier).reduce((n, f) => n + fishCount(f.id), 0);

// ---------------------------------------------------------------- Markt

// Ernte-Preise beim Verkauf
export const CROP_PRICE = { karotte: 8, weizen: 10, kartoffel: 14, beeren: 14, kuerbis: 70, sternenblume: 220 };
// Saatgut auf Vorrat: 20 % günstiger als direkt im Garten
export const SEED_DISCOUNT = 0.8;
export const seedPrice = (id) => Math.round(garden.crop(id).seed * SEED_DISCOUNT);
// Sammelstücke: Verkauf am Stand für das Fünffache, Ankauf gesuchter Stücke für das Doppelte
export const STOCK_FACTOR = 5;
export const WANT_FACTOR = 2;
export const STOCK_SIZE = 4;
export const WANT_SIZE = 3;
export const REFRESH_MINUTES = 20;

function pickItem(tier, r, preferMissing) {
  for (let i = 0; i < 12; i++) {
    const cat = pick(r, CATEGORIES);
    const item = getGroup(cat.id, RARITIES[tier].id)[Math.floor(r() * PER_GROUP)];
    if (!preferMissing || !state.count(item.id) || i === 11) return item;
  }
  return null;
}

// Neues Angebot: Stücke zum Kaufen (bevorzugt fehlende) und gesuchte Stücke (bevorzugt eigene Duplikate)
export function refreshMarket(now = Date.now(), r = Math.random) {
  const m = v().market;
  m.stock = Array.from({ length: STOCK_SIZE }, () => {
    const item = pickItem(Math.min(rollTier(0, r), 3), r, true);
    return { id: item.id, sold: false };
  });
  const dupes = ITEMS.filter((i) => state.duplicates(i.id) > 0 && i.tier <= 3);
  m.wants = Array.from({ length: WANT_SIZE }, () => {
    const item = dupes.length && r() < 0.7 ? pick(r, dupes) : pickItem(Math.min(rollTier(0, r), 3), r, false);
    return { id: item.id, done: false };
  });
  m.refreshAt = now + REFRESH_MINUTES * 60000;
  state.changed();
}

export function market(now = Date.now()) {
  if (!v().market.refreshAt || v().market.refreshAt <= now) refreshMarket(now);
  return v().market;
}
export const marketRefreshIn = (now = Date.now()) => Math.max(0, Math.ceil((v().market.refreshAt - now) / 1000));

export function buySeeds(id, n = 1) {
  if (!state.spend(seedPrice(id) * n, 'markt')) return false;
  v().seeds[id] = (v().seeds[id] || 0) + n;
  state.changed();
  return true;
}
export const seeds = (id) => v().seeds[id] || 0;

// Saatpäckchen aus dem Vorrat verbrauchen (für den Garten)
export function useSeed(id) {
  if (!seeds(id)) return false;
  v().seeds[id]--;
  return true;
}

export function sellCrops(id, n = garden.have(id)) {
  n = Math.min(n, garden.have(id));
  if (n <= 0) return 0;
  state.garden.crops[id] -= n;
  state.addGold(n * CROP_PRICE[id], 'markt');
  return n * CROP_PRICE[id];
}

export function sellFish(id, n = fishCount(id)) {
  const f = fishSpec(id);
  n = Math.min(n, fishCount(id));
  if (!f || n <= 0) return 0;
  v().fish[id] -= n;
  state.addGold(n * f.price, 'markt');
  return n * f.price;
}

export const stockPrice = (item) => item.sell * STOCK_FACTOR;
export const wantPrice = (item) => item.sell * WANT_FACTOR;

export function buyStock(i) {
  const s = market().stock[i];
  const item = s && getItem(s.id);
  if (!item || s.sold || !state.spend(stockPrice(item), 'markt')) return null;
  s.sold = true;
  const isNew = !state.count(item.id);
  state.addItems([item], 'markt');
  return { item, isNew };
}

// Verkauf eines gesuchten Stücks – nur ein Duplikat, nie das letzte Exemplar
export function sellWanted(i) {
  const w = market().wants[i];
  const item = w && getItem(w.id);
  if (!item || w.done || state.duplicates(item.id) < 1) return 0;
  state.useDuplicate(item.id);
  w.done = true;
  state.addGold(wantPrice(item), 'markt');
  return wantPrice(item);
}

// ---------------------------------------------------------------- Bilder

const cache = new Map();
const cached = (key, make) => {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
};
export const villagerImage = (id) => cached(`v-${id}`, () => render(VILLAGER_ART[id], 9100 + id.length * 31, 1));
export const fishImage = (id) => {
  const f = fishSpec(id) || FISH[0];
  return cached(`f-${f.id}`, () => render(fishDraw(f), 9300 + FISH.indexOf(f) * 13, f.tier));
};
// Stellvertreter-Bild eines Rangs (für Aufgaben)
export const tierFishImage = (tier) => fishImage(FISH.find((f) => f.tier === tier).id);
export const bottleImage = () => cached('bottle', () => render(bottleDraw, 9400, 2));
