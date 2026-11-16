import { VIEW_W, VIEW_H, WORLD_W, WELL_X, WELL_RANGE, CHEST_X, CAMP_RANGE, GROUND_Y } from './config.js';
import * as expedition from './expedition.js';
import { state } from './state.js';
import { clamp } from './utils.js';
import { initInput, setBlocked, setTapHandler } from './input.js';
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
const actionButton = document.getElementById('btn-action');
const actionLabel = actionButton.querySelector('span');
let near = null; // 'well' | 'camp'

const chestHasContent = () => expedition.live.gold > 0 || expedition.live.loot > 0;

function act() {
  if (near === 'well') ui.openWell();
  if (near === 'camp') chestHasContent() ? ui.collectChest() : ui.openExpedition();
}

document.getElementById('btn-gallery').addEventListener('click', () => ui.openGallery());
document.getElementById('btn-expedition').addEventListener('click', () => ui.openExpedition());
actionButton.addEventListener('click', act);
addEventListener('keydown', (e) => {
  if (ui.isOpen() || e.repeat) return;
  if (e.code === 'KeyG') ui.openGallery();
  if (e.code === 'KeyX') ui.openExpedition();
  if (near && (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space')) {
    e.preventDefault();
    act();
  }
});

// Ein Klick direkt auf die Truhe leert sie.
setTapHandler((x, y) => {
  const chestX = CHEST_X - Math.round(camX);
  if (Math.abs(x - chestX) > 11 || y < GROUND_Y - 16 || y > GROUND_Y + 10) return false;
  ui.collectChest();
  return true;
});

// Die Expedition wird einmal pro Sekunde abgerechnet und regelmäßig gespeichert.
let saveCountdown = 10;
function expeditionTick() {
  const found = expedition.tick();
  if (found && !document.hidden) ui.toast('✦ Dein Team hat etwas gefunden! Leere die Truhe.');
  ui.updateChest();
  if (--saveCountdown <= 0 || found) {
    saveCountdown = 10;
    state.save();
  }
}
expeditionTick();
setInterval(expeditionTick, 1000);
addEventListener('pagehide', () => state.save());

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

  near = Math.abs(player.x - WELL_X) < WELL_RANGE ? 'well' : Math.abs(player.x - CHEST_X) < CAMP_RANGE ? 'camp' : null;
  actionButton.hidden = !near || ui.isOpen();
  const label =
    near === 'well' ? '✦ Wunschbrunnen'
    : !chestHasContent() ? 'Expedition'
    : `Truhe leeren · ${expedition.live.gold.toLocaleString('de-DE')} Gold${expedition.live.loot ? ' ✦' : ''}`;
  if (actionLabel.textContent !== label) actionLabel.textContent = label;

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
