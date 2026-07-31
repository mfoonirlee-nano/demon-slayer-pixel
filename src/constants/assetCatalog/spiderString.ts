import type { SpriteSheet } from "../../types/assets";

export const SPIDER_STRING_ATTACK_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/spider-string/boss_attack.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const SPIDER_STRING_PILLAR_CAST_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/spider-string/boss_pillar_cast.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const SPIDER_STRING_PILLAR_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/spider-string/boss_pillar_effect.png",
  frameW: 240,
  frameH: 360,
  count: 8,
  image: null,
};

export const SPIDER_STRING_ATTACK_CONFIG = {
  duration: 36,
  frameDuration: 6,
  hitStartFrame: 18,
  hitEndFrame: 24,
  hitboxWidth: 120,
  hitboxHeight: 112,
  hitboxTopOffset: 34,
  forwardOffset: 18,
  damageMultiplier: 1.25,
  drawW: 300,
  drawH: 300,
  drawBottomPadding: 38,
} as const;

export const SPIDER_STRING_PILLAR_CONFIG = {
  minPhase: 3,
  castDuration: 54,
  spawnAtFrame: 30,
  castFrameDuration: 9,
  cooldown: 300,
  count: 7,
  spacing: 108,
  delayStep: 5,
  warningFrames: 24,
  warningSpriteFrames: 2,
  hitStartEffectFrame: 4,
  hitEndEffectFrame: 6,
  life: 30,
  frameDuration: 5,
  hitW: 54,
  hitH: 228,
  drawW: 168,
  drawH: 252,
  effectBottomPadding: 11.2,
  damageBase: 14,
  damagePhase: 3,
  castDrawW: 300,
  castDrawH: 300,
  castDrawBottomPadding: 38,
} as const;
