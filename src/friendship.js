import { RARITIES, worldItems, rollItem } from './items.js';
import { state } from './state.js';

// Freundschaft mit den Dorfbewohnern: Jede erledigte Aufgabe bringt Herzen.
// Mit jeder Stufe (1–5) wächst ein dauerhafter Bonus, der zur Person passt,
// und es gibt ein Geschenk. Auf der höchsten Stufe schenkt die Person ein
// seltenes Sammelstück (Rang S oder SS). Sind alle fünf Bewohner einer Welt beste
// Freunde, gibt es die Zunft-Tracht dieser Welt (Kleiderschrank, mit Bonus).

export const MAX_LEVEL = 5;
// Herzen insgesamt für Stufe 1 … 5
export const LEVELS = [3, 8, 15, 25, 40];
// Herzen je Aufgabe nach Schwierigkeit
export const HEARTS = { leicht: 1, mittel: 2, schwer: 3 };

// Bonus auf der höchsten Stufe (wächst gleichmäßig je Stufe)
export const FRIENDS = {
  // Heimatdorf
  greta: { world: 'normal', bonus: { buffTime: 0.5, questGold: 0.2 } },
  ole: { world: 'normal', bonus: { fishing: 0.4, mana: 0.1 } },
  anton: { world: 'normal', bonus: { building: 0.15, questGold: 0.2 } },
  lotte: { world: 'normal', bonus: { garden: 0.3, mine: 0.1 } },
  jonas: { world: 'normal', bonus: { expedition: 0.25, power: 0.08 } },
  // Hölle
  kohla: { world: 'hoelle', bonus: { buffTime: 0.5, minigame: 0.25 } },
  brandolf: { world: 'hoelle', bonus: { forge: 0.4, mine: 0.15 } },
  asmund: { world: 'hoelle', bonus: { building: 0.15, dungeonGold: 0.2 } },
  flamma: { world: 'hoelle', bonus: { garden: 0.3, silk: 0.05 } },
  grimm: { world: 'hoelle', bonus: { power: 0.1, dungeonGold: 0.2 } },
  // Himmel
  aurelia: { world: 'himmel', bonus: { buffTime: 0.5, questGold: 0.2 } },
  cirrus: { world: 'himmel', bonus: { stars: 0.5, minigame: 0.25 } },
  lumen: { world: 'himmel', bonus: { building: 0.15, taler: 0.1 } },
  celeste: { world: 'himmel', bonus: { garden: 0.3, mana: 0.2 } },
  zephyr: { world: 'himmel', bonus: { expedition: 0.25, luckWish: 0.05 } },
};
// Zunft-Tracht je Welt (siehe OUTFITS in sprites.js)
export const OUTFIT = { normal: 'dorftracht', hoelle: 'glutzunft', himmel: 'wolkenzunft' };
// Geschenke beim Erreichen der Stufen 1 … 4 (Stufe 5: Sammelstück S/SS)
export const LEVEL_GIFTS = [
  { taler: 5, stern: 0 },
  { taler: 10, stern: 0 },
  { taler: 20, stern: 1 },
  { taler: 30, stern: 2 },
];

const v = () => state.village;
const hearts = () => (v().hearts ||= {});
export const heartsOf = (id) => hearts()[id] || 0;
export const level = (id) => LEVELS.filter((n) => heartsOf(id) >= n).length;
export const isFriend = (id) => !!FRIENDS[id];
// Fortschritt zur nächsten Stufe (0 … 1) und wie viele Herzen noch fehlen
export function progress(id) {
  const l = level(id);
  if (l >= MAX_LEVEL) return { share: 1, missing: 0, next: null };
  const from = l ? LEVELS[l - 1] : 0;
  const to = LEVELS[l];
  return { share: (heartsOf(id) - from) / (to - from), missing: to - heartsOf(id), next: to };
}

// Bonus einer Person auf ihrer Stufe
export function bonusOf(id, lv = level(id)) {
  const f = FRIENDS[id];
  if (!f || !lv) return {};
  return Object.fromEntries(Object.entries(f.bonus).map(([k, val]) => [k, Math.round(val * (lv / MAX_LEVEL) * 1000) / 1000]));
}
// Summe aller Freundschaften für eine Bonus-Art
export const bonus = (kind) => Object.keys(FRIENDS).reduce((s, id) => s + (bonusOf(id)[kind] || 0), 0);

export const outfitUnlocked = (outfitId) => (v().outfits || []).includes(outfitId);
export const allBest = (world) => Object.entries(FRIENDS).filter(([, f]) => f.world === world).every(([id]) => level(id) >= MAX_LEVEL);

function giveCoins(taler, stern) {
  const c = (state.well.coins ||= { taler: 0, stern: 0, splinters: 0 });
  c.taler = (c.taler || 0) + taler;
  c.stern = (c.stern || 0) + stern;
}

// Ein seltenes Stück der Welt der Person – bevorzugt eines, das noch fehlt
function rareGift(world, r) {
  const missing = worldItems(world).filter((i) => i.tier >= 4 && !state.count(i.id));
  if (missing.length) return missing[Math.floor(r() * missing.length)];
  return rollItem({ minTier: 4, world, random: r });
}

// Herzen dazu. Liefert die erreichten Stufen mit ihren Geschenken:
//   [{ level, taler, stern, item, isNew, outfit }]
export function addHearts(id, n, r = Math.random) {
  if (!FRIENDS[id] || n <= 0) return [];
  const before = level(id);
  hearts()[id] = heartsOf(id) + n;
  const after = level(id);
  const ups = [];
  for (let l = before + 1; l <= after; l++) {
    const up = { level: l, taler: 0, stern: 0, item: null, isNew: false, outfit: null };
    if (l < MAX_LEVEL) {
      Object.assign(up, LEVEL_GIFTS[l - 1]);
      giveCoins(up.taler, up.stern);
    } else {
      up.item = rareGift(FRIENDS[id].world, r);
      up.isNew = !state.count(up.item.id);
      state.addItems([up.item], 'freundschaft');
      const world = FRIENDS[id].world;
      if (allBest(world) && !outfitUnlocked(OUTFIT[world])) {
        v().outfits = [...(v().outfits || []), OUTFIT[world]];
        up.outfit = OUTFIT[world];
      }
    }
    ups.push(up);
  }
  state.changed();
  return ups;
}

export const rankOfLevel = (l) => RARITIES[Math.min(5, l)].id;
