import { M } from './core.js';

// Waffen und Rüstung.

function sword(o) {
  return (g, r, f) => {
    const s = o.shift || 0;
    const len = o.len + r.i(0, 1);
    const P = (m, list) => g.pts(m, list.map(([x, y]) => [x + s, y - s]));
    g.diag(2 + s, 13 - s, 3, M.wood, 2);
    P(M.accent, [[1, 14], [2, 14]]);
    const wide = o.guard || r.chance(0.6);
    P(M.accent, [[4, 9], [4, 10], [5, 10], [5, 11], [6, 11]]);
    if (wide) P(M.accent, [[3, 8], [3, 9], [6, 12], [7, 12]]);
    g.diag(6 + s, 9 - s, len, M.metal, o.broad && r.chance(0.6) ? 3 : 2);
    g.set(6 + s + len, 9 - s - len + 1, M.metal);
    if (f > 0.5 && r.chance(0.7)) g.diag(7 + s, 8 - s, len - 1, M.glow);
    if (r.chance(f)) P(M.glow, [[5, 10]]);
  };
}

function spear(g, r, f) {
  g.diag(2, 13, 10, M.wood);
  g.pts(M.metal, [[11, 4], [11, 3], [12, 4], [12, 3], [12, 2], [13, 3], [13, 2], [14, 1]]);
  if (r.chance(0.6)) g.pts(M.accent, [[10, 6], [10, 7], [9, 7]]);
  if (r.chance(0.5)) g.pts(M.metal, [[10, 3], [12, 5]]);
  if (r.chance(f)) g.pts(M.glow, [[12, 3]]);
  g.pts(M.accent, [[5, 10], [6, 9]]);
}

function staff(g, r, f) {
  g.diag(2, 13, 9, M.wood);
  g.pts(M.metal, [[9, 4], [9, 3], [11, 6], [12, 6]]);
  g.ellipse(11.5, 3.5, 2, 2, f > 0.4 ? M.glow : M.accent);
  if (f <= 0.4) g.set(11, 3, M.white);
  if (r.chance(0.5)) g.pts(M.accent, [[5, 10], [6, 9]]);
  if (r.chance(f)) g.pts(M.main, [[13, 6], [14, 5], [9, 1], [10, 0]]);
}

function wand(g, r, f) {
  g.diag(4, 12, 6, M.wood);
  g.pts(M.accent, [[4, 12], [5, 11]]);
  g.set(10, 6, M.metal);
  g.pts(f > 0.2 ? M.glow : M.main, [[11, 5], [10, 5], [12, 5], [11, 4], [11, 6]]);
  if (r.chance(0.3 + f)) g.pts(M.white, [[13, 3], [8, 3], [13, 8]]);
}

function axe(g, r, f) {
  g.rect(7, 3, 2, 12, M.wood);
  const double = r.chance(0.25 + f / 2);
  [3, 4, 5, 5, 5, 4, 3].forEach((w, i) => {
    g.rect(9, 2 + i, w, 1, M.metal);
    if (double) g.rect(7 - w, 2 + i, w, 1, M.metal);
  });
  g.rect(7, 2, 2, 1, M.metal);
  g.rect(7, 10, 2, 2, M.accent);
  if (r.chance(f)) g.pts(M.glow, [[10, 5], [11, 5]]);
}

function hammer(g, r, f) {
  g.rect(7, 7, 2, 8, M.wood);
  g.rect(3, 2, 10, 5, M.metal);
  g.rect(7, 2, 2, 5, M.accent);
  if (r.chance(0.5)) g.pts(0, [[3, 2], [12, 2], [3, 6], [12, 6]]);
  if (r.chance(f)) g.pts(M.glow, [[5, 4], [10, 4]]);
  g.rect(7, 12, 2, 1, M.accent);
}

function mace(g, r, f) {
  g.rect(7, 8, 2, 7, M.wood);
  g.ellipse(7.5, 4.5, 3, 3, M.metal);
  g.spts(M.metal, [[7, 1], [4, 4], [4, 5], [5, 2]]);
  g.spts(M.metal, [[5, 7]]);
  g.rect(7, 14, 2, 1, M.accent);
  if (r.chance(0.3 + f)) g.pts(f > 0.5 ? M.glow : M.accent, [[7, 4], [8, 4], [7, 5], [8, 5]]);
}

