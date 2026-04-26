export const MOON_LAYOUT = {
  x: 762,
  y: 80,
  coreRadius: 34,
  shadowRadius: 46,
  highlightRadius: 10,
  highlightOffsetX: -12,
  highlightOffsetY: -9,
} as const;

export const MOON_SKY_CONFIG = {
  baseTop: [10, 18, 35] as const,
  baseMid: [16, 27, 51] as const,
  baseLow: [21, 39, 68] as const,
  bloodTop: [72, 18, 28] as const,
  bloodMid: [86, 24, 38] as const,
  bloodLow: [58, 20, 36] as const,
  midBlend: 0.92,
  lowBlend: 0.55,
  upperOverlayColor: [120, 22, 32] as const,
  upperOverlayAlpha: 0.08,
  midOverlayColor: [96, 18, 30] as const,
  midOverlayAlpha: 0.05,
} as const;

export const MOON_STAR_CONFIG = {
  count: 70,
  xStep: 137,
  yStep: 73,
  minY: 22,
  yRange: 190,
  largeEvery: 9,
  largeSize: 3,
  smallSize: 2,
  twinkleStep: 11,
  twinkleRange: 24,
  twinkleSpeed: 12,
  bloodTwinkleSpeed: 10,
  twinkleOffModulo: 6,
  skipThreshold: 0.58,
  skipModulo: 4,
  brightColor: [219, 233, 255] as const,
  dimColor: [168, 198, 255] as const,
  brightDimAlpha: 0.75,
  dimDimAlpha: 0.83,
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
  color: [142, 28, 40] as const,
  secondaryColor: [168, 34, 48] as const,
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
  color: [208, 224, 255] as const,
  innerColor: [190, 206, 232] as const,
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
  coolGlowColor: [198, 220, 246] as const,
  coolGlowAlpha: 0.28,
  coolGlowBlur: 32,
  coolGlowRadius: 52,

  // 正常月光：中层散射光（蓝白）
  outerGlowColor: [210, 228, 252] as const,
  outerGlowAlpha: 0.14,
  outerGlowBlur: 55,
  outerGlowRadius: 80,

  // 正常月光：最远散射（极淡蓝白）
  farGlowColor: [220, 235, 255] as const,
  farGlowAlpha: 0.07,
  farGlowBlur: 90,
  farGlowRadius: 120,

  // 血月：内环
  bloodRingColor: [255, 88, 102] as const,
  bloodRingAlpha: 0.25,
  bloodRingBlur: 38,
  bloodRingRadius: 58,

  // 血月：中层光晕（用于插值替换 outerGlow）
  bloodOuterColor: [255, 80, 80] as const,
  bloodOuterAlpha: 0.18,

  // 血月：最外层光晕（用于插值替换 farGlow）
  bloodFarColor: [200, 40, 40] as const,
  bloodFarAlpha: 0.12,
} as const;

export const MOON_SURFACE_CONFIG = {
  baseColorA: [208, 226, 255] as const,
  baseColorB: [255, 232, 190] as const,
  bloodCoreColor: [186, 36, 42] as const,
  shadowColor: [146, 18, 28] as const,
  shadowAlpha: 0.18,
  highlightColor: [255, 214, 214] as const,
  highlightAlpha: 0.3,
  shimmerAlpha: 0.08,
  craterColor: [132, 54, 68] as const,
  craterRows: [
    { x: -13, y: -5, w: 7, h: 1, driftX: 0.24, driftY: 0.18 },
    { x: -5, y: 3, w: 6, h: 1, driftX: -0.16, driftY: 0.12 },
    { x: 5, y: -1, w: 5, h: 1, driftX: 0.14, driftY: -0.12 },
  ],
} as const;
