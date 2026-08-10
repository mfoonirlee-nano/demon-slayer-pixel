import {
  BLOOD_MOON_CONFIG,
  BLOOD_MOON_FINAL_STAGGER_SHEET,
  BLOOD_MOON_LANTERN_BELL_CAST_SHEET,
  BLOOD_MOON_MANY_FACES_CAST_SHEET,
  BLOOD_MOON_MIRROR_FANG_CAST_SHEET,
  BLOOD_MOON_PHASE_SHIFT_SHEET,
  BLOOD_MOON_RECOVER_SHEET,
  BLOOD_MOON_SIXFOLD_CAST_SHEET,
  BLOOD_MOON_SPIDER_MIST_CAST_SHEET,
} from "../../constants";
import type { BossVisualFrameState } from "../../types/game-state";
import { bossCastDuration } from "./attackTiming";
import { bossArchetypeForId } from "./registry";
import type { LiveBoss } from "./types";

const SPIDER_SHIFT_FRAME = 0;
const BONE_SHIFT_FRAME = 1;
const MIRROR_SHIFT_FRAME = 2;
const FANG_SHIFT_FRAME = 3;
const LANTERN_SHIFT_FRAME = 4;
const BELL_SHIFT_FRAME = 5;
const MIRROR_FANG_PHASE = 2;
const LANTERN_BELL_PHASE = 3;
const SIXFOLD_PHASE = 4;
const MANY_FACES_PHASE = 5;
const ALL_SHIFT_FRAMES = [
  SPIDER_SHIFT_FRAME,
  BONE_SHIFT_FRAME,
  MIRROR_SHIFT_FRAME,
  FANG_SHIFT_FRAME,
  LANTERN_SHIFT_FRAME,
  BELL_SHIFT_FRAME,
] as const;

export function resolveBloodMoonActionVisual(
  boss: LiveBoss,
): BossVisualFrameState | null {
  const archetype = bossArchetypeForId(boss.id);
  const centerX = boss.x + boss.w / 2;
  const feetY = boss.y + boss.h;

  if ((boss.phaseShiftTimer ?? 0) > 0) {
    const elapsed = BLOOD_MOON_CONFIG.phaseShiftFrames
      - (boss.phaseShiftTimer ?? 0);
    return castPose(
      boss,
      BLOOD_MOON_PHASE_SHIFT_SHEET,
      phaseShiftFrame(boss.phase, elapsed),
    );
  }

  if (boss.castTimer > 0) {
    const sheet = bloodMoonCastSheet(boss);
    const duration = bossCastDuration(boss);
    const elapsed = duration - boss.castTimer;
    return castPose(boss, sheet, proportionalFrame(sheet.count, elapsed, duration));
  }

  if (boss.recoveryTimer <= 0) return null;
  if (boss.skillMode === "bloodMoonManyFaces" && boss.bloodMoonExposed) {
    const elapsed = BLOOD_MOON_CONFIG.finalExposureFrames - boss.recoveryTimer;
    const frame = Math.floor(
      Math.max(0, elapsed) / BLOOD_MOON_CONFIG.staggerFrameDuration,
    ) % BLOOD_MOON_FINAL_STAGGER_SHEET.count;
    return castPose(boss, BLOOD_MOON_FINAL_STAGGER_SHEET, frame);
  }

  const duration = boss.skillMode === "bloodMoonManyFaces"
    ? BLOOD_MOON_CONFIG.finalSettleFrames
    : BLOOD_MOON_CONFIG.recoveryFrames;
  const timer = boss.skillMode === "bloodMoonManyFaces"
    ? Math.max(0, boss.recoveryTimer - BLOOD_MOON_CONFIG.finalExposureFrames)
    : boss.recoveryTimer;
  return castPose(
    boss,
    BLOOD_MOON_RECOVER_SHEET,
    proportionalFrame(BLOOD_MOON_RECOVER_SHEET.count, duration - timer, duration),
  );

  function castPose(
    source: LiveBoss,
    sheet: BossVisualFrameState["sheet"],
    frame: number,
  ): BossVisualFrameState {
    return {
      sheet,
      frame,
      x: centerX - archetype.castDrawW / 2,
      y: feetY - archetype.castDrawH + archetype.castBottomPadding,
      w: archetype.castDrawW,
      h: archetype.castDrawH,
      facing: source.castTimer > 0 ? source.castFacing : source.facing,
    };
  }
}

function phaseShiftFrame(phase: number, elapsed: number) {
  const frames = phaseShiftFrames(phase);
  return frames[proportionalFrame(
    frames.length,
    elapsed,
    BLOOD_MOON_CONFIG.phaseShiftFrames,
  )] ?? SPIDER_SHIFT_FRAME;
}

function phaseShiftFrames(phase: number): readonly number[] {
  if (phase === MIRROR_FANG_PHASE) return [MIRROR_SHIFT_FRAME, FANG_SHIFT_FRAME];
  if (phase === LANTERN_BELL_PHASE) {
    return [LANTERN_SHIFT_FRAME, BELL_SHIFT_FRAME];
  }
  if (phase === SIXFOLD_PHASE) return ALL_SHIFT_FRAMES;
  if (phase === MANY_FACES_PHASE) return [...ALL_SHIFT_FRAMES].reverse();
  return ALL_SHIFT_FRAMES;
}

function bloodMoonCastSheet(boss: LiveBoss) {
  if (boss.skillMode === "bloodMoonMirrorFang") return BLOOD_MOON_MIRROR_FANG_CAST_SHEET;
  if (boss.skillMode === "bloodMoonLanternBell") return BLOOD_MOON_LANTERN_BELL_CAST_SHEET;
  if (boss.skillMode === "bloodMoonSixfold") return BLOOD_MOON_SIXFOLD_CAST_SHEET;
  if (boss.skillMode === "bloodMoonManyFaces") return BLOOD_MOON_MANY_FACES_CAST_SHEET;
  return BLOOD_MOON_SPIDER_MIST_CAST_SHEET;
}

function proportionalFrame(frameCount: number, elapsed: number, duration: number) {
  return Math.min(
    frameCount - 1,
    Math.floor(Math.min(elapsed, duration - 1) * frameCount / duration),
  );
}
