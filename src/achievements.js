import { ALL_ITEMS, CATEGORIES } from './items.js';
import { state } from './state.js';
import * as sets from './sets.js';
import * as buildings from './buildings.js';
import * as guild from './guild.js';
import * as friendship from './friendship.js';
import * as projects from './projects.js';
import { FISH } from './village.js';
import { COMPANIONS } from './companions.js';
import { SPELLS } from './magic.js';
import { SEWN } from './tailor.js';

// Errungenschaften: Jede hat mehrere Stufen (Bronze bis Diamant). Erreicht man ein
// Ziel, gibt es sofort Taler (ab Gold auch Sternentaler) und Erfolgspunkte.
// Gezählt wird über alle Welten hinweg; Fortschritt wird regelmäßig geprüft.

export const STAGES = [
  { name: 'Bronze', color: '#c08050', points: 5, taler: 5, stern: 0 },
  { name: 'Silber', color: '#c8d0dc', points: 10, taler: 15, stern: 0 },
  { name: 'Gold', color: '#ffd04a', points: 20, taler: 30, stern: 1 },
  { name: 'Platin', color: '#9be8e0', points: 35, taler: 50, stern: 3 },
  { name: 'Diamant', color: '#c8a0ff', points: 60, taler: 100, stern: 6 },
];

const sum = (obj) => Object.values(obj || {}).reduce((a, b) => a + (Number(b) || 0), 0);
const allProjectStages = () => Object.values(state.village.projects || {}).reduce((n, w) => n + Object.values(w).reduce((m, p) => m + (p.stage || 0), 0), 0);
const ssBuildings = () => Object.keys(buildings.BUILDINGS).filter((id) => (state.homeBuildings()[id] ?? -1) >= 5).length;
const fishSpecies = () => FISH.filter((f) => (state.village.caughtBy || {})[f.id]).length;

