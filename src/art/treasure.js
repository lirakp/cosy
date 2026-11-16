import { M, ramp } from './core.js';

// Relikte und Artefakte.

const pickMain = (r) => (r.chance(0.6) ? M.metal : M.main);

function chalice(g, r, f) {
  const main = pickMain(r);
  g.rows(2, [5, 5, 4, 4, 3], main);
  g.rect(7, 7, 2, 4, main);
  g.row(8, 2, main);
  g.rows(11, [2, 3, 4], main);
  g.rect(4, 2, 8, 1, f > 0.4 ? M.glow : M.accent);
  g.pts(M.accent, [[7, 4], [8, 4]]);
  if (r.chance(0.5)) g.spts(M.accent, [[4, 4]]);
  if (r.chance(f)) g.spts(M.accent, [[5, 12]]);
}

function crown(g, r, f) {
  const main = pickMain(r);
  g.rect(2, 9, 12, 4, main);
  [5, 3, 1, 1, 3, 5].forEach((h, hx) => {
    for (let i = 1; i <= h; i++) g.sym(7 - hx, 9 - i, main);
  });
  g.pts(M.accent, [[7, 10], [8, 10], [7, 11], [8, 11]]);
  g.spts(f > 0.4 ? M.glow : M.second, [[3, 10], [5, 11]]);
  g.spts(M.white, [[2, 3]]);
  g.pts(M.white, [[7, 3], [8, 3]]);
  if (r.chance(0.5)) g.rect(2, 12, 12, 1, M.accent);
}

function amulet(g, r, f) {
  g.spts(M.metal, [[3, 1], [3, 2], [4, 3], [4, 4], [5, 5], [5, 6], [6, 7]]);
  const shape = r.i(0, 2);
  if (shape === 0) g.ellipse(7.5, 10.5, 3, 3, M.metal);
  if (shape === 1) g.rows(8, [1, 2, 3, 3, 2, 1], M.metal);
  if (shape === 2) g.rect(5, 8, 6, 6, M.metal);
  g.pts(f > 0.4 ? M.glow : M.accent, [[7, 10], [8, 10], [7, 11], [8, 11]]);
  if (r.chance(0.5)) g.pts(M.main, [[7, 9], [8, 9], [7, 12], [8, 12]]);
}

function ring(g, r, f) {
  g.ellipse(7.5, 9.5, 4.5, 4.5, M.metal);
  g.ellipse(7.5, 9.5, 2.5, 2.5, 0);
  const gem = f > 0.5 ? M.glow : M.accent;
  g.rect(6, 3, 4, 3, gem);
  g.pts(gem, [[7, 2], [8, 2]]);
  g.set(6, 3, M.white);
  if (r.chance(0.5)) g.spts(M.main, [[4, 6]]);
}

function tome(g, r, f) {
  g.rect(3, 2, 10, 12, M.main);
  g.rect(3, 2, 2, 12, M.second);
  g.rect(5, 13, 8, 1, M.white);
  g.pts(M.metal, [[12, 2], [12, 12], [5, 2], [5, 12], [11, 7], [12, 7]]);
  const m = f > 0.4 ? M.glow : M.accent;
  for (let i = 0; i < 7; i++) {
    const x = r.i(0, 1), y = r.i(4, 9);
    g.set(8 - x, y, m);
    g.set(9 + x, y, m);
  }
}

function scroll(g, r, f) {
  g.rect(3, 3, 10, 10, M.second);
  g.rect(2, 2, 12, 2, M.wood);
  g.rect(2, 12, 12, 2, M.wood);
  g.pts(M.metal, [[1, 2], [1, 3], [14, 2], [14, 3], [1, 12], [1, 13], [14, 12], [14, 13]]);
  for (const y of [5, 7, 9]) for (let x = 4; x <= 11; x++) if (r.chance(0.7)) g.set(x, y, f > 0.6 ? M.glow : M.ink);
  g.pts(M.accent, [[10, 10], [11, 10], [10, 11], [11, 11]]);
  return { [M.second]: ramp(40, 42, 76) };
}

