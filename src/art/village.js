import { M, ramp } from './core.js';
import { body } from './heroes.js';

// Dorfbewohner, Marktfrau und Fische.

const villager = (o) => (g, r, f) => {
  const over = body(g, r, f, { hair: o.hair ?? 1, cape: false, robe: o.robe, skin: ramp(...o.skin), hairColor: ramp(...o.hairColor) });
  o.extra?.(g);
  return { ...over, [M.main]: ramp(...o.main), [M.second]: ramp(...o.second), [M.accent]: ramp(...o.accent) };
};

export const VILLAGER_ART = {
  // Bäckerin mit weißer Mütze und Schürze
  greta: villager({ skin: [28, 55, 78], hairColor: [30, 60, 45], main: [20, 50, 60], second: [30, 20, 40], accent: [0, 0, 95], robe: true, hair: 2,
    extra: (g) => { g.rect(5, 0, 6, 2, M.white); g.rect(6, 8, 4, 3, M.white); } }),
  // Fischer mit gelbem Ölzeug
  ole: villager({ skin: [24, 45, 62], hairColor: [30, 10, 80], main: [50, 85, 55], second: [210, 30, 30], accent: [50, 85, 45],
    extra: (g) => { g.rect(4, 1, 8, 2, M.main); g.pts(M.wood, [[13, 2], [13, 3], [13, 4], [13, 5], [13, 6], [13, 7]]); } }),
  // Bürgermeister mit Zylinder
  anton: villager({ skin: [28, 50, 74], hairColor: [0, 0, 70], main: [350, 40, 35], second: [240, 15, 20], accent: [45, 90, 55], hair: 0,
    extra: (g) => { g.rect(5, 0, 6, 2, M.ink); g.rect(4, 2, 8, 1, M.ink); g.pts(M.accent, [[7, 8], [8, 9]]); } }),
  // Gärtnerin mit Strohhut
  lotte: villager({ skin: [22, 45, 55], hairColor: [15, 70, 40], main: [120, 40, 45], second: [30, 40, 35], accent: [45, 70, 70], hair: 2,
    extra: (g) => { g.rect(3, 1, 10, 1, M.accent); g.rect(5, 0, 6, 1, M.accent); } }),
  // Abenteurer mit Rucksack
  jonas: villager({ skin: [26, 50, 70], hairColor: [25, 45, 28], main: [200, 40, 40], second: [30, 30, 30], accent: [10, 60, 50],
    extra: (g) => { g.rect(1, 7, 3, 4, M.wood); g.pts(M.metal, [[13, 3], [13, 4], [13, 5], [12, 2]]); } }),
  // Marktfrau mit Kopftuch
  hilde: villager({ skin: [28, 55, 76], hairColor: [25, 50, 35], main: [330, 45, 50], second: [40, 30, 35], accent: [50, 80, 60], robe: true,
    extra: (g) => { g.rect(4, 1, 8, 2, M.accent); g.rect(5, 0, 6, 1, M.accent); } }),
};

// Fische: Körperfarbe je Art
export const FISH_COLORS = [
  [200, 10, 70], // Weißfisch
  [10, 50, 60], // Forelle
  [35, 50, 45], // Karpfen
  [120, 35, 40], // Hecht
  [40, 90, 55], // Goldkarpfen
  [260, 60, 60], // Mondfisch
];

export const fishDraw = (tier) => (g) => {
  for (let i = 0; i < 3; i++) g.rect(2 - i, 7 - i, 1, 3 + i * 2, M.second);
  g.ellipse(8.5, 8, 5, 3, M.main);
  g.set(12, 7, M.ink);
  for (let x = 6; x <= 11; x++) g.set(x, 10, M.second);
  if (tier >= 1) for (const x of [6, 8, 10]) g.set(x, 7 - (x % 4 === 0 ? 1 : 0), M.accent);
  if (tier === 3) for (let x = 5; x <= 11; x++) g.set(x, 6, M.second);
  if (tier >= 4) g.pts(M.glow, [[7, 3], [8, 4], [9, 3]]);
  if (tier === 5) g.pts(M.white, [[6, 8], [9, 9], [11, 8]]);
  return { [M.main]: ramp(...FISH_COLORS[tier]), [M.second]: ramp(FISH_COLORS[tier][0] + 10, FISH_COLORS[tier][1], FISH_COLORS[tier][2] - 15) };
};

// Flaschenpost als Angelschatz
export function bottleDraw(g) {
  g.rect(4, 6, 8, 5, M.second);
  g.rect(12, 7, 2, 3, M.second);
  g.rect(14, 7, 1, 3, M.wood);
  g.rect(5, 7, 5, 3, M.white);
  g.pts(M.ink, [[6, 8], [8, 8]]);
  return { [M.second]: ramp(160, 40, 60) };
}
