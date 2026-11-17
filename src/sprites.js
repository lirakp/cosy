import { makeCanvas } from './utils.js';

// Sprites werden als Text gemalt: jedes Zeichen ist ein Pixel,
// die Legende ordnet dem Zeichen eine Farbe zu. '.' ist durchsichtig.
export function sprite(rows, legend) {
  const [c, ctx] = makeCanvas(rows[0].length, rows.length);
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = legend[ch];
      ctx.fillRect(x, y, 1, 1);
    });
  });
  return c;
}

export function flipped(src) {
  const [c, ctx] = makeCanvas(src.width, src.height);
  ctx.translate(src.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return c;
}

// ---------------------------------------------------------------- Kleidung

// Kopfbedeckungen: vier Zeilen über dem Gesicht. H und h sind die zwei Farben
// der Kopfbedeckung (oder H = Haare, h = Band/Krone), f = Blüten.
const HATS = {
  straw: ['....HHHH....', '...HHHHHH...', '..HHHHHHHH..', '.hhhhhhhhhh.'],
  beanie: ['.....hh.....', '....HHHH....', '...HHHHHH...', '..hhhhhhhh..'],
  wizard: ['......HH....', '.....HHH....', '...HHhHHH...', '.hhhhhhhhhh.'],
  crown: ['...h.hh.h...', '...hhhhhh...', '..HHHHHHHH..', '..HHHHHHHH..'],
  hood: ['....HHHH....', '...HHHHHH...', '..HHHHHHHH..', '..HHHHHHHH..'],
  cat: ['..H......H..', '..HH....HH..', '..HHHHHHHH..', '..HHHHHHHH..'],
  flowers: ['............', '............', '..fHfHHfHf..', '..HHHHHHHH..'],
  tophat: ['...hhhhhh...', '...hhhhhh...', '...HHHHHH...', '.hhhhhhhhhh.'],
  helm: ['....hhhh....', '...HHHHHH...', '..HHHHHHHH..', '..HHHHHHHH..'],
  chef: ['...hhhhhh...', '..hhhhhhhh..', '...hhhhhh...', '...HHHHHH...'],
  pirate: ['............', '..H......H..', '..HHHHHHHH..', '.hhhhhhhhhh.'],
  nightcap: ['.........f..', '......HHH...', '...HHHHHH...', '..hhhhhhhh..'],
};

// Ohne Kopfbedeckung sieht man die Frisur der Figur (a = Haarfarbe).
const HAIR_TOP = {
  short: ['............', '............', '...aaaaaa...', '..aaaaaaaa..'],
  long: ['............', '....aaaaa...', '..aaaaaaaa..', '.aaaaaaaaaa.'],
  mohawk: ['.....aa.....', '....aaa.....', '....aaaa....', '..aaaaaaaa..'],
  curly: ['............', '...a.aa.a...', '..aaaaaaaa..', '.aaaaaaaaaa.'],
};

// Kapuzen und Helme umrahmen das Gesicht.
const FRAMED = { face: '..Hssssss...', eyes: '..Hssseses..', shut: '..Hsssssss..' };

export const OUTFITS = [
  { id: 'alltag', name: 'Ohne Hut', hat: 'hair', colors: {} },
  { id: 'wanderer', name: 'Wanderer', hat: 'straw', colors: {} },
  { id: 'herbst', name: 'Herbstspaziergang', hat: 'straw', colors: { H: '#a86a3a', h: '#5a3a2e', r: '#4f8f55', c: '#d07a3a', C: '#a85a2a', p: '#4a3a3a' } },
  { id: 'winter', name: 'Winterjacke', hat: 'beanie', colors: { H: '#d9574a', h: '#fdf6e3', r: '#fdf6e3', c: '#4a6ab0', C: '#3a5090', p: '#3a3a5a', b: '#5a3a2e' } },
  { id: 'magier', name: 'Zauberlehrling', hat: 'wizard', colors: { H: '#6a4aa8', h: '#4a3480', r: '#ffd04a', c: '#6a4aa8', C: '#4a3480', p: '#4a3480', b: '#2a2140' } },
  { id: 'koenig', name: 'Königlich', hat: 'crown', colors: { H: '#f0c860', h: '#ffd04a', r: '#fdf6e3', c: '#b03a4a', C: '#8a2a3a', p: '#5a3a82', b: '#2a2140' } },
  { id: 'waldlaeufer', name: 'Waldläufer', hat: 'hood', framed: true, colors: { H: '#3f7a4a', r: '#3f7a4a', c: '#4f8f55', C: '#3a7050', p: '#6a4a30', b: '#4a2f2a' } },
  { id: 'kaetzchen', name: 'Kätzchen', hat: 'cat', colors: { H: '#f2a0b0', r: '#fdf6e3', c: '#f2b0c0', C: '#d890a8', p: '#f6d8e0', b: '#c06080' } },
  { id: 'gaertner', name: 'Gärtnerin', hat: 'straw', colors: { H: '#f0d070', h: '#c09030', r: '#e86a6a', c: '#4a7ac0', C: '#3a60a0', p: '#4a7ac0', b: '#6a4a30' } },
  { id: 'blumen', name: 'Blumenkind', hat: 'flowers', colors: { H: '#8a5a3a', f: '#ff8ab0', r: '#fff6d8', c: '#9ad08a', C: '#7ab06a', p: '#9ad08a', b: '#d08a5a' } },
  { id: 'gentleman', name: 'Gentleman', hat: 'tophat', colors: { H: '#c03a3a', h: '#2a2140', r: '#fdf6e3', c: '#5a5a6a', C: '#45455a', p: '#2a2140', b: '#1d1528' } },
  { id: 'ritter', name: 'Ritterrüstung', hat: 'helm', framed: true, colors: { H: '#a8b0c0', h: '#d9574a', r: '#d9574a', c: '#a8b0c0', C: '#8890a0', p: '#7a8090', b: '#5a6070' } },
  { id: 'koch', name: 'Küchenchef', hat: 'chef', colors: { H: '#fdf6e3', h: '#fdf6e3', r: '#d9574a', c: '#fdf6e3', C: '#d8d0c0', p: '#5a5a6a', b: '#2a2140' } },
  { id: 'pirat', name: 'Piratin', hat: 'pirate', colors: { H: '#2a2140', h: '#1d1528', r: '#fdf6e3', c: '#b03a3a', C: '#8a2a2a', p: '#3a3a5a', b: '#3a2a20' } },
  // Genähte Kleidung (Nähtisch im Haus): erst nähen, dann tragen – mit Bonus
  { id: 'leinen', name: 'Leinenkittel', hat: 'beanie', sew: { tier: 0, stoff: 6 }, bonus: { coinReach: 6 }, colors: { H: '#d8c8a8', h: '#a8906a', r: '#c8a878', c: '#e8dcc0', C: '#c8b898', p: '#8a7a5a', b: '#5a4a30' } },
  { id: 'reisemantel', name: 'Reisemantel', hat: 'hood', framed: true, sew: { tier: 1, stoff: 6, seide: 1 }, bonus: { expedition: 0.06 }, colors: { H: '#6a5a3a', r: '#c0904a', c: '#7a6a42', C: '#5a4a30', p: '#4a5a3a', b: '#3a2a20' } },
  { id: 'bluetenschuerze', name: 'Blütenschürze', hat: 'flowers', sew: { tier: 2, stoff: 5, seide: 2 }, bonus: { garden: 0.12 }, colors: { H: '#c08050', f: '#ff8ab0', r: '#fdf6e3', c: '#f2c0d0', C: '#9ad08a', p: '#6a8ad0', b: '#6a4a30' } },
  { id: 'seidenrobe', name: 'Seidenrobe', hat: 'wizard', sew: { tier: 3, seide: 4 }, bonus: { mana: 0.15 }, colors: { H: '#5a8ad8', h: '#ffd04a', r: '#ffd04a', c: '#5a8ad8', C: '#3a6ab8', p: '#3a4a90', b: '#2a2140' } },
  { id: 'wellenmantel', name: 'Wellenmantel', hat: 'beanie', sew: { tier: 4, stoff: 4, seide: 3 }, bonus: { fishing: 0.25, stars: 0.15 }, colors: { H: '#3a8ab0', h: '#9be8e0', r: '#9be8e0', c: '#2f6a90', C: '#245070', p: '#2a3a5a', b: '#1d2838' } },
  { id: 'sternenseide', name: 'Sternenseidengewand', hat: 'crown', sew: { tier: 5, seide: 4 }, bonus: { coinReach: 8, expedition: 0.1, garden: 0.1, mine: 0.1, mana: 0.1, fishing: 0.1 }, colors: { H: '#e8f0ff', h: '#ff8ad0', r: '#9be8e0', c: '#6a54c8', C: '#4a3aa0', p: '#2a2160', b: '#1d1538' } },
  // Kleidung der Portalwelten (genäht aus deren Stoff und Seide)
  { id: 'glutpanzer', name: 'Glutpanzer', world: 'hoelle', hat: 'helm', framed: true, sew: { tier: 2, stoff: 6, seide: 2 }, bonus: { mine: 0.2, coinReach: 8 }, colors: { H: '#3a2a2e', h: '#ff6a2a', r: '#ff6a2a', c: '#4a3034', C: '#2a1a1e', p: '#2a1a1e', b: '#1a0c10' } },
  { id: 'aschemantel', name: 'Aschemantel', world: 'hoelle', hat: 'hood', framed: true, sew: { tier: 3, stoff: 5, seide: 3 }, bonus: { expedition: 0.2 }, colors: { H: '#5a4a4a', r: '#c0441c', c: '#4a3a3a', C: '#3a2a2a', p: '#2a1e1e', b: '#1a1010' } },
  { id: 'daemonenrobe', name: 'Dämonenrobe', world: 'hoelle', hat: 'cat', sew: { tier: 4, stoff: 4, seide: 4 }, bonus: { mana: 0.3, mine: 0.15 }, colors: { H: '#8a1a2a', r: '#ffb03a', c: '#6a1020', C: '#4a0a18', p: '#2a0810', b: '#1a0408' } },
  { id: 'hoellenfuerst', name: 'Gewand des Höllenfürsten', world: 'hoelle', hat: 'crown', sew: { tier: 5, seide: 5 }, bonus: { expedition: 0.25, mine: 0.25, coinReach: 12, stars: 0.2 }, colors: { H: '#ff6a2a', h: '#ffd04a', r: '#ffd04a', c: '#2a1418', C: '#1a0a0e', p: '#3a0a10', b: '#120408' } },
  { id: 'federkleid', name: 'Federkleid', world: 'himmel', hat: 'flowers', sew: { tier: 2, stoff: 6, seide: 2 }, bonus: { garden: 0.2, coinReach: 8 }, colors: { H: '#fdf6e3', f: '#ffe070', r: '#ffe070', c: '#f4f0ff', C: '#d8d4f0', p: '#c8d8f8', b: '#a8a0c8' } },
  { id: 'wolkenmantel', name: 'Wolkenmantel', world: 'himmel', hat: 'hood', framed: true, sew: { tier: 3, stoff: 5, seide: 3 }, bonus: { fishing: 0.3, stars: 0.25 }, colors: { H: '#e8f0ff', r: '#9be8ff', c: '#d8e6fc', C: '#b8cef4', p: '#a8bce8', b: '#8090c0' } },
  { id: 'engelsrobe', name: 'Engelsrobe', world: 'himmel', hat: 'wizard', sew: { tier: 4, stoff: 4, seide: 4 }, bonus: { mana: 0.3, garden: 0.15 }, colors: { H: '#ffffff', h: '#ffe070', r: '#ffe070', c: '#fffaf0', C: '#e8dcc0', p: '#f0e8d0', b: '#c8b890' } },
  { id: 'seraphengewand', name: 'Seraphengewand', world: 'himmel', hat: 'crown', sew: { tier: 5, seide: 5 }, bonus: { coinReach: 10, expedition: 0.15, garden: 0.15, mine: 0.15, mana: 0.15, fishing: 0.15, stars: 0.15 }, colors: { H: '#ffe070', h: '#ffffff', r: '#9be8ff', c: '#ffffff', C: '#e0e8ff', p: '#c8d8ff', b: '#a0b0e0' } },
  { id: 'pyjama', name: 'Schlafanzug', hat: 'nightcap', colors: { H: '#6a8ad0', h: '#fdf6e3', f: '#ffd04a', r: '#a8c0f0', c: '#a8c0f0', C: '#8aa0d8', p: '#a8c0f0', b: '#d06a6a' } },
];

const BASE = {
  H: '#e0a83c', // Hut
  h: '#4a2f3a', // Hutkrempe
  f: '#ff8ab0', // Blüten
  s: '#f6cfa6', // Haut
  e: '#2a2140', // Augen
  r: '#d9574a', // Schal
  c: '#4f8f8a', // Mantel
  C: '#3a6f73', // Mantel, Schatten
  p: '#5a4a82', // Hose
  b: '#4a2f3a', // Stiefel
};

const BODY = [
  '...ssssss...',
  '..rrrrrrrr..',
  '.r.cccccc...',
  '..cccccccc..',
  '..sccccccs..',
  '...cccccc...',
  '...CCCCCC...',
];
const LEGS_STAND = ['...pp..pp...', '...pp..pp...', '...bb..bb...'];
const LEGS_WIDE = ['...pp..pp...', '..pp....pp..', '..bb....bb..'];
const LEGS_CLOSE = ['....pppp....', '....pppp....', '....bbbb....'];

export const getOutfit = (id) => OUTFITS.find((o) => o.id === id) || OUTFITS[0];

// ---------------------------------------------------------------- Figuren

// Hauttöne zum Auswählen (für Völker mit tones: true)
export const SKIN_TONES = ['#f6cfa6', '#eab68c', '#c98e64', '#9a6440', '#6a4430'];

// Völker der Spielfigur. Sie verändern Haut, Haare, Ohren, Bart und Größe –
// die Kleidung aus dem Kleiderschrank passt allen.
//   hair: 'short' | 'long' · ears: spitze Elfenohren · beard · tusks: Hauer · small: kleiner
export const CHARACTERS = [
  { id: 'mensch-m', name: 'Mensch', sub: 'männlich', skin: '#f6cfa6', hairColor: '#6a4a30', hair: 'short', tones: true, text: 'Ein Wanderer, der sich im Tal ein gemütliches Zuhause sucht.' },
  { id: 'mensch-w', name: 'Mensch', sub: 'weiblich', skin: '#f6cfa6', hairColor: '#a8582a', hair: 'long', tones: true, text: 'Eine Abenteurerin mit großem Herz für Gärten und Geschichten.' },
  { id: 'elf-m', name: 'Elf', sub: 'männlich', skin: '#f8e2cc', hairColor: '#f0d890', hair: 'short', ears: true, eyes: '#2f6a4a', tones: true, text: 'Kommt aus den Birkenwäldern und hört die Sterne flüstern.' },
  { id: 'elf-w', name: 'Elfe', sub: 'weiblich', skin: '#f8e2cc', hairColor: '#e8eef8', hair: 'long', ears: true, eyes: '#2f6a4a', tones: true, text: 'Eine Elfe mit silbernem Haar, die Magie im Blut trägt.' },
  { id: 'zwerg-m', name: 'Zwerg', sub: 'männlich', skin: '#eab68c', hairColor: '#c0602a', hair: 'short', beard: true, small: true, tones: true, text: 'Klein, stur und ein Meister in Mine und Schmiede.' },
  { id: 'zwerg-w', name: 'Zwergin', sub: 'weiblich', skin: '#eab68c', hairColor: '#d8903a', hair: 'long', braid: true, small: true, tones: true, text: 'Trägt ihre Zöpfe stolz und findet jede Erzader.' },
  { id: 'ork', name: 'Ork', sub: 'sanftmütig', skin: '#8ab060', hairColor: '#2a2140', hair: 'mohawk', tusks: true, text: 'Groß, grün und der freundlichste Gärtner im ganzen Tal.' },
  { id: 'mondelfe', name: 'Mondelfe', sub: 'weiblich', skin: '#b8a8e0', hairColor: '#fdf6e3', hair: 'long', ears: true, eyes: '#6a2a8a', text: 'Ein Kind der Nacht, das im Mondlicht erst richtig aufblüht.' },
  { id: 'halbling', name: 'Halbling', sub: 'divers', skin: '#f0c49a', hairColor: '#8a5a3a', hair: 'curly', small: true, tones: true, text: 'Liebt zweites Frühstück, Tee und lange Spaziergänge.' },
];
export const getCharacter = (id) => CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];

