// Rundenkampf: Bis zu drei Helden gegen einen Boss.
//
// Jede Runde wählt jeder lebende Held nacheinander eine Aktion (Angriff,
// Spezialfähigkeit oder Verteidigen). Danach handelt der Boss: Er greift einen
// Helden an, holt alle paar Runden zu einem Flächenangriff aus (eine Runde vorher
// angekündigt – Verteidigen halbiert den Schaden) und wird unter 30 % Leben wütend.
// Lebenspunkte und Schaden ergeben sich aus der Stärke (Rang, Stufe, Ausrüstung).
//
// Der Kampf ist ein reines Datenobjekt (lässt sich speichern) – alle Funktionen
// hier verändern es und schreiben ins Kampfprotokoll.

// Klassen: jeder Held bekommt fest eine davon (nach seiner Id)
export const CLASSES = {
  krieger: {
    name: 'Krieger', icon: '⚔', hp: 1.3, atk: 1,
    skill: { name: 'Kraftschlag', cd: 3, text: 'Ein wuchtiger Hieb: 200 % Schaden.' },
  },
  magier: {
    name: 'Magier', icon: '✦', hp: 0.85, atk: 1.15,
    skill: { name: 'Feuerball', cd: 3, text: '150 % Schaden, der Boss brennt 2 Runden (je 40 % Schaden).' },
  },
  heiler: {
    name: 'Heiler', icon: '✚', hp: 1, atk: 0.8,
    skill: { name: 'Heilung', cd: 3, text: 'Heilt alle Verbündeten um 35 % ihrer Lebenspunkte und belebt Gefallene mit 25 % wieder.' },
  },
  waldlaeufer: {
    name: 'Waldläufer', icon: '➶', hp: 0.95, atk: 1.05,
    skill: { name: 'Doppelschuss', cd: 2, text: 'Zwei Pfeile zu je 90 % Schaden, jeder mit 35 % Chance auf einen kritischen Treffer.' },
  },
};
export const CLASS_IDS = Object.keys(CLASSES);
// Die Klasse folgt dem Namen des Helden (Ritter, Magier, Barde …); sonst fest nach der Id
export const NAME_CLASS = {
  Ritter: 'krieger', Paladin: 'krieger', Berserker: 'krieger',
  Magier: 'magier', Hexe: 'magier',
  Barde: 'heiler', 'Mönch': 'heiler', 'Königin': 'heiler',
  Schurke: 'waldlaeufer', 'Waldläufer': 'waldlaeufer',
};
export function classFor(id, name = '') {
  const c = NAME_CLASS[String(name).split(' ')[0]];
  return c || classOf(id);
}
export function classOf(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CLASS_IDS[h % CLASS_IDS.length];
}

// Werte
export const HERO_HP = [20, 2.2]; // Grund + je Stärke
export const HERO_ATK = [3, 0.45];
export const BOSS_HP = [30, 4.5]; // × Boss-Stärke
export const BOSS_ATK = [3, 0.28];
export const CRIT_CHANCE = 0.1;
export const CRIT_MULT = 1.6;
export const BIG_EVERY = 3; // alle 3 Runden holt der Boss aus …
export const BIG_MULT = 1.4; // … und trifft alle Helden
export const ENRAGE_AT = 0.3;
export const ENRAGE_MULT = 1.3;
export const DEFEND_MULT = 0.5;
export const DEFEND_HEAL = 0.05;
export const MAX_ROUNDS = 40; // danach zieht der Boss ab (Niederlage)

const r1 = (v) => Math.max(1, Math.round(v));

