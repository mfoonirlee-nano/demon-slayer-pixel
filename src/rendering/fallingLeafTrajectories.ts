import { seededRandom } from "../game/utils";

export const FALLING_LEAF_TRAJECTORIES = ["flutter", "glide", "spiral"] as const;

export type FallingLeafTrajectory = typeof FALLING_LEAF_TRAJECTORIES[number];

type FallingLeafTrajectoryProfile = {
  driftScale: number;
  swayScale: number;
  descentWaveScale: number;
  flutterScale: number;
  tumbleRateScale: number;
};

type FallingLeafTrajectoryPositionInput = {
  trajectory: FallingLeafTrajectory;
  cycleAge: number;
  cycleProgress: number;
  sway: number;
  swayRate: number;
  swayPhase: number;
  secondarySwayPhase: number;
  descentPhase: number;
  flutter: number;
  flutterPhase: number;
  trajectoryPhase: number;
  trajectoryDirection: -1 | 1;
  spiralTurns: number;
  descentWave: number;
};

const TWO_PI = Math.PI * 2;
const TRAJECTORY_PATTERN_SEED_SALT = 0x1c53d87;
const TRAJECTORY_RELEASE_SEED_SALT = 0x68bc21f;
const SECONDARY_SWAY_SCALE = 0.28;
const SECONDARY_SWAY_RATE_SCALE = 2.35;
const VERTICAL_FLUTTER_RATE_SCALE = 0.7;
const GLIDE_ARC_SCALE = 1.65;
const GLIDE_BANK_SCALE = 0.34;
const GLIDE_HANG_PROGRESS = 0.11;
const GLIDE_FLUTTER_SCALE = 0.28;
const FLUTTER_FRAME_PULSE_SCALE = 0.65;
const SPIRAL_SWAY_SCALE = 0.82;
const SPIRAL_FLUTTER_SCALE = 1.35;
const SPIRAL_MIN_TURNS = 2;
const SPIRAL_TURN_RANGE = 3;

const LEAF_TRAJECTORY_MOTION: Record<
  FallingLeafTrajectory,
  FallingLeafTrajectoryProfile
> = {
  flutter: {
    driftScale: 0.82,
    swayScale: 1.12,
    descentWaveScale: 1,
    flutterScale: 1.12,
    tumbleRateScale: 0.92,
  },
  glide: {
    driftScale: 1.18,
    swayScale: 0.82,
    descentWaveScale: 0.28,
    flutterScale: 0.4,
    tumbleRateScale: 0.48,
  },
  spiral: {
    driftScale: 0.68,
    swayScale: 0.88,
    descentWaveScale: 0.48,
    flutterScale: 0.32,
    tumbleRateScale: 1.42,
  },
};

function positiveModulo(value: number, modulus: number) {
  return ((value % modulus) + modulus) % modulus;
}

export function resolveFallingLeafTrajectory(input: {
  index: number;
  seed: number;
  cycleSeed: number;
}) {
  const patternRng = seededRandom(input.seed + TRAJECTORY_PATTERN_SEED_SALT);
  const trajectoryOffset = Math.floor(patternRng() * FALLING_LEAF_TRAJECTORIES.length);
  const driftDirectionOffset = Math.floor(patternRng() * FALLING_LEAF_TRAJECTORIES.length);
  // Cycling fixed slots guarantees a mixed silhouette even in the four-leaf near layer.
  const trajectoryIndex = positiveModulo(
    input.index + trajectoryOffset,
    FALLING_LEAF_TRAJECTORIES.length,
  );
  const driftDirectionIndex = positiveModulo(
    input.index + driftDirectionOffset,
    FALLING_LEAF_TRAJECTORIES.length,
  );
  const trajectory = FALLING_LEAF_TRAJECTORIES[trajectoryIndex];
  const releaseRng = seededRandom(input.cycleSeed + TRAJECTORY_RELEASE_SEED_SALT);

  return {
    trajectory,
    driftDirection: driftDirectionIndex === 0 ? 1 as const : -1 as const,
    trajectoryPhase: releaseRng() * TWO_PI,
    trajectoryDirection: releaseRng() < 0.5 ? -1 as const : 1 as const,
    spiralTurns: SPIRAL_MIN_TURNS + Math.floor(releaseRng() * SPIRAL_TURN_RANGE),
    motion: LEAF_TRAJECTORY_MOTION[trajectory],
  };
}

