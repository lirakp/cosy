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
