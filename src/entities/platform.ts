import { state } from "../state";
import { ctx } from "../context";
import {
  WIDTH,
  PLATFORM_CONFIG,
  PLATFORM_STYLE_LIST,
  CRYSTAL_CONFIG,
  CRYSTAL_TYPES_BY_KIND,
  CRYSTAL_VISUAL,
  PLAYER_LIMITS,
  PLATFORM_LAYERS,
  PLATFORM_WIDTH,
  LAYER_TRANSITIONS,
  CHAIN_CONFIG,
  HOVER_CONFIG,
  CHEST_CONFIG,
  CHEST_VISUAL,
  MAP_GENERATION_CONFIG,
  PLATFORM_SPRITES,
} from "../constants";
import type {
  CrystalType,
  PlatformState,
  PlatformStyle,
  PlatformLayer,
} from "../types/game-state";
import { hitbox } from "../utils";
import { playTone } from "../audio";
import { emitHitBurst } from "./particle";
import { healPlayer } from "./player";

const FULL_CIRCLE_RADIANS = Math.PI * 2;

type SegmentKind =
  | "breather"
  | "safeBridge"
  | "stairUp"
  | "stairDown"
  | "zigzag"
  | "gapJump"
  | "hoverPair"
  | "rewardRisk";

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
let rewardDebt = 0;
let lowLayerDrought = 0;
let recentKinds: SegmentKind[] = [];

export function resetMapGenerator() {
  lastLayer = "low";
  sameLayerStreak = 0;
  tension = 0;
  rewardDebt = 0;
  lowLayerDrought = 0;
  recentKinds = [];
}

// --- Layer helpers ---

function layerY(layer: PlatformLayer): number {
  const range = PLATFORM_LAYERS[layer];
  return range.yMin + Math.random() * (range.yMax - range.yMin);
}

function yToLayer(y: number): PlatformLayer {
  if (y <= PLATFORM_LAYERS.top.yMax) return "top";
  if (y <= PLATFORM_LAYERS.high.yMax) return "high";
  if (y <= PLATFORM_LAYERS.mid.yMax) return "mid";
  return "low";
}

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
    weights[current] *= sameLayerStreak > 1 ? 0.08 : 0.22;
    if (current !== "low" && weights.low > 0) weights.low += 0.18;
    if (current !== "mid" && weights.mid > 0) weights.mid += 0.22;
    if (current !== "high" && weights.high > 0) weights.high += 0.24;
    if (current !== "top" && weights.top > 0) weights.top += 0.18;
  }

  return weightedPick(weights);
}

function layerAbove(layer: PlatformLayer): PlatformLayer {
  if (layer === "low") return "mid";
  if (layer === "mid") return "high";
  return "top";
}

function layerBelow(layer: PlatformLayer): PlatformLayer {
  if (layer === "top") return "high";
  if (layer === "high") return "mid";
  return "low";
}

function farReachableLayer(layer: PlatformLayer): PlatformLayer {
  if (layer === "low") return "mid";
  if (layer === "mid") return Math.random() < 0.5 ? "low" : "high";
  if (layer === "high") return Math.random() < 0.5 ? "mid" : "top";
  return "high";
}

function platformVx(): number {
  return -(
    PLATFORM_CONFIG.baseSpeed +
    Math.random() * PLATFORM_CONFIG.randomSpeed +
    state.elapsed * PLATFORM_CONFIG.speedScaleByElapsed
  );
}

