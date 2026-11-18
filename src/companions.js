import { RARITIES, rollTier } from './items.js';
import { state } from './state.js';
import * as realm from './realm.js';
import * as statues from './statues.js';
import { sprite, flipped, getOutfit } from './sprites.js';
import { makeCanvas } from './utils.js';

// Begleiter: Unterwegs (auf dem Hof und im Dorf) taucht ab und zu ein
// streunendes Tier auf. Wer hingeht und es anspricht, gewinnt einen Freund.
// Ein Begleiter läuft (oder fliegt) hinter der Figur her und gibt einen
// kleinen Bonus – je seltener, desto stärker.

export const FIRST_WAIT = 45; // Sekunden Spielzeit bis zur ersten Begegnung
export const WAIT = [150, 330]; // danach zwischen zwei Begegnungen
export const STAY = 75; // so lange bleibt ein Streuner
export const REACH = 16; // so nah muss man heran

// Bonusarten
export const BONUS_TEXT = {
  coinReach: (v) => `sammelt Münzen bis ${Math.round(v)} Schritte entfernt ein`,
  expedition: (v) => `Expedition +${pct(v)} Gold`,
  garden: (v) => `Beete wachsen ${pct(v)} schneller`,
  mine: (v) => `Mine +${pct(v)} Erz`,
  mana: (v) => `Mana lädt ${pct(v)} schneller`,
  fishing: (v) => `Fische beißen ${pct(v)} schneller`,
  stars: (v) => `Sternschnuppen kommen ${pct(v)} öfter`,
  // neue Bonus-Arten der Begleiter aus den Dimensionen
  power: (v) => `Kampfteams (Arena, Dungeon, Bossrush, Abstieg) +${pct(v)} Stärke`,
  dungeonGold: (v) => `Dungeon, Abstieg und Bossrush +${pct(v)} Gold`,
  luckWish: (v) => `+${pct(v)} Chance auf einen Gratis-Folgewunsch`,
  questGold: (v) => `Aufgaben im Dorf +${pct(v)} Gold`,
  minigame: (v) => `Minispiele der Dörfer +${pct(v)} Ertrag`,
  // Boni für Brunnen-Taler, Seide und Schmiede
  taler: (v) => `Brunnen-Taler ${pct(v)} günstiger`,
  silk: (v) => `+${pct(v)} Chance auf Seide aus Kämpfen`,
  forge: (v) => `Schmiedeglut lädt ${pct(v)} schneller`,
};
const pct = (v) => `${Math.round(v * 100)} %`;

const EYE = '#2a2140';
const WHITE = '#fdf6e3';

