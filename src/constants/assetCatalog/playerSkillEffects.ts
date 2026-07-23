import { SKILL_IDS } from "../ids";
import { VERTICAL_WAVE_PILLAR_CONFIG } from "../combat";
import type { SkillId, SpriteSheet } from "../../types/assets";

export const LINE_PROJECTILE_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/line_projectile/effect.png",
  frameW: 480,
  frameH: 160,
  count: 8,
  image: null,
};

export const LINE_PROJECTILE_EFFECT_LEVEL_TWO_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/line_projectile/effect_lv2.png",
  frameW: 720,
  frameH: 160,
  count: 8,
  image: null,
};

export const LINE_PROJECTILE_EFFECT_LEVEL_THREE_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/line_projectile/effect_lv3.png",
  frameW: 840,
  frameH: 160,
  count: 8,
  image: null,
};

export const LINE_PROJECTILE_EFFECT_CONFIG = {
  // draw scale relative to frame height
  drawScale: 0.625,
  // pull the projectile start back toward the cast sprite so the visible dragon
  // overlaps the blade release instead of starting after its transparent margin.
  spawnOverlap: 32,
  // horizontal speed in px/frame
  speed: 8,
  // frame animate speed in game-frames per anim-frame
  frameDuration: 5,
  // loop the final three frames once the full-dragon length growth finishes
  loopFromFrame: 5,
  // damage multiplier relative to player base+bonus attack
  damageMultiplier: 1.2,
  // frames between successive hits on the same target
  hitCooldown: 20,
  knockbackRequiredLevel: 3,
  knockbackDistanceTargetWidths: 2,
  passiveKnockbackChance: 0.1,
} as const;

export const CLOSE_ARC_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/close_arc/effect.png",
  frameW: 540,
  frameH: 420,
  count: 6,
  image: null,
};

export const CLOSE_ARC_EFFECT_CONFIG = {
  // Maximum rendered size; level growth scales down from this value.
  drawScale: 0.745,
  groundBaselineY: 365,
  visualBackOffset: 56,
  speed: 6,
  frameDuration: 4,
  // 3-5 character widths (player w=34), using 4 widths ≈ 136px
  maxTravel: 140,
  damageMultiplier: 1.5,
  hitCooldown: 20,
} as const;

export const CLOSE_ARC_BASIC_CRESCENT_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/close_arc/basic_crescent.png",
  frameW: 192,
  frameH: 128,
  count: 2,
  image: null,
};

export const CLOSE_ARC_BASIC_CRESCENT_CONFIG = {
  requiredSkillLevel: 3,
  drawScale: 0.58,
  frameDuration: 4,
  life: 8,
  rangeExtensionPlayerRatio: 0.25,
  hitboxHeightScale: 1,
  damageMultiplier: 0.5,
  maxInstances: 8,
} as const;

export const GUARD_COUNTER_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/guard_counter/effect.png",
  frameW: 420,
  frameH: 320,
  count: 6,
  image: null,
};

export const GUARD_COUNTER_EFFECT_CONFIG = {
  drawScale: 0.48,
  centerYOffset: 72,
  frameDuration: 6,
  startupFrames: 36,
  barrierFlashFrames: 18,
  barrierFrameDuration: 3,
  barrierDrawScale: 0.39,
  barrierCenterYOffset: 62,
  barrierAlphaMin: 0.35,
  barrierAlphaMax: 0.82,
  auraAlphaMin: 0.06,
  auraAlphaRange: 0.08,
  auraWidthScale: 1.35,
  auraHeightScale: 1.45,
  rippleWidth: 76,
  rippleHeight: 14,
  ripplePulseSpeed: 0.16,
  ripplePulseWidth: 10,
  ripplePulseHeight: 3,
  rippleYOffset: 4,
  rippleAlphaMin: 0.22,
  rippleAlphaRange: 0.3,
  rippleInnerAlphaScale: 0.66,
  rippleInnerWidthScale: 0.31,
  rippleInnerHeightScale: 0.28,
  activeFrames: 72,
  maxHits: 3,
  damageMultiplier: 2,
  damageReductionRequiredLevel: 3,
  damageReductionMin: 0.15,
  damageReductionMax: 0.3,
  damageReductionMaxPlayerLevel: 13,
} as const;

export const PLAYER_SKILL_EFFECT_SHEETS: Partial<Record<SkillId, SpriteSheet>> = {
  [SKILL_IDS.dashReposition]: {
    src: "assets/sprites/skills/dash_reposition/effect.png",
    frameW: 360,
    frameH: 120,
    count: 4,
    image: null,
  },
  [SKILL_IDS.vortexControl]: {
    src: "assets/sprites/skills/vortex_control/effect.png",
    frameW: 256,
    frameH: 160,
    count: 6,
    image: null,
  },
  [SKILL_IDS.armorBreak]: {
    src: "assets/sprites/skills/armor_break/effect.png",
    frameW: 220,
    frameH: 160,
    count: 4,
    image: null,
  },
  [SKILL_IDS.antiAirMulti]: {
    src: "assets/sprites/skills/anti_air_multi/effect.png",
    frameW: 360,
    frameH: 320,
    count: 4,
    image: null,
  },
  [SKILL_IDS.returningBlade]: {
    src: "assets/sprites/skills/returning_blade/effect.png",
    frameW: 240,
    frameH: 120,
    count: 4,
    image: null,
  },
  [SKILL_IDS.verticalWave]: {
    src: "assets/sprites/skills/vertical_wave/effect.png",
    frameW: 480,
    frameH: 520,
    count: 7,
    image: null,
  },
};

export const VERTICAL_WAVE_PILLAR_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/vertical_wave/downward_pillar.png",
  frameW: 480,
  frameH: 520,
  count: VERTICAL_WAVE_PILLAR_CONFIG.frameCount,
  image: null,
};

export const ULTIMATE_SKILL_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/ultimate_skill/skill.png",
  frameW: 480,
  frameH: 480,
  count: 6,
  image: null,
};

export const ULTIMATE_SKILL_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/ultimate_skill/effect.png",
  frameW: 480,
  frameH: 360,
  count: 8,
  image: null,
};
