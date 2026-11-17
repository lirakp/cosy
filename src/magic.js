import { ITEMS, RARITIES, worldItems } from './items.js';
import { state } from './state.js';
import * as buildings from './buildings.js';
import * as buffs from './buffs.js';
import * as garden from './garden.js';
import * as expedition from './expedition.js';
import * as mine from './mine.js';
import * as fishtrap from './fishtrap.js';
import * as stars from './stars.js';
import * as companions from './companions.js';

// Magie: Der Magierturm sammelt Mana (nachts doppelt so schnell). Jede
// Schriftrolle im Spiel lehrt genau einen Zauber. Es gibt fünf Schulen; je
// höher der Rang der Schriftrolle, desto stärker der Zauber und desto mehr
// Wirkungen kommen dazu. Jeder Zauber hat eine Abklingzeit.

// je Turm-Rang (D … SS)
export const MAX_MANA = [30, 45, 60, 80, 100, 130];
export const REGEN = [1, 1.3, 1.6, 2, 2.5, 3]; // Mana pro Minute (nachts doppelt)
export const NIGHT_FACTOR = 2;

// je Zauber-Rang (D … SS)
export const COST = [15, 20, 30, 45, 65, 90];
export const COOLDOWN = [5, 8, 12, 20, 30, 45]; // Minuten

// Wirkungen (fx):
//   ripen       bepflanzte Beete sind sofort reif
//   crops       zusätzliche Ernte je reif gezaubertem Beet (direkt in den Vorrat)
//   replant     leere Beete bekommen kostenlos ihre letzte Saat (und reifen mit)
//   skip        Minuten Ertrag für Expedition und Mine
//   rain        Sekunden Münzregen auf dem Weg
//   gold        Gold sofort
//   buff        Rausch { id, min }
//   lure        nächste n Würfe: sofortiger Biss, Fang v Ränge höher
//   trap        Minuten Fangzeit für die Reuse
//   luck        nächste n Wünsche am Brunnen: erstes Stück mindestens Rang v
//   stars       so viele Sternschnuppen ziehen kurz nacheinander vorbei (auch am Tag)
//   shield      nächste n Dungeon-Erkundungen oder Bosskämpfe: +v Erfolg
export const SCHOOLS = [
  {
    id: 'natur', name: 'Zeit & Wachstum', icon: '❀',
    spells: [
      ['Keimling', { ripen: true }],
      ['Frühlingshauch', { ripen: true, crops: 1 }],
      ['Erntesegen', { ripen: true, crops: 1, skip: 15 }],
      ['Zeitsprung', { ripen: true, crops: 2, skip: 30 }],
      ['Jahreslauf', { replant: true, ripen: true, crops: 2, skip: 60 }],
      ['Ewiger Frühling', { replant: true, ripen: true, crops: 3, skip: 120 }],
    ],
  },
  {
    id: 'gold', name: 'Gold', icon: '◉',
    spells: [
      ['Sternenregen', { rain: 45 }],
      ['Münzschauer', { rain: 60, gold: 100 }],
      ['Goldene Brise', { rain: 75, gold: 300 }],
      ['Schatzregen', { rain: 90, gold: 800 }],
      ['Goldflut', { rain: 120, gold: 2000, buff: { id: 'gold', min: 10 } }],
      ['Sonnengold', { rain: 180, gold: 5000, buff: { id: 'gold', min: 20 } }],
    ],
  },
  {
    id: 'wasser', name: 'Wasser', icon: '≈',
    spells: [
      ['Lockruf', { lure: { n: 1, v: 1 } }],
      ['Fischflüstern', { lure: { n: 2, v: 1 } }],
      ['Gezeitenruf', { lure: { n: 3, v: 1 }, trap: 30 }],
      ['Mondflut', { lure: { n: 4, v: 2 }, trap: 60 }],
      ['Tiefenruf', { lure: { n: 5, v: 2 }, trap: 120 }],
      ['Ruf des Ozeans', { lure: { n: 8, v: 3 }, trap: 240 }],
    ],
  },
  {
    id: 'glueck', name: 'Glück & Sterne', icon: '✦',
    spells: [
      ['Glücksfunke', { luck: { n: 1, v: 1 } }],
      ['Wunschstern', { luck: { n: 2, v: 1 }, stars: 3 }],
      ['Kleeblattsegen', { luck: { n: 2, v: 2 }, stars: 4 }],
      ['Sternschnuppenregen', { luck: { n: 3, v: 2 }, stars: 6 }],
      ['Schicksalsfaden', { luck: { n: 3, v: 3 }, stars: 8, buff: { id: 'luck', min: 15 } }],
      ['Tausend Wünsche', { luck: { n: 5, v: 3 }, stars: 12, buff: { id: 'luck', min: 30 } }],
    ],
  },
  {
    id: 'kampf', name: 'Schutz & Kampf', icon: '⛨',
    spells: [
      ['Schutzhauch', { shield: { n: 1, v: 0.05 } }],
      ['Eisenhaut', { shield: { n: 1, v: 0.1 } }],
      ['Schutzschild', { shield: { n: 2, v: 0.12 } }],
      ['Kriegsruf', { shield: { n: 2, v: 0.15 } }],
      ['Bollwerk', { shield: { n: 3, v: 0.2 } }],
      ['Unbezwingbar', { shield: { n: 3, v: 0.25 }, buff: { id: 'gladiator', min: 20 } }],
    ],
  },
];
export const school = (id) => SCHOOLS.find((s) => s.id === id);

