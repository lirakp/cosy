import { ITEMS, RARITIES, getGroup, rollTier, rollItem, CATEGORIES, PER_GROUP } from './items.js';
import { state } from './state.js';
import * as mine from './mine.js';
import { render } from './art/core.js';
import { traderDraw } from './art/ores.js';

// Der Erzhändler kommt selten vorbei und setzt sich neben den Brunnen.
// Er tauscht Erz gegen Sammelstücke.

// Ankunftschance je Prüfung: so selten wie ein Zug auf Rang A oder S (7,4 % + 1,5 %)
export const ARRIVE_CHANCE = RARITIES[3].chance + RARITIES[4].chance;
export const CHECK_MINUTES = 3; // so oft wird gewürfelt, solange das Spiel läuft
export const STAY_MINUTES = 6; // so lange bleibt er
export const OFFERS = 4;
// Preis in Erz desselben Rangs
export const OFFER_PRICE = [20, 20, 25, 30, 40, 50];
export const SURPRISE_PRICE = [10, 10, 12, 15, 20, 25];
export const SURPRISE_STOCK = 3; // Überraschungstausche pro Besuch

const t = () => state.mine.trader;

export const present = (now = Date.now()) => t().until > now;
export const remaining = (now = Date.now()) => Math.max(0, Math.ceil((t().until - now) / 1000));

function pickItem(tier) {
  // möglichst etwas, das noch fehlt
  for (let i = 0; i < 12; i++) {
    const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const item = getGroup(cat.id, RARITIES[tier].id)[Math.floor(Math.random() * PER_GROUP)];
    if (!state.count(item.id) || i === 11) return item;
  }
  return rollItem({ tier });
}

function makeOffers() {
  const deepest = Math.max(0, mine.depth());
  const tiers = [deepest, ...Array.from({ length: OFFERS - 1 }, () => Math.min(rollTier(), Math.max(deepest + 1, 2)))];
  return tiers
    .sort((a, b) => a - b)
    .map((tier) => ({ id: pickItem(tier).id, tier, price: OFFER_PRICE[tier], sold: false }));
}

export function arrive(now = Date.now()) {
  Object.assign(t(), { until: now + STAY_MINUTES * 60000, offers: makeOffers(), surprise: SURPRISE_STOCK });
  state.changed();
}

// Einmal pro Sekunde aufgerufen. Liefert 'arrived' oder 'left', wenn sich etwas ändert.
export function tick(now = Date.now()) {
  const x = t();
  if (x.until && x.until <= now) {
    x.until = 0;
    x.offers = [];
    x.nextRoll = now + CHECK_MINUTES * 60000;
    state.changed();
    return 'left';
  }
  if (present(now)) return null;
  if (!x.nextRoll) x.nextRoll = now + CHECK_MINUTES * 60000;
  if (now < x.nextRoll) return null;
  x.nextRoll = now + CHECK_MINUTES * 60000;
  if (Math.random() < ARRIVE_CHANCE) {
    arrive(now);
    return 'arrived';
  }
  state.save();
  return null;
}

export const offers = () => t().offers;
export const surpriseLeft = () => t().surprise;

export function buyOffer(index) {
  const o = t().offers[index];
  if (!o || o.sold || !present() || !mine.spendOre(o.tier, o.price)) return null;
  o.sold = true;
  const item = ITEMS.find((i) => i.id === o.id);
  const isNew = !state.count(item.id);
  state.addItems([item]);
  return { item, isNew };
}

export function surprise(tier) {
  if (!present() || t().surprise <= 0 || !mine.spendOre(tier, SURPRISE_PRICE[tier])) return null;
  t().surprise--;
  const item = rollItem({ tier });
  const isNew = !state.count(item.id);
  state.addItems([item]);
  return { item, isNew };
}

let image = null;
export const traderImage = () => (image ??= render(traderDraw, 8080, 2));