// fly: fliegt · night: zeigt sich nur nachts · glow: leuchtet im Dunkeln
export const COMPANIONS = [
  {
    id: 'katze', fav: 'weizen', gifts: ['fish', 'gold'], name: 'Katze', tier: 0, bonus: { coinReach: 14 },
    text: 'Schnurrt, wenn du Münzen findest – und holt sich die in der Nähe gleich selbst.',
    colors: { k: '#e09a50', K: '#b06a30', e: EYE, p: '#f2a0b0' },
    rows: ['.......K.K', '.......kkk', 'K......kek', 'K..kKkkkkp', '.kkkkkkkk.', '..kkKkkk..', '..k.k.k.k.'],
  },
  {
    id: 'hund', fav: 'kartoffel', gifts: ['gold'], name: 'Hund', tier: 0, bonus: { expedition: 0.05 },
    text: 'Treu und unermüdlich. Begleitet in Gedanken auch die Expedition.',
    colors: { d: '#a8784a', D: '#6a4a30', e: EYE, n: EYE, t: '#e86a6a' },
    rows: ['......DD..', '......dddD', 'D.....dedn', 'D..dddddd.', '.dddddddt.', '..dddddd..', '..d.d..d.d'],
  },
  {
    id: 'hase', fav: 'karotte', gifts: ['seeds', 'crops'], name: 'Hase', tier: 0, bonus: { garden: 0.1 },
    text: 'Weiß genau, wann die Möhren reif sind – und beschleunigt das ein bisschen.',
    colors: { h: '#f0ece0', H: '#f2a0b0', e: EYE },
    rows: ['.......hH.', '.......hH.', '.......hh.', '......hhe.', 'h..hhhhhh.', 'hhhhhhhhh.', '..hhhhhh..', '..h....hh.'],
  },
  {
    id: 'igel', fav: 'beeren', gifts: ['ore'], name: 'Igel', tier: 0, bonus: { mine: 0.05 },
    text: 'Gräbt für sein Leben gern und hilft den Arbeitern in der Mine.',
    colors: { i: '#6a4a30', I: '#a87a50', f: '#e8c8a0', e: EYE, n: EYE },
    rows: ['..i.i.i...', '.iIiIiIi..', 'iiIiIiIff.', 'iIiIiIfefn', '.iiiiifff.', '..f...f...'],
  },
  {
    id: 'fuchs', fav: 'beeren', gifts: ['gold', 'seeds'], name: 'Fuchs', tier: 1, bonus: { expedition: 0.1 },
    text: 'Schlau und flink. Findet auf der Expedition die besten Abkürzungen.',
    colors: { o: '#e07030', w: WHITE, e: EYE, n: EYE },
    rows: ['.......o.o', '.......ooo', 'wo.....oeo', 'ooo.ooooon', '.wooooooww', '..oooooo..', '..o.o..o.o'],
  },
  {
    id: 'eule', fav: 'weizen', gifts: ['mana', 'gold'], name: 'Eule', tier: 1, night: true, fly: true, bonus: { mana: 0.15 },
    text: 'Zeigt sich nur nachts. Murmelt beim Fliegen alte Zaubersprüche.',
    colors: { u: '#8a6a4a', U: '#c8a878', e: '#ffd04a', b: '#e0a83c' },
    rows: ['.u....u.', '.uuuuuu.', 'uUeuueUu', 'uUUbbUUu', 'uUUUUUUu', '.uUUUUu.', '..uuuu..', '..b..b..'],
  },
  {
    id: 'frosch', fav: 'beeren', gifts: ['fish'], name: 'Frosch', tier: 1, bonus: { fishing: 0.25 },
    text: 'Quakt die Fische herbei. Am Steg beißt es mit ihm schneller.',
    colors: { g: '#6ab04a', G: '#3f7a3a', y: '#d8e8a0', w: WHITE, e: EYE },
    rows: ['...w.w...', '..gegeg..', '.ggggggg.', '.gyyyyyg.', 'gG.....Gg'],
  },
  {
    id: 'waschbaer', fav: 'kuerbis', gifts: ['gold', 'item'], name: 'Waschbär', tier: 2, bonus: { coinReach: 26, taler: 0.05 },
    text: 'Ein kleiner Dieb mit gutem Herz: Glitzerndes kann er nicht liegen lassen.',
    colors: { r: '#8a8a98', R: '#3a3a48', w: WHITE, e: EYE },
    rows: ['.......R.R', '.......rrr', 'R......wRe', 'r..rrrrrrR', 'RrrrrRrrr.', '.rrrrrrr..', '..r.r..r.r'],
  },
  {
    id: 'gluehwurm', fav: 'sternenblume', gifts: ['mana'], name: 'Glühwürmchen', tier: 2, night: true, fly: true, glow: '#fff17a', bonus: { stars: 0.4 },
    text: 'Ein Funke, der dir nachts den Weg leuchtet – und die Sterne anlockt.',
    colors: { y: '#fff17a', b: '#3a3a48', w: '#c8e0ff' },
    rows: ['.ww.', 'wbbw', '.byy', '..yy'],
  },
  {
    id: 'drache', fav: 'kuerbis', gifts: ['ore', 'gold'], name: 'Mini-Drache', tier: 3, fly: true, glow: '#ff9a4a', bonus: { mine: 0.2, forge: 0.25 },
    text: 'Speit winzige Flammen und schmilzt damit Erz aus dem Fels.',
    colors: { d: '#d9574a', D: '#8a2a3a', w: '#f0a060', e: EYE, y: '#ffd04a' },
    rows: ['....ww....', '...wwww.D.', '..wwwwwdd.', '.....ddded', 'D.dddddyd.', '.Ddddddy..', '...d..d...'],
  },
  {
    id: 'einhorn', fav: 'sternenblume', gifts: ['crops', 'seeds'], name: 'Einhornfohlen', tier: 3, bonus: { garden: 0.3 },
    text: 'Wo es entlangtrabt, sprießen Blumen. Dein Garten liebt es.',
    colors: { w: '#fdf6e3', m: '#f2a0d0', h: '#ffd04a', e: EYE },
    rows: ['........h.', '.......mh.', '.......ww.', 'm.....mwew', 'mm.wwwwww.', '.mwwwwww..', '..wwwwww..', '..w.w..w.w'],
  },
  {
    id: 'phoenix', fav: 'kuerbis', gifts: ['mana', 'ore'], name: 'Phönixküken', tier: 4, fly: true, glow: '#ffb04a', bonus: { mana: 0.4 },
    text: 'Ein Küken aus Glut. Seine Wärme lässt das Mana im Turm schneller fließen.',
    colors: { f: '#ff8a3a', F: '#ffd04a', r: '#d9574a', e: EYE, b: '#e0a83c' },
    rows: ['...F.F..', '..fFfF..', '.ffffeb.', 'rfFFfff.', 'rrfFFff.', '.r.fff..', '....b...'],
  },
  {
    id: 'kitsune', fav: 'sternenblume', gifts: ['gold', 'item'], name: 'Neunschwanzfuchs', tier: 4, bonus: { expedition: 0.25 },
    text: 'Ein Geisterfuchs mit goldenen Schweifen. Bringt der Expedition Glück.',
    colors: { k: WHITE, g: '#ffd04a', r: '#d9574a', e: EYE },
    rows: ['g.g....k.k', 'ggg....kkk', 'gkg....kek', '.gkg.kkkkr', '..gkkkkkk.', '...kkkkk..', '...k.k.k.k'],
  },
  {
    id: 'sternenkitz', fav: 'sternenblume', gifts: ['gold', 'fish', 'ore', 'seeds', 'mana', 'item'], name: 'Sternenkitz', tier: 5, night: true, glow: '#9be8e0',
    bonus: { coinReach: 20, expedition: 0.15, garden: 0.15, mine: 0.15, mana: 0.15, fishing: 0.15, stars: 0.15, taler: 0.05, silk: 0.05, forge: 0.15 },
    text: 'Ein Rehkitz aus Sternenlicht. Man sieht es nur in klaren Nächten – ein bisschen von allem wird besser.',
    colors: { s: '#9be8e0', S: '#4fa8b0', w: WHITE, e: EYE, a: '#ffd04a' },
    rows: ['.......a.a', '.......aa.', '.......ss.', '......ssse', '.s.wsswss.', '.sswsssws.', '..ssssss..', '..s.s..s.s'],
  },  // ------------------------------------------------ Begleiter der Hölle (nur dort unterwegs)
  {
    id: 'glutsalamander', world: 'hoelle', fav: 'feuerchili', gifts: ['gold', 'shards'], name: 'Glutsalamander', tier: 2, bonus: { dungeonGold: 0.2 },
    text: 'Huscht über heiße Steine und findet in jedem Dungeon noch ein paar Münzen.',
    colors: { r: '#d9402a', y: '#ffd04a', e: EYE },
    rows: ['.......rr.', '......rrer', 'r..rrrrrr.', '.rrrryrrr.', '..r.r..r.r'],
  },
  {
    id: 'aschefledermaus', world: 'hoelle', fav: 'aschenknolle', gifts: ['shards', 'ore'], name: 'Aschefledermaus', tier: 2, fly: true, bonus: { minigame: 0.25 },
    text: 'Flattert um die Esse und zeigt dir, wann das Eisen glüht.',
    colors: { b: '#3a2a34', e: '#ff6a2a' },
    rows: ['b.......b', 'bb.bbb.bb', 'bbbebebbb', '.bbbbbbb.', '..b...b..'],
  },
  {
    id: 'hoellenhund', world: 'hoelle', fav: 'feuerchili', gifts: ['gold', 'item'], name: 'Höllenhund', tier: 3, glow: '#ff5a2a', bonus: { power: 0.12, silk: 0.05 },
    text: 'Ein treuer Wächter mit glühenden Augen. Wer ihn sieht, kämpft mutiger.',
    colors: { d: '#3a2228', D: '#1a0c10', e: '#ff3a1a', n: EYE, t: '#ff8a3a' },
    rows: ['......DD..', '......dddD', 'D.....dedn', 'D..dddddd.', '.dddddddt.', '..dddddd..', '..d.d..d.d'],
  },
  {
    id: 'feuerimp', world: 'hoelle', fav: 'lavamelone', gifts: ['shards', 'item'], name: 'Feuerimp', tier: 3, fly: true, glow: '#ff8a3a', bonus: { luckWish: 0.05, taler: 0.1 },
    text: 'Ein frecher Kobold, der dem Brunnen ab und zu einen Gratiswunsch abschwatzt.',
    colors: { h: '#ffd04a', r: '#c0301c', e: '#ffd04a', w: '#ff8a3a' },
    rows: ['.h....h.', '.hrrrrh.', '.rerrer.', '.rrwwrr.', 'w.rrrr.w', '..r..r..'],
  },
  {
    id: 'lavaschnecke', world: 'hoelle', fav: 'aschenknolle', gifts: ['ore', 'shards'], name: 'Lavaschnecke', tier: 4, glow: '#ff8a3a', bonus: { mine: 0.4, dungeonGold: 0.2, forge: 0.3 },
    text: 'Langsam, aber ihre Schleimspur schmilzt Erz aus jedem Fels.',
    colors: { o: '#3a1418', y: '#ff8a3a', s: '#c0441c', e: EYE },
    rows: ['.......e.e', '...ooo..ss', '..oyyyo.ss', '.oyooyosss', 'sssssssss.'],
  },
  {
    id: 'nachtmahr', world: 'hoelle', fav: 'lavamelone', gifts: ['gold', 'ore', 'shards', 'item'], name: 'Nachtmahr', tier: 5, glow: '#ff5a2a', bonus: { power: 0.15, dungeonGold: 0.3, expedition: 0.2 },
    text: 'Ein Ross aus Schatten mit brennender Mähne – Herrscher über die Glutfelder.',
    colors: { w: '#2a1a20', m: '#ff6a2a', h: '#ff3a1a', e: '#ffd04a' },
    rows: ['........h.', '.......mh.', '.......ww.', 'm.....mwew', 'mm.wwwwww.', '.mwwwwww..', '..wwwwww..', '..w.w..w.w'],
  },
  // ------------------------------------------------ Begleiter des Himmels
  {
    id: 'wolkenschaf', world: 'himmel', fav: 'wolkenbeere', gifts: ['gold', 'seeds'], name: 'Wolkenschaf', tier: 2, bonus: { questGold: 0.3 },
    text: 'So flauschig, dass jeder Dorfbewohner ein bisschen mehr zahlt.',
    colors: { w: '#ffffff', h: '#c8b8a0', e: EYE },
    rows: ['..wwww..h', '.wwwwwwhe', 'wwwwwwwhh', '.wwwwwww.', '..h.h.h.h'],
  },
  {
    id: 'sternenspatz', world: 'himmel', fav: 'sonnenweizen', gifts: ['shards', 'mana'], name: 'Sternenspatz', tier: 2, fly: true, bonus: { minigame: 0.25 },
    text: 'Zwitschert dir zu, wo der nächste Stern herunterfällt.',
    colors: { y: '#9be8ff', e: EYE, o: '#ffd04a' },
    rows: ['...yy..', '..yyey.', '.yyyyyo', 'yyyyy..', '.y..y..'],
  },
  {
    id: 'engelskatze', world: 'himmel', fav: 'wolkenbeere', gifts: ['shards', 'item'], name: 'Engelskatze', tier: 3, glow: '#ffe070', bonus: { luckWish: 0.05, taler: 0.1 },
    text: 'Schnurrt so lieb, dass der Brunnen ihr gern einen Wunsch schenkt.',
    colors: { k: '#fdf6e3', K: '#ffe070', e: EYE, p: '#f2a0b0' },
    rows: ['.......K.K', '.......kkk', 'K......kek', 'K..kKkkkkp', '.kkkkkkkk.', '..kkKkkk..', '..k.k.k.k.'],
  },
  {
    id: 'pegasus', world: 'himmel', fav: 'engelsapfel', gifts: ['gold', 'item'], name: 'Pegasusfohlen', tier: 3, bonus: { power: 0.12, silk: 0.05 },
    text: 'Ein geflügeltes Fohlen. Mit ihm im Rücken fühlt sich jeder Held stärker.',
    colors: { w: '#f4f6ff', m: '#9be8ff', h: '#d8e6fc', e: EYE },
    rows: ['........h.', '.......mh.', '.......ww.', 'm.....mwew', 'mm.wwwwww.', '.mwwwwww..', '..wwwwww..', '..w.w..w.w'],
  },
  {
    id: 'glueckskranich', world: 'himmel', fav: 'sonnenweizen', gifts: ['mana', 'shards', 'item'], name: 'Glückskranich', tier: 4, fly: true, glow: '#ffe070', bonus: { stars: 0.5, luckWish: 0.05, questGold: 0.2, taler: 0.1 },
    text: 'Wer einen Glückskranich sieht, hat einen Wunsch frei – heißt es.',
    colors: { w: '#ffffff', k: '#2a2140', r: '#e8577a', e: EYE },
    rows: ['.......kr', '......kke', '......k..', '.wwwwwk..', 'wwwwwww..', '...k.k...'],
  },
  {
    id: 'himmelsdrache', world: 'himmel', fav: 'engelsapfel', gifts: ['gold', 'mana', 'shards', 'seeds', 'item'], name: 'Himmelsdrache', tier: 5, fly: true, glow: '#ffffff',
    bonus: { coinReach: 14, expedition: 0.15, garden: 0.15, mine: 0.15, mana: 0.15, questGold: 0.3, minigame: 0.3, taler: 0.1, silk: 0.05, forge: 0.15 },
    text: 'Ein Drache aus Licht und Wolken – Hüter der Sieben Himmel.',
    colors: { d: '#fdf6e3', D: '#ffe070', w: '#9be8ff', e: EYE, y: '#ffd04a' },
    rows: ['....ww....', '...wwww.D.', '..wwwwwdd.', '.....ddded', 'D.dddddyd.', '.Ddddddy..', '...d..d...'],
  },
];
export const companion = (id) => COMPANIONS.find((c) => c.id === id);
export const describeBonus = (c, lvl = 1) => Object.entries(c.bonus).map(([k, v]) => BONUS_TEXT[k](k === 'coinReach' ? Math.round(v * LEVEL_MULT[lvl - 1]) : v * LEVEL_MULT[lvl - 1])).join(', ');