function bow(g, r, f) {
  let prev = 6;
  for (let y = 1; y <= 14; y++) {
    const x = 6 + Math.round(5 * Math.sin((Math.PI * (y - 1)) / 13));
    for (let i = Math.min(prev, x); i <= Math.max(prev, x); i++) g.set(i, y, M.wood);
    prev = x;
  }
  for (let y = 2; y <= 13; y++) g.set(5, y, M.white);
  g.pts(M.accent, [[11, 7], [11, 8], [10, 7], [10, 8]]);
  if (r.chance(0.3 + f)) g.pts(f > 0.5 ? M.glow : M.metal, [[6, 1], [6, 14], [7, 2], [7, 13]]);
}

function scythe(g, r, f) {
  g.rect(10, 2, 2, 13, M.wood);
  g.rect(3, 2, 7, 1, M.metal);
  g.rect(2, 3, 7, 1, M.metal);
  g.pts(M.metal, [[1, 4], [2, 4], [3, 4], [4, 4], [1, 5], [2, 5], [1, 6]]);
  g.rect(10, 8, 2, 2, M.accent);
  if (r.chance(f)) g.pts(M.glow, [[4, 3], [5, 3], [6, 3]]);
}

export const WEAPONS = [
  { n: 'Schwert', d: sword({ len: 6, broad: true, guard: true }) },
  { n: 'Dolch', d: sword({ len: 3, shift: 2 }) },
  { n: 'Speer', d: spear },
  { n: 'Stab', d: staff },
  { n: 'Zauberstab', d: wand },
  { n: 'Axt', d: axe },
  { n: 'Hammer', d: hammer },
  { n: 'Streitkolben', d: mace },
  { n: 'Bogen', d: bow },
  { n: 'Sense', d: scythe },
];

// ---------------------------------------------------------------- Rüstung

const pickMain = (r) => (r.chance(0.5) ? M.metal : M.main);

function helmet(g, r, f) {
  const main = pickMain(r);
  g.rows(2, [2, 4, 5, 5, 5, 5, 5, 5, 5, 5], main);
  const visor = r.i(0, 2);
  if (visor === 0) g.rect(4, 7, 8, 1, M.ink);
  if (visor === 1) {
    g.rect(4, 6, 8, 1, M.ink);
    g.rect(7, 7, 2, 4, M.ink);
  }
  if (visor === 2) g.rect(5, 6, 6, 5, M.ink);
  g.row(11, 5, M.accent);
  if (r.chance(0.5)) g.rect(7, 2, 2, 4, M.accent);
  if (r.chance(0.3 + f / 2)) g.pts(main === M.main ? M.accent : M.main, [[7, 1], [8, 1], [9, 1], [9, 0], [10, 1], [10, 2], [11, 2], [11, 3]]);
  if (r.chance(0.3 + f / 3)) g.spts(M.white, [[2, 6], [2, 5], [1, 4], [1, 3]]);
  if (visor === 2 && f > 0.5) g.spts(M.glow, [[6, 8]]);
}

function chestplate(g, r, f) {
  const main = pickMain(r);
  g.rows(3, [6, 6, 6, 5, 5, 4, 4, 4, 4, 5, 5], main);
  g.pts(0, [[6, 3], [7, 3], [8, 3], [9, 3], [7, 4], [8, 4]]);
  for (let x = 2; x <= 4; x++) for (let y = 3; y <= 4; y++) g.sym(x, y, M.accent);
  g.spts(M.accent, [[2, 5]]);
  g.row(11, 4, M.wood);
  g.pts(M.accent, [[7, 11], [8, 11]]);
  g.pts(f > 0.5 ? M.glow : M.accent, [[7, 7], [8, 7], [7, 8], [8, 8]]);
  if (r.chance(0.5)) g.spts(M.second, [[5, 9], [6, 9], [5, 6]]);
}

