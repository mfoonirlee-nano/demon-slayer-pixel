import type { SpriteSheet } from "../../types/assets";
import { BOSS_BODY_DRAW_SCALE } from "../combat";

export const MIRROR_DREAM_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/mirror-dream/mirror_dream.png",
  frameW: 350,
  frameH: 419,
  count: 4,
  image: null,
};

export const MIRROR_DREAM_CAST_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/mirror-dream/mirror_dream_cast.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const MIRROR_DREAM_RECOVER_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/mirror-dream/mirror_dream_recover.png",
  frameW: 400,
  frameH: 400,
  count: 3,
  image: null,
};

export const MIRROR_DREAM_AWAKENED_CRACKS_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/mirror-dream/mirror_dream_awakened_cracks.png",
  frameW: 350,
  frameH: 419,
  count: 4,
  image: null,
};

export const MIRROR_DREAM_CAST_AWAKENED_CRACKS_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/mirror-dream/mirror_dream_cast_awakened_cracks.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const MIRROR_DREAM_RECOVER_AWAKENED_CRACKS_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/mirror-dream/mirror_dream_recover_awakened_cracks.png",
  frameW: 400,
  frameH: 400,
  count: 3,
  image: null,
};

export const MIRROR_SHARD_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/mirror-dream/mirror_shard.png",
  frameW: 400,
  frameH: 350,
  count: 6,
  image: null,
};

export const MIRROR_AFTERIMAGE_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/mirror-dream/mirror_afterimage.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const MIRROR_NIGHTMARE_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/mirror-dream/mirror_nightmare.png",
  frameW: 400,
  frameH: 350,
  count: 6,
  image: null,
};

export const MIRROR_DREAM_CONFIG = {
  castDuration: 62,
  spawnAtFrame: 30,
  castFrameDuration: 9,
  drawW: 176,
  drawH: 208,
  castDrawW: 228,
  castDrawH: 228,
  castBottomPadding: 0,
  preferredDistance: 210,
  closeDistance: 138,
  steeringForce: 0.052,
  retreatForce: 0.074,
  drag: 0.9,
  maxVelocity: 3.4,
  skillCooldown: 218,
  initialCooldown: 112,
  recoveryFrames: 32,
  shardSpeed: 7.2,
  shardLife: 150,
  shardDrawW: 116,
  shardDrawH: 102,
  shardHitW: 50,
  shardHitH: 28,
  shardFrameDuration: 6,
  nightmareSpeed: 5.8,
  nightmareLife: 104,
  nightmareDrawW: 164,
  nightmareDrawH: 144,
  nightmareHitW: 70,
  nightmareHitH: 36,
  nightmareFrameDuration: 7,
  afterimageDrawW: 220,
  afterimageDrawH: 220,
  afterimageBottomPadding: 22,
  afterimageFrameDuration: 8,
  afterimageLife: 76,
  afterimageAlpha: 0.66,
  teleportPlayerOffset: 148,
  teleportAwayOffset: 236,
  nightmareBaseImages: 2,
  nightmareMaxImages: 4,
  nightmareSpacing: 122,
  nightmarePlayerClearance: 12,
  nightmareFirstBreakFrame: 20,
  nightmareBreakDelay: 18,
  nightmareBreakFadeFrames: 28,
  nightmareDashPhase: 3,
  awakenedSupportPhase: 3,
  nightmareDashFrames: 18,
  nightmareDashRecoveryFrames: 40,
  nightmareDashFirstBreakFrame: 38,
  nightmareDashBreakDelay: 12,
  nightmareDashHitW: 92,
  nightmareDashHitH: 84,
  nightmareDashDamageBase: 12,
  nightmareDashDamagePhase: 2,
  playerSkillReflectionChance: 0.3,
  playerSkillReflectionWarningFrames: 24,
  playerSkillReflectionRadiusBaseline: 92,
  playerSkillReflectionDamageBaseline: 48,
  playerSkillReflectionMinSizeScale: 0.78,
  playerSkillReflectionMaxSizeScale: 1.28,
  playerSkillReflectionMinSpeedScale: 0.82,
  playerSkillReflectionMaxSpeedScale: 1.22,
  playerSkillReflectionMinDamageScale: 0.75,
  playerSkillReflectionMaxDamageScale: 1.25,
  playerSkillReflectionGlowBlur: 10,
  damageBase: 10,
  damagePhase: 2,
} as const;

export const MIRROR_AFTERIMAGE_DRAW_WIDTH = (
  MIRROR_DREAM_CONFIG.afterimageDrawW * BOSS_BODY_DRAW_SCALE
);
