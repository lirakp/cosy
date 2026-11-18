import { state } from './state.js';
import { render } from './art/core.js';
import { goldIcon, luckIcon, gladiatorIcon } from './art/buffs.js';
import * as sets from './sets.js';
import * as tailor from './tailor.js';
import * as realm from './realm.js';
import * as companions from './companions.js';

// Rausch-Effekte, die man mit etwas Glück beim Schlafen bekommt.

export const SLEEP_BUFF_CHANCE = 0.1; // 10 % Chance pro Nacht auf einen der drei
export const BUFF_MINUTES = 15; // so lange hält ein Rausch (echte Zeit)

export const BUFFS = {
  gold: {
    name: 'Goldrausch',
    rank: 'S',
    text: 'Münzen auf dem Weg sind 40 Gold wert, die Expedition bringt 5 % mehr Gold.',
  },
  luck: {
    name: 'Glücksrausch',
    rank: 'C',
    text: 'Am Wunschbrunnen und beim Arena-Händler steigen die Chancen auf seltene Ränge um 10 %.',
  },
  gladiator: {
    name: 'Gladiatorrausch',
    rank: 'SS',
    text: 'Dungeon und Bossarena: Erfolgschance +10 Prozentpunkte (bis 99 %).',
  },
  // Rausch-Arten der Portalwelten (aus deren Gerichten): wirken wie zwei Rausche zugleich
  inferno: {
    name: 'Höllenfeuer',
    rank: 'SS',
    realm: true,
    with: ['gold', 'gladiator'],
    text: 'Goldrausch und Gladiatorrausch zugleich.',
  },
  segen: {
    name: 'Himmelssegen',
    rank: 'SS',
    realm: true,
    with: ['luck', 'gold'],
    text: 'Glücksrausch und Goldrausch zugleich.',
  },
};

const ICONS = { gold: [goldIcon, 4], luck: [luckIcon, 3], gladiator: [gladiatorIcon, 4], inferno: [gladiatorIcon, 5], segen: [luckIcon, 5] };
const iconCache = new Map();
export function icon(id) {
  if (!iconCache.has(id)) iconCache.set(id, render(ICONS[id][0], 5150 + id.length, ICONS[id][1]));
  return iconCache.get(id);
}

export const COIN_NORMAL = 10;
export const COIN_GOLD_RUSH = 40;
export const EXPEDITION_BONUS = 0.05;
export const LUCK_FACTOR = 1.1;
export const GLADIATOR_BONUS = 0.1;
export const GLADIATOR_MAX = 0.99;

export function current(now = Date.now()) {
  const b = state.buff;
  return b && b.until > now && BUFFS[b.id] ? b : null;
}
// auch die kombinierten Rausche der Portalwelten zählen
export const active = (id) => {
  const c = current();
  return !!c && (c.id === id || !!BUFFS[c.id].with?.includes(id));
};
export const remaining = (now = Date.now()) => (current(now) ? Math.ceil((current(now).until - now) / 1000) : 0);

// Freundschaft (Bäckerin & Co.) lässt Räusche länger halten
export const duration = (minutes) => minutes * (1 + companions.bonus('buffTime'));
export function grant(id, now = Date.now(), minutes = BUFF_MINUTES) {
  state.buff = { id, until: now + duration(minutes) * 60000 };
}

// verlängert einen laufenden Rausch
export function extend(minutes, now = Date.now()) {
  const b = current(now);
  if (!b) return false;
  state.buff = { id: b.id, until: b.until + duration(minutes) * 60000 };
  return true;
}

// Gemütliche Einrichtung erhöht die Chance (bis 25 %)
export const sleepChance = () => SLEEP_BUFF_CHANCE + tailor.cozy() * tailor.COZY_STEP;

// Würfelt beim Aufwachen: mit 10 % ein zufälliger der drei Rausche, sonst nichts.
export function rollSleep(random = Math.random) {
  if (random() >= sleepChance()) return null;
  const ids = Object.keys(BUFFS).filter((id) => !BUFFS[id].realm);
  const id = ids[Math.floor(random() * ids.length)];
  grant(id);
  return id;
}

export const coinValue = () => ((active('gold') ? COIN_GOLD_RUSH : COIN_NORMAL) + sets.bonus('coins')) * realm.goldFactor();
export const expeditionFactor = () => (active('gold') ? 1 + EXPEDITION_BONUS : 1);
// Im Himmel gilt am Brunnen und beim Händler immer Glück
export const lucky = () => active('luck') || realm.bonus('luck') > 0;
// verschiebt eine Erfolgschance unter Gladiatorrausch nach oben
export const gladiator = (chance) => (active('gladiator') && chance > 0 ? Math.min(GLADIATOR_MAX, chance + GLADIATOR_BONUS) : chance);