function expectedPlatformSpeed(): number {
  return PLATFORM_CONFIG.baseSpeed +
    PLATFORM_CONFIG.randomSpeed / 2 +
    state.elapsed * PLATFORM_CONFIG.speedScaleByElapsed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
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

function randomSpriteIndex(kind: "normal" | "chain" | "wide"): number {
  const pool = PLATFORM_SPRITES[kind];
  return pool[Math.floor(Math.random() * pool.length)];
}

function nearestSpriteIndex(kind: "normal" | "chain" | "wide", width: number): number {
  const pool = PLATFORM_SPRITES[kind];
  return pool.reduce((best, current) => {
    const bestDelta = Math.abs(PLATFORM_SPRITES.regions[best].sw * PLATFORM_SPRITES.drawScale - width);
    const currentDelta = Math.abs(PLATFORM_SPRITES.regions[current].sw * PLATFORM_SPRITES.drawScale - width);
    return currentDelta < bestDelta ? current : best;
  }, pool[0]);
}

// --- Platform spawn helpers ---

function makePlatform(
  x: number,
  y: number,
  w: number,
  vx: number,
  isHover: boolean,
  isChain: boolean,
): PlatformState {
  const spriteKind = isChain ? "chain" : w >= 190 ? "wide" : "normal";
  const spriteIndex = nearestSpriteIndex(spriteKind, w);
  const sprite = PLATFORM_SPRITES.regions[spriteIndex];
  const drawW = Math.round(sprite.sw * PLATFORM_SPRITES.drawScale);

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
    spriteIndex,
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

function consumeChestSlot(platform: PlatformState): boolean {
  if (rewardDebt >= MAP_GENERATION_CONFIG.reward.chestDebtThreshold) {
    spawnChestOnPlatform(platform);
    rewardDebt = 0;
    return true;
  }
  return false;
}

function maybeSpawnReward(platform: PlatformState, risky: boolean) {
  if (consumeChestSlot(platform)) return;

  const chance = risky
    ? PLATFORM_CONFIG.crystalSpawnChance + 0.18
    : PLATFORM_CONFIG.crystalSpawnChance;
  if (
    rewardDebt >= MAP_GENERATION_CONFIG.reward.crystalDebtThreshold
    || Math.random() < chance
  ) {
    spawnCrystalOnPlatform(platform);
    rewardDebt = Math.max(0, rewardDebt - MAP_GENERATION_CONFIG.reward.crystalDebtThreshold);
  }
}

// --- Crystal ---

export function spawnCrystalOnPlatform(platform: PlatformState) {
  const type: CrystalType =
    Math.random() < CRYSTAL_CONFIG.attackTypeChance
      ? CRYSTAL_TYPES_BY_KIND.attack
      : CRYSTAL_TYPES_BY_KIND.health;
  state.crystals.push({
    platform,
    offsetX:
      CRYSTAL_CONFIG.offsetBase +
      Math.random() *
        Math.max(CRYSTAL_CONFIG.minTravelWidth, platform.w - CRYSTAL_CONFIG.offsetPadding),
    type,
    size: CRYSTAL_CONFIG.size,
    phase: Math.random() * FULL_CIRCLE_RADIANS,
  });
}

// --- Chest ---

function spawnChestOnPlatform(platform: PlatformState) {
  state.chests.push({
    platform,
    offsetX:
      CHEST_CONFIG.offsetBase +
      Math.random() * Math.max(16, platform.w - CHEST_CONFIG.offsetBase * 2),
    phase: Math.random() * FULL_CIRCLE_RADIANS,
    collected: false,
  });
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
  if (rise > 58) maxGap = reach.highRiseMaxGap;
  else if (rise > 24) maxGap = reach.mediumRiseMaxGap;
  else if (fall > 36) maxGap = reach.fallMaxGap;

  if (width < PLATFORM_WIDTH.chain.base + 18) maxGap -= reach.narrowPenalty;
  if (isHover) maxGap -= reach.hoverPenalty;

  return gap <= maxGap;
}

function weightedPick<T extends string>(weights: Record<T, number>): T {
  let total = 0;
  for (const value of Object.values(weights)) total += value as number;

  let roll = Math.random() * total;
  for (const [key, value] of Object.entries(weights) as Array<[T, number]>) {
    roll -= value;
    if (roll <= 0) return key;
  }

  return Object.keys(weights)[0] as T;
}

function shouldRecoverLowLayer(): boolean {
  return lowLayerDrought >= MAP_GENERATION_CONFIG.segment.lowLayerRecoveryThreshold;
}

function pickSegmentKind(): SegmentKind {
  const difficulty = difficultyRatio();
  const highTension = tension >= MAP_GENERATION_CONFIG.tension.highThreshold;

  const weights: Record<SegmentKind, number> = {
    breather: highTension ? 3.8 : 0.8,
    safeBridge: highTension ? 2.6 : 1.6,
    stairUp: lerp(1.2, 1.7, difficulty),
    stairDown: lerp(1.1, 1.5, difficulty),
    zigzag: lerp(0.7, 1.8, difficulty),
    gapJump: highTension ? 0.3 : lerp(0.4, 1.6, difficulty),
    hoverPair: highTension ? 0.2 : lerp(0.15, 1.2, difficulty),
    rewardRisk: highTension ? 0.4 : lerp(0.25, 1.4, difficulty),
  };

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
    weights.rewardRisk *= 0.35;
  }

  return weightedPick(weights);
}

function platformWidth(kind: "normal" | "chain" | "wide"): number {
  return Math.round(PLATFORM_SPRITES.regions[randomSpriteIndex(kind)].sw * PLATFORM_SPRITES.drawScale);
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
      const gap = randomBetween(CHAIN_CONFIG.gapMin, CHAIN_CONFIG.gapMin + 18);
      x = platform.x + platform.w + gap;
    }
  }

  const lastPlatform = platforms[platforms.length - 1];
  rememberLastPlatform(lastPlatform);
  maybeSpawnReward(lastPlatform, false);
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
    const gap = randomBetween(CHAIN_CONFIG.gapMin, hard ? CHAIN_CONFIG.gapMax + 18 : CHAIN_CONFIG.gapMax);
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
    : Math.random() < 0.65
      ? pickVariedLayer(lastLayer)
      : "low";
  const y = layerY(targetLayer);
  const platform = placePlatform(makePlatform(firstPlatformX(), y, platformWidth("wide"), platformVx(), false, false));
  rememberLastPlatform(platform);
  maybeSpawnReward(platform, false);
  return { kind: "breather", difficulty: "easy", platforms: [platform] };
}

