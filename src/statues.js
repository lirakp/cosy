import { RARITIES, getItem, itemImage } from './items.js';
import { state } from './state.js';
import * as mine from './mine.js';

// Statuen: Aus Erz wird eine Statue eines eigenen Sammelstücks (Rang A bis SS)
// gegossen. Sie steht auf einem der Sockel auf dem Hof und gibt einen kleinen
// Bonus passend zur Kategorie des Stücks (stärker bei S und SS).

export const PLINTHS = [500, 598, 812]; // x-Positionen auf dem Hof
export const MIN_TIER = 3; // ab Rang A
export const ORE = 10; // Erz im Rang des Stücks
export const GOLD = { 3: 2000, 4: 6000, 5: 20000 };
export const RANK_MULT = { 3: 1, 4: 1.5, 5: 2 };
// Bonus je Kategorie (gleiche Arten wie bei Begleitern)
export const CAT_BONUS = {
  helden: { power: 0.03, taler: 0.03 },
  lebewesen: { expedition: 0.05 },
  monster: { mine: 0.05 },
  waffen: { dungeonGold: 0.05, silk: 0.03 },
  ruestung: { power: 0.02, coinReach: 4 },
  relikte: { mana: 0.05 },
  artefakte: { stars: 0.1, forge: 0.1 },
};

const list = () => (state.statues ||= [null, null, null]);
export const at = (i) => (list()[i] ? getItem(list()[i]) : null);
export const all = () => list().map((id) => (id ? getItem(id) : null));

export function bonusOf(item) {
  const b = CAT_BONUS[item.cat] || {};
  return Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v * RANK_MULT[item.tier]]));
}
// Summe aller Statuen für eine Bonus-Art
export const bonus = (kind) => all().reduce((s, it) => s + (it ? bonusOf(it)[kind] || 0 : 0), 0);

export function blocker(item) {
  if (!item || !state.count(item.id)) return 'Du besitzt dieses Stück nicht.';
  if (item.tier < MIN_TIER) return 'Statuen gibt es erst ab Rang A.';
  if (mine.ore(item.tier) < ORE) return `${ORE}× ${mine.LEVELS[item.tier].ore} nötig.`;
  if (state.gold < GOLD[item.tier]) return `${GOLD[item.tier].toLocaleString('de-DE')} Gold nötig.`;
  return null;
}

// Gießt eine Statue auf Sockel i (eine vorhandene wird ersetzt)
export function cast(i, id) {
  const item = getItem(id);
  if (i < 0 || i >= PLINTHS.length || blocker(item)) return false;
  if (!mine.spendOre(item.tier, ORE) || !state.spend(GOLD[item.tier], 'schmiede')) return false;
  list()[i] = id;
  state.changed();
  return true;
}

export const rankId = (t) => RARITIES[t].id;

// Bild der Statue: das Sammelstück in Metall (A Bronze, S Silber, SS Gold)
const METAL = { 3: '#c08040', 4: '#d8dce8', 5: '#ffd04a' };
const cache = new Map();
export function image(item) {
  if (!cache.has(item.id)) {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const ctx = c.getContext('2d');
    ctx.drawImage(itemImage(item), 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = METAL[item.tier];
    ctx.fillRect(0, 0, 16, 16);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 6, 16);
    cache.set(item.id, c);
  }
  return cache.get(item.id);
}
