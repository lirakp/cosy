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

// Fische: Form, Muster und Farben kommen aus der Art (siehe village.js).
// shape: normal · small · long · eel · round · tall
// pattern: none · stripes · spots · rainbow · koi · glow · aurora
export const fishDraw = (spec) => (g, r) => {
  const { shape = 'normal', pattern = 'none' } = spec;
  // Schwanzflosse links
  const tail = (cy, size) => {
    for (let i = 0; i < size; i++) g.rect(3 - i, cy - 1 - i, 1, 3 + i * 2, M.second);
  };
  if (shape === 'eel') {
    for (let x = 1; x <= 14; x++) {
      const y = 8 + Math.round(Math.sin(x / 2.2) * 1.5);
      g.rect(x, y - 1, 1, 2 + (x > 10 ? 1 : 0), M.main);
    }
    g.set(14, 7 + Math.round(Math.sin(14 / 2.2) * 1.5), M.ink);
    for (let x = 3; x <= 12; x += 3) g.set(x, 8 + Math.round(Math.sin(x / 2.2) * 1.5) - 2, M.second);
  } else {
    const body = {
      normal: [8.5, 8, 5, 3, 3],
      small: [9, 8, 3.5, 2.2, 2],
      long: [8.5, 8, 6.5, 2.2, 3],
      round: [8.5, 8, 4.5, 4.5, 2],
      tall: [8.5, 8, 4.5, 5.5, 2],
    }[shape];
    const [cx, cy, rx, ry, tailSize] = body;
    tail(cy, tailSize);
    g.ellipse(cx, cy, rx, ry, M.main);
    // Rücken- und Bauchflosse
    g.pts(M.second, [[Math.round(cx) - 1, Math.round(cy - ry) - 1], [Math.round(cx), Math.round(cy - ry) - 1], [Math.round(cx), Math.round(cy + ry) + 1]]);
    for (let x = Math.round(cx - rx + 2); x <= Math.round(cx + rx - 2); x++) if (g.get(x, Math.round(cy + ry - 0.5))) g.set(x, Math.round(cy + ry - 0.5), M.second);
    const eyeX = Math.round(cx + rx - 2);
    const eyeY = Math.round(cy - 1);
    // Muster
    if (pattern === 'stripes') for (const x of [cx - 2, cx, cx + 2]) for (let y = 0; y < 16; y++) if (g.get(Math.round(x), y) === M.main) g.set(Math.round(x), y, M.accent);
    if (pattern === 'spots') for (let i = 0; i < 6; i++) { const x = r.i(Math.round(cx - rx + 2), Math.round(cx + rx - 2)); const y = r.i(Math.round(cy - ry + 1), Math.round(cy + ry - 1)); if (g.get(x, y) === M.main) g.set(x, y, M.accent); }
    if (pattern === 'rainbow') for (let x = 0; x < 16; x++) if (g.get(x, Math.round(cy)) === M.main) g.set(x, Math.round(cy), M.accent);
    if (pattern === 'koi') for (let i = 0; i < 3; i++) g.ellipse(cx - 2 + i * 2.5, cy - 1 + (i % 2) * 2, 1.4, 1.2, M.accent);
    if (pattern === 'glow' || pattern === 'aurora') for (let x = Math.round(cx - rx + 2); x < Math.round(cx + rx - 1); x += 2) if (g.get(x, Math.round(cy + 1))) g.set(x, Math.round(cy + 1), M.glow);
    if (pattern === 'aurora') for (let x = 0; x < 16; x++) if (g.get(x, Math.round(cy - 1)) === M.main) g.set(x, Math.round(cy - 1), M.accent);
    g.set(eyeX, eyeY, M.ink);
    // Besonderheiten
    if (spec.lure) g.pts(M.second, [[eyeX, eyeY - 2], [eyeX + 1, eyeY - 3], [eyeX + 2, eyeY - 4]]), g.set(eyeX + 3, eyeY - 4, M.glow);
    if (spec.whiskers) g.pts(M.ink, [[eyeX + 2, eyeY + 2], [eyeX + 3, eyeY + 3], [eyeX + 2, eyeY + 3]]);
    if (spec.armor) for (let x = Math.round(cx - rx + 1); x < Math.round(cx + rx); x += 2) if (g.get(x, Math.round(cy - ry + 0.5))) g.set(x, Math.round(cy - ry + 0.5), M.white);
  }
  if (spec.tier >= 4) g.pts(M.glow, [[7, 2], [8, 3], [9, 2]]);
  if (spec.tier === 5) g.pts(M.white, [[2, 3], [13, 13]]);
  const [h, sat, l] = spec.color;
  const [fh, fs, fl] = spec.fin || [h + 10, sat, l - 15];
  const [ah, as, al] = spec.accent || [h + 180, 60, 60];
  return { [M.main]: ramp(h, sat, l), [M.second]: ramp(fh, fs, fl), [M.accent]: ramp(ah, as, al) };
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