const rankId = (t) => RARITIES[t].id;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const pct = (v) => `+${Math.round(v * 100)} %`;

// Beschreibung eines Zaubers aus seinen Wirkungen
export function describe(fx) {
  const out = [];
  if (fx.replant) out.push('Leere Beete werden kostenlos mit der letzten Saat bepflanzt.');
  if (fx.ripen) out.push(fx.crops ? `Alle Beete sind sofort reif, dazu +${fx.crops} Ernte je Beet.` : 'Alle bepflanzten Beete sind sofort reif.');
  if (fx.skip) out.push(`Expedition und Mine bekommen sofort ${fx.skip} Minuten Ertrag.`);
  if (fx.rain) out.push(`${fx.rain} Sekunden regnet es Münzen auf den Weg.`);
  if (fx.gold) out.push(`Sofort ${fx.gold.toLocaleString('de-DE')} Gold.`);
  if (fx.lure) out.push(`${fx.lure.n === 1 ? 'Der nächste Fisch beißt' : `Die nächsten ${fx.lure.n} Fische beißen`} sofort und ${fx.lure.n === 1 ? 'ist' : 'sind'} ${plural(fx.lure.v, 'Rang', 'Ränge')} höher.`);
  if (fx.trap) out.push(`Die Reuse fängt sofort für ${fx.trap} Minuten.`);
  if (fx.luck) out.push(`${fx.luck.n === 1 ? 'Der nächste Wunsch' : `Die nächsten ${fx.luck.n} Wünsche`} am Brunnen: erstes Stück mindestens Rang ${rankId(fx.luck.v)}.`);
  if (fx.stars) out.push(`${fx.stars} Sternschnuppen ziehen kurz nacheinander vorbei – auch am Tag.`);
  if (fx.shield) out.push(`${fx.shield.n === 1 ? 'Nächste Dungeon-Erkundung oder nächster Bosskampf' : `Die nächsten ${fx.shield.n} Dungeon-Erkundungen oder Bosskämpfe`}: ${pct(fx.shield.v)} Erfolg.`);
  if (fx.buff) out.push(`${buffs.BUFFS[fx.buff.id].name} für ${fx.buff.min} Minuten.`);
  if (fx.ore) out.push(`${fx.ore.n} Erz vom Rang ${rankId(fx.ore.tier)} für die Mine.`);
  if (fx.wish) out.push('Der nächste Einzelwunsch am Brunnen ist gratis.');
  return out.join(' ');
}

// Jede Schriftrolle lehrt einen Zauber. Innerhalb eines Rangs gehören die
// Schriftrollen der Reihe nach zu den fünf Schulen.
export const SCROLLS = ITEMS.filter((i) => i.kind === 'Schriftrolle');
export const SPELLS = [];
for (let t = 0; t < RARITIES.length; t++) {
  SCROLLS.filter((s) => s.tier === t).forEach((scroll, i) => {
    const sc = SCHOOLS[i % SCHOOLS.length];
    const [name, fx] = sc.spells[t];
    SPELLS.push({ id: scroll.id, scroll, school: sc.id, name, rank: t, cost: COST[t], cooldown: COOLDOWN[t], fx, text: describe(fx) });
  });
}

