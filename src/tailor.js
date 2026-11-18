import { RARITIES } from './items.js';
import { state } from './state.js';
import { OUTFITS, getOutfit, sprite } from './sprites.js';
import * as realm from './realm.js';

// Schneiderei am Nähtisch im Haus: Aus Stoff und Seide der Bossarena entstehen
// Heldenumhänge (Stärke in Arena und Dungeon), Kleidung mit Bonus und
// Einrichtung, die das Haus gemütlicher macht (bessere Träume beim Schlafen).
// Überschüssiges Material lässt sich veredeln.

const MAX_TIER = RARITIES.length - 1;
const t = () => state.tailor;
const mats = () => state.arena.mats;
export const have = (kind, tier) => (kind === 'erz' ? state.mine.ore[tier] : mats()[kind][tier]) || 0;

// cost: [{ kind, tier, n }]
export const affordable = (cost) => cost.every((c) => have(c.kind, c.tier) >= c.n);
function pay(cost) {
  if (!affordable(cost)) return false;
  for (const c of cost) {
    if (c.kind === 'erz') state.mine.ore[c.tier] -= c.n;
    else mats()[c.kind][c.tier] -= c.n;
  }
  return true;
}
const S = (tier, n) => ({ kind: 'stoff', tier, n });
const E = (tier, n) => ({ kind: 'erz', tier, n }); // Erz aus der Mine
const K = (tier, n) => ({ kind: 'seide', tier, n });

// ---------------------------------------------------------------- Umhänge

// Stärke eines Umhangs je Rang (zum Vergleich: Ausrüstung 4 · 7 · 12 · 20 · 35 · 60)
export const CAPE_POWER = [3, 6, 10, 16, 28, 48];
export const capeCost = (tier) => [S(tier, 3), K(tier, 1)];
export const capes = (tier) => t().capes[tier] || 0;

export function sewCape(tier) {
  if (tier < 0 || tier > MAX_TIER || !pay(capeCost(tier))) return false;
  t().capes[tier] = capes(tier) + 1;
  state.changed();
  return true;
}

const CAPE_ROWS = [
  '...cc..cc...',
  '...gccccg...',
  '..cccccccc..',
  '..cCcccccc..',
  '.ccCccccccc.',
  '.ccCcccccCc.',
  '.cCccccccCc.',
  'ccCcccccccCc',
  'ccCccccccCcc',
  'cCcccccccCcc',
  'cCccccccccCc',
  'dddddddddddd',
];
const CAPE_COLORS = [
  ['#8a8a98', '#6a6a78', '#b0b0bc'],
  ['#4f8f55', '#3a6f40', '#ffd04a'],
  ['#4a6ab0', '#3a5090', '#ffd04a'],
  ['#8a54c8', '#6a3aa8', '#ffd04a'],
  ['#d9a030', '#b07a20', '#fdf6e3'],
  ['#e8577a', '#b03a5a', '#9be8e0'],
];
const capeCache = new Map();
// 16×16-Bild eines Umhangs
export function capeImage(tier) {
  if (!capeCache.has(tier)) {
    const [c, C, g] = CAPE_COLORS[tier];
    const img = sprite(CAPE_ROWS, { c, C, g, d: g });
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 16;
    canvas.getContext('2d').drawImage(img, 2, 2);
    capeCache.set(tier, canvas);
  }
  return capeCache.get(tier);
}

// ---------------------------------------------------------------- Kleidung

// Genähte Kleidung steht in sprites.js (OUTFITS mit `sew`); hier Preis und Besitz.
export const SEWN = OUTFITS.filter((o) => o.sew);
export const sewCost = (o) => [...(o.sew.stoff ? [S(o.sew.tier, o.sew.stoff)] : []), ...(o.sew.seide ? [K(o.sew.tier, o.sew.seide)] : [])];
// Zunft-Trachten (friend) gibt es erst, wenn alle Bewohner einer Welt beste Freunde sind
export const sewn = (id) => {
  const o = getOutfit(id);
  if (o.friend) return (state.village?.outfits || []).includes(id);
  return !o.sew || t().sewn.includes(id);
};

// Kleidung der Portalwelten wird nur dort genäht (aus deren Stoff und Seide)
export const canSewHere = (o) => !o.world || o.world === realm.current();

