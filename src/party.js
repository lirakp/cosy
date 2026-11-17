import { RARITIES, getItem, worldPool } from './items.js';
import { state } from './state.js';
import { dupValue, payWithDuplicates } from './dupes.js';
import * as sets from './sets.js';
import { CAPE_POWER } from './tailor.js';
import * as companions from './companions.js';

// Gemeinsame Team-Logik für Bossarena und Dungeon: Helden mit vier
// Ausrüstungsplätzen, Stufen D … SS und die Regel, dass ein Held oder ein
// Ausrüstungsstück nur in einem der beiden Teams stecken kann.

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
// Stufen gelten für Helden und Ausrüstung gleichermaßen
export const LEVEL_MULT = [1, 1.3, 1.7, 2.2, 3, 4];
export const LEVEL_COST = [30, 80, 200, 600, 2000];

// Helden und Ausrüstung der aktuellen Welt
const gearPool = () => worldPool('gear', (item) => SLOTS.some((s) => s.cat === item.cat));
const heroPool = () => worldPool('helden', (item) => item.cat === 'helden');
const monsterPool = () => worldPool('monster', (item) => item.cat === 'monster');
// Kämpfer: Helden (mit Ausrüstung) – im Bossrush auch Monster (ohne Ausrüstung)
export const isFighter = (item) => item?.cat === 'helden' || item?.cat === 'monster';

export const emptyMember = () => ({ hero: null, gear: { waffen: null, ruestung: null, relikte: null, artefakte: null }, cape: null });

// Umhänge (aus der Schneiderei) liegen als Anzahl je Rang vor; beide Teams teilen sich den Vorrat.
const capesOwned = (tier) => state.tailor.capes[tier] || 0;
const capesWorn = (list, tier) => list.filter((m) => m.hero && m.cape === tier).length;

// Ein Stück hat überall dieselbe Stufe; wie weit sie zählt, begrenzt die jeweilige Anlage.
const levels = () => state.arena.lvl;
const rawLevel = (id) => levels()[id] || 0;

const uses = (members, id) => members.some((m) => m.hero === id || SLOTS.some((s) => m.gear[s.cat] === id));