// Zauber der Portalwelten: eigene Namen, stärkere Wirkungen und je Welt eine
// besondere Zugabe – die Hölle schenkt Erz, der Himmel einen Gratiswunsch.
const REALM_NAMES = {
  hoelle: {
    natur: ['Aschekeim', 'Glutsaat', 'Schwefelernte', 'Höllenzeit', 'Feuerfrühling', 'Ewige Glutreife'],
    gold: ['Funkenregen', 'Schwefelgold', 'Höllenschatz', 'Goldglut', 'Dämonengold', 'Infernogold'],
    wasser: ['Lavaköder', 'Schwefelflut', 'Magmaruf', 'Glutgezeiten', 'Höllenstrom', 'Ruf des Feuersees'],
    glueck: ['Teufelsglück', 'Dämonenwurf', 'Feuerfunke', 'Sternenbrand', 'Höllenpakt', 'Tausend Flammen'],
    kampf: ['Aschehaut', 'Glutpanzer', 'Dämonenschild', 'Höllenwut', 'Feuerbollwerk', 'Zorn des Abgrunds'],
  },
  himmel: {
    natur: ['Taukeim', 'Wolkensaat', 'Himmelsernte', 'Engelszeit', 'Lichtfrühling', 'Ewiger Garten'],
    gold: ['Lichtregen', 'Wolkengold', 'Himmelsschatz', 'Sonnenregen', 'Engelsgold', 'Goldenes Paradies'],
    wasser: ['Wolkenköder', 'Himmelsquelle', 'Regenbogenruf', 'Lichtgezeiten', 'Engelsflut', 'Ruf des Wolkensees'],
    glueck: ['Engelsglück', 'Federwurf', 'Lichtfunke', 'Sternenchor', 'Segensspruch', 'Tausend Engel'],
    kampf: ['Federhaut', 'Lichtpanzer', 'Engelsschild', 'Himmelszorn', 'Lichtbollwerk', 'Schwert des Seraphen'],
  },
};
// stärkere Fassung einer Heimat-Wirkung
function stronger(fx) {
  const o = { ...fx };
  if (o.crops) o.crops += 1;
  if (o.skip) o.skip = Math.round(o.skip * 1.5);
  if (o.rain) o.rain = Math.round(o.rain * 1.5);
  if (o.gold) o.gold *= 2;
  if (o.trap) o.trap = Math.round(o.trap * 1.5);
  if (o.stars) o.stars = Math.ceil(o.stars * 1.5);
  if (o.lure) o.lure = { n: o.lure.n + 1, v: Math.min(3, o.lure.v + (o.lure.v < 2 ? 1 : 0)) };
  if (o.luck) o.luck = { n: o.luck.n + 1, v: o.luck.v };
  if (o.shield) o.shield = { n: o.shield.n + 1, v: Math.round((o.shield.v + 0.05) * 100) / 100 };
  if (o.buff) o.buff = { ...o.buff, min: Math.round(o.buff.min * 1.5) };
  return o;
}
for (const w of ['hoelle', 'himmel']) {
  const scrolls = worldItems(w).filter((i) => i.kind === 'Schriftrolle');
  for (let t = 0; t < RARITIES.length; t++) {
    scrolls.filter((s) => s.tier === t).forEach((scroll, i) => {
      const sc = SCHOOLS[i % SCHOOLS.length];
      const fx = stronger(sc.spells[t][1]);
      if (w === 'hoelle') fx.ore = { tier: t, n: (t + 1) * 2 };
      if (w === 'himmel' && t >= 2) fx.wish = true;
      SPELLS.push({ id: scroll.id, scroll, world: w, school: sc.id, name: REALM_NAMES[w][sc.id][t], rank: t, cost: COST[t], cooldown: COOLDOWN[t], fx, text: describe(fx) });
    });
  }
}
for (const sp of SPELLS) sp.world ||= 'normal';

