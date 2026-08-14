import {
  FALLING_LEAF_SHEETS,
  FALLING_LEAF_KINDS,
  GROUND_Y,
  type FallingLeafKind,
} from "../constants";
import { seededRandom } from "../game/utils";
import { ctx } from "./context";
import {
  resolveFallingLeafTrajectory,
  resolveFallingLeafTrajectoryPosition,
  resolveFallingLeafTumbleFrame,
  type FallingLeafTrajectory,
} from "./fallingLeafTrajectories";
import { resolveTreeLeafSources, type TreeLeafSource } from "./nearForeground";

export type FallingLeafLayer = "far" | "near";

export type FallingLeafRenderItem = {
  x: number;
  y: number;
  alpha: number;
  frame: number;
  kind: FallingLeafKind;
  trajectory: FallingLeafTrajectory;
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
  gustDurationMin: number;
  gustDurationRange: number;
  horizontalSpeedMin: number;
  horizontalSpeedRange: number;
  gustSpeedMin: number;
  gustSpeedRange: number;
  swayMin: number;
  swayRange: number;
  swayRateMin: number;
  swayRateRange: number;
  descentWaveMin: number;
  descentWaveRange: number;
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
  latestGust: {
    index: number;
    startedAt: number;
    duration: number;
  } | null;
};

type FallingLeafMotionProfile = {
  driftScale: number;
  swayScale: number;
  swayRateScale: number;
  descentWaveScale: number;
  flutterScale: number;
  tumbleRateScale: number;
};

const TWO_PI = Math.PI * 2;
const LEAF_GROUND_INSET = 6;
const LEAF_BOTTOM = GROUND_Y - LEAF_GROUND_INSET;
const LEAF_CANOPY_LIFT_LIMIT = 16;
const GUST_VISIBILITY_THRESHOLD = 0.08;
const LEAF_SLOT_SEED_STEP = 0x6c8e9cf5;
const LEAF_CYCLE_SEED_STEP = 0x9e3779b1;
const LEAF_KIND_SEED_SALT = 0x42d4c3;
const LEAF_MOTION_SEED_SALT = 0x74d2b91;
const LEAF_GROUND_FADE_START = 0.9;
const LEAF_LIFT_RAMP_SECONDS = 0.3;
const GUST_RESPONSE_MIN = 0.82;
const GUST_RESPONSE_RANGE = 0.36;
const GUST_RELEASE_WINDOW_RATIO = 0.35;
const GUST_VISIBILITY_DELAY_RATIO = Math.asin(GUST_VISIBILITY_THRESHOLD) / Math.PI;

