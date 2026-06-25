import type { BossArchetype } from "../entities/bosses/registry";
import { BOSS_ARCHETYPE_IDS } from "../entities/bosses/registry";
import type { ActBand } from "../types/game-state";

const MAX_ACT = 13;
const ACT_PROMPT_DURATION_SECONDS = 3.2;
const TIME_PRESSURE_CAP_SECONDS = 360;
const TIME_PRESSURE_REFERENCE_SECONDS = 240;
const TIME_PRESSURE_SCALE = 0.10;
const INTRO_THREAT_PER_KILL = 0.26;
const AWAKENED_THREAT_PER_KILL = 0.34;
const INTRO_KILL_COUNT = 6;
const BOSS_HP_SCALE_BY_ELAPSED = 0.35;
const INTRO_LAST_ACT = 6;
const AWAKENED_FIRST_ACT = 7;
const AWAKENED_LAST_ACT = 12;
const EARLY_ACT_LAST = 2;
const MID_ACT_LAST = 4;
const PRELUDE_BASE_WAIT_SECONDS = 3;
const PRELUDE_TARGET_BASE_COST = 5;
const PRELUDE_TARGET_COST_PER_ACT = 0.25;

const BOSS_GATE_BY_BAND: Record<ActBand, { minWaves: number; minElapsed: number; maxElapsed: number }> = {
  intro: { minWaves: 4, minElapsed: 55, maxElapsed: 90 },
  awakened: { minWaves: 5, minElapsed: 75, maxElapsed: 120 },
  final: { minWaves: 3, minElapsed: 45, maxElapsed: 75 },
};
const FIRST_ACT_BOSS_GATE = { minWaves: 3, minElapsed: 45, maxElapsed: 75 };
const ADVANCED_INTRO_BOSS_GATE = { minWaves: 5, minElapsed: 65, maxElapsed: 105 };

const REWARD_VALUES_BY_BAND: Record<"early" | "mid" | ActBand, {
  attackCrystal: number;
  healthCrystal: number;
  chestAttack: number;
  chestHeal: number;
}> = {
  early: { attackCrystal: 2, healthCrystal: 24, chestAttack: 6, chestHeal: 48 },
  mid: { attackCrystal: 3, healthCrystal: 26, chestAttack: 8, chestHeal: 52 },
  intro: { attackCrystal: 3, healthCrystal: 28, chestAttack: 8, chestHeal: 56 },
  awakened: { attackCrystal: 4, healthCrystal: 30, chestAttack: 10, chestHeal: 60 },
  final: { attackCrystal: 4, healthCrystal: 32, chestAttack: 10, chestHeal: 64 },
};

const ACT_PROMPT_SUBTITLE_BY_BAND: Record<ActBand, string> = {
  intro: "新的血月眷属逼近",
  awakened: "蚀醒形态开始显现",
  final: "万相血月即将降临",
};

export function clampAct(act: number) {
  return Math.min(MAX_ACT, Math.max(1, Math.floor(act)));
}

export function actForBossKills(bossKills: number) {
  return clampAct(bossKills + 1);
}

export function actBandForAct(act: number): ActBand {
  const clampedAct = clampAct(act);
  if (clampedAct <= INTRO_LAST_ACT) return "intro";
  if (clampedAct <= AWAKENED_LAST_ACT) return "awakened";
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
  return archetype.id !== BOSS_ARCHETYPE_IDS.bloodMoon
    && act >= AWAKENED_FIRST_ACT
    && act <= AWAKENED_LAST_ACT;
}

export function bossGateForAct(act: number) {
  const clampedAct = clampAct(act);
  if (clampedAct === 1) {
    return FIRST_ACT_BOSS_GATE;
  }
  if (clampedAct <= EARLY_ACT_LAST + 1) {
    return BOSS_GATE_BY_BAND.intro;
  }
  if (clampedAct <= INTRO_LAST_ACT) {
    return ADVANCED_INTRO_BOSS_GATE;
  }
  return BOSS_GATE_BY_BAND[actBandForAct(clampedAct)];
}

export function bossPreludeWaitSeconds(act: number) {
  return Math.max(0, PRELUDE_BASE_WAIT_SECONDS * (MAX_ACT - clampAct(act)) / (MAX_ACT - 1));
}

export function bossPreludeTargetCost(act: number) {
  return Math.max(2, PRELUDE_TARGET_BASE_COST - clampAct(act) * PRELUDE_TARGET_COST_PER_ACT);
}

export function rewardValuesForAct(act: number) {
  const clampedAct = clampAct(act);
  if (clampedAct <= EARLY_ACT_LAST) return REWARD_VALUES_BY_BAND.early;
  if (clampedAct <= MID_ACT_LAST) return REWARD_VALUES_BY_BAND.mid;
  return REWARD_VALUES_BY_BAND[actBandForAct(clampedAct)];
}

export function createActPrompt(act: number) {
  const clampedAct = clampAct(act);
  const band = actBandForAct(clampedAct);
  return {
    act: clampedAct,
    title: `第 ${clampedAct} 幕`,
    subtitle: ACT_PROMPT_SUBTITLE_BY_BAND[band],
    timer: ACT_PROMPT_DURATION_SECONDS,
    duration: ACT_PROMPT_DURATION_SECONDS,
  };
}