export const spell = (id) => SPELLS.find((s) => s.id === id);
export const spellOf = (scrollId) => spell(scrollId);

const m = () => state.magic;
const tier = () => buildings.tier('tower');
export const owned = () => tier() >= 0;
export const maxMana = () => (owned() ? MAX_MANA[tier()] : 0);
export const regen = (night = false) => (owned() ? REGEN[tier()] * (night ? NIGHT_FACTOR : 1) * (1 + companions.bonus('mana')) : 0);
export const mana = () => Math.floor(m().mana);

// Mana nachladen; offline zählt der Tageswert
export function tick(now = Date.now(), night = false) {
  const x = m();
  if (!owned()) {
    x.last = now;
    return;
  }
  const minutes = x.last ? Math.max(0, (now - x.last) / 60000) : 0;
  x.last = now;
  const rate = minutes > 0.1 ? regen(false) : regen(night);
  x.mana = Math.min(maxMana(), x.mana + rate * minutes);
}

// ---------------------------------------------------------------- Lernen

export const learned = (id) => m().learned.includes(id);
export const hasScroll = (sp) => state.count(sp.scroll.id) > 0;

// Warum ein Zauber noch nicht gelernt werden kann (oder null)
export function learnBlocker(sp) {
  if (!owned()) return 'Erst den Magierturm bauen.';
  if (!hasScroll(sp)) return `Dir fehlt die ${sp.scroll.name} (Relikte, Rang ${rankId(sp.rank)}).`;
  if (tier() < sp.rank) return `Turm-Rang ${rankId(sp.rank)} nötig.`;
  return null;
}

export function learn(id) {
  const sp = spell(id);
  if (!sp || learned(id) || learnBlocker(sp)) return false;
  m().learned.push(id);
  state.changed();
  return true;
}

// ---------------------------------------------------------------- Wirken

export const cooldownLeft = (id, now = Date.now()) => Math.max(0, Math.ceil(((m().cd[id] || 0) - now) / 1000));

const gardenOnly = (fx) => (fx.ripen || fx.replant) && !fx.skip;
const replantable = () => garden.beds().some((b, i) => !b && state.garden.last[i]);

export function castBlocker(sp, now = Date.now()) {
  if (!learned(sp.id)) return 'Noch nicht gelernt.';
  if (tier() < sp.rank) return `Turm-Rang ${rankId(sp.rank)} nötig.`;
  if (cooldownLeft(sp.id, now)) return 'Lädt sich noch auf.';
  if (m().mana < sp.cost) return 'Nicht genug Mana.';
  if (gardenOnly(sp.fx) && !garden.beds().some((b) => b) && !(sp.fx.replant && replantable())) return 'Kein Beet ist bepflanzt.';
  return null;
}

// Ladungen zusammenführen: die stärkere Wirkung und die meisten Ladungen zählen
function charge(key, add) {
  const cur = m()[key];
  m()[key] = cur && cur.n > 0 ? { n: Math.max(cur.n, add.n), v: Math.max(cur.v, add.v) } : { ...add };
}