// Setzt einzelne Pixel einer Zeilenliste (nur auf freie Stellen, wenn soft)
function put(rows, x, y, ch, soft = false) {
  if (!rows[y] || (soft && rows[y][x] !== '.')) return;
  rows[y] = rows[y].slice(0, x) + ch + rows[y].slice(x + 1);
}

// Zeilen 0–3 Kopfbedeckung, 4 Stirn, 5 Augen, 6–12 Körper, danach Beine
function applyCharacter(rows, ch) {
  if (ch.hair) {
    put(rows, 2, 4, 'a', true);
    put(rows, 2, 5, 'a', true);
  }
  if (ch.hair === 'long') {
    for (const [x, y] of [[1, 4], [1, 5], [2, 6], [1, 6], [1, 7]]) put(rows, x, y, 'a', true);
  }
  if (ch.braid) {
    put(rows, 1, 8, 'a');
    put(rows, 1, 9, 'h');
  }
  if (ch.ears) {
    put(rows, 1, 4, 's');
    put(rows, 0, 3, 's', true);
  }
  if (ch.beard) {
    for (let x = 4; x <= 9; x++) put(rows, x, 6, 'a');
    for (let x = 5; x <= 8; x++) put(rows, x, 7, 'a');
    put(rows, 6, 8, 'a');
    put(rows, 7, 8, 'a');
  }
  if (ch.tusks) {
    put(rows, 6, 6, 'w');
    put(rows, 8, 6, 'w');
  }
  return rows;
}

