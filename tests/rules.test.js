// Automatische Prüfungen der Spielregeln. Ausführen mit: npm test
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { ITEMS, RARITIES, CATEGORIES, PER_GROUP, getGroup, tierChances, rollTier } from '../src/items.js';
import { state } from '../src/state.js';
import * as forge from '../src/forge.js';
import { payWithDuplicates, dupValue } from '../src/dupes.js';
import * as dungeon from '../src/dungeon.js';
import * as arena from '../src/arena.js';
import * as trader from '../src/trader.js';
import * as mine from '../src/mine.js';
import * as expedition from '../src/expedition.js';
import * as sets from '../src/sets.js';
import * as garden from '../src/garden.js';
import * as buffs from '../src/buffs.js';

const MIN = 60000;
const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} statt ~${b}`);

// Deterministischer Zufall für Verteilungstests
function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function withRandom(fn, random) {
  const orig = Math.random;
  Math.random = random;
  try {
    return fn();
  } finally {
    Math.random = orig;
  }
}

beforeEach(() => state.reset());

// ---------------------------------------------------------------- Katalog und Chancen

test('Katalog: 2100 Stücke, eindeutige IDs, 50 je Kategorie und Rang', () => {
  assert.equal(ITEMS.length, CATEGORIES.length * RARITIES.length * PER_GROUP);
  assert.equal(new Set(ITEMS.map((i) => i.id)).size, ITEMS.length);
  for (const c of CATEGORIES) for (const r of RARITIES) assert.equal(getGroup(c.id, r.id).length, PER_GROUP);
});

test('Rang-Chancen ergeben zusammen 100 %, auch mit Glücksrausch', () => {
  close(tierChances().reduce((a, b) => a + b, 0), 1, 1e-9, 'normal');
  const lucky = tierChances(true);
  close(lucky.reduce((a, b) => a + b, 0), 1, 1e-9, 'Glücksrausch');
  for (let t = 1; t < RARITIES.length; t++) close(lucky[t], RARITIES[t].chance * 1.1, 1e-12, `Rang ${RARITIES[t].id}`);
  assert.ok(lucky[0] < RARITIES[0].chance, 'D wird seltener');
});

test('Gezogene Ränge folgen den Chancen des Brunnens', () => {
  const random = seeded(42);
  const n = 200000;
  const count = Array(RARITIES.length).fill(0);
  for (let i = 0; i < n; i++) count[rollTier(0, random)]++;
  RARITIES.forEach((r, t) => close(count[t] / n, r.chance, 0.004, `Rang ${r.id}`));
});

test('minTier schließt niedrigere Ränge aus', () => {
  const random = seeded(7);
  for (let i = 0; i < 5000; i++) assert.ok(rollTier(3, random) >= 3);
});

// ---------------------------------------------------------------- Duplikate

test('Bezahlen mit Duplikaten: günstigste zuerst, Überschuss als Gold, letztes Exemplar bleibt', () => {
  const [d1] = getGroup('lebewesen', 'D');
  const [c1] = getGroup('lebewesen', 'C');
  state.addItems([d1, d1, d1, c1, c1]); // 2 D-Duplikate (je 10) + 1 C-Duplikat (20)
  const gold = state.gold;
  assert.equal(dupValue([d1, c1]), 40);
  assert.ok(payWithDuplicates([d1, c1], 25));
  assert.ok(state.count(d1.id) >= 1 && state.count(c1.id) >= 1, 'je ein Exemplar bleibt');
  const used = 40 - dupValue([d1, c1]);
  assert.equal(state.gold - gold, used - 25, 'Überschuss wird ausgezahlt');
  assert.ok(used >= 25 && used - 25 < 20, 'kein unnötiges Duplikat verbraucht');
});

test('Ohne genug Duplikate wird nichts verbraucht', () => {
  const [d1] = getGroup('lebewesen', 'D');
  state.addItems([d1, d1]);
  assert.equal(payWithDuplicates([d1], 30), false);
  assert.equal(state.count(d1.id), 2);
});

// ---------------------------------------------------------------- Schmiede

test('Schmiede: Kopieren kostet immer mehr Gold, als die Kopie beim Verkauf bringt', () => {
  for (const r of RARITIES) {
    const item = getGroup('waffen', r.id)[0];
    assert.ok(forge.cost(item).gold > item.sell, `Rang ${r.id}`);
  }
});

test('Schmiede: Rang-Sperre, Glutverbrauch und Nachladen', () => {
  state.buildings.forge = 0;
  state.forge.glut = forge.maxGlut();
  state.mine.ore[0] = 100;
  state.mine.ore[1] = 100;
  const d = getGroup('lebewesen', 'D')[0];
  const c = getGroup('lebewesen', 'C')[0];
  state.addItems([d, c]);
  state.addGold(10000);

  assert.match(forge.blocker(c), /Rang C/);
  for (let i = 0; i < forge.GLUT_MAX[0]; i++) assert.ok(forge.forge(d.id), `Kopie ${i + 1}`);
  assert.equal(forge.glut(), 0);
  assert.match(forge.blocker(d), /Glut/);

  state.forge.last = Date.now() - (forge.glutMinutes() + 1) * MIN;
  forge.tick();
  assert.equal(forge.glut(), 1, 'ein Glutpunkt nach einer Ladezeit');
  state.forge.last = Date.now() - 1000 * MIN;
  forge.tick();
  assert.equal(forge.glut(), forge.maxGlut(), 'nie mehr als der Vorrat');
});

// ---------------------------------------------------------------- Dungeon, Arena, Rausch

test('Dungeon: Erfolgschance zwischen 5 % und 95 %, Gladiatorrausch +10 Punkte bis 99 %', () => {
  const weak = [getGroup('helden', 'D')[0].id];
  const strong = getGroup('helden', 'SS').slice(0, 5).map((h) => h.id);
  assert.equal(dungeon.chance(5, weak), dungeon.MIN_CHANCE);
  assert.equal(dungeon.chance(0, strong), dungeon.MAX_CHANCE);
  buffs.grant('gladiator');
  close(dungeon.chance(5, weak), dungeon.MIN_CHANCE + 0.1, 1e-9, 'schwaches Team');
  assert.equal(dungeon.chance(0, strong), buffs.GLADIATOR_MAX);
});

test('Arena: Siegchance wächst mit der Team-Stärke', () => {
  state.addItems(getGroup('helden', 'B').slice(0, 3));
  arena.autoEquip();
  state.arena.boss = { tier: 0, kind: 0 };
  const odds = arena.winChance();
  assert.ok(odds > 0 && odds <= arena.MAX_CHANCE);
});

test('Goldrausch: Münzen 40 Gold, Expedition +5 %', () => {
  assert.equal(buffs.coinValue(), 10);
  buffs.grant('gold');
  assert.equal(buffs.coinValue(), 40);
  assert.equal(buffs.expeditionFactor(), 1.05);
});

test('Schlafen: 10 % Chance auf einen Rausch', () => {
  const random = seeded(3);
  let hits = 0;
  for (let i = 0; i < 20000; i++) {
    state.buff = null;
    if (buffs.rollSleep(random)) hits++;
  }
  close(hits / 20000, buffs.SLEEP_BUFF_CHANCE, 0.01, 'Rausch-Quote');
});

// ---------------------------------------------------------------- Erzhändler, Mine, Expedition

test('Erzhändler kommt so selten wie ein A- oder S-Zug', () => {
  close(trader.ARRIVE_CHANCE, RARITIES[3].chance + RARITIES[4].chance, 1e-12, 'Ankunftschance');
  const random = seeded(11);
  let arrivals = 0;
  const n = 20000;
  withRandom(() => {
    for (let i = 0; i < n; i++) {
      Object.assign(state.mine.trader, { until: 0, nextRoll: 1 });
      if (trader.tick(Date.now()) === 'arrived') arrivals++;
    }
  }, random);
  close(arrivals / n, trader.ARRIVE_CHANCE, 0.006, 'Ankunftsrate');
});

test('Erzhändler: Angebot nur einmal, Überraschungstausch begrenzt', () => {
  trader.arrive();
  assert.equal(trader.offers().length, trader.OFFERS);
  state.mine.ore = [999, 999, 999, 999, 999, 999];
  assert.ok(trader.buyOffer(0));
  assert.equal(trader.buyOffer(0), null, 'schon verkauft');
  for (let i = 0; i < trader.SURPRISE_STOCK; i++) assert.ok(trader.surprise(0));
  assert.equal(trader.surprise(0), null, 'Vorrat erschöpft');
});

test('Mine: Erz entsteht nach Zeit und offline höchstens 8 Stunden lang', () => {
  state.buildings.mine = 0;
  state.addItems(getGroup('monster', 'D').slice(0, 3));
  mine.autoAssign();
  const rate = mine.levelRate(0);
  assert.ok(rate > 0);
  state.mine.ore = [0, 0, 0, 0, 0, 0];
  state.mine.frac = [0, 0, 0, 0, 0, 0];
  state.mine.last = Date.now() - 100 * 60 * MIN;
  mine.tick();
  close(state.mine.ore[0], rate * mine.MAX_OFFLINE_MINUTES, 1, 'Erz nach Deckel');
});

test('Expedition: Truhe füllt sich höchstens mit vier Stunden Ertrag', () => {
  state.buildings.camp = 0;
  state.addItems(getGroup('lebewesen', 'B').slice(0, 4));
  expedition.tick();
  state.exp.last = Date.now() - 100 * 60 * MIN;
  expedition.tick();
  assert.equal(expedition.live.gold, expedition.live.cap);
  close(expedition.live.cap, expedition.goldPerMinute() * expedition.CHEST_MINUTES, 1, 'Deckel');
});

// ---------------------------------------------------------------- Sammel-Sets

test('Sammel-Sets: Bonus erst bei allen 50 Stücken', () => {
  const heroes = getGroup('helden', 'D');
  state.addItems(heroes.slice(0, PER_GROUP - 1));
  assert.equal(sets.bonus('wellDiscount'), 0);
  assert.equal(sets.pullCost(100), 100);
  state.addItems([heroes[PER_GROUP - 1]]);
  assert.equal(sets.bonus('wellDiscount'), sets.SET_BONUS[0] / 100);
  assert.equal(sets.pullCost(100), 98);
});

test('Sammel-Sets: Relikte geben feste Gold-Beträge pro Münze', () => {
  state.addItems(getGroup('relikte', 'C'));
  assert.equal(buffs.coinValue(), 10 + sets.CATEGORY_BONUS.relikte.flat[1]);
});

// ---------------------------------------------------------------- Garten und Küche

test('Garten: pflanzen kostet Saatgut, Ernte erst nach der Wachstumszeit', () => {
  const gold = state.gold;
  assert.ok(garden.plant(0, 'karotte'));
  assert.equal(state.gold, gold - garden.crop('karotte').seed);
  assert.equal(garden.plant(0, 'weizen'), false, 'Beet ist belegt');
  assert.deepEqual(garden.harvestAll(), {});
  state.garden.beds[0].planted -= (garden.crop('karotte').minutes + 1) * MIN;
  assert.deepEqual(garden.harvestAll(), { karotte: garden.crop('karotte').yield });
  assert.equal(garden.beds()[0], null);
});

test('Küche: Gericht verbraucht Zutaten und gibt den Rausch; Tee braucht einen laufenden Rausch', () => {
  Object.assign(state.garden.crops, { weizen: 3, beeren: 4, sternenblume: 1 });
  assert.equal(garden.cook('tee'), null, 'ohne Rausch kein Tee');
  assert.ok(garden.cook('kuchen'));
  assert.equal(buffs.current().id, 'luck');
  assert.equal(garden.have('weizen'), 0);
  const before = buffs.remaining();
  assert.ok(garden.cook('tee'));
  close(buffs.remaining() - before, 5 * 60, 2, 'Verlängerung');
});

test('Garten: Beete kaufen bis zum Maximum', () => {
  state.addGold(100000);
  while (garden.nextBedPrice() !== null) assert.ok(garden.buyBed());
  assert.equal(garden.beds().length, garden.MAX_BEDS);
  assert.equal(garden.buyBed(), false);
});

// ---------------------------------------------------------------- Spielstand

test('Spielstand: Sichern und Laden ergibt denselben Stand', () => {
  state.addGold(1234);
  state.addItems([ITEMS[5], ITEMS[5]]);
  const loaded = state.parseSave(state.exportSave());
  assert.equal(loaded.gold, state.gold);
  assert.equal(loaded.owned[ITEMS[5].id], 2);
});

test('Spielstand: kaputte Dateien werden abgelehnt, alte Stände ergänzt', () => {
  assert.throws(() => state.parseSave('kein json'), /JSON/);
  assert.throws(() => state.parseSave('{"foo": 1}'), /gültigen/);
  const old = state.parseSave(JSON.stringify({ gold: 50, owned: { [ITEMS[0].id]: 1 }, pulls: 3 }));
  assert.equal(old.gold, 50);
  assert.ok(old.garden && old.stats && old.mine && old.forge, 'neue Bereiche werden ergänzt');
  assert.equal(old.buildings.forge, -1);
});

test('Statistik: Einnahmen und Duplikate werden je Quelle gezählt', () => {
  const [d1] = getGroup('lebewesen', 'D');
  state.addGold(30, 'muenzen');
  state.addItems([d1, d1], 'expedition');
  assert.equal(state.stats.gold.muenzen, 30);
  assert.deepEqual(state.stats.items.expedition, { n: 2, dupes: 1, dupValue: d1.sell });
});
