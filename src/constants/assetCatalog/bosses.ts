import type { SpriteSheet } from "../../types/assets";

export * from "./mistBone";
export * from "./fangGale";
export * from "./mirrorDream";

export const BOSS_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/spider-string/boss.png",
  frameW: 350,
  frameH: 419,
  count: 4,
  image: null,
};

export const BOSS_SKILL1_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/spider-string/boss_skill1.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const BOSS_SKILL1_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/spider-string/boss_skill1_effect.png",
  frameW: 400,
  frameH: 350,
  count: 6,
  image: null,
};

export const DEAD_BELL_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/dead_bell/dead_bell.png",
  frameW: 350,
  frameH: 419,
  count: 4,
  image: null,
};

export const DEAD_BELL_CAST_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/dead_bell/dead_bell_cast.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const DEAD_BELL_RECOVER_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/dead_bell/dead_bell_recover.png",
  frameW: 400,
  frameH: 400,
  count: 3,
  image: null,
};

export const DEAD_BELL_AWAKENED_ECHO_BELL_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/dead_bell/dead_bell_awakened_echo_bell.png",
  frameW: 180,
  frameH: 220,
  count: 4,
  image: null,
};

export const DEAD_BELL_WAVE_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/dead_bell/dead_bell_wave.png",
  frameW: 400,
  frameH: 350,
  count: 6,
  image: null,
};

export const DEAD_BELL_WAVE_VISIBLE_BOUNDS = [
  { w: 177, h: 88 },
  { w: 235, h: 120 },
  { w: 285, h: 160 },
  { w: 329, h: 204 },
  { w: 357, h: 246 },
  { w: 371, h: 274 },
] as const;

export const DEAD_BELL_BLADE_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/dead_bell/dead_bell_blade.png",
  frameW: 420,
  frameH: 180,
  count: 6,
  image: null,
};

export const LANTERN_EMBER_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/lantern-ember/lantern_ember_move.png",
  frameW: 350,
  frameH: 419,
  count: 4,
  image: null,
};

export const LANTERN_EMBER_SUMMON_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/lantern-ember/lantern_ember_summon.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const LANTERN_EMBER_FIRELINE_CAST_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/lantern-ember/lantern_ember_fireline_cast.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const LANTERN_EMBER_BUFF_CAST_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/lantern-ember/lantern_ember_buff_cast.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const LANTERN_EMBER_DEATH_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/lantern-ember/lantern_ember_death.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const LANTERN_EMBER_LURE_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/lantern-ember/lantern_ember_lure_effect.png",
  frameW: 400,
  frameH: 350,
  count: 6,
  image: null,
};

export const LANTERN_EMBER_FIRELINE_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/lantern-ember/lantern_ember_fireline.png",
  frameW: 480,
  frameH: 120,
  count: 8,
  image: null,
};

export const LANTERN_EMBER_BUFF_TETHER_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/lantern-ember/lantern_ember_buff_tether.png",
  frameW: 400,
  frameH: 350,
  count: 6,
  image: null,
};

export const LANTERN_EMBER_AWAKENED_GRID_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/lantern-ember/lantern_ember_awakened_grid.png",
  frameW: 480,
  frameH: 180,
  count: 8,
  image: null,
};

export const LANTERN_EMBER_ASH_ZONE_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/lantern-ember/lantern_ember_ash_zone.png",
  frameW: 360,
  frameH: 140,
  count: 8,
  image: null,
};

export const BLOOD_MOON_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon.png",
  frameW: 350,
  frameH: 419,
  count: 4,
  image: null,
};

export const BLOOD_MOON_PHASE_SHIFT_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_phase_shift.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const BLOOD_MOON_RECOVER_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_recover.png",
  frameW: 400,
  frameH: 400,
  count: 3,
  image: null,
};

export const BLOOD_MOON_DEATH_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_death.png",
  frameW: 400,
  frameH: 419,
  count: 6,
  image: null,
};

export const BLOOD_MOON_PHASE_RUNES_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_phase_runes.png",
  frameW: 160,
  frameH: 160,
  count: 12,
  image: null,
};

export const BLOOD_MOON_FINAL_STAGGER_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_final_stagger.png",
  frameW: 400,
  frameH: 400,
  count: 4,
  image: null,
};

