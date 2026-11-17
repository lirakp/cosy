import { ITEMS, RARITIES, getItem, rollTier, rollItem } from './items.js';
import { state } from './state.js';
import * as buildings from './buildings.js';
import { dupValue, payWithDuplicates } from './dupes.js';
import * as buffs from './buffs.js';
import * as sets from './sets.js';
import { render } from './art/core.js';
import { MONSTERS } from './art/living.js';
import { cloth, silk } from './art/materials.js';

// Bossarena: Drei Helden werden ausgerüstet und treten gegen einen Boss an.
// Siege bringen Stoff und Seide, die der Arena-Händler gegen Sammelstücke tauscht.

export const TEAM_SIZE = 3;
export const SLOTS = [
  { cat: 'waffen', name: 'Waffe' },
  { cat: 'ruestung', name: 'Rüstung' },
  { cat: 'relikte', name: 'Relikt' },
  { cat: 'artefakte', name: 'Artefakt' },
];
const MAX_TIER = RARITIES.length - 1;

// Stärke nach Rang (D … SS)
export const HERO_POWER = [10, 20, 40, 70, 120, 200];
export const GEAR_POWER = [4, 7, 12, 20, 35, 60];
// Ausrüstung beginnt auf Stufe D und wird mit Ausrüstungs-Duplikaten verbessert.
export const LEVEL_MULT = [1, 1.3, 1.7, 2.2, 3, 4];
export const LEVEL_COST = [30, 80, 200, 600, 2000];

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

const GEAR = ITEMS.filter((item) => SLOTS.some((s) => s.cat === item.cat));
const a = () => state.arena;
const arenaTier = () => buildings.tier('arena');
const clamp = (v) => Math.max(MIN_CHANCE, Math.min(MAX_CHANCE, v));

// ---------------------------------------------------------------- Ausrüstung

const rawLevel = (id) => a().lvl[id] || 0;
// Der Rang der Arena begrenzt, wie weit Ausrüstung verbessert werden kann.
export const levelOf = (id) => Math.max(0, Math.min(rawLevel(id), arenaTier()));
export const capped = (level) => level < MAX_TIER && level >= arenaTier();
export const gearPower = (item, level = levelOf(item.id)) => Math.round(GEAR_POWER[item.tier] * LEVEL_MULT[level]);
export const material = () => dupValue(GEAR);
export const levelCost = (item) => (rawLevel(item.id) < MAX_TIER && rawLevel(item.id) < arenaTier() ? LEVEL_COST[rawLevel(item.id)] : null);

export function levelUp(item) {
  const cost = levelCost(item);
  if (cost === null || !state.count(item.id) || !payWithDuplicates(GEAR, cost)) return false;
  a().lvl[item.id] = rawLevel(item.id) + 1;
  state.changed();
  return true;
}

// ---------------------------------------------------------------- Team

export const team = () => a().team;

// Entfernt Stücke, die es (nach altem Spielstand) nicht mehr gibt.
export function clean() {
  for (const m of a().team) {
    if (m.hero && !state.count(m.hero)) m.hero = null;
    for (const s of SLOTS) if (m.gear[s.cat] && !state.count(m.gear[s.cat])) m.gear[s.cat] = null;
  }
}

function remove(id) {
  for (const m of a().team) {
    if (m.hero === id) m.hero = null;
    for (const s of SLOTS) if (m.gear[s.cat] === id) m.gear[s.cat] = null;
  }
}

// key: 'hero' oder eine Ausrüstungs-Kategorie. Jedes Stück kann nur einmal getragen werden.
export function equip(index, key, id) {
  const m = a().team[index];
  const item = id && getItem(id);
  if (!m || (id && (!item || !state.count(id) || item.cat !== (key === 'hero' ? 'helden' : key)))) return;
  if (id) remove(id);
  if (key === 'hero') m.hero = id || null;
  else m.gear[key] = id || null;
  state.changed();
}

export const equippedAt = (id) => a().team.findIndex((m) => m.hero === id || SLOTS.some((s) => m.gear[s.cat] === id));

export const candidates = (key) =>
  key === 'hero'
    ? ITEMS.filter((i) => i.cat === 'helden' && state.count(i.id)).sort((x, y) => y.tier - x.tier)
    : GEAR.filter((i) => i.cat === key && state.count(i.id)).sort((x, y) => gearPower(y) - gearPower(x));

// Stellt die stärksten Helden auf und verteilt die beste Ausrüstung der Reihe nach.
export function autoEquip() {
  const heroes = candidates('hero');
  a().team.forEach((m, i) => {
    m.hero = heroes[i]?.id || null;
    for (const s of SLOTS) m.gear[s.cat] = null;
  });
  for (const s of SLOTS) {
    const gear = candidates(s.cat);
    a().team.filter((m) => m.hero).forEach((m, i) => (m.gear[s.cat] = gear[i]?.id || null));
  }
  state.changed();
}

export function memberPower(m) {
  if (!m.hero || !getItem(m.hero)) return 0;
  return HERO_POWER[getItem(m.hero).tier] + SLOTS.reduce((sum, s) => sum + (m.gear[s.cat] ? gearPower(getItem(m.gear[s.cat])) : 0), 0);
}
export const teamPower = () => Math.round(a().team.reduce((sum, m) => sum + memberPower(m), 0) * (1 + sets.bonus('arenaPower')));

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
  const odds = winChance();
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