function spawnStairSegment(kind: "stairUp" | "stairDown"): SegmentSpawnResult {
  const count = Math.random() < 0.65 ? 3 : 2;
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
  maybeSpawnReward(lastPlatform, kind === "stairUp");
  return { kind, difficulty: kind === "stairUp" ? "medium" : "easy", platforms };
}

function spawnZigzagSegment(): SegmentSpawnResult {
  const vx = platformVx();
  const platforms: PlatformState[] = [];
  let y = layerY(farReachableLayer(lastLayer));
  let x = firstPlatformX();
  let direction: -1 | 1 = yToLayer(y) === "high" || yToLayer(y) === "top" ? 1 : -1;

  for (let i = 0; i < 3; i += 1) {
    const width = platformWidth(i === 0 ? "normal" : "chain");
    const platform = addPlatform(platforms, x, y, width, vx, false, i > 0);
    const step = nextReachableStep(y, direction, true);
    x = platform.x + platform.w + step.gap;
    y = step.y;
    direction *= -1;
  }

  rememberLastPlatform(platforms[platforms.length - 1]);
  maybeSpawnReward(platforms[1], true);
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
  maybeSpawnReward(platforms[platforms.length - 1], true);
  return { kind: "hoverPair", difficulty: "hard", platforms };
}

function spawnRewardRiskSegment(): SegmentSpawnResult {
  rewardDebt += MAP_GENERATION_CONFIG.reward.riskyBonusDebt;
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
  const risky = addPlatform(
    platforms,
    safe.x + safe.w + gap,
    riskyY,
    platformWidth("chain"),
    vx,
    Math.random() < 0.5,
    true,
  );

  rememberLastPlatform(safe);
  maybeSpawnReward(risky, true);
  return { kind: "rewardRisk", difficulty: "hard", platforms };
}

