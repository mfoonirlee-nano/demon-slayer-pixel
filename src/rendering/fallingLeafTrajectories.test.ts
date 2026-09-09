import { describe, expect, it } from "vitest";
import {
  resolveFallingLeafTrajectoryPosition,
  resolveFallingLeafTumbleFrame,
} from "./fallingLeafTrajectories";

const BASE_POSITION_INPUT = {
  cycleAge: 2,
  cycleDuration: 10,
  sway: 10,
  swayRate: 1,
  swayPhase: 0,
  secondarySwayPhase: 0,
  descentPhase: 0,
  trajectoryPhase: 0,
  trajectoryDirection: 1 as const,
  spiralTurns: 2,
};
const FRAME_COUNT = 8;
const EARLY_SWAY_PHASE = 1.3;
const REVERSED_SWAY_PHASE = 3.5;
const LATE_SWAY_PHASE = 5.8;
const MOTION_PHASES = [0, EARLY_SWAY_PHASE, REVERSED_SWAY_PHASE, LATE_SWAY_PHASE];
const MOTION_SAMPLE_FPS = 60;
const MAX_DESCENT_PER_FRAME = 0.01;
const GLIDE_FRAME_TURN_START = 7;
const GLIDE_FRAME_TURN_MIDDLE = 8;
const GLIDE_FRAME_TURN_END = 9;
const FLUTTER_FRAME_PULSE_END = 3;
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
  it.each(["flutter", "glide", "spiral"] as const)(
    "%s releases at the canopy, sinks continuously, and reaches the ground",
    (trajectory) => {
      for (const swayPhase of MOTION_PHASES) {
        const samples = Array.from({ length: 601 }, (_, frame) => (
          resolveFallingLeafTrajectoryPosition({
            ...BASE_POSITION_INPUT, trajectory, swayPhase, cycleAge: frame / MOTION_SAMPLE_FPS,
          })
        ));
        expect(samples[0].x).toBeCloseTo(0);
        expect(samples[0].descentProgress).toBeCloseTo(0);
        expect(samples[samples.length - 1].descentProgress).toBeCloseTo(1);
        const drops = samples.slice(1).map((sample, index) => (
          sample.descentProgress - samples[index].descentProgress
        ));
        expect(Math.min(...drops)).toBeGreaterThan(0);
        expect(Math.max(...drops)).toBeLessThan(MAX_DESCENT_PER_FRAME);
        expect(Math.max(...drops)).toBeGreaterThan(Math.min(...drops) * 2);
        const sideways = samples.slice(1).map((sample, index) => sample.x - samples[index].x);
        expect(sideways.some((dx) => dx > 0)).toBe(true);
        expect(sideways.some((dx) => dx < 0)).toBe(true);
      }
    },
  );

  it("does not change airborne sway to force a loop at the lifetime boundary", () => {
    for (const trajectory of ["flutter", "glide", "spiral"] as const) {
      const shortFlight = resolveFallingLeafTrajectoryPosition({
        ...BASE_POSITION_INPUT, trajectory, cycleDuration: 6,
      });
      const longFlight = resolveFallingLeafTrajectoryPosition({
        ...BASE_POSITION_INPUT, trajectory, cycleDuration: 20,
      });
      expect(shortFlight.x).toEqual(longFlight.x);
      expect(shortFlight.rotation).toEqual(longFlight.rotation);
    }
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
