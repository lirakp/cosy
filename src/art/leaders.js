import { M, ramp } from './core.js';
import { body } from './heroes.js';

// Die drei Expeditionsleiter. Jede Figur hat sechs Bilder (Rang D bis SS):
// Mit jeder Entwicklung kommt Ausrüstung dazu, und die Farben werden edler.

const tierOf = (f) => Math.round(f * 5);

function mira(g, r, f) {
  const t = tierOf(f);
  const over = body(g, r, f, { hair: 2, cape: t >= 4, skin: ramp(25, 50, 68), hairColor: ramp(15, 70, 45) });
  g.rect(3, 2, 10, 1, M.wood);
  g.rect(5, 0, 6, 2, M.wood);
  g.pts(M.wood, [[12, 7], [12, 8], [12, 9]]);
  if (t >= 1) g.rect(5, 1, 6, 1, M.accent);
  if (t >= 2) g.pts(M.white, [[2, 9], [3, 9], [2, 10], [3, 10]]);
  if (t >= 3) {
    g.rect(13, 4, 1, 10, M.wood);
    g.pts(M.glow, [[13, 3], [13, 2], [12, 3], [14, 3]]);
  }
  if (t >= 5) g.pts(M.glow, [[7, 1], [8, 1], [7, 8], [8, 8]]);
  return over;
}

function bodo(g, r, f) {
  const t = tierOf(f);
  const over = body(g, r, f, { hair: 1, cape: false, skin: ramp(28, 55, 78), hairColor: ramp(30, 10, 82) });
  g.rect(4, 8, 8, 3, M.main);
  g.pts(M.skin, [[3, 10], [12, 10]]);
  g.pts(M.white, [[6, 6], [7, 6], [8, 6], [9, 6], [7, 7], [8, 7]]);
  g.ellipse(1.5, 11.5, 1.5, 1.5, M.wood);
  g.set(2, 9, M.wood);
  if (t >= 1) g.pts(M.metal, [[10, 4], [11, 5]]);
  if (t >= 2) g.pts(M.glow, [[6, 8], [7, 9], [8, 9], [9, 8]]);
  if (t >= 3 && t < 4) g.rect(5, 0, 6, 2, M.second);
  if (t >= 4) {
    g.rect(5, 1, 6, 1, M.metal);
    g.pts(M.metal, [[5, 0], [7, 0], [8, 0], [10, 0]]);
  }
  if (t >= 3) g.pts(M.glow, [[1, 11], [2, 12]]);
  if (t >= 5) g.pts(M.glow, [[13, 5], [14, 8], [13, 12], [0, 7]]);
  return { ...over, [M.second]: ramp(260, 20, 24) };
}

function yuna(g, r, f) {
  const t = tierOf(f);
  const over = body(g, r, f, { hair: 0, cape: t >= 4, skin: ramp(22, 45, 55), hairColor: ramp(260, 10, 18) });
  g.rect(4, 1, 8, 2, M.main);
  g.rect(4, 3, 1, 4, M.main);
  g.rect(11, 3, 1, 4, M.main);
  g.pts(M.metal, [[12, 9], [13, 8], [14, 7]]);
  g.set(14, 6, M.white);
  if (t >= 1) g.pts(M.wood, [[12, 6], [13, 5], [13, 4]]);
  if (t >= 2) g.pts(M.white, [[11, 0], [12, 0], [12, 1]]);
  if (t >= 3) {
    g.ellipse(2, 6, 1.5, 1.5, M.second);
    g.set(2, 6, t >= 4 ? M.glow : M.ink);
    g.set(3, 7, M.accent);
    g.pts(M.second, [[1, 4], [3, 4]]);
  }
  if (t >= 5) g.pts(M.glow, [[6, 4], [9, 4], [7, 8], [8, 8]]);
  return over;
}

export const LEADER_ART = { mira, bodo, yuna };
