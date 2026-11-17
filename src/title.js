import { CHARACTERS, SKIN_TONES, getCharacter, makePlayerSprites } from './sprites.js';
import { state } from './state.js';

// Startbildschirm: Figur (Volk) und Hautton wählen, dann geht's los.
// Die Wahl ändert nur das Aussehen – alle Figuren spielen sich gleich.

const $ = (sel) => document.querySelector(sel);
const SCALE_SMALL = 3;
const SCALE_BIG = 6;

export function createTitle({ onStart }) {
  const root = $('#title');
  let pick = { id: CHARACTERS[0].id, tone: null };
  let timer = 0;
  let frame = 0;
  const canvases = []; // [canvas, character, scale, walking]
  const cache = new Map();
  const spritesOf = (id, tone) => {
    const key = `${id}|${tone}`;
    if (!cache.has(key)) cache.set(key, makePlayerSprites('alltag', { id, tone })[1]);
    return cache.get(key);
  };

  // Figurenbild in eine Leinwand malen (kleine Karten stehen, die große läuft)
  function paint(canvas, c, scale, walking) {
    const tone = c.id === pick.id ? pick.tone : null;
    const set = spritesOf(c.id, tone);
    const img = walking ? set.walk[frame % 4] : frame % 12 === 11 ? set.blink : set.idle;
    canvas.width = 14 * scale;
    canvas.height = 17 * scale;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, scale, canvas.height - img.height * scale, img.width * scale, img.height * scale);
  }
  const repaint = () => canvases.forEach(([cv, c, scale, walking]) => paint(cv, c, scale, walking));

  function render() {
    canvases.length = 0;
    const list = $('#chars');
    list.innerHTML = '';
    for (const c of CHARACTERS) {
      const b = document.createElement('button');
      b.className = `char${c.id === pick.id ? ' on' : ''}`;
      b.dataset.id = c.id;
      const cv = document.createElement('canvas');
      b.append(cv);
      b.insertAdjacentHTML('beforeend', `<b>${c.name}</b><span>${c.sub}</span>`);
      list.append(b);
      canvases.push([cv, c, SCALE_SMALL, false]);
    }
    const c = getCharacter(pick.id);
    const big = document.createElement('canvas');
    $('#char-big').replaceChildren(big);
    canvases.push([big, c, SCALE_BIG, true]);
    $('#char-name').textContent = `${c.name} · ${c.sub}`;
    $('#char-text').textContent = c.text;
    const tones = $('#tones');
    tones.innerHTML = c.tones
      ? `<span class="muted">Hautton</span>${SKIN_TONES.map((t, i) => `<button class="tone${(pick.tone ?? -1) === i ? ' on' : ''}" data-tone="${i}" style="background:${t}" aria-label="Hautton ${i + 1}"></button>`).join('')}<button class="tone auto${pick.tone == null ? ' on' : ''}" data-tone="" aria-label="Standard">✦</button>`
      : '<span class="muted">Dieses Volk hat seinen eigenen Hautton.</span>';
    repaint();
  }

  root.addEventListener('click', (e) => {
    const ch = e.target.closest('.char');
    if (ch) {
      pick = { id: ch.dataset.id, tone: getCharacter(ch.dataset.id).tones ? pick.tone : null };
      render();
      return;
    }
    const tone = e.target.closest('.tone');
    if (tone) {
      pick.tone = tone.dataset.tone === '' ? null : Number(tone.dataset.tone);
      render();
    }
  });
  $('#btn-start').addEventListener('click', () => start());
  addEventListener('keydown', (e) => {
    if (root.hidden) return;
    if (e.code === 'Enter') start();
    const i = CHARACTERS.findIndex((c) => c.id === pick.id);
    const step = e.code === 'ArrowRight' || e.code === 'KeyD' ? 1 : e.code === 'ArrowLeft' || e.code === 'KeyA' ? -1 : 0;
    if (step) {
      e.preventDefault();
      pick = { id: CHARACTERS[(i + step + CHARACTERS.length) % CHARACTERS.length].id, tone: null };
      render();
    }
  });

  function start() {
    if (root.hidden) return;
    if (!state.character) state.outfit = 'alltag'; // neue Figur: Frisur zeigen
    state.character = pick;
    root.hidden = true;
    clearInterval(timer);
    onStart?.(pick);
  }

  return {
    open() {
      const cur = state.character;
      pick = cur ? { ...cur } : { id: CHARACTERS[0].id, tone: null };
      $('#btn-start').innerHTML = `${cur ? 'Weiterspielen' : 'Spielen'} <kbd>Enter</kbd>`;
      root.hidden = false;
      render();
      clearInterval(timer);
      timer = setInterval(() => {
        frame++;
        repaint();
      }, 150);
    },
    isOpen: () => !root.hidden,
  };
}
