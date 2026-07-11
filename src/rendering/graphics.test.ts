import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SpriteSheet } from "../types/assets";
import { setCanvas } from "./context";
import { drawSheetFrame } from "./graphics";

type TestContext = CanvasRenderingContext2D & {
  drawImage: ReturnType<typeof vi.fn>;
  filterSetter: ReturnType<typeof vi.fn>;
};

const SOURCE_FRAME_SIZE = 256;
const TEST_SHEET: SpriteSheet = {
  src: "test-sheet.png",
  image: {} as HTMLImageElement,
  frameW: SOURCE_FRAME_SIZE,
  frameH: SOURCE_FRAME_SIZE,
  count: 2,
};
const FIRST_DRAW_X = 10;
const SECOND_DRAW_X = 30;
const DRAW_Y = 20;
const COLOR_EFFECT_DRAW_SIZE = 96;
const SHADOW_EFFECT_DRAW_W = 100;
const SHADOW_EFFECT_DRAW_H = 120;
const COLOR_EFFECT_OFFSCREEN_DRAWS = 3;

function createContext(): TestContext {
  let filterValue = "none";
  const filterSetter = vi.fn((value: string) => {
    filterValue = value;
  });
  const context = {
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
  } as unknown as TestContext;
  Object.defineProperty(context, "filter", {
    get: () => filterValue,
    set: filterSetter,
  });
  context.filterSetter = filterSetter;
  return context;
}

describe("sprite frame effect rendering", () => {
  let mainContext: TestContext;
  let offscreenContexts: TestContext[];
  let offscreenCanvases: HTMLCanvasElement[];

  beforeEach(() => {
    mainContext = createContext();
    offscreenContexts = [];
    offscreenCanvases = [];
    setCanvas({ getContext: () => mainContext } as unknown as HTMLCanvasElement);
    vi.stubGlobal("document", {
      createElement: () => {
        const context = createContext();
        offscreenContexts.push(context);
        const canvas = {
          width: 0,
          height: 0,
          getContext: () => context,
        } as unknown as HTMLCanvasElement;
        offscreenCanvases.push(canvas);
        return canvas;
      },
    });
  });

  afterEach(() => {
    setCanvas(null);
    vi.unstubAllGlobals();
  });

  it("composites repeated color effects once and draws one cached frame per entity", () => {
    const effect = {
      filter: "brightness(0.94) saturate(1.12) contrast(1.08)",
      tint: { color: "rgb(142, 28, 92)", alpha: 0.28 },
    };

    drawSheetFrame(
      TEST_SHEET,
      0,
      FIRST_DRAW_X,
      DRAW_Y,
      COLOR_EFFECT_DRAW_SIZE,
      COLOR_EFFECT_DRAW_SIZE,
      1,
      effect,
    );
    drawSheetFrame(
      TEST_SHEET,
      0,
      SECOND_DRAW_X,
      DRAW_Y,
      COLOR_EFFECT_DRAW_SIZE,
      COLOR_EFFECT_DRAW_SIZE,
      -1,
      effect,
    );

    expect(mainContext.filterSetter).not.toHaveBeenCalled();
    expect(mainContext.drawImage).toHaveBeenCalledTimes(2);
    expect(offscreenContexts.flatMap((context) => context.drawImage.mock.calls))
      .toHaveLength(COLOR_EFFECT_OFFSCREEN_DRAWS);
    expect(offscreenCanvases).toHaveLength(2);
    expect(offscreenCanvases.every((canvas) => canvas.width === COLOR_EFFECT_DRAW_SIZE)).toBe(true);
  });

  it("caches destination-sized drop shadows instead of filtering the main canvas", () => {
    const effect = {
      filter: "brightness(0) saturate(100%) drop-shadow(0 0 7px rgba(52, 196, 255, 0.82))",
    };

    drawSheetFrame(
      TEST_SHEET,
      1,
      FIRST_DRAW_X,
      DRAW_Y,
      SHADOW_EFFECT_DRAW_W,
      SHADOW_EFFECT_DRAW_H,
      1,
      effect,
    );
    drawSheetFrame(
      TEST_SHEET,
      1,
      SECOND_DRAW_X,
      DRAW_Y,
      SHADOW_EFFECT_DRAW_W,
      SHADOW_EFFECT_DRAW_H,
      -1,
      effect,
    );

    expect(mainContext.filterSetter).not.toHaveBeenCalled();
    expect(mainContext.drawImage).toHaveBeenCalledTimes(2);
    expect(offscreenContexts).toHaveLength(1);
    expect(offscreenContexts[0].drawImage).toHaveBeenCalledTimes(1);
  });

  it("clears an inherited filter when drawing an already filtered cached frame", () => {
    const effect = { filter: "contrast(1.2)" };
    mainContext.filter = "sepia(1)";
    mainContext.filterSetter.mockClear();

    drawSheetFrame(
      TEST_SHEET,
      0,
      FIRST_DRAW_X,
      DRAW_Y,
      COLOR_EFFECT_DRAW_SIZE,
      COLOR_EFFECT_DRAW_SIZE,
      1,
      effect,
    );

    expect(mainContext.filterSetter).toHaveBeenCalledOnce();
    expect(mainContext.filterSetter).toHaveBeenCalledWith("none");
  });
});
