import { ctx } from "./context.js";

export function drawSheetFrame(sheet, frame, x, y, w, h, facing = 1) {
  if (!sheet.image) return;
  const safeFrame = ((frame % sheet.count) + sheet.count) % sheet.count;
  const sx = safeFrame * sheet.frameW;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(facing, 1);
  ctx.drawImage(
    sheet.image,
    sx,
    0,
    sheet.frameW,
    sheet.frameH,
    -w / 2,
    -h / 2,
    w,
    h,
  );
  ctx.restore();
}

export function drawVariableSheetFrame(skill, frame, x, y, w, h, facing = 1) {
  if (!skill.image || !skill.frameRanges || !skill.frameRanges.length) return;
  const safeFrame = ((frame % skill.frameRanges.length) + skill.frameRanges.length) % skill.frameRanges.length;
  const range = skill.frameRanges[safeFrame];
  if (!range) return;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(facing, 1);
  ctx.drawImage(
    skill.image,
    range.x,
    0,
    range.w,
    skill.frameH || skill.image.height,
    -w / 2,
    -h / 2,
    w,
    h,
  );
  ctx.restore();
}
