export const LOADING_SCREEN = {
  overlayColor: "rgba(0,0,0,0.45)",
  textColor: "#fff",
  font: "24px monospace",
} as const;

export const SKILL_FLASH = {
  maxFrames: 24,
  baseRadius: 320,
  radiusStep: 9,
  overlayColorRgb: "98,190,255",
  overlayAlphaScale: 0.08,
  outerStrokeColorRgb: "140,240,255",
  outerStrokeAlphaScale: 0.95,
  outerLineWidth: 4.5,
  innerStrokeColorRgb: "214,247,255",
  innerStrokeAlphaScale: 0.65,
  innerLineWidth: 2.3,
  innerRadiusBase: 22,
  minOuterRadius: 40,
  minInnerRadius: 24,
} as const;

export const SKILL_BURST_VISUAL = {
  drawYOffsetRatio: 0.68,
  alpha: 0.96,
  floorTintSuffix: "22",
  floorTintXOffset: 12,
  floorTintMinWidth: 20,
  floorTintXPadding: 24,
  floorTintHeight: 10,
  floorTintYRatio: 0.66,
} as const;

export const HIT_BURST_VISUAL = {
  baseAlpha: 0.2,
  alphaScale: 0.7,
  outerStrokeColorRgb: "166,236,255",
  outerLineWidth: 2.6,
  innerStrokeColorRgb: "225,250,255",
  innerAlphaScale: 0.7,
  innerLineWidth: 1.4,
  sparkColorRgb: "203,246,255",
} as const;

export const BOSS_DEFEAT_SPLIT_VISUAL = {
  durationFrames: 60,
  maxSeparation: 52,
  maxTiltRadians: 0.08,
  maxDrop: 14,
  fadeStartProgress: 0.55,
  clipExtentScale: 2,
  easingExponent: 3,
} as const;

export const MIST_BONE_DEFEAT_VISUAL = {
  fragmentColumns: 3,
  fragmentRows: 4,
  fragmentHorizontalSpeed: 1.7,
  fragmentHorizontalJitter: 0.75,
  fragmentLiftMin: 1.1,
  fragmentLiftRange: 1.7,
  fragmentGravity: 0.09,
  fragmentMaxAngularSpeed: 0.055,
  fogWispCount: 9,
  fogSpreadXRatio: 0.55,
  fogSpreadYRatio: 0.42,
  fogRadiusXMin: 34,
  fogRadiusXRange: 28,
  fogRadiusYMin: 12,
  fogRadiusYRange: 14,
  fogWindSpeedMin: 1.35,
  fogWindSpeedRange: 0.9,
  fogVerticalDrift: 0.34,
  fogSway: 5,
  fogSwayRate: 0.08,
  fogAlpha: 0.38,
} as const;
