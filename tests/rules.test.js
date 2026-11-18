// Automatische Prüfungen der Spielregeln. Ausführen mit: npm test
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { ITEMS, RARITIES, CATEGORIES, PER_GROUP, getGroup, tierChances, rollTier, ALL_ITEMS, worldItems, rollItem } from '../src/items.js';
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
  state.buildings.dungeon = 0;
  state.addItems([getGroup('helden', 'D')[0]]);
  dungeon.party.autoEquip();
  assert.equal(dungeon.chance(5), dungeon.MIN_CHANCE, 'ein D-Held gegen SS');
  assert.equal(dungeon.chance(0, 100000), dungeon.MAX_CHANCE);
  buffs.grant('gladiator');
  close(dungeon.chance(5), dungeon.MIN_CHANCE + 0.1, 1e-9, 'schwaches Team');
  assert.equal(dungeon.chance(0, 100000), buffs.GLADIATOR_MAX);
});

test('Dungeon: Ausrüstung erhöht die Team-Stärke wie in der Arena', () => {
  state.buildings.dungeon = 0;
  const hero = getGroup('helden', 'C')[0];
  state.addItems([hero, getGroup('waffen', 'C')[0], getGroup('ruestung', 'C')[0]]);
  assert.ok(dungeon.party.equip(0, 'hero', hero.id));
  const bare = dungeon.power();
  assert.equal(bare, dungeon.party.heroPower(hero));
  dungeon.party.autoEquip();
  assert.ok(dungeon.power() > bare);
});

test('Teams: Ein Held oder Stück kann nicht gleichzeitig in Arena und Dungeon sein', () => {
  state.buildings.dungeon = 0;
  state.buildings.arena = 0;
  const [h1, h2] = getGroup('helden', 'B');
  const sword = getGroup('waffen', 'B')[0];
  state.addItems([h1, h2, sword]);
  assert.ok(arena.equip(0, 'hero', h1.id));
  assert.ok(arena.equip(0, 'waffen', sword.id));
  assert.equal(dungeon.party.equip(0, 'hero', h1.id), false, 'Held kämpft schon in der Arena');
  assert.equal(dungeon.party.equip(0, 'waffen', sword.id), false, 'Waffe wird schon in der Arena getragen');
  dungeon.party.autoEquip();
  assert.deepEqual(dungeon.party.heroIds(), [h2.id], 'automatisch nur freie Helden');
  assert.equal(arena.equip(1, 'hero', h2.id), false, 'umgekehrt genauso');
  assert.ok(arena.candidates('hero').every((h) => h.id !== h2.id));
});

test('Dungeon: Team ist während einer Erkundung gesperrt, die Stärke beim Aufbruch zählt', () => {
  state.buildings.dungeon = 0;
  const [h1, h2] = getGroup('helden', 'D');
  state.addItems([h1, h2]);
  dungeon.party.equip(0, 'hero', h1.id);
  const p = dungeon.power();
  assert.ok(dungeon.start(0));
  assert.equal(dungeon.party.equip(1, 'hero', h2.id), false);
  assert.equal(dungeon.party.autoEquip(), false);
  assert.equal(state.dungeon.run.power, p);
  dungeon.abort();
  assert.ok(dungeon.party.equip(1, 'hero', h2.id));
});