function key(g, r, f) {
  const main = pickMain(r);
  g.ellipse(7.5, 4, 3, 3, main);
  g.rect(7, 3, 2, 2, 0);
  g.rect(7, 7, 2, 7, main);
  g.pts(main, [[9, 10], [10, 10], [9, 12], [10, 12], [9, 13]]);
  if (r.chance(0.5)) g.pts(main, [[11, 10], [11, 12]]);
  if (r.chance(0.3 + f)) g.pts(f > 0.5 ? M.glow : M.accent, [[7, 1], [8, 1]]);
  g.rect(7, 7, 2, 1, M.accent);
}

function hourglass(g, r, f) {
  g.rows(3, [4, 4, 3, 2, 1, 1, 2, 3, 4, 4], M.second);
  const sand = f > 0.5 ? M.glow : M.accent;
  g.swap(M.second, sand, (x, y) => (y === 4 || y === 5 || y >= 10) && x > 4 && x < 11);
  g.pts(sand, [[7, 8], [8, 9]]);
  g.rect(3, 1, 10, 2, M.metal);
  g.rect(3, 13, 10, 2, M.metal);
  g.rect(3, 3, 1, 10, M.wood);
  g.rect(12, 3, 1, 10, M.wood);
  return { [M.second]: ramp(195, 45, 80) };
}

function bell(g, r, f) {
  const main = pickMain(r);
  g.rect(7, 1, 2, 2, main);
  g.rows(3, [1, 2, 3, 3, 4, 4, 5, 5, 6], main);
  g.rect(7, 12, 2, 2, M.wood);
  g.row(9, 5, M.accent);
  if (r.chance(0.3 + f)) g.pts(f > 0.5 ? M.glow : M.accent, [[7, 6], [8, 6], [7, 7], [8, 7]]);
  if (r.chance(0.5)) g.pts(M.main, [[6, 0], [7, 0], [8, 0], [9, 0]]);
}

function candle(g, r, f) {
  const h = r.i(5, 8);
  g.rect(6, 13 - h, 4, h, M.second);
  g.rect(3, 13, 10, 1, M.metal);
  g.rect(5, 14, 6, 1, M.metal);
  g.pts(M.metal, [[2, 12], [13, 12]]);
  const top = 13 - h;
  g.pts(M.glow, [[7, top - 1], [8, top - 1], [7, top - 2], [8, top - 2], [7, top - 3]]);
  g.set(8, top - 1, M.accent);
  if (r.chance(0.6)) g.pts(M.second, [[5, top + 1], [5, top + 2], [10, top + 1]]);
  return { [M.second]: ramp(45 + r() * 300 * f, 30 + f * 40, 80) };
}

function idol(g, r, f) {
  g.rect(5, 2, 6, 10, M.main);
  g.rect(4, 12, 8, 2, M.main);
  g.spts(M.main, [[4, 4], [3, 3], [4, 8], [3, 8]]);
  g.spts(f > 0.3 ? M.glow : M.ink, [[6, 4]]);
  g.pts(M.ink, [[7, 7], [8, 7], [6, 8], [9, 8]].slice(0, r.i(2, 4)));
  for (let i = 0; i < 4; i++) g.sym(r.i(5, 7), r.i(9, 11), M.second);
  if (r.chance(0.5)) g.pts(M.accent, [[7, 1], [8, 1], [7, 0], [8, 0]]);
  g.rect(4, 13, 8, 1, M.second);
}

export const RELICS = [
  { n: 'Kelch', d: chalice },
  { n: 'Krone', d: crown },
  { n: 'Amulett', d: amulet },
  { n: 'Ring', d: ring },
  { n: 'Foliant', d: tome },
  { n: 'Schriftrolle', d: scroll },
  { n: 'Schlüssel', d: key },
  { n: 'Sanduhr', d: hourglass },
  { n: 'Glocke', d: bell },
  { n: 'Kerze', d: candle },
  { n: 'Götze', d: idol },
];

// ---------------------------------------------------------------- Artefakte

