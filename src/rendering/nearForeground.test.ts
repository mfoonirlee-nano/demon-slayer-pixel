import { describe, expect, it } from "vitest";

import {
  ACT_OCCLUDER_SPRITES,
  GROUND_Y,
  TORII_SPRITES,
  TREE_SPRITES,
  WIDTH,
} from "../constants";
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
const FINAL_ACT = 13;
const ACTS = Array.from({ length: FINAL_ACT }, (_, index) => index + 1);
const MAX_GROUNDED_ENEMY_DRAW_WIDTH = 142;
const MAX_GROUNDED_ENEMY_DRAW_HEIGHT = 160;

describe("near foreground placement", () => {
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

  it("uses an opaque native-resolution source for the boss prelude torii", () => {
    const placement = resolveBossPreludeToriiPlacement({
      bossPreludeElapsed: 0,
      act: ACT_ONE,
    });

    if (!placement) throw new Error("expected torii placement during boss prelude");

    const region = TORII_SPRITES.variants[placement.variantIndex];

    expect(placement.alpha).toBe(1);
    expect(region.sw).toBeGreaterThanOrEqual(placement.drawW);
    expect(region.sh).toBeGreaterThanOrEqual(placement.drawH);
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

  it("does not upscale tree sprites beyond their source regions", () => {
    const treeOccluders = resolveNearForegroundOccluders({
      elapsed: START_ELAPSED,
      bossPreludeElapsed: null,
      act: ACT_ONE,
    }).filter((occluder) => occluder.source === "tree");

    expect(treeOccluders.length).toBeGreaterThan(0);
    for (const occluder of treeOccluders) {
      const sheet = TREE_SPRITES.sheets[occluder.sheetIndex ?? 0];
      const region = sheet?.variants[occluder.variantIndex];
      if (!region) throw new Error("expected a source region for every tree occluder");

      expect(occluder.drawH).toBeLessThanOrEqual(region.sh);
      expect(occluder.drawW).toBeLessThanOrEqual(region.sw);
    }
  });

  it.each(ACTS)("adds drawable themed and generic enemy cover in Act %i", (act) => {
    const actProps = resolveNearForegroundOccluders({
      elapsed: START_ELAPSED,
      bossPreludeElapsed: null,
      act,
    }).filter((occluder) => occluder.source === "actProp");

    const sprites = actProps.map((occluder) => (
      ACT_OCCLUDER_SPRITES[occluder.sheetIndex ?? 0]
    ));

    expect(sprites.some((sprite) => sprite.kind === "themed" && sprite.acts.includes(act))).toBe(true);
    expect(sprites.some((sprite) => sprite.kind === "generic")).toBe(true);
    expect(actProps.some((occluder) => (
      occluder.x < WIDTH && occluder.x + occluder.drawW > 0
    ))).toBe(true);
    expect(actProps.every((occluder) => occluder.drawW > MAX_GROUNDED_ENEMY_DRAW_WIDTH)).toBe(true);
    expect(actProps.every((occluder) => occluder.drawH > MAX_GROUNDED_ENEMY_DRAW_HEIGHT)).toBe(true);
    expect(actProps.every((occluder) => occluder.alpha === 1)).toBe(true);
  });

});