// Neuer Kampf. heroes: [{ id, name, power }] · boss: { tier, kind, name, power }
// mods: { atkMult (z. B. Gladiatorrausch), guard (Schutzschild: weniger Schaden), crit (Smaragd) }
export function create(heroes, boss, mods = {}) {
  const hs = heroes.filter((h) => h && h.power > 0).map((h) => {
    const cls = h.cls || classFor(h.id, h.name);
    const C = CLASSES[cls];
    const maxHp = r1((HERO_HP[0] + HERO_HP[1] * h.power) * C.hp);
    return { id: h.id, name: h.name, cls, power: h.power, maxHp, hp: maxHp, atk: r1((HERO_ATK[0] + HERO_ATK[1] * h.power) * C.atk * (mods.atkMult || 1)), cd: 0, defending: false };
  });
  const bossMaxHp = r1(BOSS_HP[0] + BOSS_HP[1] * boss.power);
  return {
    round: 1,
    turn: 0, // Index des Helden, der gerade dran ist
    phase: hs.length ? 'player' : 'lost', // player · won · lost
    heroes: hs,
    boss: { tier: boss.tier, kind: boss.kind, name: boss.name, power: boss.power, maxHp: bossMaxHp, hp: bossMaxHp, atk: r1(BOSS_ATK[0] + BOSS_ATK[1] * boss.power), burn: 0, burnDmg: 0, charging: false, enraged: false },
    guard: Math.min(0.5, mods.guard || 0),
    crit: CRIT_CHANCE + (mods.crit || 0),
    log: [{ round: 1, text: `${boss.name} stellt sich euch entgegen!` }],
  };
}

const alive = (b) => b.heroes.filter((h) => h.hp > 0);
export const active = (b) => (b.phase === 'player' ? b.heroes[b.turn] : null);
const say = (b, text, kind = '') => {
  b.log.unshift({ round: b.round, text, kind });
  b.log.length = Math.min(b.log.length, 12);
};

function hitBoss(b, amount, r, crit = b.crit) {
  const isCrit = r() < crit;
  const dmg = r1(amount * (0.9 + r() * 0.2) * (isCrit ? CRIT_MULT : 1));
  b.boss.hp = Math.max(0, b.boss.hp - dmg);
  return { dmg, isCrit };
}
function heal(h, amount) {
  const before = h.hp;
  h.hp = Math.min(h.maxHp, h.hp + r1(amount));
  return h.hp - before;
}

// Aktion des Helden, der gerade dran ist: 'attack' · 'skill' · 'defend'
export function act(b, action, r = Math.random) {
  const h = active(b);
  if (!h) return false;
  const C = CLASSES[h.cls];
  if (action === 'skill' && h.cd > 0) return false;
  if (action === 'attack') {
    const { dmg, isCrit } = hitBoss(b, h.atk, r);
    say(b, `${h.name} greift an: ${dmg} Schaden${isCrit ? ' (kritisch!)' : ''}.`, isCrit ? 'crit' : 'hit');
  } else if (action === 'defend') {
    h.defending = true;
    const got = heal(h, h.maxHp * DEFEND_HEAL);
    say(b, `${h.name} geht in Deckung${got ? ` (+${got} Leben)` : ''}.`, 'def');
  } else if (action === 'skill') {
    h.cd = C.skill.cd;
    if (h.cls === 'krieger') {
      const { dmg, isCrit } = hitBoss(b, h.atk * 2, r);
      say(b, `${h.name}: Kraftschlag! ${dmg} Schaden${isCrit ? ' (kritisch!)' : ''}.`, 'skill');
    } else if (h.cls === 'magier') {
      const { dmg, isCrit } = hitBoss(b, h.atk * 1.5, r);
      b.boss.burn = 2;
      b.boss.burnDmg = Math.max(b.boss.burnDmg, r1(h.atk * 0.4));
      say(b, `${h.name}: Feuerball! ${dmg} Schaden${isCrit ? ' (kritisch!)' : ''}, der Boss brennt.`, 'skill');
    } else if (h.cls === 'heiler') {
      let sum = 0;
      for (const x of b.heroes) sum += x.hp > 0 ? heal(x, x.maxHp * 0.35) : heal(x, x.maxHp * 0.25);
      say(b, `${h.name}: Heilung! Das Team erholt sich um ${sum} Leben.`, 'heal');
    } else {
      let total = 0;
      let crits = 0;
      for (let i = 0; i < 2; i++) {
        const { dmg, isCrit } = hitBoss(b, h.atk * 0.9, r, 0.35 + (b.crit - CRIT_CHANCE));
        total += dmg;
        if (isCrit) crits++;
      }
      say(b, `${h.name}: Doppelschuss! ${total} Schaden${crits ? ` (${crits}× kritisch)` : ''}.`, 'skill');
    }
  } else return false;
  if (b.boss.hp <= 0) return finish(b, true);
  nextHero(b, r);
  return true;
}

