// Musik und Soundeffekte – komplett mit der Web-Audio-Schnittstelle erzeugt,
// ohne Audiodateien. Browser erlauben Ton erst nach einer ersten Eingabe,
// deshalb startet alles beim ersten Tastendruck oder Klick.

const KEY = 'cosy-audio';
const settings = { music: 0.5, sfx: 0.7, muted: false };
try {
  Object.assign(settings, JSON.parse(localStorage.getItem(KEY)) || {});
} catch {
  // keine gespeicherten Einstellungen
}
function saveSettings() {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Speichern nicht möglich – die Einstellung gilt dann nur bis zum Neuladen
  }
}

let ctx = null;
let master, musicBus, sfxBus, echoIn;
let noise = null;
let night = 0;
let ducked = false;
const listeners = new Set();

const midi = (n) => 440 * 2 ** ((n - 69) / 12);

function setup() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain();
  // Kompressor: hebt leise Stellen an und verhindert Übersteuern bei Fanfaren
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value = 12;
  comp.ratio.value = 4;
  comp.attack.value = 0.005;
  comp.release.value = 0.25;
  master.connect(comp);
  comp.connect(ctx.destination);
  musicBus = ctx.createGain();
  sfxBus = ctx.createGain();
  musicBus.connect(master);
  sfxBus.connect(master);

  // weiches Echo für die Musik – macht den Klang gemütlich und räumlich
  echoIn = ctx.createGain();
  const delay = ctx.createDelay(1);
  const feedback = ctx.createGain();
  const tone = ctx.createBiquadFilter();
  delay.delayTime.value = 0.39;
  feedback.gain.value = 0.32;
  tone.type = 'lowpass';
  tone.frequency.value = 1800;
  echoIn.gain.value = 0.35;
  echoIn.connect(delay);
  delay.connect(tone);
  tone.connect(feedback);
  feedback.connect(delay);
  tone.connect(musicBus);

  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  applyVolumes();
  return true;
}

function applyVolumes() {
  if (!ctx) return;
  const now = ctx.currentTime;
  master.gain.setTargetAtTime(settings.muted ? 0 : 1, now, 0.05);
  musicBus.gain.setTargetAtTime(settings.music * 1.5 * (ducked ? 0.35 : 1), now, 0.2);
  sfxBus.gain.setTargetAtTime(settings.sfx * 1.4, now, 0.05);
}

// Ein einzelner Ton mit sanftem Ein- und Ausklingen.
function tone(freq, start, dur, { type = 'sine', gain = 0.1, attack = 0.01, release = 0.12, dest = sfxBus, cutoff = 0, slide = 0, echo = 0 } = {}) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), start + dur);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + attack);
  g.gain.setTargetAtTime(0, start + Math.max(attack, dur), release / 3);
  let out = g;
  if (cutoff) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    g.connect(f);
    out = f;
  }
  osc.connect(g);
  out.connect(dest);
  if (echo) {
    const e = ctx.createGain();
    e.gain.value = echo;
    out.connect(e);
    e.connect(echoIn);
  }
  osc.start(start);
  osc.stop(start + Math.max(attack, dur) + release + 0.05);
}

// Rauschen, z. B. für Schritte, Becken oder Hammerschläge.
function hiss(start, dur, { gain = 0.1, freq = 3000, type = 'highpass', dest = sfxBus } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f);
  f.connect(g);
  g.connect(dest);
  src.start(start, Math.random() * 0.5);
  src.stop(start + dur + 0.02);
}

// ---------------------------------------------------------------- Musik

// Vier Takte je Teil, gespielt in der Reihenfolge A A B A.
// Jeder Akkord: Grundton (Bass) und vier Akkordtöne.
const PARTS = {
  A: [
    [48, [60, 64, 67, 71]], // Cmaj7
    [45, [57, 60, 64, 67]], // Am7
    [41, [57, 60, 64, 65]], // Fmaj7
    [43, [55, 59, 62, 64]], // G6
  ],
  B: [
    [41, [57, 60, 64, 65]], // Fmaj7
    [40, [55, 59, 62, 64]], // Em7
    [45, [57, 60, 64, 67]], // Am7
    [43, [55, 59, 62, 65]], // G7
  ],
};
const FORM = ['A', 'A', 'B', 'A'];
const PENTA = [0, 2, 4, 7, 9];
const STEPS = 8; // Achtel pro Takt
const BPM = 74;

let step = 0;
let nextTime = 0;
let melody = [];
let timer = 0;

