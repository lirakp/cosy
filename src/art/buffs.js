import { M, ramp } from './core.js';

// Symbole der Rausch-Effekte.

export function goldIcon(g) {
  // eine große Goldmünze mit Rand und Glanz, dahinter eine kleinere
  g.ellipse(12, 11.5, 3, 3, M.accent);
  g.ellipse(6.5, 7, 6, 6, M.metal);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 6.5, y - 7);
      if (d > 4 && d < 5) g.set(x, y, M.accent);
    }
  }
  g.rect(6, 4, 2, 6, M.accent);
  g.pts(M.accent, [[5, 5], [8, 8]]);
  g.pts(M.glow, [[3, 4], [4, 3]]);
  return { [M.accent]: { h: 36, s: 75, l: 40 } };
}

export function luckIcon(g) {
  for (const [cx, cy] of [[5, 4.5], [10, 4.5], [5, 9], [10, 9]]) g.ellipse(cx, cy, 2.6, 2.6, M.main);
  g.pts(M.second, [[7, 6], [8, 6], [7, 7], [8, 7]]);
  g.pts(M.wood, [[8, 11], [9, 12], [10, 13], [10, 14]]);
  g.pts(M.glow, [[4, 3], [9, 3]]);
  return { [M.main]: ramp(128, 60, 44), [M.second]: ramp(110, 60, 62), [M.wood]: ramp(100, 40, 30) };
}

export function gladiatorIcon(g) {
  g.diag(2, 13, 11, M.metal, 2);
  for (let t = 0; t < 11; t++) {
    g.set(13 - t, 13 - t, M.metal);
    g.set(12 - t, 13 - t, M.metal);
  }
  g.pts(M.accent, [[2, 10], [3, 11], [4, 12], [5, 13], [13, 10], [12, 11], [11, 12], [10, 13]]);
  g.pts(M.wood, [[1, 14], [2, 14], [14, 14], [13, 14]]);
  g.pts(M.glow, [[7, 7], [8, 7]]);
  return { [M.accent]: ramp(0, 60, 45) };
}