function shield(shape) {
  return (g, r, f) => {
    if (shape === 'round') g.ellipse(7.5, 7.5, 6, 6, M.main);
    if (shape === 'kite') g.rows(1, [6, 6, 6, 6, 6, 6, 5, 5, 4, 4, 3, 2, 1], M.main);
    if (shape === 'tower') g.rect(3, 1, 10, 14, M.main);
    g.rim(M.metal);
    const field = (x, y) => g.get(x, y) === M.main;
    const m = r.chance(0.5) ? M.accent : M.second;
    const style = r.i(0, 4);
    if (style === 0) g.swap(M.main, m, (x) => x === 7 || x === 8);
    if (style === 1) g.swap(M.main, m, (x, y) => x === 7 || x === 8 || y === 6 || y === 7);
    if (style === 2) g.swap(M.main, m, (x, y) => Math.abs(x - 7.5) + 3 - y === 0.5 || Math.abs(x - 7.5) + 6 - y === 0.5);
    if (style === 3) g.swap(M.main, M.second, (x) => x > 7);
    if (style === 4) for (let i = 0; i < 6; i++) { const x = r.i(4, 7), y = r.i(3, 10); if (field(x, y)) g.sym(x, y, m); }
    if (style >= 3 || r.chance(f)) {
      g.ellipse(7.5, 7, 2, 2, M.metal);
      g.pts(f > 0.4 ? M.glow : M.accent, [[7, 6], [8, 6], [7, 7], [8, 7]]);
    }
  };
}

function boots(g, r, f) {
  g.rect(5, 2, 5, 9, M.main);
  g.rect(5, 10, 9, 4, M.main);
  g.set(13, 10, 0);
  g.rect(5, 13, 9, 1, M.wood);
  g.rect(5, 2, 5, 2, M.accent);
  g.pts(M.metal, [[7, 7], [8, 7]]);
  if (r.chance(0.5)) g.rect(5, 9, 5, 1, M.second);
  if (r.chance(0.2 + f)) g.pts(M.white, [[4, 6], [3, 5], [4, 5], [2, 4], [3, 4], [1, 3]]);
  if (r.chance(f)) g.set(12, 11, M.glow);
}

function gauntlet(g, r, f) {
  const main = pickMain(r);
  [[3, 3], [6, 1], [9, 1], [12, 2]].forEach(([x, top]) => g.rect(x, top, 2, 5 - top, main));
  g.rect(3, 5, 11, 4, main);
  g.rect(1, 6, 2, 3, main);
  g.rect(4, 9, 9, 5, M.accent);
  g.pts(M.accent, [[3, 12], [3, 13], [13, 12], [13, 13]]);
  g.rect(4, 9, 9, 1, M.metal);
  for (const x of [4, 7, 10, 13]) g.set(x, 5, M.second);
  if (r.chance(0.3 + f)) g.pts(f > 0.5 ? M.glow : M.metal, [[8, 6], [7, 7], [8, 7], [9, 7], [8, 8]]);
}

function cape(g, r, f) {
  g.rows(3, [3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6], M.main);
  g.pts(0, [[3, 13], [6, 13], [9, 13], [12, 13]]);
  g.rect(5, 2, 6, 1, M.accent);
  g.swap(M.main, M.second, (x, y) => (x === 7 || x === 8) && y > 3);
  g.pts(f > 0.4 ? M.glow : M.metal, [[7, 3], [8, 3]]);
  if (r.chance(0.5)) g.swap(M.main, M.accent, (x, y) => y === 12);
  if (r.chance(f)) for (let i = 0; i < 4; i++) g.sym(r.i(3, 6), r.i(6, 11), M.white);
}

export const ARMOR = [
  { n: 'Helm', d: helmet },
  { n: 'Brustpanzer', d: chestplate },
  { n: 'Rundschild', d: shield('round') },
  { n: 'Wappenschild', d: shield('kite') },
  { n: 'Turmschild', d: shield('tower') },
  { n: 'Stiefel', d: boots },
  { n: 'Panzerhandschuh', d: gauntlet },
  { n: 'Umhang', d: cape },
];
