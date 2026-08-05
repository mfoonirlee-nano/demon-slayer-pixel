import { state } from "../../game/state";
import {
  WIDTH,
  PLATFORM_CONFIG,
  PLATFORM_STYLE_LIST,
  PLATFORM_WIDTH,
  LAYER_TRANSITIONS,
  CHAIN_CONFIG,
  HOVER_CONFIG,
  MAP_GENERATION_CONFIG,
} from "../../constants";
import type {
  PlatformState,
  PlatformStyle,
  PlatformLayer,
} from "../../types/game-state";
import { platformSpeedForRun, segmentWeightsForAct, type SegmentKind } from "./actTuning";
import { selectPlatformSpriteForAct, type PlatformSpriteKind } from "./actPlatformSprites";
import {
  clamp,
  farReachableLayer,
  layerAbove,
  layerBelow,
  layerY,
  lerp,
  platformWidth,
  randomBetween,
  weightedPick,
  yToLayer,
} from "./helpers";

const FULL_CIRCLE_RADIANS = Math.PI * 2;
const SAME_LAYER_LONG_STREAK_WEIGHT = 0.08;
const SAME_LAYER_SHORT_STREAK_WEIGHT = 0.22;
const WIDE_PLATFORM_MIN_WIDTH = 190;
const HIGH_RISE_THRESHOLD = 58;
const MEDIUM_RISE_THRESHOLD = 24;
const FALL_THRESHOLD = 36;
const NARROW_PLATFORM_WIDTH_BONUS = 18;
const RECOVERY_EXTRA_GAP = 18;
const HARD_STEP_EXTRA_GAP = 18;
const BREATHER_RANDOM_LAYER_CHANCE = 0.65;
const STAIR_LONG_COUNT_CHANCE = 0.65;
const STAIR_LONG_COUNT = 3;
const ZIGZAG_PLATFORM_COUNT = 3;
export type { SegmentKind };

type SegmentDifficulty = "easy" | "medium" | "hard";

type SegmentSpawnResult = {
  kind: SegmentKind;
  difficulty: SegmentDifficulty;
  platforms: PlatformState[];
};
// --- Map generator state (reset on game restart) ---
let lastLayer: PlatformLayer = "low";
let sameLayerStreak = 0;
let tension = 0;
let lowLayerDrought = 0;
let recentKinds: SegmentKind[] = [];

export function resetMapGenerator() {
  lastLayer = "low";
  sameLayerStreak = 0;
  tension = 0;
  lowLayerDrought = 0;
  recentKinds = [];
}

// --- Layer helpers ---


function pickVariedLayer(current: PlatformLayer): PlatformLayer {
  if (state.platforms.length === 0) return "low";

  const base = LAYER_TRANSITIONS[current];
  const weights: Record<PlatformLayer, number> = {
    low: base.low,
    mid: base.mid,
    high: base.high,
    top: base.top,
  };

  if (sameLayerStreak > 0) {
    weights[current] *= sameLayerStreak > 1 ? SAME_LAYER_LONG_STREAK_WEIGHT : SAME_LAYER_SHORT_STREAK_WEIGHT;
    if (current !== "low" && weights.low > 0) weights.low += 0.18;
    if (current !== "mid" && weights.mid > 0) weights.mid += 0.22;
    if (current !== "high" && weights.high > 0) weights.high += 0.24;
    if (current !== "top" && weights.top > 0) weights.top += 0.18;
  }

  return weightedPick(weights);
}


function platformVx(): number {
  return -platformSpeedForRun(
    state.bossKills,
    state.elapsed,
    Math.random() * PLATFORM_CONFIG.randomSpeed,
  );
}

function expectedPlatformSpeed(): number {
  return platformSpeedForRun(state.bossKills, state.elapsed, PLATFORM_CONFIG.randomSpeed / 2);
}


function difficultyRatio(): number {
  return clamp(state.elapsed / MAP_GENERATION_CONFIG.difficultyRampSeconds, 0, 1);
}