function spawnPatternSegment(): SegmentSpawnResult {
  if (state.platforms.length === 0) return spawnNormalPlatform();
  if (shouldRecoverLowLayer()) return spawnLowRecoverySegment();

  const kind = pickSegmentKind();
  if (kind === "breather") return spawnBreatherSegment();
  if (kind === "stairUp" || kind === "stairDown") return spawnStairSegment(kind);
  if (kind === "zigzag") return spawnZigzagSegment();
  if (kind === "gapJump") return spawnChainCluster();
  if (kind === "hoverPair") return spawnHoverPairSegment();
  if (kind === "rewardRisk") return spawnRewardRiskSegment();
  return spawnNormalPlatform();
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

  maybeSpawnReward(platform, isHover || nextLayer === "high" || nextLayer === "top");

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

    if (i === count - 1) {
      maybeSpawnReward(platform, true);
    }

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
  rewardDebt += MAP_GENERATION_CONFIG.reward.debtPerSegment;

  const result = spawnPatternSegment();
  applySegmentAftermath(result);
}

// --- Update ---

export function updatePlatforms(dt: number) {
  for (let i = state.platforms.length - 1; i >= 0; i -= 1) {
    const p = state.platforms[i];
    p.x += p.vx;
    p.phase += dt * PLATFORM_CONFIG.phaseSpeed;
    if (p.hoverAmplitude > 0) {
      p.y = p.baseY + Math.sin(p.phase * (HOVER_CONFIG.phaseSpeed / PLATFORM_CONFIG.phaseSpeed)) * p.hoverAmplitude;
    }
    if (p.x + p.w < -PLATFORM_CONFIG.despawnMargin) state.platforms.splice(i, 1);
  }
}

export function updateCrystals(dt: number) {
  for (let i = state.crystals.length - 1; i >= 0; i -= 1) {
    const c = state.crystals[i];
    if (!state.platforms.includes(c.platform)) {
      state.crystals.splice(i, 1);
      continue;
    }

    c.phase += dt * CRYSTAL_CONFIG.phaseSpeed;
    const x = c.platform.x + c.offsetX;
    const y =
      c.platform.y -
      CRYSTAL_CONFIG.floatYOffset +
      Math.sin(c.phase) * CRYSTAL_CONFIG.floatAmplitude;
    const box = { x: x - c.size / 2, y: y - c.size / 2, w: c.size, h: c.size };

    if (hitbox(state.player, box)) {
      if (c.type === CRYSTAL_TYPES_BY_KIND.attack) {
        state.player.attackBonus = Math.min(
          PLAYER_LIMITS.attackBonusCap,
          state.player.attackBonus + CRYSTAL_CONFIG.attackBonusGain,
        );
        emitHitBurst(x, y, CRYSTAL_VISUAL.pickupBurstColors.attack, CRYSTAL_CONFIG.hitBurstPower.attack);
        playTone(
          CRYSTAL_CONFIG.tones.attack.frequency,
          CRYSTAL_CONFIG.tones.attack.duration,
          "triangle",
          CRYSTAL_CONFIG.tones.attack.volume,
        );
      } else {
        healPlayer(CRYSTAL_CONFIG.healAmount);
        emitHitBurst(x, y, CRYSTAL_VISUAL.pickupBurstColors.health, CRYSTAL_CONFIG.hitBurstPower.health);
        playTone(
          CRYSTAL_CONFIG.tones.health.frequency,
          CRYSTAL_CONFIG.tones.health.duration,
          "triangle",
          CRYSTAL_CONFIG.tones.health.volume,
        );
      }
      state.crystals.splice(i, 1);
    }
  }
}

