// Tastatur + Touch. `axis()` liefert -1 (links), 0 oder 1 (rechts).
const keys = new Set();
let pointerDir = 0;

const LEFT = ['ArrowLeft', 'KeyA'];
const RIGHT = ['ArrowRight', 'KeyD'];

export function initInput(canvas) {
  addEventListener('keydown', (e) => {
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
  const k = (RIGHT.some((c) => keys.has(c)) ? 1 : 0) - (LEFT.some((c) => keys.has(c)) ? 1 : 0);
  return k !== 0 ? k : pointerDir;
}
