import { RARITIES, rollItem, rollTier, worldItems } from './items.js';
import { state } from './state.js';
import * as buildings from './buildings.js';
import * as buffs from './buffs.js';
import * as magic from './magic.js';
import * as realm from './realm.js';
import * as companions from './companions.js';
import * as sets from './sets.js';

// Wunschbrunnen: Gewünscht wird mit eigenen Währungen, die man mit Gold kauft:
// Glückstaler (günstig, meist D/C) und Sternentaler (teuer, B bis SS). Dazu
// Glückszähler (Pity), tägliche Gratiswünsche, ein zufälliger Gratis-Folgewunsch
// und der Brunnengeist, der selten einen Wunsch mit garantiert Rang A–SS
// verschenkt. Der Brunnen lässt sich ausbauen (Rang D bis SS).

// Glückszähler: spätestens beim 60. Stück ohne A ist es A, beim 300. ohne S ein S
export const PITY_A = 60;
export const PITY_S = 300;

// je Brunnen-Rang (D … SS)
export const DISCOUNT = [0, 0.04, 0.08, 0.12, 0.16, 0.2]; // günstigere Taler
export const DAILY_FREE = [1, 1, 1, 2, 2, 3]; // Gratiswünsche je Spieltag
export const FREE_NEXT = [0.05, 0.06, 0.07, 0.08, 0.1, 0.12]; // Chance: nächster Einzelwunsch gratis
export const SPIRIT_CHANCE = [0.004, 0.005, 0.006, 0.008, 0.01, 0.0125]; // je gezogenem Stück
export const SPIRIT_MIN_TIER = 3; // Geschenk des Brunnengeists: mindestens Rang A

// Duplikat- und Neu-Wünsche treffen nur mit dieser Chance je Stück, sonst ein normales Stück
export const MODE_CHANCE = 0.75;
// Die Modi kosten dasselbe wie ein normaler Wunsch (kein Aufschlag)
export const MODE_EXTRA = { dupes: 0, new: 0 };

// Währungen (je Welt). odds: Chance je Rang D … SS. Ein 10er-Pack kostet wie 9.
export const CURRENCIES = {
  taler: { name: 'Glückstaler', icon: '🪙', price: 40, odds: [0.55, 0.4, 0.04, 0.009, 0.0009, 0.0001], text: 'fast immer Rang D oder C, mit etwas Glück höher' },
  stern: { name: 'Sternentaler', icon: '🌟', price: 500, odds: [0, 0, 0.7, 0.25, 0.045, 0.005], text: 'garantiert Rang B, A, S oder SS' },
};
// Jeder Glückstaler-Wunsch bringt einen Sternsplitter; so viele ergeben einen Sternentaler
export const SPLINTERS_PER_STAR = 25;
// Gratiswünsche (Tag, Glückswurf) würfeln wie ein Glückstaler
const FREE_CURRENCY = 'taler';

const w = () => state.well;
export const tier = () => Math.max(0, buildings.tier('well'));

// ---------------------------------------------------------------- Währungen

const wallet = () => (w().coins ||= { taler: 0, stern: 0, splinters: 0 });
export const coins = (id) => wallet()[id] || 0;
export const splinters = () => wallet().splinters || 0;
// Preis in Gold (10er-Pack wie 9, Brunnen-Rabatt gilt, in den Dimensionen doppelt)
// Helden-Set, Begleiter, Statuen und Kleidung („taler“) senken den Preis weiter (zusammen höchstens −50 %)
export const coinPrice = (id, n = 1) => sets.pullCost(CURRENCIES[id].price * (n === 10 ? 9 : n) * (1 - DISCOUNT[tier()]), companions.bonus('taler')) * (realm.inRealm() ? realm.PULL : 1);
export function buyCoins(id, n = 1) {
  if (!CURRENCIES[id] || !state.spend(coinPrice(id, n), 'brunnen')) return false;
  wallet()[id] = coins(id) + n;
  state.changed();
  return true;
}
const addCoins = (id, n) => (wallet()[id] = coins(id) + n);

