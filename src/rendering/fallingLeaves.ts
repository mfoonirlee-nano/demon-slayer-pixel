import { FALLING_LEAF_SHEET, GROUND_Y, WIDTH } from "../constants";
import { seededRandom } from "../game/utils";
import { ctx } from "./context";

export type FallingLeafLayer = "far" | "near";

export type FallingLeafRenderItem = {
  x: number;
  y: number;
  alpha: number;
  frame: number;
};

export type FallingLeafOptions = {
  elapsed: number;
  seed: number;
  layer: FallingLeafLayer;
};

type FallingLeafLayerConfig = {
  calmCount: number;
  gustCount: number;
  fallSpeedMin: number;
  fallSpeedRange: number;
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
};

const TWO_PI = Math.PI * 2;
const LEAF_TOP = -8;
const LEAF_GROUND_INSET = 6;
const LEAF_BOTTOM = GROUND_Y - LEAF_GROUND_INSET;
const LEAF_TRAVEL_HEIGHT = LEAF_BOTTOM - LEAF_TOP;
const LEAF_VIEWPORT_MARGIN = 12;
const LEAF_HORIZONTAL_SPAN = WIDTH + LEAF_VIEWPORT_MARGIN * 2;
const GUST_VISIBILITY_THRESHOLD = 0.08;
const VERTICAL_FLUTTER_RATE_SCALE = 0.7;

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
    fallSpeedMin: 7,
    fallSpeedRange: 5,
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
    fallSpeedMin: 12,
    fallSpeedRange: 6,
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
  if (elapsed < firstStart) return { strength: 0, integratedStrength: 0 };

  const elapsedSinceFirstGust = elapsed - firstStart;
  const completedCycles = Math.floor(elapsedSinceFirstGust / interval);
  const cycleElapsed = elapsedSinceFirstGust - completedCycles * interval;
  const fullGustIntegral = duration * 2 / Math.PI;
  if (cycleElapsed >= duration) {
    return {
      strength: 0,
      integratedStrength: (completedCycles + 1) * fullGustIntegral,
    };
  }

  const gustProgress = cycleElapsed / duration;
  // Integrating the gust curve keeps the leaf path continuous when a gust begins or ends.
  const partialGustIntegral = duration / Math.PI * (1 - Math.cos(Math.PI * gustProgress));
  return {
    strength: Math.sin(Math.PI * gustProgress),
    integratedStrength: completedCycles * fullGustIntegral + partialGustIntegral,
  };
}

function resolveLeaf(
  options: FallingLeafOptions,
  config: FallingLeafLayerConfig,
  wind: WindCycle,
  rng: () => number,
  isGustLeaf: boolean,
): FallingLeafRenderItem {
  const originX = rng() * LEAF_HORIZONTAL_SPAN;
  const originY = rng() * LEAF_TRAVEL_HEIGHT;
  const fallSpeed = config.fallSpeedMin + rng() * config.fallSpeedRange;
  const horizontalSpeed = config.horizontalSpeedMin + rng() * config.horizontalSpeedRange;
  const gustSpeed = config.gustSpeedMin + rng() * config.gustSpeedRange;
  const sway = config.swayMin + rng() * config.swayRange;
  const swayRate = config.swayRateMin + rng() * config.swayRateRange;
  const phase = rng() * TWO_PI;
  const tumbleRate = config.tumbleRateMin + rng() * config.tumbleRateRange;
  const alpha = config.alphaMin + rng() * config.alphaRange;
  const windTravel = wind.integratedStrength * gustSpeed;
  const swayOffset = Math.sin(options.elapsed * swayRate + phase) * sway;
  const x = -LEAF_VIEWPORT_MARGIN + positiveModulo(
    originX - options.elapsed * horizontalSpeed - windTravel + swayOffset,
    LEAF_HORIZONTAL_SPAN,
  );
  const flutterOffset = Math.sin(
    options.elapsed * swayRate * VERTICAL_FLUTTER_RATE_SCALE + phase,
  ) * config.flutter;
  const liftOffset = wind.strength * config.gustLift;
  const y = LEAF_TOP + positiveModulo(
    originY + options.elapsed * fallSpeed + flutterOffset - liftOffset,
    LEAF_TRAVEL_HEIGHT,
  );
  const framePhase = phase / TWO_PI * FALLING_LEAF_SHEET.count;
  const frame = Math.floor(positiveModulo(
    options.elapsed * tumbleRate + framePhase,
    FALLING_LEAF_SHEET.count,
  ));

  return {
    x: Math.round(x),
    y: Math.round(y),
    alpha: alpha * (isGustLeaf ? wind.strength : 1),
    frame,
  };
}

export function resolveFallingLeafRenderPlan(
  options: FallingLeafOptions,
): FallingLeafRenderItem[] {
  const config = LAYER_CONFIG[options.layer];
  const wind = resolveWindCycle(options.elapsed, options.seed);
  const gustCount = wind.strength > GUST_VISIBILITY_THRESHOLD ? config.gustCount : 0;
  const leafCount = config.calmCount + gustCount;
  const rng = seededRandom(options.seed + config.seedSalt);

  return Array.from({ length: leafCount }, (_, index) => resolveLeaf(
    options,
    config,
    wind,
    rng,
    index >= config.calmCount,
  ));
}

export function drawFallingLeaves(options: FallingLeafOptions): void {
  const context = ctx;
  const image = FALLING_LEAF_SHEET.image;
  if (!context || !image) return;

  const drawSize = LAYER_CONFIG[options.layer].drawSize;
  const plan = resolveFallingLeafRenderPlan(options);
  context.save();
  for (const leaf of plan) {
    context.globalAlpha = leaf.alpha;
    context.drawImage(
      image,
      leaf.frame * FALLING_LEAF_SHEET.frameW,
      0,
      FALLING_LEAF_SHEET.frameW,
      FALLING_LEAF_SHEET.frameH,
      leaf.x - drawSize / 2,
      leaf.y - drawSize / 2,
      drawSize,
      drawSize,
    );
  }
  context.restore();
}
