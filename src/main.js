import { VIEW_W, VIEW_H, WORLD_W, WELL_X, WELL_RANGE } from './config.js';
import { clamp } from './utils.js';
import { initInput, setBlocked } from './input.js';
import { createUI } from './ui.js';
import { createBackground } from './background.js';
import { createWorld } from './world.js';
import { createPlayer } from './player.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// Das Bild wird nur in ganzen Bildschirmpixeln vergrößert, damit jeder
// Spielpixel gleich groß bleibt.
function resize() {
  const dpr = window.devicePixelRatio || 1;
  const fit = Math.min(innerWidth / VIEW_W, (innerHeight - 56) / VIEW_H);
  const scale = Math.max(1, Math.floor(fit * dpr)) / dpr;
  canvas.style.width = `${VIEW_W * scale}px`;
  canvas.style.height = `${VIEW_H * scale}px`;
}
addEventListener('resize', resize);
resize();

initInput(canvas);

const ui = createUI({ onToggle: setBlocked });
const wellButton = document.getElementById('btn-well');
let nearWell = false;

document.getElementById('btn-gallery').addEventListener('click', () => ui.openGallery());
wellButton.addEventListener('click', () => ui.openWell());
addEventListener('keydown', (e) => {
  if (ui.isOpen() || e.repeat) return;
  if (e.code === 'KeyG') ui.openGallery();
  if (nearWell && (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space')) {
    e.preventDefault();
    ui.openWell();
  }
});

const background = createBackground();
const world = createWorld();
const player = createPlayer();

let camX = clamp(player.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
let time = 0;
let last = performance.now();

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  time += dt;

  player.update(dt);
  background.update(dt);
  world.update(dt, player);

  nearWell = Math.abs(player.x - WELL_X) < WELL_RANGE;
  wellButton.hidden = !nearWell || ui.isOpen();

  // Kamera folgt der Figur sanft
  const target = clamp(player.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
  camX += (target - camX) * Math.min(1, dt * 6);

  background.draw(ctx, camX, time);
  world.draw(ctx, camX, time);
  player.draw(ctx, Math.round(camX));
  world.drawFront(ctx, camX, time);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