export function nextMapSpawnInterval(): number {
  const difficulty = difficultyRatio();
  const density = MAP_GENERATION_CONFIG.density;
  const targetGap = lerp(density.targetGapEarly, density.targetGapLate, difficulty);
  const expectedPixelsPerSecond = expectedPlatformSpeed() * density.assumedFps;
  const base = targetGap / expectedPixelsPerSecond;
  const jitter = lerp(density.jitterEarly, density.jitterLate, difficulty);
  const interval = base * (1 + Math.random() * jitter);

  return clamp(
    interval + (state.boss ? MAP_GENERATION_CONFIG.spawnInterval.bossExtraDelay : 0),
    density.minInterval,
    density.maxInterval,
  );
}

function randomStyle(): PlatformStyle {
  return PLATFORM_STYLE_LIST[
    Math.floor(Math.random() * PLATFORM_STYLE_LIST.length)
  ] as PlatformStyle;
}


function makePlatform(
  x: number,
  y: number,
  w: number,
  vx: number,
  isHover: boolean,
  isChain: boolean,
  intendedSpriteKind?: PlatformSpriteKind,
): PlatformState {
  const spriteKind = intendedSpriteKind
    ?? (isChain ? "chain" : w >= WIDE_PLATFORM_MIN_WIDTH ? "wide" : "normal");
  const spriteRef = selectPlatformSpriteForAct(state.enemyDirector.act, spriteKind, w);
  const sprite = spriteRef.sheet.regions[spriteRef.regionIndex];
  const drawW = Math.round(sprite.sw * spriteRef.sheet.drawScale);

  return {
    x,
    y,
    baseY: y,
    w: drawW,
    h: PLATFORM_CONFIG.height,
    vx,
    phase: Math.random() * FULL_CIRCLE_RADIANS,
    style: randomStyle(),
    kind: isChain ? "chain" : isHover ? "hover" : "normal",
    spriteIndex: spriteRef.regionIndex,
    spriteAct: spriteRef.spriteAct,
    hoverAmplitude: isHover ? HOVER_CONFIG.amplitude : 0,
    trim: PLATFORM_CONFIG.trimBase + Math.floor(Math.random() * PLATFORM_CONFIG.trimVariants),
    notch: Math.random() < PLATFORM_CONFIG.notchChance
      ? 0
      : PLATFORM_CONFIG.notchBase + Math.floor(Math.random() * PLATFORM_CONFIG.notchVariants),
  };
}

function platformVerticalBounds(platform: PlatformState): { top: number; bottom: number } {
  return {
    top: platform.baseY - platform.hoverAmplitude,
    bottom: platform.baseY + platform.hoverAmplitude + platform.h,
  };
}

function platformRectsOverlap(a: PlatformState, b: PlatformState): boolean {
  const gap = MAP_GENERATION_CONFIG.overlap.minHorizontalGap;
  const aBounds = platformVerticalBounds(a);
  const bBounds = platformVerticalBounds(b);
  const overlapX = a.x < b.x + b.w + gap && a.x + a.w + gap > b.x;
  const overlapY = aBounds.top < bBounds.bottom && aBounds.bottom > bBounds.top;
  return overlapX && overlapY;
}

function nextNonOverlappingX(platform: PlatformState): number {
  let x = platform.x;

  for (let attempt = 0; attempt < MAP_GENERATION_CONFIG.overlap.maxResolveAttempts; attempt += 1) {
    platform.x = x;
    const blocker = state.platforms.find((existing) => platformRectsOverlap(platform, existing));
    if (!blocker) return x;

    x = blocker.x + blocker.w + MAP_GENERATION_CONFIG.overlap.minHorizontalGap;
  }

  return x;
}

function placePlatform(platform: PlatformState): PlatformState {
  platform.x = nextNonOverlappingX(platform);
  state.platforms.push(platform);
  return platform;
}

// --- Segment generator ---

function firstPlatformX(): number {
  return WIDTH + PLATFORM_CONFIG.spawnOffsetX + randomBetween(
    -MAP_GENERATION_CONFIG.segment.firstPlatformJitterX,
    MAP_GENERATION_CONFIG.segment.firstPlatformJitterX,
  );
}

function rememberLastPlatform(platform: PlatformState) {
  const nextLayer = yToLayer(platform.y);
  sameLayerStreak = nextLayer === lastLayer ? sameLayerStreak + 1 : 0;
  lastLayer = nextLayer;
}

function recordSegmentKind(kind: SegmentKind) {
  recentKinds.push(kind);
  if (recentKinds.length > MAP_GENERATION_CONFIG.segment.maxRecentKinds) {
    recentKinds.shift();
  }
}

