import { GROUND_Y } from "./constants";
import type { PlatformState } from "./types/game-state";

const GROUND_CONTACT_EPSILON = 0.1;
const FRAMES_PER_SECOND = 60;

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
