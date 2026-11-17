import { RARITIES, rollItem, rollTier, worldItems } from './items.js';
import { state, PULL_COST, PULL_10_COST, DUPE_EXTRA, NEW_EXTRA } from './state.js';
import * as buildings from './buildings.js';
import * as buffs from './buffs.js';
import * as sets from './sets.js';
import * as magic from './magic.js';
import * as realm from './realm.js';
import * as companions from './companions.js';

// Wunschbrunnen: Glückszähler (Pity), tägliche Gratiswünsche, ein zufälliger
// Gratis-Folgezug und der Brunnengeist, der selten einen Wunsch mit
// garantiert Rang A–SS verschenkt. Der Brunnen lässt sich wie die anderen
// Anlagen ausbauen (Rang D bis SS).

// Glückszähler: spätestens beim 60. Stück ohne A ist es A, beim 300. ohne S ein S
export const PITY_A = 60;
export const PITY_S = 300;

// je Brunnen-Rang (D … SS)
export const DISCOUNT = [0, 0.04, 0.08, 0.12, 0.16, 0.2]; // günstigere Wünsche
export const DAILY_FREE = [1, 1, 1, 2, 2, 3]; // Gratiswünsche je Spieltag
export const FREE_NEXT = [0.05, 0.06, 0.07, 0.08, 0.1, 0.12]; // Chance: nächster Einzelwunsch gratis
export const SPIRIT_CHANCE = [0.004, 0.005, 0.006, 0.008, 0.01, 0.0125]; // je gezogenem Stück
export const SPIRIT_MIN_TIER = 3; // Geschenk des Brunnengeists: mindestens Rang A

const w = () => state.well;
export const tier = () => Math.max(0, buildings.tier('well'));

// In den Portalwelten kostet ein Wunsch das Doppelte.
// variant: false/'normal' · true/'dupes' (nur Duplikate, +50 je Zug) · 'new' (nur Neues, +100 je Zug)
const extra = (variant) => (variant === 'new' ? NEW_EXTRA : variant ? DUPE_EXTRA : 0);
export const cost = (n, variant = false) => (sets.pullCost(Math.round((n === 10 ? PULL_10_COST : PULL_COST) * (1 - DISCOUNT[tier()]))) + extra(variant) * n) * (realm.inRealm() ? realm.PULL : 1);

// Duplikat-Wunsch: Der Rang wird wie immer gewürfelt, das Stück kommt aber nur
// aus der eigenen Sammlung (gibt es in dem Rang nichts, dann aus dem nächstniedrigeren).
// Er zählt nicht für den Glückszähler.
export const canDupe = () => worldItems().some((i) => state.count(i.id));
function rollDupe(minTier, r) {
  const t0 = rollTier(minTier, r, buffs.lucky());
  for (let t = t0; t >= 0; t--) {
    const pool = worldItems().filter((i) => i.tier === t && state.count(i.id));
    if (pool.length) return { item: pool[Math.floor(r() * pool.length)], forced: false };
  }
  return null;
}

// Neu-Wunsch: Der Rang wird wie immer gewürfelt (mit Glückszähler), es kommen
// aber nur Stücke, die man noch nicht besitzt – fehlt in dem Rang nichts mehr,
// dann aus dem nächstniedrigeren, sonst aus einem höheren.
export const canNew = () => worldItems().some((i) => !state.count(i.id));
function rollNew(minTier, r, taken) {
  const { tier: t0, forced } = pityTier(minTier, r);
  const order = [...Array.from({ length: t0 + 1 }, (_, k) => t0 - k), ...Array.from({ length: RARITIES.length - t0 - 1 }, (_, k) => t0 + 1 + k)];
  for (const t of order) {
    if (t < minTier && order.some((u) => u >= minTier && worldItems().some((i) => i.tier === u && !state.count(i.id) && !taken.has(i.id)))) continue;
    const pool = worldItems().filter((i) => i.tier === t && !state.count(i.id) && !taken.has(i.id));
    if (pool.length) {
      const item = pool[Math.floor(r() * pool.length)];
      taken.add(item.id);
      countPity(item);
      return { item, forced };
    }
  }
  return rollOne(minTier, r);
}

// Tägliche Gratiswünsche (Spieltag = state.dayCount)
export function dailyLeft() {
  const used = w().dailyDay === state.dayCount ? w().dailyUsed : 0;
  return Math.max(0, DAILY_FREE[tier()] - used);
}
export const freeNext = () => !!w().freeNext;
export const spiritGift = () => !!w().spiritGift;
// Ist der nächste Einzelwunsch gratis? ('next' | 'daily' | null)
export const freeSingle = () => (freeNext() ? 'next' : dailyLeft() ? 'daily' : null);
// Gibt es am Brunnen etwas umsonst? (Glitzern in der Welt)
export const anyFree = () => !!freeSingle() || spiritGift();

