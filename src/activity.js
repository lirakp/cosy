// Spielt gerade jemand? Bossrush und Abstieg laufen nur dann weiter: das Spiel muss
// sichtbar sein (nicht minimiert, nicht im Hintergrund-Tab) und es muss in den
// letzten IDLE_MINUTES eine Eingabe (Taste, Klick, Tippen) gegeben haben.

export const IDLE_MINUTES = 5;

let lastInput = Date.now();

export function init(target = globalThis) {
  const mark = () => (lastInput = Date.now());
  for (const ev of ['keydown', 'pointerdown', 'wheel', 'touchstart']) target.addEventListener?.(ev, mark, { capture: true, passive: true });
}

export const idleSeconds = (now = Date.now()) => Math.max(0, (now - lastInput) / 1000);
export const hidden = () => typeof document !== 'undefined' && document.hidden;
export const playing = (now = Date.now()) => !hidden() && idleSeconds(now) < IDLE_MINUTES * 60;
// Warum gerade pausiert wird (für die Anzeige) oder null
export const pauseReason = (now = Date.now()) => (hidden() ? 'Spiel im Hintergrund' : idleSeconds(now) >= IDLE_MINUTES * 60 ? `seit ${IDLE_MINUTES} Minuten keine Eingabe` : null);