export function updateChests(dt: number) {
  if (!state.chests) return;
  for (let i = state.chests.length - 1; i >= 0; i -= 1) {
    const c = state.chests[i];
    if (c.collected || !state.platforms.includes(c.platform)) {
      state.chests.splice(i, 1);
      continue;
    }

    c.phase += dt * CHEST_CONFIG.phaseSpeed;
    const x = c.platform.x + c.offsetX;
    const y =
      c.platform.y -
      CHEST_CONFIG.floatYOffset +
      Math.sin(c.phase) * CHEST_CONFIG.floatAmplitude;
    const box = { x: x - CHEST_CONFIG.size / 2, y: y - CHEST_CONFIG.size / 2, w: CHEST_CONFIG.size, h: CHEST_CONFIG.size };

    if (hitbox(state.player, box)) {
      c.collected = true;
      // 50/50: attack or health chest
      if (Math.random() < 0.5) {
        state.player.attackBonus = Math.min(
          PLAYER_LIMITS.attackBonusCap,
          state.player.attackBonus + CHEST_CONFIG.attackBonusGain,
        );
        emitHitBurst(x, y, CHEST_VISUAL.burstColor, CHEST_CONFIG.hitBurstPower);
        playTone(
          CHEST_CONFIG.tones.attack.frequency,
          CHEST_CONFIG.tones.attack.duration,
          "triangle",
          CHEST_CONFIG.tones.attack.volume,
        );
      } else {
        healPlayer(CHEST_CONFIG.healAmount);
        emitHitBurst(x, y, CHEST_VISUAL.burstColor, CHEST_CONFIG.hitBurstPower);
        playTone(
          CHEST_CONFIG.tones.health.frequency,
          CHEST_CONFIG.tones.health.duration,
          "triangle",
          CHEST_CONFIG.tones.health.volume,
        );
      }
      state.chests.splice(i, 1);
    }
  }
}

// --- Draw ---

export function drawPlatforms() {
  if (!ctx) return;
  const image = PLATFORM_SPRITES.image;
  if (!image) return;
  ctx.imageSmoothingEnabled = false;

  for (const p of state.platforms) {
    const sprite = PLATFORM_SPRITES.regions[p.spriteIndex] ?? PLATFORM_SPRITES.regions[0];
    const drawW = Math.round(sprite.sw * PLATFORM_SPRITES.drawScale);
    const drawH = Math.round(sprite.sh * PLATFORM_SPRITES.drawScale);
    const drawX = Math.round(p.x);
    const visualSurfaceY = p.y - PLATFORM_CONFIG.collisionSurfaceInsetY;
    const drawY = Math.round(visualSurfaceY - sprite.surfaceY * PLATFORM_SPRITES.drawScale);
    ctx.drawImage(
      image,
      sprite.sx,
      sprite.sy,
      sprite.sw,
      sprite.sh,
      drawX,
      drawY,
      drawW,
      drawH,
    );

    // Hover indicator: faint glow strip on top edge
    if (p.kind === "hover") {
      ctx.fillStyle = "rgba(140,210,255,0.18)";
      ctx.fillRect(p.x + 2, visualSurfaceY, p.w - 4, 2);
    }
  }
}

