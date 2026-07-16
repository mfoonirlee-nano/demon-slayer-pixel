import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PLATFORM_SPRITES } from "../../constants";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import { drawPlatformOcclusion, drawPlatforms } from "./runtime";

type MockCanvasContext = CanvasRenderingContext2D & {
  drawImage: ReturnType<typeof vi.fn>;
};

const TEST_IMAGE = {} as HTMLImageElement;
const TEST_PLATFORM_X = 100;
const TEST_PLATFORM_Y = 200.25;
const EXPECTED_VISUAL_SURFACE_INSET = 6;
const ROW_THREE_COLUMN_THREE_INDEX = 14;
const ROW_FOUR_LAST_INDEX = 23;
const TARGET_SPRITE_INDICES = [
  ROW_THREE_COLUMN_THREE_INDEX,
  ROW_FOUR_LAST_INDEX,
] as const;

function createMockContext(): MockCanvasContext {
  return {
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    imageSmoothingEnabled: true,
  } as unknown as MockCanvasContext;
}

function setTestPlatform(spriteIndex: number) {
  const sprite = PLATFORM_SPRITES.regions[spriteIndex];
  state.platforms = [{
    x: TEST_PLATFORM_X,
    y: TEST_PLATFORM_Y,
    baseY: TEST_PLATFORM_Y,
    w: Math.round(sprite.sw * PLATFORM_SPRITES.drawScale),
    h: 12,
    vx: 0,
    phase: 0,
    style: "stone",
    kind: "normal",
    spriteIndex,
    spriteAct: null,
    trim: 0,
    notch: 0,
    hoverAmplitude: 0,
  }];
  return sprite;
}

describe("platform rendering", () => {
  beforeEach(() => {
    resetState();
    PLATFORM_SPRITES.image = TEST_IMAGE;
  });

  afterEach(() => {
    PLATFORM_SPRITES.image = null;
    setCanvas(null);
    vi.restoreAllMocks();
  });

  it.each(TARGET_SPRITE_INDICES)(
    "places sprite index %i against the player collision surface",
    (spriteIndex) => {
      const context = createMockContext();
      setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
      const sprite = setTestPlatform(spriteIndex);

      drawPlatforms();

      const drawY = context.drawImage.mock.calls[0][6] as number;
      const renderedSurfaceY = drawY + sprite.surfaceY * PLATFORM_SPRITES.drawScale;
      expect(renderedSurfaceY).toBeCloseTo(
        TEST_PLATFORM_Y - EXPECTED_VISUAL_SURFACE_INSET,
        0,
      );
    },
  );

  it("draws only the supporting platform in full in the occlusion pass", () => {
    const context = createMockContext();
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    const sprite = setTestPlatform(ROW_THREE_COLUMN_THREE_INDEX);
    const supportingPlatform = state.platforms[0];
    const otherSprite = PLATFORM_SPRITES.regions[ROW_FOUR_LAST_INDEX];
    state.platforms.push({
      ...supportingPlatform,
      x: TEST_PLATFORM_X + supportingPlatform.w,
      w: Math.round(otherSprite.sw * PLATFORM_SPRITES.drawScale),
      spriteIndex: ROW_FOUR_LAST_INDEX,
    });
    state.player.onPlatform = supportingPlatform;

    drawPlatformOcclusion();

    const fullDrawY = Math.round(
      TEST_PLATFORM_Y
        - EXPECTED_VISUAL_SURFACE_INSET
        - sprite.surfaceY * PLATFORM_SPRITES.drawScale,
    );
    expect(context.drawImage).toHaveBeenCalledTimes(1);
    expect(context.drawImage).toHaveBeenCalledWith(
      TEST_IMAGE,
      sprite.sx,
      sprite.sy,
      sprite.sw,
      sprite.sh,
      TEST_PLATFORM_X,
      fullDrawY,
      Math.round(sprite.sw * PLATFORM_SPRITES.drawScale),
      Math.round(sprite.sh * PLATFORM_SPRITES.drawScale),
    );
  });

  it("keeps the platform behind the player before the player lands on it", () => {
    const context = createMockContext();
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    setTestPlatform(ROW_THREE_COLUMN_THREE_INDEX);

    drawPlatformOcclusion();

    expect(context.drawImage).not.toHaveBeenCalled();
  });
});
