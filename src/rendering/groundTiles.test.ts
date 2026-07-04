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
const ODD_GROUND_PHASE_ELAPSED = 23.375;
const BOSS_ACTIVE_PHASE_ELAPSED = 7.375;
const GROUND_LAYERS = ["base", "occlusion"] as const;
type GroundLayer = typeof GROUND_LAYERS[number];

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

function visibleGroundSignature(input: GroundTileRenderInput, layer: GroundLayer) {
  const plan = resolveGroundTileRenderPlan(input);
  const tileSize = GROUND_TILE_SPRITES.tileSize;
  const patternLength = plan.pattern.length;
  const patternPixelWidth = patternLength * tileSize;
  const scroll = Math.floor(plan.scrollPixels);
  const offset = ((scroll % patternPixelWidth) + patternPixelWidth) % patternPixelWidth;
  const startCol = Math.floor(offset / tileSize);
  const tileOffset = offset % tileSize;
  const variantOffset = (
    "variantOffset" in plan && typeof plan.variantOffset === "number"
      ? plan.variantOffset
      : 0
  );

  return {
    tileOffset,
    tiles: Array.from({ length: VISIBLE_TILE_COUNT }, (_, index) => {
      const col = startCol + index;
      const patternEntry = plan.pattern[col % patternLength];
      const tileSet = GROUND_TILE_SPRITES.sets[patternEntry.set];
      const regions = layer === "occlusion"
        ? tileSet.occlusionRegions ?? tileSet.regions
        : tileSet.regions;
      const variantIndex = col + variantOffset;
      const regionIndex = patternEntry.regionIndex ?? variantIndex % regions.length;
      return `${patternEntry.set}:${regionIndex}`;
    }),
  };
}

function expectVisibleGroundPhaseToMatch(
  actualInput: GroundTileRenderInput,
  expectedInput: GroundTileRenderInput,
) {
  for (const layer of GROUND_LAYERS) {
    expect(visibleGroundSignature(actualInput, layer)).toEqual(
      visibleGroundSignature(expectedInput, layer),
    );
  }
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
      elapsed: BASE_INPUT.elapsed + bossApproachGroundTransitionSeconds(BASE_INPUT.act),
      bossPreludeElapsed: bossApproachGroundTransitionSeconds(BASE_INPUT.act),
    });

    expect(start.patternKey).toBe("forestToShrine");
    expect(end.patternKey).toBe("forestToShrine");
    expect(end.scrollPixels - start.scrollPixels).toBe(
      GROUND_TILE_SPRITES.bossApproachTransitionTiles * GROUND_TILE_SPRITES.tileSize,
    );
  });

  it("keeps the approach transition at the normal ground scroll speed", () => {
    const start = resolveGroundTileRenderPlan({ ...BASE_INPUT, bossPreludeElapsed: 0 });
    const oneSecond = resolveGroundTileRenderPlan({
      ...BASE_INPUT,
      elapsed: BASE_INPUT.elapsed + ONE_SECOND,
      bossPreludeElapsed: ONE_SECOND,
    });

    expect(oneSecond.scrollPixels - start.scrollPixels).toBe(GROUND_TILE_SPRITES.scrollSpeed);
  });

  it("keeps the visible forest phase when the boss prelude begins", () => {
    const beforePrelude = {
      ...BASE_INPUT,
      elapsed: ODD_GROUND_PHASE_ELAPSED,
    };
    const preludeStart = {
      ...BASE_INPUT,
      elapsed: ODD_GROUND_PHASE_ELAPSED,
      bossPreludeElapsed: 0,
    };

    expectVisibleGroundPhaseToMatch(preludeStart, beforePrelude);
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
      elapsed: BASE_INPUT.elapsed + bossApproachGroundTransitionSeconds(BASE_INPUT.act),
      bossPreludeElapsed: bossApproachGroundTransitionSeconds(BASE_INPUT.act),
    });
    const bossStart = resolveGroundTileRenderPlan({
      ...BASE_INPUT,
      elapsed: BASE_INPUT.elapsed + bossApproachGroundTransitionSeconds(BASE_INPUT.act),
      bossActive: true,
      bossActiveElapsed: 0,
    });

    expect(bossStart.scrollPixels).toBe(transitionEnd.scrollPixels);
  });

  it("keeps the visible shrine phase when the boss becomes active", () => {
    const transitionSeconds = bossApproachGroundTransitionSeconds(BASE_INPUT.act);
    const elapsed = ODD_GROUND_PHASE_ELAPSED + transitionSeconds;
    const transitionEnd = {
      ...BASE_INPUT,
      elapsed,
      bossPreludeElapsed: transitionSeconds,
    };
    const bossStart = {
      ...BASE_INPUT,
      elapsed,
      bossActive: true,
      bossActiveElapsed: 0,
    };

    expectVisibleGroundPhaseToMatch(bossStart, transitionEnd);
  });

  it("keeps active boss stone at the normal ground scroll speed", () => {
    const start = resolveGroundTileRenderPlan({
      ...BASE_INPUT,
      bossActive: true,
      bossActiveElapsed: 0,
    });
    const oneSecond = resolveGroundTileRenderPlan({
      ...BASE_INPUT,
      elapsed: BASE_INPUT.elapsed + ONE_SECOND,
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
      elapsed: BASE_INPUT.elapsed + GROUND_TILE_SPRITES.bossExitTransitionSeconds,
      bossKills: 1,
      elapsedInAct: GROUND_TILE_SPRITES.bossExitTransitionSeconds,
    });

    expect(start.patternKey).toBe("shrineToForest");
    expect(end.patternKey).toBe("forest");
  });

  it("keeps the visible shrine phase when the post-boss exit begins", () => {
    const transitionSeconds = bossApproachGroundTransitionSeconds(BASE_INPUT.act);
    const bossSpawnedAt = ODD_GROUND_PHASE_ELAPSED + transitionSeconds;
    const elapsed = bossSpawnedAt + BOSS_ACTIVE_PHASE_ELAPSED;
    const activeBoss = {
      ...BASE_INPUT,
      elapsed,
      bossActive: true,
      bossActiveElapsed: BOSS_ACTIVE_PHASE_ELAPSED,
    };
    const exitStart = {
      ...BASE_INPUT,
      elapsed,
      bossKills: 1,
      elapsedInAct: 0,
    };

    expectVisibleGroundPhaseToMatch(exitStart, activeBoss);
  });

  it("keeps the post-boss exit transition at the normal ground scroll speed", () => {
    const start = resolveGroundTileRenderPlan({
      ...BASE_INPUT,
      bossKills: 1,
      elapsedInAct: 0,
    });
    const oneSecond = resolveGroundTileRenderPlan({
      ...BASE_INPUT,
      elapsed: BASE_INPUT.elapsed + ONE_SECOND,
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
