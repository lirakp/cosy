import { M, ramp } from './core.js';

// Helden: eine gemeinsame Grundfigur, die je nach Klasse eingekleidet wird.

const SKIN = [[28, 55, 78], [25, 50, 68], [22, 45, 55], [20, 40, 42], [30, 60, 84]];
const HAIR = [[25, 45, 28], [42, 72, 62], [15, 70, 45], [260, 10, 18], [30, 10, 82]];

export function body(g, r, f, o = {}) {
  const over = {
    [M.skin]: o.skin ?? ramp(...r.pick(SKIN)),
    [M.hair]: o.hairColor ?? (f > 0.5 && r.chance(0.5) ? ramp(r() * 360, 70, 60) : ramp(...r.pick(HAIR))),
  };
  const top = o.bare ? M.skin : M.main;

  if (o.cape ?? r.chance(f * 0.7)) {
    g.rect(3, 7, 10, 6, M.accent);
    g.pts(0, [[3, 7], [12, 7]]);
  }
  if (o.robe) {
    g.rect(5, 11, 6, 3, M.main);
    g.rect(4, 12, 8, 2, M.main);
    g.rect(4, 13, 8, 1, M.accent);
  } else {
    g.rect(5, 11, 2, 2, M.second);
    g.rect(9, 11, 2, 2, M.second);
    g.rect(7, 11, 2, 1, M.second);
    g.rect(5, 13, 2, 1, M.wood);
    g.rect(9, 13, 2, 1, M.wood);
  }
  g.rect(5, 7, 6, 4, top);
  g.rect(4, 7, 1, 3, top);
  g.rect(11, 7, 1, 3, top);
  g.pts(M.skin, [[4, 10], [11, 10]]);
  if (!o.robe) g.rect(5, 10, 6, 1, M.wood);

  g.rect(5, 2, 6, 5, M.skin);
  g.pts(M.ink, [[6, 4], [9, 4]]);
  const hair = o.hair ?? r.i(1, 2);
  if (hair > 0) {
    g.rect(5, 1, 6, 2, M.hair);
    g.pts(M.hair, [[5, 3], [10, 3]]);
  }
  if (hair === 2) {
    g.rect(4, 2, 1, 6, M.hair);
    g.rect(11, 2, 1, 6, M.hair);
  }
  return over;
}

function knight(g, r, f) {
  const over = body(g, r, f, { hair: 0 });
  g.rect(5, 7, 6, 3, M.metal);
  g.pts(M.main, [[7, 8], [8, 8]]);
  g.rect(5, 1, 6, 3, M.metal);
  g.rect(4, 2, 1, 4, M.metal);
  g.rect(11, 2, 1, 4, M.metal);
  if (r.chance(0.5)) {
    g.rect(5, 4, 6, 3, M.metal);
    g.rect(6, 4, 4, 1, M.ink);
  }
  g.pts(M.accent, [[7, 0], [8, 0]]);
  g.rect(13, 2, 1, 7, M.metal);
  g.rect(12, 9, 3, 1, M.accent);
  g.set(13, 10, M.wood);
  g.rect(1, 7, 3, 5, M.main);
  g.rect(1, 7, 3, 1, M.metal);
  g.set(2, 9, f > 0.5 ? M.glow : M.accent);
  return over;
}

function mage(g, r, f) {
  const over = body(g, r, f, { robe: true });
  g.rect(3, 2, 10, 1, M.main);
  g.rect(5, 1, 6, 1, M.main);
  g.rect(7, 0, 3, 1, M.main);
  g.set(8, 1, f > 0.3 ? M.glow : M.accent);
  if (r.chance(0.5)) g.pts(M.white, [[6, 6], [7, 6], [8, 6], [9, 6], [7, 7], [8, 7]]);
  g.rect(13, 3, 1, 11, M.wood);
  g.rect(12, 1, 2, 2, M.glow);
  return over;
}

function rogue(g, r, f) {
  const over = body(g, r, f, { hair: 0 });
  g.rect(4, 1, 8, 2, M.main);
  g.rect(4, 3, 1, 4, M.main);
  g.rect(11, 3, 1, 4, M.main);
  g.rect(5, 6, 6, 1, M.accent);
  g.pts(M.metal, [[3, 9], [3, 8], [12, 9], [12, 8]]);
  if (f > 0.5) g.pts(M.glow, [[3, 7], [12, 7]]);
  return over;
}

