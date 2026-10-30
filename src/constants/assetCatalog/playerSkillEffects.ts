import { SKILL_IDS } from "../ids";
import {
  RETURNING_BLADE_CONFIG,
  VERTICAL_WAVE_PILLAR_CONFIG,
} from "../combat";
import type { SkillLevel } from "../../types/game-state";
import type { SkillId, SpriteSheet } from "../../types/assets";

export const LINE_PROJECTILE_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/line_projectile/effect.png",
  frameW: 480,
  frameH: 240,
  count: 8,
  image: null,
};

export const LINE_PROJECTILE_EFFECT_LEVEL_TWO_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/line_projectile/effect_lv2.png",
  frameW: 720,
  frameH: 240,
  count: 8,
  image: null,
};

export const LINE_PROJECTILE_EFFECT_LEVEL_THREE_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/line_projectile/effect_lv3.png",
  frameW: 840,
  frameH: 240,
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
  // Sustain the final wave phases after the opening sequence.
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

export const CLOSE_ARC_EFFECT_LEVEL_TWO_SHEET: SpriteSheet = {
  ...CLOSE_ARC_EFFECT_SHEET,
  src: "assets/sprites/skills/close_arc/effect_lv2.png",
};

export const CLOSE_ARC_EFFECT_LEVEL_THREE_SHEET: SpriteSheet = {
  ...CLOSE_ARC_EFFECT_SHEET,
  src: "assets/sprites/skills/close_arc/effect_lv3.png",
};

export const CLOSE_ARC_BASIC_CRESCENT_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/close_arc/basic_crescent.png",
  frameW: 192,
  frameH: 128,
  count: 2,
  image: null,
};

// Measured per frame so transparent margins cannot shorten range-aligned visuals.
export const CLOSE_ARC_BASIC_CRESCENT_ALPHA_BOUNDS = [
  { x: 42, y: 43, width: 108, height: 42 },
  { x: 39, y: 39, width: 113, height: 50 },
] as const;

export const CLOSE_ARC_BASIC_CRESCENT_CONFIG = {
  requiredSkillLevel: 3,
  // Use attack progress so alternate sprite counts do not shift the release window.
  attackStartProgress: 0.375,
  attackEndProgress: 0.625,
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
  drawScale: 0.25,
  centerYOffset: 4,
  frameDuration: 6,
  startupFrames: 12,
  startupAlpha: 0.68,
  sustainedAlphaMin: 0.42,
  sustainedAlphaRange: 0.14,
  barrierFlashFrames: 18,
  barrierFrameDuration: 3,
  counterAlphaMax: 0.72,
  barrierDrawScale: 0.28,
  barrierCenterYOffset: 4,
  activeFrames: 72,
  maxHits: 3,
  damageMultiplier: 2,
  damageReductionRequiredLevel: 3,
  damageReductionMin: 0.15,
  damageReductionMax: 0.3,
  damageReductionMaxPlayerLevel: 25,
} as const;

export const GUARD_COUNTER_EFFECT_LEVEL_TWO_SHEET: SpriteSheet = {
  ...GUARD_COUNTER_EFFECT_SHEET,
  src: "assets/sprites/skills/guard_counter/effect_lv2.png",
};

export const GUARD_COUNTER_EFFECT_LEVEL_THREE_SHEET: SpriteSheet = {
  ...GUARD_COUNTER_EFFECT_SHEET,
  src: "assets/sprites/skills/guard_counter/effect_lv3.png",
};

export const GUARD_COUNTER_HIT_SHEETS: Record<SkillLevel, SpriteSheet> = {
  1: { ...GUARD_COUNTER_EFFECT_SHEET, src: "assets/sprites/skills/guard_counter/counter.png" },
  2: { ...GUARD_COUNTER_EFFECT_SHEET, src: "assets/sprites/skills/guard_counter/counter_lv2.png" },
  3: { ...GUARD_COUNTER_EFFECT_SHEET, src: "assets/sprites/skills/guard_counter/counter_lv3.png" },
};

export const RETURNING_BLADE_TECHNIQUE_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/returning_blade/tide_technique.png",
  frameW: 256,
  frameH: 256,
  count: RETURNING_BLADE_CONFIG.frameCount,
  image: null,
};

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
  [SKILL_IDS.returningBlade]: RETURNING_BLADE_TECHNIQUE_SHEET,
  [SKILL_IDS.verticalWave]: {
    src: "assets/sprites/skills/vertical_wave/effect.png",
    frameW: 480,
    frameH: 520,
    count: 7,
    image: null,
  },
};

function createLevelEffectSheets(sheet: SpriteSheet): Record<SkillLevel, SpriteSheet> {
  return {
    1: sheet,
    2: { ...sheet, src: sheet.src.replace(".png", "_lv2.png") },
    3: { ...sheet, src: sheet.src.replace(".png", "_lv3.png") },
  };
}

export const PLAYER_SKILL_EFFECT_LEVEL_SHEETS: Partial<Record<SkillId, Record<SkillLevel, SpriteSheet>>> = {
  [SKILL_IDS.dashReposition]: createLevelEffectSheets(PLAYER_SKILL_EFFECT_SHEETS[SKILL_IDS.dashReposition]!),
  [SKILL_IDS.vortexControl]: createLevelEffectSheets(PLAYER_SKILL_EFFECT_SHEETS[SKILL_IDS.vortexControl]!),
  [SKILL_IDS.armorBreak]: createLevelEffectSheets(PLAYER_SKILL_EFFECT_SHEETS[SKILL_IDS.armorBreak]!),
  [SKILL_IDS.antiAirMulti]: createLevelEffectSheets(PLAYER_SKILL_EFFECT_SHEETS[SKILL_IDS.antiAirMulti]!),
  [SKILL_IDS.returningBlade]: createLevelEffectSheets(RETURNING_BLADE_TECHNIQUE_SHEET),
  [SKILL_IDS.verticalWave]: createLevelEffectSheets(PLAYER_SKILL_EFFECT_SHEETS[SKILL_IDS.verticalWave]!),
};

export const VERTICAL_WAVE_EFFECT_GROUND_BASELINE_Y = 450;

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
  count: 4,
  image: null,
};

export const ULTIMATE_SKILL_EFFECT_LEVEL_SHEETS = createLevelEffectSheets(ULTIMATE_SKILL_EFFECT_SHEET);

export const ULTIMATE_OPENING_LEVEL_SHEETS = createLevelEffectSheets({
  src: "assets/sprites/skills/ultimate_skill/opening.png",
  frameW: 480,
  frameH: 360,
  count: 6,
  image: null,
});

export const ULTIMATE_AFTERIMAGE_LEVEL_SHEETS = createLevelEffectSheets({
  src: "assets/sprites/skills/ultimate_skill/afterimage.png",
  frameW: 256,
  frameH: 128,
  count: 4,
  image: null,
});