export function resolveFallingLeafTrajectoryPosition(
  input: FallingLeafTrajectoryPositionInput,
) {
  const {
    trajectory,
    cycleAge,
    cycleProgress,
    sway,
    swayRate,
    swayPhase,
    secondarySwayPhase,
    descentPhase,
    flutter,
    flutterPhase,
    trajectoryPhase,
    trajectoryDirection,
    spiralTurns,
    descentWave,
  } = input;

  // Each curve starts at zero; progress-based curves also close before the landing fade.
  if (trajectory === "glide") {
    const glideArc = Math.sin(Math.PI * cycleProgress);
    const glideBank = Math.sin(TWO_PI * cycleProgress);
    const flutterAngle = cycleProgress * TWO_PI * 2;
    return {
      x: trajectoryDirection * glideArc * sway * GLIDE_ARC_SCALE
        + glideBank * sway * GLIDE_BANK_SCALE,
      y: (
        Math.sin(flutterAngle + flutterPhase) - Math.sin(flutterPhase)
      ) * flutter * GLIDE_FLUTTER_SCALE,
      descentProgress: cycleProgress - glideArc * GLIDE_HANG_PROGRESS
        + descentWave * (
          Math.sin(cycleProgress * TWO_PI + descentPhase) - Math.sin(descentPhase)
        ),
    };
  }

  if (trajectory === "spiral") {
    const spiralAngle = cycleProgress * TWO_PI * spiralTurns;
    return {
      x: (
        Math.sin(spiralAngle + trajectoryPhase) - Math.sin(trajectoryPhase)
      ) * sway * SPIRAL_SWAY_SCALE * trajectoryDirection,
      y: (
        Math.cos(spiralAngle + trajectoryPhase) - Math.cos(trajectoryPhase)
      ) * flutter * SPIRAL_FLUTTER_SCALE,
      descentProgress: cycleProgress + descentWave * (
        Math.sin(spiralAngle + descentPhase) - Math.sin(descentPhase)
      ),
    };
  }

  const secondarySwayRate = swayRate * SECONDARY_SWAY_RATE_SCALE;
  const flutterRate = swayRate * VERTICAL_FLUTTER_RATE_SCALE;
  return {
    x: (
      Math.sin(cycleAge * swayRate + swayPhase) - Math.sin(swayPhase)
    ) * sway + (
      Math.sin(cycleAge * secondarySwayRate + secondarySwayPhase)
      - Math.sin(secondarySwayPhase)
    ) * sway * SECONDARY_SWAY_SCALE,
    y: (
      Math.sin(cycleAge * flutterRate + flutterPhase) - Math.sin(flutterPhase)
    ) * flutter,
    descentProgress: cycleProgress + descentWave * (
      Math.sin(cycleProgress * TWO_PI + descentPhase) - Math.sin(descentPhase)
    ),
  };
}

export function resolveFallingLeafTumbleFrame(input: {
  trajectory: FallingLeafTrajectory;
  cycleAge: number;
  tumbleRate: number;
  swayRate: number;
  swayPhase: number;
  direction: -1 | 1;
  frameCount: number;
}) {
  const phaseProgress = input.swayPhase / TWO_PI;
  if (input.trajectory === "glide") {
    const pingPongLength = (input.frameCount - 1) * 2;
    const pingPongFrame = Math.floor(positiveModulo(
      input.cycleAge * input.tumbleRate + phaseProgress * pingPongLength,
      pingPongLength,
    ));
    return pingPongFrame < input.frameCount
      ? pingPongFrame
      : pingPongLength - pingPongFrame;
  }

  const flutterClock = input.trajectory === "flutter"
    ? (Math.sin(input.cycleAge * input.swayRate + input.swayPhase)
      - Math.sin(input.swayPhase)) * FLUTTER_FRAME_PULSE_SCALE
    : 0;
  return Math.floor(positiveModulo(
    (input.cycleAge * input.tumbleRate + flutterClock) * input.direction
      + phaseProgress * input.frameCount,
    input.frameCount,
  ));
}
