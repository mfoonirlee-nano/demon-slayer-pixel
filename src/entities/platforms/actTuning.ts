import { PLATFORM_CONFIG } from "../../constants";

export type SegmentKind =
  | "breather"
  | "safeBridge"
  | "stairUp"
  | "stairDown"
  | "zigzag"
  | "gapJump"
  | "hoverPair"
  | "rewardRisk";

const PLATFORM_TIME_PRESSURE_CAP_SECONDS = 240;
const PLATFORM_SCROLL_SPEED_MULTIPLIER = 0.72;
const PLATFORM_SPEED_PER_BOSS_KILL = 0.18;
const PLATFORM_SPEED_PER_SECOND = 0.006;
const ACT_TWO_TO_THREE_MAX = 3;
const ACT_FOUR_TO_SIX_MAX = 6;
const AWAKENED_ACT_MAX = 12;

const SEGMENT_WEIGHTS: Record<"act1" | "act2to3" | "act4to6" | "awakened" | "final", Record<SegmentKind, number>> = {
  act1: {
    breather: 1.4,
    safeBridge: 2,
    stairUp: 0.8,
    stairDown: 0.8,
    zigzag: 0.2,
    gapJump: 0.2,
    hoverPair: 0,
    rewardRisk: 0.2,
  },
  act2to3: {
    breather: 1.1,
    safeBridge: 1.6,
    stairUp: 1.3,
    stairDown: 1.2,
    zigzag: 0.8,
    gapJump: 1.1,
    hoverPair: 0.4,
    rewardRisk: 0.7,
  },
  act4to6: {
    breather: 0.9,
    safeBridge: 1.2,
    stairUp: 1.4,
    stairDown: 1.3,
    zigzag: 1.5,
    gapJump: 1.5,
    hoverPair: 1.2,
    rewardRisk: 1.3,
  },
  awakened: {
    breather: 0.8,
    safeBridge: 1,
    stairUp: 1.5,
    stairDown: 1.4,
    zigzag: 1.6,
    gapJump: 1.7,
    hoverPair: 1.4,
    rewardRisk: 1.5,
  },
  final: {
    breather: 1,
    safeBridge: 1.2,
    stairUp: 1.2,
    stairDown: 1.2,
    zigzag: 1,
    gapJump: 1,
    hoverPair: 0.8,
    rewardRisk: 0.6,
  },
};

export function platformSpeedForRun(bossKills: number, elapsedSeconds: number, randomSpeed: number) {
  return (PLATFORM_CONFIG.baseSpeed
    + randomSpeed
    + bossKills * PLATFORM_SPEED_PER_BOSS_KILL
    + Math.min(elapsedSeconds, PLATFORM_TIME_PRESSURE_CAP_SECONDS) * PLATFORM_SPEED_PER_SECOND)
    * PLATFORM_SCROLL_SPEED_MULTIPLIER;
}

export function segmentWeightsForAct(act: number): Record<SegmentKind, number> {
  if (act <= 1) return SEGMENT_WEIGHTS.act1;
  if (act <= ACT_TWO_TO_THREE_MAX) return SEGMENT_WEIGHTS.act2to3;
  if (act <= ACT_FOUR_TO_SIX_MAX) return SEGMENT_WEIGHTS.act4to6;
  if (act <= AWAKENED_ACT_MAX) return SEGMENT_WEIGHTS.awakened;
  return SEGMENT_WEIGHTS.final;
}
