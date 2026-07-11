import { afterEach, expect, it, vi } from "vitest";
import { CLOUD_SPRITES } from "../constants";
import { setCanvas } from "./context";

const TEST_BIG_CLOUD_IMAGE = { width: 500, height: 500 } as HTMLImageElement;
const TEST_SMALL_CLOUD_IMAGE = { width: 700, height: 300 } as HTMLImageElement;
const VISIBLE_CLOUD_COUNT = 8;
const CACHED_DRAW_PASSES = 3;
const CLOSE_COVER_PROGRESS = 0.0001;

afterEach(() => {
  CLOUD_SPRITES.big.image = null;
  CLOUD_SPRITES.small.image = null;
  setCanvas(null);
  vi.unstubAllGlobals();
});

it("reuses filtered cloud frames while the moon tint is unchanged", async () => {
  let widthWrites = 0;
  let heightWrites = 0;
  let filterWrites = 0;
  let offscreenAlpha = 1;
  let mainAlphaWrites = 0;
  const cloudDrawAlphas: number[] = [];
  const tintAlphas: number[] = [];
  const offscreenContext = {
    imageSmoothingEnabled: false,
    clearRect() {},
    drawImage() {
      cloudDrawAlphas.push(offscreenAlpha);
    },
    fillRect() {
      tintAlphas.push(offscreenAlpha);
    },
    restore() {},
    save() {},
  } as unknown as CanvasRenderingContext2D;
  Object.defineProperty(offscreenContext, "filter", {
    get: () => "none",
    set: () => {
      filterWrites += 1;
    },
  });
  Object.defineProperty(offscreenContext, "globalAlpha", {
    get: () => offscreenAlpha,
    set: (value: number) => {
      offscreenAlpha = value;
    },
  });
  vi.stubGlobal("document", {
    createElement: () => {
      let width = 0;
      let height = 0;
      const canvas = {
        getContext: () => offscreenContext,
      } as unknown as HTMLCanvasElement;
      Object.defineProperty(canvas, "width", {
        get: () => width,
        set: (value: number) => {
          width = value;
          widthWrites += 1;
        },
      });
      Object.defineProperty(canvas, "height", {
        get: () => height,
        set: (value: number) => {
          height = value;
          heightWrites += 1;
        },
      });
      return canvas;
    },
  });

  const mainContext = {
    drawImage: vi.fn(),
    restore() {},
    save() {},
  } as unknown as CanvasRenderingContext2D;
  Object.defineProperty(mainContext, "globalAlpha", {
    get: () => 1,
    set: () => {
      mainAlphaWrites += 1;
    },
  });
  setCanvas({ getContext: () => mainContext } as unknown as HTMLCanvasElement);
  CLOUD_SPRITES.big.image = TEST_BIG_CLOUD_IMAGE;
  CLOUD_SPRITES.small.image = TEST_SMALL_CLOUD_IMAGE;
  const { drawClouds } = await import("./clouds");
  const options = { elapsed: 10, moon: { bloodLerp: 0, coverProgress: 0 } };

  drawClouds(options);
  const firstDrawWork = { widthWrites, heightWrites, filterWrites };
  drawClouds(options);
  drawClouds({
    ...options,
    moon: { ...options.moon, coverProgress: CLOSE_COVER_PROGRESS },
  });

  expect({ widthWrites, heightWrites, filterWrites }).toEqual(firstDrawWork);
  expect(mainContext.drawImage).toHaveBeenCalledTimes(VISIBLE_CLOUD_COUNT * CACHED_DRAW_PASSES);
  expect(mainAlphaWrites).toBe(0);
  expect(cloudDrawAlphas).toEqual(tintAlphas);
  expect(cloudDrawAlphas.every((alpha) => alpha < 1)).toBe(true);
});
