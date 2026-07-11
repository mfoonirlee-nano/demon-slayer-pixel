import { ctx } from "./context";
import type { Skill, SpriteSheet } from "../types/assets";

export type SpriteFrameEffect = {
  filter?: string;
  tint?: {
    color: string;
    alpha: number;
  };
};

type CachedEffectFrame = {
  canvas: HTMLCanvasElement;
  drawW: number;
  drawH: number;
};

const tintedFrameCache = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>();
const effectFrameCache = new WeakMap<HTMLImageElement, Map<string, CachedEffectFrame>>();
const skillSheetCache = new WeakMap<Skill, SpriteSheet>();
const MAX_CACHED_FRAMES_PER_IMAGE = 32;

function imageCache<T>(cache: WeakMap<HTMLImageElement, Map<string, T>>, image: HTMLImageElement) {
  let entries = cache.get(image);
  if (!entries) {
    entries = new Map();
    cache.set(image, entries);
  }
  return entries;
}

function cacheFrame<T>(cache: Map<string, T>, key: string, value: T) {
  if (!cache.has(key) && cache.size >= MAX_CACHED_FRAMES_PER_IMAGE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, value);
}

function tintedFrameCanvas(
  sheet: SpriteSheet,
  safeFrame: number,
  color: string,
  width: number,
  height: number,
) {
  if (!sheet.image || typeof document === "undefined") return null;
  const cache = imageCache(tintedFrameCache, sheet.image);
  const key = `${safeFrame}:${color}:${width}x${height}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const canvasCtx = canvas.getContext("2d");
  if (!canvasCtx) return null;

  canvasCtx.imageSmoothingEnabled = false;
  canvasCtx.drawImage(
    sheet.image,
    safeFrame * sheet.frameW,
    0,
    sheet.frameW,
    sheet.frameH,
    0,
    0,
    width,
    height,
  );
  canvasCtx.globalCompositeOperation = "source-in";
  canvasCtx.fillStyle = color;
  canvasCtx.fillRect(0, 0, width, height);
  cacheFrame(cache, key, canvas);
  return canvas;
}

function spatialFilterPadding(filter: string | undefined) {
  if (!filter || (!filter.includes("drop-shadow(") && !filter.includes("blur("))) return 0;
  const pixelValues = [...filter.matchAll(/(-?\d+(?:\.\d+)?)px/g)]
    .map((match) => Math.abs(Number(match[1])));
  return Math.ceil(Math.max(0, ...pixelValues) * 2);
}

function effectFrameCanvas(
  sheet: SpriteSheet,
  safeFrame: number,
  w: number,
  h: number,
  effect: SpriteFrameEffect,
): CachedEffectFrame | null {
  if (!sheet.image || typeof document === "undefined") return null;

  const padding = spatialFilterPadding(effect.filter);
  const contentW = Math.max(1, Math.ceil(w));
  const contentH = Math.max(1, Math.ceil(h));
  const key = [
    safeFrame,
    effect.filter ?? "",
    effect.tint?.color ?? "",
    effect.tint?.alpha ?? "",
    `${contentW}x${contentH}`,
  ].join(":");
  const cache = imageCache(effectFrameCache, sheet.image);
  const cached = cache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = contentW + padding * 2;
  canvas.height = contentH + padding * 2;
  const canvasCtx = canvas.getContext("2d");
  if (!canvasCtx) return null;

  canvasCtx.imageSmoothingEnabled = false;
  canvasCtx.save();
  if (effect.filter) canvasCtx.filter = effect.filter;
  canvasCtx.drawImage(
    sheet.image,
    safeFrame * sheet.frameW,
    0,
    sheet.frameW,
    sheet.frameH,
    padding,
    padding,
    contentW,
    contentH,
  );
  if (effect.tint) {
    const tinted = tintedFrameCanvas(sheet, safeFrame, effect.tint.color, contentW, contentH);
    if (tinted) {
      canvasCtx.globalAlpha = effect.tint.alpha;
      canvasCtx.drawImage(tinted, padding, padding, contentW, contentH);
    }
  }
  canvasCtx.restore();

  const effectFrame = {
    canvas,
    drawW: w + padding * 2,
    drawH: h + padding * 2,
  };
  cacheFrame(cache, key, effectFrame);
  return effectFrame;
}

function drawFrameTint(
  sheet: SpriteSheet,
  safeFrame: number,
  x: number,
  y: number,
  w: number,
  h: number,
  tint: NonNullable<SpriteFrameEffect["tint"]>,
) {
  if (!ctx) return;
  const tinted = tintedFrameCanvas(
    sheet,
    safeFrame,
    tint.color,
    Math.max(1, Math.ceil(w)),
    Math.max(1, Math.ceil(h)),
  );
  if (!tinted) return;

  ctx.save();
  ctx.globalAlpha *= tint.alpha;
  ctx.drawImage(tinted, x, y, w, h);
  ctx.restore();
}

export function drawSheetFrame(
  sheet: SpriteSheet,
  frame: number,
  x: number,
  y: number,
  w: number,
  h: number,
  facing = 1,
  effect?: SpriteFrameEffect,
) {
  if (!ctx || !sheet.image) return;
  const safeFrame = ((frame % sheet.count) + sheet.count) % sheet.count;
  const sx = safeFrame * sheet.frameW;
  const inheritedFilter = ctx.filter;
  const canFlattenTint = !effect?.tint || (
    ctx.globalAlpha === 1 && ctx.globalCompositeOperation === "source-over"
  );
  const canReplaceInheritedFilter = Boolean(effect?.filter) || inheritedFilter === "none";
  const cachedEffectFrame = effect && canFlattenTint && canReplaceInheritedFilter
    ? effectFrameCanvas(sheet, safeFrame, w, h, effect)
    : null;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(facing, 1);
  if (cachedEffectFrame) {
    if (effect?.filter && inheritedFilter !== "none") ctx.filter = "none";
    ctx.drawImage(
      cachedEffectFrame.canvas,
      -cachedEffectFrame.drawW / 2,
      -cachedEffectFrame.drawH / 2,
      cachedEffectFrame.drawW,
      cachedEffectFrame.drawH,
    );
  } else {
    if (effect?.filter) ctx.filter = effect.filter;
    ctx.drawImage(sheet.image, sx, 0, sheet.frameW, sheet.frameH, -w / 2, -h / 2, w, h);
    if (effect?.tint) drawFrameTint(sheet, safeFrame, -w / 2, -h / 2, w, h, effect.tint);
  }
  ctx.restore();
}

function spriteSheetForSkill(skill: Skill) {
  const frameH = skill.frameH || skill.image?.height || 1;
  let sheet = skillSheetCache.get(skill);
  if (!sheet) {
    sheet = {
      src: skill.src,
      frameW: skill.frameW,
      frameH,
      count: skill.frameCount,
      image: skill.image,
    };
    skillSheetCache.set(skill, sheet);
  }
  sheet.image = skill.image;
  return sheet;
}

export function drawSkillFrame(
  skill: Skill,
  frame: number,
  x: number,
  y: number,
  w: number,
  h: number,
  facing = 1,
  effect?: SpriteFrameEffect,
) {
  if (!ctx || !skill.image) return;
  drawSheetFrame(spriteSheetForSkill(skill), frame, x, y, w, h, facing, effect);
}
