import { PORTAL_X, PORTAL_RANGE, VIEW_W, VIEW_H, WORLD_W, WALK_Y, DAY_LENGTH, WELL_X, WELL_RANGE, CHEST_X, CAMP_RANGE, GROUND_Y, DUNGEON_X, DUNGEON_RANGE, ARENA_X, ARENA_RANGE, HOUSE_X, HOUSE_RANGE, MINE_X, MINE_RANGE, TRADER_X, TRADER_RANGE, FORGE_X, FORGE_RANGE, GARDEN_X, GARDEN_RANGE, VILLAGE_SIGN_X, VILLAGE_SIGN_RANGE, TOWER_X, TOWER_RANGE } from './config.js';
import * as village from './village.js';
import { createVillageScene, zoneAt as villageZoneAt, VILLAGE_W, VILLAGE_BOUNDS, VILLAGE_SPAWN } from './villagescene.js';
import * as garden from './garden.js';
import * as gardener from './gardener.js';
import * as fishtrap from './fishtrap.js';
import * as magic from './magic.js';
import { createTitle } from './title.js';
import * as companions from './companions.js';
import * as well from './well.js';
import * as realm from './realm.js';
import * as dimension from './dimension.js';
import * as care from './companioncare.js';
import * as stars from './stars.js';
import * as forge from './forge.js';
import * as sets from './sets.js';
import * as mine from './mine.js';
import * as trader from './trader.js';
import { createMineScene, zoneAt as mineZoneAt, MINE_BOUNDS, LIFT_SPAWN } from './minescene.js';
import { createInterior, zoneAt, ROOM_BOUNDS, DOOR_SPAWN } from './interior.js';
import * as buffs from './buffs.js';
import * as dungeon from './dungeon.js';
import * as buildings from './buildings.js';
import { phase, label as dayLabel } from './daycycle.js';
import * as expedition from './expedition.js';
import { state } from './state.js';
import { clamp, makeCanvas } from './utils.js';
import { initInput, setBlocked, setTapHandler, axis } from './input.js';
import { createMinigame } from './minigame.js';
import { createUI } from './ui.js';
import { audio } from './audio.js';
import { createBackground } from './background.js';
import * as themes from './themes.js';
import { createWorld } from './world.js';
import { createPlayer } from './player.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// Bildanpassung (im Pause-Menü wählbar, wird im Browser gemerkt):
//   fill  – randlos: füllt das ganze Fenster (bei 16:9 ohne Verzerrung)
//   fit   – ganzes Bild im Seitenverhältnis, so groß wie möglich
//   pixel – nur ganze Vielfache: jeder Spielpixel gleich groß (mit Rand)
const DISPLAY_KEY = 'cosy-display';
const DISPLAY_MODES = { fill: 'Randlos', fit: 'Seitenverhältnis', pixel: 'Pixelgenau' };
let displayMode = (() => {
  try {
    return DISPLAY_MODES[localStorage.getItem(DISPLAY_KEY)] ? localStorage.getItem(DISPLAY_KEY) : 'fill';
  } catch {
    return 'fill';
  }
})();
function resize() {
  document.body.dataset.display = displayMode;
  let w;
  let h;
  if (displayMode === 'fill') {
    w = innerWidth;
    h = innerHeight;
  } else if (displayMode === 'fit') {
    const s = Math.min(innerWidth / VIEW_W, innerHeight / VIEW_H);
    w = VIEW_W * s;
    h = VIEW_H * s;
  } else {
    const dpr = window.devicePixelRatio || 1;
    const fit = Math.min(innerWidth / VIEW_W, (innerHeight - 56) / VIEW_H);
    const scale = Math.max(1, Math.floor(fit * dpr)) / dpr;
    w = VIEW_W * scale;
    h = VIEW_H * scale;
  }
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
}
function setDisplay(mode) {
  displayMode = mode;
  try {
    localStorage.setItem(DISPLAY_KEY, mode);
  } catch {
    // nicht speicherbar – gilt dann nur bis zum Neuladen
  }
  resize();
  showDisplay();
}
function showDisplay() {
  const box = document.getElementById('display-buttons');
  if (box) box.innerHTML = Object.entries(DISPLAY_MODES).map(([id, name]) => `<button data-display="${id}" class="${displayMode === id ? 'on' : ''}">${name}</button>`).join('');
}
document.getElementById('display-buttons')?.addEventListener('click', (e) => {
  const id = e.target.closest('[data-display]')?.dataset.display;
  if (id) setDisplay(id);
});
showDisplay();
addEventListener('resize', resize);
resize();

initInput(canvas);

