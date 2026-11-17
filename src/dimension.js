import { state } from './state.js';
import * as realm from './realm.js';

// Welche Portalwelten man erreichen kann: die erste (Zufall beim Bau des
// Portals) und – sobald in der Heimat alle Gebäude auf Rang SS stehen – auch
// die andere.

export const HOME_BUILDINGS = ['camp', 'dungeon', 'arena', 'mine', 'forge', 'tower', 'well'];
const MAX = 5;

export const homeMaxed = () => HOME_BUILDINGS.every((id) => (state.homeBuildings()[id] ?? -1) >= MAX);
export const homeProgress = () => HOME_BUILDINGS.filter((id) => (state.homeBuildings()[id] ?? -1) >= MAX).length;
export const second = () => realm.REALMS.find((w) => w !== state.realm.type);

// Ziele, die man von der Heimat aus wählen kann
export function destinations() {
  if (!state.realm.type) return [];
  return homeMaxed() ? [state.realm.type, second()] : [state.realm.type];
}
export const visited = (w) => !!state.realm.visited[w];
// Welten, die man kennt (für Galerie, Zauberbuch, Nähtisch)
export const known = () => realm.REALMS.filter((w) => visited(w));
