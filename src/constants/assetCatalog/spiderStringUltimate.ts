import type { SpriteSheet } from "../../types/assets";

export const SPIDER_STRING_ULTIMATE_CAST_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/spider-string/boss_ultimate_cast.png",
  frameW: 400,
  frameH: 400,
  count: 8,
  image: null,
};

export const SPIDER_STRING_ULTIMATE_WEB_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/spider-string/boss_ultimate_web.png",
  frameW: 480,
  frameH: 220,
  count: 8,
  image: null,
};

export const SPIDER_STRING_CAGE_CONFIG = {
  minPhase: 3,
  columns: 5,
  segmentCount: 3,
  castDuration: 234,
  firstWarningFrames: 42,
  warningFrames: 36,
  hitFrames: 14,
  gapFrames: 18,
  recoveryFrames: 42,
  castFrameDuration: 30,
  webFrameDuration: 5,
  webDrawW: 480,
  webDrawH: 220,
  groundDrawYOffset: 8,
  airDrawYOffset: 118,
  safePaddingX: 16,
  groundBandTopOffset: 150,
  groundBandBottomOffset: 14,
  airBandTopOffset: 280,
  airBandBottomOffset: 82,
  damageMultiplier: 1.4,
  slowFrames: 54,
  slowMoveScale: 0.55,
  cooldown: 1200,
  postAiTimer: 90,
  warningAlpha: 0.42,
  activeAlpha: 0.9,
  fadeAlpha: 0.5,
} as const;
