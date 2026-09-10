import { describe, expect, it } from "vitest";
import {
  GROUND_Y,
  SPIDER_STRING_ATTACK_SHEET,
  SPIDER_STRING_PILLAR_CAST_SHEET,
  SPIDER_STRING_ULTIMATE_CAST_SHEET,
} from "../../constants";
import { bossCastDuration } from "./attackTiming";
import { createBossEncounter } from "./encounter";
import { resolveBossVisualFrame } from "./renderBoss";

describe("Spider String body registration", () => {
  it.each([
    { mode: "spiderString", action: "windup", sheet: SPIDER_STRING_ATTACK_SHEET, footPixelY: 350 },
    { mode: "spiderStringPillars", action: "cast", sheet: SPIDER_STRING_PILLAR_CAST_SHEET, footPixelY: 350 },
    { mode: "spiderStringCage", action: "cast", sheet: SPIDER_STRING_ULTIMATE_CAST_SHEET, footPixelY: 383 },
  ] as const)("keeps $action/$mode feet at the same world baseline", ({ mode, action, sheet, footPixelY }) => {
    const boss = createBossEncounter({
      id: "spider-string",
      bossKills: 0,
      elapsedSeconds: 0,
      awakened: true,
    });
    boss.entering = false;
    boss.y = GROUND_Y - boss.h;
    boss.actionState = action;
    boss.actionTimer = 0;
    boss.skillMode = mode;
    boss.castTimer = action === "cast" ? bossCastDuration(boss) : 0;
    const collisionBody = { x: boss.x, y: boss.y, w: boss.w, h: boss.h };

    const pose = resolveBossVisualFrame(boss, 0);

    expect(pose.sheet).toBe(sheet);
    expect(pose.frame).toBe(0);
    expect(pose.x + pose.w / 2).toBeCloseTo(boss.x + boss.w / 2);
    expect(pose.y + pose.h * footPixelY / sheet.frameH).toBeCloseTo(GROUND_Y);
    expect(boss).toMatchObject(collisionBody);
  });
});
