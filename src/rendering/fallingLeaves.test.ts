import { afterEach, describe, expect, it, vi } from "vitest";
import { FALLING_LEAF_SHEET, GROUND_Y, WIDTH } from "../constants";
import { setCanvas } from "./context";
import { drawFallingLeaves, resolveFallingLeafRenderPlan } from "./fallingLeaves";

const SAMPLE_SEED = 48_271;
const OTHER_SEED = 91_337;
const CALM_LEAF_COUNT_MIN = 8;
const CALM_LEAF_COUNT_MAX = 12;
const GUST_LEAF_COUNT_MIN = 18;
const GUST_LEAF_COUNT_MAX = 24;
const FIRST_GUST_DEADLINE_SECONDS = 3;
const SAMPLE_STEP_SECONDS = 0.05;
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
const LEAF_VIEWPORT_MARGIN = 16;
const MOTION_SAMPLE_SECONDS = 0.2;
const FRAME_HOLD_SAMPLE_SECONDS = 0.05;
const FRAME_ADVANCE_SAMPLE_SECONDS = 0.1;
const FRAME_WRAP_SAMPLE_SECONDS = 1;

afterEach(() => {
  setCanvas(null);
  FALLING_LEAF_SHEET.image = null;
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

  it("keeps every looping leaf pixel-aligned inside the scenery band", () => {
    for (const elapsed of POSITION_SAMPLE_TIMES) {
      for (const layer of ["far", "near"] as const) {
        const plan = resolveFallingLeafRenderPlan({ elapsed, seed: SAMPLE_SEED, layer });

        for (const leaf of plan) {
          expect(Number.isInteger(leaf.x)).toBe(true);
          expect(Number.isInteger(leaf.y)).toBe(true);
          expect(leaf.x).toBeGreaterThanOrEqual(-LEAF_VIEWPORT_MARGIN);
          expect(leaf.x).toBeLessThanOrEqual(WIDTH + LEAF_VIEWPORT_MARGIN);
          expect(leaf.y).toBeGreaterThanOrEqual(-LEAF_VIEWPORT_MARGIN);
          expect(leaf.y).toBeLessThan(GROUND_Y);
          expect(leaf.alpha).toBeGreaterThan(0);
          expect(leaf.alpha).toBeLessThanOrEqual(1);
          expect(Number.isInteger(leaf.frame)).toBe(true);
          expect(leaf.frame).toBeGreaterThanOrEqual(0);
          expect(leaf.frame).toBeLessThan(FALLING_LEAF_SHEET.count);
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

  it("advances the tumble sequence and wraps it back to the opening frames", () => {
    const firstFarFrameAt = (elapsed: number) => resolveFallingLeafRenderPlan({
      elapsed,
      seed: SAMPLE_SEED,
      layer: "far",
    })[0].frame;

    expect([
      firstFarFrameAt(0),
      firstFarFrameAt(FRAME_HOLD_SAMPLE_SECONDS),
      firstFarFrameAt(FRAME_ADVANCE_SAMPLE_SECONDS),
      firstFarFrameAt(FRAME_WRAP_SAMPLE_SECONDS),
    ]).toEqual([1, 1, 2, 0]);
  });
});

it.each([
  { layer: "far" as const, drawSize: 12 },
  { layer: "near" as const, drawSize: 24 },
])("draws complete sprite-sheet frames for the $layer layer", ({ layer, drawSize }) => {
  const leafImage = {} as HTMLImageElement;
  const context = {
    drawImage: vi.fn(),
    globalAlpha: 1,
    restore: vi.fn(),
    save: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  const options = { elapsed: 0, seed: SAMPLE_SEED, layer };
  const plan = resolveFallingLeafRenderPlan(options);
  setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
  FALLING_LEAF_SHEET.image = leafImage;

  drawFallingLeaves(options);

  expect(context.save).toHaveBeenCalledOnce();
  expect(context.restore).toHaveBeenCalledOnce();
  expect(context.drawImage).toHaveBeenCalledTimes(plan.length);
  for (const [index, leaf] of plan.entries()) {
    expect(vi.mocked(context.drawImage).mock.calls[index]).toEqual([
      leafImage,
      leaf.frame * FALLING_LEAF_SHEET.frameW,
      0,
      FALLING_LEAF_SHEET.frameW,
      FALLING_LEAF_SHEET.frameH,
      leaf.x - drawSize / 2,
      leaf.y - drawSize / 2,
      drawSize,
      drawSize,
    ]);
  }
});
