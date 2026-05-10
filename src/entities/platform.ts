import { state } from "../state";
import { ctx } from "../context";
import {
  WIDTH,
  GROUND_Y,
  PLATFORM_CONFIG,
  PLATFORM_STYLE_LIST,
  PLATFORM_VISUAL,
  CRYSTAL_CONFIG,
  CRYSTAL_TYPES_BY_KIND,
  CRYSTAL_VISUAL,
  PLAYER_LIMITS,
  PLATFORM_LAYERS,
  PLATFORM_WIDTH,
  LAYER_TRANSITIONS,
  CHAIN_CONFIG,
  HOVER_CONFIG,
  PILLAR_CONFIG,
  CHEST_CONFIG,
  CHEST_VISUAL,
  MAP_GENERATION_CONFIG,
} from "../constants";
import type {
  CrystalType,
  PlatformState,
  PlatformStyle,
  PlatformLayer,
  PillarState,
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
  | "rewardRisk"
  | "groundHazard";

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
  const interval = MAP_GENERATION_CONFIG.spawnInterval;
  const base = lerp(interval.earlyBase, interval.lateBase, difficulty);
  const variance = lerp(interval.earlyVariance, interval.lateVariance, difficulty);
  return base + Math.random() * variance + (state.boss ? interval.bossExtraDelay : 0);
}

