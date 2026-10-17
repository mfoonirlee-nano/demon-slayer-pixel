import { MOON_TIDE_PLAYER_SHEETS, PLAYER_DRAW, SKILLS } from "../constants";
import { MOON_TIDE_FRAME_EFFECTS } from "../constants/moonTideVisual";
import type { SpriteSheet } from "../types/assets";
import { prepareSheetFrameEffect } from "./graphics";

const PREPARATION_BATCH_SIZE = 4;

function preparationTarget(src: string): { sheet: SpriteSheet; w: number; h: number } | null {
  const playerSheet = Object.values(MOON_TIDE_PLAYER_SHEETS).find((sheet) => sheet.src === src);
  if (playerSheet) return { sheet: playerSheet, w: playerSheet.drawW, h: playerSheet.drawH };
  const skill = SKILLS.find((skill) => skill.implemented && skill.src === src);
  if (!skill?.image) return null;
  const frameH = skill.frameH || skill.image.height;
  const h = skill.drawScale ? frameH * skill.drawScale : PLAYER_DRAW.fallbackSkillDrawH;
  return {
    sheet: { src, frameW: skill.frameW, frameH, count: skill.frameCount, image: skill.image },
    w: h * (skill.frameW / frameH),
    h,
  };
}

export function prepareMoonTideSprite(src: string): Promise<void> | undefined {
  if (typeof document === "undefined") return;
  const target = preparationTarget(src);
  if (!target?.sheet.image) return;
  return prepareTarget(target);
}

async function prepareTarget(target: NonNullable<ReturnType<typeof preparationTarget>>) {
  let prepared = 0;
  for (let frame = 0; frame < target.sheet.count; frame += 1) {
    for (let level = 0; level <= MOON_TIDE_FRAME_EFFECTS.maxLevel; level += 1) {
      const expand = level === 0 ? 0 : MOON_TIDE_FRAME_EFFECTS.outlineExpandBase + level;
      const effect = level === 0 ? MOON_TIDE_FRAME_EFFECTS.ghost : MOON_TIDE_FRAME_EFFECTS.outline;
      if (!prepareSheetFrameEffect(target.sheet, frame, target.w + expand * 2, target.h + expand * 2, effect)) return;
      prepared += 1;
      // Yield a task (not just a microtask) so loading feedback can paint between
      // filter batches. Readiness includes this work, never the first combat frame.
      if (prepared % PREPARATION_BATCH_SIZE === 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }
  }
}
