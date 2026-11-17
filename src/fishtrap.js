import { RARITIES } from './items.js';
import { state } from './state.js';
import * as village from './village.js';

// Fischreuse: fängt laufend Fische (auch offline), bis sie voll ist.
// Langsamer als selbst angeln und ohne Flaschenpost.

export const BUY = 400;
export const UPGRADES = [1200, 3500, 9000, 22000]; // auf Stufe C, B, A, S
export const MINUTES = [8, 6, 4.5, 3.5, 2.5]; // Minuten pro Fang je Stufe
export const CAPACITY = [8, 12, 18, 25, 35];
const PHASES = ['Morgen', 'Tag', 'Abend', 'Nacht'];

const t = () => state.village.trap;
export const level = () => t().level;
export const built = () => t().level >= 0;
export const stored = () => Object.values(t().stored).reduce((a, b) => a + b, 0);
export const capacity = () => (built() ? CAPACITY[t().level] : 0);
export const minutes = () => (built() ? MINUTES[t().level] : MINUTES[0]);
export const full = () => built() && stored() >= capacity();
export const rank = () => RARITIES[t().level]?.id;
export const nextCost = () => (!built() ? BUY : t().level < UPGRADES.length ? UPGRADES[t().level] : null);

export function upgrade() {
  const cost = nextCost();
  if (cost === null || !state.spend(cost, 'anlagen')) return false;
  tick();
  t().level++;
  if (t().level === 0) t().last = Date.now();
  state.changed();
  return true;
}

// Fängt nach der vergangenen Zeit. Offline beißen Arten aller Tageszeiten.
export function tick(now = Date.now(), r = Math.random) {
  const x = t();
  if (!built()) return 0;
  const elapsed = x.last ? Math.max(0, (now - x.last) / 60000) : 0;
  x.last = now;
  x.frac += elapsed / minutes();
  let n = Math.floor(x.frac);
  x.frac -= n;
  n = Math.min(n, capacity() - stored());
  if (n <= 0) {
    if (full()) x.frac = 0;
    return 0;
  }
  for (let i = 0; i < n; i++) {
    let res;
    const phase = elapsed > 3 ? PHASES[Math.floor(r() * 4)] : undefined;
    do res = village.rollCatch(r, phase); while (res.treasure);
    x.stored[res.species] = (x.stored[res.species] || 0) + 1;
  }
  state.changed();
  return n;
}

// Leert die Reuse in den Fisch-Vorrat; zählt fürs Angelbuch.
export function collect() {
  tick();
  const got = [];
  for (const [species, n] of Object.entries(t().stored)) {
    for (let i = 0; i < n; i++) {
      const fish = village.fishSpec(species);
      got.push(village.applyCatch({ species, tier: fish.tier, fish }));
    }
  }
  t().stored = {};
  state.changed();
  return got;
}