// ---------------------------------------------------------------- Besitz

const s = () => state.companions;
export const owned = (id) => s().owned.includes(id);
export const ownedCount = () => s().owned.length;
export const active = () => (s().active && owned(s().active) ? companion(s().active) : null);
export function setActive(id) {
  if (id && !owned(id)) return false;
  s().active = id || null;
  state.changed();
  return true;
}

// ---------------------------------------------------------------- Freundschaft

// Leckerlis aus dem Garten machen Begleiter stärker. Punkte je Pflanze (nach
// ihrem Rang), das Lieblingsleckerli zählt doppelt.
export const TREAT_POINTS = [1, 2, 3, 5, 10];
export const MAX_LEVEL = 5;
export const LEVEL_POINTS = [0, 6, 18, 40, 80]; // ab so vielen Punkten Stufe 1 … 5 (× Rang-Faktor)
export const LEVEL_MULT = [1, 1.25, 1.5, 1.75, 2]; // Bonus je Stufe
const rankFactor = (c) => 1 + c.tier * 0.5;

export const points = (id) => s().pts?.[id] || 0;
export const need = (c, level) => Math.round(LEVEL_POINTS[level - 1] * rankFactor(c));
export function level(id) {
  const c = companion(id);
  let l = 1;
  while (l < MAX_LEVEL && points(id) >= need(c, l + 1)) l++;
  return l;
}
// Fortschritt zur nächsten Stufe 0 … 1 (1 = höchste Stufe)
export function progress(id) {
  const c = companion(id);
  const l = level(id);
  if (l >= MAX_LEVEL) return 1;
  return (points(id) - need(c, l)) / (need(c, l + 1) - need(c, l));
}
// Bonus eines Begleiters auf seiner Stufe
export const bonusOf = (c, kind) => (c.bonus[kind] || 0) * LEVEL_MULT[level(c.id) - 1];
// Bonus des aktiven Begleiters (0, wenn keiner dabei ist)
// Bonus des aktiven Begleiters plus genähter Kleidung (0, wenn nichts davon passt)
const outfitBonus = (kind) => {
  const o = getOutfit(state.outfit);
  return o.sew && state.tailor?.sewn.includes(o.id) ? o.bonus?.[kind] || 0 : 0;
};
export const bonus = (kind) => (active() ? bonusOf(active(), kind) : 0) + outfitBonus(kind) + realm.bonus(kind) + statues.bonus(kind);

