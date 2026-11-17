import { WORLD_W, WALK_Y } from './config.js';
import { clamp } from './utils.js';
import { axis } from './input.js';
import { makePlayerSprites } from './sprites.js';
import { state } from './state.js';

const SPEED = 52; // Pixel pro Sekunde – gemütliches Schlendern

export function createPlayer() {
  let sprites = makePlayerSprites(state.outfit, state.character || {});
  // bounds: begehbarer Bereich (draußen die Welt, im Haus das Zimmer)
  const p = { x: 150, facing: 1, moving: false, walkTime: 0, time: 0, bounds: [10, WORLD_W - 10] };

  p.setOutfit = (id) => {
    sprites = makePlayerSprites(id ?? state.outfit, state.character || {});
  };

  p.update = (dt) => {
    const dir = axis();
    p.time += dt;
    p.moving = dir !== 0;
    if (p.moving) {
      p.facing = dir;
      p.x = clamp(p.x + dir * SPEED * dt, p.bounds[0], p.bounds[1]);
      p.walkTime += dt;
    } else {
      p.walkTime = 0;
    }
  };

  p.draw = (ctx, camX) => {
    const set = sprites[p.facing];
    let img = set.idle;
    if (p.moving) img = set.walk[Math.floor(p.walkTime * 8) % 4];
    else if (p.time % 3.4 < 0.14) img = set.blink;

    const x = Math.round(p.x - camX) - img.width / 2;
    const y = WALK_Y - img.height + 1;

    // weicher Schatten unter den Füßen
    ctx.fillStyle = 'rgba(42, 33, 64, 0.3)';
    ctx.fillRect(x + 2, WALK_Y, 8, 1);
    ctx.fillRect(x + 3, WALK_Y + 1, 6, 1);

    ctx.drawImage(img, x, y);
  };

  return p;
}
