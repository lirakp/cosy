import { ITEMS, RARITIES } from './items.js';
import { state } from './state.js';
import * as buildings from './buildings.js';
import * as garden from './garden.js';
import * as expedition from './expedition.js';
import * as mine from './mine.js';

// Magie: Der Magierturm sammelt Mana (nachts doppelt so schnell). Zauber lernt
// man aus Schriftrollen, die man besitzt, und wirkt sie mit Mana. Jeder Zauber
// hat eine Abklingzeit, damit er etwas Besonderes bleibt.

// je Turm-Rang (D … SS)
export const MAX_MANA = [30, 45, 60, 80, 100, 130];
export const REGEN = [1, 1.3, 1.6, 2, 2.5, 3]; // Mana pro Minute (nachts doppelt)
export const NIGHT_FACTOR = 2;
export const SHIELD_BONUS = 0.15;

// rank: nötiger Turm-Rang und Rang der Schriftrolle
export const SPELLS = [
  { id: 'wachstum', name: 'Wachstum', rank: 0, cost: 20, cooldown: 10, text: 'Alle bepflanzten Beete sind sofort reif.' },
  { id: 'sternenregen', name: 'Sternenregen', rank: 0, cost: 15, cooldown: 5, text: 'Eine Minute lang regnet es Münzen auf den Weg.' },
  { id: 'lockruf', name: 'Lockruf', rank: 1, cost: 20, cooldown: 10, text: 'Der nächste Fisch beißt sofort und ist mindestens einen Rang höher.' },
  { id: 'glueck', name: 'Glückszauber', rank: 2, cost: 30, cooldown: 15, text: 'Der nächste Wunsch am Brunnen bringt mindestens Rang C.' },
  { id: 'zeitsprung', name: 'Zeitsprung', rank: 3, cost: 45, cooldown: 30, text: 'Expedition und Mine bekommen sofort 30 Minuten Ertrag dazu.' },
  { id: 'schild', name: 'Schutzschild', rank: 4, cost: 50, cooldown: 30, text: 'Die nächste Dungeon-Erkundung oder der nächste Bosskampf: +15 Prozentpunkte Erfolg.' },
];
export const spell = (id) => SPELLS.find((s) => s.id === id);

const m = () => state.magic;
const tier = () => buildings.tier('tower');
export const owned = () => tier() >= 0;
export const maxMana = () => (owned() ? MAX_MANA[tier()] : 0);
export const regen = (night = false) => (owned() ? REGEN[tier()] * (night ? NIGHT_FACTOR : 1) : 0);
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
  const rate = minutes > 0.1 ? REGEN[tier()] : regen(night);
  x.mana = Math.min(maxMana(), x.mana + rate * minutes);
}

// ---------------------------------------------------------------- Lernen

// Schriftrollen sind Relikte; eine eigene Schriftrolle ab dem Rang des Zaubers reicht.
const SCROLLS = ITEMS.filter((i) => i.kind === 'Schriftrolle');
export const hasScroll = (rank) => SCROLLS.some((s) => s.tier >= rank && state.count(s.id));
export const learned = (id) => m().learned.includes(id);

// Warum ein Zauber noch nicht gelernt werden kann (oder null)
export function learnBlocker(sp) {
  if (!owned()) return 'Erst den Magierturm bauen.';
  if (tier() < sp.rank) return `Turm-Rang ${RARITIES[sp.rank].id} nötig.`;
  if (!hasScroll(sp.rank)) return `Eine Schriftrolle ab Rang ${RARITIES[sp.rank].id} nötig (Relikte).`;
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

export function castBlocker(sp, now = Date.now()) {
  if (!learned(sp.id)) return 'Noch nicht gelernt.';
  if (cooldownLeft(sp.id, now)) return 'Lädt sich noch auf.';
  if (m().mana < sp.cost) return 'Nicht genug Mana.';
  if (sp.id === 'wachstum' && !garden.beds().some((b) => b)) return 'Kein Beet ist bepflanzt.';
  if (sp.id === 'lockruf' && m().lure) return 'Der Lockruf wirkt schon.';
  if (sp.id === 'glueck' && m().luckyPull) return 'Der Glückszauber wirkt schon.';
  if (sp.id === 'schild' && m().shield) return 'Der Schild wirkt schon.';
  return null;
}

// Wirkt einen Zauber. Liefert eine kurze Beschreibung des Ergebnisses oder null.
// onRain: Rückruf für den Münzregen (Darstellung in der Welt)
export function cast(id, { onRain } = {}, now = Date.now()) {
  const sp = spell(id);
  if (!sp || castBlocker(sp, now)) return null;
  m().mana -= sp.cost;
  m().cd[id] = now + sp.cooldown * 60000;
  let note = sp.text;
  if (id === 'wachstum') {
    let n = 0;
    for (const b of garden.beds()) {
      if (!b) continue;
      b.planted = Math.min(b.planted, now - garden.crop(b.crop).minutes * 60000);
      n++;
    }
    note = `${n} Beet${n > 1 ? 'e sind' : ' ist'} sofort reif.`;
  }
  if (id === 'sternenregen') onRain?.(60);
  if (id === 'lockruf') m().lure = true;
  if (id === 'glueck') m().luckyPull = true;
  if (id === 'schild') m().shield = true;
  if (id === 'zeitsprung') {
    const before = expedition.live.gold;
    if (state.exp.last) state.exp.last -= 30 * 60000;
    expedition.tick(now);
    if (state.mine.last) state.mine.last -= 30 * 60000;
    const ore = mine.tick(now).reduce((a, b) => a + b, 0);
    note = `Truhe +${Math.max(0, expedition.live.gold - before)} Gold, Mine +${ore} Erz.`;
  }
  state.changed();
  return note;
}

// Einmalige Wirkungen, die beim nächsten Anlass verbraucht werden
function consume(key) {
  if (!m()[key]) return false;
  m()[key] = false;
  state.changed();
  return true;
}
export const useLure = () => consume('lure');
export const useLuckyPull = () => consume('luckyPull');
export const useShield = () => consume('shield');
export const shieldReady = () => !!m().shield;
export const lureReady = () => !!m().lure;
export const luckyReady = () => !!m().luckyPull;
// Schild auf eine Erfolgschance anrechnen
export const shielded = (chance) => Math.min(0.99, chance + SHIELD_BONUS);
