import { M } from './core.js';

// Lebewesen und Monster.

function quadruped(o) {
  return (g, r, f) => {
    const by = o.tall ? 8 : 9;

    if (o.tail === 'long') g.line(2, by, 1, by - 3, M.main);
    if (o.tail === 'bushy') {
      g.ellipse(2, by - 2, 1.5, 2.5, M.main);
      g.pts(M.white, [[2, by - 4], [1, by - 3]]);
    }
    if (o.tail === 'short') g.set(2, by - 1, M.second);
    if (o.tail === 'curl') g.pts(M.main, [[2, by - 1], [1, by - 2], [1, by - 3], [2, by - 4]]);

    g.ellipse(6.5, by, 3.6, 2.2, M.main);
    for (let x = 5; x <= 8; x++) g.set(x, by + 2, M.second);
    for (const x of [4, 6, 8, 10]) {
      for (let y = by + 1; y <= 13; y++) g.set(x, y, M.main);
      g.set(x, 13, o.hoof ? M.wood : M.second);
    }

    g.ellipse(11, by - 3, 2.4, 2.2, M.main);
    if (o.snout) {
      g.pts(M.second, [[13, by - 2], [12, by - 1], [13, by - 1]]);
      g.set(14, by - 2, M.ink);
    } else {
      g.set(13, by - 2, M.accent);
    }
    g.set(12, by - 3, M.ink);

    if (o.ears === 'point') g.pts(M.main, [[10, by - 6], [10, by - 7], [12, by - 6], [12, by - 7]]);
    if (o.ears === 'long') {
      for (let i = 6; i <= 8; i++) {
        g.set(10, by - i, M.main);
        g.set(12, by - i, M.main);
      }
    }
    if (o.ears === 'flop') g.pts(M.second, [[9, by - 5], [9, by - 4], [9, by - 3], [9, by - 2]]);
    if (o.ears === 'antler') {
      g.pts(M.wood, [[10, by - 6], [10, by - 7], [9, by - 8], [11, by - 8], [12, by - 6], [12, by - 7], [13, by - 8]]);
    }

    if (r.chance(0.6)) {
      const m = r.chance(0.5) ? M.second : M.accent;
      for (let i = 0; i < 3; i++) g.set(r.i(4, 9), r.i(by - 1, by + 1), m);
    }
    if (r.chance(f)) g.pts(M.accent, [[9, by - 1], [9, by]]);
    if (f > 0.7 && r.chance(0.6)) {
      g.pts(M.white, [[6, by - 3], [5, by - 4], [6, by - 4], [4, by - 5], [5, by - 5]]);
    }
    if (f > 0.5 && r.chance(0.5)) g.set(12, by - 6, M.glow);
  };
}

function bird(g, r, f) {
  g.pts(M.second, [[3, 7], [2, 6], [3, 8], [2, 8], [1, 7]]);
  g.ellipse(7.5, 8.5, 3.5, 3, M.main);
  g.ellipse(10.5, 5, 2, 2, M.main);
  g.ellipse(6.5, 8.5, 2.5, 1.5, M.second);
  g.pts(M.accent, [[13, 5], [14, 5]]);
  g.set(11, 4, M.ink);
  g.pts(M.wood, [[7, 12], [7, 13], [9, 12], [9, 13], [8, 13], [10, 13]]);
  if (r.chance(0.4 + f / 2)) g.pts(M.accent, [[10, 2], [11, 2], [9, 1]]);
  if (r.chance(0.5)) g.pts(M.second, [[9, 9], [9, 10], [8, 10]]);
  if (f > 0.6 && r.chance(0.6)) g.pts(M.glow, [[1, 6], [1, 8], [0, 7]]);
}

function fish(g, r, f) {
  for (let i = 0; i < 3; i++) g.rect(3 - i, 7 - i, 1, 3 + i * 2, M.second);
  g.pts(M.second, [[7, 4], [8, 4], [9, 4], [8, 3], [7, 12], [8, 12]]);
  g.ellipse(8.5, 8, 4.5, 3, M.main);
  g.set(11, 7, M.ink);
  for (let x = 6; x <= 11; x++) g.set(x, 10, M.second);
  if (r.chance(0.6)) {
    const m = r.chance(0.5) ? M.accent : M.second;
    for (const x of [6, 8]) for (let y = 6; y <= 9; y++) g.set(x, y, m);
  }
  if (r.chance(f)) g.pts(M.glow, [[8, 2], [8, 3]]);
  if (f > 0.5) g.pts(M.white, [[14, 5], [13, 3]]);
}