function nextHero(b, r) {
  for (let i = b.turn + 1; i < b.heroes.length; i++) {
    if (b.heroes[i].hp > 0) {
      b.turn = i;
      return;
    }
  }
  bossTurn(b, r);
}

function damageHero(b, h, amount, r) {
  const dmg = r1(amount * (0.9 + r() * 0.2) * (h.defending ? DEFEND_MULT : 1) * (1 - b.guard));
  h.hp = Math.max(0, h.hp - dmg);
  return dmg;
}

// Der Boss ist dran (danach beginnt die nächste Runde)
function bossTurn(b, r) {
  const B = b.boss;
  if (B.burn > 0) {
    B.hp = Math.max(0, B.hp - B.burnDmg);
    B.burn--;
    say(b, `${B.name} brennt: ${B.burnDmg} Schaden.`, 'burn');
    if (B.hp <= 0) return finish(b, true);
  }
  if (!B.enraged && B.hp <= B.maxHp * ENRAGE_AT) {
    B.enraged = true;
    B.atk = r1(B.atk * ENRAGE_MULT);
    say(b, `${B.name} wird wütend! Seine Angriffe werden stärker.`, 'warn');
  }
  if (B.charging) {
    B.charging = false;
    const parts = alive(b).map((h) => `${h.name} ${damageHero(b, h, B.atk * BIG_MULT, r)}`);
    say(b, `${B.name} entfesselt seinen Flächenangriff: ${parts.join(', ')}.`, 'big');
  } else if (b.round % BIG_EVERY === 0) {
    B.charging = true;
    say(b, `${B.name} holt zu einem gewaltigen Schlag aus … (nächste Runde trifft er alle – verteidigt euch!)`, 'warn');
  } else {
    const list = alive(b);
    const target = list[Math.floor(r() * list.length)];
    const dmg = damageHero(b, target, B.atk, r);
    say(b, `${B.name} trifft ${target.name}: ${dmg} Schaden${target.hp <= 0 ? ' – gefallen!' : ''}.`, 'boss');
  }
  if (!alive(b).length) return finish(b, false);
  // neue Runde
  b.round++;
  if (b.round > MAX_ROUNDS) {
    say(b, `${B.name} hat genug und zieht ab.`, 'warn');
    return finish(b, false);
  }
  for (const h of b.heroes) {
    h.defending = false;
    if (h.cd > 0) h.cd--;
  }
  b.turn = b.heroes.findIndex((h) => h.hp > 0);
  return true;
}

function finish(b, won) {
  b.phase = won ? 'won' : 'lost';
  say(b, won ? `${b.boss.name} ist besiegt!` : 'Euer Team ist gefallen …', won ? 'win' : 'lose');
  return true;
}

// Vorschlag für den Helden, der dran ist (für „Automatisch“)
export function suggest(b) {
  const h = active(b);
  if (!h) return null;
  const hurt = b.heroes.some((x) => x.hp <= 0 || x.hp < x.maxHp * 0.5);
  if (h.cls === 'heiler' && h.cd === 0 && hurt) return 'skill';
  if (b.boss.charging && h.hp < h.maxHp * 0.7) return 'defend';
  if (h.cd === 0 && h.cls !== 'heiler') return 'skill';
  return 'attack';
}

// Spielt automatisch, bis der Kampf entschieden ist (oder nur die laufende Runde)
export function auto(b, r = Math.random, untilEnd = true) {
  const start = b.round;
  let guard = 0;
  while (b.phase === 'player' && guard++ < 1000 && (untilEnd || b.round === start)) act(b, suggest(b), r);
}

export const over = (b) => b.phase !== 'player';
