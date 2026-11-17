import { ITEMS, RARITIES, getItem, rollTier, rollItem } from './items.js';
import { state } from './state.js';
import * as buildings from './buildings.js';
import { createParty } from './party.js';
import * as buffs from './buffs.js';
import * as magic from './magic.js';
import { render } from './art/core.js';
import { MONSTERS } from './art/living.js';
import { cloth, silk } from './art/materials.js';

// Bossarena: Drei Helden werden ausgerüstet und treten gegen einen Boss an.
// Siege bringen Stoff und Seide, die der Arena-Händler gegen Sammelstücke tauscht.

export const TEAM_SIZE = 3;
export { SLOTS, HERO_POWER, GEAR_POWER, LEVEL_MULT, LEVEL_COST } from './party.js';

// Bosse: Stärke und Preis, um einen Boss dieses Rangs gezielt herauszufordern.
export const BOSS_POWER = [40, 100, 220, 500, 1100, 2400];
export const BOSS_PRICE = [50, 120, 300, 800, 2500, 8000];
// Ein Zufallsboss ist günstig; sein Rang wird mit den Chancen des Brunnens gewürfelt.
export const RANDOM_PRICE = 30;
export const MIN_CHANCE = 0.05;
export const MAX_CHANCE = 0.95;

// Beute je Sieg, im Rang des Bosses.
export const WIN_CLOTH = 3;
export const SILK_CHANCE = 0.35;

// Händler: Preis in Stücken und Chance, dass das Sammelstück einen Rang höher ausfällt.
export const MATERIALS = {
  stoff: { name: 'Stoff', cost: 3, up: 0.25, draw: cloth, seed: 9001 },
  seide: { name: 'Seide', cost: 1, up: 0.7, draw: silk, seed: 9101 },
};

const BOSS_NAMES = ['Schleimkönig', 'Spukfürst', 'Urbestie', 'Erzdämon', 'Allsehendes Auge', 'Knochenkaiser',
  'Nachtschwinge', 'Sporenmutter', 'Tiefenkrake', 'Titanengolem'];

const a = () => state.arena;
const arenaTier = () => buildings.tier('arena');
const MAX_TIER = RARITIES.length - 1;
const clamp = (v) => Math.max(MIN_CHANCE, Math.min(MAX_CHANCE, v));

// ---------------------------------------------------------------- Team

// Helden, Ausrüstung und Stufen: gemeinsame Logik mit dem Dungeon (party.js).
// Wer im Dungeon-Team steckt, kann nicht in der Arena kämpfen und umgekehrt.
export const party = createParty({
  name: 'arena',
  members: () => state.arena.team,
  tier: () => buildings.tier('arena'),
  other: () => state.dungeon.team,
  bonus: 'arenaPower',
});
export const {
  team, clean, equip, equippedAt, candidates, autoEquip, memberPower, teamPower,
  levelOf, capped, heroPower, gearPower, powerOf, material, levelCost, levelUp, usedElsewhere,
} = party;

// ---------------------------------------------------------------- Bosse

const bossCache = new Map();
export function bossInfo(boss = a().boss) {
  if (!boss) return null;
  const key = `${boss.kind}-${boss.tier}`;
  if (!bossCache.has(key)) bossCache.set(key, render(MONSTERS[boss.kind].d, 77000 + boss.kind * 13 + boss.tier, boss.tier));
  return { ...boss, name: BOSS_NAMES[boss.kind], rank: RARITIES[boss.tier].id, power: BOSS_POWER[boss.tier], image: bossCache.get(key) };
}

const summon = (tier) => {
  a().boss = { tier, kind: Math.floor(Math.random() * BOSS_NAMES.length) };
  state.changed();
  return true;
};

// Glücksweg: günstiger Zufallsboss mit den Rang-Chancen des Brunnens.
export const challengeRandom = () => !a().boss && state.spend(RANDOM_PRICE, 'arena') && summon(rollTier());

// Einfacher Weg: Boss eines bestimmten Rangs kaufen (bis zum Rang der Arena).
export const canChallenge = (tier) => tier <= arenaTier();
export const challenge = (tier) => !a().boss && canChallenge(tier) && state.spend(BOSS_PRICE[tier], 'arena') && summon(tier);

export const winChance = (boss = a().boss) => (boss && teamPower() ? buffs.gladiator(clamp(teamPower() / BOSS_POWER[boss.tier])) : 0);

export function fight() {
  const boss = bossInfo();
  if (!boss || !teamPower()) return null;
  // Schutzschild aus dem Zauberbuch wird beim Kampf verbraucht
  const shield = magic.useShield();
  const odds = shield ? magic.shielded(winChance(), shield) : winChance();
  const result = { boss, odds, win: Math.random() < odds, stoff: 0, seide: 0 };
  if (result.win) {
    result.stoff = WIN_CLOTH;
    result.seide = Math.random() < SILK_CHANCE ? 1 : 0;
    a().mats.stoff[boss.tier] += result.stoff;
    a().mats.seide[boss.tier] += result.seide;
    a().wins++;
  }
  a().boss = null;
  state.changed();
  return result;
}

// ---------------------------------------------------------------- Händler

export const have = (kind, tier) => a().mats[kind][tier];
export const upTier = (tier) => Math.min(tier + 1, MAX_TIER);
// Chance auf den höheren Rang beim Händler (Glücksrausch: +10 %)
export const upChance = (kind) => Math.min(1, MATERIALS[kind].up * (buffs.lucky() ? buffs.LUCK_FACTOR : 1));

const matCache = new Map();
export function materialImage(kind, tier) {
  const key = `${kind}-${tier}`;
  if (!matCache.has(key)) matCache.set(key, render(MATERIALS[kind].draw, MATERIALS[kind].seed + tier, tier));
  return matCache.get(key);
}

// Tauscht Material gegen ein Sammelstück: meist im Rang des Materials, mit Glück einen Rang höher.
export function trade(kind, tier) {
  const m = MATERIALS[kind];
  if (have(kind, tier) < m.cost) return null;
  a().mats[kind][tier] -= m.cost;
  const item = rollItem({ tier: Math.random() < upChance(kind) ? upTier(tier) : tier });
  const isNew = !state.count(item.id);
  state.addItems([item], 'arena-haendler');
  return { item, isNew };
}
