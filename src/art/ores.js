import { M, ramp } from './core.js';

// Erzbrocken je Rang und der Erzhändler.

export const ORE_COLORS = [
  [24, 70, 52], // Kupfer
  [215, 12, 70], // Eisen
  [200, 30, 85], // Silber
  [45, 90, 58], // Gold
  [172, 70, 66], // Mithril
  [300, 80, 70], // Sternenerz
];

export function oreDraw(tier) {
  return (g, r) => {
    g.rows(5, [3, 5, 6, 6, 7, 7, 7, 6], M.second);
    g.pts(0, [[1, 12], [14, 12], [2, 5], [13, 5]]);
    for (let i = 0; i < 4 + tier; i++) {
      const x = r.i(3, 12);
      const y = r.i(6, 11);
      g.set(x, y, M.main);
      if (r.chance(0.6)) g.set(x + 1, y, M.main);
      if (r.chance(0.4)) g.set(x, y - 1, M.main);
    }
    if (tier >= 2) g.pts(M.white, [[6, 7], [10, 9]]);
    if (tier >= 4) g.pts(M.glow, [[8, 8], [5, 10]]);
    return { [M.main]: ramp(...ORE_COLORS[tier]), [M.second]: ramp(30, 10, 34 + tier * 2) };
  };
}

// Reisender Händler: Kapuze, großer Rucksack voller Waren, sitzend
export function traderDraw(g) {
  g.rect(1, 3, 6, 9, M.wood);
  g.rect(1, 3, 6, 1, M.second);
  g.pts(M.accent, [[2, 5], [3, 6], [5, 5], [4, 8]]);
  g.pts(M.metal, [[2, 1], [3, 2], [4, 2], [5, 1]]);
  g.rect(6, 2, 6, 6, M.main);
  g.rect(7, 4, 4, 4, M.skin);
  g.pts(M.ink, [[9, 5]]);
  g.rect(6, 8, 7, 4, M.main);
  g.rect(12, 9, 2, 2, M.skin);
  g.rect(5, 12, 10, 2, M.second);
  g.pts(M.wood, [[13, 12], [14, 13]]);
  return { [M.main]: ramp(150, 30, 36), [M.second]: ramp(25, 40, 32), [M.skin]: ramp(26, 50, 70) };
}
