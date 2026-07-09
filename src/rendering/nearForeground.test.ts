import { describe, expect, it } from "vitest";

import { GROUND_Y, WIDTH } from "../constants";
import { bossApproachGroundTransitionSeconds } from "../systems/runProgression";
import {
  BOSS_PRELUDE_TORII_DRAW_H,
  resolveNearForegroundOccluders,
  resolveBossPreludeToriiPlacement,
} from "./nearForeground";

const ACT_ONE = 1;
const START_ELAPSED = 0;
const MIN_POSITIVE_SIZE = 0;
const EXPECTED_DOUBLE_TORII_DRAW_H = 284;
const EXPECTED_TORII_BOTTOM_OFFSET = 8;

describe("boss prelude torii placement", () => {
  it("does not draw the torii outside the boss prelude", () => {
    expect(resolveBossPreludeToriiPlacement({
      bossPreludeElapsed: null,
      act: ACT_ONE,
    })).toBeNull();
  });

  it("draws the boss prelude torii at double the previous foreground size", () => {
    const placement = resolveBossPreludeToriiPlacement({
      bossPreludeElapsed: 0,
      act: ACT_ONE,
    });

    expect(BOSS_PRELUDE_TORII_DRAW_H).toBe(EXPECTED_DOUBLE_TORII_DRAW_H);
    expect(placement?.drawH).toBe(BOSS_PRELUDE_TORII_DRAW_H);
    expect(placement?.y).toBe(GROUND_Y + EXPECTED_TORII_BOTTOM_OFFSET - BOSS_PRELUDE_TORII_DRAW_H);
  });

  it("moves the torii across the screen before the boss spawns", () => {
    const transitionSeconds = bossApproachGroundTransitionSeconds(ACT_ONE);
    const start = resolveBossPreludeToriiPlacement({
      bossPreludeElapsed: 0,
      act: ACT_ONE,
    });
    const middle = resolveBossPreludeToriiPlacement({
      bossPreludeElapsed: transitionSeconds / 2,
      act: ACT_ONE,
    });
    const end = resolveBossPreludeToriiPlacement({
      bossPreludeElapsed: transitionSeconds,
      act: ACT_ONE,
    });

    if (!start || !middle || !end) throw new Error("expected torii placement during boss prelude");

    expect(start.x).toBeGreaterThanOrEqual(WIDTH);
    expect(middle.x).toBeGreaterThan(0);
    expect(middle.x + middle.drawW).toBeLessThan(WIDTH);
    expect(end.x + end.drawW).toBeLessThanOrEqual(0);
  });

  it("resolves near foreground occluders for spawn placement", () => {
    const occluders = resolveNearForegroundOccluders({
      elapsed: START_ELAPSED,
      bossPreludeElapsed: null,
      act: ACT_ONE,
    });

    expect(occluders.length).toBeGreaterThan(0);
    expect(occluders.every((occluder) => occluder.drawW > MIN_POSITIVE_SIZE)).toBe(true);
    expect(occluders.every((occluder) => occluder.drawH > MIN_POSITIVE_SIZE)).toBe(true);
    expect(occluders.some((occluder) => occluder.x < WIDTH && occluder.x + occluder.drawW > 0)).toBe(true);
  });
});
