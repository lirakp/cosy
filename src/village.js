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
  if (need.type === 'fish') return v().fish[need.tier] || 0;
  // Sammelstück: nur Duplikate zählen – das letzte Exemplar bleibt immer
  return getGroup(need.cat, RARITIES[need.tier].id).reduce((n, i) => n + state.duplicates(i.id), 0);
}
export const canComplete = (q) => !!q && haveFor(q.need) >= q.need.n;

export function describeNeed(need) {
  if (need.type === 'ore') return `${need.n}× ${mine.LEVELS[need.tier].ore}`;
  if (need.type === 'crop') return `${need.n}× ${garden.crop(need.id).name}`;
  if (need.type === 'fish') return `${need.n}× ${FISH[need.tier].name}`;
  return `${need.n}× ${CATEGORIES.find((c) => c.id === need.cat).name}-Duplikat, Rang ${RARITIES[need.tier].id}`;
}

function takeNeed(need) {
  if (need.type === 'ore') return mine.spendOre(need.tier, need.n);
  if (need.type === 'crop') state.garden.crops[need.id] -= need.n;
  if (need.type === 'fish') v().fish[need.tier] -= need.n;
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

export const FISH = [
  { name: 'Weißfisch', price: 8 },
  { name: 'Forelle', price: 15 },
  { name: 'Karpfen', price: 30 },
  { name: 'Hecht', price: 80 },
  { name: 'Goldkarpfen', price: 300 },
  { name: 'Mondfisch', price: 1000 },
];
export const TREASURE_CHANCE = 0.03; // Flaschenpost mit Sammelstück
export const BITE_SECONDS = [3, 8]; // Wartezeit bis zum Biss
export const REACT_SECONDS = 0.9; // so lange hat man Zeit zum Einholen

// Was am Haken hängt: ein Fisch (Rang nach den Brunnen-Chancen) oder selten ein Schatz.
// Würfelt aus, was anbeißen wird – beim Auswerfen, damit genau dieser Fisch
// in der Seesicht zum Haken schwimmt. Gutgeschrieben wird erst beim Einholen.
export function rollCatch(r = Math.random) {
  if (r() < TREASURE_CHANCE) return { treasure: true, item: rollItem({ random: r }) };
  const tier = rollTier(0, r);
  return { tier, fish: FISH[tier] };
}

export function applyCatch(res) {
  const by = v().caughtBy;
  if (res.treasure) {
    const isNew = !state.count(res.item.id);
    state.addItems([res.item], 'angeln');
    by.bottle = (by.bottle || 0) + 1;
    return { ...res, isNew };
  }
  v().fish[res.tier] = (v().fish[res.tier] || 0) + 1;
  by[res.tier] = (by[res.tier] || 0) + 1;
  v().caught++;
  state.changed();
  return res;
}

export const catchFish = (r = Math.random) => applyCatch(rollCatch(r));

// Für das Angelbuch: wie oft eine Art je gefangen wurde
export const caughtTotal = (tier) => v().caughtBy[tier] || 0;
export const bottlesFound = () => v().caughtBy.bottle || 0;
export const FISH_INFO = [
  'Flink und überall im Teich zu Hause.',
  'Liebt klares, kühles Wasser und schnelle Würfe.',
  'Ein gemütlicher Grundfisch, der sich Zeit lässt.',
  'Lauert im Schilf und beißt kräftig zu.',
  'Glänzt in der Sonne wie ein kleiner Schatz.',
  'Man erzählt, er steige nur bei Mondschein auf.',
];

export const fishCount = (tier) => v().fish[tier] || 0;

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

export function sellFish(tier, n = fishCount(tier)) {
  n = Math.min(n, fishCount(tier));
  if (n <= 0) return 0;
  v().fish[tier] -= n;
  state.addGold(n * FISH[tier].price, 'markt');
  return n * FISH[tier].price;
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
export const fishImage = (tier) => cached(`f-${tier}`, () => render(fishDraw(tier), 9300 + tier * 13, tier));
export const bottleImage = () => cached('bottle', () => render(bottleDraw, 9400, 2));
