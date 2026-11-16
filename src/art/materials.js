import { M } from './core.js';

// Arena-Beute: Stoffballen und Seidenspulen, je Rang in edleren Farben.

export function cloth(g, r, f) {
  g.rect(2, 9, 12, 5, M.main);
  g.rect(3, 5, 11, 4, M.second);
  g.rect(2, 11, 12, 1, M.accent);
  g.rect(3, 7, 11, 1, M.main);
  g.pts(M.second, [[13, 9], [14, 10], [14, 11]]);
  g.pts(M.ink, [[2, 9], [3, 9], [4, 9]]);
  if (f > 0.3) for (const x of [4, 7, 10]) g.set(x, 13, M.white);
  if (f > 0.5) g.pts(M.glow, [[5, 6], [8, 6], [11, 6]]);
  g.rect(6, 3, 4, 2, M.wood);
  g.pts(M.wood, [[5, 5], [10, 5]]);
}

export function silk(g, r, f) {
  g.rect(4, 2, 8, 2, M.wood);
  g.rect(4, 12, 8, 2, M.wood);
  g.rect(5, 4, 6, 8, M.main);
  for (const y of [5, 7, 9, 11]) g.rect(5, y, 6, 1, M.second);
  g.rect(6, 4, 1, 8, M.white);
  g.pts(M.main, [[11, 9], [12, 10], [13, 10], [14, 11], [14, 12]]);
  if (f > 0.3) g.pts(M.accent, [[7, 2], [8, 2]]);
  if (f > 0.5) g.pts(M.glow, [[8, 6], [9, 8], [8, 10]]);
}
