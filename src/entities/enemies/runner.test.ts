import { describe, expect, it } from "vitest";
import { ENEMY_CONFIG, GROUND_Y } from "../../constants";
import { resetState, state } from "../../game/state";
import type { ActBand, EnemyState } from "../../types/game-state";
import { spawnEnemyById, updateEnemies } from "../enemy";
import { runnerDashAnimationFrame } from "./runner";

const DASH_ANIM_FRAME_DURATION_FRAMES = 3;
const DASH_START_FRAME_INDEX = 0;
const DASH_SECOND_FRAME_INDEX = 1;
const DASH_THIRD_FRAME_INDEX = 2;
const DASH_HOLD_FRAME_INDEX = 3;
const DASH_LANDING_FRAME_INDEX = 4;
const DASH_LONG_ELAPSED_FRAMES = 120;
const INTRO_DASH_SPEED = 6.15;
const INTRO_DASH_MIN_BODY_WIDTHS = 2;
const INTRO_DASH_MAX_BODY_WIDTHS = 2.67;
const AWAKENED_DASH_MIN_BODY_WIDTHS = 4;
const AWAKENED_DASH_MAX_BODY_WIDTHS = 4.67;
const BODY_WIDTH_TOLERANCE = 0.05;
const AIRBORNE_DASH_CLEARANCE = 1;
const LANDING_RECOVER_GUARD_FRAMES = 10;
const DASH_THIRD_FRAME_ELAPSED_FRAMES = DASH_ANIM_FRAME_DURATION_FRAMES * DASH_THIRD_FRAME_INDEX;
const DASH_HOLD_FRAME_ELAPSED_FRAMES = DASH_ANIM_FRAME_DURATION_FRAMES * DASH_HOLD_FRAME_INDEX;

function enterRunnerDash(growthStage: ActBand) {
  resetState();
  state.elapsed = 0;

  expect(spawnEnemyById("runner", "debug", "left", { growthStage })).toBe(true);

  const runner = state.enemies[0];
  runner.runnerPhase = "windup";
  runner.runnerTimer = 1;
  runner.runnerFacing = 1;
  runner.vx = 0;

  updateEnemies();

  expect(runner.runnerPhase).toBe("dash");
  return runner;
}

function dashDistanceInBodyWidths(runner: EnemyState) {
  const visualBodyWidth = runner.w / ENEMY_CONFIG.collisionScaleX;
  return Math.abs((runner.runnerTimer ?? 0) * runner.vx) / visualBodyWidth;
}

describe("runner dash tuning", () => {
  it("holds runner_dash on frame 4 until the landing frame is active", () => {
    expect(runnerDashAnimationFrame(0)).toBe(DASH_START_FRAME_INDEX);
    expect(runnerDashAnimationFrame(DASH_ANIM_FRAME_DURATION_FRAMES)).toBe(DASH_SECOND_FRAME_INDEX);
    expect(runnerDashAnimationFrame(DASH_THIRD_FRAME_ELAPSED_FRAMES)).toBe(DASH_THIRD_FRAME_INDEX);
    expect(runnerDashAnimationFrame(DASH_HOLD_FRAME_ELAPSED_FRAMES)).toBe(DASH_HOLD_FRAME_INDEX);
    expect(runnerDashAnimationFrame(DASH_LONG_ELAPSED_FRAMES)).toBe(DASH_HOLD_FRAME_INDEX);
    expect(runnerDashAnimationFrame(DASH_LONG_ELAPSED_FRAMES, true)).toBe(DASH_LANDING_FRAME_INDEX);
  });

  it("uses the faster intro dash speed", () => {
    const runner = enterRunnerDash("intro");

    expect(Math.abs(runner.vx)).toBeCloseTo(INTRO_DASH_SPEED);
  });

  it("travels 2-2.67 visual body widths in the intro growth stage", () => {
    const runner = enterRunnerDash("intro");
    const bodyWidths = dashDistanceInBodyWidths(runner);

    expect(bodyWidths).toBeGreaterThanOrEqual(INTRO_DASH_MIN_BODY_WIDTHS);
    expect(bodyWidths).toBeLessThanOrEqual(INTRO_DASH_MAX_BODY_WIDTHS + BODY_WIDTH_TOLERANCE);
  });

  it("travels 4-4.67 visual body widths in awakened growth stages", () => {
    const runner = enterRunnerDash("awakened");
    const bodyWidths = dashDistanceInBodyWidths(runner);

    expect(bodyWidths).toBeGreaterThanOrEqual(AWAKENED_DASH_MIN_BODY_WIDTHS);
    expect(bodyWidths).toBeLessThanOrEqual(AWAKENED_DASH_MAX_BODY_WIDTHS + BODY_WIDTH_TOLERANCE);
  });

  it("waits in dash hold until airborne runners land before recovering", () => {
    const runner = enterRunnerDash("intro");
    runner.runnerTimer = 1;
    runner.runnerDashElapsed = DASH_LONG_ELAPSED_FRAMES;
    runner.y = GROUND_Y - runner.h - AIRBORNE_DASH_CLEARANCE;
    runner.vy = 0;
    runner.onPlatform = null;

    updateEnemies();

    expect(runner.runnerPhase).toBe("dash");
    expect(runner.runnerTimer).toBe(0);
    expect(runnerDashAnimationFrame(runner.runnerDashElapsed ?? 0)).toBe(DASH_HOLD_FRAME_INDEX);

    for (
      let guard = 0;
      runner.runnerPhase === "dash" && guard < LANDING_RECOVER_GUARD_FRAMES;
      guard += 1
    ) {
      updateEnemies();
    }

    expect(runner.runnerPhase).toBe("recover");
  });
});
