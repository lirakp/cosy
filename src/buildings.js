import { RARITIES } from './items.js';
import { state } from './state.js';
import * as realm from './realm.js';
import * as companions from './companions.js';

// Zusatzanlagen: Sie müssen erst gebaut werden und starten auf Rang D.
// Jeder Ausbau schaltet den nächsten Rang frei (C, B, A, S, SS).
// Die Preise steigen gleichmäßig (etwa ×2–2,5 je Rang), damit es ohne große Sprünge vorangeht.

export const BUILDINGS = {
  camp: {
    name: 'Expeditionslager',
    buy: 250,
    upgrades: [600, 1800, 4800, 11000, 27500],
    pitch: 'Deine vier stärksten Lebewesen sammeln hier laufend Gold und finden ab und zu ein Sammelstück.',
    unlocks: 'Lebewesen und Expeditionsleitung lassen sich bis zum Rang des Lagers entwickeln.',
  },
  dungeon: {
    name: 'Dungeon-Tor',
    buy: 400,
    upgrades: [480, 1500, 4200, 10000, 25000],
    pitch: 'Schicke bis zu fünf Helden auf Erkundung, um Gold und Sammelstücke zu erbeuten.',
    unlocks: 'Gefahrenstufen sind bis zum Rang des Tors zugänglich.',
  },
  arena: {
    name: 'Bossarena',
    buy: 600,
    upgrades: [720, 2100, 5400, 12000, 30500],
    pitch: 'Rüste drei Helden aus und lass sie gegen Bosse kämpfen. Siege bringen Stoff und Seide für den Arena-Händler.',
    unlocks: 'Bosse lassen sich bis zum Rang der Arena gezielt herausfordern, Helden und Ausrüstung bis zu diesem Rang verbessern.',
  },
  mine: {
    name: 'Mine',
    buy: 800,
    upgrades: [900, 2400, 6000, 14000, 33000],
    pitch: 'Sechs Ebenen tief: Deine Monster hacken dort Erz, das der seltene Erzhändler gegen Sammelstücke tauscht.',
    unlocks: 'Jeder Rang öffnet eine tiefere Ebene mit wertvollerem Erz und erlaubt, Monster bis zu diesem Rang zu verbessern.',
  },
  forge: {
    name: 'Schmiede',
    buy: 1000,
    upgrades: [1200, 3000, 7200, 16500, 38500],
    pitch: 'Ein Anbau am Haus: Hier kopierst du gezielt eigene Sammelstücke – für Gold, Erz aus der Mine und Schmiedeglut.',
    unlocks: 'Kopiert werden Stücke bis zum Rang der Schmiede. Jeder Ausbau vergrößert den Glutvorrat und lässt die Glut schneller nachladen.',
  },
  well: {
    name: 'Wunschbrunnen',
    buy: 0,
    upgrades: [900, 2400, 6000, 14000, 33000],
    pitch: 'Wirf Gold hinein – der Brunnen schenkt dir dafür ein Sammelstück.',
    unlocks: 'Jeder Rang macht Brunnen-Taler günstiger (bis −20 %), erhöht die Chance auf einen Gratis-Folgewunsch und auf ein Geschenk des Brunnengeists. Ab Rang A zwei, bei SS drei Gratiswünsche am Tag.',
  },
  portal: {
    name: 'Dimensionsportal',
    buy: 10000,
    upgrades: [],
    pitch: 'Ein Tor in eine zweite Welt – Hölle oder Himmel, das entscheidet das Schicksal beim ersten Durchschreiten. Dort baust du alles noch einmal auf und sammelst 2100 neue Stücke.',
    unlocks: 'Gold, Sammlung, Begleiter und Haus teilen sich beide Welten.',
  },
  tower: {
    name: 'Magierturm',
    buy: 1500,
    upgrades: [1800, 4200, 9000, 19000, 44000],
    pitch: 'Ein Turm voller Sterne: Er sammelt Mana, mit dem du Zauber aus deinen Schriftrollen wirkst.',
    unlocks: 'Jeder Rang vergrößert den Mana-Vorrat, lässt es schneller nachladen und erlaubt stärkere Zauber.',
  },
};

const MAX_TIER = RARITIES.length - 1;

// -1 = noch nicht gebaut, 0 = Rang D … 5 = Rang SS
export const tier = (id) => state.buildings[id] ?? -1;
export const owned = (id) => tier(id) >= 0;
export const rank = (id) => (owned(id) ? RARITIES[tier(id)].id : null);

// Preis des nächsten Schritts (Bau oder Ausbau); null, wenn alles ausgebaut ist.
// In den Portalwelten starten Gebäude direkt auf Rang B und kosten mehr.
const round = (v, step) => Math.round(v / step) * step;
export const realmBuy = (id) => {
  const b = BUILDINGS[id];
  return round((b.buy + b.upgrades[0] + b.upgrades[1]) * realm.PRICE, 250);
};
export function nextCost(id) {
  const t = tier(id);
  const b = BUILDINGS[id];
  if (t < 0) return realm.inRealm() && b.upgrades.length ? realmBuy(id) : b.buy;
  if (t >= MAX_TIER || t >= b.upgrades.length) return null;
  const cost = realm.inRealm() ? round(b.upgrades[t] * realm.PRICE, 500) : b.upgrades[t];
  // Freundschaft (Bürgermeister & Co.) macht den Ausbau günstiger – höchstens −40 %
  const off = Math.min(0.4, companions.bonus('building'));
  return off > 0 ? round(cost * (1 - off), 50) : cost;
}

export function advance(id) {
  const cost = nextCost(id);
  if (cost === null || !state.spend(cost, 'anlagen')) return false;
  state.buildings[id] = tier(id) < 0 && realm.inRealm() ? realm.START_TIER : tier(id) + 1;
  state.changed();
  return true;
}
