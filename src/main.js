import { VIEW_W, VIEW_H, WORLD_W, DAY_LENGTH, WELL_X, WELL_RANGE, CHEST_X, CAMP_RANGE, GROUND_Y, DUNGEON_X, DUNGEON_RANGE, ARENA_X, ARENA_RANGE } from './config.js';
import * as dungeon from './dungeon.js';
import * as buildings from './buildings.js';
import { phase, label as dayLabel } from './daycycle.js';
import * as expedition from './expedition.js';
import { state } from './state.js';
import { clamp, makeCanvas } from './utils.js';
import { initInput, setBlocked, setTapHandler } from './input.js';
import { createUI } from './ui.js';
import { audio } from './audio.js';
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
let near = null; // 'well' | 'camp' | 'dungeon' | 'arena'

// Pause: Figur, Münzen und Animationen halten an. Expedition und Dungeon
// rechnen nach echter Zeit und laufen deshalb weiter – wie bei geschlossenem Spiel.
const pauseScreen = document.getElementById('pause');
let paused = false;
function setPaused(value) {
  if (value && ui.isOpen()) return;
  if (value !== paused) audio.play(value ? 'pause' : 'resume');
  audio.setDucked(value);
  paused = value;
  pauseScreen.hidden = !paused;
  setBlocked(paused || ui.isOpen());
  if (paused) document.getElementById('btn-resume').focus();
}
// Ton startet mit der ersten Eingabe (Vorgabe der Browser).
addEventListener('pointerdown', () => audio.unlock(), true);
addEventListener('keydown', () => audio.unlock(), true);

// Ton an/aus (Knopf oder M) und Lautstärke im Pause-Fenster
const soundButton = document.getElementById('btn-sound');
const musicSlider = document.getElementById('vol-music');
const sfxSlider = document.getElementById('vol-sfx');
function showSound() {
  const s = audio.settings;
  soundButton.classList.toggle('muted', s.muted);
  soundButton.setAttribute('aria-label', s.muted ? 'Ton einschalten' : 'Ton ausschalten');
  soundButton.title = `${s.muted ? 'Ton aus' : 'Ton an'} (M)`;
  musicSlider.value = Math.round(s.music * 100);
  sfxSlider.value = Math.round(s.sfx * 100);
}
audio.onChange(showSound);
showSound();
soundButton.addEventListener('click', () => audio.toggleMute());
musicSlider.addEventListener('input', () => audio.set('music', musicSlider.value / 100));
sfxSlider.addEventListener('input', () => audio.set('sfx', sfxSlider.value / 100));
sfxSlider.addEventListener('change', () => audio.play('coin'));
addEventListener('keydown', (e) => {
  if (e.code === 'KeyM' && !e.repeat) audio.toggleMute();
});

document.getElementById('btn-pause').addEventListener('click', () => setPaused(true));
document.getElementById('btn-resume').addEventListener('click', () => setPaused(false));
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'KeyP') setPaused(!paused);
  else if (e.code === 'Escape' && paused) setPaused(false);
});

const chestHasContent = () => expedition.live.gold > 0 || expedition.live.loot > 0;

function act() {
  if (near === 'well') ui.openWell();
  if (near === 'dungeon') ui.openDungeon();
  if (near === 'arena') ui.openArena();
  if (near === 'camp') buildings.owned('camp') && chestHasContent() ? ui.collectChest() : ui.openExpedition();
}

