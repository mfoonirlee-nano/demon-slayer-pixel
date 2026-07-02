import { describe, expect, it } from "vitest";

import { GROUND_TILE_SPRITES } from "../constants";
import { bossPreludeWaitSeconds } from "../systems/runProgression";
import { resolveGroundTileRenderPlan, type GroundTileRenderInput } from "./groundTiles";

const BASE_INPUT: GroundTileRenderInput = {
  elapsed: 20,
  bossActive: false,
  bossKills: 0,
  bossPreludeElapsed: null,
  act: 1,
  elapsedInAct: 10,
};
const TRANSITION_FRAME_0 = 0;
const TRANSITION_FRAME_1 = 1;
const TRANSITION_FRAME_2 = 2;
const TRANSITION_FRAME_3 = 3;
const TRANSITION_FRAME_ORDER = [
  TRANSITION_FRAME_0,
  TRANSITION_FRAME_1,
  TRANSITION_FRAME_2,
  TRANSITION_FRAME_3,
];

function transitionFrames(patternKey: "forestToShrine" | "shrineToForest") {
  return GROUND_TILE_SPRITES.patterns[patternKey]
    .filter((entry) => entry.set === patternKey)
    .map((entry) => entry.regionIndex);
}

describe("ground tile render plan", () => {
  it("uses moon forest while the run is between boss phases", () => {
    const plan = resolveGroundTileRenderPlan(BASE_INPUT);

    expect(plan.patternKey).toBe("forest");
    expect(plan.pattern).toBe(GROUND_TILE_SPRITES.patterns.forest);
    expect(plan.scrollPixels).toBe(BASE_INPUT.elapsed * GROUND_TILE_SPRITES.scrollSpeed);
  });

  it("scrolls from moon forest into shrine stone during the boss prelude", () => {
    const start = resolveGroundTileRenderPlan({ ...BASE_INPUT, bossPreludeElapsed: 0 });
    const end = resolveGroundTileRenderPlan({
      ...BASE_INPUT,
      bossPreludeElapsed: bossPreludeWaitSeconds(BASE_INPUT.act),
    });

    expect(start.patternKey).toBe("forestToShrine");
    expect(start.scrollPixels).toBe(0);
    expect(end.patternKey).toBe("forestToShrine");
    expect(end.scrollPixels).toBe(
      GROUND_TILE_SPRITES.bossApproachTransitionTiles * GROUND_TILE_SPRITES.tileSize,
    );
  });

  it("keeps shrine stone under the active boss", () => {
    const plan = resolveGroundTileRenderPlan({ ...BASE_INPUT, bossActive: true });

    expect(plan.patternKey).toBe("shrine");
    expect(plan.pattern).toBe(GROUND_TILE_SPRITES.patterns.shrine);
  });

  it("scrolls back from shrine stone to moon forest after a boss defeat", () => {
    const start = resolveGroundTileRenderPlan({
      ...BASE_INPUT,
      bossKills: 1,
      elapsedInAct: 0,
    });
    const end = resolveGroundTileRenderPlan({
      ...BASE_INPUT,
      bossKills: 1,
      elapsedInAct: GROUND_TILE_SPRITES.bossExitTransitionSeconds,
    });

    expect(start.patternKey).toBe("shrineToForest");
    expect(start.scrollPixels).toBe(0);
    expect(end.patternKey).toBe("forest");
  });

  it("pins transition frames in left-to-right asset order", () => {
    expect(transitionFrames("forestToShrine")).toEqual(TRANSITION_FRAME_ORDER);
    expect(transitionFrames("shrineToForest")).toEqual(TRANSITION_FRAME_ORDER);
  });
});
