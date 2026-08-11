import {
  FALLING_LEAF_SHEETS,
  FALLING_LEAF_KINDS,
  GROUND_Y,
  type FallingLeafKind,
} from "../constants";
import { seededRandom } from "../game/utils";
import { ctx } from "./context";
import { resolveTreeLeafSources, type TreeLeafSource } from "./nearForeground";

export type FallingLeafLayer = "far" | "near";

export type FallingLeafRenderItem = {
  x: number;
  y: number;
  alpha: number;
  frame: number;
  kind: FallingLeafKind;
  sourceId: string;
  releasedAt: number;
  originX: number;
  originY: number;
};

export type FallingLeafOptions = {
  elapsed: number;
  seed: number;
  layer: FallingLeafLayer;
};

type FallingLeafLayerConfig = {
  calmCount: number;
  gustCount: number;
  cycleDurationMin: number;
  cycleDurationRange: number;
  horizontalSpeedMin: number;
  horizontalSpeedRange: number;
  gustSpeedMin: number;
  gustSpeedRange: number;
  swayMin: number;
  swayRange: number;
  swayRateMin: number;
  swayRateRange: number;
  flutter: number;
  gustLift: number;
  tumbleRateMin: number;
  tumbleRateRange: number;
  alphaMin: number;
  alphaRange: number;
  drawSize: number;
  seedSalt: number;
};

type WindCycle = {
  strength: number;
  integratedStrength: number;
  activeGust: {
    index: number;
    startedAt: number;
    duration: number;
  } | null;
};

const TWO_PI = Math.PI * 2;
const LEAF_GROUND_INSET = 6;
const LEAF_BOTTOM = GROUND_Y - LEAF_GROUND_INSET;
const GUST_VISIBILITY_THRESHOLD = 0.08;
const VERTICAL_FLUTTER_RATE_SCALE = 0.7;
const LEAF_SLOT_SEED_STEP = 0x6c8e9cf5;
const LEAF_CYCLE_SEED_STEP = 0x9e3779b1;
const LEAF_KIND_SEED_SALT = 0x42d4c3;
const LEAF_GROUND_FADE_START = 0.82;
const LEAF_MIN_END_ALPHA = 0.08;
const LEAF_LIFT_RAMP_SECONDS = 0.3;
const GUST_RELEASE_WINDOW_RATIO = 0.35;
const GUST_VISIBILITY_DELAY_RATIO = Math.asin(GUST_VISIBILITY_THRESHOLD) / Math.PI;

const LEAF_KIND_TUMBLE_RATE_SCALE: Record<FallingLeafKind, number> = {
  pine: 0.82,
  willow: 0.68,
  broadleaf: 1,
  bamboo: 1.16,
};

const WIND_TIMING = {
  firstStartMin: 1.2,
  firstStartRange: 1.3,
  intervalMin: 5,
  intervalRange: 3,
  durationMin: 0.9,
  durationRange: 0.4,
  seedSalt: 0x51f15e,
} as const;

const LAYER_CONFIG: Record<FallingLeafLayer, FallingLeafLayerConfig> = {
  far: {
    calmCount: 6,
    gustCount: 7,
    cycleDurationMin: 16,
    cycleDurationRange: 6,
    horizontalSpeedMin: 18,
    horizontalSpeedRange: 8,
    gustSpeedMin: 52,
    gustSpeedRange: 12,
    swayMin: 4,
    swayRange: 4,
    swayRateMin: 1.1,
    swayRateRange: 0.7,
    flutter: 3,
    gustLift: 4,
    tumbleRateMin: 4,
    tumbleRateRange: 3.6,
    alphaMin: 0.35,
    alphaRange: 0.1,
    drawSize: 12,
    seedSalt: 0x17a11,
  },
  near: {
    calmCount: 4,
    gustCount: 5,
    cycleDurationMin: 9,
    cycleDurationRange: 4,
    horizontalSpeedMin: 26,
    horizontalSpeedRange: 10,
    gustSpeedMin: 58,
    gustSpeedRange: 18,
    swayMin: 7,
    swayRange: 5,
    swayRateMin: 1.35,
    swayRateRange: 0.9,
    flutter: 5,
    gustLift: 8,
    tumbleRateMin: 5.6,
    tumbleRateRange: 4.4,
    alphaMin: 0.48,
    alphaRange: 0.12,
    drawSize: 24,
    seedSalt: 0x2ea25,
  },
};