// Wirkt einen Zauber. Liefert eine kurze Beschreibung des Ergebnisses oder null.
// onRain: Rückruf für den Münzregen (Darstellung in der Welt)
export function cast(id, { onRain } = {}, now = Date.now()) {
  const sp = spell(id);
  if (!sp || castBlocker(sp, now)) return null;
  const fx = sp.fx;
  m().mana -= sp.cost;
  m().cd[id] = now + sp.cooldown * 60000;
  const notes = [];

  if (fx.replant) {
    let n = 0;
    garden.beds().forEach((b, i) => {
      const last = state.garden.last[i];
      if (b || !last || !garden.crop(last)) return;
      state.garden.beds[i] = { crop: last, planted: now };
      n++;
    });
    if (n) notes.push(`${plural(n, 'Beet', 'Beete')} neu bepflanzt`);
  }
  if (fx.ripen) {
    let n = 0;
    for (const b of garden.beds()) {
      if (!b) continue;
      const c = garden.crop(b.crop);
      b.planted = Math.min(b.planted, now - garden.growMinutes(c.id) * 60000);
      if (fx.crops) state.garden.crops[c.id] = garden.have(c.id) + fx.crops;
      n++;
    }
    if (n) notes.push(`${plural(n, 'Beet ist', 'Beete sind')} reif${fx.crops ? ` (+${fx.crops * n} Ernte)` : ''}`);
  }
  if (fx.skip) {
    const before = expedition.live.gold;
    if (state.exp.last) state.exp.last -= fx.skip * 60000;
    expedition.tick(now);
    if (state.mine.last) state.mine.last -= fx.skip * 60000;
    const ore = mine.tick(now).reduce((a, b) => a + b, 0);
    notes.push(`Truhe +${Math.max(0, Math.round(expedition.live.gold - before))} Gold, Mine +${ore} Erz`);
  }
  if (fx.rain) {
    onRain?.(fx.rain);
    notes.push(`${fx.rain} s Münzregen`);
  }
  if (fx.gold) {
    state.addGold(fx.gold, 'magie');
    notes.push(`+${fx.gold.toLocaleString('de-DE')} Gold`);
  }
  if (fx.lure) {
    charge('lure', fx.lure);
    notes.push(`Lockruf für ${plural(m().lure.n, 'Wurf', 'Würfe')}`);
  }
  if (fx.trap && fishtrap.built()) {
    const trap = state.village.trap;
    if (trap.last) trap.last -= fx.trap * 60000;
    notes.push(`Reuse +${fishtrap.tick(now)} Fische`);
  }
  if (fx.luck) {
    charge('luckyPull', fx.luck);
    notes.push(`${plural(m().luckyPull.n, 'Wunsch', 'Wünsche')} mit Glück`);
  }
  if (fx.stars) {
    stars.shower(fx.stars);
    notes.push(`${fx.stars} Sternschnuppen`);
  }
  if (fx.shield) {
    charge('shield', fx.shield);
    notes.push(`Schild ${pct(m().shield.v)} für ${plural(m().shield.n, 'Kampf', 'Kämpfe')}`);
  }
  if (fx.buff) {
    const cur = buffs.current(now);
    if (cur?.id === fx.buff.id) buffs.extend(fx.buff.min, now);
    else buffs.grant(fx.buff.id, now, fx.buff.min);
    notes.push(`${buffs.BUFFS[fx.buff.id].name} ${fx.buff.min} min`);
  }
  if (fx.ore) {
    state.mine.ore[fx.ore.tier] += fx.ore.n;
    notes.push(`+${fx.ore.n} Erz ${rankId(fx.ore.tier)}`);
  }
  if (fx.wish) {
    state.well.freeNext = true;
    notes.push('nächster Wunsch gratis');
  }
  state.changed();
  return notes.join(', ') || sp.text;
}

// ---------------------------------------------------------------- Ladungen

// Verbraucht eine Ladung und liefert ihre Stärke (0 = keine)
function consume(key) {
  const c = m()[key];
  if (!c || !(c.n > 0)) return 0;
  c.n--;
  if (c.n <= 0) m()[key] = false;
  state.changed();
  return c.v;
}
export const useLure = () => consume('lure'); // Ränge höher
export const useLuckyPull = () => consume('luckyPull'); // Mindest-Rang
export const useShield = () => consume('shield'); // Bonus auf die Erfolgschance
const left = (key) => (m()[key] && m()[key].n) || 0;
export const lureReady = () => left('lure');
export const luckyReady = () => left('luckyPull');
export const shieldReady = () => left('shield');
export const SHIELD_MAX = 0.99;
// Schild auf eine Erfolgschance anrechnen (true = alter Spielstand mit 15 %)
export const shielded = (chance, bonus = 0.15) => Math.min(SHIELD_MAX, chance + (bonus === true ? 0.15 : bonus));

// Was gerade auf seinen Einsatz wartet (für das Zauberbuch)
export function pending() {
  const out = [];
  if (lureReady()) out.push(`Lockruf ×${lureReady()} (+${m().lure.v} Rang)`);
  if (luckyReady()) out.push(`Glück ×${luckyReady()} (ab ${rankId(m().luckyPull.v)})`);
  if (shieldReady()) out.push(`Schild ×${shieldReady()} (${pct(m().shield.v)})`);
  return out;
}