function butterfly(g, r, f) {
  g.ellipse(3.5, 5.5, 3, 3, M.main);
  g.ellipse(4, 10.5, 2.5, 2.5, M.main);
  g.ellipse(3.5, 5.5, 1.5, 1.5, M.second);
  g.set(4, 10, M.second);
  for (let i = 0; i < 2 + Math.round(f * 3); i++) g.set(r.i(1, 6), r.i(3, 12), r.chance(0.5) ? M.accent : M.glow);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) g.set(15 - x, y, g.get(x, y));
  g.rect(7, 4, 2, 9, M.wood);
  g.pts(M.wood, [[6, 3], [5, 2], [9, 3], [10, 2]]);
}

function frog(g, r, f) {
  g.ellipse(7.5, 10, 5, 3.5, M.main);
  g.ellipse(4, 6, 1.5, 1.5, M.main);
  g.ellipse(11, 6, 1.5, 1.5, M.main);
  g.spts(M.ink, [[4, 6]]);
  g.spts(M.white, [[4, 5]]);
  g.ellipse(7.5, 11.5, 3, 1.5, M.second);
  for (let x = 5; x <= 10; x++) g.set(x, 9, M.ink);
  g.spts(M.accent, [[3, 9]]);
  g.spts(M.main, [[2, 13], [3, 13], [4, 13]]);
  if (r.chance(0.5)) for (let i = 0; i < 3; i++) g.set(r.i(4, 11), r.i(7, 8), M.second);
  if (r.chance(f)) g.pts(M.metal, [[6, 3], [7, 2], [8, 3], [9, 2], [6, 4], [7, 4], [8, 4], [9, 4], [7, 3]]);
}

function snail(g, r, f) {
  g.rect(3, 12, 11, 2, M.second);
  g.pts(M.second, [[13, 11], [13, 10], [14, 11], [13, 9], [14, 8], [12, 8]]);
  g.set(14, 10, M.ink);
  g.ellipse(6.5, 7.5, 4, 4, M.main);
  g.pts(M.accent, [[6, 5], [7, 5], [8, 6], [8, 7], [8, 8], [7, 9], [6, 9], [5, 8], [5, 7], [6, 7]]);
  if (r.chance(f)) g.pts(M.glow, [[6, 7], [7, 7]]);
  if (r.chance(0.4)) g.pts(M.white, [[4, 5], [5, 4]]);
}

export const CREATURES = [
  { n: 'Katze', d: quadruped({ ears: 'point', tail: 'long' }) },
  { n: 'Hund', d: quadruped({ ears: 'flop', tail: 'curl', snout: true }) },
  { n: 'Fuchs', d: quadruped({ ears: 'point', tail: 'bushy', snout: true }) },
  { n: 'Hase', d: quadruped({ ears: 'long', tail: 'short' }) },
  { n: 'Hirsch', d: quadruped({ ears: 'antler', tail: 'short', snout: true, tall: true, hoof: true }) },
  { n: 'Vogel', d: bird },
  { n: 'Fisch', d: fish },
  { n: 'Falter', d: butterfly },
  { n: 'Frosch', d: frog },
  { n: 'Schnecke', d: snail },
];

// ---------------------------------------------------------------- Monster