function positiveModulo(value: number, modulus: number) {
  return ((value % modulus) + modulus) % modulus;
}

function resolveWindCycle(elapsed: number, seed: number): WindCycle {
  const rng = seededRandom(seed + WIND_TIMING.seedSalt);
  const firstStart = WIND_TIMING.firstStartMin + rng() * WIND_TIMING.firstStartRange;
  const interval = WIND_TIMING.intervalMin + rng() * WIND_TIMING.intervalRange;
  const duration = WIND_TIMING.durationMin + rng() * WIND_TIMING.durationRange;
  if (elapsed < firstStart) {
    return { strength: 0, integratedStrength: 0, activeGust: null };
  }

  const elapsedSinceFirstGust = elapsed - firstStart;
  const completedCycles = Math.floor(elapsedSinceFirstGust / interval);
  const cycleElapsed = elapsedSinceFirstGust - completedCycles * interval;
  const fullGustIntegral = duration * 2 / Math.PI;
  if (cycleElapsed >= duration) {
    return {
      strength: 0,
      integratedStrength: (completedCycles + 1) * fullGustIntegral,
      activeGust: null,
    };
  }

  const gustProgress = cycleElapsed / duration;
  // Integrating the gust curve keeps the leaf path continuous when a gust begins or ends.
  const partialGustIntegral = duration / Math.PI * (1 - Math.cos(Math.PI * gustProgress));
  return {
    strength: Math.sin(Math.PI * gustProgress),
    integratedStrength: completedCycles * fullGustIntegral + partialGustIntegral,
    activeGust: {
      index: completedCycles,
      startedAt: firstStart + completedCycles * interval,
      duration,
    },
  };
}

function resolveLeaf(
  options: FallingLeafOptions,
  config: FallingLeafLayerConfig,
  wind: WindCycle,
  index: number,
  isGustLeaf: boolean,
): FallingLeafRenderItem | null {
  const slotSeed = options.seed + config.seedSalt
    + Math.imul(index + 1, LEAF_SLOT_SEED_STEP);
  const rng = seededRandom(slotSeed);
  const cycleDuration = config.cycleDurationMin + rng() * config.cycleDurationRange;
  const cycleOffset = rng() * cycleDuration;
  let cycleIndex: number;
  let cycleAge: number;
  let releasedAt: number;
  if (isGustLeaf) {
    const activeGust = wind.activeGust;
    if (!activeGust) return null;

    const gustLeafIndex = index - config.calmCount;
    const releaseProgress = GUST_VISIBILITY_DELAY_RATIO
      + gustLeafIndex / config.gustCount * GUST_RELEASE_WINDOW_RATIO;
    releasedAt = activeGust.startedAt + activeGust.duration * releaseProgress;
    if (options.elapsed < releasedAt) return null;
    cycleIndex = activeGust.index;
    cycleAge = options.elapsed - releasedAt;
  } else {
    const cyclePosition = (options.elapsed + cycleOffset) / cycleDuration;
    cycleIndex = Math.floor(cyclePosition);
    cycleAge = (cyclePosition - cycleIndex) * cycleDuration;
    releasedAt = options.elapsed - cycleAge;
  }
  const sourceRng = seededRandom(slotSeed + Math.imul(cycleIndex, LEAF_CYCLE_SEED_STEP));
  const sources = resolveTreeLeafSources({ elapsed: releasedAt, layer: options.layer });
  if (sources.length === 0) return null;

  const source = selectTreeSource(sources, index, options.seed + config.seedSalt, sourceRng);
  const originX = source.x;
  const originY = source.y;
  const horizontalSpeed = config.horizontalSpeedMin + rng() * config.horizontalSpeedRange;
  const gustSpeed = config.gustSpeedMin + rng() * config.gustSpeedRange;
  const sway = config.swayMin + rng() * config.swayRange;
  const swayRate = config.swayRateMin + rng() * config.swayRateRange;
  const phase = rng() * TWO_PI;
  const tumbleRate = config.tumbleRateMin + rng() * config.tumbleRateRange;
  const alpha = config.alphaMin + rng() * config.alphaRange;
  const releaseWind = resolveWindCycle(releasedAt, options.seed);
  const windTravel = (wind.integratedStrength - releaseWind.integratedStrength) * gustSpeed;
  const swayOffset = (
    Math.sin(options.elapsed * swayRate + phase)
    - Math.sin(releasedAt * swayRate + phase)
  ) * sway;
  const x = originX - cycleAge * horizontalSpeed - windTravel + swayOffset;
  const flutterRate = swayRate * VERTICAL_FLUTTER_RATE_SCALE;
  const flutterOffset = (
    Math.sin(options.elapsed * flutterRate + phase)
    - Math.sin(releasedAt * flutterRate + phase)
  ) * config.flutter;
  const liftRamp = Math.min(1, cycleAge / LEAF_LIFT_RAMP_SECONDS);
  const liftOffset = wind.strength * config.gustLift * liftRamp;
  const cycleProgress = cycleAge / cycleDuration;
  const y = Math.min(
    LEAF_BOTTOM - 1,
    originY + (LEAF_BOTTOM - originY) * cycleProgress + flutterOffset - liftOffset,
  );
  const sheet = FALLING_LEAF_SHEETS[source.kind];
  const framePhase = phase / TWO_PI * sheet.count;
  const frame = Math.floor(positiveModulo(
    options.elapsed * tumbleRate * LEAF_KIND_TUMBLE_RATE_SCALE[source.kind] + framePhase,
    sheet.count,
  ));
  const fadeProgress = Math.max(
    0,
    (cycleProgress - LEAF_GROUND_FADE_START) / (1 - LEAF_GROUND_FADE_START),
  );
  const endFade = Math.max(LEAF_MIN_END_ALPHA, 1 - fadeProgress);

  return {
    x: Math.round(x),
    y: Math.round(y),
    alpha: alpha * source.alpha * endFade * (isGustLeaf ? wind.strength : 1),
    frame,
    kind: source.kind,
    sourceId: source.id,
    releasedAt,
    originX,
    originY,
  };
}