document.getElementById('btn-gallery').addEventListener('click', () => ui.openGallery());
document.getElementById('btn-arena').addEventListener('click', () => ui.openArena());
document.getElementById('btn-dungeon').addEventListener('click', () => ui.openDungeon());
document.getElementById('btn-expedition').addEventListener('click', () => ui.openExpedition());
actionButton.addEventListener('click', act);
addEventListener('keydown', (e) => {
  if (paused || ui.isOpen() || e.repeat) return;
  if (e.code === 'KeyG') ui.openGallery();
  if (e.code === 'KeyX') ui.openExpedition();
  if (e.code === 'KeyF') ui.openDungeon();
  if (e.code === 'KeyB') ui.openArena();
  if (near && (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space')) {
    e.preventDefault();
    act();
  }
});

// Ein Klick direkt auf die Truhe leert sie.
setTapHandler((x, y) => {
  const chestX = CHEST_X - Math.round(camX);
  if (paused || !buildings.owned('camp') || Math.abs(x - chestX) > 11 || y < GROUND_Y - 16 || y > GROUND_Y + 10) return false;
  ui.collectChest();
  return true;
});

// Die Expedition wird einmal pro Sekunde abgerechnet und regelmäßig gespeichert.
let saveCountdown = 10;
let dungeonWas = dungeon.status();
function expeditionTick() {
  const dungeonNow = dungeon.status();
  if (dungeonNow === 'done' && dungeonWas === 'running' && !document.hidden) ui.toast('Deine Helden sind aus dem Dungeon zurück!', true);
  dungeonWas = dungeonNow;
  ui.updateDungeon();

  const found = expedition.tick();
  if (found && !document.hidden) ui.toast('✦ Dein Team hat etwas gefunden! Leere die Truhe.', true);
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
let dayTime = state.day;

// Landschaft, Figur und Gebäude werden erst hier hinein gezeichnet und dann
// passend zur Tageszeit eingefärbt; Himmel und Lichter bleiben unberührt.
const [scene, sctx] = makeCanvas(VIEW_W, VIEW_H);
const dayEl = document.getElementById('daytime');
let dayText = '';
let last = performance.now();

function frame(now) {
  const dt = paused ? 0 : Math.min((now - last) / 1000, 0.05);
  last = now;
  time += dt;
  dayTime = (dayTime + dt / DAY_LENGTH) % 1;
  state.day = dayTime;

  if (!paused) {
    player.update(dt);
    background.update(dt);
    world.update(dt, player);
  }

  near =
    Math.abs(player.x - WELL_X) < WELL_RANGE ? 'well'
    : Math.abs(player.x - CHEST_X) < CAMP_RANGE ? 'camp'
    : Math.abs(player.x - DUNGEON_X) < DUNGEON_RANGE ? 'dungeon'
    : Math.abs(player.x - ARENA_X) < ARENA_RANGE ? 'arena'
    : null;
  actionButton.hidden = !near || paused || ui.isOpen();
  const label =
    near === 'well' ? '✦ Wunschbrunnen'
    : near && !buildings.owned(near) ? `${buildings.BUILDINGS[near].name} bauen · ${buildings.BUILDINGS[near].buy} Gold`
    : near === 'arena' ? 'Bossarena'
    : near === 'dungeon' ? (dungeon.status() === 'done' ? 'Dungeon · Beute abholen ✦' : dungeon.status() === 'running' ? `Dungeon · noch ${dungeon.remaining()} s` : 'Dungeon')
    : !chestHasContent() ? 'Expedition'
    : `Truhe leeren · ${expedition.live.gold.toLocaleString('de-DE')} Gold${expedition.live.loot ? ' ✦' : ''}`;
  if (actionLabel.textContent !== label) actionLabel.textContent = label;

  // Kamera folgt der Figur sanft
  const target = clamp(player.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
  camX += (target - camX) * Math.min(1, dt * 6);

  const ph = phase(dayTime);
  audio.setNight(ph.night);
  background.drawSky(ctx, camX, time, ph);

  sctx.clearRect(0, 0, VIEW_W, VIEW_H);
  background.drawLand(sctx, camX, ph);
  world.draw(sctx, camX, time);
  player.draw(sctx, Math.round(camX));
  world.drawFront(sctx, camX, time);
  if (ph.tintAlpha > 0.01) {
    sctx.globalCompositeOperation = 'source-atop';
    sctx.globalAlpha = ph.tintAlpha;
    sctx.fillStyle = ph.tint;
    sctx.fillRect(0, 0, VIEW_W, VIEW_H);
    sctx.globalAlpha = 1;
    sctx.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(scene, 0, 0);
  world.drawLights(ctx, camX, time, ph.night);

  const dl = dayLabel(dayTime);
  const text = `${dl.icon} ${dl.name}`;
  if (text !== dayText) dayEl.textContent = dayText = text;

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