test('Stufen gelten in Arena und Dungeon, jeweils bis zum Rang der Anlage', () => {
  const hero = getGroup('helden', 'B')[0];
  state.addItems([hero, ...getGroup('helden', 'C').slice(0, 6), ...getGroup('helden', 'C').slice(0, 6)]);
  state.buildings.arena = 2;
  state.buildings.dungeon = 0;
  assert.ok(arena.levelUp(hero));
  assert.ok(arena.levelUp(hero));
  assert.equal(arena.levelOf(hero.id), 2);
  assert.equal(dungeon.party.levelOf(hero.id), 0, 'Tor-Rang D begrenzt die Stufe im Dungeon');
  state.buildings.dungeon = 1;
  assert.equal(dungeon.party.levelOf(hero.id), 1);
  state.buildings.dungeon = 5;
  assert.equal(dungeon.party.levelOf(hero.id), 2, 'dieselbe Stufe wie in der Arena');
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

// ---------------------------------------------------------------- Dorf

import * as village from '../src/village.js';

test('Dorf: Aufgaben sind machbar – Erz nur aus offenen Minen-Ebenen', () => {
  const random = seeded(5);
  for (let i = 0; i < 2000; i++) {
    const q = village.makeQuest(village.VILLAGERS[i % village.VILLAGERS.length].id, random);
    assert.notEqual(q.need.type, 'ore', 'ohne Mine keine Erz-Aufgaben');
  }
  state.buildings.mine = 2;
  for (let i = 0; i < 2000; i++) {
    const q = village.makeQuest('jonas', random);
    if (q.need.type === 'ore') assert.ok(q.need.tier <= 2, 'Erz höchstens aus Ebene C');
    if (q.difficulty === 'leicht' && q.need.type === 'ore') assert.equal(q.need.tier, 0);
  }
});

test('Dorf: Aufgabe abgeben verbraucht das Verlangte, zahlt aus und kommt später neu', () => {
  state.village.quests.greta = { villager: 'greta', difficulty: 'leicht', need: { type: 'crop', id: 'karotte', n: 3 }, reward: { gold: 80, item: null } };
  assert.equal(village.complete('greta'), null, 'ohne Karotten geht es nicht');
  state.garden.crops.karotte = 5;
  const gold = state.gold;
  const res = village.complete('greta');
  assert.ok(res);
  assert.equal(state.gold, gold + 80);
  assert.equal(garden.have('karotte'), 2);
  assert.equal(state.village.quests.greta, null);
  assert.ok(state.village.next.greta > Date.now(), 'neue Aufgabe erst nach einer Pause');
  state.village.next.greta = 0;
  assert.ok(village.quest('greta'), 'danach gibt es eine neue Aufgabe');
});

test('Dorf: Sammelstück-Aufgaben nehmen nur Duplikate, nie das letzte Exemplar', () => {
  const item = getGroup('waffen', 'C')[0];
  state.addItems([item]);
  state.village.quests.jonas = { villager: 'jonas', difficulty: 'mittel', need: { type: 'item', cat: 'waffen', tier: 1, n: 1 }, reward: { gold: 200, item: null } };
  assert.equal(village.canComplete(state.village.quests.jonas), false);
  state.addItems([item]);
  assert.ok(village.complete('jonas'));
  assert.equal(state.count(item.id), 1);
});

test('Markt: Kaufen am Stand kostet mehr, als der Ankauf zahlt – keine Gelddruckmaschine', () => {
  for (const r of RARITIES) {
    const item = getGroup('relikte', r.id)[0];
    assert.ok(village.stockPrice(item) > village.wantPrice(item), `Rang ${r.id}`);
    assert.ok(village.wantPrice(item) > item.sell, 'Ankauf lohnt mehr als Verkauf in der Galerie');
  }
});

test('Markt: Saatpäckchen sind günstiger und werden beim Pflanzen zuerst verbraucht', () => {
  assert.ok(village.seedPrice('kuerbis') < garden.crop('kuerbis').seed);
  assert.ok(village.buySeeds('kuerbis', 1));
  const gold = state.gold;
  assert.ok(garden.plant(0, 'kuerbis'));
  assert.equal(state.gold, gold, 'Päckchen statt Gold');
  assert.equal(village.seeds('kuerbis'), 0);
});

test('Angeln: Fangquoten folgen den Brunnen-Chancen, Flaschenpost selten', () => {
  const random = seeded(9);
  const n = 40000;
  const count = Array(RARITIES.length).fill(0);
  let treasure = 0;
  for (let i = 0; i < n; i++) {
    const r = village.rollCatch(random, 'Tag');
    if (r.treasure) treasure++;
    else count[r.tier]++;
  }
  close(treasure / n, village.TREASURE_CHANCE, 0.005, 'Flaschenpost');
  RARITIES.forEach((r, t) => close(count[t] / (n - treasure), r.chance, 0.008, `Fisch Rang ${r.id}`));
});

test('Angeln: 24 Arten, jede beißt nur zu ihrer Tageszeit, jeder Rang hat immer etwas', () => {
  assert.equal(village.FISH.length, 24);
  assert.equal(new Set(village.FISH.map((f) => f.id)).size, 24);
  const random = seeded(31);
  for (const phase of ['Morgen', 'Tag', 'Abend', 'Nacht']) {
    for (let i = 0; i < 3000; i++) {
      const r = village.rollCatch(random, phase);
      if (r.treasure) continue;
      const ofTier = village.FISH.filter((f) => f.tier === r.tier);
      if (ofTier.some((f) => village.isActive(f, phase))) assert.ok(village.isActive(r.fish, phase), `${r.fish.name} ${phase}`);
    }
  }
  const nightOnly = village.FISH.filter((f) => f.time === 'night');
  assert.ok(nightOnly.length >= 5, 'mehrere nachtaktive Arten');
  for (let i = 0; i < 3000; i++) {
    const r = village.rollCatch(random, 'Tag');
    if (!r.treasure) assert.notEqual(r.fish.time, 'night', 'tagsüber keine Nachtfische (wo es Alternativen gibt)');
  }
});

test('Angeln: alte Spielstände mit Fischen nach Rang werden übernommen', () => {
  const loaded = state.parseSave(JSON.stringify({ gold: 1, owned: {}, village: { fish: { 0: 3, 3: 1 }, caughtBy: { 5: 1, bottle: 2 } } }));
  assert.deepEqual(loaded.village.fish, { weissfisch: 3, hecht: 1 });
  assert.deepEqual(loaded.village.caughtBy, { mondfisch: 1, bottle: 2 });
});

test('Dorf: Fisch-Aufgaben nehmen beliebige Arten des verlangten Rangs', () => {
  state.village.fish = { karpfen: 1, wels: 2 };
  state.village.quests.ole = { villager: 'ole', difficulty: 'mittel', need: { type: 'fish', tier: 2, n: 3 }, reward: { gold: 100, item: null } };
  assert.ok(village.complete('ole'));
  assert.equal(village.tierCount(2), 0);
});

test('Arena: Helden werden mit Helden-Duplikaten gelevelt, bis zum Arena-Rang', () => {
  const hero = getGroup('helden', 'B')[0];
  const dupe = getGroup('helden', 'C')[0];
  const sword = getGroup('waffen', 'A')[0];
  state.addItems([hero, dupe, dupe, dupe, sword, sword, sword]);
  state.buildings.arena = 0;
  assert.equal(arena.levelCost(hero), null, 'Arena Rang D: noch kein Leveln');
  state.buildings.arena = 1;
  const before = arena.heroPower(hero);
  assert.equal(arena.material(hero), 2 * dupe.sell, 'nur Helden-Duplikate zählen');
  assert.ok(arena.levelUp(hero));
  assert.equal(arena.levelOf(hero.id), 1);
  assert.ok(arena.heroPower(hero) > before);
  assert.equal(state.count(sword.id), 3, 'Waffen-Duplikate bleiben unangetastet');
  assert.equal(arena.levelCost(hero), null, 'weiter erst mit höherem Arena-Rang');
  state.arena.team[0].hero = hero.id;
  assert.equal(arena.memberPower(state.arena.team[0]), arena.heroPower(hero));
});

test('Angeln: der beim Auswerfen gewürfelte Fang wird erst beim Einholen gezählt', () => {
  const random = seeded(21);
  let res;
  do res = village.rollCatch(random); while (res.treasure);
  assert.equal(village.fishCount(res.species), 0, 'Würfeln allein ändert nichts');
  village.applyCatch(res);
  assert.equal(village.fishCount(res.species), 1);
  assert.equal(village.caughtTotal(res.species), 1, 'fürs Angelbuch mitgezählt');
  village.sellFish(res.species);
  assert.equal(village.caughtTotal(res.species), 1, 'Verkaufen ändert das Angelbuch nicht');
});

// ---------------------------------------------------------------- Automatik

import * as gardener from '../src/gardener.js';
import * as fishtrap from '../src/fishtrap.js';

test('Gartenhelfer: erntet und pflanzt offline mehrere Durchgänge, finanziert aus Verkäufen', () => {
  const c = getGroup('lebewesen', 'D')[0];
  state.addItems([c]);
  assert.ok(gardener.assign(c.id));
  gardener.setSell(true);
  assert.ok(garden.plant(0, 'karotte'));
  const gold = state.gold;
  state.garden.beds[0].planted -= 61 * MIN;
  const res = gardener.tick();
  assert.equal(res.harvested.karotte, 24, '12 Durchgänge à 2 Karotten');
  assert.equal(garden.beds()[0].crop, 'karotte', 'wieder bepflanzt');
  assert.equal(garden.have('karotte'), 5, 'Vorrat fürs Kochen bleibt');
  assert.ok(gardener.purse() > 0, 'Gewinn in der Kasse');
  assert.equal(state.gold, gold, 'eigenes Gold bleibt unangetastet');
  const p = gardener.purse();
  gardener.withdraw();
  assert.equal(state.gold, gold + p);
});

test('Gartenhelfer: ohne Verkaufserlaubnis nur mit Saatpäckchen, und er geht nicht auf Expedition', () => {
  const c = getGroup('lebewesen', 'B')[0];
  state.addItems([c]);
  state.buildings.camp = 0;
  gardener.assign(c.id);
  assert.ok(expedition.roster().every((x) => x.id !== c.id));
  garden.plant(0, 'karotte');
  state.garden.beds[0].planted -= 6 * MIN;
  gardener.tick();
  assert.equal(garden.beds()[0], null, 'geerntet, aber keine Saat');
  village.buySeeds('karotte', 1);
  state.garden.beds[0] = { crop: 'karotte', planted: Date.now() - 6 * MIN };
  gardener.tick();
  assert.equal(garden.beds()[0].crop, 'karotte', 'mit Päckchen neu gepflanzt');
});

test('Fischreuse: fängt nach Zeit bis zur Kapazität, ohne Flaschenpost, Fänge zählen fürs Angelbuch', () => {
  assert.equal(fishtrap.built(), false);
  assert.ok(fishtrap.upgrade());
  state.village.trap.last = Date.now() - 1000 * MIN;
  fishtrap.tick();
  assert.equal(fishtrap.stored(), fishtrap.capacity(), 'nie mehr als die Kapazität');
  const got = fishtrap.collect();
  assert.equal(got.length, fishtrap.CAPACITY[0]);
  assert.ok(got.every((g) => !g.treasure));
  assert.equal(fishtrap.stored(), 0);
  const counted = village.FISH.reduce((n, f) => n + village.caughtTotal(f.id), 0);
  assert.equal(counted, got.length);
});

// ---------------------------------------------------------------- Magie

import * as magic from '../src/magic.js';
import * as stars from '../src/stars.js';


test('Magie: Mana lädt nach Zeit, nachts doppelt, bis zum Vorrat des Turms', () => {
  state.buildings.tower = 0;
  state.magic.mana = 0;
  state.magic.last = Date.now() - 0.05 * MIN;
  magic.tick(Date.now(), true);
  close(state.magic.mana, magic.REGEN[0] * 2 * 0.05, 0.01, 'nachts doppelt');
  state.magic.last = Date.now() - 1000 * MIN;
  magic.tick();
  assert.equal(magic.mana(), magic.MAX_MANA[0]);
});

// Zauber einer Schule in einem Rang
const spellAt = (school, rank, world = 'normal') => magic.SPELLS.find((sp) => sp.school === school && sp.rank === rank && sp.world === world);

test('Magie: jede Schriftrolle lehrt einen eigenen Zauber, je Schule wird er mit dem Rang stärker', () => {
  const scrolls = ALL_ITEMS.filter((i) => i.kind === 'Schriftrolle');
  assert.equal(magic.SPELLS.length, scrolls.length, 'Heimat, Hölle und Himmel: je 30');
  assert.equal(new Set(magic.SPELLS.map((sp) => sp.name)).size, scrolls.length, 'jeder Zauber hat einen eigenen Namen');
  for (const s of scrolls) assert.equal(magic.spellOf(s.id).rank, s.tier);
  for (const sc of magic.SCHOOLS) {
    const list = [0, 1, 2, 3, 4, 5].map((t) => spellAt(sc.id, t));
    assert.ok(list.every(Boolean), `${sc.name}: alle Ränge`);
    // Zahlenwerte steigen nie und mindestens einer steigt von Rang zu Rang
    const nums = (fx) => Object.entries(fx).flatMap(([k, v]) => (typeof v === 'number' ? [[k, v]] : typeof v === 'object' ? [[k + '.n', v.n ?? 0], [k + '.v', v.v ?? v.min ?? 0]] : []));
    for (let t = 1; t < 6; t++) {
      const prev = Object.fromEntries(nums(list[t - 1].fx));
      const cur = Object.fromEntries(nums(list[t].fx));
      for (const [k, v] of Object.entries(prev)) assert.ok((cur[k] ?? -1) >= v, `${list[t].name}: ${k} sinkt nicht`);
      assert.ok(Object.keys(cur).length > Object.keys(prev).length || Object.entries(cur).some(([k, v]) => v > (prev[k] ?? 0)), `${list[t].name} ist stärker`);
      assert.ok(list[t].cost > list[t - 1].cost && list[t].cost <= magic.MAX_MANA[t]);
    }
  }
});

test('Magie: Lernen braucht genau diese Schriftrolle und den Turm-Rang, verbraucht sie aber nicht', () => {
  state.buildings.tower = 0;
  const sp = spellAt('natur', 0);
  assert.match(magic.learnBlocker(sp), /fehlt/);
  state.addItems([spellAt('gold', 0).scroll]);
  assert.match(magic.learnBlocker(sp), /fehlt/, 'eine andere Schriftrolle reicht nicht');
  state.addItems([sp.scroll]);
  assert.ok(magic.learn(sp.id));
  assert.equal(state.count(sp.scroll.id), 1);
  const c = spellAt('wasser', 1);
  state.addItems([c.scroll]);
  assert.match(magic.learnBlocker(c), /Turm-Rang C/);
});

test('Magie: Wirken kostet Mana, hat Abklingzeit, Keimling macht Beete reif', () => {
  state.buildings.tower = 0;
  const sp = spellAt('natur', 0);
  state.addItems([sp.scroll]);
  magic.learn(sp.id);
  garden.plant(0, 'sternenblume');
  state.magic.mana = 25;
  assert.ok(magic.cast(sp.id));
  assert.equal(magic.mana(), 25 - sp.cost);
  assert.ok(garden.ready(0));
  assert.ok(magic.cooldownLeft(sp.id) > 0);
  state.magic.mana = 30;
  assert.equal(magic.cast(sp.id), null, 'noch in der Abklingzeit');
});

test('Magie: höhere Naturzauber bepflanzen neu und geben Extra-Ernte', () => {
  state.buildings.tower = 4;
  const sp = spellAt('natur', 4);
  state.addItems([sp.scroll]);
  magic.learn(sp.id);
  state.garden.last[0] = 'sternenblume';
  state.magic.mana = 100;
  assert.ok(magic.cast(sp.id));
  assert.ok(garden.ready(0), 'leeres Beet neu bepflanzt und reif');
  assert.equal(garden.have('sternenblume'), sp.fx.crops);
});

test('Magie: Lockruf-Ladungen heben den Fang je nach Rang, Glück sichert Mindest-Ränge', () => {
  const random = seeded(17);
  for (let i = 0; i < 2000; i++) {
    const r = village.rollCatch(random, 'Tag', 2);
    assert.ok(!r.treasure && r.tier >= 2, 'mit starkem Lockruf mindestens Rang B, keine Flaschenpost');
  }
  state.buildings.tower = 5;
  const lure = spellAt('wasser', 5);
  const luck = spellAt('glueck', 3);
  state.addItems([lure.scroll, luck.scroll]);
  magic.learn(lure.id);
  magic.learn(luck.id);
  state.magic.mana = 130;
  assert.ok(magic.cast(lure.id));
  for (let i = 0; i < lure.fx.lure.n; i++) assert.equal(magic.useLure(), lure.fx.lure.v);
  assert.equal(magic.useLure(), 0, 'Ladungen verbraucht');
  state.magic.mana = 130;
  assert.ok(magic.cast(luck.id));
  assert.equal(magic.luckyReady(), luck.fx.luck.n);
  assert.equal(magic.useLuckyPull(), luck.fx.luck.v);
  assert.ok(stars.showerPending() >= luck.fx.stars, 'Sternschnuppen kommen');
});

test('Magie: Schutzschild gilt je nach Rang und wird bei der Erkundung verbraucht', () => {
  state.buildings.dungeon = 5;
  state.addItems([getGroup('helden', 'D')[0]]);
  dungeon.party.autoEquip();
  state.magic.shield = { n: 1, v: 0.15 };
  assert.ok(dungeon.start(5));
  assert.equal(state.dungeon.run.shield, 0.15);
  assert.equal(magic.shieldReady(), 0);
  state.dungeon.run.end = Date.now() - 1;
  const random = Math.random;
  Math.random = () => 0.12; // über der normalen 5 %-Chance, unter 5 % + 15 %
  try {
    assert.ok(dungeon.collect().success);
  } finally {
    Math.random = random;
  }
});

test('Magie: Zeitsprung gibt Expedition 30 Minuten Ertrag', () => {
  state.buildings.tower = 3;
  state.buildings.camp = 0;
  const sp = spellAt('natur', 3);
  state.addItems([...getGroup('lebewesen', 'B').slice(0, 4), sp.scroll]);
  expedition.tick();
  magic.learn(sp.id);
  state.magic.mana = 100;
  const before = expedition.live.gold;
  assert.ok(magic.cast(sp.id));
  close(expedition.live.gold - before, expedition.goldPerMinute() * sp.fx.skip, 2, 'Truhe');
});

test('Magie: Goldzauber geben Gold und ab Rang S einen Goldrausch', () => {
  state.buildings.tower = 4;
  const sp = spellAt('gold', 4);
  state.addItems([sp.scroll]);
  magic.learn(sp.id);
  state.magic.mana = 100;
  const gold = state.gold;
  let rain = 0;
  assert.ok(magic.cast(sp.id, { onRain: (s) => (rain = s) }));
  assert.equal(state.gold - gold, sp.fx.gold);
  assert.equal(rain, sp.fx.rain);
  assert.ok(buffs.active('gold'));
});

// ---------------------------------------------------------------- Sternschnuppen


test('Sternschnuppen: erscheinen nur nachts, Wunsch bringt Gold, Mana oder selten ein Sammelstück', () => {
  for (let i = 0; i < 200; i++) stars.update(1, false);
  assert.equal(stars.current(), null, 'tagsüber keine');
  for (let i = 0; i < 200 && !stars.current(); i++) stars.update(1, true);
  assert.ok(stars.current(), 'nachts kommt eine');
  const p = stars.position();
  assert.ok(stars.tryCatch(p.x + 3, p.y - 2), 'Treffer mit etwas Spielraum');
  assert.equal(stars.current(), null);

  state.buildings.tower = 0;
  const random = seeded(77);
  const n = 20000;
  let items = 0, mana = 0, gold = 0;
  const before = state.stats.items.sternschnuppe?.n || 0;
  for (let i = 0; i < n; i++) {
    state.magic.mana = 0;
    const w = stars.wish(random);
    if (w.item) { items++; assert.ok(w.item.tier >= 1); }
    else if (w.mana) mana++;
    else gold++;
  }
  close(items / n, stars.ITEM_CHANCE, 0.006, 'Sammelstück');
  close(mana / n, (1 - stars.ITEM_CHANCE) * stars.MANA_CHANCE, 0.015, 'Mana');
  assert.ok(gold > 0);
  assert.equal(state.stats.items.sternschnuppe.n - before, items);
});

// ---------------------------------------------------------------- Begleiter

import * as companions from '../src/companions.js';
import * as care from '../src/companioncare.js';

test('Begleiter: Streuner tauchen auf, lassen sich anfreunden und geben ihren Bonus', () => {
  state.companions.owned = [];
  state.companions.active = null;
  for (let i = 0; i < 600 && !companions.currentStray(); i++) companions.update(1, { where: 'outside', night: false, playerX: 400, bounds: [10, 950] });
  const s = companions.currentStray();
  assert.ok(s, 'es taucht einer auf');
  assert.ok(!companions.companion(s.id).night, 'tagsüber keine Nachttiere');
  assert.ok(companions.nearStray(s.x) && !companions.nearStray(s.x + 40));
  const c = companions.befriendStray();
  assert.ok(companions.owned(c.id));
  assert.equal(companions.active().id, c.id, 'der erste Begleiter kommt gleich mit');
  // Bonus wirkt: Fuchs bringt der Expedition mehr Gold
  companions.befriend('fuchs');
  companions.setActive(null);
  const base = expedition.goldPerMinute();
  companions.setActive('fuchs');
  if (base) close(expedition.goldPerMinute() / base, 1.1, 0.001, 'Fuchs +10 %');
  assert.equal(companions.bonus('expedition'), 0.1);
  assert.equal(companions.bonus('mine'), 0);
  const missing = companions.COMPANIONS.find((x) => !companions.owned(x.id));
  assert.equal(companions.setActive(missing.id), false, 'nur gefundene');
});

test('Begleiter: Seltenheit folgt den Rängen, gefundene kommen nicht wieder', () => {
  state.companions.owned = [];
  const random = seeded(5);
  const n = 20000;
  const tiers = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < n; i++) tiers[companions.rollStray(true, random).tier]++;
  assert.ok(tiers[0] > tiers[1] && tiers[1] > tiers[2] && tiers[2] > tiers[3] && tiers[3] > tiers[4] && tiers[4] >= tiers[5]);
  assert.ok(tiers[5] > 0 && tiers[5] / n < 0.01, 'SS ist sehr selten');
  for (const c of companions.COMPANIONS) if (c.id !== 'hase') companions.befriend(c.id);
  for (let i = 0; i < 50; i++) assert.equal(companions.rollStray(true, random).id, 'hase');
  companions.befriend('hase');
  assert.equal(companions.rollStray(true, random), null);
  for (const c of companions.COMPANIONS) {
    for (const [k, v] of Object.entries(c.bonus)) assert.ok(companions.BONUS_TEXT[k] && v > 0, `${c.name}: ${k}`);
    assert.ok(c.rows.every((r) => r.length === c.rows[0].length), `${c.name}: Zeilen gleich lang`);
    assert.ok([...c.rows.join('')].every((ch) => ch === '.' || c.colors[ch]), `${c.name}: Farben`);
  }
  state.companions.owned = [];
  state.companions.active = null;
});

test('Begleiter: Leckerlis heben die Freundschaft, der Bonus wächst bis aufs Doppelte', () => {
  state.companions.owned = [];
  state.companions.pts = {};
  companions.befriend('hase');
  companions.setActive('hase');
  assert.equal(companions.level('hase'), 1);
  assert.equal(companions.bonus('garden'), 0.1);
  state.garden.crops.karotte = 100;
  state.garden.crops.weizen = 0;
  assert.equal(care.feed('hase', 'weizen'), null, 'ohne Ernte kein Leckerli');
  assert.equal(care.treatPoints(companions.companion('hase'), 'karotte'), 2, 'Liebling zählt doppelt');
  let ups = 0;
  while (companions.level('hase') < companions.MAX_LEVEL) {
    const r = care.feed('hase', 'karotte');
    assert.ok(r);
    if (r.up) ups++;
  }
  assert.equal(ups, 4);
  assert.equal(state.garden.crops.karotte, 100 - companions.LEVEL_POINTS[4] / 2);
  close(companions.bonus('garden'), 0.2, 1e-9, 'Stufe 5 = doppelt');
  assert.equal(care.feed('hase', 'karotte'), null, 'mehr geht nicht');
  // seltene Begleiter brauchen mehr
  assert.ok(companions.need(companions.companion('sternenkitz'), 5) > companions.need(companions.companion('hase'), 5));
});

test('Begleiter: Geschenke bringen je nach Tier Gold, Saat, Fisch, Erz – selten ein Sammelstück', () => {
  state.companions.owned = [];
  state.companions.pts = {};
  for (const id of ['hund', 'hase', 'igel', 'frosch']) companions.befriend(id);
  const random = seeded(9);
  const kinds = {};
  let items = 0;
  const n = 4000;
  for (let i = 0; i < n; i++) {
    const c = companions.companion(['hund', 'hase', 'igel', 'frosch'][i % 4]);
    const g = care.gift(c, random);
    if (g.item) items++;
    else {
      kinds[g.kind] = (kinds[g.kind] || 0) + 1;
      assert.ok(c.gifts.includes(g.kind) || g.kind === 'gold', `${c.name}: ${g.kind}`);
      assert.ok(g.n > 0);
    }
  }
  for (const k of ['gold', 'seeds', 'crops', 'ore', 'fish']) assert.ok(kinds[k] > 0, k);
  close(items / n, care.GIFT_ITEM_CHANCE + 0.01, 0.01, 'Sammelstücke selten');
  state.companions.owned = [];
  state.companions.active = null;
});

// ---------------------------------------------------------------- Wunschbrunnen

import * as well from '../src/well.js';

const setGold = (g) => (g > state.gold ? state.addGold(g - state.gold) : state.spend(state.gold - g));
const resetWell = () => Object.assign(state.well, { pityA: 0, pityS: 0, freeNext: false, dailyDay: state.dayCount, dailyUsed: 99, spiritGift: false });

test('Brunnen: Glückszähler garantiert spätestens beim 60. Stück ein A und beim 300. ein S', () => {
  resetWell();
  state.buildings.well = 0;
  setGold(1e9);
  let sinceA = 0, sinceS = 0, maxA = 0, maxS = 0;
  const random = () => 0.001; // immer Rang D, solange nichts erzwungen wird
  for (let i = 0; i < 70; i++) {
    for (const { item } of well.pull(10, random).results) {
      sinceA = item.tier >= 3 ? 0 : sinceA + 1;
      sinceS = item.tier >= 4 ? 0 : sinceS + 1;
      maxA = Math.max(maxA, sinceA);
      maxS = Math.max(maxS, sinceS);
    }
  }
  assert.equal(maxA, well.PITY_A - 1, 'nie mehr als 59 Stücke ohne A');
  assert.equal(maxS, well.PITY_S - 1, 'nie mehr als 299 Stücke ohne S');
});

test('Brunnen: Gratiswünsche am Tag, Gratis-Folgewunsch und Rabatt je Rang', () => {
  resetWell();
  state.well.dailyUsed = 0;
  state.buildings.well = 0;
  setGold(0);
  assert.equal(well.dailyLeft(), 1);
  const r = well.pull(1, () => 0.99);
  assert.ok(!r.error && r.free === 'daily' && r.paid === 0);
  assert.equal(well.dailyLeft(), 0);
  assert.ok(well.pull(1, () => 0.99).error, 'danach kostet es');
  setGold(1e6);
  const g = well.pull(1, () => 0.01); // Glückswurf trifft
  assert.ok(g.gotFreeNext && well.freeNext());
  const before = state.gold;
  assert.equal(well.pull(1, () => 0.99).free, 'next');
  assert.equal(state.gold, before);
  state.dayCount += 1;
  assert.equal(well.dailyLeft(), 1, 'neuer Tag, neuer Gratiswunsch');
  state.buildings.well = 5;
  assert.equal(well.dailyLeft(), 3);
  assert.equal(well.cost(10), 680, '850 Gold − 20 % bei Rang SS');
  state.buildings.well = 0;
});

test('Brunnen: Geschenk des Brunnengeists ist selten und garantiert Rang A–SS', () => {
  resetWell();
  state.buildings.well = 0;
  setGold(1e9);
  const random = seeded(3);
  let gifts = 0;
  const n = 3000;
  for (let i = 0; i < n; i++) {
    const r = well.pull(10, random);
    if (r.gotSpirit) {
      gifts++;
      const s = well.pull('spirit', random);
      assert.equal(s.free, 'spirit');
      assert.ok(s.results[0].item.tier >= 3);
    }
  }
  close(gifts / n, 1 - (1 - well.SPIRIT_CHANCE[0]) ** 10, 0.012, 'je 10er-Zug');
  assert.ok(well.pull('spirit').error, 'ohne Geschenk geht es nicht');
});

// ---------------------------------------------------------------- Schneiderei

import * as tailor from '../src/tailor.js';

test('Schneiderei: Umhänge kosten Stoff und Seide und machen Helden stärker, der Vorrat gilt für beide Teams', () => {
  state.arena.mats.stoff[2] = 6;
  state.arena.mats.seide[2] = 1;
  assert.ok(tailor.sewCape(2));
  assert.equal(tailor.sewCape(2), false, 'Seide fehlt');
  assert.equal(tailor.capes(2), 1);
  state.buildings.arena = 0;
  state.buildings.dungeon = 0;
  state.addItems(getGroup('helden', 'D').slice(0, 2));
  arena.party.autoEquip();
  const m = state.arena.team[0];
  assert.equal(m.cape, 2, 'automatisch angelegt');
  const withCape = arena.party.memberPower(m);
  assert.ok(arena.party.equipCape(0, null));
  assert.equal(withCape - arena.party.memberPower(m), tailor.CAPE_POWER[2]);
  assert.ok(arena.party.equipCape(0, 2));
  dungeon.party.autoEquip();
  assert.ok(dungeon.party.team().every((x) => x.cape == null), 'der einzige Umhang steckt schon in der Arena');
  assert.equal(dungeon.party.equipCape(0, 2), false);
});

test('Schneiderei: Kleidung erst nähen, dann tragen – ihr Bonus wirkt nur angezogen', () => {
  const o = tailor.SEWN.find((x) => x.id === 'seidenrobe');
  assert.equal(tailor.sewn(o.id), false);
  state.arena.mats.seide[o.sew.tier] = o.sew.seide;
  assert.ok(tailor.sewOutfit(o.id));
  assert.equal(state.arena.mats.seide[o.sew.tier], 0);
  assert.equal(companions.bonus('mana'), 0, 'noch nicht angezogen');
  state.outfit = o.id;
  assert.equal(companions.bonus('mana'), o.bonus.mana);
  state.outfit = 'wanderer';
});

test('Schneiderei: Einrichtung macht das Haus gemütlich, Veredeln tauscht Material', () => {
  assert.equal(tailor.cozy(), 0);
  for (const d of tailor.DECOR) for (const c of d.cost) { if (c.kind === 'erz') state.mine.ore[c.tier] += c.n; else state.arena.mats[c.kind][c.tier] += c.n; }
  for (const d of tailor.DECOR) assert.ok(tailor.buyDecor(d.id), d.name);
  assert.equal(tailor.cozy(), tailor.MAX_COZY);
  close(buffs.sleepChance(), 0.1 + tailor.MAX_COZY * 0.01, 1e-9, 'bis 31 %');
  assert.equal(tailor.MAX_COZY, 21);
  state.arena.mats.stoff[0] = 9;
  assert.ok(tailor.refine('seide', 0));
  assert.ok(tailor.refine('stoff-up', 0));
  assert.deepEqual([state.arena.mats.stoff[0], state.arena.mats.seide[0], state.arena.mats.stoff[1]], [0, 1, 1]);
  assert.equal(tailor.refine('seide-up', 5), false, 'über SS geht nichts');
});

test('Brunnen: Preise 100/850, Duplikat-Wunsch bringt nur Eigenes und kostet 50 mehr je Zug', () => {
  resetWell();
  state.buildings.well = 0;
  assert.equal(well.cost(1), 100);
  assert.equal(well.cost(10), 850);
  assert.equal(well.cost(1, true), 150);
  assert.equal(well.cost(10, true), 1350);
  setGold(1e6);
  assert.ok(well.pull(10, Math.random, { dupes: true }).error, 'ohne Sammlung geht es nicht');
  const mine = [getGroup('monster', 'D')[0], getGroup('waffen', 'D')[3], getGroup('helden', 'B')[2]];
  state.addItems(mine);
  const before = state.gold;
  const random = seeded(4);
  let own = 0;
  for (let i = 0; i < 30; i++) {
    const r = well.pull(10, random, { dupes: true });
    for (const { isNew } of r.results) if (!isNew) own++;
  }
  assert.ok(own / 300 >= well.MODE_CHANCE - 0.07, `mindestens etwa 75 % Duplikate (${own}/300)`);
  assert.equal(before - state.gold, 30 * 1350);
});

// ---------------------------------------------------------------- Dimensionsportal

import * as realm from '../src/realm.js';
import * as buildings from '../src/buildings.js';

test('Portal: Hölle und Himmel haben je 2100 eigene Stücke mit eigenen Namen', () => {
  assert.equal(ITEMS.length, 2100);
  assert.equal(ALL_ITEMS.length, 6300);
  for (const w of ['hoelle', 'himmel']) {
    const list = worldItems(w);
    assert.equal(list.length, 2100);
    assert.ok(list.every((i) => i.world === w && i.id.startsWith(`${w}-`)));
    assert.equal(new Set(list.map((i) => i.id)).size, 2100);
    for (const c of CATEGORIES) for (const r of RARITIES) assert.equal(getGroup(c.id, r.id, w).length, PER_GROUP);
  }
  assert.notEqual(getGroup('helden', 'A', 'hoelle')[0].name, getGroup('helden', 'A')[0].name);
});

test('Portal: kostet 10.000 Gold, die Portalwelt hat eigene Gebäude, Gold und Sammlung bleiben', () => {
  assert.equal(buildings.BUILDINGS.portal.buy, 10000);
  assert.equal(buildings.nextCost('portal'), 10000);
  state.addGold(20000);
  state.buildings.camp = 3;
  state.realm.type = 'hoelle';
  assert.ok(buildings.advance('portal'));
  assert.equal(buildings.nextCost('portal'), null, 'kein Ausbau');
  const gold = state.gold;
  const heim = getGroup('helden', 'D')[0];
  state.addItems([heim]);

  assert.ok(state.switchWorld());
  assert.equal(realm.current(), 'hoelle');
  assert.equal(buildings.tier('camp'), -1, 'in der Hölle ist noch nichts gebaut');
  assert.equal(buildings.tier('portal'), 0, 'das Portal für den Rückweg steht');
  assert.equal(state.gold, gold + 0, 'Gold bleibt');
  assert.equal(state.count(heim.id), 1, 'Sammlung bleibt');
  // Wünsche und Funde kommen aus der Portalwelt, Teams nehmen nur Stücke dieser Welt
  assert.equal(rollItem().world, 'hoelle');
  state.buildings.arena = 0;
  arena.party.autoEquip();
  assert.equal(state.arena.team[0].hero, null, 'Heimat-Helden kämpfen nicht in der Hölle');
  const teufel = getGroup('helden', 'C', 'hoelle')[0];
  state.addItems([teufel]);
  arena.party.autoEquip();
  assert.equal(state.arena.team[0].hero, teufel.id);
  state.buildings.camp = 1;

  assert.ok(state.switchWorld());
  assert.equal(realm.current(), 'normal');
  assert.equal(buildings.tier('camp'), 3, 'die Heimat ist wie vorher');
  assert.ok(state.switchWorld());
  assert.equal(buildings.tier('camp'), 1, 'die Hölle auch');
  state.switchWorld();
});

test('Portal: der Spielstand mit beiden Welten übersteht Speichern und Laden', () => {
  state.realm.type = 'himmel';
  state.buildings.portal = 0;
  state.buildings.mine = 2;
  state.switchWorld();
  state.buildings.mine = 0;
  state.replace(state.parseSave(state.exportSave()));
  assert.equal(realm.current(), 'himmel', 'man landet wieder im Himmel');
  assert.equal(state.buildings.mine, 0);
  assert.equal(state.buildings.portal, 0);
  state.switchWorld();
  assert.equal(state.buildings.mine, 2, 'die Heimat ist erhalten');
  assert.equal(realm.current(), 'normal');
  state.reset();
  assert.equal(realm.current(), 'normal', 'Neustart beginnt in der Heimat');
});

test('Dimensionen: Gebäude starten bei Rang B, kosten mehr, Wünsche kosten das Doppelte, Gold doppelt', () => {
  state.addGold(1e6);
  state.realm.type = 'hoelle';
  state.buildings.portal = 0;
  state.buildings.camp = 0;
  state.addItems(getGroup('lebewesen', 'D').slice(0, 4));
  expedition.tick();
  const homeRate = expedition.goldPerMinute();
  assert.equal(well.cost(1), 100);
  state.switchWorld('hoelle');
  assert.equal(buildings.tier('well'), 2, 'Brunnen steht schon auf B');
  assert.equal(well.cost(1), Math.round(100 * (1 - well.DISCOUNT[2])) * 2, 'doppelt, mit Rabatt des B-Brunnens');
  const price = buildings.nextCost('camp');
  assert.equal(price, buildings.realmBuy('camp'));
  assert.ok(price > buildings.BUILDINGS.camp.buy * 10);
  assert.ok(buildings.advance('camp'));
  assert.equal(buildings.tier('camp'), 2, 'gleich Rang B');
  assert.equal(buildings.nextCost('camp'), Math.round((buildings.BUILDINGS.camp.upgrades[2] * 2.5) / 500) * 500);
  state.addItems(getGroup('lebewesen', 'D', 'hoelle').slice(0, 4));
  expedition.tick();
  // vier D-Lebewesen: Lager B (×4), Gold ×2, Hölle +50 %
  close(expedition.goldPerMinute(), homeRate * 4 * 2 * 1.5, 0.01, 'Hölle');
  assert.equal(buffs.coinValue(), buffs.COIN_NORMAL * 2);
});

test('Dimensionen: eigene Boni – Hölle Stärke, Himmel Glück und Wachstum', () => {
  state.realm.type = 'himmel';
  state.buildings.portal = 0;
  assert.equal(buffs.lucky(), false);
  state.switchWorld('himmel');
  assert.equal(buffs.lucky(), true, 'im Himmel immer Glück');
  assert.equal(companions.bonus('garden'), 0.4);
  state.switchWorld('normal');
  state.realm.type = 'hoelle';
  state.switchWorld('hoelle');
  assert.equal(companions.bonus('expedition'), 0.5);
  state.buildings.arena = 2;
  state.addItems([getGroup('helden', 'B', 'hoelle')[0]]);
  arena.party.autoEquip();
  close(arena.party.teamPower(), Math.round(arena.party.memberPower(state.arena.team[0]) * 1.15), 1, '+15 % Stärke');
});

test('Dimensionen: die zweite Welt öffnet sich erst, wenn in der Heimat alle Gebäude auf SS stehen', async () => {
  const dimension = await import('../src/dimension.js');
  state.realm.type = 'hoelle';
  state.buildings.portal = 0;
  assert.deepEqual(dimension.destinations(), ['hoelle']);
  for (const id of dimension.HOME_BUILDINGS) state.buildings[id] = 5;
  assert.deepEqual(dimension.destinations(), ['hoelle', 'himmel']);
  state.switchWorld('himmel');
  assert.equal(realm.current(), 'himmel');
  assert.ok(dimension.homeMaxed(), 'auch von drüben aus gilt der Stand der Heimat');
  state.switchWorld('normal');
  state.switchWorld('hoelle');
  assert.equal(realm.current(), 'hoelle');
  state.switchWorld('normal');
  assert.equal(buildings.tier('camp'), 5);
});

test('Dimensionen: eigene Pflanzen, Gerichte, Zauber und Kleidung', () => {
  state.realm.type = 'hoelle';
  state.buildings.portal = 0;
  assert.ok(!garden.available().some((c) => c.world));
  assert.ok(!garden.recipes().some((r) => r.world));
  state.switchWorld('hoelle');
  assert.deepEqual(garden.available().filter((c) => c.world).map((c) => c.id), ['feuerchili', 'aschenknolle', 'lavamelone']);
  state.garden.crops.feuerchili = 3;
  state.garden.crops.aschenknolle = 2;
  assert.equal(garden.cook('feuereintopf').buff, 'inferno');
  assert.ok(buffs.active('gold') && buffs.active('gladiator'), 'Höllenfeuer wirkt wie zwei Rausche');
  // Zauber
  const fire = magic.SPELLS.filter((sp) => sp.world === 'hoelle');
  assert.equal(fire.length, 30);
  const sp = fire.find((s) => s.school === 'gold' && s.rank === 2);
  assert.equal(sp.fx.gold, spellAt('gold', 2).fx.gold * 2, 'stärker als in der Heimat');
  state.buildings.tower = 2;
  state.addItems([sp.scroll]);
  assert.ok(magic.learn(sp.id));
  state.magic.mana = 100;
  const ore = state.mine.ore[2];
  assert.ok(magic.cast(sp.id));
  assert.equal(state.mine.ore[2], ore + sp.fx.ore.n, 'Hölle schenkt Erz');
  // Kleidung nur dort nähbar
  const o = tailor.SEWN.find((x) => x.id === 'glutpanzer');
  state.arena.mats.stoff[2] = 6;
  state.arena.mats.seide[2] = 2;
  assert.ok(tailor.sewOutfit(o.id));
  state.switchWorld('normal');
  const sky = tailor.SEWN.find((x) => x.id === 'federkleid');
  state.arena.mats.stoff[2] = 6;
  state.arena.mats.seide[2] = 2;
  assert.equal(tailor.sewOutfit(sky.id), false, 'Himmelskleidung nur im Himmel');
});

// ---------------------------------------------------------------- Dörfer und Begleiter der Dimensionen

import * as minigame from '../src/minigame.js';

test('Dimensionsdörfer: eigene Bewohner mit eigenen Aufgaben und höheren Belohnungen', () => {
  state.realm.type = 'hoelle';
  state.buildings.portal = 0;
  assert.equal(village.villagers()[0].id, 'greta');
  state.switchWorld('hoelle');
  const list = village.villagers();
  assert.deepEqual(list.map((v) => v.id), ['kohla', 'brandolf', 'asmund', 'flamma', 'grimm']);
  assert.equal(village.marketNpc().name, 'Händlerin Zunder');
  const random = seeded(12);
  for (let i = 0; i < 300; i++) {
    const q = village.makeQuest(list[i % list.length].id, random);
    assert.notEqual(q.need.type, 'fish', 'kein Angeln in der Hölle');
    if (q.need.type === 'crop') assert.ok(['feuerchili', 'aschenknolle', 'lavamelone'].includes(q.need.id));
    if (q.need.type === 'item') assert.equal(q.need.world, 'hoelle');
    if (q.reward.item !== null) assert.ok(q.reward.item >= 2, 'Belohnung ab Rang B');
    assert.ok(q.reward.gold >= village.DIFFICULTY.leicht.gold[0] * village.REALM_REWARD);
  }
  // Glutsteine-Aufgabe abgeben
  state.village.quests.brandolf = { villager: 'brandolf', difficulty: 'leicht', need: { type: 'shard', world: 'hoelle', n: 5 }, reward: { gold: 300, item: null, world: 'hoelle' } };
  assert.equal(village.canComplete(state.village.quests.brandolf), false);
  village.addShards('hoelle', 6);
  const gold = state.gold;
  assert.ok(village.complete('brandolf'));
  assert.equal(village.shards('hoelle'), 1);
  assert.equal(state.gold - gold, 300);
});

test('Minispiele: Punkte werden zu Glutsteinen/Sternensplittern, Gold und mit Glück einem Sammelstück', () => {
  const low = minigame.reward('hoelle', 5);
  assert.equal(low.shards, 5);
  assert.equal(low.gold, 5 * minigame.GOLD_PER_POINT);
  assert.equal(low.item, null);
  const high = minigame.reward('himmel', 60);
  assert.ok(high.item && high.item.world === 'himmel' && high.item.tier >= 3);
  state.realm.type = 'himmel';
  state.buildings.portal = 0;
  state.switchWorld('himmel');
  const gold = state.gold;
  const res = minigame.applyReward(high);
  assert.equal(village.shards('himmel'), 60);
  assert.equal(state.gold - gold, high.gold * 2, 'Gold zählt in der Dimension doppelt');
  assert.ok(res.record);
  // Schmiede: lauter perfekte Schläge = Höchstpunktzahl
  assert.equal(minigame.FORGE.strikes * minigame.FORGE.points.perfekt, minigame.ITEM_AT.hoelle[1]);
});

test('Begleiter der Dimensionen: nur dort unterwegs, mit neuen Bonus-Arten', () => {
  const realmComps = companions.COMPANIONS.filter((c) => c.world);
  assert.equal(realmComps.filter((c) => c.world === 'hoelle').length, 6);
  assert.equal(realmComps.filter((c) => c.world === 'himmel').length, 6);
  for (const c of realmComps) {
    assert.ok(c.tier >= 2, 'ab Rang B');
    assert.ok(c.rows.every((r) => r.length === c.rows[0].length), `${c.name}: Zeilen`);
    assert.ok([...c.rows.join('')].every((ch) => ch === '.' || c.colors[ch]), `${c.name}: Farben`);
    for (const k of Object.keys(c.bonus)) assert.ok(companions.BONUS_TEXT[k], `${c.name}: ${k}`);
  }
  state.companions.owned = [];
  const random = seeded(3);
  for (let i = 0; i < 200; i++) assert.ok(!companions.rollStray(true, random).world, 'in der Heimat nur Heimat-Tiere');
  state.realm.type = 'hoelle';
  state.buildings.portal = 0;
  state.switchWorld('hoelle');
  for (let i = 0; i < 200; i++) assert.equal(companions.rollStray(true, random).world, 'hoelle');
  // Höllenhund: +12 % Stärke (dazu +15 % der Hölle)
  companions.befriend('hoellenhund');
  companions.setActive('hoellenhund');
  close(companions.bonus('power'), 0.12 + 0.15, 1e-9);
  // Feuerimp: mehr Gratis-Folgewünsche
  companions.befriend('feuerimp');
  companions.setActive('feuerimp');
  assert.equal(companions.bonus('luckWish'), 0.05);
  state.companions.owned = [];
  state.companions.active = null;
});

// ---------------------------------------------------------------- Dungeon-Arten

test('Dungeons: 3 Arten × 6 Ränge mit eigenen Namen, Blut ist schwerer und bringt höhere Ränge', () => {
  const names = new Set();
  for (const t of dungeon.TYPES) for (let i = 0; i < 6; i++) names.add(dungeon.info(i, t.id).name);
  assert.equal(names.size, 18);
  const blood = dungeon.info(3, 'blut');
  assert.ok(blood.need > dungeon.LEVELS[3].need && blood.minTier === dungeon.LEVELS[3].minTier + 1);
  assert.ok(dungeon.info(5, 'dornen').trap > dungeon.info(0, 'dornen').trap);
  // Fallen kosten Erfolgschance
  close(dungeon.chance(2, 1e9, 'dornen'), dungeon.MAX_CHANCE * (1 - dungeon.info(2, 'dornen').trap), 1e-9);
});

test('Dungeons: Beute folgt den Schwerpunkten, der Schleifendungeon zeigt Erinnerungen', () => {
  state.buildings.dungeon = 5;
  state.addItems([getGroup('helden', 'SS')[0], ...getGroup('waffen', 'SS').slice(0, 1)]);
  dungeon.party.autoEquip();
  const count = { blut: {}, dornen: {}, schleife: {} };
  const random = Math.random;
  Math.random = seeded(21);
  try {
    for (const t of Object.keys(count)) {
      for (let i = 0; i < 60; i++) {
        state.dungeon.run = null;
        assert.ok(dungeon.start(1, t));
        state.dungeon.run.end = Date.now() - 1;
        state.dungeon.run.power = 1e9; // sicherer Erfolg (bis auf Fallen)
        const res = dungeon.collect();
        for (const { item } of res.items) count[t][item.cat] = (count[t][item.cat] || 0) + 1;
        if (t === 'schleife') assert.ok(res.memory && dungeon.memory(res.memory.id));
        else assert.equal(res.memory, null);
      }
    }
  } finally {
    Math.random = random;
  }
  const share = (t, cats) => cats.reduce((n, c) => n + (count[t][c] || 0), 0) / Object.values(count[t]).reduce((a, b) => a + b, 0);
  assert.ok(share('blut', ['waffen', 'ruestung']) > 0.6);
  assert.ok(share('dornen', ['lebewesen', 'relikte']) > 0.6);
  assert.ok(share('schleife', ['monster', 'artefakte']) > 0.7);
  assert.equal(dungeon.memoriesSeen().length, dungeon.MEMORIES.length, 'nach 60 Durchläufen alle Erinnerungen gesehen');
});

// ---------------------------------------------------------------- Bossrush

import * as bossrush from '../src/bossrush.js';

test('Bossrush: Helden und Monster bis 10 Plätze, nicht gleichzeitig in Arena oder Dungeon', () => {
  state.buildings.arena = 2;
  const heroes = getGroup('helden', 'B').slice(0, 3);
  const monsters = getGroup('monster', 'A').slice(0, 9);
  state.addItems([...heroes, ...monsters, getGroup('waffen', 'B')[0]]);
  arena.party.equip(0, 'hero', heroes[0].id);
  bossrush.party.autoEquip();
  const ids = bossrush.party.heroIds();
  assert.equal(ids.length, 10);
  assert.ok(!ids.includes(heroes[0].id), 'Arena-Held bleibt in der Arena');
  assert.ok(ids.some((id) => id.startsWith('monster-')), 'Monster kämpfen mit');
  const m = state.bossrush.team.find((x) => x.hero.startsWith('monster-'));
  assert.ok(Object.values(m.gear).every((g) => g === null), 'Monster tragen keine Ausrüstung');
  assert.equal(bossrush.party.equip(state.bossrush.team.indexOf(m), 'waffen', getGroup('waffen', 'B')[0].id), false);
  assert.equal(arena.party.equip(1, 'hero', ids[0]), false, 'im Rush-Team gebunden');
});

test('Bossrush: kämpft bis zur Niederlage, sammelt Beute, Wiederbeleben wird teurer bis 15.000', () => {
  state.buildings.arena = 5;
  state.addItems(getGroup('helden', 'SS').slice(0, 5));
  bossrush.party.autoEquip();
  const t0 = Date.now();
  assert.ok(bossrush.start('normal', { now: t0, rand: seeded(2) }));
  assert.equal(arena.party.autoEquip() && state.bossrush.team.length, 10);
  // eine Stunde später: viele Kämpfe auf einmal
  bossrush.tick(t0 + 3600 * 1000, seeded(5));
  const x = bossrush.run();
  assert.ok(x.bosses > 0);
  assert.ok(x.loot.gold > 0 && x.loot.stoff.reduce((a, b) => a + b) === x.bosses * arena.WIN_CLOTH);
  if (x.status === 'fighting') return; // sehr stark – sonst unten weiter
  assert.equal(x.status, 'down');
  assert.equal(bossrush.reviveCost(), Math.min(15000, bossrush.REVIVE_BASE + bossrush.REVIVE_STEP * x.bosses));
  assert.equal(bossrush.reviveCost(1000), 15000, 'gedeckelt');
  state.addGold(20000);
  const gold = state.gold;
  assert.ok(bossrush.revive());
  assert.equal(gold - state.gold, bossrush.reviveCost(x.bosses));
  const stoff = state.arena.mats.stoff.reduce((a, b) => a + b);
  const res = bossrush.collect();
  assert.equal(state.arena.mats.stoff.reduce((a, b) => a + b) - stoff, res.stoff.reduce((a, b) => a + b));
  assert.equal(bossrush.run(), null);
});

// ---------------------------------------------------------------- Abstieg

import * as descent from '../src/descent.js';

test('Abstieg: Etagen werden schwerer, Wächter alle 5, Etagenboss alle 10', () => {
  assert.ok(descent.need(4, 'blut') > descent.need(3, 'blut'));
  const step = (f) => (1 + descent.LINEAR * (f - 1)) / (1 + descent.LINEAR * (f - 2));
  close(descent.need(5, 'blut') / (descent.need(4, 'blut') * step(5)), descent.GUARD_MULT, 0.02, 'Wächter');
  close(descent.need(10, 'blut') / (descent.need(9, 'blut') * step(10)), descent.BOSS_MULT, 0.02, 'Boss');
  assert.ok(descent.need(1, 'blut') > descent.need(1, 'dornen'), 'Blut ist härter');
});

test('Abstieg: läuft bis zur Niederlage, Heimkehren sichert alles, Aufgeben kostet die Hälfte', () => {
  state.buildings.dungeon = 5;
  state.addItems(getGroup('helden', 'S').slice(0, 5));
  dungeon.party.autoEquip();
  const t0 = Date.now();
  assert.ok(descent.start('schleife', t0));
  assert.equal(dungeon.start(0), false, 'Team ist im Abstieg');
  assert.equal(dungeon.party.autoEquip(), false, 'Team gesperrt');
  let x = descent.current();
  const random = seeded(8);
  for (let k = 0; k < 400 && x.status !== 'down'; k++) {
    descent.tick(t0 + (k + 1) * 3600 * 1000, random);
    if (x.status === 'merchant') descent.merchant(false, t0 + (k + 1) * 3600 * 1000);
  }
  assert.equal(x.status, 'down');
  assert.ok(x.floor > 5);
  assert.equal(descent.best('schleife'), x.floor - 1);
  assert.ok(x.log.length);
  // Aufgeben: etwa die Hälfte geht verloren
  x.loot.gold = 1000;
  x.loot.items = Array.from({ length: 40 }, (_, i) => getGroup('monster', 'C')[i % 50].id);
  const gold = state.gold;
  const res = descent.retreat(seeded(3));
  assert.ok(res.lost);
  assert.equal(state.gold - gold, 500);
  assert.ok(res.items.length > 10 && res.items.length < 30);
  assert.equal(descent.current(), null);
  // Heimkehren ohne Niederlage: alles bleibt
  assert.ok(descent.start('blut', t0));
  descent.current().loot = { gold: 800, items: [getGroup('waffen', 'B')[0].id] };
  const g2 = state.gold;
  const ok = descent.retreat();
  assert.equal(ok.lost, false);
  assert.equal(state.gold - g2, 800);
  assert.equal(ok.items.length, 1);
});

test('Abstieg: Wiederbeleben wird mit der Tiefe teurer und stoppt bei 15.000, Quelle rettet einmal', () => {
  assert.equal(descent.reviveCost({ floor: 1 }), descent.REVIVE_BASE + descent.REVIVE_STEP);
  assert.equal(descent.reviveCost({ floor: 500 }), 15000);
  state.buildings.dungeon = 0;
  state.addItems([getGroup('helden', 'D')[0]]);
  dungeon.party.autoEquip();
  const t0 = Date.now();
  descent.start('blut', t0);
  const x = descent.current();
  x.heal = 1;
  x.floor = 200; // hoffnungslos
  descent.tick(t0 + 10000, () => 0.99);
  assert.equal(x.status, 'running', 'die Quelle fängt die erste Niederlage ab');
  assert.equal(x.heal, 0);
  descent.tick(t0 + 20000, () => 0.99);
  assert.equal(x.status, 'down');
  state.addGold(20000);
  assert.ok(descent.revive());
  assert.equal(x.status, 'running');
});

test('Brunnen: „Nur Neue“ bringt keine Duplikate und kostet 100 mehr je Zug', () => {
  resetWell();
  state.buildings.well = 0;
  setGold(1e7);
  assert.equal(well.cost(1, 'new'), 200);
  assert.equal(well.cost(10, 'new'), 1850);
  const random = seeded(31);
  state.addItems(getGroup('monster', 'D').slice(0, 49));
  let fresh = 0;
  let total = 0;
  for (let i = 0; i < 40; i++) {
    const r = well.pull(10, random, { fresh: true });
    for (const { isNew } of r.results) {
      total++;
      if (isNew) fresh++;
    }
  }
  assert.ok(fresh / total >= well.MODE_CHANCE - 0.06, `mindestens etwa 75 % neu (${fresh}/${total})`);
  assert.ok(state.well.pityA < well.PITY_A, 'zählt für den Glückszähler');
  assert.equal(arena.SILK_CHANCE, 0.4, 'Seide +5 %');
});

test('Brunnen: Fehlen nur noch A–SS, kostet „Nur Neue“ 1.000 bzw. 9.500 und bringt nur A–SS', () => {
  resetWell();
  state.buildings.well = 0;
  assert.equal(well.onlyHighMissing(), false);
  state.addItems(ITEMS.filter((i) => i.tier <= 2));
  assert.equal(well.onlyHighMissing(), true);
  assert.equal(well.cost(1, 'new'), 1000);
  assert.equal(well.cost(10, 'new'), 9500);
  assert.ok(well.cost(1) <= 100, 'normale Wünsche bleiben günstig');
  setGold(20000);
  const r = well.pull(10, seeded(4), { fresh: true });
  assert.equal(r.paid, 9500);
  assert.ok(r.results.filter(({ item, isNew }) => isNew && item.tier >= 3).length >= 4, 'die Treffer sind neue A–SS');
});

// ---------------------------------------------------------------- Edelsteine und Statuen

import * as gems from '../src/gems.js';
import * as statues from '../src/statues.js';

test('Edelsteine: aus Erz geschliffen, bis zum Schmiede-Rang, mit eigenen Wirkungen', () => {
  state.buildings.forge = 2;
  state.addGold(1e6);
  state.mine.ore[2] = 20;
  state.mine.ore[3] = 20;
  assert.ok(gems.craft('rubin', 2));
  assert.ok(gems.craft('smaragd', 2));
  assert.match(gems.blocker('rubin', 3), /Schmiede-Rang A/);
  assert.equal(state.mine.ore[2], 20 - 2 * gems.ORE_COST[2]);
  // im Team: Rubin = mehr Stärke, Smaragd = mehr Erfolgschance
  state.buildings.arena = 2;
  state.addItems([getGroup('helden', 'C')[0]]);
  arena.party.equip(0, 'hero', getGroup('helden', 'C')[0].id);
  const bare = arena.party.memberPower(state.arena.team[0]);
  assert.ok(arena.party.equipGem(0, gems.key('rubin', 2)));
  close(arena.party.memberPower(state.arena.team[0]), Math.round(bare * (1 + gems.GEMS[0].values[2])), 1);
  assert.equal(dungeon.party.equipGem(0, gems.key('rubin', 2)), false, 'der einzige Rubin steckt in der Arena');
  state.addItems([getGroup('helden', 'C')[1]]);
  dungeon.party.equip(0, 'hero', getGroup('helden', 'C')[1].id);
  const before = dungeon.chance(0);
  assert.ok(dungeon.party.equipGem(0, gems.key('smaragd', 2)));
  close(dungeon.chance(0) - before, gems.GEMS[2].values[2], 1e-9, 'Smaragd');
});

test('Statuen: ab Rang A aus Erz gegossen, Bonus nach Kategorie und Rang', () => {
  const hero = getGroup('helden', 'S')[0];
  state.addItems([hero, getGroup('helden', 'B')[0]]);
  state.addGold(1e6);
  state.mine.ore[4] = 10;
  assert.match(statues.blocker(getGroup('helden', 'B')[0]), /ab Rang A/);
  assert.ok(statues.cast(0, hero.id));
  assert.equal(state.mine.ore[4], 0);
  close(companions.bonus('power'), 0.03 * 1.5, 1e-9, 'Helden-Statue S: +4,5 % Stärke');
  assert.equal(state.count(hero.id), 1, 'das Stück bleibt in der Sammlung');
});

test('Bossrush ultimativ: nur Bosse A–SS, schwächer angesetzt, mehr Gold', () => {
  state.buildings.arena = 5;
  state.addItems(getGroup('helden', 'S').slice(0, 5));
  bossrush.party.autoEquip();
  const t0 = Date.now();
  assert.ok(bossrush.start('ultimate', { now: t0, rand: seeded(9) }));
  const x = bossrush.run();
  assert.equal(x.mode, 'ultimate');
  bossrush.tick(t0 + 3600 * 1000, seeded(11));
  assert.ok(x.log.every((f) => f.tier >= 3), 'nur A, S, SS');
  assert.ok(bossrush.bossPower(4, 10, 'ultimate') < bossrush.bossPower(4, 10) * 0.6);
  assert.ok(x.bosses > 0);
  assert.equal(bossrush.best('ultimate'), x.bosses);
});

test('Lange Läufe: starke Teams halten Stunden durch, AFK sammelt ein und startet neu', () => {
  state.buildings.arena = 5;
  state.buildings.dungeon = 5;
  state.addItems([...getGroup('helden', 'SS').slice(0, 5), ...getGroup('helden', 'S').slice(0, 5)]);
  dungeon.party.autoEquip();
  bossrush.party.autoEquip();
  // fast sichere Siege: höchstens 0,05 % Verlust je Kampf
  assert.equal(bossrush.winChance(1e9, 100), bossrush.RUN_MAX_CHANCE);
  const t0 = Date.now();
  // ein sehr starkes Team kämpft 4 Stunden lang durch
  assert.ok(bossrush.start('normal', { now: t0, rand: seeded(1) }));
  bossrush.run().power = 60000;
  bossrush.tick(t0 + 4 * 3600 * 1000, seeded(2));
  assert.equal(bossrush.run().status, 'fighting');
  assert.ok(bossrush.run().bosses > 2000);
  bossrush.collect();
  // AFK mit schwächerem Team: fällt, sammelt ein, startet neu
  const gold = state.gold;
  assert.ok(bossrush.start('ultimate', { afk: true, now: t0, rand: seeded(3) }));
  bossrush.run().power = 500;
  bossrush.tick(t0 + 8 * 3600 * 1000, seeded(4));
  const res = bossrush.collect();
  assert.ok(res.afkTotals.runs >= 1, 'automatisch neu gestartet');
  assert.ok(state.gold > gold);
  // AFK-Abstieg: Händler werden übersprungen, Neustart nach Niederlage ohne Verlust
  assert.ok(descent.start('blut', t0, true));
  descent.current().power = 2000;
  descent.tick(t0 + 12 * 3600 * 1000, seeded(5));
  const d2 = descent.current();
  assert.equal(d2.status, 'running');
  assert.ok(d2.totals.runs >= 1 && d2.totals.best > 300, `Rekord ${d2.totals.best}`);
  assert.equal(descent.retreat().lost, false);
});

test('Brunnen-Währungen: Glückstaler (D/C) und Sternentaler (B–SS), Splitter und Bonus-Taler', () => {
  resetWell();
  state.buildings.well = 0;
  setGold(1e7);
  assert.equal(well.coinPrice('taler', 10), 400);
  assert.equal(well.coinPrice('stern'), 500);
  assert.ok(well.pull(1, Math.random, { currency: 'taler' }).error, 'ohne Taler geht es nicht');
  assert.ok(well.buyCoins('taler', 200));
  assert.ok(well.buyCoins('stern', 100));
  const random = seeded(8);
  const t = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 20; i++) for (const { item } of well.pull(10, random, { currency: 'taler' }).results) t[item.tier]++;
  assert.ok((t[0] + t[1]) / 200 > 0.85, 'fast nur D/C');
  assert.equal(well.coins('taler'), 0);
  assert.equal(well.coins('stern'), 100 + 200 / well.SPLINTERS_PER_STAR, 'Splitter werden zu Sternentalern');
  const s = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 10; i++) for (const { item } of well.pull(10, random, { currency: 'stern' }).results) s[item.tier]++;
  assert.equal(s[0] + s[1], 0, 'nie D oder C');
  assert.ok(s[3] + s[4] + s[5] > 10, 'viele A–SS');
  const r = well.pull(10, random);
  assert.equal(r.bonusTaler, 1);
  assert.equal(well.coins('taler'), 1, 'ein Bonus-Taler je normalem 10er-Wunsch');
});
