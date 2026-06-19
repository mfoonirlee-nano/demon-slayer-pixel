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
  LANTERN_EMBER_CONFIG,
  LANTERN_EMBER_BUFF_CAST_SHEET,
  LANTERN_EMBER_FIRELINE_CAST_SHEET,
  LANTERN_EMBER_SUMMON_SHEET,
  MIRROR_DREAM_CONFIG,
} from "../../constants";
import { state } from "../../game/state";
import { frameIndex } from "../../game/utils";
import { ctx } from "../../rendering/context";
import { drawSheetFrame } from "../../rendering/graphics";
import { BOSS_ARCHETYPE_IDS, bossArchetypeForId } from "./registry";
import { bloodMoonCastDuration } from "./bloodMoonBehavior";
import { lanternCastDuration } from "./lanternEmberBehavior";
import type { LiveBoss } from "./types";

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
  if (boss.id !== BOSS_ARCHETYPE_IDS.lanternEmber) return archetype.sheets.cast;
  if (boss.skillMode === "lanternFireline") return LANTERN_EMBER_FIRELINE_CAST_SHEET;
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
    return boss.skillMode === "deadBellCombo"
      ? DEAD_BELL_CONFIG.comboCastDuration
      : DEAD_BELL_CONFIG.castDuration;
  }
  if (boss.id === BOSS_ARCHETYPE_IDS.lanternEmber) return lanternCastDuration(boss);
  if (boss.id === BOSS_ARCHETYPE_IDS.mirrorDream) return MIRROR_DREAM_CONFIG.castDuration;
  if (boss.id === BOSS_ARCHETYPE_IDS.bloodMoon) return bloodMoonCastDuration(boss);
  return BOSS_SKILL1_CONFIG.castDuration;
}

function bossCastFrameDuration(boss: LiveBoss) {
  if (boss.id === BOSS_ARCHETYPE_IDS.deadBell) return DEAD_BELL_CONFIG.castFrameDuration;
  if (boss.id === BOSS_ARCHETYPE_IDS.lanternEmber) return LANTERN_EMBER_CONFIG.castFrameDuration;
  if (boss.id === BOSS_ARCHETYPE_IDS.mirrorDream) return MIRROR_DREAM_CONFIG.castFrameDuration;
  if (boss.id === BOSS_ARCHETYPE_IDS.bloodMoon) return BLOOD_MOON_CONFIG.castFrameDuration;
  return BOSS_SKILL1_CONFIG.castFrameDuration;
}

function drawDeadBellBeatCue(boss: LiveBoss) {
  if (!ctx || boss.id !== BOSS_ARCHETYPE_IDS.deadBell) return;

  const comboStopBeat = boss.skillMode === "deadBellCombo"
    && boss.castTimer > DEAD_BELL_CONFIG.comboCastDuration - DEAD_BELL_CONFIG.comboSpawnAtFrame;
  const counterWindow = boss.recoveryTimer > 0;
  if (!comboStopBeat && !counterWindow) return;

  const centerX = boss.x + boss.w / 2;
  const centerY = boss.y + boss.h * 0.42;
  const t = counterWindow
    ? boss.recoveryTimer / DEAD_BELL_CONFIG.recoveryFrames
    : boss.castTimer / DEAD_BELL_CONFIG.comboCastDuration;
  ctx.save();
  ctx.globalAlpha = counterWindow ? 0.35 + t * 0.18 : 0.42 + (1 - t) * 0.25;
  ctx.strokeStyle = counterWindow ? "#f0d08a" : "#c94238";
  ctx.lineWidth = counterWindow ? 2 : 3;
  ctx.setLineDash(counterWindow ? [8, 8] : [3, 10]);
  ctx.beginPath();
  ctx.arc(centerX, centerY, counterWindow ? 56 : 72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(centerX - 46, centerY);
  ctx.lineTo(centerX + 46, centerY);
  ctx.stroke();
  ctx.restore();
}