// Erfindet eine kleine Melodie für zwei Takte – jedes Mal etwas anders.
function compose(chords) {
  const notes = [];
  const scale = [];
  for (const oct of [72, 84]) for (const p of PENTA) scale.push(oct + p);
  let idx = 2 + Math.floor(Math.random() * 4);
  for (let bar = 0; bar < 2; bar++) {
    const rhythm = [
      [1, 0, 0, 1, 0, 0, 1, 0],
      [1, 0, 1, 0, 1, 0, 0, 0],
      [0, 0, 1, 0, 0, 1, 1, 0],
      [1, 0, 0, 0, 1, 0, 1, 1],
    ][Math.floor(Math.random() * 4)];
    for (let s = 0; s < STEPS; s++) {
      if (!rhythm[s]) {
        notes.push(null);
        continue;
      }
      idx = Math.max(0, Math.min(scale.length - 1, idx + [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random() * 7)]));
      let n = scale[idx];
      // auf betonten Zählzeiten zum nächsten Akkordton ziehen
      if (s % 4 === 0) {
        const tones = chords[bar][1].map((t) => t + 12);
        n = tones.reduce((best, t) => (Math.abs(t - n) < Math.abs(best - n) ? t : best), tones[0]);
      }
      const len = rhythm[s + 1] === 0 && rhythm[s + 2] === 0 ? 3 : rhythm[s + 1] === 0 ? 2 : 1;
      notes.push({ n, len });
    }
  }
  return notes;
}

function playStep(s, t) {
  const eighth = 60 / BPM / 2;
  const barIndex = Math.floor(s / STEPS);
  const part = FORM[Math.floor(barIndex / 4) % FORM.length];
  const chordIdx = barIndex % 4;
  const [bass, chord] = PARTS[part][chordIdx];
  const pos = s % STEPS;
  const bright = 1 - night * 0.6; // nachts gedämpfter und leiser

  if (pos === 0 && chordIdx % 2 === 0) {
    const pair = [PARTS[part][chordIdx], PARTS[part][chordIdx + 1]];
    melody = Math.random() < 0.75 - night * 0.35 ? compose(pair) : [];
  }

  // Flächenklang: der Akkord, lang und weich
  if (pos === 0) {
    for (const n of chord) {
      tone(midi(n), t, eighth * 7.5, { type: 'triangle', gain: 0.022, attack: 0.5, release: 1.2, dest: musicBus, cutoff: 700 + 900 * bright, echo: 0.3 });
    }
  }

  // Bass auf der Eins und kurz vor der Mitte
  if (pos === 0 || pos === 5) {
    tone(midi(bass), t, eighth * (pos === 0 ? 4 : 2.5), { type: 'triangle', gain: 0.11, attack: 0.02, release: 0.3, dest: musicBus, cutoff: 500 });
  }

  // Zupf-Arpeggio, nachts nur jede zweite Achtel und eine Oktave tiefer
  if (night < 0.6 || pos % 2 === 0) {
    const order = [0, 1, 2, 3, 2, 1, 2, 3];
    const n = chord[order[pos]] + (night > 0.6 ? 0 : 12);
    tone(midi(n), t, eighth * 0.6, { type: 'square', gain: 0.012 * bright + 0.006, attack: 0.005, release: 0.25, dest: musicBus, cutoff: 900 + 1400 * bright, echo: 0.5 });
  }

  // Melodie
  const m = melody[(barIndex % 2) * STEPS + pos];
  if (m) {
    tone(midi(m.n), t, eighth * m.len * 0.9, { type: 'sine', gain: 0.05, attack: 0.02, release: 0.4, dest: musicBus, echo: 0.6 });
    tone(midi(m.n) * 2, t, eighth * m.len * 0.5, { type: 'sine', gain: 0.008, attack: 0.02, release: 0.3, dest: musicBus });
  }

  // leises Schlagwerk nur am Tag
  if (night < 0.5) {
    const soft = 1 - night * 2;
    if (pos === 0 || pos === 4) tone(110, t, 0.12, { gain: 0.09 * soft, slide: 0.4, dest: musicBus, release: 0.1 });
    if (pos % 2 === 1) hiss(t, 0.04, { gain: 0.012 * soft, freq: 7000, dest: musicBus });
    if (pos === 4) hiss(t, 0.12, { gain: 0.02 * soft, freq: 1800, type: 'bandpass', dest: musicBus });
  }
}

function scheduler() {
  if (!ctx || ctx.state !== 'running') return;
  const eighth = 60 / BPM / 2;
  if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
  while (nextTime < ctx.currentTime + 0.2) {
    if (settings.music > 0 && !settings.muted) playStep(step, nextTime);
    nextTime += eighth;
    step++;
  }
}

// ---------------------------------------------------------------- Soundeffekte

const notes = (list, gap, opts) => {
  const t = ctx.currentTime + 0.01;
  list.forEach((n, i) => tone(midi(n), t + i * gap, opts.dur ?? gap, opts));
};