function tensionGainFor(difficulty: SegmentDifficulty): number {
  if (difficulty === "hard") return MAP_GENERATION_CONFIG.tension.hardGain;
  if (difficulty === "medium") return MAP_GENERATION_CONFIG.tension.mediumGain;
  return MAP_GENERATION_CONFIG.tension.easyGain;
}

function applySegmentAftermath(result: SegmentSpawnResult) {
  recordSegmentKind(result.kind);
  tension = Math.max(0, tension - MAP_GENERATION_CONFIG.tension.patternDecay);
  if (result.kind === "breather") {
    tension = Math.max(0, tension - MAP_GENERATION_CONFIG.tension.breatherRelief);
  } else {
    tension += tensionGainFor(result.difficulty);
  }

  lowLayerDrought = result.platforms.some((platform) => yToLayer(platform.baseY) === "low")
    ? 0
    : lowLayerDrought + 1;
}

function canReachNextPlatform(
  fromY: number,
  toY: number,
  gap: number,
  width: number,
  isHover: boolean,
): boolean {
  const rise = fromY - toY;
  const fall = toY - fromY;
  const reach = MAP_GENERATION_CONFIG.reachability;

  if (rise > reach.maxRise) return false;
  if (fall > reach.maxFall) return false;
  if (gap < reach.minGap) return false;

  let maxGap: number = reach.baseMaxGap;
  if (rise > HIGH_RISE_THRESHOLD) maxGap = reach.highRiseMaxGap;
  else if (rise > MEDIUM_RISE_THRESHOLD) maxGap = reach.mediumRiseMaxGap;
  else if (fall > FALL_THRESHOLD) maxGap = reach.fallMaxGap;

  if (width < PLATFORM_WIDTH.chain.base + NARROW_PLATFORM_WIDTH_BONUS) maxGap -= reach.narrowPenalty;
  if (isHover) maxGap -= reach.hoverPenalty;

  return gap <= maxGap;
}


function shouldRecoverLowLayer(): boolean {
  return lowLayerDrought >= MAP_GENERATION_CONFIG.segment.lowLayerRecoveryThreshold;
}

function pickSegmentKind(): SegmentKind {
  const highTension = tension >= MAP_GENERATION_CONFIG.tension.highThreshold;
  const weights = { ...segmentWeightsForAct(state.enemyDirector.act) };

  if (highTension) {
    weights.breather *= 3.2;
    weights.safeBridge *= 2.4;
    weights.gapJump *= 0.28;
    weights.hoverPair *= 0.25;
    weights.riskFork *= 0.3;
  }

  for (const kind of recentKinds) {
    weights[kind] *= 0.45;
  }

  if (shouldRecoverLowLayer()) {
    weights.breather *= 2.4;
    weights.safeBridge *= 1.8;
    weights.stairDown *= 3.2;
    weights.stairUp *= 0.35;
    weights.zigzag *= 0.45;
    weights.gapJump *= 0.45;
    weights.hoverPair *= 0.25;
    weights.riskFork *= 0.35;
  }

  return weightedPick(weights);
}


function addPlatform(
  platforms: PlatformState[],
  x: number,
  y: number,
  width: number,
  vx: number,
  isHover: boolean,
  isChain: boolean,
): PlatformState {
  const platform = placePlatform(makePlatform(x, y, width, vx, isHover, isChain));
  platforms.push(platform);
  return platform;
}

function spawnLowRecoverySegment(): SegmentSpawnResult {
  const vx = platformVx();
  const platforms: PlatformState[] = [];
  const layers: PlatformLayer[] = lastLayer === "top"
    ? ["top", "high", "mid", "low"]
    : lastLayer === "high"
      ? ["high", "mid", "low"]
      : lastLayer === "mid"
        ? ["mid", "low"]
        : ["low"];
  let x = firstPlatformX();

  for (let i = 0; i < layers.length; i += 1) {
    const y = layerY(layers[i]);
    const width = platformWidth(i === 0 ? "normal" : "chain");
    const platform = addPlatform(platforms, x, y, width, vx, false, i > 0);

    if (i < layers.length - 1) {
      const gap = randomBetween(CHAIN_CONFIG.gapMin, CHAIN_CONFIG.gapMin + RECOVERY_EXTRA_GAP);
      x = platform.x + platform.w + gap;
    }
  }

  const lastPlatform = platforms[platforms.length - 1];
  rememberLastPlatform(lastPlatform);
  return { kind: "stairDown", difficulty: "medium", platforms };
}

