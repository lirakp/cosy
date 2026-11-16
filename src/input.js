// Tastatur + Touch. `axis()` liefert -1 (links), 0 oder 1 (rechts).
const keys = new Set();
let pointerDir = 0;
let blocked = false;

// Solange ein Menü offen ist, bleibt die Figur stehen.
export function setBlocked(value) {
  blocked = value;
  if (value) pointerDir = 0;
}

let tapHandler = null;

// Darf einen Klick auf die Spielfläche abfangen (Spielkoordinaten); true = erledigt.
export function setTapHandler(fn) {
  tapHandler = fn;
}

const LEFT = ['ArrowLeft', 'KeyA'];
const RIGHT = ['ArrowRight', 'KeyD'];

export function initInput(canvas) {
  addEventListener('keydown', (e) => {
    if (blocked) return;
    if (LEFT.includes(e.code) || RIGHT.includes(e.code)) e.preventDefault();
    keys.add(e.code);
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => {
    keys.clear();
    pointerDir = 0;
  });

  const point = (e) => {
    const r = canvas.getBoundingClientRect();
    pointerDir = e.clientX < r.left + r.width / 2 ? -1 : 1;
  };
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const gx = ((e.clientX - r.left) / r.width) * canvas.width;
    const gy = ((e.clientY - r.top) / r.height) * canvas.height;
    if (blocked || tapHandler?.(gx, gy)) return;
    canvas.setPointerCapture(e.pointerId);
    point(e);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pointerDir !== 0) point(e);
  });
  const release = () => (pointerDir = 0);
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
}

export function axis() {
  if (blocked) return 0;
  const k = (RIGHT.some((c) => keys.has(c)) ? 1 : 0) - (LEFT.some((c) => keys.has(c)) ? 1 : 0);
  return k !== 0 ? k : pointerDir;
}