// Wie viele Stücke höchstens noch bis zur Garantie
export const untilA = () => PITY_A - w().pityA;
export const untilS = () => PITY_S - w().pityS;

// Ein Stück würfeln, Glückszähler beachten und fortschreiben
// Mindest-Rang durch den Glückszähler und gewürfelter Rang
function pityTier(minTier, r) {
  if (w().pityS >= PITY_S - 1) minTier = Math.max(minTier, 4);
  else if (w().pityA >= PITY_A - 1) minTier = Math.max(minTier, 3);
  return { tier: rollTier(minTier, r, buffs.lucky()), forced: minTier >= 3 };
}
function rollOne(minTier, r) {
  const { tier: t, forced } = pityTier(minTier, r);
  const item = rollItem({ tier: t, random: r });
  countPity(item);
  return { item, forced };
}
function countPity(item) {
  if (item.tier >= 4) {
    w().pityA = 0;
    w().pityS = 0;
  } else if (item.tier >= 3) {
    w().pityA = 0;
    w().pityS++;
  } else {
    w().pityA++;
    w().pityS++;
  }
}

// Wünschen. mode: 1 | 10 | 'spirit'. Liefert das Ergebnis oder { error }.
//   { results: [{ item, isNew, pity }], paid, free, gotFreeNext, gotSpirit }
export function pull(mode, r = Math.random, { dupes = false, fresh = false } = {}) {
  const n = mode === 10 ? 10 : 1;
  let free = null;
  let paid = 0;
  if (mode === 'spirit') dupes = fresh = false;
  if (fresh && !canNew()) return { error: 'Du hast hier schon alles gesammelt – es gibt nichts Neues mehr.' };
  if (dupes && !canDupe()) return { error: 'Du besitzt noch kein Sammelstück, das sich verdoppeln ließe.' };
  if (mode === 'spirit') {
    if (!spiritGift()) return { error: 'Der Brunnengeist hat gerade nichts für dich.' };
    free = 'spirit';
  } else if (n === 1 && !dupes && !fresh && freeSingle()) free = freeSingle();
  else {
    paid = cost(n, fresh ? 'new' : dupes);
    if (state.gold < paid) return { error: 'Nicht genug Gold. Sammle Münzen auf dem Weg oder verkaufe Duplikate in der Galerie.' };
  }

  // Glückszauber: das erste Stück hat mindestens den Rang des Zaubers
  const lucky = mode === 'spirit' ? 0 : magic.useLuckyPull();
  const rolled = [];
  const taken = new Set();
  for (let i = 0; i < n; i++) {
    const min = mode === 'spirit' ? SPIRIT_MIN_TIER : lucky && i === 0 ? lucky : 0;
    rolled.push(dupes ? rollDupe(min, r) : fresh ? rollNew(min, r, taken) : rollOne(min, r));
  }
  const seen = new Set();
  const results = rolled.map(({ item, forced }) => {
    const isNew = !state.count(item.id) && !seen.has(item.id);
    seen.add(item.id);
    return { item, isNew, pity: forced && mode !== 'spirit' && !(lucky >= 3) };
  });
  state.pull(paid, rolled.map((x) => x.item));

  if (free === 'next') w().freeNext = false;
  if (free === 'daily') {
    if (w().dailyDay !== state.dayCount) w().dailyUsed = 0;
    w().dailyDay = state.dayCount;
    w().dailyUsed++;
  }
  if (free === 'spirit') {
    w().spiritGift = false;
    w().spiritWishes = (w().spiritWishes || 0) + 1;
  }
  // Glück beim Wünschen: der nächste Einzelwunsch ist gratis …
  let gotFreeNext = false;
  if (mode !== 'spirit' && !w().freeNext && r() < FREE_NEXT[tier()] + companions.bonus('luckWish')) {
    w().freeNext = true;
    gotFreeNext = true;
  }
  // … und ganz selten taucht der Brunnengeist mit einem Geschenk auf
  let gotSpirit = false;
  if (mode !== 'spirit' && !w().spiritGift) {
    for (let i = 0; i < n && !gotSpirit; i++) if (r() < SPIRIT_CHANCE[tier()]) gotSpirit = true;
    if (gotSpirit) w().spiritGift = true;
  }
  state.changed();
  return { results, paid, free, gotFreeNext, gotSpirit, dupes, fresh };
}

// ---------------------------------------------------------------- Brunnengeist