export function befriend(id) {
  if (!companion(id) || owned(id)) return false;
  s().owned.push(id);
  if (!s().active) s().active = id;
  state.changed();
  return true;
}

// ---------------------------------------------------------------- Bilder

const cache = new Map();
// { 1: rechts, -1: links }
export function images(id) {
  if (!cache.has(id)) {
    const c = companion(id);
    const right = sprite(c.rows, c.colors);
    cache.set(id, { 1: right, [-1]: flipped(right) });
  }
  return cache.get(id);
}
// 16×16 für Menüs und Pop-ups (mittig, unten bündig)
const icons = new Map();
export function icon(id) {
  if (!icons.has(id)) {
    const img = images(id)[1];
    const [c, ctx] = makeCanvas(16, 16);
    ctx.drawImage(img, Math.floor((16 - img.width) / 2), 14 - img.height);
    icons.set(id, c);
  }
  return icons.get(id);
}

// ---------------------------------------------------------------- Begegnungen

let wait = FIRST_WAIT;
let stray = null; // { id, x, t, dir, walk }

// Wählt ein noch nicht gefundenes Tier nach Rang-Wahrscheinlichkeit
// Begleiter einer Welt (Heimat oder Dimension)
export const worldOf = (c) => c.world || 'normal';
export function rollStray(night, r = Math.random) {
  // unterwegs trifft man nur Tiere der Welt, in der man gerade ist
  const open = COMPANIONS.filter((c) => worldOf(c) === realm.current() && !owned(c.id) && (!c.night || night));
  if (!open.length) return null;
  const tier = rollTier(0, r);
  // gibt es auf dem Rang nichts mehr, nimm das nächstniedrigere (sonst irgendeines)
  for (let t = tier; t >= 0; t--) {
    const pool = open.filter((c) => c.tier === t);
    if (pool.length) return pool[Math.floor(r() * pool.length)];
  }
  return open[Math.floor(r() * open.length)];
}

