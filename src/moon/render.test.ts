import { afterEach, describe, expect, it, vi } from "vitest";
import { COVER_MOON_PHASE_SPRITES } from "../constants";
import { setCanvas } from "../rendering/context";
import { drawMoon } from "./render";

const TEST_PHASE_INDEX = 3;
const TEST_PHASE_PROGRESS = (TEST_PHASE_INDEX + 0.5) / COVER_MOON_PHASE_SPRITES.frames;

type MockCanvasContext = CanvasRenderingContext2D & {
  drawImage: ReturnType<typeof vi.fn>;
  clip: ReturnType<typeof vi.fn>;
  fillRect: ReturnType<typeof vi.fn>;
};

function createMockContext(): MockCanvasContext {
  const gradient = {
    addColorStop: vi.fn(),
  } as unknown as CanvasGradient;

  return {
    createRadialGradient: vi.fn(() => gradient),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    clip: vi.fn(),
    fillRect: vi.fn(),
    restore: vi.fn(),
  } as unknown as MockCanvasContext;
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

  it("draws the current moon phase from the cover moon sprite sheet", () => {
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

    expect(context.drawImage).toHaveBeenCalledOnce();
    expect(context.drawImage).toHaveBeenCalledWith(
      moonSheet,
      TEST_PHASE_INDEX * COVER_MOON_PHASE_SPRITES.frameW,
      0,
      COVER_MOON_PHASE_SPRITES.frameW,
      COVER_MOON_PHASE_SPRITES.frameH,
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    );
    expect(context.clip).not.toHaveBeenCalled();
    expect(context.fillRect).not.toHaveBeenCalled();
  });
});
