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

const LEGEND = {
  H: '#e0a83c', // Hut
  h: '#4a2f3a', // Hutkrempe
  s: '#f6cfa6', // Haut
  e: '#2a2140', // Augen
  r: '#d9574a', // Schal
  c: '#4f8f8a', // Mantel
  C: '#3a6f73', // Mantel, Schatten
  p: '#5a4a82', // Hose
  b: '#4a2f3a', // Stiefel
};

const HEAD = [
  '....HHHH....',
  '...HHHHHH...',
  '..HHHHHHHH..',
  '.hhhhhhhhhh.',
  '...ssssss...',
];
const EYES_OPEN = '...ssseses..';
const EYES_SHUT = '...sssssss..';
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

const build = (eyes, legs) => sprite([...HEAD, eyes, ...BODY, ...legs], LEGEND);

// Alle Bilder der Spielfigur, jeweils nach rechts und links schauend.
export function makePlayerSprites() {
  const right = {
    idle: build(EYES_OPEN, LEGS_STAND),
    blink: build(EYES_SHUT, LEGS_STAND),
    walk: [
      build(EYES_OPEN, LEGS_WIDE),
      build(EYES_OPEN, LEGS_STAND),
      build(EYES_OPEN, LEGS_CLOSE),
      build(EYES_OPEN, LEGS_STAND),
    ],
  };
  const left = {
    idle: flipped(right.idle),
    blink: flipped(right.blink),
    walk: right.walk.map(flipped),
  };
  return { 1: right, [-1]: left };
}