export const BLOOD_MOON_SPIDER_MIST_CAST_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_spider_mist_cast.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const BLOOD_MOON_MIRROR_FANG_CAST_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_mirror_fang_cast.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const BLOOD_MOON_LANTERN_BELL_CAST_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_lantern_bell_cast.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const BLOOD_MOON_SIXFOLD_CAST_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_sixfold_cast.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const BLOOD_MOON_MANY_FACES_CAST_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_many_faces_cast.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const BLOOD_MOON_SPIDER_MIST_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_spider_mist_effect.png",
  frameW: 420,
  frameH: 220,
  count: 8,
  image: null,
};

export const BLOOD_MOON_MIRROR_FANG_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_mirror_fang_effect.png",
  frameW: 480,
  frameH: 260,
  count: 6,
  image: null,
};

export const BLOOD_MOON_LANTERN_BELL_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_lantern_bell_effect.png",
  frameW: 420,
  frameH: 350,
  count: 8,
  image: null,
};

const BLOOD_MOON_TRAIL_FIRST_SAMPLE_FRAME = 6;
const BLOOD_MOON_TRAIL_SECOND_SAMPLE_FRAME = 18;
const BLOOD_MOON_TRAIL_THIRD_SAMPLE_FRAME = 30;

export const BLOOD_MOON_CONFIG = {
  castDuration: 72,
  finalCastDuration: 252,
  spawnAtFrame: 34,
  phaseShiftFrames: 42,
  phaseEntryCooldown: 60,
  recoveryFrames: 48,
  finalSettleFrames: 64,
  finalExposureFrames: 108,
  staggerFrameDuration: 8,
  initialCooldown: 124,
  skillCooldown: 204,
  finalSkillCooldown: 540,
  drawW: 188,
  drawH: 224,
  castDrawW: 236,
  castDrawH: 236,
  castBottomPadding: 26,
  moveSteeringForce: 0.046,
  phaseSteeringForce: 0.01,
  retreatForce: 0.058,
  drag: 0.91,
  maxVelocityBase: 2.45,
  maxVelocityPhase: 0.24,
  preferredDistance: 190,
  closeDistance: 130,
  summonMaxEnemies: 4,
  trailSampleFrames: [
    BLOOD_MOON_TRAIL_FIRST_SAMPLE_FRAME,
    BLOOD_MOON_TRAIL_SECOND_SAMPLE_FRAME,
    BLOOD_MOON_TRAIL_THIRD_SAMPLE_FRAME,
  ],
  trailStaggerFrames: 10,
  mirrorDecoyVerticalGap: 50,
  mirrorTrueDelayFrames: 12,
  reviewPillarCount: 3,
  reviewDamageScale: 0.86,
  finalDamageScale: 0.72,
  finalCueInterval: 40,
  finalAttackOffset: 14,
  runeLife: 52,
  runeDimFrames: 10,
  runeDrawW: 92,
  runeDrawH: 92,
  runeYOffset: 42,
  spiderMistWarningFrames: 30,
  spiderMistLife: 92,
  spiderMistFrameDuration: 7,
  spiderMistDrawW: 260,
  spiderMistDrawH: 136,
  spiderMistHitW: 190,
  spiderMistHitH: 44,
  spiderMistDamageBase: 9,
  mirrorFangWarningFrames: 22,
  mirrorFangLife: 86,
  mirrorFangFrameDuration: 6,
  mirrorFangDrawW: 250,
  mirrorFangDrawH: 136,
  mirrorFangHitW: 210,
  mirrorFangHitH: 38,
  mirrorFangSpeed: 8.6,
  mirrorTrialSpeed: 18,
  mirrorFangDamageBase: 10,
  lanternBellLife: 72,
  lanternBellFrameDuration: 7,
  lanternBellDrawW: 240,
  lanternBellDrawH: 200,
  damagePhase: 2,
} as const;