export function sewOutfit(id) {
  const o = getOutfit(id);
  if (!o.sew || sewn(id) || !canSewHere(o) || !pay(sewCost(o))) return false;
  t().sewn.push(id);
  state.changed();
  return true;
}

// Bonus der getragenen Kleidung (gleiche Arten wie bei Begleitern)
export const outfitBonus = (kind) => (sewn(state.outfit) ? getOutfit(state.outfit).bonus?.[kind] || 0 : 0);

// ---------------------------------------------------------------- Einrichtung

export const DECOR = [
  { id: 'tischdecke', name: 'Tischdecke mit Spitze', cozy: 1, cost: [S(0, 4)], text: 'Eine weiche Decke für den Tisch am Fenster.' },
  { id: 'kissen', name: 'Bunte Kissen', cozy: 1, cost: [S(1, 4)], text: 'Drei Kissen, in die man sich fallen lassen kann.' },
  { id: 'teppich', name: 'Großer Webteppich', cozy: 2, cost: [S(2, 6)], text: 'Ersetzt den alten Teppich – mit Rautenmuster und Fransen.' },
  { id: 'wandbehang', name: 'Wandbehang', cozy: 2, cost: [S(2, 2), K(2, 2)], text: 'Ein gewebtes Bild vom Tal über dem Bett.' },
  { id: 'girlande', name: 'Wimpelgirlande', cozy: 2, cost: [S(3, 5)], text: 'Bunte Wimpel quer unter der Decke.' },
  { id: 'baldachin', name: 'Seidenbaldachin', cozy: 3, cost: [K(4, 3)], text: 'Ein Himmel aus Seide über dem Bett.' },
  { id: 'lampions', name: 'Seidenlampions', cozy: 4, cost: [K(5, 2)], text: 'Zwei Lampions, die nachts warm leuchten.' },
  // Metall-Einrichtung (in der Schmiede aus Erz)
  { id: 'kaminbesteck', metal: true, name: 'Kaminbesteck', cozy: 1, cost: [E(1, 8)], text: 'Schürhaken, Zange und Schaufel aus Eisen neben dem Kamin.' },
  { id: 'standuhr', metal: true, name: 'Standuhr', cozy: 2, cost: [E(2, 8)], text: 'Eine silberne Standuhr, die leise tickt.' },
  { id: 'kronleuchter', metal: true, name: 'Goldener Kronleuchter', cozy: 3, cost: [E(3, 6)], text: 'Ein Kronleuchter mit Kerzen unter der Decke – leuchtet nachts.' },
];
export const decor = (id) => DECOR.find((d) => d.id === id);
export const placed = (id) => t().decor.includes(id);

export function buyDecor(id) {
  const d = decor(id);
  if (!d || placed(id) || !pay(d.cost)) return false;
  t().decor.push(id);
  state.changed();
  return true;
}

// Gemütlichkeit: jeder Punkt +1 % auf einen Rausch beim Schlafen
export const COZY_STEP = 0.01;
export const cozy = () => t().decor.reduce((sum, id) => sum + (decor(id)?.cozy || 0), 0);
export const MAX_COZY = DECOR.reduce((sum, d) => sum + d.cozy, 0);

// ---------------------------------------------------------------- Veredeln

export const REFINE = [
  { id: 'seide', name: 'Stoff zu Seide', from: 'stoff', n: 4, to: 'seide', up: 0, text: '4 Stoff → 1 Seide (gleicher Rang)' },
  { id: 'stoff-up', name: 'Stoff aufwerten', from: 'stoff', n: 5, to: 'stoff', up: 1, text: '5 Stoff → 1 Stoff des nächsten Rangs' },
  { id: 'seide-up', name: 'Seide aufwerten', from: 'seide', n: 3, to: 'seide', up: 1, text: '3 Seide → 1 Seide des nächsten Rangs' },
];
export const canRefine = (r, tier) => tier + r.up <= MAX_TIER && have(r.from, tier) >= r.n;

export function refine(id, tier) {
  const r = REFINE.find((x) => x.id === id);
  if (!r || !canRefine(r, tier)) return false;
  mats()[r.from][tier] -= r.n;
  mats()[r.to][tier + r.up] += 1;
  state.changed();
  return true;
}