// where: 'outside' | 'village' | anderes · bounds: begehbarer Bereich
export function update(dt, { where, night, playerX, bounds }) {
  if (stray) {
    stray.t += dt;
    if (stray.where !== where || stray.t > STAY) {
      stray = null;
      return;
    }
    // trödelt ein bisschen hin und her
    stray.walk -= dt;
    if (stray.walk <= 0) {
      stray.walk = 1.5 + Math.random() * 2.5;
      stray.dir = Math.random() < 0.4 ? 0 : Math.random() < 0.5 ? -1 : 1;
      if (stray.dir) stray.facing = stray.dir;
    }
    stray.x = Math.max(bounds[0] + 10, Math.min(bounds[1] - 10, stray.x + stray.dir * 10 * dt));
    return;
  }
  if (where !== 'outside' && where !== 'village') return;
  wait -= dt;
  if (wait > 0) return;
  wait = WAIT[0] + Math.random() * (WAIT[1] - WAIT[0]);
  const c = rollStray(night);
  if (!c) return;
  const side = Math.random() < 0.5 ? -1 : 1;
  let x = playerX + side * (70 + Math.random() * 60);
  if (x < bounds[0] + 20 || x > bounds[1] - 20) x = playerX - side * (70 + Math.random() * 60);
  stray = { id: c.id, where, x: Math.max(bounds[0] + 20, Math.min(bounds[1] - 20, x)), t: 0, dir: 0, facing: -side, walk: 2 };
}

