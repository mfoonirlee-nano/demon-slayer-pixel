import { afterEach, describe, expect, it, vi } from "vitest";
import { FALLING_LEAF_SHEETS, GROUND_Y } from "../constants";
import { setCanvas } from "./context";
import { drawFallingLeaves, resolveFallingLeafRenderPlan } from "./fallingLeaves";
import { resolveTreeLeafSources } from "./nearForeground";

const SAMPLE_SEED = 48_271;
const OTHER_SEED = 91_337;
const CALM_LEAF_COUNT_MIN = 8;
const CALM_LEAF_COUNT_MAX = 12;
const GUST_LEAF_COUNT_MIN = 18;
const GUST_LEAF_COUNT_MAX = 24;
const FAR_CALM_LEAF_COUNT = 6;
const FAR_GUST_LEAF_COUNT = 7;
const FIRST_GUST_DEADLINE_SECONDS = 3;
const SAMPLE_STEP_SECONDS = 0.05;
const GUST_RELEASE_SAMPLE_FPS = 240;
const GUST_RELEASE_SAMPLE_STEP_SECONDS = 1 / GUST_RELEASE_SAMPLE_FPS;
const GUST_RELEASE_POSITION_EPSILON = 1;
const EARLY_POSITION_SAMPLE_SECONDS = 0.25;
const OPENING_GUST_SAMPLE_SECONDS = 2.5;
const LATE_POSITION_SAMPLE_SECONDS = 10;
const LONG_RUN_POSITION_SAMPLE_SECONDS = 90;
const POSITION_SAMPLE_TIMES = [
  0,
  EARLY_POSITION_SAMPLE_SECONDS,
  OPENING_GUST_SAMPLE_SECONDS,
  LATE_POSITION_SAMPLE_SECONDS,
  LONG_RUN_POSITION_SAMPLE_SECONDS,
];
const MOTION_SAMPLE_SECONDS = 0.2;
const FRAME_HOLD_SAMPLE_SECONDS = 0.05;
const FRAME_ADVANCE_SAMPLE_SECONDS = 0.1;
const FRAME_WRAP_SAMPLE_SECONDS = 2;
const OPENING_LEAF_KIND_MIN = 3;
const MAX_LEAF_LIFT_ABOVE_ORIGIN = 16;

afterEach(() => {
  setCanvas(null);
  for (const sheet of Object.values(FALLING_LEAF_SHEETS)) sheet.image = null;
});

function totalLeafCount(elapsed: number) {
  return resolveFallingLeafRenderPlan({ elapsed, seed: SAMPLE_SEED, layer: "far" }).length
    + resolveFallingLeafRenderPlan({ elapsed, seed: SAMPLE_SEED, layer: "near" }).length;
}

