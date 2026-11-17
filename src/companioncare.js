import { RARITIES, rollItem } from './items.js';
import { state } from './state.js';
import * as garden from './garden.js';
import * as village from './village.js';
import * as magic from './magic.js';
import { companion, owned, level, points, active, showGift, TREAT_POINTS, MAX_LEVEL } from './companions.js';

// Pflege der Begleiter: Leckerlis aus dem Garten und Geschenke.
// (Eigene Datei, damit companions.js ohne Garten, Dorf und Magie auskommt.)

export const treatPoints = (c, cropId) => TREAT_POINTS[garden.crop(cropId).tier] * (c.fav === cropId ? 2 : 1);

// Ein Leckerli geben. Liefert { level, up } oder null.
export function feed(id, cropId) {
  const c = companion(id);
  if (!c || !owned(id) || !garden.crop(cropId) || !garden.have(cropId) || level(id) >= MAX_LEVEL) return null;
  const before = level(id);
  state.garden.crops[cropId]--;
  state.companions.pts = { ...state.companions.pts, [id]: points(id) + treatPoints(c, cropId) };
  state.changed();
  return { level: level(id), up: level(id) > before };
}


// ---------------------------------------------------------------- Geschenke

// Der aktive Begleiter bringt ab und zu etwas mit (Spielzeit, wie die Streuner).
export const GIFT_MINUTES = [4, 8];
export const GIFT_ITEM_CHANCE = 0.03; // + 1 % je Stufe
export const GIFT_TEXT = { gold: 'Gold', seeds: 'Saatgut', crops: 'Ernte', fish: 'Fische', ore: 'Erz', mana: 'Mana', item: 'Sammelstücke' };
let giftWait = 60 * (GIFT_MINUTES[0] + Math.random() * (GIFT_MINUTES[1] - GIFT_MINUTES[0]));

const pick = (list, r) => list[Math.floor(r() * list.length)];

// Würfelt ein Geschenk aus und schreibt es gut
export function gift(c = active(), r = Math.random) {
  if (!c) return null;
  const lvl = level(c.id);
  if (r() < GIFT_ITEM_CHANCE + 0.01 * lvl || (c.gifts.includes('item') && r() < 0.06)) {
    const item = rollItem({ minTier: c.tier >= 3 ? 1 : 0, random: r });
    const isNew = !state.count(item.id);
    state.addItems([item], 'begleiter');
    return { c, item, isNew };
  }
  let kind = pick(c.gifts.filter((k) => k !== 'item'), r) || 'gold';
  if (kind === 'mana' && !magic.owned()) kind = 'gold';
  const res = { c, kind };
  if (kind === 'gold') {
    res.n = Math.round((15 + 25 * c.tier) * lvl * (0.8 + 0.4 * r()));
    state.addGold(res.n, 'begleiter');
  } else if (kind === 'seeds' || kind === 'crops') {
    const crop = pick(garden.CROPS.filter((x) => x.tier <= Math.min(4, c.tier + 1)), r);
    res.n = 1 + Math.floor(lvl / 2);
    res.what = crop.name;
    if (kind === 'seeds') state.village.seeds[crop.id] = village.seeds(crop.id) + res.n;
    else state.garden.crops[crop.id] = garden.have(crop.id) + res.n;
  } else if (kind === 'fish') {
    let f;
    do f = village.rollCatch(r); while (f.treasure);
    state.village.fish[f.species] = (state.village.fish[f.species] || 0) + 1;
    res.n = 1;
    res.what = f.fish.name;
  } else if (kind === 'ore') {
    const t = Math.min(5, Math.floor(r() * (c.tier + 1)));
    res.n = 1 + lvl;
    res.what = `Erz Rang ${RARITIES[t].id}`;
    state.mine.ore[t] += res.n;
  } else if (kind === 'mana') {
    res.n = 8 + 4 * lvl;
    state.magic.mana = Math.min(magic.maxMana(), state.magic.mana + res.n);
  }
  state.companions.gifts = (state.companions.gifts || 0) + 1;
  state.changed();
  return res;
}

// Spielzeit abzählen; liefert ein Geschenk, wenn es so weit ist
export function giftTick(dt) {
  const c = active();
  if (!c) return null;
  giftWait -= dt * (1 + 0.1 * (level(c.id) - 1));
  if (giftWait > 0) return null;
  giftWait = 60 * (GIFT_MINUTES[0] + Math.random() * (GIFT_MINUTES[1] - GIFT_MINUTES[0]));
  showGift();
  return gift(c);
}