export const currentStray = () => stray;
export const nearStray = (playerX) => !!stray && Math.abs(stray.x - playerX) < REACH;
// für Tests und Fehlersuche
export function spawnStray(id, where, x) {
  stray = { id, where, x, t: 0, dir: 0, facing: -1, walk: 3 };
}

export function befriendStray() {
  if (!stray) return null;
  const c = companion(stray.id);
  stray = null;
  return befriend(c.id) ? c : null;
}

// ---------------------------------------------------------------- Mitläufer

const follow = { x: null, facing: 1, moving: false, t: 0, giftT: 0, heartT: 0 };
export const cheer = () => (follow.heartT = 1.5); // Herzchen nach dem Füttern
export const showGift = () => (follow.giftT = 2.5); // Päckchen über dem Kopf

export function followUpdate(dt, player) {
  if (!active()) return;
  const target = player.x - player.facing * 15;
  if (follow.x === null || Math.abs(follow.x - player.x) > 120) follow.x = target;
  const d = target - follow.x;
  follow.moving = Math.abs(d) > 2;
  if (follow.moving) {
    follow.x += Math.sign(d) * Math.min(Math.abs(d), Math.max(30, Math.abs(d) * 3) * dt);
    follow.facing = Math.sign(d);
  } else follow.facing = player.facing;
  follow.t += dt;
  follow.giftT = Math.max(0, follow.giftT - dt);
  follow.heartT = Math.max(0, follow.heartT - dt);
}
// beim Ortswechsel neu neben die Figur setzen
export const resetFollow = () => (follow.x = null);

