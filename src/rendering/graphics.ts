import { ctx } from "./context";
import type { Skill, SpriteSheet } from "../types/assets";

export type SpriteFrameEffect = {
  filter?: string;
  tint?: {
    color: string;
    alpha: number;
  };
};

const tintedFrameCache = new Map<string, HTMLCanvasElement>();

function tintedFrameCanvas(sheet: SpriteSheet, safeFrame: number, color: string) {
  if (!sheet.image || typeof document === "undefined") return null;
  const key = `${sheet.src}:${safeFrame}:${color}`;
  const cached = tintedFrameCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = sheet.frameW;
  canvas.height = sheet.frameH;
  const canvasCtx = canvas.getContext("2d");
  if (!canvasCtx) return null;

  canvasCtx.drawImage(sheet.image, safeFrame * sheet.frameW, 0, sheet.frameW, sheet.frameH, 0, 0, sheet.frameW, sheet.frameH);
  canvasCtx.globalCompositeOperation = "source-in";
  canvasCtx.fillStyle = color;
  canvasCtx.fillRect(0, 0, sheet.frameW, sheet.frameH);
  tintedFrameCache.set(key, canvas);
  return canvas;
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
  const tinted = tintedFrameCanvas(sheet, safeFrame, tint.color);
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
  rotation = 0,
) {
  if (!ctx || !sheet.image) return;
  const safeFrame = ((frame % sheet.count) + sheet.count) % sheet.count;
  const sx = safeFrame * sheet.frameW;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(facing, 1);
  if (rotation !== 0) ctx.rotate(rotation);
  if (effect?.filter) ctx.filter = effect.filter;
  ctx.drawImage(sheet.image, sx, 0, sheet.frameW, sheet.frameH, -w / 2, -h / 2, w, h);
  if (effect?.tint) drawFrameTint(sheet, safeFrame, -w / 2, -h / 2, w, h, effect.tint);
  ctx.restore();
}

export function drawSkillFrame(skill: Skill, frame: number, x: number, y: number, w: number, h: number, facing = 1) {
  if (!ctx || !skill.image) return;
  const safeFrame = ((frame % skill.frameCount) + skill.frameCount) % skill.frameCount;
  const sx = safeFrame * skill.frameW;
  const srcH = skill.frameH || skill.image.height;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(facing, 1);
  ctx.drawImage(skill.image, sx, 0, skill.frameW, srcH, -w / 2, -h / 2, w, h);
  ctx.restore();
}
