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

// Kapuzen und Helme umrahmen das Gesicht.
const FRAMED = { face: '..Hssssss...', eyes: '..Hssseses..', shut: '..Hsssssss..' };

export const OUTFITS = [
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

// Alle Bilder der Spielfigur in einem Outfit, jeweils nach rechts und links schauend.
export function makePlayerSprites(outfitId) {
  const o = getOutfit(outfitId);
  const legend = { ...BASE, ...o.colors };
  const face = o.framed ? FRAMED.face : '...ssssss...';
  const open = o.framed ? FRAMED.eyes : '...ssseses..';
  const shut = o.framed ? FRAMED.shut : '...sssssss..';
  const build = (eyes, legs) => sprite([...HATS[o.hat], face, eyes, ...BODY, ...legs], legend);
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
