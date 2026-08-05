import type { BossArchetype } from "../entities/bosses/registry";
import { BOSS_ARCHETYPE_IDS } from "../entities/bosses/registry";
import { GROUND_TILE_SPRITES } from "../constants/assetCatalog/scenery";
import { BOSS_CONFIG } from "../constants/combat";
import type { ActBand } from "../types/game-state";

const MAX_ACT = 13;
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
const PRELUDE_BASE_WAIT_SECONDS = 3;
export const ACT_TIMING_SCALE = 0.75;

type BossGate = { minWaves: number; minElapsed: number; maxElapsed: number };

function compressedSeconds(seconds: number) {
  return Math.round(seconds * ACT_TIMING_SCALE);
}

function compressedBossGate(gate: BossGate): BossGate {
  return {
    minWaves: gate.minWaves,
    minElapsed: compressedSeconds(gate.minElapsed),
    maxElapsed: compressedSeconds(gate.maxElapsed),
  };
}

const UNCOMPRESSED_BOSS_GATE_BY_BAND: Record<ActBand, BossGate> = {
  intro: { minWaves: 4, minElapsed: 55, maxElapsed: 90 },
  awakened: { minWaves: 5, minElapsed: 75, maxElapsed: 120 },
  final: { minWaves: 3, minElapsed: 45, maxElapsed: 75 },
};
const UNCOMPRESSED_FIRST_ACT_BOSS_GATE = { minWaves: 3, minElapsed: 45, maxElapsed: 75 };
const UNCOMPRESSED_ADVANCED_INTRO_BOSS_GATE = { minWaves: 5, minElapsed: 65, maxElapsed: 105 };

const BOSS_GATE_BY_BAND: Record<ActBand, BossGate> = {
  intro: compressedBossGate(UNCOMPRESSED_BOSS_GATE_BY_BAND.intro),
  awakened: compressedBossGate(UNCOMPRESSED_BOSS_GATE_BY_BAND.awakened),
  final: compressedBossGate(UNCOMPRESSED_BOSS_GATE_BY_BAND.final),
};
const FIRST_ACT_BOSS_GATE = compressedBossGate(UNCOMPRESSED_FIRST_ACT_BOSS_GATE);
const ADVANCED_INTRO_BOSS_GATE = compressedBossGate(UNCOMPRESSED_ADVANCED_INTRO_BOSS_GATE);

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
  return (
    archetype.hpBase
    + bossKills * archetype.hpPerKill
    + elapsedSeconds * BOSS_HP_SCALE_BY_ELAPSED
  ) * BOSS_CONFIG.healthMultiplier;
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

export function bossApproachGroundTransitionSeconds(act: number) {
  const groundTransitionSeconds = (
    GROUND_TILE_SPRITES.bossApproachTransitionTiles
    * GROUND_TILE_SPRITES.tileSize
    / GROUND_TILE_SPRITES.scrollSpeed
  );

  return Math.max(
    GROUND_TILE_SPRITES.minBossApproachTransitionSeconds,
    bossPreludeWaitSeconds(act),
    groundTransitionSeconds,
  );
}
