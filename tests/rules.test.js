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
const spellAt = (school, rank) => magic.SPELLS.find((sp) => sp.school === school && sp.rank === rank);

test('Magie: jede Schriftrolle lehrt einen eigenen Zauber, je Schule wird er mit dem Rang stärker', () => {
  const scrolls = ITEMS.filter((i) => i.kind === 'Schriftrolle');
  assert.equal(magic.SPELLS.length, scrolls.length);
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
  assert.equal(state.stats.items.sternschnuppe.n, items);
});
