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
const GUST_END_BEFORE_SECONDS = 2.466667;
const GUST_END_AFTER_SECONDS = 2.470833;
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
const CALM_DIRECTION_SAMPLE_SECONDS = 1;
const NATURAL_MOTION_SAMPLE_DURATION_SECONDS = 20;
const NATURAL_MOTION_SAMPLE_STEP_SECONDS = 0.1;
const DESCENT_PACE_WINDOW_SECONDS = 1;
const DESCENT_PACE_RANGE_MIN = 18;
const RELEASED_AT_TRACK_PRECISION = 6;
const TIME_CONTINUITY_EPSILON_SCALE = 4;
const LEAF_READABILITY_GROUND_CLEARANCE = 72;
const FAR_READABLE_ALPHA_MIN = 0.42;
const NEAR_READABLE_ALPHA_MIN = 0.62;
const NEAR_CALM_LEAF_COUNT = 4;
const FRAME_HOLD_SAMPLE_SECONDS = 0.05;
const FRAME_ADVANCE_SAMPLE_SECONDS = 0.1;
const FRAME_WRAP_SAMPLE_SECONDS = 2;
const OPENING_LEAF_KIND_MIN = 3;
const MAX_LEAF_LIFT_ABOVE_ORIGIN = 16;
const EXPECTED_TRAJECTORIES = new Set(["flutter", "glide", "spiral"]);

afterEach(() => {
  setCanvas(null);
  for (const sheet of Object.values(FALLING_LEAF_SHEETS)) sheet.image = null;
});

function totalLeafCount(elapsed: number) {
  return resolveFallingLeafRenderPlan({ elapsed, seed: SAMPLE_SEED, layer: "far" }).length
    + resolveFallingLeafRenderPlan({ elapsed, seed: SAMPLE_SEED, layer: "near" }).length;
}

function isContinuousInterval(current: number, previous: number, expected: number) {
  return Math.abs(current - previous - expected)
    < Number.EPSILON * Math.max(1, current) * TIME_CONTINUITY_EPSILON_SCALE;
}

