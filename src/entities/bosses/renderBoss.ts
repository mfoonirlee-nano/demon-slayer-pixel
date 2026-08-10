import {
  BLOOD_MOON_CONFIG,
  BLOOD_MOON_LANTERN_BELL_CAST_SHEET,
  BLOOD_MOON_MANY_FACES_CAST_SHEET,
  BLOOD_MOON_MIRROR_FANG_CAST_SHEET,
  BLOOD_MOON_PHASE_SHIFT_SHEET,
  BLOOD_MOON_RECOVER_SHEET,
  BOSS_CONFIG,
  BLOOD_MOON_SIXFOLD_CAST_SHEET,
  BLOOD_MOON_SPIDER_MIST_CAST_SHEET,
  BOSS_SKILL1_CONFIG,
  DEAD_BELL_AWAKENED_ECHO_BELL_SHEET,
  DEAD_BELL_CONFIG,
  DEAD_BELL_RECOVER_SHEET,
  FANG_GALE_BITE_SHEET,
  FANG_GALE_CONFIG,
  FANG_GALE_FINAL_BITE_SHEET,
  FANG_GALE_RECOVER_SHEET,
  FANG_GALE_RETREAT_SHEET,
  FANG_GALE_TURN_SHEET,
  LANTERN_EMBER_CONFIG,
  LANTERN_EMBER_BUFF_CAST_SHEET,
  LANTERN_EMBER_FIRELINE_CAST_SHEET,
  LANTERN_EMBER_SUMMON_SHEET,
  MIST_BONE_ATTACK_SHEET,
  MIST_BONE_CAGE_CAST_SHEET,
  MIST_BONE_CONFIG,
  MIST_BONE_LINE_CAST_SHEET,
  MIRROR_DREAM_CONFIG,
  MIRROR_DREAM_AWAKENED_CRACKS_SHEET,
  MIRROR_DREAM_CAST_AWAKENED_CRACKS_SHEET,
  MIRROR_DREAM_CAST_SHEET,
  MIRROR_DREAM_RECOVER_AWAKENED_CRACKS_SHEET,
  MIRROR_DREAM_RECOVER_SHEET,
  MIRROR_DREAM_SHEET,
  SPIDER_STRING_ATTACK_CONFIG,
  SPIDER_STRING_ATTACK_SHEET,
  SPIDER_STRING_CAGE_CONFIG,
  SPIDER_STRING_PILLAR_CAST_SHEET,
  SPIDER_STRING_PILLAR_CONFIG,
  SPIDER_STRING_ULTIMATE_CAST_SHEET,
} from "../../constants";
import { state } from "../../game/state";
import { frameIndex } from "../../game/utils";
import { ctx } from "../../rendering/context";
import { drawSheetFrame } from "../../rendering/graphics";
import type { SpriteFrameEffect } from "../../rendering/graphics";
import type { BossVisualFrameState } from "../../types/game-state";
import { bossCastDuration, spiderRushWindupFrames } from "./attackTiming";
import { BOSS_ARCHETYPE_IDS, bossArchetypeForId } from "./registry";
import type { LiveBoss } from "./types";

const SPIDER_RUSH_WINDUP_SPRITE_FRAMES = 3;
const DEAD_BELL_REPRISAL_WARNING_SPRITE_FRAMES = 3;
const AWAKENED_MIST_WISP_COUNT = 4;
const AWAKENED_MIST_WISP_RADIUS_X_SCALE = 0.82;
const AWAKENED_MIST_WISP_RADIUS_Y_SCALE = 0.22;
const AWAKENED_MIST_WISP_DRIFT_X = 9;
const AWAKENED_MIST_WISP_DRIFT_Y = 5;
const AWAKENED_MIST_WISP_PHASE_STEP = 1.4;
const AWAKENED_MIST_WISP_SPEED = 0.035;
const AWAKENED_MIST_CENTER_Y_SCALE = 0.68;
const AWAKENED_MIST_COLOR = "rgba(184, 211, 219, 0.2)";
const AWAKENED_MIST_BONE_EFFECT: SpriteFrameEffect = {
  filter: "saturate(0.82) brightness(1.12) drop-shadow(0 0 7px rgba(164, 224, 238, 0.9))",
  tint: { color: "#b7e8f1", alpha: 0.18 },
};
const AWAKENED_MIRROR_DREAM_EFFECT: SpriteFrameEffect = {
  filter: "saturate(0.92) contrast(1.08) brightness(1.04) drop-shadow(0 0 4px rgba(174, 225, 246, 0.82))",
};
const AWAKENED_DEAD_BELL_EFFECT: SpriteFrameEffect = {
  filter: "saturate(0.92) contrast(1.12) brightness(0.98) drop-shadow(0 0 5px rgba(154, 38, 26, 0.88))",
};
const AWAKENED_DEAD_BELL_ECHO_EFFECT: SpriteFrameEffect = {
  filter: "contrast(1.08) drop-shadow(0 0 5px rgba(190, 47, 28, 0.86))",
};
const AWAKENED_MIRROR_CRACK_ALPHA = 0.58;
const MIRROR_DREAM_DASH_POSE_FRAME = 1;

