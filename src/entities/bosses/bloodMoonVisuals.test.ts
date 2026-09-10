import { describe, expect, it } from "vitest";
import {
  BLOOD_MOON_CONFIG,
  BLOOD_MOON_FINAL_STAGGER_SHEET,
  BLOOD_MOON_PHASE_SHIFT_SHEET,
} from "../../constants";
import { createBossEncounter } from "./encounter";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import { resolveBloodMoonActionVisual } from "./bloodMoonVisuals";

const MIRROR_FANG_PHASE = 2;
const LANTERN_BELL_PHASE = 3;
const SIXFOLD_PHASE = 4;
const FINAL_PHASE = 5;
const SPIDER_SHIFT_FRAME = 0;
const MIRROR_SHIFT_FRAME = 2;
const FANG_SHIFT_FRAME = 3;
const LANTERN_SHIFT_FRAME = 4;
const BELL_SHIFT_FRAME = 5;
const STANDING_BODY_MIN_HEIGHT = 260;
const STANDING_BODY_MAX_HEIGHT = 280;
// Visible crown-to-feet heights of each cast's final recovery pose in its PNG.
const CAST_BODY_HEIGHTS = [
  { mode: "bloodMoonSpiderMist", bodyHeight: 301 },
  { mode: "bloodMoonMirrorFang", bodyHeight: 319 },
  { mode: "bloodMoonLanternBell", bodyHeight: 321 },
  { mode: "bloodMoonSixfold", bodyHeight: 367 },
  { mode: "bloodMoonManyFaces", bodyHeight: 296 },
] as const;

describe("blood moon action visuals", () => {
  it.each(CAST_BODY_HEIGHTS)("keeps $mode's standing body and feet aligned with movement", ({ mode, bodyHeight }) => {
    const boss = createBossEncounter({ id: BOSS_ARCHETYPE_IDS.bloodMoon, bossKills: 12, elapsedSeconds: 0 });
    boss.entering = false;
    boss.skillMode = mode;
    boss.castTimer = 1;
    const pose = resolveBloodMoonActionVisual(boss);
    expect(pose).not.toBeNull();
    if (!pose) throw new Error("Expected a cast pose");
    expect(pose.frame).toBe(pose.sheet.count - 1);
    expect(pose.x + pose.w / 2).toBeCloseTo(boss.x + boss.w / 2);
    expect(pose.y + pose.h).toBeCloseTo(boss.y + boss.h);
    const displayedBodyHeight = bodyHeight * pose.h / pose.sheet.frameH;
    expect(displayedBodyHeight).toBeGreaterThan(STANDING_BODY_MIN_HEIGHT);
    expect(displayedBodyHeight).toBeLessThan(STANDING_BODY_MAX_HEIGHT);
  });

  it.each([
    [MIRROR_FANG_PHASE, MIRROR_SHIFT_FRAME, FANG_SHIFT_FRAME],
    [LANTERN_BELL_PHASE, LANTERN_SHIFT_FRAME, BELL_SHIFT_FRAME],
    [SIXFOLD_PHASE, SPIDER_SHIFT_FRAME, BELL_SHIFT_FRAME],
    [FINAL_PHASE, BELL_SHIFT_FRAME, SPIDER_SHIFT_FRAME],
  ])(
    "shows only phase %i's traits during its transition",
    (phase, firstFrame, lastFrame) => {
      const boss = createBossEncounter({
        id: BOSS_ARCHETYPE_IDS.bloodMoon,
        bossKills: 12,
        elapsedSeconds: 0,
      });
      boss.entering = false;
      boss.phase = phase;
      boss.phaseShiftTimer = BLOOD_MOON_CONFIG.phaseShiftFrames;

      expect(resolveBloodMoonActionVisual(boss)).toMatchObject({
        sheet: BLOOD_MOON_PHASE_SHIFT_SHEET,
        frame: firstFrame,
      });
      const pose = resolveBloodMoonActionVisual(boss);
      expect(pose && pose.y + pose.h).toBeCloseTo(boss.y + boss.h);

      boss.phaseShiftTimer = 1;
      expect(resolveBloodMoonActionVisual(boss)).toMatchObject({
        sheet: BLOOD_MOON_PHASE_SHIFT_SHEET,
        frame: lastFrame,
      });
    },
  );

  it("loops the dedicated broken-moon pose only during the finale's safe exposure", () => {
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.bloodMoon,
      bossKills: 12,
      elapsedSeconds: 0,
    });
    boss.entering = false;
    boss.phase = FINAL_PHASE;
    boss.actionState = "recover";
    boss.skillMode = "bloodMoonManyFaces";
    boss.recoveryTimer = BLOOD_MOON_CONFIG.finalExposureFrames;
    boss.bloodMoonExposed = true;

    expect(resolveBloodMoonActionVisual(boss)).toMatchObject({
      sheet: BLOOD_MOON_FINAL_STAGGER_SHEET,
      frame: 0,
    });

    boss.recoveryTimer -= BLOOD_MOON_CONFIG.staggerFrameDuration * 2;
    expect(resolveBloodMoonActionVisual(boss)).toMatchObject({
      sheet: BLOOD_MOON_FINAL_STAGGER_SHEET,
      frame: 2,
    });
  });
});
