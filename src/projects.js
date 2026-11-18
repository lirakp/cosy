import { RARITIES, worldItems } from './items.js';
import { state } from './state.js';
import * as realm from './realm.js';
import * as buffs from './buffs.js';
import { haveFor, takeNeed, describeNeed } from './village.js';

// Dorfprojekte: Jedes Dorf (Heimat, Hölle, Himmel) kann drei Gemeinschaftsbauten
// errichten – Taverne, Gildenhaus und Festplatz, jeweils in drei Stufen. Man spendet
// nach und nach Gold und Material (gerade das, was sich später im Spiel ansammelt:
// Erz, Stoff, Seide, Fisch, Duplikate). Ist alles beisammen, steht die nächste Stufe.

const R = (tier) => tier; // Lesbarkeit: Rang-Index D=0 … SS=5

// Bedarf je Stufe in der Heimat. In den Dimensionen kostet Gold das Dreifache und
// statt Fisch braucht es Glutsteine bzw. Sternensplitter (×10).
const BASE = {
  taverne: [
    [{ type: 'gold', n: 20000 }, { type: 'ore', tier: R(1), n: 40 }, { type: 'fish', tier: R(1), n: 15 }],
    [{ type: 'gold', n: 80000 }, { type: 'ore', tier: R(3), n: 30 }, { type: 'seide', tier: R(2), n: 10 }, { type: 'dupes', minTier: R(1), n: 30 }],
    [{ type: 'gold', n: 300000 }, { type: 'ore', tier: R(4), n: 25 }, { type: 'seide', tier: R(4), n: 10 }, { type: 'fish', tier: R(3), n: 10 }, { type: 'dupes', minTier: R(2), n: 80 }],
  ],
  gilde: [
    [{ type: 'gold', n: 30000 }, { type: 'ore', tier: R(2), n: 30 }, { type: 'stoff', tier: R(1), n: 30 }],
    [{ type: 'gold', n: 120000 }, { type: 'seide', tier: R(3), n: 12 }, { type: 'dupes', minTier: R(2), n: 50 }],
    [{ type: 'gold', n: 400000 }, { type: 'ore', tier: R(5), n: 15 }, { type: 'seide', tier: R(5), n: 6 }, { type: 'dupes', minTier: R(3), n: 120 }],
  ],
  fest: [
    [{ type: 'gold', n: 25000 }, { type: 'fish', tier: R(0), n: 30 }, { type: 'stoff', tier: R(0), n: 40 }],
    [{ type: 'gold', n: 100000 }, { type: 'fish', tier: R(2), n: 15 }, { type: 'seide', tier: R(2), n: 12 }],
    [{ type: 'gold', n: 350000 }, { type: 'fish', tier: R(4), n: 5 }, { type: 'seide', tier: R(4), n: 8 }, { type: 'dupes', minTier: R(2), n: 100 }],
  ],
};

export const PROJECTS = {
  taverne: {
    name: 'Taverne',
    text: 'Hier gibt es Rausch-Tränke zu kaufen. Jede Stufe bringt neue Tränke, die letzte macht sie günstiger.',
    stages: ['Glücksrausch-Trank', '+ Goldrausch-Trank', '+ Gladiatorrausch-Trank, alle 25 % günstiger (in den Dimensionen auch ihr besonderer Rausch)'],
  },
  gilde: {
    name: 'Gildenhaus',
    text: 'Daueraufträge für Dungeon, Arena, Bossrush und Abstieg – und jeden Tag neue Gildenaufträge.',
    stages: ['Daueraufträge, 1 Tagesauftrag', '2 Tagesaufträge, bessere Belohnungen', '3 Tagesaufträge, Belohnungen bis Rang S'],
  },
  fest: {
    name: 'Festplatz',
    text: 'Regelmäßig ein Dorffest mit Angelwettbewerb (in den Dimensionen: Minispiel) und einem Sonderhändler.',
    stages: ['Dorffest an jedem 4. Tag', 'Fest an jedem 3. Tag, bessere Preise', 'Fest an jedem 2. Tag, Sonderhändler bis Rang SS'],
  },
};
export const MAX_STAGE = 3;
export const ORDER = ['taverne', 'gilde', 'fest'];

