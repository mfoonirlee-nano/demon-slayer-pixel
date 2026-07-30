import {
  BLOOD_MOON_CONFIG,
  BOSS_CONFIG,
  BOSS_SKILL1_CONFIG,
  DEAD_BELL_CONFIG,
  FANG_GALE_CONFIG,
  LANTERN_EMBER_CONFIG,
  MIRROR_DREAM_CONFIG,
  MIST_BONE_CONFIG,
  SPIDER_STRING_CAGE_CONFIG,
} from "../../constants";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import type { LiveBoss } from "./types";

type PhaseWindupConfig = {
  baseFrames: number;
  phaseReduction: number;
  minFrames: number;
};

export function bossCastDuration(boss: LiveBoss) {
  if (boss.id === BOSS_ARCHETYPE_IDS.deadBell) {
    const isLongCast = boss.skillMode === "deadBellCombo"
      || boss.skillMode === "deadBellDuet";
    return isLongCast
      ? DEAD_BELL_CONFIG.comboCastDuration
      : DEAD_BELL_CONFIG.castDuration;
  }
  if (boss.id === BOSS_ARCHETYPE_IDS.fangGale) {
    if (boss.actionState === "windup") return fangChainWindupFrames(boss.phase);
    return boss.skillMode === "fangGaleStorm"
      ? FANG_GALE_CONFIG.stormCastDuration
      : FANG_GALE_CONFIG.castDuration;
  }
  if (boss.id === BOSS_ARCHETYPE_IDS.lanternEmber) {
    return boss.skillMode === "lanternAwakenedGrid"
      ? LANTERN_EMBER_CONFIG.awakenedCastDuration
      : LANTERN_EMBER_CONFIG.castDuration;
  }
  if (boss.id === BOSS_ARCHETYPE_IDS.mistBone) return MIST_BONE_CONFIG.castDuration;
  if (boss.id === BOSS_ARCHETYPE_IDS.mirrorDream) return MIRROR_DREAM_CONFIG.castDuration;
  if (boss.id === BOSS_ARCHETYPE_IDS.bloodMoon) {
    return boss.skillMode === "bloodMoonManyFaces"
      ? BLOOD_MOON_CONFIG.finalCastDuration
      : BLOOD_MOON_CONFIG.castDuration;
  }
  if (boss.skillMode === "spiderStringCage") return SPIDER_STRING_CAGE_CONFIG.castDuration;
  return BOSS_SKILL1_CONFIG.castDuration;
}

export function spiderRushWindupFrames(phase: number) {
  return phaseWindupFrames({
    baseFrames: BOSS_CONFIG.rushWindupFrames,
    phaseReduction: BOSS_CONFIG.rushWindupPhaseReduction,
    minFrames: BOSS_CONFIG.rushWindupMinFrames,
  }, phase);
}

export function fangChainWindupFrames(phase: number) {
  return phaseWindupFrames({
    baseFrames: FANG_GALE_CONFIG.chainWindupFrames,
    phaseReduction: FANG_GALE_CONFIG.chainWindupPhaseReduction,
    minFrames: FANG_GALE_CONFIG.chainWindupMinFrames,
  }, phase);
}

function phaseWindupFrames(config: PhaseWindupConfig, phase: number) {
  return Math.max(
    config.minFrames,
    config.baseFrames - Math.max(0, phase - 1) * config.phaseReduction,
  );
}
