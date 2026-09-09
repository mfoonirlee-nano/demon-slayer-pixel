import { seededRandom } from "../game/utils";

export const FALLING_LEAF_TRAJECTORIES = ["flutter", "glide", "spiral"] as const;

export type FallingLeafTrajectory = typeof FALLING_LEAF_TRAJECTORIES[number];

type FallingLeafTrajectoryProfile = {
  driftScale: number;
  swayScale: number;
  tumbleRateScale: number;
};

type FallingLeafTrajectoryPositionInput = {
  trajectory: FallingLeafTrajectory;
  cycleAge: number;
  cycleDuration: number;
  sway: number;
  swayRate: number;
  swayPhase: number;
  secondarySwayPhase: number;
  descentPhase: number;
  trajectoryPhase: number;
  trajectoryDirection: -1 | 1;
  spiralTurns: number;
};

const TWO_PI = Math.PI * 2;
const TRAJECTORY_PATTERN_SEED_SALT = 0x1c53d87;
const TRAJECTORY_RELEASE_SEED_SALT = 0x68bc21f;
const SECONDARY_SWAY_SCALE = 0.22;
const SECONDARY_SWAY_RATE_SCALE = 0.63;
const PHASE_MODULATION_SCALE = 0.38;
const PHASE_MODULATION_RATE = 0.37;
const RELEASE_ACCELERATION_SECONDS = 0.28;
const DESCENT_BANK_MODULATION = 0.72;
const DESCENT_TURBULENCE_MODULATION = 0.12;
const GLIDE_RATE_SCALE = 0.7;
const GLIDE_ARC_SCALE = 1.8;
const BANK_ANGLE = 0.65;
const SPIRAL_ROTATION_SCALE = 0.7;
const FLUTTER_FRAME_PULSE_SCALE = 0.65;
const SPIRAL_MIN_TURNS = 2;
const SPIRAL_TURN_RANGE = 3;

const LEAF_TRAJECTORY_MOTION: Record<
  FallingLeafTrajectory,
  FallingLeafTrajectoryProfile
> = {
  flutter: {
    driftScale: 0.82,
    swayScale: 1.12,
    tumbleRateScale: 0.92,
  },
  glide: {
    driftScale: 1.18,
    swayScale: 0.82,
    tumbleRateScale: 0.48,
  },
  spiral: {
    driftScale: 0.68,
    swayScale: 0.88,
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
    trajectory, cycleAge, cycleDuration, sway, swayRate, swayPhase,
    secondarySwayPhase, trajectoryPhase, trajectoryDirection, spiralTurns,
  } = input;
  // Air resistance builds after release. Using the same clock for position and bank
  // keeps the leaf's attitude attached to its turns, even when sampled after a pause.
  const travelTime = (age: number) => age - RELEASE_ACCELERATION_SECONDS
    * (1 - Math.exp(-age / RELEASE_ACCELERATION_SECONDS));
  const time = travelTime(cycleAge);
  const endTime = travelTime(cycleDuration);
  const rate = swayRate * (trajectory === "glide" ? GLIDE_RATE_SCALE : 1);
  const phaseAt = (age: number) => age * rate + swayPhase
    + PHASE_MODULATION_SCALE * (
      Math.sin(age * rate * PHASE_MODULATION_RATE + trajectoryPhase)
      - Math.sin(trajectoryPhase)
    );
  const angle = phaseAt(time);
  const secondaryRate = rate * SECONDARY_SWAY_RATE_SCALE;
  const arcScale = trajectory === "glide" ? GLIDE_ARC_SCALE : 1;
  const displacement = (age: number) => Math.sin(phaseAt(age)) * sway * arcScale
    + Math.sin(age * secondaryRate + secondarySwayPhase) * sway * SECONDARY_SWAY_SCALE;
  // Integrate a strictly positive sink speed: edge-on passes descend faster, while
  // broadside turns hang briefly. Unlike a vertical sine offset this cannot fly
  // back above the branch or finish its lifetime while still far above the ground.
  const descentAt = (age: number) => age
    + DESCENT_BANK_MODULATION * (
      Math.sin(age * rate * 2 + swayPhase * 2) - Math.sin(swayPhase * 2)
    ) / (rate * 2)
    + DESCENT_TURBULENCE_MODULATION * (
      Math.sin(age * secondaryRate + input.descentPhase) - Math.sin(input.descentPhase)
    ) / secondaryRate;
  const bank = Math.cos(angle) * BANK_ANGLE;
  const rotation = trajectory === "spiral"
    ? angle * SPIRAL_ROTATION_SCALE * (spiralTurns / SPIRAL_MIN_TURNS)
    : bank;

  return {
    x: (displacement(time) - displacement(0)) * trajectoryDirection,
    descentProgress: endTime > 0 ? descentAt(time) / descentAt(endTime) : 0,
    rotation: rotation * trajectoryDirection,
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