export const DEAD_BELL_CONFIG = {
  castDuration: 64,
  comboCastDuration: 86,
  spawnAtFrame: 30,
  comboSpawnAtFrame: 34,
  castFrameDuration: 9,
  drawW: 228,
  drawH: 228,
  drawBottomPadding: 0,
  awakenedEchoFrameDuration: 9,
  awakenedEchoDrawW: 106,
  awakenedEchoDrawH: 130,
  awakenedEchoHorizontalOffset: 68,
  awakenedEchoBottomOffset: 70,
  waveDrawYOffset: 70,
  waveWarningFrames: 24,
  waveExpandFrames: 76,
  highToneExpandScale: 0.88,
  waveFrameDuration: 10,
  waveStartRadius: 54,
  waveMaxRadius: 390,
  waveThickness: 34,
  delayedWaveFrames: 34,
  bladeWarningFrames: 20,
  bladeFrameDuration: 6,
  bladeDrawW: 270,
  bladeDrawH: 116,
  bladeHitW: 238,
  bladeHitH: 34,
  bladeSpeed: 7.4,
  bladeLife: 120,
  bladeYOffset: 58,
  upperBladeY: 330,
  lowerBladeY: 424,
  reprisalWarningFrames: 30,
  reprisalActiveFrames: 42,
  counterFrames: 54,
  damageBase: 11,
  damagePhase: 3,
  skillCooldown: 238,
  comboCooldown: 288,
  minimumSkillCooldown: 160,
  awakenedMinimumSkillCooldown: 148,
  awakenedCooldownReduction: 12,
  initialCooldown: 120,
  recoveryFrames: 46,
  shortRecoveryFrames: 26,
} as const;

export const LANTERN_EMBER_CONFIG = {
  castDuration: 62,
  awakenedCastDuration: 76,
  spawnAtFrame: 30,
  awakenedSpawnAtFrame: 36,
  castFrameDuration: 9,
  initialCooldown: 126,
  summonCooldown: 212,
  firelineCooldown: 196,
  buffCooldown: 232,
  awakenedCooldown: 268,
  recoveryFrames: 34,
  drawW: 176,
  drawH: 208,
  castDrawW: 228,
  castDrawH: 228,
  castBottomPadding: 26,
  moveSteeringForce: 0.035,
  phaseSteeringForce: 0.01,
  drag: 0.92,
  maxVelocityBase: 2.05,
  maxVelocityPhase: 0.24,
  summonExtraEnemyPhase: 2,
  summonMaxEnemies: 2,
  lureFrameDuration: 6,
  lureLife: 90,
  lureDrawW: 210,
  lureDrawH: 170,
  lureSpeed: 4.4,
  lureYOffset: 58,
  firelineWarningFrames: 24,
  firelineLife: 104,
  firelineFrameDuration: 7,
  firelineHitW: 260,
  firelinePhaseW: 38,
  firelineHitH: 34,
  firelineDrawH: 84,
  firelineYOffset: 6,
  firelineDamageBase: 10,
  firelineDamagePhase: 3,
  buffRadius: 260,
  buffMaxTargets: 3,
  buffFrames: 300,
  buffSpeedExtraScale: 0.35,
  buffDamageScale: 1.25,
  buffTetherFrameDuration: 5,
  buffTetherLife: 32,
  buffTetherDrawH: 158,
  awakenedGridWarningFrames: 28,
  awakenedGridLife: 124,
  awakenedGridFrameDuration: 6,
  awakenedGridDrawW: 1080,
  awakenedGridDrawH: 135,
  awakenedGridSpeed: 1.18,
  awakenedGridPeriod: 148,
  awakenedGridDangerW: 72,
  awakenedGridHitH: 56,
  awakenedGridDamageBase: 8,
  awakenedGridDamagePhase: 2,
  awakenedGridHitCooldown: 32,
  ashZoneLife: 160,
  ashZoneRadius: 112,
  ashZoneVerticalRadiusScale: 0.52,
  ashZoneMoveScale: 0.62,
  ashZoneFrameDuration: 8,
  ashZoneLoopStartFrame: 2,
  ashZoneDrawWidthScale: 2.42,
  ashZoneDamageFirstFrame: 34,
  ashZoneDamageIntervalFrames: 44,
  ashZoneDamageBase: 2,
  ashZoneDamagePhase: 1,
  ashZoneDamageInvincibleFrames: 10,
} as const;

export const BOSS_SKILL1_CONFIG = {
  castDuration: 54,
  spawnAtFrame: 28,
  castFrameDuration: 9,
  drawW: 280,
  drawH: 280,
  drawBottomPadding: 34,
  drawOffsetX: 80,
  drawOffsetY: 72,
  effectDrawScale: 0.42,
  effectSpawnYOffset: 10,
  effectSpawnXOffset: 18,
  effectSpeed: 16,
  effectGravity: 0.45,
  effectMinTravelFrames: 14,
  effectMaxInitialVy: -22,
  effectMinInitialVy: 6,
  effectFrameDuration: 28,
  damageMultiplier: 2,
  cooldown: 260,
  initialCooldown: 150,
  hitPlayerCooldown: 24,
  hitEnemyCooldown: 18,
  minPhase: 2,
} as const;
