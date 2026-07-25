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
  DEAD_BELL_CONFIG,
  FANG_GALE_BITE_SHEET,
  FANG_GALE_CONFIG,
  LANTERN_EMBER_CONFIG,
  LANTERN_EMBER_BUFF_CAST_SHEET,
  LANTERN_EMBER_FIRELINE_CAST_SHEET,
  LANTERN_EMBER_SUMMON_SHEET,
  MIST_BONE_ATTACK_SHEET,
  MIST_BONE_CAGE_CAST_SHEET,
  MIST_BONE_CONFIG,
  MIST_BONE_LINE_CAST_SHEET,
  MIRROR_DREAM_CONFIG,
  SPIDER_STRING_CAGE_CONFIG,
  SPIDER_STRING_ULTIMATE_CAST_SHEET,
} from "../../constants";
import { state } from "../../game/state";
import { frameIndex } from "../../game/utils";
import { ctx } from "../../rendering/context";
import { drawSheetFrame } from "../../rendering/graphics";
import { BOSS_ARCHETYPE_IDS, bossArchetypeForId } from "./registry";
import { bloodMoonCastDuration } from "./bloodMoonBehavior";
import { fangCastDuration } from "./fangGaleBehavior";
import { lanternCastDuration } from "./lanternEmberBehavior";
import type { LiveBoss } from "./types";

const DEAD_BELL_CUE_CENTER_Y_SCALE = 0.42;
const COUNTER_CUE_ALPHA_BASE = 0.35;
const COUNTER_CUE_ALPHA_SCALE = 0.18;
const COMBO_CUE_ALPHA_BASE = 0.42;
const COMBO_CUE_ALPHA_SCALE = 0.25;
const COUNTER_CUE_LINE_WIDTH = 2;
const COMBO_CUE_LINE_WIDTH = 3;
const COUNTER_CUE_DASH = 8;
const COMBO_CUE_DASH = 3;
const COMBO_CUE_GAP = 10;
const COUNTER_CUE_RADIUS = 56;
const COMBO_CUE_RADIUS = 72;
const CUE_CROSS_HALF_WIDTH = 46;

export function drawBoss() {
  const boss = state.boss;
  if (!boss) return;

  const archetype = bossArchetypeForId(boss.id);
  const centerX = boss.x + boss.w / 2;
  const feetY = boss.y + boss.h;

  if (boss.id === BOSS_ARCHETYPE_IDS.bloodMoon && (boss.phaseShiftTimer ?? 0) > 0) {
    const elapsed = BLOOD_MOON_CONFIG.phaseShiftFrames - (boss.phaseShiftTimer ?? 0);
    const frame = Math.min(
      BLOOD_MOON_PHASE_SHIFT_SHEET.count - 1,
      Math.floor(elapsed / BLOOD_MOON_CONFIG.phaseShiftFrameDuration),
    );
    drawSheetFrame(
      BLOOD_MOON_PHASE_SHIFT_SHEET,
      frame,
      centerX - archetype.castDrawW / 2,
      feetY - archetype.castDrawH + archetype.castBottomPadding,
      archetype.castDrawW,
      archetype.castDrawH,
      boss.facing,
    );
    return;
  }

  if (boss.castTimer > 0) {
    const castSheet = bossCastSheet(boss);
    const castDuration = bossCastDuration(boss);
    const frameDuration = bossCastFrameDuration(boss);
    const framesSinceCastStart = castDuration - boss.castTimer;
    const frame = Math.min(
      castSheet.count - 1,
      Math.floor(framesSinceCastStart / frameDuration),
    );
    drawSheetFrame(
      castSheet,
      frame,
      centerX - archetype.castDrawW / 2,
      feetY - archetype.castDrawH + archetype.castBottomPadding,
      archetype.castDrawW,
      archetype.castDrawH,
      boss.castFacing,
    );
    drawDeadBellBeatCue(boss);
    return;
  }

  if (boss.id === BOSS_ARCHETYPE_IDS.mistBone && boss.actionState === "attack") {
    const frame = Math.min(
      MIST_BONE_ATTACK_SHEET.count - 1,
      Math.floor(
        Math.min(boss.actionTimer, MIST_BONE_CONFIG.attackDuration - 1)
          / MIST_BONE_CONFIG.attackFrameDuration,
      ),
    );
    drawSheetFrame(
      MIST_BONE_ATTACK_SHEET,
      frame,
      centerX - archetype.castDrawW / 2,
      feetY - archetype.castDrawH + archetype.castBottomPadding,
      archetype.castDrawW,
      archetype.castDrawH,
      boss.castFacing,
    );
    return;
  }

  if (boss.id === BOSS_ARCHETYPE_IDS.fangGale && boss.actionState === "dash") {
    const dashDuration = boss.skillMode === "fangGaleStorm"
      ? FANG_GALE_CONFIG.stormDashFrames
      : FANG_GALE_CONFIG.dashFrames;
    const frameDuration = Math.max(1, Math.ceil(dashDuration / FANG_GALE_BITE_SHEET.count));
    const frame = Math.min(
      FANG_GALE_BITE_SHEET.count - 1,
      Math.floor(Math.min(boss.actionTimer, dashDuration - 1) / frameDuration),
    );
    drawSheetFrame(
      FANG_GALE_BITE_SHEET,
      frame,
      centerX - archetype.castDrawW / 2,
      feetY - archetype.castDrawH + archetype.castBottomPadding,
      archetype.castDrawW,
      archetype.castDrawH,
      boss.facing,
    );
    return;
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
    drawSheetFrame(
      BLOOD_MOON_RECOVER_SHEET,
      frame,
      centerX - archetype.castDrawW / 2,
      feetY - archetype.castDrawH + archetype.castBottomPadding,
      archetype.castDrawW,
      archetype.castDrawH,
      boss.facing,
    );
    return;
  }

  const frame = frameIndex(
    archetype.sheets.move.count,
    BOSS_CONFIG.baseAnimSpeed - boss.phase,
    state.elapsed,
    boss.animSeed,
  );
  drawSheetFrame(
    archetype.sheets.move,
    frame,
    centerX - archetype.drawW / 2,
    feetY - archetype.drawH,
    archetype.drawW,
    archetype.drawH,
    boss.facing,
  );
  drawDeadBellBeatCue(boss);
}