function nextReachableStep(fromY: number, direction: -1 | 0 | 1, hard: boolean) {
  const fromLayer = yToLayer(fromY);
  const targetLayer = direction < 0
    ? layerAbove(fromLayer)
    : direction > 0
      ? layerBelow(fromLayer)
      : fromLayer;

  for (let i = 0; i < MAP_GENERATION_CONFIG.segment.retryCount; i += 1) {
    const y = layerY(targetLayer);
    const gap = randomBetween(CHAIN_CONFIG.gapMin, hard ? CHAIN_CONFIG.gapMax + HARD_STEP_EXTRA_GAP : CHAIN_CONFIG.gapMax);
    const width = platformWidth("chain");
    if (canReachNextPlatform(fromY, y, gap, width, false)) {
      return { y, gap, width };
    }
  }

  return {
    y: layerY(targetLayer),
    gap: CHAIN_CONFIG.gapMin,
    width: platformWidth("chain"),
  };
}

function spawnBreatherSegment(): SegmentSpawnResult {
  const targetLayer: PlatformLayer = lastLayer === "high" || lastLayer === "top"
    ? layerBelow(lastLayer)
    : Math.random() < BREATHER_RANDOM_LAYER_CHANCE
      ? pickVariedLayer(lastLayer)
      : "low";
  const spawnLayer = targetLayer === "low" ? "mid" : targetLayer;
  const y = layerY(spawnLayer);
  const platform = placePlatform(makePlatform(firstPlatformX(), y, platformWidth("wide"), platformVx(), false, false, "wide"));
  rememberLastPlatform(platform);
  return { kind: "breather", difficulty: "easy", platforms: [platform] };
}

function spawnStairSegment(kind: "stairUp" | "stairDown"): SegmentSpawnResult {
  const count = Math.random() < STAIR_LONG_COUNT_CHANCE ? STAIR_LONG_COUNT : 2;
  const direction = kind === "stairUp" ? -1 : 1;
  const vx = platformVx();
  const platforms: PlatformState[] = [];
  const startLayer: PlatformLayer = kind === "stairUp"
    ? lastLayer === "low" ? "low" : layerBelow(lastLayer)
    : lastLayer === "top" ? "top" : layerAbove(lastLayer);
  let y = layerY(startLayer);
  let x = firstPlatformX();

  for (let i = 0; i < count; i += 1) {
    const width = i === 0 ? platformWidth("normal") : platformWidth("chain");
    const platform = addPlatform(platforms, x, y, width, vx, false, i > 0);
    const step = nextReachableStep(y, direction, false);
    x = platform.x + platform.w + step.gap;
    y = step.y;
  }

  const lastPlatform = platforms[platforms.length - 1];
  rememberLastPlatform(lastPlatform);
  return { kind, difficulty: kind === "stairUp" ? "medium" : "easy", platforms };
}

function spawnZigzagSegment(): SegmentSpawnResult {
  const vx = platformVx();
  const platforms: PlatformState[] = [];
  let y = layerY(farReachableLayer(lastLayer));
  let x = firstPlatformX();
  let direction: -1 | 1 = yToLayer(y) === "high" || yToLayer(y) === "top" ? 1 : -1;

  for (let i = 0; i < ZIGZAG_PLATFORM_COUNT; i += 1) {
    const width = platformWidth(i === 0 ? "normal" : "chain");
    const platform = addPlatform(platforms, x, y, width, vx, false, i > 0);
    const step = nextReachableStep(y, direction, true);
    x = platform.x + platform.w + step.gap;
    y = step.y;
    direction *= -1;
  }

  rememberLastPlatform(platforms[platforms.length - 1]);
  return { kind: "zigzag", difficulty: "hard", platforms };
}

