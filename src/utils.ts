import { GROUND_Y } from "./constants";
import type { PlatformState } from "./types/game-state";

const GROUND_CONTACT_EPSILON = 0.1;
const FRAMES_PER_SECOND = 60;
const HALF = 0.5;
const DEFAULT_HIT_JITTER_RATIO = 0.25;
const DEFAULT_OVERLAP_MAX_JITTER = 8;
const DEFAULT_NEAREST_HIT_JITTER = 6;

export type RectLike = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type RgbColor = readonly [number, number, number];

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Sprite load failed: ${src}`));
    img.src = src;
  });
}

export function onGround(entity: RectLike & { isPlayer?: boolean }, playerOnPlatform: PlatformState | null) {
  return entity.y + entity.h >= GROUND_Y - GROUND_CONTACT_EPSILON || (entity.isPlayer && playerOnPlatform !== null);
}

export function hitbox(a: RectLike, b: RectLike) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function overlapHitPoint(a: RectLike, b: RectLike, jitterRatio = DEFAULT_HIT_JITTER_RATIO, maxJitter = DEFAULT_OVERLAP_MAX_JITTER) {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.h, b.y + b.h);

  if (right <= left || bottom <= top) {
    return {
      x: clamp(a.x + a.w * HALF, b.x, b.x + b.w),
      y: clamp(a.y + a.h * HALF, b.y, b.y + b.h),
    };
  }

  const jitterX = Math.min((right - left) * jitterRatio, maxJitter);
  const jitterY = Math.min((bottom - top) * jitterRatio, maxJitter);

  return {
    x: clamp((left + right) * HALF + (Math.random() - HALF) * jitterX / HALF, left, right),
    y: clamp((top + bottom) * HALF + (Math.random() - HALF) * jitterY / HALF, top, bottom),
  };
}

export function nearestRectHitPoint(target: RectLike, sourceX: number, sourceY: number, jitter = DEFAULT_NEAREST_HIT_JITTER) {
  const x = clamp(sourceX, target.x, target.x + target.w);
  const y = clamp(sourceY, target.y, target.y + target.h);

  return {
    x: clamp(x + (Math.random() - HALF) * jitter / HALF, target.x, target.x + target.w),
    y: clamp(y + (Math.random() - HALF) * jitter / HALF, target.y, target.y + target.h),
  };
}

export function frameIndex(frameCount: number, speed: number, elapsed: number, seed = 0) {
  return Math.floor((elapsed * FRAMES_PER_SECOND + seed) / speed) % frameCount;
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function colorLerp(c1: RgbColor, c2: RgbColor, t: number) {
  const r = Math.round(lerp(c1[0], c2[0], t));
  const g = Math.round(lerp(c1[1], c2[1], t));
  const b = Math.round(lerp(c1[2], c2[2], t));
  return `rgb(${r},${g},${b})`;
}
