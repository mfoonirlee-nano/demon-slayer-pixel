import { CRYSTAL_TYPES, PLATFORM_STYLE_VALUES } from "./ids";

export const PLATFORM_CONFIG = {
  spawnOffsetX: 40,
  height: 12,
  baseSpeed: 1.4,
  randomSpeed: 0.9,
  speedScaleByElapsed: 0.02,
  trimBase: 2,
  trimVariants: 3,
  notchChance: 0.5,
  notchBase: 1,
  notchVariants: 3,
  crystalSpawnChance: 0.45,
  phaseSpeed: 3,
  despawnMargin: 20,
} as const;

// Y positions by layer (absolute canvas Y, lower number = higher on screen).
// Player height is 90px and jump reach is about 131px, so each climb step is
// kept around 95–115px: higher than the player body, still reachable by jump.
export const PLATFORM_LAYERS = {
  low:  { yMin: 366, yMax: 367 },
  mid:  { yMin: 274, yMax: 275 },
  high: { yMin: 182, yMax: 183 },
  top:  { yMin: 90,  yMax: 91 },
} as const;

// Normal platform sizes per layer
export const PLATFORM_WIDTH = {
  normal: { base: 88, variance: 64 },   // 88–152px
  chain:  { base: 48, variance: 32 },   // 48–80px (smaller, gap-jump stepping stones)
} as const;

// Markov transition matrix: adjacent-layer biased so high platforms remain reachable.
export const LAYER_TRANSITIONS = {
  low:  { low: 0.42, mid: 0.58, high: 0,    top: 0    },
  mid:  { low: 0.52, mid: 0.18, high: 0.30, top: 0    },
  high: { low: 0,    mid: 0.62, high: 0.24, top: 0.14 },
  top:  { low: 0,    mid: 0,    high: 0.72, top: 0.28 },
} as const;

// Chain cluster config (2–3 stepping-stone platforms spawned together)
export const CHAIN_CONFIG = {
  minCount: 2,
  maxCount: 3,
  // Horizontal gap between chain platforms (player can jump: 4px/f × ~37f flight ≈ 148px safe max)
  gapMin: 72,
  gapMax: 112,
  // Max vertical step between chain platforms (must stay within jump range)
  maxDyAbs: 55,
  // Chance to trigger a chain cluster instead of a normal platform
  triggerChance: 0.22,
} as const;

// Hover platform (floating up/down)
export const HOVER_CONFIG = {
  amplitude: 8,         // ±8px vertical travel
  phaseSpeed: 1.8,      // radians/second
  // Only spawn on mid/high layers
  chance: 0.20,
} as const;

// Ground pillars (visual obstacle, player must jump over)
export const PILLAR_CONFIG = {
  widthMin: 8,
  widthMax: 18,
  heightMin: 30,
  heightMax: 60,
  spawnChance: 0.35,   // per platform spawn cycle
  baseColor: "#2a3a52",
  topColor: "#3f5470",
  cracksColor: "#1a2638",
} as const;

// Chest pickup (bigger reward than crystal, spawns on any layer)
export const CHEST_CONFIG = {
  spawnEvery: 6,        // every N platform spawns (approximate)
  spawnVariance: 3,     // ± variance
  offsetBase: 16,
  attackBonusGain: 6,
  healAmount: 48,
  size: 14,
  floatYOffset: 22,
  floatAmplitude: 3,
  phaseSpeed: 2.2,
  glowBase: 0.5,
  glowAmplitude: 0.3,
  hitBurstPower: 2.2,
  tones: {
    attack: { frequency: 680, duration: 0.14, volume: 0.06 },
    health: { frequency: 520, duration: 0.14, volume: 0.06 },
  },
} as const;

export const MAP_GENERATION_CONFIG = {
  difficultyRampSeconds: 120,
  spawnInterval: {
    earlyBase: 2.4,
    lateBase: 1.45,
    earlyVariance: 1.2,
    lateVariance: 0.55,
    bossExtraDelay: 0.25,
  },
  tension: {
    patternDecay: 0.35,
    breatherRelief: 1.4,
    easyGain: 0.25,
    mediumGain: 0.75,
    hardGain: 1.15,
    highThreshold: 2.4,
  },
  reward: {
    debtPerSegment: 1,
    riskyBonusDebt: 0.8,
    chestDebtThreshold: 4.8,
    crystalDebtThreshold: 1.7,
  },
  reachability: {
    minGap: 54,
    baseMaxGap: 126,
    highRiseMaxGap: 88,
    mediumRiseMaxGap: 108,
    fallMaxGap: 138,
    maxRise: 118,
    maxFall: 172,
    narrowPenalty: 12,
    hoverPenalty: 10,
  },
  segment: {
    maxRecentKinds: 4,
    retryCount: 8,
    lowLayerRecoveryThreshold: 2,
    firstPlatformJitterX: 26,
    stairStepMin: 96,
    stairStepMax: 114,
    zigzagStepMin: 96,
    zigzagStepMax: 114,
    hoverPairGapMin: 82,
    hoverPairGapMax: 116,
    riskGapMin: 96,
    riskGapMax: 132,
  },
} as const;