const ui = createUI({
  onToggle: (open) => setBlocked(open || sleeping),
  onOutfit: (id) => player.setOutfit(id),
  onTravel: (level) => travel(level),
  onPortal: (target) => travelRealm(target),
  where: () => ({ place, mineLevel }),
  onCast: (id, seconds) => {
    spellFx = 1.6;
    if (seconds) world.coinRain(seconds);
  },
});
let spellFx = 0; // Funkeln um die Figur nach einem Zauber
// Minispiel im Dorf einer Dimension (statt Angeln)
const minigame = createMinigame({
  onEnd: (res) => ui.minigameDone(res),
  onSfx: (name) => audio.play(name),
});
let lastNight = 0;
const actionButton = document.getElementById('btn-action');
const actionLabel = actionButton.querySelector('span');
let near = null; // draußen: 'well' | 'camp' | 'dungeon' | 'arena' | 'house' · drinnen: 'door' | 'wardrobe' | 'bed'
let place = 'outside'; // 'outside' | 'house' | 'mine' | 'village'
let mineLevel = 0; // Ebene in der Mine (0 = D … 5 = SS)
let sleeping = false;

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
  if (paused) {
    showThemes();
    document.getElementById('btn-resume').focus();
  }
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

// ---------------------------------------------------------------- Spielstand sichern und laden

const saveNote = document.getElementById('save-note');
const fileInput = document.getElementById('file-import');

