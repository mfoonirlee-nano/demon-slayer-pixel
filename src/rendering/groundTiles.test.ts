import { describe, expect, it } from "vitest";

import { GROUND_TILE_SPRITES, WIDTH } from "../constants";
import { bossApproachGroundTransitionSeconds } from "../systems/runProgression";
import { resolveGroundTileRenderPlan, type GroundTileRenderInput } from "./groundTiles";

const BASE_INPUT: GroundTileRenderInput = {
  elapsed: 20,
  bossActive: false,
  bossKills: 0,
  bossPreludeElapsed: null,
  bossActiveElapsed: null,
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
const VISIBLE_TILE_COUNT = Math.ceil(WIDTH / GROUND_TILE_SPRITES.tileSize) + 1;
const ONE_SECOND = 1;

function transitionFrames(patternKey: "forestToShrine" | "shrineToForest") {
  return GROUND_TILE_SPRITES.patterns[patternKey]
    .filter((entry) => entry.set === patternKey)
    .map((entry) => entry.regionIndex);
}

function visibleSets(patternKey: "forestToShrine" | "shrineToForest", scrollTiles: number) {
  const pattern = GROUND_TILE_SPRITES.patterns[patternKey];
  return Array.from({ length: VISIBLE_TILE_COUNT }, (_, index) => (
    pattern[(scrollTiles + index) % pattern.length]?.set
  ));
}

function regionCountForLayer(patternKey: "forest" | "shrine", layer: "base" | "occlusion") {
  const tileSet = GROUND_TILE_SPRITES.sets[patternKey];
  if (layer === "occlusion") return (tileSet.occlusionRegions ?? tileSet.regions).length;
  return tileSet.regions.length;
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
      bossPreludeElapsed: bossApproachGroundTransitionSeconds(BASE_INPUT.act),
    });

    expect(start.patternKey).toBe("forestToShrine");
    expect(start.scrollPixels).toBe(0);
    expect(end.patternKey).toBe("forestToShrine");
    expect(end.scrollPixels).toBe(
      GROUND_TILE_SPRITES.bossApproachTransitionTiles * GROUND_TILE_SPRITES.tileSize,
    );
  });

  it("keeps the approach transition at the normal ground scroll speed", () => {
    const start = resolveGroundTileRenderPlan({ ...BASE_INPUT, bossPreludeElapsed: 0 });
    const oneSecond = resolveGroundTileRenderPlan({ ...BASE_INPUT, bossPreludeElapsed: ONE_SECOND });

    expect(oneSecond.scrollPixels - start.scrollPixels).toBe(GROUND_TILE_SPRITES.scrollSpeed);
  });

  it("keeps shrine stone under the active boss", () => {
    const plan = resolveGroundTileRenderPlan({
      ...BASE_INPUT,
      bossActive: true,
      bossActiveElapsed: 0,
    });

    expect(plan.patternKey).toBe("shrine");
    expect(plan.pattern).toBe(GROUND_TILE_SPRITES.patterns.shrine);
  });

  it("anchors active boss stone to the completed approach transition", () => {
    const transitionEnd = resolveGroundTileRenderPlan({
      ...BASE_INPUT,
      bossPreludeElapsed: bossApproachGroundTransitionSeconds(BASE_INPUT.act),
    });
    const bossStart = resolveGroundTileRenderPlan({
      ...BASE_INPUT,
      bossActive: true,
      bossActiveElapsed: 0,
    });

    expect(bossStart.scrollPixels).toBe(transitionEnd.scrollPixels);
  });

  it("keeps active boss stone at the normal ground scroll speed", () => {
    const start = resolveGroundTileRenderPlan({
      ...BASE_INPUT,
      bossActive: true,
      bossActiveElapsed: 0,
    });
    const oneSecond = resolveGroundTileRenderPlan({
      ...BASE_INPUT,
      bossActive: true,
      bossActiveElapsed: ONE_SECOND,
    });

    expect(oneSecond.scrollPixels - start.scrollPixels).toBe(GROUND_TILE_SPRITES.scrollSpeed);
  });

  it("keeps the visible approach transition forest at the start and stone at the end", () => {
    expect(visibleSets("forestToShrine", 0).every((set) => set === "forest")).toBe(true);
    expect(
      visibleSets(
        "forestToShrine",
        GROUND_TILE_SPRITES.bossApproachTransitionTiles,
      ).every((set) => set === "shrine"),
    ).toBe(true);
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

  it("keeps the post-boss exit transition at the normal ground scroll speed", () => {
    const start = resolveGroundTileRenderPlan({
      ...BASE_INPUT,
      bossKills: 1,
      elapsedInAct: 0,
    });
    const oneSecond = resolveGroundTileRenderPlan({
      ...BASE_INPUT,
      bossKills: 1,
      elapsedInAct: ONE_SECOND,
    });

    expect(oneSecond.scrollPixels - start.scrollPixels).toBe(GROUND_TILE_SPRITES.scrollSpeed);
  });

  it("pins transition frames in left-to-right asset order", () => {
    expect(transitionFrames("forestToShrine")).toEqual(TRANSITION_FRAME_ORDER);
    expect(transitionFrames("shrineToForest")).toEqual(TRANSITION_FRAME_ORDER);
  });

  it("keeps looping ground patterns aligned with each drawn layer", () => {
    for (const patternKey of ["forest", "shrine"] as const) {
      const patternLength = GROUND_TILE_SPRITES.patterns[patternKey].length;

      expect(patternLength % regionCountForLayer(patternKey, "base")).toBe(0);
      expect(patternLength % regionCountForLayer(patternKey, "occlusion")).toBe(0);
    }
  });
});