// Wie viele Taler ein Wunsch kostet: { taler, stern }
export function price(currency, n, variant = 'normal') {
  const out = { taler: 0, stern: 0 };
  out[currency] += n;
  out.taler += (MODE_EXTRA[variant] || 0) * n;
  return out;
}
export const canPay = (p) => coins('taler') >= p.taler && coins('stern') >= p.stern;

// Glückszähler: Mindest-Rang, wenn die Garantie fällig ist
function pityMin(minTier) {
  if (w().pityS >= PITY_S - 1) return Math.max(minTier, 4);
  if (w().pityA >= PITY_A - 1) return Math.max(minTier, 3);
  return minTier;
}
// Rang nach den Chancen einer Währung (Glücksrausch hebt die Ränge ab C wie gewohnt)
function rollRank(currency, minTier, r) {
  const odds = CURRENCIES[currency].odds.map((p, t) => (t >= 1 && buffs.lucky() ? p * buffs.LUCK_FACTOR : p));
  const pool = odds.map((p, t) => (t >= minTier ? p : 0));
  const sum = pool.reduce((a, b) => a + b, 0);
  if (sum <= 0) return Math.max(minTier, rollTier(minTier, r));
  let u = r() * sum;
  for (let k = 0; k < pool.length; k++) {
    u -= pool[k];
    if (u < 0) return k;
  }
  return pool.length - 1;
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

// Ein Stück: Rang würfeln (mit Glückszähler), dann aus dem passenden Vorrat –
// pick: 'normal' (alle), 'dupes' (nur eigene), 'new' (nur fehlende)
function rollOne(currency, minTier, r, pick = 'normal', taken = new Set()) {
  const min = pityMin(minTier);
  const forced = min >= 3 && min > minTier;
  const t0 = rollRank(currency, min, r);
  if (pick !== 'normal') {
    const want = (i) => (pick === 'dupes' ? state.count(i.id) > 0 : !state.count(i.id) && !taken.has(i.id));
    // erst der gewürfelte Rang, dann niedrigere, dann höhere (nie unter dem Mindest-Rang, wenn es höher etwas gibt)
    const order = [...Array.from({ length: t0 + 1 }, (_, k) => t0 - k), ...Array.from({ length: RARITIES.length - t0 - 1 }, (_, k) => t0 + 1 + k)];
    for (const t of order) {
      if (t < min && order.some((u) => u >= min && worldItems().some((i) => i.tier === u && want(i)))) continue;
      const pool = worldItems().filter((i) => i.tier === t && want(i));
      if (pool.length) {
        const item = pool[Math.floor(r() * pool.length)];
        taken.add(item.id);
        countPity(item);
        return { item, forced };
      }
    }
  }
  const item = rollItem({ tier: t0, random: r });
  countPity(item);
  return { item, forced };
}

export const canDupe = () => worldItems().some((i) => state.count(i.id));
export const canNew = () => worldItems().some((i) => !state.count(i.id));

// Tägliche Gratiswünsche (Spieltag = state.dayCount)
export function dailyLeft() {
  const used = w().dailyDay === state.dayCount ? w().dailyUsed : 0;
  return Math.max(0, DAILY_FREE[tier()] - used);
}
export const freeNext = () => !!w().freeNext;
export const spiritGift = () => !!w().spiritGift;
// Ist gerade ein Einzelwunsch gratis? ('next' | 'daily' | null)
export const freeSingle = () => (freeNext() ? 'next' : dailyLeft() ? 'daily' : null);
// Gibt es am Brunnen etwas umsonst? (Glitzern in der Welt)
export const anyFree = () => !!freeSingle() || spiritGift();

// Wie viele Stücke höchstens noch bis zur Garantie
export const untilA = () => PITY_A - w().pityA;
export const untilS = () => PITY_S - w().pityS;

// Wünschen. mode: 1 | 10 | 'free' (Gratiswunsch) | 'spirit' (Geschenk des Geists).
// currency: 'taler' | 'stern' · variant: 'normal' | 'dupes' | 'new'
//   { results: [{ item, isNew, pity }], cost, free, gotFreeNext, gotSpirit, starsMade }
export function pull(mode, r = Math.random, { currency = 'taler', variant = 'normal', dupes = false, fresh = false } = {}) {
  if (dupes) variant = 'dupes';
  if (fresh) variant = 'new';
  const n = mode === 10 ? 10 : 1;
  let free = null;
  let cost = { taler: 0, stern: 0 };
  if (mode === 'spirit') {
    if (!spiritGift()) return { error: 'Der Brunnengeist hat gerade nichts für dich.' };
    free = 'spirit';
    variant = 'normal';
  } else if (mode === 'free') {
    if (!freeSingle()) return { error: 'Gerade gibt es keinen Gratiswunsch.' };
    free = freeSingle();
    variant = 'normal';
    currency = FREE_CURRENCY;
  } else {
    if (!CURRENCIES[currency]) return { error: 'Unbekannte Währung.' };
    cost = price(currency, n, variant);
    if (!canPay(cost)) return { error: `Nicht genug Taler – kauf ${cost.stern ? 'Sternentaler' : 'Glückstaler'} mit Gold.` };
  }
  if (variant === 'new' && !canNew()) return { error: 'Du hast hier schon alles gesammelt – es gibt nichts Neues mehr.' };
  if (variant === 'dupes' && !canDupe()) return { error: 'Du besitzt noch kein Sammelstück, das sich verdoppeln ließe.' };
  wallet().taler -= cost.taler;
  wallet().stern -= cost.stern;

  // Glückszauber: das erste Stück hat mindestens den Rang des Zaubers
  const lucky = free === 'spirit' ? 0 : magic.useLuckyPull();
  const rolled = [];
  const taken = new Set();
  for (let i = 0; i < n; i++) {
    if (free === 'spirit') {
      const item = rollItem({ minTier: SPIRIT_MIN_TIER, random: r });
      countPity(item);
      rolled.push({ item, forced: false });
      continue;
    }
    const min = lucky && i === 0 ? lucky : 0;
    // Duplikat-/Neu-Wünsche treffen zu 75 %, sonst kommt ein ganz normales Stück
    const pick = variant !== 'normal' && r() < MODE_CHANCE ? variant : 'normal';
    rolled.push(rollOne(currency, min, r, pick, taken));
  }
  const seen = new Set();
  const results = rolled.map(({ item, forced }) => {
    const isNew = !state.count(item.id) && !seen.has(item.id);
    seen.add(item.id);
    return { item, isNew, pity: forced };
  });
  state.pull(0, rolled.map((x) => x.item));

  // Sternsplitter aus Glückstaler-Wünschen
  let starsMade = 0;
  if (!free && currency === 'taler') {
    wallet().splinters = splinters() + n;
    while (wallet().splinters >= SPLINTERS_PER_STAR) {
      wallet().splinters -= SPLINTERS_PER_STAR;
      addCoins('stern', 1);
      starsMade++;
    }
  }
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
  if (!free && !w().freeNext && r() < FREE_NEXT[tier()] + companions.bonus('luckWish')) {
    w().freeNext = true;
    gotFreeNext = true;
  }
  // … und ganz selten taucht der Brunnengeist mit einem Geschenk auf
  let gotSpirit = false;
  if (free !== 'spirit' && !w().spiritGift) {
    for (let i = 0; i < n && !gotSpirit; i++) if (r() < SPIRIT_CHANCE[tier()]) gotSpirit = true;
    if (gotSpirit) w().spiritGift = true;
  }
  state.changed();
  return { results, cost, free, gotFreeNext, gotSpirit, starsMade, currency, variant };
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
