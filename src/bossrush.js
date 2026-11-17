import { RARITIES, rollTier } from './items.js';
import { state } from './state.js';
import * as buildings from './buildings.js';
import * as buffs from './buffs.js';
import { createParty } from './party.js';
import { BOSS_POWER, BOSS_NAMES, bossInfo, MIN_CHANCE, MAX_CHANCE, WIN_CLOTH, SILK_CHANCE } from './arena.js';
import * as realm from './realm.js';

// Bossrush: Bis zu 10 Helden (mit Ausrüstung) und Monster kämpfen nacheinander
// gegen Bosse mit zufälligem Rang – alle FIGHT_SECONDS einer (5 s), auch offline –
// bis sie verlieren. Die Beute (Gold, Stoff, Seide) sammelt sich und kommt bei
// der Heimkehr in den Vorrat. Nach einer Niederlage kann man die Gruppe gegen
// Gold wiederbeleben; der Preis steigt mit jedem besiegten Boss (höchstens 15.000).

export const TEAM_SIZE = 10;
export const FIGHT_SECONDS = 5;
export const MAX_FIGHTS_PER_TICK = 15000; // höchstens so viele Kämpfe auf einmal (z. B. nach langer Abwesenheit)
// Bosse werden mit jedem Sieg ein wenig zäher
export const GROWTH = 0.06;
// Gold je besiegtem Boss nach Rang (D … SS)
export const BOSS_GOLD = [40, 90, 200, 450, 1100, 3000];
// Wiederbeleben: Grundpreis + je besiegtem Boss, gedeckelt
export const REVIVE_BASE = 300;
export const REVIVE_STEP = 150;
export const REVIVE_MAX = 15000;

const r = () => state.bossrush;
const emptyMember = () => ({ hero: null, gear: { waffen: null, ruestung: null, relikte: null, artefakte: null }, cape: null });
export const freshRush = () => ({ team: Array.from({ length: TEAM_SIZE }, emptyMember), run: null, best: 0 });

// Team: Helden und Monster; wer in Arena oder Dungeon steckt, ist hier nicht frei (und umgekehrt).
export const party = createParty({
  name: 'bossrush',
  members: () => r().team,
  tier: () => Math.max(buildings.tier('arena'), 0),
  other: () => [...state.arena.team, ...state.dungeon.team],
  locked: () => !!r().run,
  bonus: 'arenaPower',
  monsters: true,
});

// Ultimativer Bossrush: nur Bosse von Rang A bis SS – dafür sind sie schwächer
// angesetzt und werden langsamer zäher (bessere Siegchancen), die Beute ist größer.
export const MODES = {
  normal: { name: 'Bossrush', minTier: 0, powerMult: 1, growth: GROWTH, goldMult: 1, silkBonus: 0 },
  ultimate: { name: 'Ultimativer Bossrush', minTier: 3, powerMult: 0.5, growth: 0.035, goldMult: 1.5, silkBonus: 0.15 },
};
export const mode = (id) => MODES[id] || MODES.normal;

export const run = () => r().run;
export const best = (m = 'normal') => (m === 'ultimate' ? r().bestUltimate || 0 : r().best || 0);
export const reviveCost = (bosses = run()?.bosses || 0) => Math.min(REVIVE_MAX, REVIVE_BASE + REVIVE_STEP * bosses);

// Stärke des nächsten Bosses: Grundwert seines Rangs, wächst mit jedem Sieg
export const bossPower = (tier, bosses, m = 'normal') => Math.round(BOSS_POWER[tier] * mode(m).powerMult * (1 + mode(m).growth * bosses));
export const winChance = (power, boss) => buffs.gladiator(Math.max(MIN_CHANCE, Math.min(MAX_CHANCE, power / boss + party.gemSum('smaragd'))));

function newBoss(rand, m = 'normal') {
  return { tier: rollTier(mode(m).minTier, rand), kind: Math.floor(rand() * BOSS_NAMES.length) };
}
export const bossOf = (b) => (b ? { ...bossInfo(b), power: bossPower(b.tier, run()?.bosses || 0, run()?.mode) } : null);

export function start(now = Date.now(), rand = Math.random, m = 'normal') {
  if (typeof now === 'string') [m, now] = [now, Date.now()];
  if (run() || !party.heroIds().length || !buildings.owned('arena')) return false;
  r().run = {
    mode: MODES[m] ? m : 'normal',
    power: party.teamPower(), // die Stärke beim Aufbruch zählt
    bosses: 0,
    revives: 0,
    status: 'fighting',
    next: now + FIGHT_SECONDS * 1000,
    boss: newBoss(rand, m),
    loot: { gold: 0, stoff: [0, 0, 0, 0, 0, 0], seide: [0, 0, 0, 0, 0, 0] },
    log: [],
  };
  state.changed();
  return true;
}

// Rechnet alle fälligen Kämpfe ab. Liefert die Zahl der Kämpfe.
export function tick(now = Date.now(), rand = Math.random) {
  const x = run();
  if (!x || x.status !== 'fighting') return 0;
  let fights = 0;
  while (x.status === 'fighting' && now >= x.next && fights < MAX_FIGHTS_PER_TICK) {
    const boss = x.boss;
    const M = mode(x.mode);
    const power = bossPower(boss.tier, x.bosses, x.mode);
    const odds = winChance(x.power, power);
    const win = rand() < odds;
    x.log.unshift({ tier: boss.tier, kind: boss.kind, win, odds });
    x.log.length = Math.min(x.log.length, 8);
    if (win) {
      x.bosses++;
      x.loot.gold += Math.round(BOSS_GOLD[boss.tier] * M.goldMult * realm.goldFactor() * (1 + party.gemSum('saphir')));
      x.loot.stoff[boss.tier] += WIN_CLOTH;
      if (rand() < SILK_CHANCE + M.silkBonus + party.gemSum('topas')) x.loot.seide[boss.tier] += 1;
      x.boss = newBoss(rand, x.mode);
      x.next += FIGHT_SECONDS * 1000;
    } else {
      x.status = 'down';
    }
    fights++;
  }
  if (fights >= MAX_FIGHTS_PER_TICK) x.next = now + FIGHT_SECONDS * 1000;
  if (x.mode === 'ultimate') r().bestUltimate = Math.max(r().bestUltimate || 0, x.bosses);
  else r().best = Math.max(r().best || 0, x.bosses);
  if (fights) state.changed();
  return fights;
}

export const remaining = (now = Date.now()) => (run()?.status === 'fighting' ? Math.max(0, Math.ceil((run().next - now) / 1000)) : 0);

// Wiederbeleben: weiter gegen denselben Boss
export function revive(now = Date.now()) {
  const x = run();
  if (!x || x.status !== 'down' || !state.spend(reviveCost(), 'bossrush')) return false;
  x.status = 'fighting';
  x.revives++;
  x.next = now + FIGHT_SECONDS * 1000;
  state.changed();
  return true;
}

// Heimkehren: Beute in den Vorrat (auch mitten im Rush möglich)
export function collect() {
  const x = run();
  if (!x) return null;
  tick();
  const loot = x.loot;
  state.addGold(loot.gold, 'bossrush');
  for (let t = 0; t < RARITIES.length; t++) {
    state.arena.mats.stoff[t] += loot.stoff[t];
    state.arena.mats.seide[t] += loot.seide[t];
  }
  r().run = null;
  state.changed();
  return { bosses: x.bosses, revives: x.revives, ...loot };
}
