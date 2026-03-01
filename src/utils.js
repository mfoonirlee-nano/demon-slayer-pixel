import { GROUND_Y, WIDTH } from "./constants.js";

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Sprite load failed: ${src}`));
    img.src = src;
  });
}

export function onGround(entity, playerOnPlatform) {
  return entity.y + entity.h >= GROUND_Y - 0.1 || (entity.isPlayer && !!playerOnPlatform);
}

export function hitbox(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function frameIndex(frameCount, speed, elapsed, seed = 0) {
  return Math.floor((elapsed * 60 + seed) / speed) % frameCount;
}

export function buildEvenRanges(width, count) {
  const ranges = [];
  for (let i = 0; i < count; i += 1) {
    const sx = Math.floor((i * width) / count);
    const ex = i === count - 1 ? width : Math.floor(((i + 1) * width) / count);
    ranges.push({ x: sx, w: Math.max(1, ex - sx) });
  }
  return ranges;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function colorLerp(c1, c2, t) {
  const r = Math.round(lerp(c1[0], c2[0], t));
  const g = Math.round(lerp(c1[1], c2[1], t));
  const b = Math.round(lerp(c1[2], c2[2], t));
  return `rgb(${r},${g},${b})`;
}