describe("falling leaf render plan", () => {
  it("repeats the same run pattern while different runs get a different arrangement", () => {
    const options = { elapsed: 2.4, seed: SAMPLE_SEED, layer: "near" } as const;
    const first = resolveFallingLeafRenderPlan(options);

    expect(resolveFallingLeafRenderPlan(options)).toEqual(first);
    expect(resolveFallingLeafRenderPlan({ ...options, seed: OTHER_SEED })).not.toEqual(first);
  });

  it.each([
    { layer: "far" as const, calmCount: FAR_CALM_LEAF_COUNT },
    { layer: "near" as const, calmCount: NEAR_CALM_LEAF_COUNT },
  ])("keeps flutter, glide, and spiral trajectories mixed in the $layer layer", ({
    layer,
    calmCount,
  }) => {
    for (const elapsed of POSITION_SAMPLE_TIMES) {
      const plan = resolveFallingLeafRenderPlan({ elapsed, seed: SAMPLE_SEED, layer })
        .slice(0, calmCount);

      expect(new Set(plan.map((leaf) => leaf.trajectory))).toEqual(EXPECTED_TRAJECTORIES);
    }
  });

  it("drifts calm leaves in both directions before the first gust", () => {
    const before = (["far", "near"] as const).flatMap((layer) => (
      resolveFallingLeafRenderPlan({ elapsed: 0, seed: SAMPLE_SEED, layer })
    ));
    const after = new Map(((["far", "near"] as const).flatMap((layer) => (
      resolveFallingLeafRenderPlan({
        elapsed: CALM_DIRECTION_SAMPLE_SECONDS,
        seed: SAMPLE_SEED,
        layer,
      })
    ))).map((leaf) => [
      `${leaf.sourceId}:${leaf.releasedAt.toFixed(RELEASED_AT_TRACK_PRECISION)}`,
      leaf,
    ]));
    const deltas = before.flatMap((leaf) => {
      const current = after.get(
        `${leaf.sourceId}:${leaf.releasedAt.toFixed(RELEASED_AT_TRACK_PRECISION)}`,
      );
      return current ? [current.x - leaf.x] : [];
    });

    expect(deltas.some((delta) => delta > 0)).toBe(true);
    expect(deltas.some((delta) => delta < 0)).toBe(true);
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

  it.each([
    { layer: "far" as const, calmCount: FAR_CALM_LEAF_COUNT },
    { layer: "near" as const, calmCount: NEAR_CALM_LEAF_COUNT },
  ])("keeps released $layer gust leaves falling after the wind subsides", ({
    layer,
    calmCount,
  }) => {
    const before = resolveFallingLeafRenderPlan({
      elapsed: GUST_END_BEFORE_SECONDS,
      seed: SAMPLE_SEED,
      layer,
    }).slice(calmCount);
    const after = resolveFallingLeafRenderPlan({
      elapsed: GUST_END_AFTER_SECONDS,
      seed: SAMPLE_SEED,
      layer,
    });

    expect(before.length).toBeGreaterThan(0);
    for (const leaf of before) {
      expect(after.some((candidate) => (
        candidate.sourceId === leaf.sourceId && candidate.releasedAt === leaf.releasedAt
      ))).toBe(true);
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

  it.each([
    { layer: "far" as const, calmCount: FAR_CALM_LEAF_COUNT, alphaMin: FAR_READABLE_ALPHA_MIN },
    { layer: "near" as const, calmCount: NEAR_CALM_LEAF_COUNT, alphaMin: NEAR_READABLE_ALPHA_MIN },
  ])("keeps $layer calm leaves readable until their landing fade", ({
    layer,
    calmCount,
    alphaMin,
  }) => {
    const sampleCount = NATURAL_MOTION_SAMPLE_DURATION_SECONDS
      / NATURAL_MOTION_SAMPLE_STEP_SECONDS;
    const readableLeaves = Array.from({ length: sampleCount + 1 }, (_, index) => (
      resolveFallingLeafRenderPlan({
        elapsed: index * NATURAL_MOTION_SAMPLE_STEP_SECONDS,
        seed: SAMPLE_SEED,
        layer,
      }).slice(0, calmCount)
    )).flat().filter((leaf) => leaf.y <= GROUND_Y - LEAF_READABILITY_GROUND_CLEARANCE);

    expect(readableLeaves.length).toBeGreaterThan(0);
    expect(Math.min(...readableLeaves.map((leaf) => leaf.alpha))).toBeGreaterThanOrEqual(
      alphaMin,
    );
  });

  it("lets calm leaves drift both ways instead of sliding along one fixed track", () => {
    const sampleCount = NATURAL_MOTION_SAMPLE_DURATION_SECONDS
      / NATURAL_MOTION_SAMPLE_STEP_SECONDS;
    const tracks = new Map<string, Array<{ elapsed: number; x: number }>>();

    for (let index = 0; index <= sampleCount; index += 1) {
      const elapsed = index * NATURAL_MOTION_SAMPLE_STEP_SECONDS;
      const plan = resolveFallingLeafRenderPlan({
        elapsed,
        seed: SAMPLE_SEED,
        layer: "far",
      });
      if (plan.length !== FAR_CALM_LEAF_COUNT) continue;

      for (const leaf of plan) {
        const trackId = `${leaf.sourceId}:${leaf.releasedAt.toFixed(RELEASED_AT_TRACK_PRECISION)}`;
        const samples = tracks.get(trackId) ?? [];
        samples.push({ elapsed, x: leaf.x });
        tracks.set(trackId, samples);
      }
    }

    const hasNaturalTurn = [...tracks.values()].some((samples) => {
      const deltas = samples.slice(1).flatMap((sample, index) => {
        const previous = samples[index];
        return isContinuousInterval(
          sample.elapsed,
          previous.elapsed,
          NATURAL_MOTION_SAMPLE_STEP_SECONDS,
        ) ? [sample.x - previous.x] : [];
      });
      return deltas.some((delta) => delta >= 1) && deltas.some((delta) => delta <= -1);
    });

    expect(hasNaturalTurn).toBe(true);
  });

  it("varies each calm leaf's descent pace instead of lowering it at a fixed rate", () => {
    const sampleCount = NATURAL_MOTION_SAMPLE_DURATION_SECONDS
      / NATURAL_MOTION_SAMPLE_STEP_SECONDS;
    const windowSize = DESCENT_PACE_WINDOW_SECONDS / NATURAL_MOTION_SAMPLE_STEP_SECONDS;
    const tracks = new Map<string, Array<{ elapsed: number; y: number }>>();

    for (let index = 0; index <= sampleCount; index += 1) {
      const elapsed = index * NATURAL_MOTION_SAMPLE_STEP_SECONDS;
      const plan = resolveFallingLeafRenderPlan({
        elapsed,
        seed: SAMPLE_SEED,
        layer: "far",
      }).slice(0, FAR_CALM_LEAF_COUNT);

      for (const leaf of plan) {
        const trackId = `${leaf.sourceId}:${leaf.releasedAt.toFixed(RELEASED_AT_TRACK_PRECISION)}`;
        const samples = tracks.get(trackId) ?? [];
        samples.push({ elapsed, y: leaf.y });
        tracks.set(trackId, samples);
      }
    }

    const hasVariedPace = [...tracks.values()].some((samples) => {
      const drops = samples.slice(windowSize).flatMap((sample, index) => {
        const previous = samples[index];
        return isContinuousInterval(
          sample.elapsed,
          previous.elapsed,
          DESCENT_PACE_WINDOW_SECONDS,
        ) ? [sample.y - previous.y] : [];
      });

      return drops.length > 0 && Math.max(...drops) - Math.min(...drops) >= DESCENT_PACE_RANGE_MIN;
    });

    expect(hasVariedPace).toBe(true);
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