function randomStyle(): PlatformStyle {
  return PLATFORM_STYLE_LIST[
    Math.floor(Math.random() * PLATFORM_STYLE_LIST.length)
  ] as PlatformStyle;
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
  return {
    x,
    y,
    baseY: y,
    w,
    h: PLATFORM_CONFIG.height,
    vx,
    phase: Math.random() * FULL_CIRCLE_RADIANS,
    style: randomStyle(),
    kind: isChain ? "chain" : isHover ? "hover" : "normal",
    hoverAmplitude: isHover ? HOVER_CONFIG.amplitude : 0,
    trim: PLATFORM_CONFIG.trimBase + Math.floor(Math.random() * PLATFORM_CONFIG.trimVariants),
    notch: Math.random() < PLATFORM_CONFIG.notchChance
      ? 0
      : PLATFORM_CONFIG.notchBase + Math.floor(Math.random() * PLATFORM_CONFIG.notchVariants),
  };
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

// --- Pillar spawn ---

function spawnPillar() {
  const h = PILLAR_CONFIG.heightMin + Math.random() * (PILLAR_CONFIG.heightMax - PILLAR_CONFIG.heightMin);
  const w = PILLAR_CONFIG.widthMin + Math.random() * (PILLAR_CONFIG.widthMax - PILLAR_CONFIG.widthMin);
  const pillar: PillarState = {
    x: WIDTH + PLATFORM_CONFIG.spawnOffsetX + Math.random() * 80,
    y: GROUND_Y - h,
    w,
    h,
    vx: platformVx(),
  };
  state.pillars.push(pillar);
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
    groundHazard: lerp(0.4, 1.3, difficulty),
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
  if (kind === "wide") return randomBetween(136, 184);
  if (kind === "chain") {
    return PLATFORM_WIDTH.chain.base + Math.random() * PLATFORM_WIDTH.chain.variance;
  }
  return PLATFORM_WIDTH.normal.base + Math.random() * PLATFORM_WIDTH.normal.variance;
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
  const platform = makePlatform(x, y, width, vx, isHover, isChain);
  state.platforms.push(platform);
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
    addPlatform(platforms, x, y, width, vx, false, i > 0);

    if (i < layers.length - 1) {
      const gap = randomBetween(CHAIN_CONFIG.gapMin, CHAIN_CONFIG.gapMin + 18);
      x += width + gap;
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
  const platform = makePlatform(firstPlatformX(), y, platformWidth("wide"), platformVx(), false, false);
  state.platforms.push(platform);
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
    addPlatform(platforms, x, y, width, vx, false, i > 0);
    const step = nextReachableStep(y, direction, false);
    x += width + step.gap;
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
    addPlatform(platforms, x, y, width, vx, false, i > 0);
    const step = nextReachableStep(y, direction, true);
    x += width + step.gap;
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
    x += width + gap;
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

function spawnGroundHazardSegment(): SegmentSpawnResult {
  const result = spawnNormalPlatform(false);
  spawnPillar();
  return { ...result, kind: "groundHazard", difficulty: "medium" };
}

function spawnPatternSegment(): SegmentSpawnResult {
  if (state.platforms.length === 0) return spawnNormalPlatform(false);
  if (shouldRecoverLowLayer()) return spawnLowRecoverySegment();

  const kind = pickSegmentKind();
  if (kind === "breather") return spawnBreatherSegment();
  if (kind === "stairUp" || kind === "stairDown") return spawnStairSegment(kind);
  if (kind === "zigzag") return spawnZigzagSegment();
  if (kind === "gapJump") return spawnChainCluster();
  if (kind === "hoverPair") return spawnHoverPairSegment();
  if (kind === "rewardRisk") return spawnRewardRiskSegment();
  if (kind === "groundHazard") return spawnGroundHazardSegment();
  return spawnNormalPlatform();
}

// --- Main spawn entry points ---

function spawnNormalPlatform(allowPillar = true): SegmentSpawnResult {
  const nextLayer = pickVariedLayer(lastLayer);
  const y = layerY(nextLayer);
  const w = PLATFORM_WIDTH.normal.base + Math.random() * PLATFORM_WIDTH.normal.variance;
  const isHover = nextLayer !== "low" && Math.random() < HOVER_CONFIG.chance;
  const vx = platformVx();
  const platform = makePlatform(firstPlatformX(), y, w, vx, isHover, false);
  state.platforms.push(platform);
  rememberLastPlatform(platform);

  maybeSpawnReward(platform, isHover || nextLayer === "high" || nextLayer === "top");

  if (allowPillar && Math.random() < PILLAR_CONFIG.spawnChance) {
    spawnPillar();
  }

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
    const w = PLATFORM_WIDTH.chain.base + Math.random() * PLATFORM_WIDTH.chain.variance;
    const platform = makePlatform(x, y, w, vx, false, true);
    state.platforms.push(platform);
    platforms.push(platform);

    if (i === count - 1) {
      maybeSpawnReward(platform, true);
    }

    const step = nextReachableStep(y, direction, true);
    x += w + step.gap;
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

export function updatePillars() {
  if (!state.pillars) return;
  for (let i = state.pillars.length - 1; i >= 0; i -= 1) {
    const p = state.pillars[i];
    p.x += p.vx;
    if (p.x + p.w < -PLATFORM_CONFIG.despawnMargin) state.pillars.splice(i, 1);
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

function drawPlatformBase(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
) {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
}

export function drawPlatforms() {
  if (!ctx) return;

  for (const p of state.platforms) {
    // Chain platforms use stone style always (smaller, clean look)
    const styleKey = p.kind === "chain" ? "stone" : p.style;

    if (styleKey === PLATFORM_STYLE_LIST[2]) {
      drawPlatformBase(ctx, p.x, p.y, p.w, p.h, PLATFORM_VISUAL.shrine.baseColor);
      ctx.fillStyle = PLATFORM_VISUAL.shrine.topColor;
      ctx.fillRect(
        p.x + PLATFORM_VISUAL.shrine.topInsetX,
        p.y + PLATFORM_VISUAL.shrine.topInsetY,
        p.w - PLATFORM_VISUAL.shrine.topInsetWidth,
        PLATFORM_VISUAL.shrine.topHeight,
      );
      for (
        let i = PLATFORM_VISUAL.shrine.pillarStartX;
        i < p.w - PLATFORM_VISUAL.shrine.undersideInset;
        i += PLATFORM_VISUAL.shrine.pillarStep
      ) {
        ctx.fillStyle = PLATFORM_VISUAL.shrine.pillarColor;
        ctx.fillRect(
          p.x + i,
          p.y + PLATFORM_VISUAL.shrine.topInsetY,
          PLATFORM_VISUAL.shrine.pillarWidth,
          p.h - PLATFORM_VISUAL.shrine.topInsetY,
        );
      }
      ctx.fillStyle = PLATFORM_VISUAL.shrine.undersideColor;
      ctx.fillRect(
        p.x + PLATFORM_VISUAL.shrine.undersideInset,
        p.y + p.h,
        p.w - PLATFORM_VISUAL.shrine.undersideInset * 2,
        PLATFORM_VISUAL.shrine.undersideHeight,
      );
    } else if (styleKey === PLATFORM_STYLE_LIST[3]) {
      drawPlatformBase(ctx, p.x, p.y, p.w, p.h, PLATFORM_VISUAL.ruin.baseColor);
      ctx.fillStyle = PLATFORM_VISUAL.ruin.topColor;
      ctx.fillRect(
        p.x + PLATFORM_VISUAL.ruin.topInset,
        p.y + PLATFORM_VISUAL.ruin.topInset,
        p.w - PLATFORM_VISUAL.ruin.topInset * 2,
        PLATFORM_VISUAL.ruin.topHeight,
      );
      for (let i = 0; i < p.notch; i += 1) {
        const notchX =
          p.x + p.w * (PLATFORM_VISUAL.ruin.notchStartRatio + i * PLATFORM_VISUAL.ruin.notchStepRatio);
        ctx.clearRect(notchX, p.y, PLATFORM_VISUAL.ruin.notchWidth, PLATFORM_VISUAL.ruin.notchHeight);
      }
      ctx.fillStyle = PLATFORM_VISUAL.ruin.undersideColor;
      ctx.fillRect(
        p.x + PLATFORM_VISUAL.ruin.undersideInset,
        p.y + p.h,
        p.w - PLATFORM_VISUAL.ruin.undersideInset * 2,
        PLATFORM_VISUAL.ruin.undersideHeight,
      );
    } else if (styleKey === PLATFORM_STYLE_LIST[1]) {
      drawPlatformBase(ctx, p.x, p.y, p.w, p.h, PLATFORM_VISUAL.moss.baseColor);
      ctx.fillStyle = PLATFORM_VISUAL.moss.topColor;
      ctx.fillRect(
        p.x + PLATFORM_VISUAL.moss.topInsetX,
        p.y + PLATFORM_VISUAL.moss.topInsetY,
        p.w - PLATFORM_VISUAL.moss.topInsetWidth,
        PLATFORM_VISUAL.moss.topHeight,
      );
      ctx.fillStyle = PLATFORM_VISUAL.moss.undersideColor;
      ctx.fillRect(
        p.x + PLATFORM_VISUAL.moss.undersideInset,
        p.y + p.h,
        p.w - PLATFORM_VISUAL.moss.undersideInset * 2,
        PLATFORM_VISUAL.moss.undersideHeight,
      );
      for (let i = 0; i < p.w; i += PLATFORM_VISUAL.moss.grassStep) {
        const sway =
          Math.sin(p.phase + i * PLATFORM_VISUAL.moss.grassPhaseScale) *
          PLATFORM_VISUAL.moss.grassSwayAmplitude;
        ctx.fillStyle = PLATFORM_VISUAL.moss.grassColor;
        ctx.fillRect(
          p.x + i + PLATFORM_VISUAL.moss.grassOffsetX,
          p.y - PLATFORM_VISUAL.moss.grassOffsetY + sway,
          PLATFORM_VISUAL.moss.grassWidth,
          PLATFORM_VISUAL.moss.grassHeight,
        );
      }
    } else {
      // stone (default, also used for chain)
      drawPlatformBase(ctx, p.x, p.y, p.w, p.h, PLATFORM_VISUAL.stone.baseColor);
      ctx.fillStyle = PLATFORM_VISUAL.stone.topColor;
      ctx.fillRect(
        p.x + p.trim,
        p.y + PLATFORM_VISUAL.stone.topInsetY,
        p.w - p.trim * 2,
        PLATFORM_VISUAL.stone.topHeight,
      );
      ctx.fillStyle = PLATFORM_VISUAL.stone.undersideColor;
      ctx.fillRect(
        p.x + PLATFORM_VISUAL.stone.undersideInset,
        p.y + p.h,
        p.w - PLATFORM_VISUAL.stone.undersideInset * 2,
        PLATFORM_VISUAL.stone.undersideHeight,
      );
      for (let i = PLATFORM_VISUAL.stone.detailStartX; i < p.w - 4; i += PLATFORM_VISUAL.stone.detailStep) {
        ctx.fillStyle = PLATFORM_VISUAL.stone.detailColor;
        ctx.fillRect(
          p.x + i,
          p.y + PLATFORM_VISUAL.stone.detailOffsetY,
          PLATFORM_VISUAL.stone.detailWidth,
          PLATFORM_VISUAL.stone.detailHeight,
        );
      }
    }

    // Hover indicator: faint glow strip on top edge
    if (p.kind === "hover") {
      ctx.fillStyle = "rgba(140,210,255,0.18)";
      ctx.fillRect(p.x + 2, p.y, p.w - 4, 2);
    }
  }
}

export function drawPillars() {
  if (!ctx || !state.pillars) return;
  for (const p of state.pillars) {
    // Base body
    ctx.fillStyle = PILLAR_CONFIG.baseColor;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    // Top cap
    ctx.fillStyle = PILLAR_CONFIG.topColor;
    ctx.fillRect(p.x - 2, p.y, p.w + 4, 5);
    // Crack detail
    ctx.fillStyle = PILLAR_CONFIG.cracksColor;
    ctx.fillRect(p.x + Math.floor(p.w * 0.4), p.y + 8, 1, Math.floor(p.h * 0.35));
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
