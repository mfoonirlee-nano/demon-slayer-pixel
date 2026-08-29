import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACT_PLATFORM_SPRITES,
  PLAYER_ANIMATION_STATES,
  PLAYER_SHEETS,
  PLATFORM_SPRITES,
} from "../../constants";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import { resolvePlayerLanding } from "../players/jumping";
import { drawPlayer } from "../players/render";
import { drawPlatformOcclusion } from "./runtime";

type MockCanvasContext = CanvasRenderingContext2D & {
  drawImage: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
};

const TEST_PLATFORM_IMAGE = {} as HTMLImageElement;
const TEST_PLAYER_IMAGE = {} as HTMLImageElement;
const TEST_PLATFORM_X = 100;
const TEST_PLATFORM_Y = 200.25;
const EXPECTED_VISUAL_SURFACE_INSET = 6;
// Idle frame 0 has the highest opaque foot line, so it is the conservative no-gap case.
const IDLE_OPAQUE_BOTTOM_EXCLUSIVE_Y = 457;
const MAX_FOOT_SURFACE_OVERLAP = 2;
const TEST_ACT = 1;
const TEST_ACT_SPRITE_INDEX = 1;
const ROW_THREE_COLUMN_THREE_INDEX = 14;
const ROW_FOUR_LAST_INDEX = 23;
const MATERIAL_SURFACE_CASES = [
  { label: "common sprite 14", spriteAct: null, spriteIndex: ROW_THREE_COLUMN_THREE_INDEX },
  { label: "common sprite 23", spriteAct: null, spriteIndex: ROW_FOUR_LAST_INDEX },
  { label: "act-themed sprite", spriteAct: TEST_ACT, spriteIndex: TEST_ACT_SPRITE_INDEX },
] as const;

function createMockContext(): MockCanvasContext {
  return {
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    imageSmoothingEnabled: true,
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    filter: "none",
  } as unknown as MockCanvasContext;
}

function setTestPlatform(spriteIndex: number, spriteAct: number | null = null) {
  const sheet = spriteAct === null ? PLATFORM_SPRITES : ACT_PLATFORM_SPRITES[spriteAct];
  const sprite = sheet.regions[spriteIndex];
  state.platforms = [{
    x: TEST_PLATFORM_X,
    y: TEST_PLATFORM_Y,
    baseY: TEST_PLATFORM_Y,
    w: Math.round(sprite.sw * sheet.drawScale),
    h: 12,
    vx: 0,
    phase: 0,
    style: "stone",
    kind: "normal",
    spriteIndex,
    spriteAct,
    trim: 0,
    notch: 0,
    hoverAmplitude: 0,
  }];
  return { sheet, sprite };
}

describe("platform rendering", () => {
  beforeEach(() => {
    resetState();
    PLATFORM_SPRITES.image = TEST_PLATFORM_IMAGE;
    ACT_PLATFORM_SPRITES[TEST_ACT].image = TEST_PLATFORM_IMAGE;
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.idle].image = TEST_PLAYER_IMAGE;
  });

  afterEach(() => {
    PLATFORM_SPRITES.image = null;
    ACT_PLATFORM_SPRITES[TEST_ACT].image = null;
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.idle].image = null;
    setCanvas(null);
    vi.restoreAllMocks();
  });

  it.each(MATERIAL_SURFACE_CASES)(
    "rests the landed player's visible feet on the $label material surface",
    ({ spriteAct, spriteIndex }) => {
      const context = createMockContext();
      setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
      const { sheet, sprite } = setTestPlatform(spriteIndex, spriteAct);
      const platform = state.platforms[0];
      state.player.x = platform.x;
      state.player.y = platform.y - state.player.h + 1;
      state.player.vy = 2;

      resolvePlayerLanding(state, platform.y - 1);
      drawPlayer();
      const playerDrawCall = context.drawImage.mock.calls.find(
        ([image]) => image === TEST_PLAYER_IMAGE,
      );
      const playerTranslateCall = context.translate.mock.calls[0];
      expect(playerDrawCall).toBeDefined();
      expect(playerTranslateCall).toBeDefined();
      if (!playerDrawCall || !playerTranslateCall) return;
      const playerSpriteTop = playerTranslateCall[1] + playerDrawCall[6];
      const playerVisibleFootY = playerSpriteTop
        + IDLE_OPAQUE_BOTTOM_EXCLUSIVE_Y
          / PLAYER_SHEETS[PLAYER_ANIMATION_STATES.idle].frameH
          * playerDrawCall[8];

      drawPlatformOcclusion();
      const platformDrawCall = context.drawImage.mock.calls.find(
        ([image]) => image === TEST_PLATFORM_IMAGE,
      );
      expect(platformDrawCall).toBeDefined();
      if (!platformDrawCall) return;
      const drawY = platformDrawCall[6] as number;
      const renderedSurfaceY = drawY + sprite.surfaceY * sheet.drawScale;
      const footSurfaceOverlap = playerVisibleFootY - renderedSurfaceY;
      expect(state.player.onPlatform).toBe(platform);
      expect(footSurfaceOverlap).toBeGreaterThanOrEqual(0);
      expect(footSurfaceOverlap).toBeLessThanOrEqual(MAX_FOOT_SURFACE_OVERLAP);
    },
  );

  it("draws only the supporting platform in full in the occlusion pass", () => {
    const context = createMockContext();
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    const { sprite } = setTestPlatform(ROW_THREE_COLUMN_THREE_INDEX);
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
      TEST_PLATFORM_IMAGE,
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
