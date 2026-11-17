import { M, ramp } from './core.js';

// Gartenpflanzen und ein Teebecher für die Küche.

export function carrot(g) {
  g.rows(5, [3, 3, 3, 2, 2, 2, 1, 1, 1], M.main);
  g.pts(M.second, [[7, 2], [8, 1], [6, 1], [9, 3], [6, 3], [8, 4], [7, 4]]);
  g.pts(M.ink, [[6, 7], [9, 9], [7, 11]]);
  return { [M.main]: ramp(24, 85, 52), [M.second]: ramp(120, 55, 40) };
}

export function wheat(g) {
  for (const x of [5, 8, 11]) {
    g.line(x, 14, x + (x === 8 ? 0 : x < 8 ? -1 : 1), 6, M.second);
    g.ellipse(x + (x === 8 ? 0 : x < 8 ? -1 : 1), 4.5, 1, 2.5, M.main);
  }
  return { [M.main]: ramp(44, 75, 58), [M.second]: ramp(40, 50, 40) };
}

export function potato(g) {
  g.ellipse(7.5, 9, 5.5, 4, M.main);
  g.ellipse(5, 6.5, 3, 2.5, M.main);
  g.pts(M.second, [[5, 9], [9, 7], [10, 11], [6, 12]]);
  return { [M.main]: ramp(30, 40, 50), [M.second]: ramp(25, 40, 32) };
}

export function berries(g) {
  g.pts(M.second, [[7, 1], [8, 2], [9, 2], [6, 2], [8, 3]]);
  for (const [x, y] of [[5, 6], [9, 6], [7, 9], [4, 10], [10, 10], [7, 13]]) g.ellipse(x, y, 1.8, 1.8, M.main);
  g.pts(M.white, [[4, 5], [8, 5], [6, 8]]);
  return { [M.main]: ramp(345, 70, 45), [M.second]: ramp(120, 50, 38) };
}

export function pumpkin(g) {
  g.ellipse(7.5, 9, 6.5, 5, M.main);
  for (const x of [5, 7, 8, 10]) for (let y = 6; y <= 12; y++) if (g.get(x, y)) g.set(x, y, x === 7 || x === 8 ? M.main : M.second);
  g.pts(M.wood, [[7, 3], [8, 3], [8, 2]]);
  g.pts(M.accent, [[9, 3], [10, 3], [10, 2]]);
  return { [M.main]: ramp(28, 85, 55), [M.second]: ramp(22, 80, 42), [M.wood]: ramp(30, 40, 28), [M.accent]: ramp(110, 50, 40) };
}

export function starflower(g) {
  g.line(7, 15, 7, 8, M.second);
  g.pts(M.second, [[8, 12], [9, 11], [6, 13], [5, 12]]);
  for (const [dx, dy] of [[0, -4], [4, -1], [2, 3], [-2, 3], [-4, -1]]) g.ellipse(7.5 + dx * 0.9, 5 + dy * 0.9, 1.6, 1.6, M.main);
  g.ellipse(7.5, 5, 1.6, 1.6, M.glow);
  return { [M.main]: ramp(275, 70, 66), [M.second]: ramp(140, 45, 38) };
}

export function teacup(g) {
  g.rows(6, [5, 5, 5, 4, 4, 3, 3], M.main);
  g.pts(M.main, [[13, 8], [14, 9], [13, 10]]);
  g.row(5, 5, M.second);
  g.row(13, 6, M.white);
  g.pts(M.white, [[6, 1], [7, 2], [6, 3], [9, 2], [10, 3]]);
  g.pts(M.glow, [[8, 5], [7, 5]]);
  return { [M.main]: ramp(200, 30, 80), [M.second]: ramp(275, 60, 55) };
}
