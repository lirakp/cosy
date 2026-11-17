// Welten: die Heimat ('normal') und – hinter dem Dimensionsportal – entweder die
// Hölle oder der Himmel. Welche es wird, entscheidet der Zufall beim Bau des
// Portals; danach bleibt es so. Dieses Modul merkt sich nur, in welcher Welt
// man gerade ist (ohne weitere Abhängigkeiten, damit es überall nutzbar ist).

export const WORLDS = {
  normal: { id: 'normal', name: 'Heimat', short: 'Heimat' },
  hoelle: {
    id: 'hoelle',
    name: 'Hölle',
    short: 'Hölle',
    intro: 'Glühende Felsen, ein Himmel aus Glut und Asche – und überall warten Sammelstücke, die im Feuer geschmiedet wurden.',
  },
  himmel: {
    id: 'himmel',
    name: 'Himmel',
    short: 'Himmel',
    intro: 'Weiche Wolken, goldenes Licht und ewiger Frieden – hier warten Sammelstücke aus Licht und Sternenstaub.',
  },
};
export const REALMS = ['hoelle', 'himmel'];

let now = 'normal';
export const current = () => now;
export const setCurrent = (id) => {
  now = WORLDS[id] ? id : 'normal';
};
export const inRealm = () => now !== 'normal';

// ---------------------------------------------------------------- Regeln der Portalwelten

// Höhere Preise, höhere Belohnungen: Gebäude starten auf Rang B und kosten
// mehr, Wünsche kosten das Doppelte, Gold aus Expedition, Dungeon und Münzen
// fällt doppelt so hoch aus.
export const START_TIER = 2; // Rang B
export const PRICE = 2.5; // Gebäude
export const PULL = 2; // Wünsche am Brunnen
export const GOLD = 2; // Expedition, Dungeon, Münzen

// Eigene Boni je Dimension, solange man dort ist
export const BONUS = {
  hoelle: { expedition: 0.5, mine: 0.3, power: 0.15 },
  himmel: { garden: 0.4, mana: 0.4, stars: 0.5, luck: 1 },
};
export const BONUS_TEXT = {
  hoelle: ['Expedition +50 % Gold', 'Mine +30 % Erz', 'Arena und Dungeon: +15 % Stärke'],
  himmel: ['Beete wachsen 40 % schneller', 'Mana lädt 40 % schneller', 'Sternschnuppen 50 % öfter', 'Glück am Brunnen und beim Händler wie im Glücksrausch'],
};
export const bonus = (kind) => BONUS[now]?.[kind] || 0;
export const goldFactor = () => (now === 'normal' ? 1 : GOLD);