function selectTreeSource(
  sources: TreeLeafSource[],
  index: number,
  seed: number,
  rng: () => number,
) {
  const availableKinds = FALLING_LEAF_KINDS.filter((kind) => (
    sources.some((source) => source.kind === kind)
  ));
  const kindRng = seededRandom(seed + LEAF_KIND_SEED_SALT);
  const kindOffset = Math.floor(kindRng() * availableKinds.length);
  const preferredKind = availableKinds[(index + kindOffset) % availableKinds.length];
  const matchingSources = sources.filter((source) => source.kind === preferredKind);
  return matchingSources[Math.floor(rng() * matchingSources.length)];
}

export function resolveFallingLeafRenderPlan(
  options: FallingLeafOptions,
): FallingLeafRenderItem[] {
  const config = LAYER_CONFIG[options.layer];
  const wind = resolveWindCycle(options.elapsed, options.seed);
  const gustCount = wind.strength > GUST_VISIBILITY_THRESHOLD ? config.gustCount : 0;
  const leafCount = config.calmCount + gustCount;

  return Array.from({ length: leafCount }, (_, index) => resolveLeaf(
    options,
    config,
    wind,
    index,
    index >= config.calmCount,
  )).filter((leaf): leaf is FallingLeafRenderItem => leaf !== null);
}

export function drawFallingLeaves(options: FallingLeafOptions): void {
  const context = ctx;
  if (!context) return;

  const drawSize = LAYER_CONFIG[options.layer].drawSize;
  const plan = resolveFallingLeafRenderPlan(options);
  context.save();
  for (const leaf of plan) {
    const sheet = FALLING_LEAF_SHEETS[leaf.kind];
    const image = sheet.image;
    if (!image) continue;

    context.globalAlpha = leaf.alpha;
    context.drawImage(
      image,
      leaf.frame * sheet.frameW,
      0,
      sheet.frameW,
      sheet.frameH,
      leaf.x - drawSize / 2,
      leaf.y - drawSize / 2,
      drawSize,
      drawSize,
    );
  }
  context.restore();
}