// members: Team-Liste · tier: Rang der Anlage · other: Team der anderen Anlage
// locked: Team darf gerade nicht geändert werden · bonus: Set-Bonus auf die Stärke
export function createParty({ name, members, tier, other, locked = () => false, bonus, monsters = false }) {
  const levelOf = (id) => Math.max(0, Math.min(rawLevel(id), tier()));
  const capped = (level) => level < MAX_TIER && level >= tier();
  const heroPower = (item, level = levelOf(item.id)) => Math.round(HERO_POWER[item.tier] * LEVEL_MULT[level]);
  const gearPower = (item, level = levelOf(item.id)) => Math.round(GEAR_POWER[item.tier] * LEVEL_MULT[level]);
  const powerOf = (item, level) => (isFighter(item) ? heroPower(item, level) : gearPower(item, level));
  const pool = (item) => (item?.cat === 'helden' ? heroPool() : item?.cat === 'monster' ? monsterPool() : gearPool());
  const fighters = () => (monsters ? [...heroPool(), ...monsterPool()] : heroPool());
  const fits = (item, key) => (key === 'hero' ? item.cat === 'helden' || (monsters && item.cat === 'monster') : item.cat === key);
  // Ausrüstung tragen nur Helden
  const wearsGear = (m) => getItem(m.hero)?.cat === 'helden';
  const material = (item) => dupValue(pool(item));
  const levelCost = (item) => (rawLevel(item.id) < MAX_TIER && rawLevel(item.id) < tier() ? LEVEL_COST[rawLevel(item.id)] : null);

  function levelUp(item) {
    const cost = levelCost(item);
    if (cost === null || !state.count(item.id) || !payWithDuplicates(pool(item), cost)) return false;
    levels()[item.id] = rawLevel(item.id) + 1;
    state.changed();
    return true;
  }

  const team = () => members();
  const usedElsewhere = (id) => uses(other(), id);

  // Entfernt Stücke, die man nicht mehr besitzt
  function clean() {
    for (const m of members()) {
      if (m.hero && !state.count(m.hero)) m.hero = null;
      for (const s of SLOTS) if (m.gear[s.cat] && !state.count(m.gear[s.cat])) m.gear[s.cat] = null;
    }
  }

  function remove(id) {
    for (const m of members()) {
      if (m.hero === id) m.hero = null;
      for (const s of SLOTS) if (m.gear[s.cat] === id) m.gear[s.cat] = null;
    }
  }

  // key: 'hero' oder eine Ausrüstungs-Kategorie. Liefert true bei Erfolg.
  function equip(index, key, id) {
    const m = members()[index];
    const item = id && getItem(id);
    if (!m || locked()) return false;
    if (id && (!item || !state.count(id) || !fits(item, key) || usedElsewhere(id))) return false;
    if (key !== 'hero' && id && !wearsGear(m)) return false;
    if (id) remove(id);
    if (key === 'hero') m.hero = id || null;
    else m.gear[key] = id || null;
    // ein Monster legt Ausrüstung und Umhang ab
    if (key === 'hero' && !wearsGear(m)) {
      for (const s of SLOTS) m.gear[s.cat] = null;
      m.cape = null;
    }
    state.changed();
    return true;
  }

  const equippedAt = (id) => members().findIndex((m) => m.hero === id || SLOTS.some((s) => m.gear[s.cat] === id));

  // Eigene Stücke einer Art, die stärksten zuerst. all: auch die im anderen Team.
  const candidates = (key, all = false) =>
    (key === 'hero' ? fighters() : gearPool().filter((i) => i.cat === key))
      .filter((i) => state.count(i.id) && (all || !usedElsewhere(i.id)))
      .sort((x, y) => powerOf(y) - powerOf(x) || y.tier - x.tier);

  // Stellt die stärksten freien Helden auf und verteilt die beste freie Ausrüstung.
  function autoEquip() {
    if (locked()) return false;
    const heroes = candidates('hero');
    members().forEach((m, i) => {
      m.hero = heroes[i]?.id || null;
      for (const s of SLOTS) m.gear[s.cat] = null;
    });
    for (const s of SLOTS) {
      const gear = candidates(s.cat);
      members().filter((m) => wearsGear(m)).forEach((m, i) => (m.gear[s.cat] = gear[i]?.id || null));
    }
    // beste freie Umhänge verteilen
    members().forEach((m) => (m.cape = null));
    for (const m of members().filter((x) => wearsGear(x))) {
      for (let t = CAPE_POWER.length - 1; t >= 0; t--) {
        if (capesFree(t) > 0) {
          m.cape = t;
          break;
        }
      }
    }
    state.changed();
    return true;
  }

  function memberPower(m) {
    if (!m.hero || !getItem(m.hero)) return 0;
    if (!wearsGear(m)) return heroPower(getItem(m.hero));
    return heroPower(getItem(m.hero)) + SLOTS.reduce((sum, s) => sum + (m.gear[s.cat] ? gearPower(getItem(m.gear[s.cat])) : 0), 0) + (m.cape != null ? CAPE_POWER[m.cape] : 0);
  }

  // freie Umhänge eines Rangs (für Platz index: der eigene zählt als frei)
  const capesFree = (tier, index = -1) =>
    capesOwned(tier) - capesWorn(other(), tier) - capesWorn(members(), tier) + (members()[index]?.cape === tier && members()[index]?.hero ? 1 : 0);
  function equipCape(index, tier) {
    const m = members()[index];
    if (!m || locked() || (tier != null && (!m.hero || capesFree(tier, index) <= 0))) return false;
    m.cape = tier;
    state.changed();
    return true;
  }
  const teamPower = () => Math.round(members().reduce((sum, m) => sum + memberPower(m), 0) * (1 + sets.bonus(bonus)) * (1 + companions.bonus('power')));
  const heroIds = () => members().map((m) => m.hero).filter(Boolean);

  return {
    name, monsters, wearsGear, team, clean, equip, equipCape, capesFree, equippedAt, candidates, autoEquip, memberPower, teamPower, heroIds,
    levelOf, capped, heroPower, gearPower, powerOf, material, levelCost, levelUp, usedElsewhere, locked,
  };
}
