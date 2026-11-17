import { state } from './state.js';
import * as buffs from './buffs.js';
import { render } from './art/core.js';
import { carrot, wheat, potato, berries, pumpkin, starflower, teacup } from './art/crops.js';

// Garten: Pflanzen wachsen in echter Zeit (auch offline) und werden geerntet.
// Küche: Aus der Ernte entstehen Gerichte, die gezielt einen Rausch geben.

export const CROPS = [
  { id: 'karotte', name: 'Karotte', seed: 10, minutes: 5, yield: 2, art: carrot, tier: 0 },
  { id: 'weizen', name: 'Weizen', seed: 15, minutes: 8, yield: 2, art: wheat, tier: 0 },
  { id: 'kartoffel', name: 'Kartoffel', seed: 20, minutes: 12, yield: 2, art: potato, tier: 1 },
  { id: 'beeren', name: 'Beeren', seed: 30, minutes: 20, yield: 3, art: berries, tier: 2 },
  { id: 'kuerbis', name: 'Kürbis', seed: 50, minutes: 30, yield: 1, art: pumpkin, tier: 3 },
  { id: 'sternenblume', name: 'Sternenblume', seed: 150, minutes: 60, yield: 1, art: starflower, tier: 4 },
];
export const crop = (id) => CROPS.find((c) => c.id === id);

export const MAX_BEDS = 6;
// Preis für Beet 3, 4, 5 und 6 (zwei Beete gibt es von Anfang an)
export const BED_PRICES = [300, 800, 2000, 5000];

// Gerichte: Zutaten und Wirkung. Bewusst teurer und kürzer als ein Rausch aus
// dem Schlaf, damit Kochen planbar, aber kein Dauer-Rausch ist.
export const RECIPES = [
  { id: 'suppe', name: 'Goldene Kürbissuppe', needs: { kuerbis: 1, sternenblume: 1, karotte: 2 }, buff: 'gold', minutes: 5 },
  { id: 'kuchen', name: 'Glückskuchen', needs: { weizen: 3, beeren: 2 }, buff: 'luck', minutes: 6 },
  { id: 'eintopf', name: 'Kraft-Eintopf', needs: { kartoffel: 2, kuerbis: 1, karotte: 2 }, buff: 'gladiator', minutes: 6 },
  { id: 'tee', name: 'Sternenblüten-Tee', needs: { sternenblume: 1, beeren: 2 }, extend: 5 },
];

const gd = () => state.garden;

export const beds = () => gd().beds;
export const have = (id) => gd().crops[id] || 0;
export const nextBedPrice = () => (beds().length < MAX_BEDS ? BED_PRICES[beds().length - 2] : null);

export function buyBed() {
  const price = nextBedPrice();
  if (price === null || !state.spend(price, 'garten')) return false;
  gd().beds.push(null);
  state.changed();
  return true;
}

// Fortschritt eines Beets von 0 bis 1 (null = leer)
export function growth(i, now = Date.now()) {
  const b = beds()[i];
  if (!b) return null;
  return Math.min(1, (now - b.planted) / (crop(b.crop).minutes * 60000));
}
export const ready = (i, now) => growth(i, now) === 1;
export const readyCount = (now) => beds().filter((_, i) => ready(i, now)).length;
export const remaining = (i, now = Date.now()) => {
  const b = beds()[i];
  return b ? Math.max(0, Math.ceil((b.planted + crop(b.crop).minutes * 60000 - now) / 1000)) : 0;
};

export function plant(i, cropId, now = Date.now()) {
  const c = crop(cropId);
  if (!c || i >= beds().length || beds()[i] || !state.spend(c.seed, 'garten')) return false;
  gd().beds[i] = { crop: cropId, planted: now };
  state.changed();
  return true;
}

// Erntet alle reifen Beete. Liefert { Pflanze: Menge }.
export function harvestAll(now = Date.now()) {
  const got = {};
  beds().forEach((b, i) => {
    if (!ready(i, now)) return;
    const c = crop(b.crop);
    got[c.id] = (got[c.id] || 0) + c.yield;
    gd().crops[c.id] = have(c.id) + c.yield;
    gd().beds[i] = null;
  });
  if (Object.keys(got).length) state.changed();
  return got;
}

// ---------------------------------------------------------------- Küche

export const canCook = (r) => Object.entries(r.needs).every(([id, n]) => have(id) >= n) && (!r.extend || !!buffs.current());

export function cook(recipeId) {
  const r = RECIPES.find((x) => x.id === recipeId);
  if (!r || !canCook(r)) return null;
  for (const [id, n] of Object.entries(r.needs)) gd().crops[id] -= n;
  if (r.buff) buffs.grant(r.buff, Date.now(), r.minutes);
  else buffs.extend(r.extend);
  state.changed();
  return r;
}

const art = new Map();
export function cropImage(id) {
  if (!art.has(id)) {
    const c = crop(id);
    art.set(id, c ? render(c.art, 7300 + c.tier * 11, c.tier) : render(teacup, 7999, 4));
  }
  return art.get(id);
}
export const teaImage = () => cropImage('tee');
