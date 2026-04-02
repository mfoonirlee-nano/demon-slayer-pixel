export const LOADING_SCREEN = {
  overlayColor: "rgba(0,0,0,0.45)",
  textColor: "#fff",
  font: "24px monospace",
} as const;

export const SKILL_FLASH = {
  maxFrames: 24,
  baseRadius: 320,
  radiusStep: 9,
  overlayColor: [98, 190, 255] as const,
  overlayAlphaScale: 0.08,
  outerStrokeColor: [140, 240, 255] as const,
  outerStrokeAlphaScale: 0.95,
  outerLineWidth: 4.5,
  innerStrokeColor: [214, 247, 255] as const,
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
  outerStrokeColor: [166, 236, 255] as const,
  outerLineWidth: 2.6,
  innerStrokeColor: [225, 250, 255] as const,
  innerAlphaScale: 0.7,
  innerLineWidth: 1.4,
  sparkColor: [203, 246, 255] as const,
} as const;