function gem(g, r, f) {
  const cut = r.i(0, 2);
  if (cut === 0) g.rows(2, [3, 5, 6, 6, 5, 4, 3, 3, 2, 1, 1], M.main);
  if (cut === 1) g.rows(2, [4, 5, 6, 6, 6, 6, 6, 6, 6, 5, 4], M.main);
  if (cut === 2) g.rows(1, [1, 2, 3, 4, 5, 6, 6, 5, 4, 3, 2, 1], M.main);
  g.swap(M.main, M.second, (x, y) => x < 8 && y < 6 && (x + y) % 2 === 0);
  g.swap(M.main, M.accent, (x, y) => x > 8 && y > 6 && (x + y) % 3 === 0);
  g.pts(M.white, [[5, 4], [6, 3], [5, 3]].filter(([x, y]) => g.get(x, y)));
  if (r.chance(f)) g.pts(M.glow, [[7, 6], [8, 6], [7, 7], [8, 7]]);
}

function crystal(g, r, f) {
  const shard = (cx, top, bottom, w, m) => {
    for (let y = top; y <= bottom; y++) {
      const half = Math.min(w, y - top);
      for (let x = cx - half; x <= cx + half + (w > 1 ? 1 : 0); x++) g.set(x, y, m);
    }
  };
  shard(3, 6 + r.i(0, 2), 13, 1, M.second);
  shard(11, 5 + r.i(0, 3), 13, 1, M.second);
  shard(7, 1 + r.i(0, 1), 13, 2, M.main);
  g.rect(2, 13, 12, 2, M.wood);
  g.pts(0, [[2, 14], [13, 14]]);
  if (r.chance(0.3 + f)) for (let y = 4; y <= 11; y++) g.set(7, y, M.glow);
  g.pts(M.white, [[6, 5], [6, 6]]);
  return { [M.wood]: ramp(250, 10, 36) };
}

function orb(g, r, f) {
  g.rows(11, [2, 3, 4], M.metal);
  g.spts(M.metal, [[3, 9], [3, 10], [4, 10]]);
  g.ellipse(7.5, 6.5, 4.5, 4.5, M.main);
  for (let i = 0; i < 6; i++) g.set(r.i(5, 10), r.i(4, 9), f > 0.4 ? M.glow : M.second);
  g.pts(M.white, [[5, 4], [6, 3], [5, 5]]);
  if (r.chance(f)) g.pts(M.accent, [[7, 6], [8, 6], [7, 7], [8, 7]]);
}

function runestone(g, r, f) {
  g.ellipse(7.5, 8, 5, 6, M.second);
  g.pts(0, [[3, 4], [12, 11], [3, 12]].slice(0, r.i(0, 3)));
  const m = f > 0.2 ? M.glow : M.accent;
  for (let y = 4; y <= 11; y++) {
    for (let hx = 0; hx < 3; hx++) if (r.chance(0.42)) g.sym(7 - hx, y, m);
  }
  if (r.chance(0.5)) g.spts(M.main, [[4, 12], [5, 13]]);
  return { [M.second]: ramp(240 + r() * 40, 8 + f * 20, 50) };
}

function vial(g, r, f) {
  g.rect(6, 1, 4, 1, M.wood);
  g.rect(6, 2, 4, 3, M.second);
  const round = r.chance(0.6);
  if (round) g.ellipse(7.5, 9.5, 4.5, 4, M.second);
  else g.rows(5, [2, 3, 4, 5, 5, 5, 5, 5, 5], M.second);
  const level = r.i(7, 9);
  g.swap(M.second, M.main, (x, y) => y >= level && !g.onEdge(x, y));
  for (let i = 0; i < 3; i++) g.set(r.i(5, 10), r.i(level, 12), f > 0.4 ? M.glow : M.white);
  g.set(5, 7, M.white);
  if (r.chance(0.5)) g.rect(6, 4, 4, 1, M.accent);
  return { [M.second]: ramp(190, 30, 82) };
}

