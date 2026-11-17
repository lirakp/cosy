import { state } from './state.js';
import * as village from './village.js';
import * as buffs from './buffs.js';
import * as companions from './companions.js';
import { render, M, ramp } from './art/core.js';
import { carrot, wheat, potato, berries, pumpkin, starflower, teacup, chili, ashroot, lavamelon, cloudberry, angelapple } from './art/crops.js';
import * as realm from './realm.js';

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
// Pflanzen der Portalwelten: wachsen nur dort, sind wertvoller und Zutaten für eigene Gerichte
export const REALM_CROPS = [
  { id: 'feuerchili', name: 'Feuerchili', world: 'hoelle', seed: 120, minutes: 15, yield: 3, art: chili, tier: 2 },
  { id: 'aschenknolle', name: 'Aschenknolle', world: 'hoelle', seed: 200, minutes: 25, yield: 2, art: ashroot, tier: 3 },
  { id: 'lavamelone', name: 'Lavamelone', world: 'hoelle', seed: 500, minutes: 50, yield: 1, art: lavamelon, tier: 4 },
  { id: 'wolkenbeere', name: 'Wolkenbeere', world: 'himmel', seed: 120, minutes: 15, yield: 3, art: cloudberry, tier: 2 },
  { id: 'sonnenweizen', name: 'Sonnenweizen', world: 'himmel', seed: 200, minutes: 25, yield: 2, art: (g, r, f) => ({ ...wheat(g, r, f), [M.main]: ramp(48, 95, 66) }), tier: 3 },
  { id: 'engelsapfel', name: 'Engelsapfel', world: 'himmel', seed: 500, minutes: 50, yield: 1, art: angelapple, tier: 4 },
];
const ALL_CROPS = [...CROPS, ...REALM_CROPS];
export const crop = (id) => ALL_CROPS.find((c) => c.id === id);
// Was sich hier anbauen lässt: überall die Heimat-Pflanzen, in einer Portalwelt dazu ihre eigenen
export const available = () => [...CROPS, ...REALM_CROPS.filter((c) => c.world === realm.current())];

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
  // Gerichte der Portalwelten (nur dort kochbar)
  { id: 'feuereintopf', world: 'hoelle', name: 'Feuereintopf', needs: { feuerchili: 3, aschenknolle: 2 }, buff: 'inferno', minutes: 10 },
  { id: 'glutkuchen', world: 'hoelle', name: 'Glutkuchen', needs: { feuerchili: 2, weizen: 3 }, buff: 'gold', minutes: 12 },
  { id: 'lavasuppe', world: 'hoelle', name: 'Lavasuppe', needs: { lavamelone: 1, aschenknolle: 1 }, extend: 12 },
  { id: 'wolkenbrot', world: 'himmel', name: 'Wolkenbrot', needs: { sonnenweizen: 2, wolkenbeere: 3 }, buff: 'segen', minutes: 10 },
  { id: 'engelstorte', world: 'himmel', name: 'Engelstorte', needs: { engelsapfel: 1, wolkenbeere: 2 }, buff: 'luck', minutes: 15 },
  { id: 'himmelstee', world: 'himmel', name: 'Himmelstee', needs: { sonnenweizen: 1, wolkenbeere: 2 }, extend: 12 },
];
// Gerichte, die man hier kochen kann
export const recipes = () => RECIPES.filter((r) => !r.world || r.world === realm.current());

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
// Wachstumszeit in Minuten (Begleiter können sie verkürzen)
export const growMinutes = (cropId) => crop(cropId).minutes / (1 + companions.bonus('garden'));

export function growth(i, now = Date.now()) {
  const b = beds()[i];
  if (!b) return null;
  return Math.min(1, (now - b.planted) / (growMinutes(b.crop) * 60000));
}
export const ready = (i, now) => growth(i, now) === 1;
export const readyCount = (now) => beds().filter((_, i) => ready(i, now)).length;
export const remaining = (i, now = Date.now()) => {
  const b = beds()[i];
  return b ? Math.max(0, Math.ceil((b.planted + growMinutes(b.crop) * 60000 - now) / 1000)) : 0;
};

export function plant(i, cropId, now = Date.now()) {
  const c = crop(cropId);
  if (!c || i >= beds().length || beds()[i]) return false;
  // erst Saatpäckchen vom Markt, sonst direkt mit Gold bezahlen
  if (!village.useSeed(cropId) && !state.spend(c.seed, 'garten')) return false;
  gd().beds[i] = { crop: cropId, planted: now };
  gd().last[i] = cropId;
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
  const r = recipes().find((x) => x.id === recipeId);
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