// value: aktueller Stand · goals: Ziel je Stufe (bis zu 5)
export const ACHIEVEMENTS = [
  // Sammeln
  { id: 'sammler', group: 'Sammeln', name: 'Sammlerherz', text: 'Verschiedene Sammelstücke besitzen', goals: [25, 150, 500, 1200, 2100], value: () => state.collected(ALL_ITEMS) },
  { id: 'legenden', group: 'Sammeln', name: 'Legendenjäger', text: 'Verschiedene Sammelstücke vom Rang SS besitzen', goals: [1, 10, 50, 150, 350], value: () => ALL_ITEMS.filter((i) => i.tier === 5 && state.count(i.id)).length },
  { id: 'sets', group: 'Sammeln', name: 'Vollständig!', text: 'Sammel-Sets abschließen', goals: [1, 5, 15, 30, CATEGORIES.length * 6], value: () => sets.completedCount() },
  { id: 'wuensche', group: 'Sammeln', name: 'Wunschkind', text: 'Am Wunschbrunnen wünschen', goals: [10, 100, 1000, 5000, 20000], value: () => state.pulls },
  // Aufbau
  { id: 'baumeister', group: 'Aufbau', name: 'Baumeisterin', text: 'Gebäude in der Heimat auf Rang SS bringen', goals: [1, 3, 5, 7, Object.keys(buildings.BUILDINGS).length], value: ssBuildings },
  { id: 'reichtum', group: 'Aufbau', name: 'Goldene Zeiten', text: 'Gold verdienen (laut Statistik)', goals: [10000, 250000, 2500000, 25000000, 250000000], value: () => sum(state.stats.gold) },
  { id: 'schmied', group: 'Aufbau', name: 'Meisterschmied', text: 'Sammelstücke in der Schmiede kopieren', goals: [1, 10, 50, 200, 500], value: () => state.forge.made || 0 },
  { id: 'schneider', group: 'Aufbau', name: 'Nadel und Faden', text: 'Kleidung am Nähtisch nähen', goals: [1, 3, 6, 10, SEWN.length], value: () => (state.tailor.sewn || []).length },
  // Kämpfen
  { id: 'kundschafter', group: 'Kämpfen', name: 'Höhlenforscher', text: 'Dungeon-Erkundungen erfolgreich beenden', goals: [5, 50, 250, 1000, 5000], value: () => guild.count('dungeon') },
  { id: 'arena', group: 'Kämpfen', name: 'Arenaheld', text: 'Bosse in der Bossarena besiegen', goals: [5, 50, 250, 1000, 5000], value: () => guild.count('arena') },
  { id: 'rush', group: 'Kämpfen', name: 'Unaufhaltsam', text: 'Bosse im Bossrush besiegen', goals: [50, 500, 2500, 10000, 50000], value: () => guild.count('rush') },
  { id: 'abstieg', group: 'Kämpfen', name: 'In die Tiefe', text: 'Etagen im Abstieg bezwingen', goals: [50, 500, 2500, 10000, 50000], value: () => guild.count('descent') },
  { id: 'tiefe', group: 'Kämpfen', name: 'Bodenlos', text: 'Tiefste Etage in einem einzigen Abstieg', goals: [25, 100, 300, 700, 1500], value: () => Math.max(0, ...Object.values(state.dungeon.depthBest || {})) },
  // Dorf und Natur
  { id: 'helfer', group: 'Dorf', name: 'Helfende Hand', text: 'Aufgaben im Dorf erledigen', goals: [5, 50, 200, 600, 1500], value: () => state.village.done || 0 },
  { id: 'freunde', group: 'Dorf', name: 'Beste Freunde', text: 'Bewohner auf Freundschaftsstufe 5 bringen', goals: [1, 3, 5, 10, 15], value: () => Object.keys(friendship.FRIENDS).filter((id) => friendship.level(id) >= friendship.MAX_LEVEL).length },
  { id: 'projekte', group: 'Dorf', name: 'Gemeinsinn', text: 'Stufen von Dorfprojekten fertigstellen', goals: [1, 3, 9, 18, 27], value: allProjectStages },
  { id: 'angler', group: 'Dorf', name: 'Petri Heil', text: 'Fische fangen', goals: [10, 100, 500, 2000, 5000], value: () => state.village.caught || 0 },
  { id: 'fischbuch', group: 'Dorf', name: 'Fischkunde', text: 'Verschiedene Fischarten fangen', goals: [5, 10, 18, 24, FISH.length], value: fishSpecies },
  // Magie und Freunde
  { id: 'zauber', group: 'Magie & Begleiter', name: 'Zauberkundig', text: 'Zauber lernen', goals: [1, 5, 15, 40, SPELLS.length], value: () => (state.magic.learned || []).length },
  { id: 'begleiter', group: 'Magie & Begleiter', name: 'Tierfreund', text: 'Begleiter finden', goals: [1, 4, 8, 16, COMPANIONS.length], value: () => (state.companions.owned || []).length },
  { id: 'welten', group: 'Magie & Begleiter', name: 'Weltenwanderer', text: 'Dimensionen betreten (Hölle und Himmel)', goals: [1, 2], value: () => Object.keys(state.realm.visited || {}).length },
  { id: 'zeit', group: 'Magie & Begleiter', name: 'Gemütlich hier', text: 'Stunden im Spiel verbringen', goals: [1, 10, 50, 150, 500], value: () => Math.floor((state.stats.played || 0) / 3600) },
];
export const GROUPS = [...new Set(ACHIEVEMENTS.map((a) => a.group))];
export const achievement = (id) => ACHIEVEMENTS.find((a) => a.id === id);

const got = () => state.achievements.got;
export const stageOf = (id) => got()[id] || 0; // erreichte Stufen (0 … goals.length)
export const value = (a) => a.value();
export const points = () => ACHIEVEMENTS.reduce((n, a) => n + STAGES.slice(0, stageOf(a.id)).reduce((m, s) => m + s.points, 0), 0);
export const maxPoints = () => ACHIEVEMENTS.reduce((n, a) => n + STAGES.slice(0, a.goals.length).reduce((m, s) => m + s.points, 0), 0);
export const doneCount = () => ACHIEVEMENTS.reduce((n, a) => n + stageOf(a.id), 0);
export const totalCount = () => ACHIEVEMENTS.reduce((n, a) => n + a.goals.length, 0);
// Belohnung einer Stufe (die letzte Stufe einer Errungenschaft gibt immer Diamant-Wert)
export const stageInfo = (a, i) => STAGES[i === a.goals.length - 1 ? STAGES.length - 1 : i];

// Prüft alle Errungenschaften, schaltet erreichte Stufen frei und zahlt aus.
// Liefert die neu erreichten Stufen: [{ a, stage, info }]
export function check() {
  const out = [];
  for (const a of ACHIEVEMENTS) {
    let s = stageOf(a.id);
    if (s >= a.goals.length) continue;
    let v;
    try {
      v = a.value();
    } catch {
      continue;
    }
    while (s < a.goals.length && v >= a.goals[s]) {
      const info = stageInfo(a, s);
      const c = (state.well.coins ||= { taler: 0, stern: 0, splinters: 0 });
      c.taler = (c.taler || 0) + info.taler;
      c.stern = (c.stern || 0) + info.stern;
      s++;
      got()[a.id] = s;
      out.push({ a, stage: s, info });
    }
  }
  if (out.length) state.changed();
  return out;
}
