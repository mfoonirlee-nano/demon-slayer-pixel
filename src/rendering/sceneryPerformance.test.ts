import { afterEach, expect, it, vi } from "vitest";
import { NEAR_FOREGROUND_SCROLL_SPEED, TALL_TREE_SPRITES, TREE_SPRITES, WIDTH } from "../constants";
import { state } from "../game/state";
import { setCanvas } from "./context";
import { createFallingLeafRenderPlanner, drawFallingLeaves, resolveFallingLeafRenderPlan } from "./fallingLeaves";
import * as foreground from "./nearForeground";

const FPS = 60;
const RUN_SEED = 48271;
const OTHER_SEED = 91337;
const TREE_PATTERN_WIDTH = 2688;
const WRAP_TIME = TREE_PATTERN_WIDTH / NEAR_FOREGROUND_SCROLL_SPEED;
const LONG_RUN_TIME = 3600;
const REPLAY_FRAMES = 180;
const REPLAY_STARTS = [0, WRAP_TIME - 1, LONG_RUN_TIME, 0];
const originalImages = [...TREE_SPRITES.sheets, ...TALL_TREE_SPRITES.sheets]
  .map((sheet) => sheet.image);

afterEach(() => {
  [...TREE_SPRITES.sheets, ...TALL_TREE_SPRITES.sheets].forEach((sheet, index) => {
    sheet.image = originalImages[index];
  });
  setCanvas(null);
  vi.restoreAllMocks();
});

function installContext(drawImage = vi.fn()) {
  const context = { save() {}, restore() {}, drawImage };
  setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
  return drawImage;
}

it("submits only scenery intersecting the viewport, including partial edge trees", () => {
  const drawImage = installContext();
  for (const sheet of [...TREE_SPRITES.sheets, ...TALL_TREE_SPRITES.sheets]) {
    sheet.image = {} as HTMLImageElement;
  }
  foreground.drawNearForeground();
  const rects = drawImage.mock.calls.map((call) => ({ x: call[5], w: call[7] }));
  expect(rects.length).toBeGreaterThan(0);
  expect(rects.filter(({ x, w }) => x + w <= 0 || x >= WIDTH)).toHaveLength(0);
  const visibleTrees = foreground.resolveNearForegroundOccluders({
    elapsed: state.elapsed, act: state.enemyDirector.act, bossPreludeElapsed: null,
  }).filter((item) => item.source === "tree" && item.x < WIDTH && item.x + item.drawW > 0);
  for (const tree of visibleTrees) {
    expect(rects).toContainEqual({ x: tree.x, w: tree.drawW });
  }
});

it("resolves a leaf's release canopy once while advancing the same release", () => {
  installContext();
  const resolveSources = vi.spyOn(foreground, "resolveTreeLeafSources");
  drawFallingLeaves({ elapsed: 0, seed: RUN_SEED, layer: "near" });
  const releasedLeaves = resolveSources.mock.calls.length;
  expect(releasedLeaves).toBeGreaterThan(0);
  for (let frame = 1; frame < FPS; frame += 1) {
    drawFallingLeaves({ elapsed: frame / FPS, seed: RUN_SEED, layer: "near" });
  }
  expect(resolveSources.mock.calls.length).toBe(releasedLeaves);
});

it("matches uncached trajectories across gusts, scenery wraps, long runs and restarts", () => {
  const plan = createFallingLeafRenderPlanner();
  for (const seed of [RUN_SEED, OTHER_SEED, RUN_SEED]) {
    for (const start of REPLAY_STARTS) {
      for (let frame = 0; frame < REPLAY_FRAMES; frame += 1) {
        for (const layer of ["far", "near"] as const) {
          const options = { elapsed: start + frame / FPS, seed, layer };
          const cached = plan(options);
          expect(cached).toEqual(resolveFallingLeafRenderPlan(options));
          // A repeated timestamp represents a frozen world; keep the same pose.
          expect(plan(options)).toEqual(cached);
        }
      }
    }
  }
});
