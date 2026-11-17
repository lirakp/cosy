import { getItem } from './items.js';
import { state } from './state.js';
import * as garden from './garden.js';
import * as village from './village.js';

// Gartenhelfer: Eines deiner Lebewesen hält die Beete am Laufen. Es erntet
// reife Beete und pflanzt neu. Saat nimmt es zuerst aus dem Päckchen-Vorrat;
// darf es am Markt verkaufen, verkauft es die Ernte (bis auf einen Vorrat
// fürs Kochen) und kauft davon Saat. Der Überschuss landet in seiner Kasse.

export const MAX_OFFLINE_HOURS = 8;
export const DEFAULT_RESERVE = 5;
export const DEPOSIT = 100;

const h = () => state.garden.helper;

export const creature = () => {
  const id = h().creature;
  return id && state.count(id) ? getItem(id) : null;
};
export const isGardener = (id) => !!id && h().creature === id;

export function assign(id) {
  const item = id && getItem(id);
  if (id && (!item || item.cat !== 'lebewesen' || !state.count(id))) return false;
  h().creature = id || null;
  h().last = Date.now();
  state.changed();
  return true;
}

export const setSell = (on) => { h().sell = !!on; state.changed(); };
export const setReserve = (n) => { h().reserve = Math.max(0, Math.min(99, Math.round(n))); state.changed(); };
// Plan je Beet: Pflanze, 'none' (leer lassen) oder leer = wie zuletzt
export const setPlan = (i, cropId) => { h().plan[i] = cropId || null; state.changed(); };
export const planFor = (i) => {
  const p = h().plan[i];
  if (p === 'none') return null;
  return p || state.garden.last?.[i] || null;
};

// Verkauft Ernte über dem Vorrat in die Kasse des Helfers.
function sellSurplus() {
  if (!h().sell) return 0;
  let gain = 0;
  for (const c of garden.CROPS) {
    const extra = garden.have(c.id) - h().reserve;
    if (extra <= 0) continue;
    state.garden.crops[c.id] -= extra;
    gain += extra * village.CROP_PRICE[c.id];
  }
  h().purse += gain;
  h().sold += gain;
  return gain;
}

// Saat besorgen: Päckchen aus dem Vorrat, sonst (mit Erlaubnis) aus der Kasse kaufen.
function getSeed(cropId) {
  if (village.useSeed(cropId)) return true;
  if (!h().sell) return false;
  const price = village.seedPrice(cropId);
  // Notfalls auch aus dem Vorrat verkaufen – die Beete sollen nicht stillstehen.
  // Zuerst die Pflanze selbst, dann die anderen.
  const order = [cropId, ...garden.CROPS.map((c) => c.id).filter((id) => id !== cropId)];
  for (const id of order) {
    while (h().purse < price && garden.have(id) > 0) {
      state.garden.crops[id]--;
      h().purse += village.CROP_PRICE[id];
      h().sold += village.CROP_PRICE[id];
    }
  }
  if (h().purse < price) return false;
  h().purse -= price;
  h().spent += price;
  return true;
}

// Rechnet die Arbeit seit dem letzten Aufruf ab – auch mehrere Durchgänge offline.
// Liefert { harvested: { Pflanze: Menge }, planted } oder null.
export function tick(now = Date.now()) {
  if (!creature()) {
    h().last = now;
    return null;
  }
  const floor = now - MAX_OFFLINE_HOURS * 3600000;
  h().last = now;
  const harvested = {};
  let planted = 0;
  const beds = state.garden.beds;
  for (let i = 0; i < beds.length; i++) {
    for (let guard = 0; guard < 200; guard++) {
      const b = beds[i];
      let at = now;
      if (b) {
        const c = garden.crop(b.crop);
        const readyAt = b.planted + garden.growMinutes(c.id) * 60000;
        if (readyAt > now) break;
        state.garden.crops[c.id] = garden.have(c.id) + c.yield;
        harvested[c.id] = (harvested[c.id] || 0) + c.yield;
        h().harvests++;
        beds[i] = null;
        at = Math.max(readyAt, floor);
        sellSurplus();
      }
      const next = planFor(i);
      if (!next || !getSeed(next)) break;
      beds[i] = { crop: next, planted: at };
      state.garden.last[i] = next;
      planted++;
      if (!b) break;
    }
  }
  if (!planted && !Object.keys(harvested).length) return null;
  state.changed();
  return { harvested, planted };
}

export function withdraw() {
  const gold = Math.floor(h().purse);
  if (!gold) return 0;
  h().purse -= gold;
  state.addGold(gold, 'gartenhelfer');
  return gold;
}

export function deposit(amount = DEPOSIT) {
  if (!state.spend(amount, 'garten')) return false;
  h().purse += amount;
  state.changed();
  return true;
}

export const purse = () => Math.floor(h().purse);
export const info = () => h();
