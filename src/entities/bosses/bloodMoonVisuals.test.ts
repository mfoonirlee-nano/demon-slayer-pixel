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

describe("blood moon action visuals", () => {
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
