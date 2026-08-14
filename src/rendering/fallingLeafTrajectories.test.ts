import { describe, expect, it } from "vitest";
import {
  resolveFallingLeafTrajectoryPosition,
  resolveFallingLeafTumbleFrame,
} from "./fallingLeafTrajectories";

const BASE_POSITION_INPUT = {
  cycleAge: 2,
  cycleProgress: 0.5,
  sway: 10,
  swayRate: 1,
  swayPhase: 0,
  secondarySwayPhase: 0,
  descentPhase: 0,
  flutter: 4,
  flutterPhase: 0,
  trajectoryPhase: 0,
  trajectoryDirection: 1 as const,
  spiralTurns: 2,
  descentWave: 0,
};
const FIRST_ORBIT_QUARTER = 0.25;
const THIRD_ORBIT_QUARTER = 0.75;
const FIRST_ORBIT_AGE = 1;
const THIRD_ORBIT_AGE = 3;
const FRAME_COUNT = 8;
const GLIDE_FRAME_TURN_START = 7;
const GLIDE_FRAME_TURN_MIDDLE = 8;
const GLIDE_FRAME_TURN_END = 9;
const FLUTTER_FRAME_PULSE_END = 3;
const HALF_PI = Math.PI / 2;
const FLUTTER_SWAY_PEAK_AGES = [
  HALF_PI,
  Math.PI + HALF_PI,
  Math.PI * 2 + HALF_PI,
];
const GLIDE_FRAME_SAMPLE_AGES = [
  GLIDE_FRAME_TURN_START,
  GLIDE_FRAME_TURN_MIDDLE,
  GLIDE_FRAME_TURN_END,
];
const FLUTTER_FRAME_SAMPLE_AGES = [1, 2, FLUTTER_FRAME_PULSE_END];
const FLUTTER_FRAME_SWAY_RATE = Math.PI / 2;

function frameAt(
  trajectory: "flutter" | "glide" | "spiral",
  cycleAge: number,
  swayRate = 1,
) {
  return resolveFallingLeafTumbleFrame({
    trajectory,
    cycleAge,
    tumbleRate: 1,
    swayRate,
    swayPhase: 0,
    direction: 1,
    frameCount: FRAME_COUNT,
  });
}

describe("falling leaf trajectories", () => {
  it("swings a flutter path across both sides more than once", () => {
    const positions = FLUTTER_SWAY_PEAK_AGES.map((cycleAge) => (
      resolveFallingLeafTrajectoryPosition({
        ...BASE_POSITION_INPUT,
        trajectory: "flutter",
        cycleAge,
      })
    ));

    expect(positions[0].x).toBeGreaterThan(0);
    expect(positions[1].x).toBeLessThan(0);
    expect(positions[2].x).toBeGreaterThan(0);
  });

  it("lets a glide bank wide while hanging above the regular flutter descent", () => {
    const flutter = resolveFallingLeafTrajectoryPosition({
      ...BASE_POSITION_INPUT,
      trajectory: "flutter",
    });
    const glide = resolveFallingLeafTrajectoryPosition({
      ...BASE_POSITION_INPUT,
      trajectory: "glide",
    });

    expect(Math.abs(glide.x)).toBeGreaterThan(Math.abs(flutter.x));
    expect(glide.descentProgress).toBeLessThan(flutter.descentProgress);
  });

  it("moves a spiral across both sides of its descending ellipse", () => {
    const firstQuarter = resolveFallingLeafTrajectoryPosition({
      ...BASE_POSITION_INPUT,
      trajectory: "spiral",
      cycleAge: FIRST_ORBIT_AGE,
      cycleProgress: FIRST_ORBIT_QUARTER,
      spiralTurns: 1,
    });
    const thirdQuarter = resolveFallingLeafTrajectoryPosition({
      ...BASE_POSITION_INPUT,
      trajectory: "spiral",
      cycleAge: THIRD_ORBIT_AGE,
      cycleProgress: THIRD_ORBIT_QUARTER,
      spiralTurns: 1,
    });

    expect(firstQuarter.x).toBeGreaterThan(0);
    expect(thirdQuarter.x).toBeLessThan(0);
    expect(firstQuarter.y).toBeLessThan(0);
    expect(thirdQuarter.y).toBeLessThan(0);
  });

  it("rocks glide frames backward while flutter frames pause during a pulse", () => {
    const glideFrames = GLIDE_FRAME_SAMPLE_AGES.map((age) => frameAt("glide", age));
    const flutterFrames = FLUTTER_FRAME_SAMPLE_AGES.map((age) => (
      frameAt("flutter", age, FLUTTER_FRAME_SWAY_RATE)
    ));
    const spiralFrames = FLUTTER_FRAME_SAMPLE_AGES.map((age) => frameAt("spiral", age));

    expect(glideFrames[1]).toBeLessThan(glideFrames[0]);
    expect(glideFrames[2]).toBeLessThan(glideFrames[1]);
    expect(flutterFrames[2]).toBe(flutterFrames[1]);
    expect(spiralFrames[2]).toBeGreaterThan(spiralFrames[1]);
  });
});
