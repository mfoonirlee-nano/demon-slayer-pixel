import { CRYSTAL_TYPES, PLATFORM_STYLE_VALUES } from "./ids";

export const PLATFORM_CONFIG = {
  widthBase: 88,
  widthVariance: 74,
  minYOffset: 70,
  yVariance: 130,
  spawnOffsetX: 40,
  height: 12,
  baseSpeed: 1.4,
  randomSpeed: 0.9,
  speedScaleByElapsed: 0.02,
  trimBase: 2,
  trimVariants: 3,
  notchChance: 0.5,
  notchBase: 1,
  notchVariants: 3,
  crystalEligibleHeight: 120,
  crystalSpawnChance: 0.58,
  phaseSpeed: 3,
  despawnMargin: 20,
} as const;

export const PLATFORM_STYLE_LIST = PLATFORM_STYLE_VALUES;

export const CRYSTAL_CONFIG = {
  attackTypeChance: 0.55,
  offsetBase: 16,
  minTravelWidth: 24,
  offsetPadding: 32,
  size: 10,
  floatYOffset: 18,
  floatAmplitude: 2,
  phaseSpeed: 4,
  attackBonusGain: 2,
  healAmount: 24,
} as const;

export const CRYSTAL_TYPES_BY_KIND = CRYSTAL_TYPES;