const world = () => realm.current();
const all = () => (state.village.projects ||= {});
const data = (id, w = world()) => {
  const p = (all()[w] ||= {});
  return (p[id] ||= { stage: 0, paid: [] });
};
export const stage = (id, w = world()) => data(id, w).stage;

// Bedarf der nächsten Stufe (oder null, wenn fertig)
export function needs(id, w = world()) {
  const s = stage(id, w);
  if (s >= MAX_STAGE) return null;
  return BASE[id][s].map((n) => {
    if (w === 'normal') return { ...n };
    if (n.type === 'gold') return { ...n, n: n.n * 3 };
    if (n.type === 'fish') return { type: 'shard', world: w, n: n.n * 10 };
    return { ...n };
  });
}
export const paid = (id, i, w = world()) => data(id, w).paid[i] || 0;
// Wie viel man von Bedarf i jetzt geben könnte
export function canGive(id, i) {
  const n = needs(id)?.[i];
  if (!n) return 0;
  return Math.max(0, Math.min(n.n - paid(id, i), haveFor(n)));
}
export const done = (id) => {
  const list = needs(id);
  return !!list && list.every((n, i) => paid(id, i) >= n.n);
};

// Spenden: gibt so viel wie möglich zu allen Bedarfen (oder nur zu einem: index).
// Liefert { given, built } – built = neue Stufe, wenn alles beisammen ist.
export function donate(id, index = null) {
  const list = needs(id);
  if (!list) return { given: 0, built: false };
  let given = 0;
  list.forEach((n, i) => {
    if (index !== null && i !== index) return;
    const amount = canGive(id, i);
    if (!amount) return;
    takeNeed({ ...n, n: amount });
    data(id).paid[i] = paid(id, i) + amount;
    given += amount;
  });
  let built = false;
  if (done(id)) {
    data(id).stage++;
    data(id).paid = [];
    built = true;
  }
  if (given || built) state.changed();
  return { given, built };
}
export const describe = describeNeed;

// ---------------------------------------------------------------- Taverne

// Rausch-Tränke: ab welcher Stufe, Preis (Heimat), Dauer in Minuten
export const POTIONS = [
  { buff: 'luck', stage: 1, price: 3000, minutes: 15 },
  { buff: 'gold', stage: 2, price: 8000, minutes: 15 },
  { buff: 'gladiator', stage: 3, price: 20000, minutes: 15 },
  { buff: 'inferno', stage: 3, price: 60000, minutes: 15, world: 'hoelle' },
  { buff: 'segen', stage: 3, price: 60000, minutes: 15, world: 'himmel' },
];
export const potions = () => POTIONS.filter((p) => (!p.world || p.world === world()));
export const potionPrice = (p) => Math.round(p.price * (stage('taverne') >= 3 ? 0.75 : 1) * (realm.inRealm() ? 3 : 1));
export function buyPotion(buffId, now = Date.now()) {
  const p = potions().find((x) => x.buff === buffId);
  if (!p || stage('taverne') < p.stage || !state.spend(potionPrice(p), 'taverne')) return false;
  const cur = buffs.current(now);
  if (cur?.id === p.buff) buffs.extend(p.minutes, now);
  else buffs.grant(p.buff, now, p.minutes);
  state.changed();
  return true;
}

// ---------------------------------------------------------------- Festplatz

