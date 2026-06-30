import { afterEach, describe, expect, it, vi } from "vitest";
import { COVER_MOON_PHASE_SPRITES } from "../constants";
import { setCanvas } from "../rendering/context";
import { drawMoon } from "./render";

const TEST_PHASE_INDEX = 3;
const TEST_PHASE_PROGRESS = (TEST_PHASE_INDEX + 0.5) / COVER_MOON_PHASE_SPRITES.frames;
const DRAW_IMAGE_SOURCE_ARG_COUNT = 5;

type MockCanvasContext = CanvasRenderingContext2D & {
  createRadialGradient: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
  clip: ReturnType<typeof vi.fn>;
  fillRect: ReturnType<typeof vi.fn>;
  shadowBlurValues: number[];
};

function createMockContext(): MockCanvasContext {
  const gradient = {
    addColorStop: vi.fn(),
  } as unknown as CanvasGradient;

  const context = {
    createRadialGradient: vi.fn(() => gradient),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    clip: vi.fn(),
    fillRect: vi.fn(),
    restore: vi.fn(),
    shadowBlurValues: [],
  } as unknown as MockCanvasContext;

  Object.defineProperty(context, "shadowBlur", {
    get: () => context.shadowBlurValues[context.shadowBlurValues.length - 1] ?? 0,
    set: (value: number) => {
      context.shadowBlurValues.push(value);
    },
  });

  return context;
}

function installMockContext(context: CanvasRenderingContext2D) {
  setCanvas({
    getContext: () => context,
  } as unknown as HTMLCanvasElement);
}

describe("drawMoon", () => {
  afterEach(() => {
    COVER_MOON_PHASE_SPRITES.image = null;
    setCanvas(null);
  });

  it("draws phase glow and the current moon phase without runtime blur", () => {
    const context = createMockContext();
    const moonSheet = {} as HTMLImageElement;
    COVER_MOON_PHASE_SPRITES.image = moonSheet;
    installMockContext(context);

    drawMoon({
      elapsed: 0,
      moon: {
        bloodLerp: 1,
        coverProgress: TEST_PHASE_PROGRESS,
      },
    });

    const expectedSourceArgs = [
      moonSheet,
      TEST_PHASE_INDEX * COVER_MOON_PHASE_SPRITES.frameW,
      0,
      COVER_MOON_PHASE_SPRITES.frameW,
      COVER_MOON_PHASE_SPRITES.frameH,
    ];
    const drawImageCalls = context.drawImage.mock.calls;

    expect(drawImageCalls.length).toBeGreaterThan(1);
    for (const call of drawImageCalls) {
      expect(call.slice(0, DRAW_IMAGE_SOURCE_ARG_COUNT)).toEqual(expectedSourceArgs);
    }
    expect(drawImageCalls[drawImageCalls.length - 1]).toEqual([
      ...expectedSourceArgs,
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    ]);
    expect(context.shadowBlurValues).toHaveLength(0);
    expect(context.createRadialGradient).not.toHaveBeenCalled();
    expect(context.clip).not.toHaveBeenCalled();
    expect(context.fillRect).not.toHaveBeenCalled();
  });
});
