import { PLATFORM_LAYERS, PLATFORM_SPRITES } from "../../constants";
import type { PlatformSpriteSheet } from "../../constants";
import type { PlatformLayer } from "../../types/game-state";

export function layerY(layer: PlatformLayer): number {
  const range = PLATFORM_LAYERS[layer];
  return range.yMin + Math.random() * (range.yMax - range.yMin);
}

export function yToLayer(y: number): PlatformLayer {
  if (y <= PLATFORM_LAYERS.top.yMax) return "top";
  if (y <= PLATFORM_LAYERS.high.yMax) return "high";
  if (y <= PLATFORM_LAYERS.mid.yMax) return "mid";
  return "low";
}

export function layerAbove(layer: PlatformLayer): PlatformLayer {
  if (layer === "low") return "mid";
  if (layer === "mid") return "high";
  return "top";
}

export function layerBelow(layer: PlatformLayer): PlatformLayer {
  if (layer === "top") return "high";
  if (layer === "high") return "mid";
  return "low";
}

export function farReachableLayer(layer: PlatformLayer): PlatformLayer {
  if (layer === "low") return "mid";
  if (layer === "mid") return Math.random() < 0.5 ? "low" : "high";
  if (layer === "high") return Math.random() < 0.5 ? "mid" : "top";
  return "high";
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

export function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function weightedPick<T extends string>(weights: Record<T, number>): T {
  let total = 0;
  for (const value of Object.values(weights)) total += value as number;

  let roll = Math.random() * total;
  for (const [key, value] of Object.entries(weights) as Array<[T, number]>) {
    roll -= value;
    if (roll <= 0) return key;
  }

  return Object.keys(weights)[0] as T;
}

function randomSpriteIndex(kind: "normal" | "chain" | "wide"): number {
  const pool = PLATFORM_SPRITES[kind];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function nearestSpriteIndex(
  sheet: PlatformSpriteSheet,
  kind: "normal" | "chain" | "wide",
  width: number,
): number {
  const pool = sheet[kind];
  return pool.reduce((best, current) => {
    const bestDelta = Math.abs(sheet.regions[best].sw * sheet.drawScale - width);
    const currentDelta = Math.abs(sheet.regions[current].sw * sheet.drawScale - width);
    return currentDelta < bestDelta ? current : best;
  }, pool[0]);
}

export function platformWidth(kind: "normal" | "chain" | "wide"): number {
  return Math.round(PLATFORM_SPRITES.regions[randomSpriteIndex(kind)].sw * PLATFORM_SPRITES.drawScale);
}