document.getElementById('btn-export').addEventListener('click', () => {
  state.save();
  const blob = new Blob([state.exportSave()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `cosy-spielstand-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  saveNote.textContent = 'Gesichert. Die Datei liegt in deinem Download-Ordner.';
});

document.getElementById('btn-import').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  fileInput.value = '';
  if (!file) return;
  try {
    const loaded = state.parseSave(await file.text());
    const owned = Object.keys(loaded.owned).length;
    if (!confirm(`Spielstand laden? ${loaded.gold.toLocaleString('de-DE')} Gold, ${owned} verschiedene Sammelstücke.\nDer aktuelle Spielstand wird ersetzt.`)) return;
    state.replace(loaded);
    location.reload();
  } catch (e) {
    saveNote.textContent = e.message;
    audio.play('error');
  }
});

document.getElementById('btn-stats').addEventListener('click', () => {
  setPaused(false);
  ui.openStats();
});

document.getElementById('btn-reset').addEventListener('click', () => {
  if (!confirm('Wirklich neu anfangen? Gold, Sammlung und alle Anlagen gehen verloren.')) return;
  if (!confirm('Ganz sicher? Das lässt sich nur mit einer gesicherten Datei rückgängig machen.')) return;
  state.reset();
  location.reload();
});

sets.onComplete((cat, tier) => ui.setComplete(cat, tier));

document.getElementById('btn-pause').addEventListener('click', () => setPaused(true));
document.getElementById('btn-resume').addEventListener('click', () => setPaused(false));
document.getElementById('btn-character').addEventListener('click', () => openTitle());
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (title.isOpen()) return;
  if (e.code === 'KeyP') setPaused(!paused);
  else if (e.code === 'Escape' && paused) setPaused(false);
});

const chestHasContent = () => expedition.live.gold > 0 || expedition.live.loot > 0;

// ---------------------------------------------------------------- Haus

const fadeEl = document.getElementById('fade');

// kurzes Abblenden beim Durchgehen der Tür
function fadeThrough(fn) {
  fadeEl.classList.add('on');
  setBlocked(true);
  setTimeout(() => {
    fn();
    companions.resetFollow();
    fadeEl.classList.remove('on');
    setBlocked(ui.isOpen() || sleeping);
  }, 260);
}

function enterHouse() {
  audio.play('door');
  fadeThrough(() => {
    place = 'house';
    player.x = DOOR_SPAWN;
    player.facing = 1;
    player.bounds = ROOM_BOUNDS;
  });
}

function leaveHouse() {
  audio.play('door');
  fadeThrough(() => {
    place = 'outside';
    player.x = HOUSE_X;
    player.bounds = [10, WORLD_W - 10];
    camX = Math.round(clamp(player.x - VIEW_W / 2, 0, WORLD_W - VIEW_W));
  });
}

// ---------------------------------------------------------------- Dimensionsportal

// target: Ziel-Welt; ohne Ziel aus der Portalwelt nach Hause bzw. von zu Hause
// in die einzige erreichbare Portalwelt (bei zweien öffnet sich die Auswahl)
function travelRealm(target) {
  if (sleeping || !buildings.owned('portal') || !state.realm.type) return;
  if (!target) {
    if (realm.inRealm()) target = 'normal';
    else if (dimension.destinations().length > 1) return ui.openPortal();
    else target = state.realm.type;
  }
  if (target === realm.current()) return;
  const first = target !== 'normal' && !dimension.visited(target);
  audio.play('wish');
  fadeThrough(() => {
    // Erträge bis jetzt gutschreiben – die verlassene Welt läuft „offline“ weiter
    expedition.tick();
    mine.tick();
    state.switchWorld(target);
    if (first) {
      state.realm.visited[target] = true;
      state.changed();
    }
    expedition.tick();
    mine.tick();
    themeId = wantedTheme();
    buildScenes();
    place = 'outside';
    player.x = PORTAL_X + 18;
    player.facing = 1;
    player.bounds = [10, WORLD_W - 10];
    camX = Math.round(clamp(player.x - VIEW_W / 2, 0, WORLD_W - VIEW_W));
  });
  setTimeout(() => (first ? ui.realmArrived(target) : ui.toast(target !== 'normal' ? `◈ ${realm.WORLDS[target].name}` : '◈ Zurück in der Heimat')), 320);
}

// ---------------------------------------------------------------- Dorf

function enterVillage() {
  audio.play('door');
  fadeThrough(() => {
    place = 'village';
    player.x = VILLAGE_SPAWN;
    player.facing = -1;
    player.bounds = VILLAGE_BOUNDS;
    camX = Math.round(clamp(player.x - VIEW_W / 2, 0, VILLAGE_W - VIEW_W));
  });
}

function leaveVillage() {
  villageScene.cancelFishing();
  audio.play('door');
  fadeThrough(() => {
    place = 'outside';
    player.x = VILLAGE_SIGN_X + 16;
    player.facing = 1;
    player.bounds = [10, WORLD_W - 10];
    camX = Math.round(clamp(player.x - VIEW_W / 2, 0, WORLD_W - VIEW_W));
  });
}

function fishAction() {
  const r = villageScene.fishPress();
  if (r === 'cast') {
    player.facing = -1;
    audio.play('cast');
  }
}

// ---------------------------------------------------------------- Mine

function enterMine() {
  audio.play('lift');
  fadeThrough(() => {
    place = 'mine';
    mineLevel = Math.min(mineLevel, Math.max(0, mine.depth()));
    player.x = LIFT_SPAWN;
    player.facing = 1;
    player.bounds = MINE_BOUNDS;
  });
}

// zu einer Ebene fahren; -1 = zurück an die Oberfläche
function travel(level) {
  if (place !== 'mine') return;
  if (level < 0) {
    audio.play('lift');
    fadeThrough(() => {
      place = 'outside';
      player.x = MINE_X - 2;
      player.bounds = [10, WORLD_W - 10];
      camX = Math.round(clamp(player.x - VIEW_W / 2, 0, WORLD_W - VIEW_W));
    });
    return;
  }
  if (!mine.unlocked(level) || level === mineLevel) return;
  audio.play('lift');
  fadeThrough(() => {
    mineLevel = level;
    player.x = LIFT_SPAWN;
  });
}

// Schlafen geht ab dem Abend; man wacht am Morgen auf, mit 10 % Chance mit einem Rausch.
const canSleep = () => ['Abend', 'Nacht'].includes(dayLabel(dayTime).name);

function sleep() {
  if (!canSleep()) {
    ui.toast('Du bist noch nicht müde – schlafen geht ab dem Abend.');
    audio.play('error');
    return;
  }
  sleeping = true;
  setBlocked(true);
  fadeEl.classList.add('slow', 'on');
  fadeEl.innerHTML = '<span class="zzz">Z z z …</span>';
  audio.play('sleep');
  setTimeout(() => {
    if (dayTime > 0.5) state.dayCount += 1; // über Mitternacht geschlafen
    dayTime = 0.27; // Morgen
    const buff = buffs.rollSleep();
    state.save();
    fadeEl.classList.remove('on');
    setTimeout(() => {
      fadeEl.classList.remove('slow');
      fadeEl.textContent = '';
      sleeping = false;
      setBlocked(ui.isOpen());
      ui.wakeUp(buff);
    }, 1000);
  }, 2600);
}

function act() {
  if (sleeping) return;
  if (near === 'stray') {
    const c = companions.befriendStray();
    if (c) {
      audio.play('levelUp');
      spellFx = 1.2;
      ui.foundCompanion(c);
    }
  }
  if (near === 'portal') buildings.owned('portal') ? travelRealm() : ui.openPortal();
  if (near === 'village') enterVillage();
  if (near === 'farm') leaveVillage();
  if (near === 'fishing') fishAction();
  if (near === 'minigame') minigame.active() ? minigame.press() : (audio.play('start'), minigame.start(realm.current()));
  if (near === 'market') ui.openMarket();
  if (near === 'fishbook') ui.openFishBook();
  if (near === 'trap') ui.openTrap();
  if (near?.startsWith('npc:')) ui.talk(near.slice(4));
  if (near === 'house') enterHouse();
  if (near === 'mine') buildings.owned('mine') ? enterMine() : ui.openMine();
  if (near === 'lift') ui.openMine();
  if (near === 'trader') ui.openTrader();
  if (near === 'forge') ui.openForge();
  if (near === 'tower') ui.openTower();
  if (near === 'garden') garden.readyCount() ? ui.harvest() : ui.openGarden();
  if (near === 'kitchen') ui.openKitchen();
  if (near === 'door') leaveHouse();
  if (near === 'wardrobe') ui.openWardrobe();
  if (near === 'sewing') ui.openTailor();
  if (near === 'bed') sleep();
  if (near === 'well') ui.openWell();
  if (near === 'dungeon') ui.openDungeon();
  if (near === 'arena') ui.openArena();
  if (near === 'camp') buildings.owned('camp') && chestHasContent() ? ui.collectChest() : ui.openExpedition();
}

document.getElementById('btn-gallery').addEventListener('click', () => ui.openGallery());
document.getElementById('btn-companions').addEventListener('click', () => ui.openCompanions());
document.getElementById('btn-forge').addEventListener('click', () => ui.openForge());
document.getElementById('btn-mine').addEventListener('click', () => ui.openMine());
document.getElementById('btn-arena').addEventListener('click', () => ui.openArena());
document.getElementById('btn-dungeon').addEventListener('click', () => ui.openDungeon());
document.getElementById('btn-expedition').addEventListener('click', () => ui.openExpedition());
actionButton.addEventListener('click', act);
addEventListener('keydown', (e) => {
  if (paused || sleeping || ui.isOpen() || e.repeat) return;
  if (e.code === 'KeyG') ui.openGallery();
  if (e.code === 'KeyX') ui.openExpedition();
  if (e.code === 'KeyF') ui.openDungeon();
  if (e.code === 'KeyB') ui.openArena();
  if (e.code === 'KeyN') ui.openMine();
  if (e.code === 'KeyH') ui.openForge();
  if (e.code === 'KeyI') ui.openStats();
  if (e.code === 'KeyZ') ui.openTower();
  if (e.code === 'KeyC') ui.openCompanions();
  // in der Mine mit ↑ / ↓ (oder W / S) zwischen den Ebenen wechseln
  if (place === 'mine' && (e.code === 'ArrowUp' || e.code === 'KeyW')) travel(mineLevel - 1);
  if (place === 'mine' && (e.code === 'ArrowDown' || e.code === 'KeyS') && mine.unlocked(mineLevel + 1)) travel(mineLevel + 1);
  if (near && (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space')) {
    e.preventDefault();
    act();
  }
});

// Ein Klick direkt auf die Truhe leert sie.
setTapHandler((x, y) => {
  // Sternschnuppe anklicken: etwas wünschen
  if (!paused && (place === 'outside' || place === 'village')) {
    const res = stars.tryCatch(x, y);
    if (res) {
      audio.play('wish');
      spellFx = 1.6;
      ui.wished(res);
      return true;
    }
  }
  // Klick auf den Wegweiser führt ins Dorf, im Dorf auf einen Bewohner spricht ihn an
  if (!paused && place === 'outside' && Math.abs(x - (VILLAGE_SIGN_X - Math.round(camX))) < 12 && y > GROUND_Y - 22 && y < GROUND_Y + 6) {
    enterVillage();
    return true;
  }
  if (!paused && place === 'village' && y > GROUND_Y - 24 && y < GROUND_Y + 12) {
    const wx = x + Math.round(camX);
    const npc = village.villagers().find((v) => Math.abs(v.x - wx) < 9);
    if (npc) {
      ui.talk(npc.id);
      return true;
    }
    if (Math.abs(village.marketNpc().x - wx) < 16) {
      ui.openMarket();
      return true;
    }
  }
  const chestX = CHEST_X - Math.round(camX);
  if (paused || place !== 'outside' || !buildings.owned('camp') || Math.abs(x - chestX) > 11 || y < GROUND_Y - 16 || y > GROUND_Y + 10) return false;
  ui.collectChest();
  return true;
});

const manaEl = document.getElementById('mana');

// aktiver Rausch oben links, mit Restzeit
const buffEl = document.getElementById('buff');
let buffShown = '';
function showBuff() {
  const b = buffs.current();
  if (!b) {
    if (buffShown) {
      buffEl.hidden = true;
      buffShown = '';
    }
    return;
  }
  const def = buffs.BUFFS[b.id];
  const sec = buffs.remaining();
  if (buffShown !== b.id) {
    buffShown = b.id;
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    c.getContext('2d').drawImage(buffs.icon(b.id), 0, 0);
    buffEl.className = `r-${def.rank}`;
    buffEl.replaceChildren(c, document.createElement('span'));
    buffEl.title = def.text;
    buffEl.hidden = false;
  }
  buffEl.lastChild.textContent = `${def.name} ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

// Die Expedition wird einmal pro Sekunde abgerechnet und regelmäßig gespeichert.
let saveCountdown = 10;
let dungeonWas = dungeon.status();
function expeditionTick() {
  const dungeonNow = dungeon.status();
  if (dungeonNow === 'done' && dungeonWas === 'running' && !document.hidden) ui.toast('Deine Helden sind aus dem Dungeon zurück!', true);
  dungeonWas = dungeonNow;
  ui.updateDungeon();

  // Mine: Erz wird laufend gehackt
  const gained = mine.tick();
  if (place === 'mine' && gained[mineLevel]) mineScene.addPop(mineLevel, gained[mineLevel]);
  if (gained.some((n) => n > 0)) ui.refreshMine();

  // Erzhändler kommt und geht
  const visit = trader.tick();
  if (visit === 'arrived') {
    ui.toast('Ein Erzhändler hat sich neben den Brunnen gesetzt!');
    audio.play('trader');
  }
  if (visit === 'left') ui.toast('Der Erzhändler ist weitergezogen.');
  ui.updateTrader();
  forge.tick();
  ui.updateForge();
  ui.updateGarden();
  // Gartenhelfer und Fischreuse arbeiten laufend
  if (gardener.tick()) ui.refreshGarden();
  const wasFull = fishtrap.full();
  if (fishtrap.tick()) ui.refreshTrap();
  if (!wasFull && fishtrap.full() && !document.hidden) ui.toast('Die Fischreuse im Dorf ist voll!', true);
  ui.updateMarket();
  // Mana lädt nach (nachts doppelt so schnell)
  magic.tick(Date.now(), lastNight > 0.5);
  ui.updateTower();
  manaEl.hidden = !magic.owned();
  if (magic.owned()) manaEl.textContent = `✦ ${magic.mana()}/${magic.maxMana()}`;

  const found = expedition.tick();
  if (found && !document.hidden) ui.toast('✦ Dein Team hat etwas gefunden! Leere die Truhe.', true);
  ui.updateChest();
  showBuff();
  if (!document.hidden) state.addPlayed(1);
  if (--saveCountdown <= 0 || found) {
    saveCountdown = 10;
    state.save();
  }
}
expeditionTick();
setInterval(expeditionTick, 1000);
addEventListener('pagehide', () => state.save());

// Landschaft: Hintergrund, Hof und Dorf werden in ihren Farben gezeichnet und
// beim Wechsel neu aufgebaut.
// Hinter dem Portal gilt immer die Landschaft der Portalwelt
const wantedTheme = () => (realm.inRealm() ? realm.current() : themes.resolve(state.theme, state.dayCount));
let themeId = wantedTheme();
let background;
let world;
let villageScene;
function buildScenes() {
  const t = themes.apply(themeId);
  background = createBackground(t);
  world = createWorld(t);
  villageScene = createVillageScene({
    onBite: () => audio.play('bite'),
    onCatch: (res) => ui.caught(res),
    onMiss: (why) => ui.toast(why === 'early' ? 'Zu früh eingeholt – der Fisch ist weg.' : 'Weg ist er … beim nächsten Biss schneller einholen!'),
  });
}
buildScenes();

const themeButtons = document.getElementById('themes');
const themeNote = document.getElementById('theme-note');
function showThemes() {
  const choices = [...themes.THEMES.map((t) => [t.id, t.name]), [themes.AUTO, 'Jahreszeiten']];
  themeButtons.innerHTML = choices.map(([id, name]) => `<button data-theme="${id}" class="${state.theme === id ? 'on' : ''}">${name}</button>`).join('');
  themeNote.textContent = state.theme === themes.AUTO
    ? `Wechselt alle ${themes.DAYS_PER_SEASON} Spieltage: Frühling, Sommer, Herbst, Winter. Gerade: ${themes.theme(themeId).name}.`
    : 'Gilt für Hof und Dorf und wird mit dem Spielstand gespeichert.';
}
themeButtons.addEventListener('click', (e) => {
  const id = e.target.closest('[data-theme]')?.dataset.theme;
  if (!id) return;
  state.theme = id;
  audio.play('levelUp');
});

const player = createPlayer();

// Startbildschirm: Figur wählen, solange steht die Welt still
const title = createTitle({
  onStart: () => {
    player.setOutfit();
    paused = false;
    audio.setDucked(false);
    setBlocked(ui.isOpen());
  },
});
function openTitle() {
  paused = true;
  pauseScreen.hidden = true;
  setBlocked(true);
  title.open();
}
openTitle();
const interior = createInterior();
let lastPick = 0;
const mineScene = createMineScene({
  onStrike() {
    const now = performance.now();
    if (now - lastPick > 140) {
      lastPick = now;
      audio.play('pick');
    }
  },
});

let camX = Math.round(clamp(player.x - VIEW_W / 2, 0, WORLD_W - VIEW_W));
let time = 0;
let dayTime = state.day;

// Landschaft, Figur und Gebäude werden erst hier hinein gezeichnet und dann
// passend zur Tageszeit eingefärbt; Himmel und Lichter bleiben unberührt.
const [scene, sctx] = makeCanvas(VIEW_W, VIEW_H);
const dayEl = document.getElementById('daytime');
let dayText = '';
let last = performance.now();

// Landschaft getönt, Himmel und Lichter darüber
function tint(tintColor, alpha) {
  if (alpha <= 0.01) return;
  sctx.globalCompositeOperation = 'source-atop';
  sctx.globalAlpha = alpha;
  sctx.fillStyle = tintColor;
  sctx.fillRect(0, 0, VIEW_W, VIEW_H);
  sctx.globalAlpha = 1;
  sctx.globalCompositeOperation = 'source-over';
}

function drawOutside(ph) {
  background.drawSky(ctx, camX, time, ph);
  sctx.clearRect(0, 0, VIEW_W, VIEW_H);
  background.drawLand(sctx, camX, ph);
  world.draw(sctx, camX, time);
  companions.drawStray(sctx, Math.round(camX), WALK_Y, time, 'outside');
  companions.drawFollower(sctx, Math.round(camX), WALK_Y, time);
  player.draw(sctx, Math.round(camX));
  world.drawFront(sctx, camX, time);
  tint(ph.tint, ph.tintAlpha);
  ctx.drawImage(scene, 0, 0);
  world.drawLights(ctx, camX, time, ph.night);
  well.drawSpirit(ctx, WELL_X - Math.round(camX), GROUND_Y + 4, time, ph.night);
  companions.drawGlow(ctx, Math.round(camX), WALK_Y, time, ph.night);
}

// Im Haus: der Himmel scheint nur durchs Fenster, nachts wird das Zimmer
// dunkler und Kaminfeuer und Kerze leuchten.
function drawInside(ph) {
  ctx.fillStyle = '#0b0a1f';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const w = interior.window;
  ctx.save();
  ctx.beginPath();
  ctx.rect(w.x, w.y, w.w, w.h);
  ctx.clip();
  ctx.translate(-50, 0);
  background.drawSky(ctx, 0, time, ph);
  ctx.restore();

  sctx.clearRect(0, 0, VIEW_W, VIEW_H);
  interior.draw(sctx, time);
  companions.drawFollower(sctx, 0, WALK_Y, time);
  player.draw(sctx, 0);
  tint('rgb(20 14 46)', ph.night * 0.42);
  ctx.drawImage(scene, 0, 0);
  interior.drawLights(ctx, time, ph.night);
}

function fishLabel() {
  const phase = villageScene.phase();
  if (phase === 'idle') return 'Angel auswerfen';
  if (phase === 'bite') return '!!! Jetzt einholen !!!';
  return 'Warten … bei „!“ einholen';
}

function npcLabel(id) {
  const q = village.quest(id);
  const name = village.villager(id).name;
  return q ? `${name} · ${village.canComplete(q) ? 'Aufgabe abgeben ✓' : 'Aufgabe ?'}` : name;
}

// Das Dorf liegt draußen: gleicher Himmel und gleiche Tageszeit wie auf dem Hof
function drawVillage(ph) {
  // beim Angeln: Sicht auf den See
  if (minigame.active()) {
    minigame.draw(ctx, time);
    return;
  }
  if (villageScene.fishing()) {
    background.drawSky(ctx, 0, time, ph);
    sctx.clearRect(0, 0, VIEW_W, VIEW_H);
    villageScene.drawLake(sctx, time);
    tint(ph.tint, ph.tintAlpha);
    ctx.drawImage(scene, 0, 0);
    villageScene.drawLakeFront(ctx, time);
    return;
  }
  background.drawSky(ctx, camX, time, ph);
  sctx.clearRect(0, 0, VIEW_W, VIEW_H);
  background.drawLand(sctx, camX, ph);
  villageScene.draw(sctx, camX, time);
  companions.drawStray(sctx, Math.round(camX), WALK_Y, time, 'village');
  companions.drawFollower(sctx, Math.round(camX), WALK_Y, time);
  player.draw(sctx, Math.round(camX));
  world.drawFront(sctx, camX, time);
  tint(ph.tint, ph.tintAlpha);
  ctx.drawImage(scene, 0, 0);
  villageScene.drawLights(ctx, camX, time, ph.night);
  companions.drawGlow(ctx, Math.round(camX), WALK_Y, time, ph.night);
  villageScene.drawFishing(ctx, camX, player.x, time);
}

// In der Mine ist es dunkel, nur Laternen und Funken leuchten.
function drawMine() {
  sctx.clearRect(0, 0, VIEW_W, VIEW_H);
  mineScene.draw(sctx, mineLevel, time);
  companions.drawFollower(sctx, 0, WALK_Y, time);
  player.draw(sctx, 0);
  tint('rgb(10 8 26)', 0.32);
  ctx.drawImage(scene, 0, 0);
  mineScene.drawLights(ctx, mineLevel, time);
  companions.drawGlow(ctx, 0, WALK_Y, time, 1);
}

// Feste Spieltakte: Die Spiellogik läuft immer in Schritten von 1/60 Sekunde –
// unabhängig davon, ob der Bildschirm 60, 75, 120 oder 144 Hz hat. Die Figur
// läuft genau 1 Spielpixel pro Takt; die Kamera bewegt sich nur in ganzen
// Pixeln. So gibt es kein ungleichmäßiges „Springen“ beim Laufen mehr.
const STEP = 1 / 60;
const MAX_STEPS = 5; // nach einem Hänger nicht ewig nachholen
let acc = 0;

function tick(dt) {
  time += dt;
  dayTime += dt / DAY_LENGTH;
  if (dayTime >= 1) {
    dayTime -= 1;
    state.dayCount += 1; // neuer Spieltag (für die Jahreszeiten)
  }
  // im Minispiel steht die Figur still; die Pfeiltasten steuern den Korb
  if (minigame.active()) minigame.update(dt, axis());
  else player.update(dt);
  background.update(dt);
  companions.update(dt, { where: place, night: lastNight > 0.5, playerX: player.x, bounds: player.bounds });
  companions.followUpdate(dt, player);
  const present = care.giftTick(dt);
  if (present) {
    audio.play('pick');
    ui.companionGift(present);
  }
  if (place === 'outside') world.update(dt, player);
  if (place === 'mine') mineScene.update(dt, mineLevel, time);
  if (place === 'village') {
    villageScene.update(dt);
    if (player.moving) villageScene.cancelFishing();
  }
  // Kamera folgt der Figur in ganzen Pixeln (im Haus steht sie still)
  if (place === 'outside' || place === 'village') {
    const width = place === 'village' ? VILLAGE_W : WORLD_W;
    const target = Math.round(clamp(player.x - VIEW_W / 2, 0, width - VIEW_W));
    const d = target - camX;
    if (d) camX += Math.sign(d) * Math.min(Math.abs(d), Math.max(1, Math.round(Math.abs(d) / 8)));
  }
  const ph = phase(dayTime);
  stars.update(dt, ph.night > 0.6, (place === 'outside' || place === 'village') && !villageScene.fishing() && !minigame.active());
  if (spellFx > 0) spellFx -= dt;
}

function frame(now) {
  const elapsed = Math.min((now - last) / 1000, 0.25);
  last = now;
  if (paused) acc = 0;
  else {
    // Bildschirm-Takte schwanken minimal (16,6 / 16,8 ms …). Liegt die Zeit nahe an
    // einem ganzen Vielfachen eines Spieltakts, zählt genau dieses – sonst gäbe es
    // abwechselnd Bilder mit 0 und 2 Takten (sichtbares Ruckeln).
    const n = Math.round(elapsed / STEP);
    acc += n >= 1 && Math.abs(elapsed - n * STEP) < 0.002 ? n * STEP : elapsed;
    let steps = 0;
    while (acc >= STEP && steps < MAX_STEPS) {
      tick(STEP);
      acc -= STEP;
      steps++;
    }
    if (steps === MAX_STEPS) acc = 0;
  }
  // Landschaft wechseln, wenn gewählt oder die Jahreszeit umspringt
  const wanted = wantedTheme();
  if (wanted !== themeId) {
    const auto = state.theme === themes.AUTO;
    themeId = wanted;
    buildScenes();
    showThemes();
    if (auto) ui.toast(`Die Jahreszeit wechselt: ${themes.theme(themeId).name}`);
  }
  state.day = dayTime;

  near =
    minigame.active() ? 'minigame'
    : (place === 'outside' || place === 'village') && !villageScene.fishing() && companions.nearStray(player.x) ? 'stray'
    : place === 'house' ? zoneAt(player.x)
    : place === 'mine' ? mineZoneAt(player.x)
    : place === 'village' ? villageZoneAt(player.x)
    : Math.abs(player.x - VILLAGE_SIGN_X) < VILLAGE_SIGN_RANGE ? 'village'
    : Math.abs(player.x - HOUSE_X) < HOUSE_RANGE ? 'house'
    : Math.abs(player.x - FORGE_X) < FORGE_RANGE ? 'forge'
    : Math.abs(player.x - GARDEN_X) < GARDEN_RANGE ? 'garden'
    : Math.abs(player.x - TOWER_X) < TOWER_RANGE ? 'tower'
    : Math.abs(player.x - WELL_X) < WELL_RANGE ? 'well'
    : Math.abs(player.x - CHEST_X) < CAMP_RANGE ? 'camp'
    : Math.abs(player.x - DUNGEON_X) < DUNGEON_RANGE ? 'dungeon'
    : Math.abs(player.x - ARENA_X) < ARENA_RANGE ? 'arena'
    : Math.abs(player.x - MINE_X) < MINE_RANGE ? 'mine'
    : Math.abs(player.x - PORTAL_X) < PORTAL_RANGE ? 'portal'
    : trader.present() && Math.abs(player.x - TRADER_X) < TRADER_RANGE ? 'trader'
    : null;
  actionButton.hidden = !near || paused || sleeping || ui.isOpen();
  const label =
    near === 'stray' ? `♥ ${companions.companion(companions.currentStray().id).name} anfreunden`
    : near === 'village' ? '← Ins Dorf'
    : near === 'farm' ? 'Zurück zum Hof →'
    : near === 'fishing' ? fishLabel()
    : near === 'minigame' ? (minigame.active() ? (minigame.type() === 'hoelle' ? '🔨 Zuschlagen!' : '← → Korb bewegen') : realm.current() === 'hoelle' ? '🔨 Höllenschmiede am Lavasee' : '★ Sternenfang über den Wolken')
    : near === 'market' ? 'Marktstand'
    : near === 'fishbook' ? 'Angelbuch'
    : near === 'trap' ? (fishtrap.built() ? `Fischreuse · ${fishtrap.stored()}/${fishtrap.capacity()}${fishtrap.full() ? ' voll!' : ''}` : `Fischreuse bauen · ${fishtrap.BUY} Gold`)
    : near?.startsWith('npc:') ? npcLabel(near.slice(4))
    : near === 'house' ? 'Haus betreten'
    : near === 'door' ? 'Hinausgehen'
    : near === 'wardrobe' ? 'Kleiderschrank'
    : near === 'sewing' ? '✂ Nähtisch'
    : near === 'bed' ? (canSleep() ? 'Schlafen gehen' : 'Bett · schlafen ab dem Abend')
    : near === 'lift' ? `Aufzug · Ebene ${mineLevel + 1} (${mine.LEVELS[mineLevel].name})`
    : near === 'trader' ? '✦ Erzhändler'
    : near === 'well' ? (well.spiritGift() ? '✦ Wunschbrunnen · Der Geist hat ein Geschenk!' : well.freeSingle() ? '✦ Wunschbrunnen · Gratiswunsch!' : '✦ Wunschbrunnen')
    : near in buildings.BUILDINGS && !buildings.owned(near) ? `${buildings.BUILDINGS[near].name} bauen · ${buildings.nextCost(near).toLocaleString('de-DE')} Gold`
    : near === 'portal' ? (realm.inRealm() ? '◈ Durch das Portal zurück in die Heimat' : dimension.destinations().length > 1 ? '◈ Dimensionsportal · Ziel wählen' : `◈ Durch das Portal${dimension.visited(state.realm.type) ? ` · ${realm.WORLDS[state.realm.type].name}` : ' · ins Ungewisse'}`)
    : near === 'arena' ? 'Bossarena'
    : near === 'forge' ? '⚒ Schmiede'
    : near === 'tower' ? '✦ Magierturm'
    : near === 'garden' ? (garden.readyCount() ? `Ernten ✦ (${garden.readyCount()})` : 'Garten')
    : near === 'kitchen' ? 'Am Kamin kochen'
    : near === 'mine' ? 'Mine betreten'
    : near === 'dungeon' ? (dungeon.status() === 'done' ? 'Dungeon · Beute abholen ✦' : dungeon.status() === 'running' ? `Dungeon · noch ${dungeon.remaining()} s` : 'Dungeon')
    : !chestHasContent() ? 'Expedition'
    : `Truhe leeren · ${expedition.live.gold.toLocaleString('de-DE')} Gold${expedition.live.loot ? ' ✦' : ''}`;
  if (actionLabel.textContent !== label) actionLabel.textContent = label;

  const ph = phase(dayTime);
  audio.setNight(ph.night);
  village.setDayPhase(dayLabel(dayTime).name);
  lastNight = ph.night;
  if (place === 'house') drawInside(ph);
  else if (place === 'mine') drawMine();
  else if (place === 'village') drawVillage(ph);
  else drawOutside(ph);

  if ((place === 'outside' || place === 'village') && !villageScene.fishing() && !minigame.active()) stars.draw(ctx, time);

  // Funkeln um die Spielfigur nach einem Zauber
  if (spellFx > 0) {
    const cx = place === 'outside' || place === 'village' ? Math.round(player.x - camX) : Math.round(player.x);
    for (let k = 0; k < 14; k++) {
      const a = time * 3 + k * 0.45;
      const rr = 6 + (1.6 - spellFx) * 14;
      ctx.fillStyle = k % 2 ? '#9be8e0' : '#ffd978';
      ctx.fillRect(Math.round(cx + Math.cos(a) * rr), Math.round(150 + Math.sin(a) * rr * 0.6), 1, 1);
    }
  }

  const dl = dayLabel(dayTime);
  const text = `${dl.icon} ${dl.name}${realm.inRealm() ? ` · ${realm.WORLDS[realm.current()].name}` : ''}`;
  if (text !== dayText) dayEl.textContent = dayText = text;

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Nur zum Messen (Adresse mit ?debug): Kamera und Figur von außen lesbar
if (new URLSearchParams(location.search).has('debug')) window.__cosy = { cam: () => camX, x: () => player.x };