function slime(g, r, f) {
  const w = r.i(0, 1);
  g.rows(6, [3, 4, 5, 5 + w, 6, 6, 6, 6], M.main);
  g.pts(M.white, [[4, 8], [5, 7]]);
  g.spts(M.ink, [[5, 10], [5, 11]]);
  g.pts(M.ink, [[7, 12], [8, 12]]);
  if (r.chance(0.5)) g.pts(M.main, [[2, 14], [12, 14], [13, 14]]);
  if (r.chance(0.3 + f / 2)) g.pts(M.glow, [[7, 9], [8, 9], [7, 10], [8, 10]].slice(0, r.i(1, 4)));
  if (r.chance(f)) g.pts(M.metal, [[5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [5, 4], [7, 4], [8, 4], [10, 4], [5, 3], [10, 3]]);
}

function ghost(g, r, f) {
  g.rows(2, [2, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5], M.main);
  g.pts(0, [[4, 13], [7, 13], [8, 13], [11, 13]]);
  g.spts(M.main, [[2, 8], [1, 7]]);
  g.spts(M.ink, [[5, 6], [6, 6], [5, 7], [6, 7]]);
  g.spts(f > 0.5 ? M.glow : M.white, [[6, 6]]);
  if (r.chance(0.6)) g.pts(M.ink, [[7, 9], [8, 9], [7, 10], [8, 10]]);
  g.swap(M.main, M.second, (x, y) => y > 10 && r.chance(0.5));
  if (r.chance(f)) g.pts(M.accent, [[5, 1], [6, 0], [7, 1], [8, 1], [9, 0], [10, 1]]);
}

function beast(o) {
  return (g, r, f) => {
    let cell = Array.from({ length: 16 }, () => new Array(8).fill(0));
    for (let y = 2; y <= 13; y++) {
      for (let hx = 0; hx < 7; hx++) {
        const d = (hx / 6.2) ** 2 + ((y - 8) / 6.2) ** 2;
        cell[y][hx] = (hx <= 2 && y >= 5 && y <= 11) || r() > d * 1.3 ? 1 : 0;
      }
    }
    const at = (y, hx) => (y < 0 || y > 15 || hx > 7 ? 0 : cell[y][Math.max(hx, 0)]);
    const next = cell.map((row, y) =>
      row.map((v, hx) => {
        const n = at(y - 1, hx) + at(y + 1, hx) + at(y, hx - 1) + at(y, hx + 1);
        return n >= 3 || (v && n >= 2) ? 1 : 0;
      })
    );
    next.forEach((row, y) => row.forEach((v, hx) => v && g.sym(7 - hx, y, M.main)));

    for (let y = 9; y <= 12; y++) for (let x = 6; x <= 9; x++) if (g.get(x, y)) g.set(x, y, M.second);
    g.spts(M.main, [[5, 12], [5, 13], [4, 13]]);
    if (o.wings) g.spts(M.second, [[2, 5], [1, 4], [1, 5], [1, 6], [2, 6], [2, 7], [1, 8], [3, 6]]);
    if (o.horns || r.chance(0.3 + f / 2)) g.spts(M.white, [[4, 3], [3, 2], [3, 1]]);

    if (o.glowEyes || f > 0.7) g.spts(M.glow, [[5, 6]]);
    else {
      g.spts(M.white, [[5, 6]]);
      g.spts(M.ink, [[6, 6]]);
    }
    g.pts(M.ink, [[6, 9], [7, 9], [8, 9], [9, 9]]);
    if (r.chance(0.6)) g.pts(M.white, [[6, 10], [9, 10]]);
    if (r.chance(0.5)) for (let i = 0; i < 3; i++) g.sym(r.i(3, 6), r.i(3, 5), M.accent);
  };
}

function beholder(g, r, f) {
  g.spts(M.second, [[4, 12], [3, 13], [3, 14], [7, 13], [7, 14]]);
  if (r.chance(0.5 + f / 2)) g.spts(M.second, [[3, 2], [2, 1], [5, 1], [5, 0]]);
  g.ellipse(7.5, 7.5, 5, 5, M.main);
  g.ellipse(7.5, 7, 3, 2.5, M.white);
  g.rect(7, 6, 2, 3, f > 0.5 ? M.glow : M.accent);
  g.pts(M.ink, [[7, 7], [8, 7]]);
  for (let x = 5; x <= 10; x++) if (r.chance(0.5)) g.set(x, 11, M.ink);
  if (r.chance(0.5)) g.spts(M.accent, [[3, 6], [3, 9]]);
}

function skull(g, r, f) {
  g.ellipse(7.5, 6.5, 5, 4.5, M.main);
  g.rect(5, 11, 6, 3, M.main);
  g.spts(M.ink, [[4, 6], [5, 6], [4, 7], [5, 7], [5, 8]]);
  if (r.chance(0.3 + f)) g.spts(M.glow, [[5, 7]]);
  g.pts(M.ink, [[7, 9], [8, 9], [7, 10], [6, 13], [8, 13], [9, 13], [6, 12], [9, 12]]);
  if (r.chance(0.4 + f / 2)) g.spts(M.accent, [[2, 4], [1, 3], [1, 2], [2, 1]]);
  if (r.chance(0.4)) g.pts(M.ink, [[9, 3], [10, 4], [9, 4]]);
  return { [M.main]: { h: 40 + r() * 20, s: 18 + f * 30, l: 74 } };
}

function bat(g, r, f) {
  for (let y = 5; y <= 9; y++) {
    for (let x = 0; x <= 6; x++) {
      if ((y === 5 && x === 0) || (y === 9 && x % 2 === 0) || (y === 8 && x === 0)) continue;
      g.sym(x, y, M.second);
    }
  }
  g.spts(M.second, [[1, 4], [3, 4]]);
  g.ellipse(7.5, 8, 2, 3.5, M.main);
  g.spts(M.main, [[6, 4], [6, 3]]);
  g.spts(f > 0.4 ? M.glow : M.white, [[6, 7]]);
  g.pts(M.white, [[7, 10], [8, 10]]);
  if (r.chance(0.5)) g.spts(M.accent, [[2, 6], [4, 7]]);
  g.spts(M.main, [[7, 12]]);
}

function shroom(g, r, f) {
  g.rect(5, 8, 6, 6, M.second);
  g.spts(M.second, [[4, 13]]);
  g.rows(2, [3, 5, 6, 7, 7, 7], M.main);
  for (let i = 0; i < 5; i++) g.set(r.i(2, 13), r.i(3, 6), f > 0.6 ? M.glow : M.white);
  g.spts(M.ink, [[6, 10]]);
  g.pts(M.ink, [[7, 12], [8, 12]]);
  if (r.chance(0.5)) g.spts(M.accent, [[5, 11]]);
  if (r.chance(f)) g.pts(M.main, [[13, 9], [13, 10], [12, 10], [14, 10]]);
}

function kraken(g, r, f) {
  for (const x of [3, 6, 9, 12]) {
    const bend = r.i(-1, 1);
    g.pts(M.second, [[x, 10], [x, 11], [x + bend, 12], [x + bend, 13], [x, 14]]);
  }
  g.ellipse(7.5, 6, 4.5, 4.5, M.main);
  g.spts(M.white, [[5, 7]]);
  g.spts(M.ink, [[6, 7]]);
  for (let i = 0; i < 4; i++) g.set(r.i(5, 10), r.i(2, 4), M.accent);
  if (r.chance(f)) g.pts(M.glow, [[7, 3], [8, 3]]);
}

function golem(g, r, f) {
  g.rect(6, 2, 4, 3, M.main);
  g.rect(4, 5, 8, 5, M.main);
  g.rect(1, 6, 2, 6, M.main);
  g.rect(13, 6, 2, 6, M.main);
  g.rect(2, 5, 12, 1, M.main);
  g.rect(4, 10, 3, 4, M.main);
  g.rect(9, 10, 3, 4, M.main);
  g.pts(M.glow, [[6, 3], [9, 3]]);
  for (let i = 0; i < 5; i++) g.set(r.i(4, 11), r.i(5, 12), M.second);
  if (r.chance(0.4 + f / 2)) g.pts(M.glow, [[7, 7], [8, 7], [7, 8], [8, 8]]);
  if (r.chance(0.5)) g.pts(M.accent, [[2, 5], [3, 5], [12, 5], [13, 5]]);
}

export const MONSTERS = [
  { n: 'Schleim', d: slime },
  { n: 'Geist', d: ghost },
  { n: 'Bestie', d: beast({}) },
  { n: 'Dämon', d: beast({ horns: true, wings: true, glowEyes: true }) },
  { n: 'Glotzauge', d: beholder },
  { n: 'Schädel', d: skull },
  { n: 'Fledermaus', d: bat },
  { n: 'Pilzling', d: shroom },
  { n: 'Krake', d: kraken },
  { n: 'Golem', d: golem },
];