export function drawBoss() {
  const boss = state.boss;
  if (!boss) return;

  const pose = resolveBossVisualFrame(boss, state.elapsed);
  const isAwakenedMistBone = boss.id === BOSS_ARCHETYPE_IDS.mistBone && boss.awakened;
  const isAwakenedMirrorDream = boss.id === BOSS_ARCHETYPE_IDS.mirrorDream && boss.awakened;
  const isAwakenedDeadBell = boss.id === BOSS_ARCHETYPE_IDS.deadBell && boss.awakened;
  if (isAwakenedMistBone) drawAwakenedMistBoneAura(boss);
  if (isAwakenedDeadBell) drawAwakenedDeadBellEcho(boss);
  const effect = isAwakenedMistBone
    ? AWAKENED_MIST_BONE_EFFECT
    : isAwakenedMirrorDream
      ? AWAKENED_MIRROR_DREAM_EFFECT
      : isAwakenedDeadBell
        ? AWAKENED_DEAD_BELL_EFFECT
        : undefined;
  drawSheetFrame(
    pose.sheet,
    pose.frame,
    pose.x,
    pose.y,
    pose.w,
    pose.h,
    pose.facing,
    effect,
  );
  if (isAwakenedMirrorDream) drawAwakenedMirrorDreamCracks(pose);
}

function drawAwakenedDeadBellEcho(boss: LiveBoss) {
  const centerX = boss.x + boss.w / 2;
  const feetY = boss.y + boss.h;
  const frame = frameIndex(
    DEAD_BELL_AWAKENED_ECHO_BELL_SHEET.count,
    DEAD_BELL_CONFIG.awakenedEchoFrameDuration,
    state.elapsed,
    boss.animSeed,
  );
  drawSheetFrame(
    DEAD_BELL_AWAKENED_ECHO_BELL_SHEET,
    frame,
    centerX
      - boss.facing * DEAD_BELL_CONFIG.awakenedEchoHorizontalOffset
      - DEAD_BELL_CONFIG.awakenedEchoDrawW / 2,
    feetY
      - DEAD_BELL_CONFIG.awakenedEchoBottomOffset
      - DEAD_BELL_CONFIG.awakenedEchoDrawH,
    DEAD_BELL_CONFIG.awakenedEchoDrawW,
    DEAD_BELL_CONFIG.awakenedEchoDrawH,
    boss.facing,
    AWAKENED_DEAD_BELL_ECHO_EFFECT,
  );
}

function drawAwakenedMirrorDreamCracks(pose: BossVisualFrameState) {
  if (!ctx) return;
  const cracks = awakenedMirrorDreamCrackSheet(pose.sheet);
  if (!cracks) return;

  ctx.save();
  ctx.globalAlpha *= AWAKENED_MIRROR_CRACK_ALPHA;
  drawSheetFrame(
    cracks,
    pose.frame,
    pose.x,
    pose.y,
    pose.w,
    pose.h,
    pose.facing,
  );
  ctx.restore();
}

function awakenedMirrorDreamCrackSheet(sheet: BossVisualFrameState["sheet"]) {
  if (sheet === MIRROR_DREAM_SHEET) return MIRROR_DREAM_AWAKENED_CRACKS_SHEET;
  if (sheet === MIRROR_DREAM_CAST_SHEET) {
    return MIRROR_DREAM_CAST_AWAKENED_CRACKS_SHEET;
  }
  if (sheet === MIRROR_DREAM_RECOVER_SHEET) {
    return MIRROR_DREAM_RECOVER_AWAKENED_CRACKS_SHEET;
  }
  return null;
}