// Alle Bilder der Spielfigur in einem Outfit, jeweils nach rechts und links schauend.
// character: { id, tone } – Volk und gewählter Hautton
export function makePlayerSprites(outfitId, character = {}) {
  const o = getOutfit(outfitId);
  const ch = getCharacter(character.id);
  const skin = ch.tones && SKIN_TONES[character.tone] ? SKIN_TONES[character.tone] : ch.skin;
  const legend = { ...BASE, ...o.colors, s: skin, a: ch.hairColor, w: '#fdf6e3', ...(ch.eyes ? { e: ch.eyes } : {}) };
  const face = o.framed ? FRAMED.face : '...ssssss...';
  const open = o.framed ? FRAMED.eyes : '...ssseses..';
  const shut = o.framed ? FRAMED.shut : '...sssssss..';
  const top = o.hat === 'hair' ? HAIR_TOP[ch.hair] || HAIR_TOP.short : HATS[o.hat];
  const build = (eyes, legs) => sprite(applyCharacter([...top, face, eyes, ...BODY, ...(ch.small ? legs.slice(1) : legs)], ch), legend);
  const right = {
    idle: build(open, LEGS_STAND),
    blink: build(shut, LEGS_STAND),
    walk: [build(open, LEGS_WIDE), build(open, LEGS_STAND), build(open, LEGS_CLOSE), build(open, LEGS_STAND)],
  };
  const left = {
    idle: flipped(right.idle),
    blink: flipped(right.blink),
    walk: right.walk.map(flipped),
  };
  return { 1: right, [-1]: left };
}