const SAY = {
  idle: [
    'Blubb … Hallo! Ich wohne hier unten.',
    'Jede Münze kitzelt so schön im Wasser.',
    'Ich zähle mit. Pech hält nicht ewig, versprochen!',
    'Ein Wunsch am Tag ist gratis – frag einfach.',
    'Baust du mich aus? Mit Laternen sehe ich viel schöner aus.',
  ],
  0: ['Ein kleiner Anfang!', 'Hm, Rang D. Das Wasser war wohl etwas trüb.', 'Nicht schlimm – Duplikate bringen Gold.'],
  1: ['Ein hübsches Stück!', 'Rang C, da glitzert schon was.'],
  2: ['Oh, das glänzt!', 'Rang B – nicht übel!'],
  3: ['Ooooh! Rang A! Ich bin ganz aufgeregt!', 'Das Wasser leuchtet lila – herrlich!'],
  4: ['RANG S?! Ich fall gleich aus dem Brunnen!', 'Golden! So etwas sehe ich nicht oft.'],
  5: ['… Rang SS. Ich bin sprachlos. Wirklich.', 'Das erzähle ich noch meinen Enkel-Geistern!'],
  pity: ['Endlich! Ich hab ein bisschen nachgeholfen.'],
  freeNext: ['Psst … der nächste Wunsch geht auf mich!'],
  spirit: ['Ich habe etwas Besonderes für dich … ein Wunsch, von mir persönlich!'],
  spiritUsed: ['Für dich nur das Beste. Komm bald wieder!'],
};
const pickLine = (list, r = Math.random) => list[Math.floor(r() * list.length)];

// Spruch des Geists (nach einem Wunsch oder zur Begrüßung)
export function say(res) {
  if (!res) return spiritGift() ? pickLine(SAY.spirit) : pickLine(SAY.idle);
  if (res.gotSpirit) return pickLine(SAY.spirit);
  if (res.free === 'spirit') return pickLine(SAY.spiritUsed);
  if (res.results.some((x) => x.pity)) return pickLine(SAY.pity);
  const best = Math.max(...res.results.map((x) => x.item.tier));
  if (res.gotFreeNext && best < 3) return pickLine(SAY.freeNext);
  return pickLine(SAY[best]);
}

// kleiner Geist (12×12), schaut nach links
const GHOST = [
  '....wwww....',
  '..wwwwwwww..',
  '.wwwwwwwwww.',
  '.wweewweeww.',
  'wwwekwwekwww',
  'wwwwwppwwwww',
  'wwwwwwwwwwww',
  'wwwwwwwwwwww',
  'wwwwwwwwwwww',
  '.wwwwwwwwww.',
  '.ww.www.ww..',
  '.w...w...w..',
];
const GHOST_COLORS = { w: '#c8f0ff', e: '#2a2140', k: '#ffffff', p: '#f2a0b0' };
let ghostImg = null;
function ghost() {
  if (!ghostImg) {
    const c = document.createElement('canvas');
    c.width = c.height = 12;
    const ctx = c.getContext('2d');
    GHOST.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = GHOST_COLORS[ch];
      ctx.fillRect(x, y, 1, 1);
    }));
    ghostImg = c;
  }
  return ghostImg;
}
export const ghostImage = ghost;

// Geist über dem Brunnen: blass, nachts deutlicher, mit Geschenk hell und mit „!“
export function drawSpirit(ctx, x, groundY, time, night) {
  const gift = spiritGift();
  const free = anyFree();
  const y = groundY - 40 + Math.round(Math.sin(time * 1.6) * 2);
  ctx.globalAlpha = gift ? 0.95 : 0.25 + night * 0.35;
  ctx.drawImage(ghost(), Math.round(x) - 6, y);
  ctx.globalAlpha = 1;
  if (gift) {
    // Sternchen und Ausrufezeichen
    for (let i = 0; i < 5; i++) {
      const a = time * 1.5 + (i * Math.PI * 2) / 5;
      if (Math.floor(time * 4 + i) % 3 === 0) continue;
      ctx.fillStyle = i % 2 ? '#ffd04a' : '#fdf6e3';
      ctx.fillRect(Math.round(x + Math.cos(a) * 11), Math.round(y + 6 + Math.sin(a) * 8), 1, 1);
    }
    ctx.fillStyle = '#ffd04a';
    ctx.fillRect(Math.round(x) - 1, y - 9, 2, 5);
    ctx.fillRect(Math.round(x) - 1, y - 3, 2, 2);
  } else if (free && Math.floor(time * 2) % 2) {
    // etwas umsonst: ein Funkeln über dem Wasser
    ctx.fillStyle = '#fdf6e3';
    ctx.fillRect(Math.round(x) - 1, groundY - 16, 3, 1);
    ctx.fillRect(Math.round(x), groundY - 17, 1, 3);
  }
}

export const rankId = (t) => RARITIES[t].id;