function drawAwakenedMistBoneAura(boss: LiveBoss) {
  if (!ctx) return;
  const centerX = boss.x + boss.w / 2;
  const centerY = boss.y + boss.h * AWAKENED_MIST_CENTER_Y_SCALE;
  const radiusX = boss.w * AWAKENED_MIST_WISP_RADIUS_X_SCALE;
  const radiusY = boss.h * AWAKENED_MIST_WISP_RADIUS_Y_SCALE;

  ctx.save();
  ctx.fillStyle = AWAKENED_MIST_COLOR;
  for (let index = 0; index < AWAKENED_MIST_WISP_COUNT; index += 1) {
    const phase = state.elapsed * AWAKENED_MIST_WISP_SPEED
      + index * AWAKENED_MIST_WISP_PHASE_STEP;
    ctx.beginPath();
    ctx.ellipse(
      centerX + Math.sin(phase) * AWAKENED_MIST_WISP_DRIFT_X,
      centerY + Math.cos(phase) * AWAKENED_MIST_WISP_DRIFT_Y,
      radiusX,
      radiusY,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
}

export function resolveBossVisualFrame(
  boss: LiveBoss,
  animationElapsed: number,
): BossVisualFrameState {
  const archetype = bossArchetypeForId(boss.id);
  const centerX = boss.x + boss.w / 2;
  const feetY = boss.y + boss.h;

  if (boss.id === BOSS_ARCHETYPE_IDS.bloodMoon && (boss.phaseShiftTimer ?? 0) > 0) {
    const elapsed = BLOOD_MOON_CONFIG.phaseShiftFrames - (boss.phaseShiftTimer ?? 0);
    const frame = Math.min(
      BLOOD_MOON_PHASE_SHIFT_SHEET.count - 1,
      Math.floor(elapsed / BLOOD_MOON_CONFIG.phaseShiftFrameDuration),
    );
    return visualFrame(
      BLOOD_MOON_PHASE_SHIFT_SHEET,
      frame,
      centerX - archetype.castDrawW / 2,
      feetY - archetype.castDrawH + archetype.castBottomPadding,
      archetype.castDrawW,
      archetype.castDrawH,
      boss.facing,
    );
  }

  if (boss.id === BOSS_ARCHETYPE_IDS.fangGale && boss.actionState === "retreat") {
    const frame = proportionalFrame(
      FANG_GALE_RETREAT_SHEET.count,
      boss.actionTimer,
      FANG_GALE_CONFIG.retreatFrames,
    );
    return fangGaleActionVisualFrame(
      boss,
      FANG_GALE_RETREAT_SHEET,
      frame,
    );
  }

  if (boss.castTimer > 0) {
    const castSheet = bossCastSheet(boss);
    const castDuration = bossCastDuration(boss);
    const pillarCast = boss.id === BOSS_ARCHETYPE_IDS.spiderString
      && boss.skillMode === "spiderStringPillars";
    const drawW = pillarCast
      ? SPIDER_STRING_PILLAR_CONFIG.castDrawW
      : archetype.castDrawW;
    const drawH = pillarCast
      ? SPIDER_STRING_PILLAR_CONFIG.castDrawH
      : archetype.castDrawH;
    const bottomPadding = pillarCast
      ? SPIDER_STRING_PILLAR_CONFIG.castDrawBottomPadding
      : archetype.castBottomPadding;
    const framesSinceCastStart = castDuration - boss.castTimer;
    const frame = boss.id === BOSS_ARCHETYPE_IDS.fangGale
      ? proportionalFrame(castSheet.count, framesSinceCastStart, castDuration)
      : Math.min(
          castSheet.count - 1,
          Math.floor(framesSinceCastStart / bossCastFrameDuration(boss)),
        );
    return visualFrame(
      castSheet,
      frame,
      centerX - drawW / 2,
      feetY - drawH + bottomPadding,
      drawW,
      drawH,
      boss.castFacing,
    );
  }

  if (boss.id === BOSS_ARCHETYPE_IDS.mirrorDream) {
    if (boss.actionState === "dash") {
      return visualFrame(
        archetype.sheets.move,
        MIRROR_DREAM_DASH_POSE_FRAME,
        centerX - archetype.drawW / 2,
        feetY - archetype.drawH,
        archetype.drawW,
        archetype.drawH,
        boss.facing,
      );
    }
    if (boss.mirrorNightmareDash?.stage === "recover" && boss.recoveryTimer > 0) {
      const elapsed = MIRROR_DREAM_CONFIG.nightmareDashRecoveryFrames
        - boss.recoveryTimer;
      const frame = proportionalFrame(
        MIRROR_DREAM_RECOVER_SHEET.count,
        elapsed,
        MIRROR_DREAM_CONFIG.nightmareDashRecoveryFrames,
      );
      return visualFrame(
        MIRROR_DREAM_RECOVER_SHEET,
        frame,
        centerX - archetype.castDrawW / 2,
        feetY - archetype.castDrawH + archetype.castBottomPadding,
        archetype.castDrawW,
        archetype.castDrawH,
        boss.facing,
      );
    }
  }

  if (boss.id === BOSS_ARCHETYPE_IDS.spiderString && boss.actionState === "windup") {
    const windupFrames = spiderRushWindupFrames(boss.phase);
    const frame = Math.min(
      SPIDER_RUSH_WINDUP_SPRITE_FRAMES - 1,
      Math.floor(
        Math.min(boss.actionTimer, windupFrames - 1)
          * SPIDER_RUSH_WINDUP_SPRITE_FRAMES
          / windupFrames,
      ),
    );
    return visualFrame(
      SPIDER_STRING_ATTACK_SHEET,
      frame,
      centerX - SPIDER_STRING_ATTACK_CONFIG.drawW / 2,
      feetY
        - SPIDER_STRING_ATTACK_CONFIG.drawH
        + SPIDER_STRING_ATTACK_CONFIG.drawBottomPadding,
      SPIDER_STRING_ATTACK_CONFIG.drawW,
      SPIDER_STRING_ATTACK_CONFIG.drawH,
      boss.castFacing,
    );
  }

  if (
    boss.id === BOSS_ARCHETYPE_IDS.deadBell
    && (boss.deadBellReprisalTimer ?? 0) > 0
  ) {
    const warningFrames = DEAD_BELL_CONFIG.reprisalWarningFrames;
    const activeFrames = DEAD_BELL_CONFIG.reprisalActiveFrames;
    const elapsed = warningFrames + activeFrames - (boss.deadBellReprisalTimer ?? 0);
    const activeSpriteFrames = archetype.sheets.cast.count
      - DEAD_BELL_REPRISAL_WARNING_SPRITE_FRAMES;
    const frame = elapsed < warningFrames
      ? Math.min(
        DEAD_BELL_REPRISAL_WARNING_SPRITE_FRAMES - 1,
        Math.floor(
          elapsed * DEAD_BELL_REPRISAL_WARNING_SPRITE_FRAMES / warningFrames,
        ),
      )
      : DEAD_BELL_REPRISAL_WARNING_SPRITE_FRAMES + Math.min(
        activeSpriteFrames - 1,
        Math.floor(
          (elapsed - warningFrames) * activeSpriteFrames / activeFrames,
        ),
      );
    return visualFrame(
      archetype.sheets.cast,
      frame,
      centerX - archetype.castDrawW / 2,
      feetY - archetype.castDrawH + archetype.castBottomPadding,
      archetype.castDrawW,
      archetype.castDrawH,
      boss.facing,
    );
  }

  if (boss.id === BOSS_ARCHETYPE_IDS.deadBell && boss.recoveryTimer > 0) {
    const recoveryDuration = deadBellRecoveryVisualDuration(boss);
    const elapsed = recoveryDuration - Math.min(recoveryDuration, boss.recoveryTimer);
    const frame = proportionalFrame(
      DEAD_BELL_RECOVER_SHEET.count,
      elapsed,
      recoveryDuration,
    );
    return visualFrame(
      DEAD_BELL_RECOVER_SHEET,
      frame,
      centerX - archetype.castDrawW / 2,
      feetY - archetype.castDrawH + archetype.castBottomPadding,
      archetype.castDrawW,
      archetype.castDrawH,
      boss.facing,
    );
  }

  if (boss.id === BOSS_ARCHETYPE_IDS.spiderString && boss.actionState === "attack") {
    const frame = Math.min(
      SPIDER_STRING_ATTACK_SHEET.count - 1,
      Math.floor(
        Math.min(boss.actionTimer, SPIDER_STRING_ATTACK_CONFIG.duration - 1)
          / SPIDER_STRING_ATTACK_CONFIG.frameDuration,
      ),
    );
    return visualFrame(
      SPIDER_STRING_ATTACK_SHEET,
      frame,
      centerX - SPIDER_STRING_ATTACK_CONFIG.drawW / 2,
      feetY
        - SPIDER_STRING_ATTACK_CONFIG.drawH
        + SPIDER_STRING_ATTACK_CONFIG.drawBottomPadding,
      SPIDER_STRING_ATTACK_CONFIG.drawW,
      SPIDER_STRING_ATTACK_CONFIG.drawH,
      boss.facing,
    );
  }

  if (
    boss.id === BOSS_ARCHETYPE_IDS.mistBone
    && (boss.actionState === "attack" || boss.actionState === "dash")
  ) {
    const frame = boss.actionState === "dash"
      ? proportionalFrame(
        MIST_BONE_ATTACK_SHEET.count,
        boss.actionTimer,
        MIST_BONE_CONFIG.chaseFrames,
      )
      : Math.min(
        MIST_BONE_ATTACK_SHEET.count - 1,
        Math.floor(
          Math.min(boss.actionTimer, MIST_BONE_CONFIG.attackDuration - 1)
            / MIST_BONE_CONFIG.attackFrameDuration,
        ),
      );
    return visualFrame(
      MIST_BONE_ATTACK_SHEET,
      frame,
      centerX - archetype.castDrawW / 2,
      feetY - archetype.castDrawH + archetype.castBottomPadding,
      archetype.castDrawW,
      archetype.castDrawH,
      boss.castFacing,
    );
  }

  if (boss.id === BOSS_ARCHETYPE_IDS.fangGale && boss.actionState === "dash") {
    const dashSheet = boss.skillMode === "fangGaleStorm"
      && boss.comboStep === FANG_GALE_CONFIG.stormDashCount
      ? FANG_GALE_FINAL_BITE_SHEET
      : FANG_GALE_BITE_SHEET;
    const dashDuration = boss.skillMode === "fangGaleStorm"
      ? FANG_GALE_CONFIG.stormDashFrames
      : FANG_GALE_CONFIG.dashFrames;
    const frame = proportionalFrame(
      dashSheet.count,
      boss.actionTimer,
      dashDuration,
    );
    return fangGaleActionVisualFrame(
      boss,
      dashSheet,
      frame,
    );
  }

  if (boss.id === BOSS_ARCHETYPE_IDS.fangGale && boss.recoveryTimer > 0) {
    const recoveryDuration = boss.skillMode === "fangGaleStorm"
      ? FANG_GALE_CONFIG.stormRecoveryFrames
      : FANG_GALE_CONFIG.recoveryFrames;
    const elapsed = recoveryDuration - boss.recoveryTimer;
    const frame = proportionalFrame(
      FANG_GALE_RECOVER_SHEET.count,
      elapsed,
      recoveryDuration,
    );
    return fangGaleActionVisualFrame(
      boss,
      FANG_GALE_RECOVER_SHEET,
      frame,
    );
  }

  if (boss.id === BOSS_ARCHETYPE_IDS.bloodMoon && boss.recoveryTimer > 0) {
    const recoveryDuration = boss.skillMode === "bloodMoonManyFaces"
      ? BLOOD_MOON_CONFIG.finalRecoveryFrames
      : BLOOD_MOON_CONFIG.recoveryFrames;
    const elapsed = recoveryDuration - boss.recoveryTimer;
    const frame = Math.min(
      BLOOD_MOON_RECOVER_SHEET.count - 1,
      Math.floor(elapsed / BLOOD_MOON_CONFIG.recoverFrameDuration),
    );
    return visualFrame(
      BLOOD_MOON_RECOVER_SHEET,
      frame,
      centerX - archetype.castDrawW / 2,
      feetY - archetype.castDrawH + archetype.castBottomPadding,
      archetype.castDrawW,
      archetype.castDrawH,
      boss.facing,
    );
  }

  const frame = frameIndex(
    archetype.sheets.move.count,
    BOSS_CONFIG.baseAnimSpeed - boss.phase,
    animationElapsed,
    boss.animSeed,
  );
  return visualFrame(
    archetype.sheets.move,
    frame,
    centerX - archetype.drawW / 2,
    feetY - archetype.drawH,
    archetype.drawW,
    archetype.drawH,
    boss.facing,
  );
}

function visualFrame(
  sheet: BossVisualFrameState["sheet"],
  frame: number,
  x: number,
  y: number,
  w: number,
  h: number,
  facing: number,
): BossVisualFrameState {
  return { sheet, frame, x, y, w, h, facing };
}

function fangGaleActionVisualFrame(
  boss: LiveBoss,
  sheet: BossVisualFrameState["sheet"],
  frame: number,
) {
  const archetype = bossArchetypeForId(boss.id);
  const centerX = boss.x + boss.w / 2;
  const feetY = boss.y + boss.h;
  return visualFrame(
    sheet,
    frame,
    centerX - archetype.castDrawW / 2,
    feetY - archetype.castDrawH + archetype.castBottomPadding,
    archetype.castDrawW,
    archetype.castDrawH,
    boss.facing,
  );
}

function proportionalFrame(frameCount: number, elapsed: number, duration: number) {
  return Math.min(
    frameCount - 1,
    Math.floor(Math.min(elapsed, duration - 1) * frameCount / duration),
  );
}

function deadBellRecoveryVisualDuration(boss: LiveBoss) {
  if (boss.skillMode === "deadBellDuet") return DEAD_BELL_CONFIG.counterFrames;
  if (boss.skillMode === "deadBellCombo") return DEAD_BELL_CONFIG.recoveryFrames;
  return DEAD_BELL_CONFIG.shortRecoveryFrames;
}

function bossCastSheet(boss: LiveBoss) {
  const archetype = bossArchetypeForId(boss.id);
  if (boss.id === BOSS_ARCHETYPE_IDS.bloodMoon) return bloodMoonCastSheet(boss);
  if (boss.id === BOSS_ARCHETYPE_IDS.fangGale && boss.actionState === "windup") {
    return FANG_GALE_TURN_SHEET;
  }
  if (boss.id === BOSS_ARCHETYPE_IDS.spiderString && boss.skillMode === "spiderStringCage") {
    return SPIDER_STRING_ULTIMATE_CAST_SHEET;
  }
  if (
    boss.id === BOSS_ARCHETYPE_IDS.spiderString
    && boss.skillMode === "spiderStringPillars"
  ) return SPIDER_STRING_PILLAR_CAST_SHEET;
  if (boss.id === BOSS_ARCHETYPE_IDS.mistBone) {
    if (boss.skillMode === "mistBoneLine") return MIST_BONE_LINE_CAST_SHEET;
    if (boss.skillMode === "mistBoneCage") return MIST_BONE_CAGE_CAST_SHEET;
    return archetype.sheets.cast;
  }
  if (boss.id !== BOSS_ARCHETYPE_IDS.lanternEmber) return archetype.sheets.cast;
  if (
    boss.skillMode === "lanternFireline"
    || boss.skillMode === "lanternAwakenedGrid"
  ) return LANTERN_EMBER_FIRELINE_CAST_SHEET;
  if (boss.skillMode === "lanternBuff") return LANTERN_EMBER_BUFF_CAST_SHEET;
  return LANTERN_EMBER_SUMMON_SHEET;
}

function bloodMoonCastSheet(boss: LiveBoss) {
  if (boss.skillMode === "bloodMoonMirrorFang") return BLOOD_MOON_MIRROR_FANG_CAST_SHEET;
  if (boss.skillMode === "bloodMoonLanternBell") return BLOOD_MOON_LANTERN_BELL_CAST_SHEET;
  if (boss.skillMode === "bloodMoonSixfold") return BLOOD_MOON_SIXFOLD_CAST_SHEET;
  if (boss.skillMode === "bloodMoonManyFaces") return BLOOD_MOON_MANY_FACES_CAST_SHEET;
  return BLOOD_MOON_SPIDER_MIST_CAST_SHEET;
}

function bossCastFrameDuration(boss: LiveBoss) {
  if (boss.id === BOSS_ARCHETYPE_IDS.deadBell) return DEAD_BELL_CONFIG.castFrameDuration;
  if (boss.id === BOSS_ARCHETYPE_IDS.lanternEmber) return LANTERN_EMBER_CONFIG.castFrameDuration;
  if (boss.id === BOSS_ARCHETYPE_IDS.mistBone) return MIST_BONE_CONFIG.castFrameDuration;
  if (boss.id === BOSS_ARCHETYPE_IDS.mirrorDream) return MIRROR_DREAM_CONFIG.castFrameDuration;
  if (boss.id === BOSS_ARCHETYPE_IDS.bloodMoon) return BLOOD_MOON_CONFIG.castFrameDuration;
  if (boss.id === BOSS_ARCHETYPE_IDS.spiderString && boss.skillMode === "spiderStringCage") {
    return SPIDER_STRING_CAGE_CONFIG.castFrameDuration;
  }
  if (
    boss.id === BOSS_ARCHETYPE_IDS.spiderString
    && boss.skillMode === "spiderStringPillars"
  ) return SPIDER_STRING_PILLAR_CONFIG.castFrameDuration;
  return BOSS_SKILL1_CONFIG.castFrameDuration;
}