const LEAF_KIND_MOTION: Record<FallingLeafKind, FallingLeafMotionProfile> = {
  pine: {
    driftScale: 1,
    swayScale: 0.72,
    swayRateScale: 1.22,
    descentWaveScale: 0.72,
    flutterScale: 0.72,
    tumbleRateScale: 0.82,
  },
  willow: {
    driftScale: 0.72,
    swayScale: 1.18,
    swayRateScale: 0.78,
    descentWaveScale: 1.12,
    flutterScale: 1.15,
    tumbleRateScale: 0.68,
  },
  broadleaf: {
    driftScale: 0.82,
    swayScale: 1.25,
    swayRateScale: 0.9,
    descentWaveScale: 1.18,
    flutterScale: 1.1,
    tumbleRateScale: 1,
  },
  bamboo: {
    driftScale: 1.12,
    swayScale: 0.82,
    swayRateScale: 1.18,
    descentWaveScale: 0.82,
    flutterScale: 0.78,
    tumbleRateScale: 1.16,
  },
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

// Gust lifetimes finish before the next possible gust so fixed slots never replace leaves midair.
const LAYER_CONFIG: Record<FallingLeafLayer, FallingLeafLayerConfig> = {
  far: {
    calmCount: 6,
    gustCount: 7,
    cycleDurationMin: 16,
    cycleDurationRange: 6,
    gustDurationMin: 3.5,
    gustDurationRange: 0.7,
    horizontalSpeedMin: 6,
    horizontalSpeedRange: 4,
    gustSpeedMin: 52,
    gustSpeedRange: 12,
    swayMin: 9,
    swayRange: 6,
    swayRateMin: 0.7,
    swayRateRange: 0.6,
    descentWaveMin: 0.08,
    descentWaveRange: 0.03,
    flutter: 3.5,
    gustLift: 4,
    tumbleRateMin: 4,
    tumbleRateRange: 3.6,
    alphaMin: 0.58,
    alphaRange: 0.12,
    drawSize: 12,
    seedSalt: 0x17a11,
  },
  near: {
    calmCount: 4,
    gustCount: 5,
    cycleDurationMin: 9,
    cycleDurationRange: 4,
    gustDurationMin: 3,
    gustDurationRange: 0.8,
    horizontalSpeedMin: 9,
    horizontalSpeedRange: 6,
    gustSpeedMin: 58,
    gustSpeedRange: 18,
    swayMin: 14,
    swayRange: 9,
    swayRateMin: 0.8,
    swayRateRange: 0.75,
    descentWaveMin: 0.075,
    descentWaveRange: 0.035,
    flutter: 5.5,
    gustLift: 8,
    tumbleRateMin: 5.6,
    tumbleRateRange: 4.4,
    alphaMin: 0.73,
    alphaRange: 0.12,
    drawSize: 24,
    seedSalt: 0x2ea25,
  },
};

function resolveWindCycle(elapsed: number, seed: number): WindCycle {
  const rng = seededRandom(seed + WIND_TIMING.seedSalt);
  const firstStart = WIND_TIMING.firstStartMin + rng() * WIND_TIMING.firstStartRange;
  const interval = WIND_TIMING.intervalMin + rng() * WIND_TIMING.intervalRange;
  const duration = WIND_TIMING.durationMin + rng() * WIND_TIMING.durationRange;
  if (elapsed < firstStart) {
    return { strength: 0, integratedStrength: 0, latestGust: null };
  }

  const elapsedSinceFirstGust = elapsed - firstStart;
  const completedCycles = Math.floor(elapsedSinceFirstGust / interval);
  const cycleElapsed = elapsedSinceFirstGust - completedCycles * interval;
  const fullGustIntegral = duration * 2 / Math.PI;
  const latestGust = {
    index: completedCycles,
    startedAt: firstStart + completedCycles * interval,
    duration,
  };
  if (cycleElapsed >= duration) {
    return {
      strength: 0,
      integratedStrength: (completedCycles + 1) * fullGustIntegral,
      latestGust,
    };
  }

  const gustProgress = cycleElapsed / duration;
  // Integrating the gust curve keeps the leaf path continuous when a gust begins or ends.
  const partialGustIntegral = duration / Math.PI * (1 - Math.cos(Math.PI * gustProgress));
  return {
    strength: Math.sin(Math.PI * gustProgress),
    integratedStrength: completedCycles * fullGustIntegral + partialGustIntegral,
    latestGust,
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
  const durationRandom = rng();
  const cycleDuration = isGustLeaf
    ? config.gustDurationMin + durationRandom * config.gustDurationRange
    : config.cycleDurationMin + durationRandom * config.cycleDurationRange;
  const cycleOffset = rng() * cycleDuration;
  let cycleIndex: number;
  let cycleAge: number;
  let releasedAt: number;
  if (isGustLeaf) {
    const latestGust = wind.latestGust;
    if (!latestGust) return null;

    const gustLeafIndex = index - config.calmCount;
    const releaseProgress = GUST_VISIBILITY_DELAY_RATIO
      + gustLeafIndex / config.gustCount * GUST_RELEASE_WINDOW_RATIO;
    releasedAt = latestGust.startedAt + latestGust.duration * releaseProgress;
    if (options.elapsed < releasedAt) return null;
    cycleIndex = latestGust.index;
    cycleAge = options.elapsed - releasedAt;
    if (cycleAge >= cycleDuration) return null;
  } else {
    const cyclePosition = (options.elapsed + cycleOffset) / cycleDuration;
    cycleIndex = Math.floor(cyclePosition);
    cycleAge = (cyclePosition - cycleIndex) * cycleDuration;
    releasedAt = options.elapsed - cycleAge;
  }
  const cycleSeed = slotSeed + Math.imul(cycleIndex, LEAF_CYCLE_SEED_STEP);
  const sourceRng = seededRandom(cycleSeed);
  const sources = resolveTreeLeafSources({ elapsed: releasedAt, layer: options.layer });
  if (sources.length === 0) return null;

  const source = selectTreeSource(sources, index, options.seed + config.seedSalt, sourceRng);
  const kindMotion = LEAF_KIND_MOTION[source.kind];
  const {
    trajectory,
    driftDirection,
    trajectoryPhase,
    trajectoryDirection,
    spiralTurns,
    motion: trajectoryMotion,
  } = resolveFallingLeafTrajectory({
    index,
    seed: options.seed + config.seedSalt,
    cycleSeed,
  });
  const motionRng = seededRandom(cycleSeed + LEAF_MOTION_SEED_SALT);
  const originX = source.x;
  const originY = source.y;
  const horizontalSpeed = (
    config.horizontalSpeedMin + motionRng() * config.horizontalSpeedRange
  ) * kindMotion.driftScale * trajectoryMotion.driftScale;
  const gustResponse = GUST_RESPONSE_MIN + motionRng() * GUST_RESPONSE_RANGE;
  const gustSpeed = (
    config.gustSpeedMin + motionRng() * config.gustSpeedRange
  ) * gustResponse;
  const sway = (config.swayMin + motionRng() * config.swayRange)
    * kindMotion.swayScale * trajectoryMotion.swayScale;
  const swayRate = (
    config.swayRateMin + motionRng() * config.swayRateRange
  ) * kindMotion.swayRateScale;
  const swayPhase = motionRng() * TWO_PI;
  const secondarySwayPhase = motionRng() * TWO_PI;
  const descentPhase = motionRng() * TWO_PI;
  const flutterPhase = motionRng() * TWO_PI;
  const tumbleRate = (config.tumbleRateMin + motionRng() * config.tumbleRateRange)
    * kindMotion.tumbleRateScale * trajectoryMotion.tumbleRateScale;
  const alpha = config.alphaMin + motionRng() * config.alphaRange;
  const releaseWind = resolveWindCycle(releasedAt, options.seed);
  const windTravel = (wind.integratedStrength - releaseWind.integratedStrength) * gustSpeed;
  const descentWave = (config.descentWaveMin + motionRng() * config.descentWaveRange)
    * kindMotion.descentWaveScale * trajectoryMotion.descentWaveScale;
  const trajectoryPosition = resolveFallingLeafTrajectoryPosition({
    trajectory,
    cycleAge,
    cycleProgress: cycleAge / cycleDuration,
    sway,
    swayRate,
    swayPhase,
    secondarySwayPhase,
    descentPhase,
    flutter: config.flutter * kindMotion.flutterScale * trajectoryMotion.flutterScale,
    flutterPhase,
    trajectoryPhase,
    trajectoryDirection,
    spiralTurns,
    descentWave,
  });
  const x = originX + cycleAge * horizontalSpeed * driftDirection - windTravel
    + trajectoryPosition.x;
  const liftRamp = Math.min(1, cycleAge / LEAF_LIFT_RAMP_SECONDS);
  const liftOffset = wind.strength * config.gustLift * liftRamp * gustResponse;
  const cycleProgress = cycleAge / cycleDuration;
  const y = Math.max(
    originY - LEAF_CANOPY_LIFT_LIMIT,
    Math.min(
      LEAF_BOTTOM - 1,
      originY + (LEAF_BOTTOM - originY) * trajectoryPosition.descentProgress
        + trajectoryPosition.y - liftOffset,
    ),
  );
  const sheet = FALLING_LEAF_SHEETS[source.kind];
  const frame = resolveFallingLeafTumbleFrame({
    trajectory,
    cycleAge,
    tumbleRate,
    swayRate,
    swayPhase,
    direction: trajectoryDirection,
    frameCount: sheet.count,
  });
  const fadeProgress = Math.min(1, Math.max(0,
    (cycleProgress - LEAF_GROUND_FADE_START) / (1 - LEAF_GROUND_FADE_START),
  ));
  const endFade = 1 - fadeProgress;

  return {
    x: Math.round(x),
    y: Math.round(y),
    alpha: alpha * source.alpha * endFade,
    frame,
    kind: source.kind,
    trajectory,
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
  const leafCount = config.calmCount + config.gustCount;

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
