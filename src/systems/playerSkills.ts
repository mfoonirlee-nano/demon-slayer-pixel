import {
  CLOSE_ARC_EFFECT_CONFIG,
  GUARD_COUNTER_EFFECT_CONFIG,
  SKILL_IDS,
} from "../constants";
import type { SkillId } from "../types/assets";
import type { SkillLevel } from "../types/game-state";
import type { RectLike } from "../game/utils";

export type CorePlayerSkillId =
  | typeof SKILL_IDS.lineProjectile
  | typeof SKILL_IDS.closeArc
  | typeof SKILL_IDS.guardCounter;

export type GenericPlayerSkillId =
  | "dash_reposition"
  | "vortex_control"
  | "armor_break"
  | "anti_air_multi"
  | "returning_blade"
  | "vertical_wave";

export type GenericPlayerSkillKind =
  | "dashSlash"
  | "vortex"
  | "armorBreak"
  | "rainLine"
  | "returningBlade"
  | "verticalWave";

export type LevelTable = Record<SkillLevel, number>;

export type CoreSkillGrowthTuning = {
  damageMultiplier: LevelTable;
  drawScale?: LevelTable;
  maxTravel?: LevelTable;
  activeFrames?: LevelTable;
  maxHits?: LevelTable;
  counterPadding?: LevelTable;
};

export type CoreSkillGrowth = {
  damageMultiplier: number;
  drawScale?: number;
  maxTravel?: number;
  activeFrames?: number;
  maxHits?: number;
  counterPadding?: number;
};

export type GenericSkillTuning = {
  kind: GenericPlayerSkillKind;
  frameDuration: number;
  drawScale: number;
  life: LevelTable;
  width: LevelTable;
  height: LevelTable;
  damageMultiplier: LevelTable;
  bossDamageMultiplier: LevelTable;
  hitCooldown: number;
  bossHitCooldown: number;
  distance?: LevelTable;
  radius?: LevelTable;
  count?: LevelTable;
  pull?: LevelTable;
  slow?: LevelTable;
  armorBreakDuration?: LevelTable;
  armorBreakMultiplier?: LevelTable;
  armorBreakBossMultiplier?: LevelTable;
  maxHits?: LevelTable;
  lift?: LevelTable;
};

export const GENERIC_PLAYER_SKILL_IDS: GenericPlayerSkillId[] = [
  SKILL_IDS.dashReposition,
  SKILL_IDS.vortexControl,
  SKILL_IDS.armorBreak,
  SKILL_IDS.antiAirMulti,
  SKILL_IDS.returningBlade,
  SKILL_IDS.verticalWave,
];

export const CORE_PLAYER_SKILL_IDS: CorePlayerSkillId[] = [
  SKILL_IDS.lineProjectile,
  SKILL_IDS.closeArc,
  SKILL_IDS.guardCounter,
];

export const CORE_PLAYER_SKILL_GROWTH: Record<CorePlayerSkillId, CoreSkillGrowthTuning> = {
  [SKILL_IDS.lineProjectile]: {
    damageMultiplier: { 1: 1, 2: 1.18, 3: 1.35 },
  },
  [SKILL_IDS.closeArc]: {
    damageMultiplier: { 1: 1, 2: 1.18, 3: 1.35 },
    drawScale: {
      1: CLOSE_ARC_EFFECT_CONFIG.drawScale,
      2: 0.705,
      3: 0.745,
    },
    maxTravel: {
      1: CLOSE_ARC_EFFECT_CONFIG.maxTravel,
      2: 158,
      3: 176,
    },
  },
  [SKILL_IDS.guardCounter]: {
    damageMultiplier: { 1: 1, 2: 1.18, 3: 1.35 },
    activeFrames: {
      1: GUARD_COUNTER_EFFECT_CONFIG.activeFrames,
      2: 78,
      3: 84,
    },
    maxHits: {
      1: GUARD_COUNTER_EFFECT_CONFIG.maxHits,
      2: GUARD_COUNTER_EFFECT_CONFIG.maxHits,
      3: 4,
    },
    counterPadding: { 1: 0, 2: 6, 3: 10 },
  },
};

