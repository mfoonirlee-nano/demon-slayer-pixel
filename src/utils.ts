import { GROUND_Y } from "./constants";
import type { FrameRange } from "./types/assets";

export type RectLike = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Sprite load failed: ${src}`));
    img.src = src;
  });
}

export function onGround(entity: RectLike & { isPlayer?: boolean }, playerOnPlatform: unknown) {
  return entity.y + entity.h >= GROUND_Y - 0.1 || (entity.isPlayer && !!playerOnPlatform);
}

export function hitbox(a: RectLike, b: RectLike) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function frameIndex(frameCount: number, speed: number, elapsed: number, seed = 0) {
  return Math.floor((elapsed * 60 + seed) / speed) % frameCount;
}

export function buildEvenRanges(width: number, count: number): FrameRange[] {
  const ranges: FrameRange[] = [];
  for (let i = 0; i < count; i += 1) {
    const sx = Math.floor((i * width) / count);
    const ex = i === count - 1 ? width : Math.floor(((i + 1) * width) / count);
    ranges.push({ x: sx, w: Math.max(1, ex - sx) });
  }
  return ranges;
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function colorLerp(c1: number[], c2: number[], t: number) {
  const r = Math.round(lerp(c1[0], c2[0], t));
  const g = Math.round(lerp(c1[1], c2[1], t));
  const b = Math.round(lerp(c1[2], c2[2], t));
  return `rgb(${r},${g},${b})`;
}