export function drawCrystals() {
  if (!ctx) return;

  for (const c of state.crystals) {
    if (!state.platforms.includes(c.platform)) continue;
    const x = c.platform.x + c.offsetX;
    const y =
      c.platform.y -
      CRYSTAL_CONFIG.floatYOffset +
      Math.sin(c.phase) * CRYSTAL_CONFIG.floatAmplitude;
    const glow =
      CRYSTAL_CONFIG.glowBase +
      CRYSTAL_CONFIG.glowAmplitude * Math.sin(c.phase * CRYSTAL_CONFIG.glowPhaseMultiplier);
    if (c.type === CRYSTAL_TYPES_BY_KIND.attack) {
      ctx.fillStyle = `rgba(${CRYSTAL_VISUAL.attackGlowColorRgb},${glow})`;
      ctx.fillRect(
        x - CRYSTAL_CONFIG.draw.outerOffset,
        y - CRYSTAL_CONFIG.draw.outerOffset,
        CRYSTAL_CONFIG.draw.outerSize,
        CRYSTAL_CONFIG.draw.outerSize,
      );
      ctx.fillStyle = CRYSTAL_VISUAL.attackCoreColor;
      ctx.fillRect(
        x - CRYSTAL_CONFIG.draw.attackCoreOffset.x,
        y - CRYSTAL_CONFIG.draw.attackCoreOffset.y,
        CRYSTAL_CONFIG.draw.attackCoreSize.w,
        CRYSTAL_CONFIG.draw.attackCoreSize.h,
      );
      ctx.fillRect(
        x - CRYSTAL_CONFIG.draw.attackCrossOffset.x,
        y - CRYSTAL_CONFIG.draw.attackCrossOffset.y,
        CRYSTAL_CONFIG.draw.attackCrossSize.w,
        CRYSTAL_CONFIG.draw.attackCrossSize.h,
      );
    } else {
      ctx.fillStyle = `rgba(${CRYSTAL_VISUAL.healthGlowColorRgb},${glow})`;
      ctx.fillRect(
        x - CRYSTAL_CONFIG.draw.outerOffset,
        y - CRYSTAL_CONFIG.draw.outerOffset,
        CRYSTAL_CONFIG.draw.outerSize,
        CRYSTAL_CONFIG.draw.outerSize,
      );
      ctx.fillStyle = CRYSTAL_VISUAL.healthCoreColor;
      ctx.fillRect(
        x - CRYSTAL_CONFIG.draw.healthCoreOffset.x,
        y - CRYSTAL_CONFIG.draw.healthCoreOffset.y,
        CRYSTAL_CONFIG.draw.healthCoreSize.w,
        CRYSTAL_CONFIG.draw.healthCoreSize.h,
      );
      ctx.fillRect(
        x - CRYSTAL_CONFIG.draw.healthCrossOffset.x,
        y - CRYSTAL_CONFIG.draw.healthCrossOffset.y,
        CRYSTAL_CONFIG.draw.healthCrossSize.w,
        CRYSTAL_CONFIG.draw.healthCrossSize.h,
      );
    }
  }
}

export function drawChests() {
  if (!ctx || !state.chests) return;
  for (const c of state.chests) {
    if (c.collected || !state.platforms.includes(c.platform)) continue;
    const x = c.platform.x + c.offsetX;
    const y =
      c.platform.y -
      CHEST_CONFIG.floatYOffset +
      Math.sin(c.phase) * CHEST_CONFIG.floatAmplitude;
    const s = CHEST_CONFIG.size;
    const half = s / 2;
    const glow =
      CHEST_CONFIG.glowBase + CHEST_CONFIG.glowAmplitude * Math.sin(c.phase * 1.6);

    // Glow
    ctx.fillStyle = `rgba(${CHEST_VISUAL.glowColorRgb},${glow * 0.5})`;
    ctx.fillRect(x - half - 4, y - half - 4, s + 8, s + 8);

    // Chest body (bottom half)
    ctx.fillStyle = CHEST_VISUAL.baseColor;
    ctx.fillRect(x - half, y, s, half);

    // Chest lid (top half, slightly wider)
    ctx.fillStyle = CHEST_VISUAL.lidColor;
    ctx.fillRect(x - half - 1, y - half, s + 2, half + 1);

    // Rim line
    ctx.fillStyle = CHEST_VISUAL.rimColor;
    ctx.fillRect(x - half - 1, y - 1, s + 2, 2);

    // Lock
    ctx.fillStyle = CHEST_VISUAL.lockColor;
    ctx.fillRect(x - 2, y - 2, 4, 4);
  }
}
