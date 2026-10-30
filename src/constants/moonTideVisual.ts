export const MOON_TIDE_FRAME_EFFECTS = {
  ghost: {
    filter: "brightness(0) saturate(100%) invert(60%) sepia(92%) saturate(1600%) hue-rotate(172deg) brightness(103%) contrast(102%) drop-shadow(0 0 3px rgba(42, 178, 255, 0.72))",
  },
  outline: {
    filter: "brightness(0) saturate(100%) invert(64%) sepia(88%) saturate(1320%) hue-rotate(166deg) brightness(103%) contrast(103%) drop-shadow(0 0 3px rgba(52, 196, 255, 0.62))",
  },
  outlineExpandBase: 1,
  maxLevel: 3,
} as const;

export const MOON_TIDE_AURA = {
  drawScale: 0.38,
  footYOffset: -3,
  alpha: 0.52,
  fadeOutFrames: 30,
  openingDrawScale: 0.64,
  openingAnchorY: 260,
  openingFrameDuration: 4,
  openingAlpha: 0.78,
} as const;