function ranger(g, r, f) {
  const over = body(g, r, f);
  g.rect(4, 2, 8, 1, M.accent);
  g.rect(5, 1, 6, 1, M.accent);
  g.pts(M.white, [[10, 0], [11, 0]]);
  g.pts(M.wood, [[2, 5], [1, 6], [1, 7], [1, 8], [1, 9], [1, 10], [2, 11]]);
  for (let y = 6; y <= 10; y++) g.set(3, y, M.white);
  g.pts(M.wood, [[12, 6], [13, 5]]);
  g.set(13, 4, f > 0.5 ? M.glow : M.metal);
  return over;
}

function paladin(g, r, f) {
  const over = body(g, r, f, { cape: true });
  g.rect(5, 7, 6, 3, M.metal);
  g.pts(M.glow, [[7, 8], [8, 8]]);
  g.rect(5, 1, 6, 2, M.metal);
  g.spts(M.white, [[4, 2], [4, 1], [3, 1]]);
  g.rect(13, 6, 1, 8, M.wood);
  g.rect(12, 3, 3, 3, M.metal);
  g.set(13, 4, f > 0.5 ? M.glow : M.accent);
  return over;
}

function bard(g, r, f) {
  const over = body(g, r, f);
  g.rect(5, 1, 6, 1, M.accent);
  g.rect(4, 2, 6, 1, M.accent);
  g.pts(M.white, [[10, 0], [11, 1]]);
  g.pts(M.wood, [[2, 10], [3, 10], [2, 11], [3, 11], [1, 10], [1, 11], [3, 9], [4, 8]]);
  g.set(2, 10, M.ink);
  g.pts(f > 0.4 ? M.glow : M.white, [[13, 3], [13, 4], [13, 5], [12, 5]]);
  return over;
}

function monk(g, r, f) {
  const over = body(g, r, f, { robe: true, hair: 0 });
  g.rect(5, 2, 6, 1, M.accent);
  g.pts(M.accent, [[6, 7], [7, 8], [8, 8], [9, 7]]);
  g.rect(13, 2, 1, 12, M.wood);
  if (f > 0.4) g.pts(M.glow, [[13, 2], [13, 13]]);
  return over;
}

function witch(g, r, f) {
  const over = body(g, r, f, { robe: true, hair: 2 });
  g.rect(2, 2, 12, 1, M.second);
  g.rect(5, 1, 6, 1, M.second);
  g.rect(7, 0, 3, 1, M.second);
  g.pts(M.accent, [[7, 1], [8, 1]]);
  g.rect(12, 9, 2, 2, M.glow);
  if (r.chance(0.5)) g.pts(M.glow, [[13, 7], [14, 8]]);
  return { ...over, [M.second]: ramp(270, 25, 26) };
}

function queen(g, r, f) {
  const over = body(g, r, f, { robe: true, hair: 2 });
  g.rect(5, 1, 6, 1, M.metal);
  g.pts(M.metal, [[5, 0], [7, 0], [8, 0], [10, 0]]);
  g.set(r.i(7, 8), 1, M.accent);
  g.rect(3, 12, 10, 2, M.main);
  g.rect(3, 13, 10, 1, M.accent);
  g.rect(13, 4, 1, 8, M.metal);
  g.pts(M.glow, [[13, 2], [13, 3], [12, 3], [14, 3]]);
  return over;
}

function berserker(g, r, f) {
  const over = body(g, r, f, { bare: true, hair: 2 });
  g.pts(M.wood, [[6, 7], [7, 8], [8, 9]]);
  g.rect(5, 1, 6, 1, M.metal);
  g.spts(M.white, [[4, 1], [3, 0]]);
  g.pts(M.accent, [[5, 5], [10, 5]]);
  g.rect(13, 3, 1, 10, M.wood);
  g.pts(M.metal, [[12, 2], [12, 3], [12, 4], [14, 2], [14, 3], [14, 4], [11, 3]]);
  if (f > 0.5) g.set(13, 3, M.glow);
  return over;
}

export const HEROES = [
  { n: 'Ritter', d: knight },
  { n: 'Magier', d: mage },
  { n: 'Schurke', d: rogue },
  { n: 'Waldläufer', d: ranger },
  { n: 'Paladin', d: paladin },
  { n: 'Barde', d: bard },
  { n: 'Mönch', d: monk },
  { n: 'Hexe', d: witch },
  { n: 'Königin', d: queen },
  { n: 'Berserker', d: berserker },
];