// Zeichnet ein Tier mit den Füßen auf groundY
function drawAnimal(ctx, c, x, groundY, facing, moving, time) {
  const img = images(c.id)[facing < 0 ? -1 : 1];
  let y = groundY - img.height + 1;
  if (c.fly) y -= 16 + Math.round(Math.sin(time * 3) * 2);
  else if (moving) y -= Math.abs(Math.sin(time * 10)) > 0.6 ? 1 : 0;
  const left = Math.round(x - img.width / 2);
  if (!c.fly) {
    ctx.fillStyle = 'rgba(42, 33, 64, 0.3)';
    ctx.fillRect(left + 1, groundY, img.width - 2, 1);
  }
  ctx.drawImage(img, left, y);
}

export function drawFollower(ctx, camX, groundY, time) {
  const c = active();
  if (!c || follow.x === null) return;
  drawAnimal(ctx, c, follow.x - camX, groundY, follow.facing, follow.moving, time);
  // Geschenk oder Herz über dem Kopf
  if (follow.giftT > 0 || follow.heartT > 0) {
    const img = images(c.id)[1];
    const x = Math.round(follow.x - camX) - 3;
    const y = groundY - img.height - (c.fly ? 16 : 0) - 9 - Math.round((2.5 - Math.max(follow.giftT, follow.heartT)) * 2);
    if (follow.giftT > 0) {
      ctx.fillStyle = '#d9574a';
      ctx.fillRect(x, y + 2, 7, 5);
      ctx.fillStyle = '#ffd04a';
      ctx.fillRect(x + 3, y + 2, 1, 5);
      ctx.fillRect(x, y + 3, 7, 1);
      ctx.fillRect(x + 1, y, 2, 2);
      ctx.fillRect(x + 4, y, 2, 2);
    } else {
      ctx.fillStyle = '#e8577a';
      ctx.fillRect(x + 1, y + 1, 2, 2);
      ctx.fillRect(x + 4, y + 1, 2, 2);
      ctx.fillRect(x + 2, y + 3, 3, 1);
      ctx.fillRect(x + 3, y + 4, 1, 1);
    }
  }
}

export function drawStray(ctx, camX, groundY, time, where) {
  if (!stray || stray.where !== where) return;
  const c = companion(stray.id);
  const x = stray.x - camX;
  drawAnimal(ctx, c, x, groundY, stray.facing, stray.dir !== 0, time);
  // Sprechblase mit Herz
  const img = images(c.id)[1];
  const top = groundY - img.height - (c.fly ? 16 : 0) - 9 + Math.round(Math.sin(time * 4));
  const bx = Math.round(x) - 3;
  ctx.fillStyle = WHITE;
  ctx.fillRect(bx, top, 7, 6);
  ctx.fillRect(bx + 2, top + 6, 2, 1);
  ctx.fillStyle = '#e8577a';
  ctx.fillRect(bx + 1, top + 1, 2, 2);
  ctx.fillRect(bx + 4, top + 1, 2, 2);
  ctx.fillRect(bx + 2, top + 3, 3, 1);
  ctx.fillRect(bx + 3, top + 4, 1, 1);
}

// Leuchtende Begleiter: weicher Schein (nach der Tönung zeichnen)
export function drawGlow(ctx, camX, groundY, time, night) {
  const glow = (c, x) => {
    if (!c.glow || night < 0.2) return;
    const img = images(c.id)[1];
    const cy = groundY - img.height / 2 - (c.fly ? 16 + Math.sin(time * 3) * 2 : 0);
    const g = ctx.createRadialGradient(x, cy, 0, x, cy, 14);
    g.addColorStop(0, c.glow);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.35 * night * (0.85 + Math.sin(time * 5) * 0.15);
    ctx.fillStyle = g;
    ctx.fillRect(x - 14, cy - 14, 28, 28);
    ctx.globalAlpha = 1;
  };
  const a = active();
  if (a && follow.x !== null) glow(a, follow.x - camX);
}

export const rankOf = (c) => RARITIES[c.tier].id;