describe("falling leaf render plan", () => {
  it("repeats the same run pattern while different runs get a different arrangement", () => {
    const options = { elapsed: 2.4, seed: SAMPLE_SEED, layer: "near" } as const;
    const first = resolveFallingLeafRenderPlan(options);

    expect(resolveFallingLeafRenderPlan(options)).toEqual(first);
    expect(resolveFallingLeafRenderPlan({ ...options, seed: OTHER_SEED })).not.toEqual(first);
  });

  it("breathes from sparse calm leaves into a readable gust within the opening seconds", () => {
    const sampleCount = FIRST_GUST_DEADLINE_SECONDS / SAMPLE_STEP_SECONDS;
    const counts = Array.from(
      { length: sampleCount + 1 },
      (_, index) => totalLeafCount(index * SAMPLE_STEP_SECONDS),
    );

    expect(Math.min(...counts)).toBeGreaterThanOrEqual(CALM_LEAF_COUNT_MIN);
    expect(Math.min(...counts)).toBeLessThanOrEqual(CALM_LEAF_COUNT_MAX);
    expect(Math.max(...counts)).toBeGreaterThanOrEqual(GUST_LEAF_COUNT_MIN);
    expect(Math.max(...counts)).toBeLessThanOrEqual(GUST_LEAF_COUNT_MAX);
  });

  it("releases gust leaves from the current gust instead of fading old leaves into midair", () => {
    const sampleCount = FIRST_GUST_DEADLINE_SECONDS / GUST_RELEASE_SAMPLE_STEP_SECONDS;
    const samples = Array.from({ length: sampleCount + 1 }, (_, index) => {
      const elapsed = index * GUST_RELEASE_SAMPLE_STEP_SECONDS;
      return {
        elapsed,
        plan: resolveFallingLeafRenderPlan({ elapsed, seed: SAMPLE_SEED, layer: "far" }),
      };
    });
    const firstVisibleGust = samples.find(({ plan }) => plan.length > FAR_CALM_LEAF_COUNT);
    const fullestGust = samples.reduce((fullest, sample) => (
      sample.plan.length > fullest.plan.length ? sample : fullest
    ));

    expect(firstVisibleGust).toBeDefined();
    expect(fullestGust.plan).toHaveLength(FAR_CALM_LEAF_COUNT + FAR_GUST_LEAF_COUNT);
    if (!firstVisibleGust) throw new Error("expected a visible opening gust");

    const gustLeaves = fullestGust.plan.slice(FAR_CALM_LEAF_COUNT);
    expect(new Set(gustLeaves.map((leaf) => leaf.releasedAt)).size).toBeGreaterThan(1);
    for (const leaf of gustLeaves) {
      const firstAppearance = samples.find(({ plan }) => plan.some((candidate) => (
        candidate.releasedAt === leaf.releasedAt && candidate.sourceId === leaf.sourceId
      )));

      expect(firstAppearance).toBeDefined();
      if (!firstAppearance) throw new Error("expected every gust leaf to appear after release");

      const firstFrameLeaf = firstAppearance.plan.find((candidate) => (
        candidate.releasedAt === leaf.releasedAt && candidate.sourceId === leaf.sourceId
      ));
      if (!firstFrameLeaf) throw new Error("expected the newly released gust leaf");
      expect(firstAppearance.elapsed - leaf.releasedAt).toBeLessThanOrEqual(
        GUST_RELEASE_SAMPLE_STEP_SECONDS,
      );
      expect(Math.abs(firstFrameLeaf.x - firstFrameLeaf.originX)).toBeLessThanOrEqual(
        GUST_RELEASE_POSITION_EPSILON,
      );
      expect(Math.abs(firstFrameLeaf.y - firstFrameLeaf.originY)).toBeLessThanOrEqual(
        GUST_RELEASE_POSITION_EPSILON,
      );
    }
  });

  it("shows multiple tree-matched silhouettes in the opening near layer", () => {
    const plan = resolveFallingLeafRenderPlan({ elapsed: 0, seed: SAMPLE_SEED, layer: "near" });

    expect(new Set(plan.map((leaf) => leaf.kind)).size).toBeGreaterThanOrEqual(
      OPENING_LEAF_KIND_MIN,
    );
  });

  it("releases every leaf from a matching tree canopy and keeps it above ground", () => {
    for (const elapsed of POSITION_SAMPLE_TIMES) {
      for (const layer of ["far", "near"] as const) {
        const plan = resolveFallingLeafRenderPlan({ elapsed, seed: SAMPLE_SEED, layer });

        for (const leaf of plan) {
          const source = resolveTreeLeafSources({ elapsed: leaf.releasedAt, layer })
            .find((candidate) => candidate.id === leaf.sourceId);

          expect(source).toBeDefined();
          if (!source) throw new Error("expected every falling leaf to retain its tree source");

          expect(leaf.kind).toBe(source.kind);
          expect(leaf.originX).toBe(source.x);
          expect(leaf.originY).toBe(source.y);
          expect(Number.isInteger(leaf.x)).toBe(true);
          expect(Number.isInteger(leaf.y)).toBe(true);
          expect(leaf.y).toBeGreaterThanOrEqual(leaf.originY - MAX_LEAF_LIFT_ABOVE_ORIGIN);
          expect(leaf.y).toBeLessThan(GROUND_Y);
          expect(leaf.alpha).toBeGreaterThan(0);
          expect(leaf.alpha).toBeLessThanOrEqual(1);
          expect(Number.isInteger(leaf.frame)).toBe(true);
          expect(leaf.frame).toBeGreaterThanOrEqual(0);
          expect(leaf.frame).toBeLessThan(FALLING_LEAF_SHEETS[leaf.kind].count);
        }
      }
    }
  });

  it("moves most calm leaves downward and sideways as time advances", () => {
    const before = resolveFallingLeafRenderPlan({
      elapsed: 0,
      seed: SAMPLE_SEED,
      layer: "far",
    });
    const after = resolveFallingLeafRenderPlan({
      elapsed: MOTION_SAMPLE_SECONDS,
      seed: SAMPLE_SEED,
      layer: "far",
    });
    const downwardCount = after.filter((leaf, index) => leaf.y > before[index].y).length;
    const sidewaysCount = after.filter((leaf, index) => leaf.x !== before[index].x).length;

    expect(downwardCount).toBeGreaterThan(before.length / 2);
    expect(sidewaysCount).toBeGreaterThan(before.length / 2);
  });

  it("advances the tumble sequence and wraps within the registered frames", () => {
    const firstFarFrameAt = (elapsed: number) => resolveFallingLeafRenderPlan({
      elapsed,
      seed: SAMPLE_SEED,
      layer: "far",
    })[0].frame;

    const frames = [
      firstFarFrameAt(0),
      firstFarFrameAt(FRAME_HOLD_SAMPLE_SECONDS),
      firstFarFrameAt(FRAME_ADVANCE_SAMPLE_SECONDS),
      firstFarFrameAt(FRAME_WRAP_SAMPLE_SECONDS),
    ];

    expect(new Set(frames).size).toBeGreaterThan(1);
    expect(frames.every((frame) => (
      frame >= 0 && frame < FALLING_LEAF_SHEETS.pine.count
    ))).toBe(true);
  });
});