export const GENERIC_PLAYER_SKILL_TUNING: Record<GenericPlayerSkillId, GenericSkillTuning> = {
  [SKILL_IDS.dashReposition]: {
    kind: "dashSlash",
    frameDuration: 4,
    drawScale: 0.45,
    life: { 1: 18, 2: 18, 3: 18 },
    width: { 1: 82, 2: 96, 3: 110 },
    height: { 1: 52, 2: 54, 3: 56 },
    distance: { 1: 92, 2: 108, 3: 124 },
    damageMultiplier: { 1: 1.1, 2: 1.25, 3: 1.4 },
    bossDamageMultiplier: { 1: 0.8, 2: 0.88, 3: 0.96 },
    hitCooldown: 14,
    bossHitCooldown: 10,
  },
  [SKILL_IDS.vortexControl]: {
    kind: "vortex",
    frameDuration: 6,
    drawScale: 0.78,
    life: { 1: 54, 2: 66, 3: 78 },
    width: { 1: 164, 2: 184, 3: 204 },
    height: { 1: 82, 2: 92, 3: 102 },
    radius: { 1: 82, 2: 92, 3: 102 },
    pull: { 1: 0.85, 2: 1.05, 3: 1.25 },
    slow: { 1: 0.86, 2: 0.8, 3: 0.74 },
    damageMultiplier: { 1: 0.36, 2: 0.42, 3: 0.48 },
    bossDamageMultiplier: { 1: 0.18, 2: 0.22, 3: 0.26 },
    hitCooldown: 14,
    bossHitCooldown: 14,
  },
  [SKILL_IDS.armorBreak]: {
    kind: "armorBreak",
    frameDuration: 5,
    drawScale: 0.68,
    life: { 1: 24, 2: 24, 3: 24 },
    width: { 1: 92, 2: 104, 3: 116 },
    height: { 1: 58, 2: 62, 3: 66 },
    distance: { 1: 118, 2: 132, 3: 146 },
    damageMultiplier: { 1: 1.25, 2: 1.42, 3: 1.6 },
    bossDamageMultiplier: { 1: 0.9, 2: 1, 3: 1.1 },
    armorBreakDuration: { 1: 180, 2: 210, 3: 240 },
    armorBreakMultiplier: { 1: 1.18, 2: 1.24, 3: 1.3 },
    armorBreakBossMultiplier: { 1: 1.08, 2: 1.1, 3: 1.12 },
    hitCooldown: 12,
    bossHitCooldown: 10,
  },
  [SKILL_IDS.antiAirMulti]: {
    kind: "rainLine",
    frameDuration: 6,
    drawScale: 0.62,
    life: { 1: 26, 2: 28, 3: 30 },
    width: { 1: 24, 2: 28, 3: 32 },
    height: { 1: 142, 2: 150, 3: 158 },
    count: { 1: 4, 2: 5, 3: 6 },
    damageMultiplier: { 1: 0.56, 2: 0.62, 3: 0.68 },
    bossDamageMultiplier: { 1: 0.28, 2: 0.32, 3: 0.36 },
    hitCooldown: 10,
    bossHitCooldown: 10,
  },
  [SKILL_IDS.returningBlade]: {
    kind: "returningBlade",
    frameDuration: 4,
    drawScale: 0.56,
    life: { 1: 78, 2: 84, 3: 90 },
    width: { 1: 86, 2: 94, 3: 102 },
    height: { 1: 42, 2: 45, 3: 48 },
    distance: { 1: 170, 2: 195, 3: 220 },
    maxHits: { 1: 2, 2: 3, 3: 4 },
    damageMultiplier: { 1: 0.9, 2: 1.05, 3: 1.2 },
    bossDamageMultiplier: { 1: 0.6, 2: 0.7, 3: 0.8 },
    hitCooldown: 12,
    bossHitCooldown: 10,
  },
  [SKILL_IDS.verticalWave]: {
    kind: "verticalWave",
    frameDuration: 4,
    drawScale: 0.42,
    life: { 1: 26, 2: 28, 3: 30 },
    width: { 1: 72, 2: 82, 3: 92 },
    height: { 1: 130, 2: 145, 3: 160 },
    lift: { 1: 8, 2: 10, 3: 12 },
    damageMultiplier: { 1: 1.15, 2: 1.3, 3: 1.45 },
    bossDamageMultiplier: { 1: 0.75, 2: 0.85, 3: 0.95 },
    hitCooldown: 14,
    bossHitCooldown: 10,
  },
};

export function isCorePlayerSkillId(skillId: SkillId): skillId is CorePlayerSkillId {
  return CORE_PLAYER_SKILL_IDS.includes(skillId as CorePlayerSkillId);
}

export function isGenericPlayerSkillId(skillId: SkillId): skillId is GenericPlayerSkillId {
  return GENERIC_PLAYER_SKILL_IDS.includes(skillId as GenericPlayerSkillId);
}

export function valueForSkillLevel(table: LevelTable, level: SkillLevel | 0 | undefined) {
  return table[(level || 1) as SkillLevel];
}

export function corePlayerSkillGrowth(skillId: SkillId, level: SkillLevel | 0 | undefined): CoreSkillGrowth | null {
  if (!isCorePlayerSkillId(skillId)) return null;
  const tuning = CORE_PLAYER_SKILL_GROWTH[skillId];
  return {
    damageMultiplier: valueForSkillLevel(tuning.damageMultiplier, level),
    drawScale: tuning.drawScale ? valueForSkillLevel(tuning.drawScale, level) : undefined,
    maxTravel: tuning.maxTravel ? valueForSkillLevel(tuning.maxTravel, level) : undefined,
    activeFrames: tuning.activeFrames ? valueForSkillLevel(tuning.activeFrames, level) : undefined,
    maxHits: tuning.maxHits ? valueForSkillLevel(tuning.maxHits, level) : undefined,
    counterPadding: tuning.counterPadding ? valueForSkillLevel(tuning.counterPadding, level) : undefined,
  };
}

export function rectFromCenter(centerX: number, centerY: number, width: number, height: number): RectLike {
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    w: width,
    h: height,
  };
}
