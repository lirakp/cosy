import { RARITIES, getItem } from './items.js';
import { state } from './state.js';
import * as buildings from './buildings.js';
import * as mine from './mine.js';

// Schmiede: gezielt ein eigenes Sammelstück kopieren – für Gold, Erz und Glut.
//
// Balance:
// - Gold kostet immer das Vierfache des Verkaufswerts, Kopieren und Verkaufen
//   lohnt sich also nie.
// - Dazu Erz im Rang des Stücks: die Schmiede hängt an der Mine.
// - Kopiert werden nur Stücke bis zum Rang der Schmiede.
// - Jede Kopie verbraucht Schmiedeglut, die sich nur langsam auflädt. Das
//   begrenzt, wie schnell Gold in Verbesserungs-Material umgewandelt wird.

export const GOLD_FACTOR = 4;
export const ORE_COST = [5, 6, 8, 10, 14, 20];
export const GLUT_COST = [1, 1, 2, 2, 3, 4];
// je Schmiede-Rang (D … SS): Glut-Vorrat und Minuten pro Glutpunkt
export const GLUT_MAX = [3, 4, 5, 6, 7, 8];
export const GLUT_MINUTES = [30, 26, 22, 18, 14, 10];

const f = () => state.forge;
const tier = () => buildings.tier('forge');

export const maxGlut = () => (tier() >= 0 ? GLUT_MAX[tier()] : 0);
export const glutMinutes = () => (tier() >= 0 ? GLUT_MINUTES[tier()] : GLUT_MINUTES[0]);

// lädt die Glut nach der vergangenen Zeit auf
export function tick(now = Date.now()) {
  const x = f();
  if (tier() < 0) {
    x.last = now;
    return;
  }
  const step = glutMinutes() * 60000;
  if (!x.last) x.last = now;
  if (x.glut >= maxGlut()) {
    x.glut = maxGlut();
    x.last = now;
    return;
  }
  const gained = Math.floor((now - x.last) / step);
  if (gained > 0) {
    x.glut = Math.min(maxGlut(), x.glut + gained);
    x.last = x.glut >= maxGlut() ? now : x.last + gained * step;
  }
}

export const glut = () => f().glut;
// Sekunden bis zum nächsten Glutpunkt (0, wenn voll)
export function nextGlutIn(now = Date.now()) {
  if (tier() < 0 || f().glut >= maxGlut()) return 0;
  return Math.max(0, Math.ceil((f().last + glutMinutes() * 60000 - now) / 1000));
}

export const canForgeRank = (itemTier) => itemTier <= tier();

export function cost(item) {
  return { gold: item.sell * GOLD_FACTOR, ore: ORE_COST[item.tier], glut: GLUT_COST[item.tier] };
}

// Warum gerade nicht geschmiedet werden kann (oder null)
export function blocker(item) {
  if (!item || !state.count(item.id)) return 'Nur Stücke, die du besitzt, lassen sich kopieren.';
  if (!canForgeRank(item.tier)) return `Schmiede auf Rang ${item.rank} ausbauen.`;
  const c = cost(item);
  tick();
  if (f().glut < c.glut) return 'Nicht genug Glut – sie lädt sich langsam wieder auf.';
  if (state.gold < c.gold) return 'Nicht genug Gold.';
  if (mine.ore(item.tier) < c.ore) return `Nicht genug ${mine.LEVELS[item.tier].ore}.`;
  return null;
}

export function forge(id) {
  const item = getItem(id);
  if (blocker(item)) return null;
  const c = cost(item);
  const wasFull = f().glut >= maxGlut();
  if (!mine.spendOre(item.tier, c.ore)) return null;
  state.spend(c.gold);
  f().glut -= c.glut;
  if (wasFull) f().last = Date.now(); // Aufladen beginnt erst jetzt
  f().made++;
  state.addItems([item]);
  return { item, isNew: false };
}

export const rankName = (t) => RARITIES[t].id;
