type RgbColor = readonly [number, number, number];

function rgb(color: { r: number; g: number; b: number }): RgbColor {
  return [color.r, color.g, color.b] as const;
}

export const MOON_LAYOUT = {
  x: 762,
  y: 80,
  coreRadius: 34,
  highlightRadius: 10,
  highlightOffsetX: -12,
  highlightOffsetY: -9,
} as const;

export const MOON_SKY_CONFIG = {
  baseTop: rgb({ r: 10, g: 18, b: 35 }),
  baseMid: rgb({ r: 16, g: 27, b: 51 }),
  baseLow: rgb({ r: 21, g: 39, b: 68 }),
  bloodTop: rgb({ r: 72, g: 18, b: 28 }),
  bloodMid: rgb({ r: 86, g: 24, b: 38 }),
  bloodLow: rgb({ r: 58, g: 20, b: 36 }),
  midBlend: 0.92,
  lowBlend: 0.55,
  upperOverlayColor: rgb({ r: 120, g: 22, b: 32 }),
  upperOverlayAlpha: 0.08,
  midOverlayColor: rgb({ r: 96, g: 18, b: 30 }),
  midOverlayAlpha: 0.05,
} as const;

export const MOON_MOTION_CONFIG = {
  colorCycleSpeed: 0.08,
  moonDrift: {
    primarySpeedX: 0.2,
    primaryAmplitudeX: 1.2,
    secondarySpeedX: 0.11,
    secondaryAmplitudeX: 0.7,
    primarySpeedY: 0.16,
    primaryAmplitudeY: 0.9,
    secondarySpeedY: 0.09,
    secondaryAmplitudeY: 0.45,
    phaseX: 0.4,
    phaseY: 1.1,
  },
  hazeSway: {
    speedX: 0.12,
    amplitudeX: 6,
    speedY: 0.1,
    amplitudeY: 3,
    phaseX: 0.8,
    phaseY: 1.7,
  },
  mistDrift: {
    speedX: 0.1,
    amplitudeX: 10,
    speedY: 0.08,
    amplitudeY: 5,
    phaseX: 0.3,
    phaseY: 1.2,
  },
  shimmer: {
    speedX: 0.34,
    amplitudeX: 1.3,
    speedY: 0.24,
    amplitudeY: 0.9,
    phaseX: 1.1,
    phaseY: 0.5,
  },
  pulse: {
    speed: 0.9,
    alphaBoost: 0.03,
    radiusBoost: 3,
    phase: 0.2,
  },
  bloodWave: {
    speed: 0.62,
    radiusBoost: 2,
    alphaBoost: 0.03,
    phase: 0.7,
  },
} as const;

export const MOON_HAZE_CONFIG = {
  color: rgb({ r: 142, g: 28, b: 40 }),
  secondaryColor: rgb({ r: 168, g: 34, b: 48 }),
  baseAlpha: 0.12,
  secondaryAlpha: 0.08,
  radiusX: 164,
  radiusY: 88,
  secondaryRadiusX: 120,
  secondaryRadiusY: 62,
  blur: 46,
  secondaryBlur: 28,
  offsetX: 8,
  offsetY: -3,
} as const;

export const MOON_MIST_CONFIG = {
  color: rgb({ r: 208, g: 224, b: 255 }),
  innerColor: rgb({ r: 190, g: 206, b: 232 }),
  baseAlpha: 0.12,
  innerAlpha: 0.08,
  blur: 58,
  innerBlur: 34,
  radiusX: 104,
  radiusY: 52,
  innerRadiusX: 74,
  innerRadiusY: 34,
  offsetPrimaryX: 10,
  offsetPrimaryY: 2,
  offsetSecondaryX: -12,
  offsetSecondaryY: -3,
} as const;

export const MOON_GLOW_CONFIG = {
  // 正常月光：蓝白内晕
  coolGlowColor: rgb({ r: 198, g: 220, b: 246 }),
  coolGlowAlpha: 0.28,
  coolGlowBlur: 32,
  coolGlowRadius: 52,

  // 正常月光：中层散射光（蓝白）
  outerGlowColor: rgb({ r: 210, g: 228, b: 252 }),
  outerGlowAlpha: 0.14,
  outerGlowBlur: 55,
  outerGlowRadius: 80,

  // 正常月光：最远散射（极淡蓝白）
  farGlowColor: rgb({ r: 220, g: 235, b: 255 }),
  farGlowAlpha: 0.07,
  farGlowBlur: 90,
  farGlowRadius: 120,

  // 血月：内环
  bloodRingColor: rgb({ r: 255, g: 88, b: 102 }),
  bloodRingAlpha: 0.25,
  bloodRingBlur: 38,
  bloodRingRadius: 58,

  // 血月：中层光晕（用于插值替换 outerGlow）
  bloodOuterColor: rgb({ r: 255, g: 80, b: 80 }),
  bloodOuterAlpha: 0.18,

  // 血月：最外层光晕（用于插值替换 farGlow）
  bloodFarColor: rgb({ r: 200, g: 40, b: 40 }),
  bloodFarAlpha: 0.12,
} as const;
