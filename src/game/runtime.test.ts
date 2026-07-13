import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PLATFORM_SPRITES, PLAYER_ANIMATION_STATES, PLAYER_SHEETS } from "../constants";
import { setCanvas } from "../rendering/context";
import { resetState, state } from "./state";
import { startGame, stopGame, updateUltimateCastFreezeFrame } from "./runtime";

vi.mock("../rendering/background", () => ({
  drawBackground: vi.fn(),
  drawGroundTileBase: vi.fn(),
  drawGroundTileOcclusion: vi.fn(),
}));

vi.mock("../rendering/nearForeground", () => ({
  drawNearForeground: vi.fn(),
}));

vi.mock("./input", () => ({
  debugCollisionBoxes: false,
  setupInput: vi.fn(),
  teardownInput: vi.fn(),
}));

type MockCanvasContext = CanvasRenderingContext2D & {
  drawImage: ReturnType<typeof vi.fn>;
};

const PLAYER_IMAGE = {} as HTMLImageElement;
const PLATFORM_IMAGE = {} as HTMLImageElement;
const TEST_FRAME_TIME = 16;

function createMockContext(): MockCanvasContext {
  return {
    drawImage: vi.fn(),
    filter: "none",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    imageSmoothingEnabled: true,
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    translate: vi.fn(),
  } as unknown as MockCanvasContext;
}

describe("game runtime", () => {
  beforeEach(() => {
    resetState();
  });

  afterEach(() => {
    stopGame();
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.idle].image = null;
    PLATFORM_SPRITES.image = null;
    setCanvas(null);
    vi.unstubAllGlobals();
  });

  it("continues aging visual-only effects instead of locking a crowded frame", () => {
    state.player.ultimateCastTimer = 20;
    state.particles.push({ x: 0, y: 0, vx: 0, vy: 0, life: 1, color: "#fff" });
    state.hitBursts.push({
      x: 0,
      y: 0,
      life: 1,
      maxLife: 1,
      radius: 1,
      grow: 1,
      color: "#fff",
      sparks: [],
    });
    state.ultimateTrails.push({
      x: 0,
      y: 0,
      facing: 1,
      life: 1,
      maxLife: 1,
      width: 10,
      height: 4,
      phase: 0,
    });
    state.ultimateAfterimageSlashes.push({
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      facing: 1,
      life: 1,
      maxLife: 1,
      power: 1,
    });
    state.ultimatePlayerGhosts.push({
      source: "player",
      action: "idle",
      animationState: PLAYER_ANIMATION_STATES.idle,
      frame: 0,
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      facing: 1,
      life: 1,
      maxLife: 1,
      strength: 1,
    });

    updateUltimateCastFreezeFrame();

    expect(state.particles).toHaveLength(0);
    expect(state.hitBursts).toHaveLength(0);
    expect(state.ultimateTrails).toHaveLength(0);
    expect(state.ultimateAfterimageSlashes).toHaveLength(0);
    expect(state.ultimatePlayerGhosts).toHaveLength(0);
  });

  it("draws the platform base behind the player and its front face in front", () => {
    const frameQueue: { callback?: FrameRequestCallback } = {};
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      frameQueue.callback = callback;
      return 1;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const context = createMockContext();
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.idle].image = PLAYER_IMAGE;
    PLATFORM_SPRITES.image = PLATFORM_IMAGE;
    state.spritesReady = true;

    startGame();
    const sprite = PLATFORM_SPRITES.regions[0];
    state.platforms = [{
      x: state.player.x,
      y: state.player.y + state.player.h,
      baseY: state.player.y + state.player.h,
      w: Math.round(sprite.sw * PLATFORM_SPRITES.drawScale),
      h: 12,
      vx: 0,
      phase: 0,
      style: "stone",
      kind: "normal",
      spriteIndex: 0,
      trim: 0,
      notch: 0,
      hoverAmplitude: 0,
    }];
    state.gameOver = true;

    expect(frameQueue.callback).toBeDefined();
    frameQueue.callback?.(TEST_FRAME_TIME);

    const drawnImages = context.drawImage.mock.calls.map(([image]) => image);
    const playerDrawIndex = drawnImages.indexOf(PLAYER_IMAGE);
    const platformDrawIndices = drawnImages.flatMap((image, index) => (
      image === PLATFORM_IMAGE ? [index] : []
    ));
    expect(platformDrawIndices).toHaveLength(2);
    expect(platformDrawIndices[0]).toBeLessThan(playerDrawIndex);
    expect(platformDrawIndices[1]).toBeGreaterThan(playerDrawIndex);
  });
});