function bossCastSheet(boss: LiveBoss) {
  const archetype = bossArchetypeForId(boss.id);
  if (boss.id === BOSS_ARCHETYPE_IDS.bloodMoon) return bloodMoonCastSheet(boss);
  if (boss.id === BOSS_ARCHETYPE_IDS.spiderString && boss.skillMode === "spiderStringCage") {
    return SPIDER_STRING_ULTIMATE_CAST_SHEET;
  }
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

function bossCastDuration(boss: LiveBoss) {
  if (boss.id === BOSS_ARCHETYPE_IDS.deadBell) {
    return boss.skillMode === "deadBellCombo" || boss.skillMode === "deadBellDuet"
      ? DEAD_BELL_CONFIG.comboCastDuration
      : DEAD_BELL_CONFIG.castDuration;
  }
  if (boss.id === BOSS_ARCHETYPE_IDS.fangGale) return fangCastDuration(boss);
  if (boss.id === BOSS_ARCHETYPE_IDS.lanternEmber) return lanternCastDuration(boss);
  if (boss.id === BOSS_ARCHETYPE_IDS.mistBone) return MIST_BONE_CONFIG.castDuration;
  if (boss.id === BOSS_ARCHETYPE_IDS.mirrorDream) return MIRROR_DREAM_CONFIG.castDuration;
  if (boss.id === BOSS_ARCHETYPE_IDS.bloodMoon) return bloodMoonCastDuration(boss);
  if (boss.id === BOSS_ARCHETYPE_IDS.spiderString && boss.skillMode === "spiderStringCage") {
    return SPIDER_STRING_CAGE_CONFIG.castDuration;
  }
  return BOSS_SKILL1_CONFIG.castDuration;
}

function bossCastFrameDuration(boss: LiveBoss) {
  if (boss.id === BOSS_ARCHETYPE_IDS.deadBell) return DEAD_BELL_CONFIG.castFrameDuration;
  if (boss.id === BOSS_ARCHETYPE_IDS.fangGale) return FANG_GALE_CONFIG.castFrameDuration;
  if (boss.id === BOSS_ARCHETYPE_IDS.lanternEmber) return LANTERN_EMBER_CONFIG.castFrameDuration;
  if (boss.id === BOSS_ARCHETYPE_IDS.mistBone) return MIST_BONE_CONFIG.castFrameDuration;
  if (boss.id === BOSS_ARCHETYPE_IDS.mirrorDream) return MIRROR_DREAM_CONFIG.castFrameDuration;
  if (boss.id === BOSS_ARCHETYPE_IDS.bloodMoon) return BLOOD_MOON_CONFIG.castFrameDuration;
  if (boss.id === BOSS_ARCHETYPE_IDS.spiderString && boss.skillMode === "spiderStringCage") {
    return SPIDER_STRING_CAGE_CONFIG.castFrameDuration;
  }
  return BOSS_SKILL1_CONFIG.castFrameDuration;
}

function drawDeadBellBeatCue(boss: LiveBoss) {
  if (!ctx || boss.id !== BOSS_ARCHETYPE_IDS.deadBell) return;

  const comboStopBeat = (boss.skillMode === "deadBellCombo" || boss.skillMode === "deadBellDuet")
    && boss.castTimer > DEAD_BELL_CONFIG.comboCastDuration - DEAD_BELL_CONFIG.comboSpawnAtFrame;
  const counterWindow = boss.recoveryTimer > 0;
  if (!comboStopBeat && !counterWindow) return;

  const centerX = boss.x + boss.w / 2;
  const centerY = boss.y + boss.h * DEAD_BELL_CUE_CENTER_Y_SCALE;
  const t = counterWindow
    ? boss.recoveryTimer / DEAD_BELL_CONFIG.recoveryFrames
    : boss.castTimer / DEAD_BELL_CONFIG.comboCastDuration;
  ctx.save();
  ctx.globalAlpha = counterWindow
    ? COUNTER_CUE_ALPHA_BASE + t * COUNTER_CUE_ALPHA_SCALE
    : COMBO_CUE_ALPHA_BASE + (1 - t) * COMBO_CUE_ALPHA_SCALE;
  ctx.strokeStyle = counterWindow ? "#f0d08a" : "#c94238";
  ctx.lineWidth = counterWindow ? COUNTER_CUE_LINE_WIDTH : COMBO_CUE_LINE_WIDTH;
  ctx.setLineDash(counterWindow ? [COUNTER_CUE_DASH, COUNTER_CUE_DASH] : [COMBO_CUE_DASH, COMBO_CUE_GAP]);
  ctx.beginPath();
  ctx.arc(centerX, centerY, counterWindow ? COUNTER_CUE_RADIUS : COMBO_CUE_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(centerX - CUE_CROSS_HALF_WIDTH, centerY);
  ctx.lineTo(centerX + CUE_CROSS_HALF_WIDTH, centerY);
  ctx.stroke();
  ctx.restore();
}