function device(g, r, f) {
  g.rect(3, 3, 10, 10, M.metal);
  for (let y = 4; y <= 11; y++) {
    for (let hx = 0; hx < 4; hx++) {
      if (r.chance(0.4)) g.sym(7 - hx, y, r.chance(0.6) ? M.main : M.second);
    }
  }
  g.pts(M.glow, [[7, 7], [8, 7], [7, 8], [8, 8]]);
  g.spts(M.accent, [[3, 3], [3, 12]]);
  if (r.chance(0.6)) g.spts(M.metal, [[5, 2], [5, 1]]);
  if (r.chance(0.6)) g.spts(M.metal, [[4, 13], [4, 14]]);
  if (r.chance(f)) g.spts(M.glow, [[5, 0]]);
  if (r.chance(0.5)) g.spts(M.metal, [[2, 7], [1, 7], [2, 8]]);
}

function mask(g, r, f) {
  if (r.chance(0.5 + f / 2)) g.spts(M.second, [[4, 1], [4, 0], [6, 1], [2, 2], [2, 1]]);
  g.ellipse(7.5, 8, 5, 6, M.main);
  g.spts(M.ink, [[4, 6], [5, 6]]);
  if (f > 0.5) g.spts(M.glow, [[5, 6]]);
  g.pts(M.ink, [[6, 11], [7, 11], [8, 11], [9, 11]]);
  if (r.chance(0.5)) g.pts(M.white, [[6, 12], [9, 12]]);
  g.pts(M.second, [[7, 7], [8, 7], [7, 8], [8, 8], [7, 9], [8, 9]]);
  for (let i = 0; i < 5; i++) g.sym(r.i(3, 6), r.i(3, 12), M.accent);
  g.spts(M.accent, [[3, 8]]);
}

function obelisk(g, r, f) {
  g.row(1, 1, M.main);
  g.row(2, 2, M.main);
  g.rect(5, 3, 6, 10, M.main);
  g.rect(3, 13, 10, 2, M.second);
  const m = f > 0.2 ? M.glow : M.accent;
  for (let y = 4; y <= 11; y++) if (r.chance(0.6)) g.set(r.i(6, 9), y, m);
  g.pts(m, [[7, 2], [8, 2]]);
  if (r.chance(f)) g.spts(M.glow, [[2, 6], [3, 9]]);
  return { [M.main]: ramp(220 + r() * 80, 12 + f * 40, 40 + f * 10) };
}

function star(g, r, f) {
  const big = r.chance(0.5);
  for (let y = 1; y <= 14; y++) {
    for (let x = 1; x <= 14; x++) {
      const dx = Math.abs(x - 7.5), dy = Math.abs(y - 7.5);
      const arms = (dx < 1 || dy < 1) && dx + dy <= 7;
      const core = dx + dy <= (big ? 4 : 3);
      const diagonal = big && Math.abs(dx - dy) < 1 && dx <= 4;
      if (arms || core || diagonal) g.set(x, y, M.main);
    }
  }
  g.ellipse(7.5, 7.5, 1.5, 1.5, M.glow);
  if (r.chance(0.5)) g.spts(M.second, [[5, 7], [5, 8]]);
  return { [M.main]: ramp(40 + r() * 320 * Math.min(1, f * 2), 60 + f * 30, 60) };
}

function compass(g, r, f) {
  g.rect(7, 0, 2, 2, M.metal);
  g.ellipse(7.5, 8.5, 6, 6, M.metal);
  g.ellipse(7.5, 8.5, 4.5, 4.5, M.white);
  g.pts(M.accent, [[7, 5], [8, 6], [7, 6], [8, 7], [7, 7]]);
  g.pts(M.ink, [[8, 8], [7, 9], [8, 9], [7, 10], [8, 10], [8, 11]]);
  g.spts(f > 0.5 ? M.glow : M.main, [[4, 8]]);
  g.pts(f > 0.5 ? M.glow : M.main, [[7, 12], [8, 4]]);
  if (r.chance(0.5)) g.spts(M.accent, [[2, 8]]);
}

export const ARTIFACTS = [
  { n: 'Edelstein', d: gem },
  { n: 'Kristall', d: crystal },
  { n: 'Kugel', d: orb },
  { n: 'Runenstein', d: runestone },
  { n: 'Phiole', d: vial },
  { n: 'Apparat', d: device },
  { n: 'Maske', d: mask },
  { n: 'Obelisk', d: obelisk },
  { n: 'Sternsplitter', d: star },
  { n: 'Kompass', d: compass },
];
