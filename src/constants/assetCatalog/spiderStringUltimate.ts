import type { SpriteSheet } from "../../types/assets";

const CAGE_PULSE_CADENCE_FRAMES = 18;
const GROUND_STAGE_START_FRAME = 0;
const AIR_STAGE_START_FRAME = 72;
const SIDE_STAGE_START_FRAME = 144;
const GROUND_STAGE_PULSE_COUNT = 3;
const AIR_STAGE_PULSE_COUNT = 3;
const SIDE_STAGE_PULSE_COUNT = 6;

function createPulseStartFrames(stageStartFrame: number, pulseCount: number) {
  return Array.from(
    { length: pulseCount },
    (_, pulseIndex) => stageStartFrame + pulseIndex * CAGE_PULSE_CADENCE_FRAMES,
  );
}

export const SPIDER_STRING_ULTIMATE_CAST_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/spider-string/boss_ultimate_cast.png",
  frameW: 400,
  frameH: 400,
  count: 8,
  image: null,
};

export const SPIDER_STRING_ULTIMATE_PILLAR_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/spider-string/boss_ultimate_pillar.png",
  frameW: 240,
  frameH: 420,
  count: 8,
  image: null,
};

export const SPIDER_STRING_CAGE_CONFIG = {
  minPhase: 3,
  laneCount: 8,
  safeLaneCount: 2,
  groundPulseStartFrames: createPulseStartFrames(
    GROUND_STAGE_START_FRAME,
    GROUND_STAGE_PULSE_COUNT,
  ),
  airPulseStartFrames: createPulseStartFrames(AIR_STAGE_START_FRAME, AIR_STAGE_PULSE_COUNT),
  sidePulseStartFrames: createPulseStartFrames(SIDE_STAGE_START_FRAME, SIDE_STAGE_PULSE_COUNT),
  castDuration: 312,
  castFrameDuration: 39,
  warningFrames: 30,
  warningSpriteFrames: 2,
  effectFrameDuration: 4,
  hitStartEffectFrame: 3,
  hitEndEffectFrame: 6,
  hitW: 92,
  hitH: 388,
  drawW: 200,
  drawH: 420,
  effectOriginPadding: 16,
  damageMultiplier: 1,
  slowFrames: 54,
  slowMoveScale: 0.55,
  cooldown: 1200,
  postAiTimer: 90,
  warningAlphaBase: 0.28,
  warningAlphaScale: 0.5,
} as const;
