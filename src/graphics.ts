import { ctx } from "./context";
import type { Skill, SpriteSheet } from "./types/assets";

export function drawSheetFrame(sheet: SpriteSheet, frame: number, x: number, y: number, w: number, h: number, facing = 1) {
  if (!ctx || !sheet.image) return;
  const safeFrame = ((frame % sheet.count) + sheet.count) % sheet.count;
  const sx = safeFrame * sheet.frameW;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(facing, 1);
  ctx.drawImage(sheet.image, sx, 0, sheet.frameW, sheet.frameH, -w / 2, -h / 2, w, h);
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
