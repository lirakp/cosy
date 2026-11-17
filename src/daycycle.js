// Tag-Nacht-Zyklus. Die Tageszeit läuft von 0 bis 1:
// 0 = Mitternacht, 0,25 = Morgen, 0,5 = Mittag, 0,75 = Abend.

// Himmelsfarben je Tageszeit, von oben nach unten.
export const SKIES = {
  night: ['#0b0a1f', '#121031', '#1a1744', '#221e52', '#2c2660', '#3a3170'],
  dawn: ['#2a2456', '#55467f', '#9a6696', '#e08a8c', '#f5b38a', '#fde0a8'],
  day: ['#3c78c8', '#5590da', '#73a9e6', '#94c0ee', '#b6d6f3', '#d8eaf6'],
  dusk: ['#2a2456', '#4b3b78', '#8a5a8c', '#d0788a', '#f2a777', '#fbd89a'],
};

// Wolkenfarben (Grundfarbe, Lichtkante) je Tageszeit.
export const CLOUDS = {
  night: ['#2e2860', '#40387a'],
  dawn: ['#e89aa0', '#f8c6b0'],
  day: ['#dfe8f4', '#ffffff'],
  dusk: ['#e89aa0', '#f8c6b0'],
};

// Stützpunkte: Himmel, Farbtönung der Landschaft (Farbe + Stärke) und
// wie „nächtlich“ es ist (steuert Sterne, Lichter und Glühwürmchen).
const NIGHT = { sky: 'night', tint: [14, 10, 44], a: 0.58, night: 1 };
const FRAMES = [
  { t: 0, ...NIGHT },
  { t: 0.2, ...NIGHT },
  { t: 0.27, sky: 'dawn', tint: [96, 48, 104], a: 0.24, night: 0.45 },
  { t: 0.35, sky: 'day', tint: [210, 235, 255], a: 0.1, night: 0 },
  { t: 0.66, sky: 'day', tint: [210, 235, 255], a: 0.1, night: 0 },
  { t: 0.75, sky: 'dusk', tint: [90, 40, 90], a: 0.06, night: 0.3 },
  { t: 0.83, ...NIGHT },
  { t: 1, ...NIGHT },
];

const lerp = (a, b, u) => a + (b - a) * u;
const smooth = (u) => u * u * (3 - 2 * u);

export function phase(t) {
  t = ((t % 1) + 1) % 1;
  let i = 0;
  while (i < FRAMES.length - 2 && t >= FRAMES[i + 1].t) i++;
  const a = FRAMES[i];
  const b = FRAMES[i + 1];
  const u = smooth((t - a.t) / (b.t - a.t));
  const tint = a.tint.map((c, k) => Math.round(lerp(c, b.tint[k], u)));
  return {
    t,
    skyA: a.sky,
    skyB: b.sky,
    mix: a.sky === b.sky ? 0 : u,
    tint: `rgb(${tint.join(' ')})`,
    tintAlpha: lerp(a.a, b.a, u),
    night: lerp(a.night, b.night, u),
  };
}

// Bezeichnung und Symbol für die Anzeige
export function label(t) {
  t = ((t % 1) + 1) % 1;
  if (t < 0.22 || t >= 0.84) return { icon: '☾', name: 'Nacht' };
  if (t < 0.34) return { icon: '◐', name: 'Morgen' };
  if (t < 0.68) return { icon: '☀', name: 'Tag' };
  return { icon: '◑', name: 'Abend' };
}

// Sonne und Mond ziehen in einem Bogen über den Himmel (null = unter dem Horizont).
function arc(u, width) {
  if (u < 0 || u > 1) return null;
  return { x: -16 + u * (width + 32), y: 132 - Math.sin(Math.PI * u) * 108 };
}
export const sunPos = (t, width) => arc((t - 0.22) / 0.6, width);
export const moonPos = (t, width) => arc(((t < 0.4 ? t + 1 : t) - 0.76) / 0.56, width);