export const CHEST_VISUAL = {
  baseColor: "#8b6914",
  lidColor: "#c49a20",
  rimColor: "#f0c040",
  lockColor: "#f5e070",
  glowColorRgb: "240,190,40",
  burstColor: "#f0c040",
} as const;

export const PLATFORM_STYLE_LIST = PLATFORM_STYLE_VALUES;

export const CRYSTAL_CONFIG = {
  attackTypeChance: 0.55,
  offsetBase: 16,
  minTravelWidth: 24,
  offsetPadding: 32,
  size: 10,
  floatYOffset: 18,
  floatAmplitude: 2,
  glowBase: 0.45,
  glowAmplitude: 0.2,
  glowPhaseMultiplier: 1.7,
  phaseSpeed: 4,
  attackBonusGain: 2,
  healAmount: 24,
  hitBurstPower: {
    attack: 1.6,
    health: 1.4,
  },
  tones: {
    attack: { frequency: 560, duration: 0.08, volume: 0.045 },
    health: { frequency: 440, duration: 0.08, volume: 0.045 },
  },
  draw: {
    outerOffset: 7,
    outerSize: 14,
    attackCoreOffset: { x: 3, y: 5 },
    attackCoreSize: { w: 6, h: 10 },
    attackCrossOffset: { x: 5, y: 3 },
    attackCrossSize: { w: 10, h: 6 },
    healthCoreOffset: { x: 2, y: 5 },
    healthCoreSize: { w: 4, h: 10 },
    healthCrossOffset: { x: 5, y: 2 },
    healthCrossSize: { w: 10, h: 4 },
  },
} as const;

export const CRYSTAL_VISUAL = {
  attackGlowColorRgb: "118,200,255",
  attackCoreColor: "#d9f4ff",
  healthGlowColorRgb: "108,245,180",
  healthCoreColor: "#dcffe9",
  pickupBurstColors: {
    attack: "#82d6ff",
    health: "#6ff3b6",
  },
} as const;

export const PLATFORM_VISUAL = {
  shrine: {
    baseColor: "#4c2830",
    topColor: "#9a3947",
    pillarColor: "#2c1b20",
    undersideColor: "#2a151b",
    topInsetX: 2,
    topInsetY: 2,
    topInsetWidth: 4,
    topHeight: 4,
    pillarStartX: 10,
    pillarStep: 16,
    pillarWidth: 2,
    undersideInset: 6,
    undersideHeight: 3,
  },
  ruin: {
    baseColor: "#3a4554",
    topColor: "#5d6e84",
    undersideColor: "#1e2938",
    topInset: 1,
    topHeight: 3,
    notchWidth: 4,
    notchHeight: 2,
    notchStartRatio: 0.18,
    notchStepRatio: 0.28,
    undersideInset: 5,
    undersideHeight: 3,
  },
  moss: {
    baseColor: "#2e4667",
    topColor: "#3f5f88",
    undersideColor: "#132238",
    grassColor: "#4dd193",
    topInsetX: 3,
    topInsetY: 2,
    topInsetWidth: 6,
    topHeight: 4,
    undersideInset: 7,
    undersideHeight: 3,
    grassStep: 16,
    grassPhaseScale: 0.1,
    grassSwayAmplitude: 1.5,
    grassOffsetX: 3,
    grassOffsetY: 4,
    grassWidth: 3,
    grassHeight: 4,
  },
  stone: {
    baseColor: "#435368",
    topColor: "#607894",
    undersideColor: "#1a2638",
    detailColor: "#2a3a4f",
    topInsetY: 2,
    topHeight: 3,
    undersideInset: 6,
    undersideHeight: 3,
    detailStartX: 8,
    detailStep: 22,
    detailOffsetY: 3,
    detailWidth: 5,
    detailHeight: 5,
  },
} as const;

export const CRYSTAL_TYPES_BY_KIND = CRYSTAL_TYPES;