function spawnHoverPairSegment(): SegmentSpawnResult {
  const vx = platformVx();
  const platforms: PlatformState[] = [];
  let x = firstPlatformX();
  let y = layerY(lastLayer === "top" ? "high" : layerAbove(lastLayer));

  for (let i = 0; i < 2; i += 1) {
    const width = platformWidth(i === 0 ? "normal" : "chain");
    const platform = addPlatform(platforms, x, y, width, vx, true, false);
    platform.phase += i * Math.PI;
    const gap = randomBetween(
      MAP_GENERATION_CONFIG.segment.hoverPairGapMin,
      MAP_GENERATION_CONFIG.segment.hoverPairGapMax,
    );
    const nextLayer = yToLayer(y) === "top" ? "high" : layerAbove(yToLayer(y));
    y = layerY(nextLayer);
    x = platform.x + platform.w + gap;
  }

  rememberLastPlatform(platforms[platforms.length - 1]);
  return { kind: "hoverPair", difficulty: "hard", platforms };
}

function spawnRiskForkSegment(): SegmentSpawnResult {
  const vx = platformVx();
  const platforms: PlatformState[] = [];
  const safeY = layerY(pickVariedLayer(lastLayer));
  const safe = addPlatform(platforms, firstPlatformX(), safeY, platformWidth("normal"), vx, false, false);
  const safeLayer = yToLayer(safeY);
  const riskyLayer = safeLayer === "top" ? "high" : layerAbove(safeLayer);
  const riskyY = layerY(riskyLayer);
  const gap = randomBetween(
    MAP_GENERATION_CONFIG.segment.riskGapMin,
    MAP_GENERATION_CONFIG.segment.riskGapMax,
  );
  addPlatform(
    platforms,
    safe.x + safe.w + gap,
    riskyY,
    platformWidth("chain"),
    vx,
    Math.random() < 0.5,
    true,
  );

  rememberLastPlatform(safe);
  return { kind: "riskFork", difficulty: "hard", platforms };
}

function spawnSegmentKind(kind: SegmentKind): SegmentSpawnResult {
  if (kind === "breather") return spawnBreatherSegment();
  if (kind === "safeBridge") return spawnNormalPlatform();
  if (kind === "stairUp" || kind === "stairDown") return spawnStairSegment(kind);
  if (kind === "zigzag") return spawnZigzagSegment();
  if (kind === "gapJump") return spawnChainCluster();
  if (kind === "hoverPair") return spawnHoverPairSegment();
  return spawnRiskForkSegment();
}

function spawnPatternSegment(): SegmentSpawnResult {
  if (state.platforms.length === 0) return spawnNormalPlatform();
  if (shouldRecoverLowLayer()) return spawnLowRecoverySegment();

  return spawnSegmentKind(pickSegmentKind());
}

// --- Main spawn entry points ---

function spawnNormalPlatform(): SegmentSpawnResult {
  const nextLayer = pickVariedLayer(lastLayer);
  const y = layerY(nextLayer);
  const w = platformWidth("normal");
  const isHover = nextLayer !== "low" && Math.random() < HOVER_CONFIG.chance;
  const vx = platformVx();
  const platform = placePlatform(makePlatform(firstPlatformX(), y, w, vx, isHover, false));
  rememberLastPlatform(platform);

  return {
    kind: "safeBridge",
    difficulty: isHover || nextLayer === "high" || nextLayer === "top" ? "medium" : "easy",
    platforms: [platform],
  };
}

function spawnChainCluster(): SegmentSpawnResult {
  const count = CHAIN_CONFIG.minCount + Math.floor(Math.random() * (CHAIN_CONFIG.maxCount - CHAIN_CONFIG.minCount + 1));
  const vx = platformVx();

  let y = layerY(pickVariedLayer(lastLayer));
  let x = firstPlatformX();
  const platforms: PlatformState[] = [];
  let direction: -1 | 1 = yToLayer(y) === "high" || yToLayer(y) === "top" ? 1 : -1;

  for (let i = 0; i < count; i += 1) {
    const w = platformWidth("chain");
    const platform = placePlatform(makePlatform(x, y, w, vx, false, true));
    platforms.push(platform);

    const step = nextReachableStep(y, direction, true);
    x = platform.x + platform.w + step.gap;
    y = step.y;
    direction *= -1;
  }

  rememberLastPlatform(platforms[platforms.length - 1]);
  return { kind: "gapJump", difficulty: "hard", platforms };
}

// Public API called by runtime.ts instead of spawnPlatform()
export function spawnNextMapSegment() {
  const result = spawnPatternSegment();
  applySegmentAftermath(result);
}

export function spawnMapSegmentOfKind(kind: SegmentKind) {
  const result = spawnSegmentKind(kind);
  applySegmentAftermath(result);
}
