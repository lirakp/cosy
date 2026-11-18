import { RARITIES, worldItems, rollItem } from './items.js';
import { state } from './state.js';
import * as realm from './realm.js';
import * as buildings from './buildings.js';
import { haveFor, takeNeed, describeNeed, progressFactor } from './village.js';
import * as projects from './projects.js';

// Gildenhaus (Dorfprojekt): Daueraufträge und Tagesaufträge.
//
// Daueraufträge zählen über das ganze Spiel mit (alle Welten zusammen): Etagen im
// Abstieg, Bosse im Bossrush, erfolgreiche Dungeon-Erkundungen und Siege in der
// Bossarena. Jeder Meilenstein bringt eine steigende Belohnung. Ist das Limit
// erreicht (z. B. 1.500 Etagen), gibt es danach für jeden weiteren Schritt eine
// feste Standardbelohnung.
//
// Tagesaufträge: Jeden Spieltag neue Aufträge (1–3 je Stufe des Gildenhauses), die
// nach späteren Dingen fragen: Seide, Stoff, Erz hoher Ränge, Duplikate.

export const ORDERS = {
  descent: { name: 'Tiefenläufer', what: 'Etagen im Abstieg bezwingen', unit: 'Etagen', steps: [50, 100, 250, 500, 1000, 1500], repeat: 250 },
  rush: { name: 'Bossjäger', what: 'Bosse im Bossrush besiegen', unit: 'Bosse', steps: [25, 50, 100, 250, 500, 1000, 1500], repeat: 250 },
  dungeon: { name: 'Kundschafter', what: 'Dungeon-Erkundungen erfolgreich beenden', unit: 'Erkundungen', steps: [5, 10, 25, 50, 100, 200, 300], repeat: 50 },
  arena: { name: 'Arena-Champion', what: 'Bosse in der Bossarena besiegen', unit: 'Siege', steps: [5, 10, 25, 50, 100, 200, 300], repeat: 50 },
};
// Belohnung je Meilenstein (Index 0 …); danach die Standardbelohnung
export const MILESTONE_REWARDS = [
  { taler: 5, stern: 0, item: null },
  { taler: 10, stern: 0, item: null },
  { taler: 15, stern: 1, item: 2 },
  { taler: 25, stern: 2, item: 3 },
  { taler: 40, stern: 3, item: 3 },
  { taler: 60, stern: 5, item: 4 },
  { taler: 100, stern: 8, item: 4 },
];
export const STANDARD_REWARD = { taler: 20, stern: 2, item: null };

const g = () => (state.village.guild ||= { count: {}, claimed: {}, daily: {} });
export const count = (id) => g().count[id] || 0;
export const claimed = (id) => g().claimed[id] || 0; // so viele Meilensteine abgeholt (inkl. Wiederholungen)

// Ziel des nächsten (noch nicht abgeholten) Meilensteins
export function target(id, k = claimed(id)) {
  const o = ORDERS[id];
  if (k < o.steps.length) return o.steps[k];
  return o.steps[o.steps.length - 1] + (k - o.steps.length + 1) * o.repeat;
}
export const afterLimit = (id, k = claimed(id)) => k >= ORDERS[id].steps.length;
export const rewardOf = (id, k = claimed(id)) => (afterLimit(id, k) ? STANDARD_REWARD : MILESTONE_REWARDS[Math.min(k, MILESTONE_REWARDS.length - 1)]);
export const ready = (id) => count(id) >= target(id);
export const open = () => projects.stage('gilde') >= 1;

function giveCoins(taler, stern) {
  const c = (state.well.coins ||= { taler: 0, stern: 0, splinters: 0 });
  c.taler = (c.taler || 0) + taler;
  c.stern = (c.stern || 0) + stern;
}

// Belohnung eines Dauerauftrags abholen (nur mit Gildenhaus)
export function claim(id, r = Math.random) {
  if (!open() || !ORDERS[id] || !ready(id)) return null;
  const rw = rewardOf(id);
  giveCoins(rw.taler, rw.stern);
  let item = null;
  let isNew = false;
  if (rw.item !== null) {
    item = rollItem({ minTier: rw.item, random: r });
    isNew = !state.count(item.id);
    state.addItems([item], 'gilde');
  }
  g().claimed[id] = claimed(id) + 1;
  state.changed();
  return { ...rw, item, isNew, order: id };
}

// Wird von Dungeon, Arena, Bossrush und Abstieg aufgerufen
export function record(id, n = 1) {
  g().count[id] = count(id) + n;
}

// ---------------------------------------------------------------- Tagesaufträge

export const DAILY_COUNT = [0, 1, 2, 3];
const between = (r, a, b) => a + Math.floor(r() * (b - a + 1));

function makeDaily(level, r) {
  const arena = Math.max(0, buildings.tier('arena'));
  const mineDepth = Math.max(0, buildings.tier('mine'));
  const options = [
    () => ({ type: 'seide', tier: Math.min(arena, 1 + level), n: between(r, 3, 6) }),
    () => ({ type: 'stoff', tier: Math.min(arena, 2 + level), n: between(r, 8, 14) }),
    () => ({ type: 'ore', tier: Math.min(mineDepth, 2 + level), n: between(r, 15, 30) }),
    () => ({ type: 'dupes', minTier: Math.min(4, 1 + level), n: between(r, 5, 12) }),
  ];
  const need = options[Math.floor(r() * options.length)]();
  const gold = Math.round((between(r, 800, 1500) * (1 + level) * progressFactor() * (realm.inRealm() ? 3 : 1)) / 10) * 10;
  return { need, reward: { gold, taler: 5 + level * 5, stern: level, item: level >= 1 ? Math.min(4, level + 2) : null }, done: false };
}

// Aufträge des heutigen Spieltags in dieser Welt
export function dailies(r = Math.random) {
  const w = realm.current();
  const lvl = projects.stage('gilde');
  if (!lvl) return [];
  const d = g().daily[w];
  if (!d || d.day !== state.dayCount || d.list.length !== DAILY_COUNT[lvl]) {
    g().daily[w] = { day: state.dayCount, list: Array.from({ length: DAILY_COUNT[lvl] }, (_, i) => makeDaily(Math.min(i, lvl - 1), r)) };
    state.changed();
  }
  return g().daily[w].list;
}
export const canDeliver = (i) => {
  const q = dailies()[i];
  return !!q && !q.done && haveFor(q.need) >= q.need.n;
};
export function deliver(i, r = Math.random) {
  if (!canDeliver(i)) return null;
  const q = dailies()[i];
  takeNeed(q.need);
  state.addGold(q.reward.gold, 'gilde');
  giveCoins(q.reward.taler, q.reward.stern);
  let item = null;
  let isNew = false;
  if (q.reward.item !== null) {
    const pool = worldItems().filter((x) => x.tier >= q.reward.item);
    item = pool[Math.floor(r() * pool.length)];
    isNew = !state.count(item.id);
    state.addItems([item], 'gilde');
  }
  q.done = true;
  state.changed();
  return { ...q.reward, item, isNew };
}
export const describe = describeNeed;
export const rankName = (t) => RARITIES[t].id;