const SFX = {
  click() {
    tone(1400, ctx.currentTime, 0.02, { type: 'square', gain: 0.025, release: 0.03, cutoff: 3000 });
  },
  open() {
    notes([72, 79], 0.06, { type: 'triangle', gain: 0.07, release: 0.15 });
  },
  close() {
    notes([79, 72], 0.05, { type: 'triangle', gain: 0.05, release: 0.12 });
  },
  coin() {
    notes([83, 88], 0.06, { type: 'square', gain: 0.045, release: 0.12, cutoff: 5000 });
  },
  gold() {
    const t = ctx.currentTime;
    for (let i = 0; i < 6; i++) tone(midi([84, 88, 91, 86, 89, 93][i]), t + i * 0.045, 0.05, { type: 'square', gain: 0.03, release: 0.1, cutoff: 5000 });
  },
  pull() {
    const t = ctx.currentTime;
    hiss(t, 0.35, { gain: 0.05, freq: 2500, type: 'bandpass' });
    [72, 76, 79, 84, 88].forEach((n, i) => tone(midi(n), t + 0.08 + i * 0.06, 0.12, { type: 'triangle', gain: 0.06, release: 0.3 }));
  },
  // Pop-up für ein Sammelstück: je seltener, desto prächtiger
  reveal(tier = 0) {
    const t = ctx.currentTime + 0.02;
    if (tier < 3) {
      notes([79, 84], 0.08, { type: 'triangle', gain: 0.07, release: 0.3 });
      return;
    }
    const runs = { 3: [72, 76, 79, 84], 4: [72, 76, 79, 84, 88, 91], 5: [72, 76, 79, 83, 86, 88, 91, 96] }[tier];
    runs.forEach((n, i) => tone(midi(n), t + i * 0.07, 0.14, { type: 'square', gain: 0.035, release: 0.2, cutoff: 4000 }));
    const end = t + runs.length * 0.07;
    const chord = tier === 5 ? [72, 76, 79, 83, 88] : [72, 76, 79, 84];
    for (const n of chord) tone(midi(n), end, tier === 5 ? 1.6 : 0.9, { type: 'triangle', gain: 0.05, attack: 0.02, release: 0.8 });
    if (tier >= 4) for (let i = 0; i < 8; i++) tone(midi(96 + (i % 4) * 3), end + 0.1 + i * 0.09, 0.05, { gain: 0.025, release: 0.15 });
  },
  build() {
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      tone(140, t + i * 0.13, 0.06, { type: 'square', gain: 0.07, slide: 0.5, cutoff: 900 });
      hiss(t + i * 0.13, 0.05, { gain: 0.06, freq: 1200, type: 'bandpass' });
    }
    notes([72, 76, 79, 84].map((n) => n), 0.07, { type: 'triangle', gain: 0.06, release: 0.4, dur: 0.1 });
  },
  levelUp() {
    notes([67, 72, 76, 79, 84], 0.055, { type: 'square', gain: 0.035, release: 0.25, cutoff: 3500, dur: 0.08 });
  },
  start() {
    const t = ctx.currentTime;
    tone(90, t, 0.18, { gain: 0.12, slide: 0.5 });
    tone(90, t + 0.22, 0.18, { gain: 0.12, slide: 0.5 });
    notes([60, 67], 0.2, { type: 'triangle', gain: 0.06, release: 0.3, dur: 0.15 });
  },
  win() {
    const t = ctx.currentTime + 0.02;
    [[67, 0], [72, 0.12], [76, 0.24], [79, 0.36], [84, 0.56]].forEach(([n, d]) => tone(midi(n), t + d, d === 0.56 ? 0.8 : 0.1, { type: 'square', gain: 0.04, release: 0.4, cutoff: 3500 }));
    for (const n of [60, 64, 67]) tone(midi(n), t + 0.56, 0.9, { type: 'triangle', gain: 0.05, release: 0.6 });
  },
  lose() {
    const t = ctx.currentTime + 0.02;
    [[67, 0], [63, 0.22], [60, 0.44], [55, 0.66]].forEach(([n, d]) => tone(midi(n), t + d, 0.2, { type: 'triangle', gain: 0.07, release: 0.4, slide: d === 0.66 ? 0.94 : 0 }));
  },
  fight() {
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      tone(70, t + i * 0.12, 0.1, { gain: 0.14, slide: 0.5 });
      hiss(t + i * 0.12, 0.06, { gain: 0.05, freq: 900, type: 'bandpass' });
    }
    hiss(t + 0.36, 0.3, { gain: 0.06, freq: 4000 });
  },
  sell() {
    SFX.gold();
  },
  error() {
    tone(150, ctx.currentTime, 0.15, { type: 'square', gain: 0.04, cutoff: 600, release: 0.08 });
  },
  notify() {
    notes([84, 91], 0.1, { type: 'sine', gain: 0.07, release: 0.5 });
  },
  door() {
    const t = ctx.currentTime;
    tone(180, t, 0.08, { type: 'square', gain: 0.05, slide: 0.6, cutoff: 700 });
    hiss(t, 0.08, { gain: 0.05, freq: 900, type: 'bandpass' });
    tone(150, t + 0.12, 0.08, { type: 'square', gain: 0.04, slide: 0.6, cutoff: 600 });
    notes([79, 84], 0.09, { type: 'triangle', gain: 0.04, release: 0.25 });
  },
  sleep() {
    // kleines Schlaflied
    const t = ctx.currentTime + 0.05;
    [[76, 0], [74, 0.4], [72, 0.8], [67, 1.2], [72, 1.8]].forEach(([n, d]) => tone(midi(n), t + d, 0.38, { type: 'sine', gain: 0.07, release: 0.6, attack: 0.04 }));
  },
  pick() {
    const t = ctx.currentTime;
    tone(1900 + Math.random() * 400, t, 0.03, { type: 'square', gain: 0.02, release: 0.06, cutoff: 5000 });
    hiss(t, 0.05, { gain: 0.025, freq: 2500, type: 'bandpass' });
  },
  lift() {
    const t = ctx.currentTime;
    hiss(t, 0.5, { gain: 0.05, freq: 300, type: 'lowpass' });
    tone(70, t, 0.45, { type: 'square', gain: 0.03, cutoff: 300 });
    tone(midi(84), t + 0.45, 0.2, { type: 'sine', gain: 0.05, release: 0.4 });
  },
  trader() {
    notes([72, 76, 79, 76, 84], 0.09, { type: 'triangle', gain: 0.06, release: 0.3 });
  },
  cast() {
    const t = ctx.currentTime;
    hiss(t, 0.25, { gain: 0.05, freq: 2000, type: 'bandpass' });
    tone(midi(79), t + 0.3, 0.1, { type: 'sine', gain: 0.05, slide: 0.6, release: 0.15 });
  },
  bite() {
    const t = ctx.currentTime;
    hiss(t, 0.18, { gain: 0.07, freq: 900, type: 'bandpass' });
    notes([88, 88], 0.09, { type: 'square', gain: 0.04, release: 0.08, cutoff: 4000, dur: 0.05 });
  },
  spell() {
    const t = ctx.currentTime;
    [72, 76, 79, 83, 86, 91, 95].forEach((n, i) => tone(midi(n), t + i * 0.05, 0.25, { type: 'sine', gain: 0.05, release: 0.5 }));
    hiss(t, 0.6, { gain: 0.03, freq: 6000 });
  },
  wish() {
    const t = ctx.currentTime;
    [84, 88, 91, 96, 100].forEach((n, i) => tone(midi(n), t + i * 0.06, 0.2, { type: 'sine', gain: 0.05, release: 0.6 }));
    hiss(t, 0.4, { gain: 0.03, freq: 7000 });
  },
  pause() {
    notes([76, 69], 0.08, { type: 'triangle', gain: 0.06, release: 0.2 });
  },
  resume() {
    notes([69, 76], 0.08, { type: 'triangle', gain: 0.06, release: 0.2 });
  },
};

let lastSfx = 0;

// ---------------------------------------------------------------- Öffentliche Schnittstelle

export const audio = {
  // muss aus einer Benutzereingabe heraus aufgerufen werden
  unlock() {
    if (!ctx && !setup()) return;
    if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
    if (!timer) timer = setInterval(scheduler, 50);
  },

  play(name, arg) {
    if (!ctx || ctx.state !== 'running' || settings.muted || settings.sfx <= 0) return;
    lastSfx = performance.now();
    SFX[name]?.(arg);
  },

  // Klick nur, wenn nicht gerade schon ein passender Effekt lief
  click() {
    if (performance.now() - lastSfx > 60) audio.play('click');
  },

  setNight(value) {
    night = value;
  },
  setDucked(value) {
    if (ducked === value) return;
    ducked = value;
    applyVolumes();
  },

  get settings() {
    return { ...settings };
  },
  set(key, value) {
    settings[key] = value;
    saveSettings();
    applyVolumes();
    for (const fn of listeners) fn();
  },
  toggleMute() {
    audio.set('muted', !settings.muted);
  },
  onChange: (fn) => listeners.add(fn),
};

// Im Hintergrund-Tab pausieren, beim Zurückkehren weiterspielen.
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend();
  else ctx.resume();
});
