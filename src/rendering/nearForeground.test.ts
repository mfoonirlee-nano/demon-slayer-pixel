import { afterEach, describe, expect, it } from "vitest";

import {
  ACT_OCCLUDER_SPRITES,
  GROUND_Y,
  NEAR_FOREGROUND_SCROLL_SPEED,
  TALL_TREE_SPRITES,
  TORII_SPRITES,
  TREE_SPRITES,
  WIDTH,
} from "../constants";
import { bossApproachGroundTransitionSeconds } from "../systems/runProgression";
import { setCanvas } from "./context";
import {
  BOSS_PRELUDE_TORII_DRAW_H,
  drawNearForeground,
  resolveNearForegroundOccluders,
  resolveBossPreludeToriiPlacement,
  resolveTreeLeafSources,
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
const SOURCE_DENSITY_EPSILON = 1e-9;
const NEAR_FOREGROUND_PASS_COUNT = 3;
const TREE_PATTERN_SAMPLE_COUNT = 5;
const TREE_PATTERN_SAMPLE_STEP_SECONDS = 40;
const TREE_PATTERN_SAMPLE_TIMES = Array.from(
  { length: TREE_PATTERN_SAMPLE_COUNT },
  (_, index) => index * TREE_PATTERN_SAMPLE_STEP_SECONDS,
);
const TREE_PATTERN_WIDTH = 2688;
const TREE_PATTERN_LOOP_SECONDS = TREE_PATTERN_WIDTH / NEAR_FOREGROUND_SCROLL_SPEED;
const TREE_WRAP_SAMPLE_EPSILON = 0.01;
const originalTreeImages = TREE_SPRITES.sheets.map((sheet) => sheet.image);
const originalTallTreeImages = TALL_TREE_SPRITES.sheets.map((sheet) => sheet.image);

afterEach(() => {
  TREE_SPRITES.sheets.forEach((sheet, index) => {
    sheet.image = originalTreeImages[index];
  });
  TALL_TREE_SPRITES.sheets.forEach((sheet, index) => {
    sheet.image = originalTallTreeImages[index];
  });
  setCanvas(null);
});

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

  it("preserves the catalogued source-density reserve for tree sprites", () => {
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

      expect(occluder.drawH * TREE_SPRITES.sourceScale).toBeLessThanOrEqual(
        region.sh + SOURCE_DENSITY_EPSILON,
      );
      expect(occluder.drawW * TREE_SPRITES.sourceScale).toBeLessThanOrEqual(
        region.sw + SOURCE_DENSITY_EPSILON,
      );
    }
  });

  it("draws tall trees behind the regular tree line without adding spawn occluders", () => {
    const regularTreeImage = {} as HTMLImageElement;
    const tallTreeImage = {} as HTMLImageElement;
    const drawnImages: CanvasImageSource[] = [];
    const context = {
      drawImage: (image: CanvasImageSource) => drawnImages.push(image),
      globalAlpha: 1,
      imageSmoothingEnabled: true,
      restore: () => undefined,
      save: () => undefined,
      setTransform: () => undefined,
    } as unknown as CanvasRenderingContext2D;
    const canvas = {
      getContext: () => context,
    } as unknown as HTMLCanvasElement;

    TREE_SPRITES.sheets[0].image = regularTreeImage;
    TALL_TREE_SPRITES.sheets[0].image = tallTreeImage;
    setCanvas(canvas);
    drawNearForeground();

    const firstRegularTree = drawnImages.indexOf(regularTreeImage);
    const lastTallTree = drawnImages.lastIndexOf(tallTreeImage);
    const treeOccluders = resolveNearForegroundOccluders({
      elapsed: START_ELAPSED,
      bossPreludeElapsed: null,
      act: ACT_ONE,
    }).filter((occluder) => occluder.source === "tree");
    const regularTreeVariantCount = TREE_SPRITES.sheets.reduce(
      (count, sheet) => count + sheet.variants.length,
      0,
    );

    expect(lastTallTree).toBeGreaterThanOrEqual(0);
    expect(firstRegularTree).toBeGreaterThan(lastTallTree);
    expect(treeOccluders).toHaveLength(regularTreeVariantCount * NEAR_FOREGROUND_PASS_COUNT);
  });

  it("exposes only real tree canopies as layer-matched falling-leaf sources", () => {
    const farSources = resolveTreeLeafSources({ elapsed: START_ELAPSED, layer: "far" });
    const nearSources = resolveTreeLeafSources({ elapsed: START_ELAPSED, layer: "near" });

    expect(farSources.length).toBeGreaterThan(0);
    expect(nearSources.length).toBeGreaterThan(0);
    expect(farSources.every((source) => source.treeLayer === "tall")).toBe(true);
    expect(nearSources.every((source) => source.treeLayer === "regular")).toBe(true);

    for (const source of [...farSources, ...nearSources]) {
      expect(Number.isFinite(source.x)).toBe(true);
      expect(Number.isFinite(source.y)).toBe(true);
      expect(source.y).toBeLessThan(GROUND_Y);
    }
  });

  it("rotates every foliage family through the visible regular tree line", () => {
    const kinds = new Set(TREE_PATTERN_SAMPLE_TIMES.flatMap((elapsed) => (
      resolveTreeLeafSources({ elapsed, layer: "near" }).map((source) => source.kind)
    )));

    expect(kinds).toEqual(new Set(["pine", "willow", "broadleaf", "bamboo"]));
  });

  it("keeps tree-source identity continuous when the scenery pattern wraps", () => {
    const before = resolveTreeLeafSources({
      elapsed: TREE_PATTERN_LOOP_SECONDS - TREE_WRAP_SAMPLE_EPSILON,
      layer: "near",
    });
    const after = resolveTreeLeafSources({
      elapsed: TREE_PATTERN_LOOP_SECONDS + TREE_WRAP_SAMPLE_EPSILON,
      layer: "near",
    });
    const beforeById = new Map(before.map((source) => [source.id, source]));
    const sharedSources = after.filter((source) => beforeById.has(source.id));

    expect(sharedSources.length).toBeGreaterThan(0);
    for (const source of sharedSources) {
      const previous = beforeById.get(source.id);
      if (!previous) throw new Error("expected a matching source before the pattern wrap");
      expect(source.x - previous.x).toBeCloseTo(
        -TREE_WRAP_SAMPLE_EPSILON * 2 * NEAR_FOREGROUND_SCROLL_SPEED,
      );
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