it.each([
  { layer: "far" as const, drawSize: 12 },
  { layer: "near" as const, drawSize: 24 },
])("draws complete sprite-sheet frames for the $layer layer", ({ layer, drawSize }) => {
  const leafImages = Object.fromEntries(Object.keys(FALLING_LEAF_SHEETS).map((kind) => (
    [kind, {} as HTMLImageElement]
  )));
  const context = {
    drawImage: vi.fn(),
    globalAlpha: 1,
    restore: vi.fn(),
    save: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  const options = { elapsed: 0, seed: SAMPLE_SEED, layer };
  const plan = resolveFallingLeafRenderPlan(options);
  setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
  for (const [kind, sheet] of Object.entries(FALLING_LEAF_SHEETS)) {
    sheet.image = leafImages[kind];
  }

  drawFallingLeaves(options);

  expect(context.save).toHaveBeenCalledOnce();
  expect(context.restore).toHaveBeenCalledOnce();
  expect(context.drawImage).toHaveBeenCalledTimes(plan.length);
  for (const [index, leaf] of plan.entries()) {
    expect(vi.mocked(context.drawImage).mock.calls[index]).toEqual([
      leafImages[leaf.kind],
      leaf.frame * FALLING_LEAF_SHEETS[leaf.kind].frameW,
      0,
      FALLING_LEAF_SHEETS[leaf.kind].frameW,
      FALLING_LEAF_SHEETS[leaf.kind].frameH,
      leaf.x - drawSize / 2,
      leaf.y - drawSize / 2,
      drawSize,
      drawSize,
    ]);
  }
});

it("skips an unloaded leaf family without suppressing already loaded families", () => {
  const context = {
    drawImage: vi.fn(),
    globalAlpha: 1,
    restore: vi.fn(),
    save: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  const options = { elapsed: 0, seed: SAMPLE_SEED, layer: "near" as const };
  const plan = resolveFallingLeafRenderPlan(options);
  setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
  for (const sheet of Object.values(FALLING_LEAF_SHEETS)) {
    sheet.image = {} as HTMLImageElement;
  }
  FALLING_LEAF_SHEETS.willow.image = null;

  drawFallingLeaves(options);

  expect(context.drawImage).toHaveBeenCalledTimes(
    plan.filter((leaf) => leaf.kind !== "willow").length,
  );
});
