import { WORLD_W, WALK_Y } from './config.js';
import { clamp } from './utils.js';
import { axis } from './input.js';
import { makePlayerSprites } from './sprites.js';

const SPEED = 52; // Pixel pro Sekunde – gemütliches Schlendern

export function createPlayer() {
  const sprites = makePlayerSprites();
  const p = { x: 150, facing: 1, moving: false, walkTime: 0, time: 0 };

  p.update = (dt) => {
    const dir = axis();
    p.time += dt;
    p.moving = dir !== 0;
    if (p.moving) {
      p.facing = dir;
      p.x = clamp(p.x + dir * SPEED * dt, 10, WORLD_W - 10);
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