// Fest an jedem n-ten Spieltag (je Stufe)
export const FEST_EVERY = [0, 4, 3, 2];
// Angelwettbewerb: Punkte je Fisch nach Rang (in den Dimensionen: je Minispiel-Fund)
export const FISH_POINTS = [1, 2, 4, 8, 16, 32];
// Preise im Wettbewerb: ab so vielen Punkten
export const PRIZES = [
  { points: 10, taler: 10, stern: 0, item: null },
  { points: 30, taler: 20, stern: 1, item: null },
  { points: 60, taler: 30, stern: 2, item: 3 },
];
export const isFestDay = (day = state.dayCount, w = world()) => {
  const s = stage('fest', w);
  return s > 0 && day % FEST_EVERY[s] === 0;
};
// Tage bis zum nächsten Fest (0 = heute)
export function daysToFest(day = state.dayCount) {
  const s = stage('fest');
  if (!s) return null;
  for (let d = 0; d < FEST_EVERY[s]; d++) if ((day + d) % FEST_EVERY[s] === 0) return d;
  return null;
}

const festData = () => {
  const f = ((state.village.fest ||= {})[world()] ||= { day: -1, points: 0, claimed: [], offers: [], bought: [] });
  if (f.day !== state.dayCount && isFestDay()) {
    Object.assign(f, { day: state.dayCount, points: 0, claimed: [], offers: rollOffers(), bought: [] });
    state.changed();
  }
  return f;
};
export const festPoints = () => (isFestDay() ? festData().points : 0);

// Fang während des Fests zählt für den Wettbewerb
export const recordCatch = (tier) => recordPoints(FISH_POINTS[Math.max(0, Math.min(5, tier))]);
export function recordPoints(pts) {
  if (!isFestDay() || !(pts > 0)) return 0;
  festData().points += pts;
  state.changed();
  return pts;
}

export const prizeReady = (i) => isFestDay() && festData().points >= PRIZES[i].points && !festData().claimed.includes(i);
export function claimPrize(i, r = Math.random) {
  if (!prizeReady(i)) return null;
  const p = PRIZES[i];
  const c = (state.well.coins ||= { taler: 0, stern: 0, splinters: 0 });
  c.taler = (c.taler || 0) + p.taler;
  c.stern = (c.stern || 0) + p.stern;
  let item = null;
  let isNew = false;
  if (p.item !== null) {
    const pool = worldItems().filter((x) => x.tier >= p.item + (stage('fest') >= 3 ? 1 : 0));
    item = pool[Math.floor(r() * pool.length)];
    isNew = !state.count(item.id);
    state.addItems([item], 'dorffest');
  }
  festData().claimed.push(i);
  state.changed();
  return { ...p, item, isNew };
}

// Sonderhändler: drei Stücke ab Rang A (Stufe 3: auch SS), bezahlt mit Sternentalern
export const OFFER_PRICE = [0, 0, 0, 2, 4, 9]; // Sternentaler je Rang
function rollOffers(r = Math.random) {
  const maxTier = stage('fest') >= 3 ? 5 : 4;
  const pool = worldItems().filter((i) => i.tier >= 3 && i.tier <= maxTier);
  // fehlende Stücke bevorzugt
  const missing = pool.filter((i) => !state.count(i.id));
  const src = missing.length >= 3 ? missing : pool;
  const out = [];
  while (out.length < 3 && out.length < src.length) {
    const it = src[Math.floor(r() * src.length)];
    if (!out.includes(it.id)) out.push(it.id);
  }
  return out;
}
export const offers = () => (isFestDay() ? festData().offers : []);
export const offerBought = (id) => festData().bought.includes(id);
export function buyOffer(id, getItem) {
  if (!offers().includes(id) || offerBought(id)) return null;
  const item = getItem(id);
  const price = OFFER_PRICE[item.tier];
  const c = (state.well.coins ||= { taler: 0, stern: 0, splinters: 0 });
  if ((c.stern || 0) < price) return null;
  c.stern -= price;
  const isNew = !state.count(item.id);
  state.addItems([item], 'dorffest');
  festData().bought.push(id);
  state.changed();
  return { item, isNew };
}

export const rankName = (t) => RARITIES[t].id;
