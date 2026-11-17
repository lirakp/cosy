import { render } from './art/core.js';
import { CREATURES, MONSTERS } from './art/living.js';
import { WEAPONS, ARMOR } from './art/gear.js';
import { RELICS, ARTIFACTS } from './art/treasure.js';
import { HEROES } from './art/heroes.js';

// Der Katalog aller Sammelstücke: 6 Ränge × 7 Kategorien × 50 Stück = 2100.

export const PER_GROUP = 50;

// chance: Ziehwahrscheinlichkeit · sell: Gold für ein Duplikat
export const RARITIES = [
  { id: 'D', chance: 0.48, sell: 10 },
  { id: 'C', chance: 0.27, sell: 20 },
  { id: 'B', chance: 0.16, sell: 40 },
  { id: 'A', chance: 0.074, sell: 100 },
  { id: 'S', chance: 0.015, sell: 500 },
  { id: 'SS', chance: 0.001, sell: 5000 },
];

// Ab diesem Rang (A) gibt es nach dem Ziehen ein eigenes Pop-up.
export const HIGHLIGHT_TIER = 3;

export const CATEGORIES = [
  { id: 'lebewesen', name: 'Lebewesen', kinds: CREATURES },
  { id: 'monster', name: 'Monster', kinds: MONSTERS },
  { id: 'waffen', name: 'Waffen', kinds: WEAPONS },
  { id: 'ruestung', name: 'Rüstung', kinds: ARMOR },
  { id: 'relikte', name: 'Relikte', kinds: RELICS },
  { id: 'artefakte', name: 'Artefakte', kinds: ARTIFACTS },
  { id: 'helden', name: 'Helden', kinds: HEROES },
];

// Beinamen je Rang – von bodenständig bis kosmisch.
const EPITHETS = [
  ['vom Dorfrand', 'aus der Scheune', 'vom Wegesrand', 'vom Flohmarkt', 'aus dem Keller', 'vom Heuboden',
    'aus dem Hinterhof', 'vom Bachufer', 'aus der Abstellkammer', 'vom Feldweg', 'aus dem Schuppen', 'vom Marktplatz'],
  ['vom Wiesental', 'aus dem Birkenwald', 'vom Mühlbach', 'aus der Schmiedegasse', 'vom Hügelland', 'aus dem Hafenviertel',
    'vom Kornfeld', 'aus dem Moor', 'vom Steinbruch', 'aus der Altstadt', 'vom Seeufer', 'aus dem Tannenforst'],
  ['des Nebelwaldes', 'der Silberküste', 'des Wanderers', 'der Abenddämmerung', 'des Nordwinds', 'der Glutberge',
    'des Mondsees', 'der Sturmklippen', 'des Eisentals', 'der Dornenhecke', 'des Herbstlaubs', 'der Morgenröte'],
  ['des Sternenhimmels', 'der Drachenhöhle', 'des Runenmeisters', 'der Mitternacht', 'des Phönixfeuers', 'der Kristallgrotte',
    'des Donnergipfels', 'der Geisterstunde', 'des Zauberwalds', 'der Tiefsee', 'des Blutmonds', 'der Sonnenwende'],
  ['des Himmelsthrons', 'der Urflamme', 'des Weltenbaums', 'der Sternenschmiede', 'des Ewigen Winters', 'der Goldenen Dämmerung',
    'des Drachenkönigs', 'der Verlorenen Zeit', 'des Lichtbringers', 'der Schattenkrone', 'des Sturmrufers', 'der Astralen See'],
  ['der Ewigkeit', 'des Ursprungs', 'der Schöpfung', 'des Letzten Sterns', 'der Unendlichkeit', 'des Weltenendes',
    'der Ersten Morgenröte', 'des Schicksals', 'der Tausend Sonnen', 'des Kosmos', 'der Zeitlosen Leere', 'des Göttlichen Funkens'],
];

export const ITEMS = [];
const BY_ID = new Map();
const GROUPS = new Map();

CATEGORIES.forEach((cat, c) => {
  RARITIES.forEach((rarity, tier) => {
    const group = [];
    for (let i = 0; i < PER_GROUP; i++) {
      const k = i % cat.kinds.length;
      const kind = cat.kinds[k];
      // Art × Beiname ist innerhalb einer Gruppe eindeutig
      const epithet = EPITHETS[tier][(Math.floor(i / cat.kinds.length) + k * 5) % 12];
      const item = {
        id: `${cat.id}-${rarity.id}-${i}`,
        cat: cat.id,
        catName: cat.name,
        tier,
        rank: rarity.id,
        sell: rarity.sell,
        name: `${kind.n} ${epithet}`,
        kind: kind.n,
        draw: kind.d,
        seed: (c + 1) * 100003 + (tier + 1) * 1009 + i * 31 + 7,
      };
      group.push(item);
      ITEMS.push(item);
      BY_ID.set(item.id, item);
    }
    GROUPS.set(`${cat.id}-${rarity.id}`, group);
  });
});

export const getItem = (id) => BY_ID.get(id);
export const getGroup = (catId, rank) => GROUPS.get(`${catId}-${rank}`);

// Bilder werden erst beim ersten Anzeigen gemalt und dann gemerkt.
const cache = new Map();
export function itemImage(item) {
  if (!cache.has(item.id)) cache.set(item.id, render(item.draw, item.seed, item.tier));
  return cache.get(item.id);
}

// Ein Zug: erst den Rang auswürfeln, dann ein zufälliges Stück dieses Rangs.
// `tier` legt den Rang fest, `minTier` schließt alle niedrigeren Ränge aus
// (die übrigen behalten ihr Verhältnis zueinander).
// Chancen je Rang. Mit `lucky` (Glücksrausch) steigen alle Ränge ab C um 10 %,
// Rang D wird entsprechend seltener.
export const LUCK_FACTOR = 1.1;
export function tierChances(lucky = false) {
  const c = RARITIES.map((r) => r.chance);
  if (!lucky) return c;
  for (let t = 1; t < c.length; t++) c[t] *= LUCK_FACTOR;
  c[0] = 1 - c.slice(1).reduce((a, b) => a + b, 0);
  return c;
}

export function rollTier(minTier = 0, random = Math.random, lucky = false) {
  const pool = tierChances(lucky).slice(minTier);
  let u = random() * pool.reduce((sum, c) => sum + c, 0);
  for (let t = 0; t < pool.length; t++) {
    u -= pool[t];
    if (u < 0) return minTier + t;
  }
  return RARITIES.length - 1;
}

export function rollItem({ tier = null, minTier = 0, random = Math.random, lucky = false } = {}) {
  if (tier === null) tier = rollTier(minTier, random, lucky);
  const cat = CATEGORIES[Math.floor(random() * CATEGORIES.length)];
  return getGroup(cat.id, RARITIES[tier].id)[Math.floor(random() * PER_GROUP)];
}
