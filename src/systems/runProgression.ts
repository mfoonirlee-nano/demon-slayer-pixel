import type { BossArchetype } from "../entities/bosses/registry";
import { BOSS_ARCHETYPE_IDS } from "../entities/bosses/registry";
import type { ActBand } from "../types/game-state";

const MAX_ACT = 13;
const TIME_PRESSURE_CAP_SECONDS = 360;
const TIME_PRESSURE_REFERENCE_SECONDS = 240;
const TIME_PRESSURE_SCALE = 0.10;
const INTRO_THREAT_PER_KILL = 0.26;
const AWAKENED_THREAT_PER_KILL = 0.34;
const INTRO_KILL_COUNT = 6;
const BOSS_HP_SCALE_BY_ELAPSED = 0.35;

export function clampAct(act: number) {
  return Math.min(MAX_ACT, Math.max(1, Math.floor(act)));
}

export function actForBossKills(bossKills: number) {
  return clampAct(bossKills + 1);
}

export function actBandForAct(act: number): ActBand {
  const clampedAct = clampAct(act);
  if (clampedAct <= 6) return "intro";
  if (clampedAct <= 12) return "awakened";
  return "final";
}

export function threatScalarForRun(bossKills: number, elapsedSeconds: number) {
  return 1
    + Math.min(bossKills, INTRO_KILL_COUNT) * INTRO_THREAT_PER_KILL
    + Math.max(0, bossKills - INTRO_KILL_COUNT) * AWAKENED_THREAT_PER_KILL
    + Math.min(elapsedSeconds, TIME_PRESSURE_CAP_SECONDS) / TIME_PRESSURE_REFERENCE_SECONDS * TIME_PRESSURE_SCALE;
}

export function bossHpForEncounter(
  archetype: BossArchetype,
  bossKills: number,
  elapsedSeconds: number,
) {
  return archetype.hpBase
    + bossKills * archetype.hpPerKill
    + elapsedSeconds * BOSS_HP_SCALE_BY_ELAPSED;
}

export function isAwakenedBossEncounter(archetype: BossArchetype, act: number) {
  return archetype.id !== BOSS_ARCHETYPE_IDS.bloodMoon && act >= 7 && act <= 12;
}

export function bossGateForAct(act: number) {
  const clampedAct = clampAct(act);
  if (clampedAct === 1) {
    return { minWaves: 3, minElapsed: 45, maxElapsed: 75 };
  }
  if (clampedAct <= 3) {
    return { minWaves: 4, minElapsed: 55, maxElapsed: 90 };
  }
  if (clampedAct <= 6) {
    return { minWaves: 5, minElapsed: 65, maxElapsed: 105 };
  }
  if (clampedAct <= 12) {
    return { minWaves: 5, minElapsed: 75, maxElapsed: 120 };
  }
  return { minWaves: 3, minElapsed: 45, maxElapsed: 75 };
}

export function bossPreludeWaitSeconds(act: number) {
  return Math.max(0, 3 * (MAX_ACT - clampAct(act)) / (MAX_ACT - 1));
}

export function bossPreludeTargetCost(act: number) {
  return Math.max(2, 5 - clampAct(act) * 0.25);
}

export function rewardValuesForAct(act: number) {
  const clampedAct = clampAct(act);
  if (clampedAct <= 2) {
    return { attackCrystal: 2, healthCrystal: 24, chestAttack: 6, chestHeal: 48 };
  }
  if (clampedAct <= 4) {
    return { attackCrystal: 3, healthCrystal: 26, chestAttack: 8, chestHeal: 52 };
  }
  if (clampedAct <= 6) {
    return { attackCrystal: 3, healthCrystal: 28, chestAttack: 8, chestHeal: 56 };
  }
  if (clampedAct <= 12) {
    return { attackCrystal: 4, healthCrystal: 30, chestAttack: 10, chestHeal: 60 };
  }
  return { attackCrystal: 4, healthCrystal: 32, chestAttack: 10, chestHeal: 64 };
}
