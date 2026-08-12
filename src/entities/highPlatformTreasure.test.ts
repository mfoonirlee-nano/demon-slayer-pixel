import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HEIGHT,
  HIGH_PLATFORM_TREASURE_CONFIG,
  WIDTH,
} from "../constants";
import { resetState, state } from "../game/state";
import { setCanvas } from "../rendering/context";
import type { PlatformState } from "../types/game-state";
import { drawTreasureTelegraph } from "./highPlatformTreasure";

type FilledRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type MockCanvasContext = CanvasRenderingContext2D & {
  filledRects: FilledRect[];
};

const HOST_WIDTH = 160;
const HOST_Y = 182;
const ACTIVE_GLOW_PROGRESS = 0.25;

function platform(): PlatformState {
  return {
    x: WIDTH + HIGH_PLATFORM_TREASURE_CONFIG.telegraph.arrivalLeadDistance,
    y: HOST_Y,
    baseY: HOST_Y,
    w: HOST_WIDTH,
    h: 12,
    vx: -1,
    phase: 0,
    style: "stone",
    kind: "normal",
    spriteIndex: 0,
    spriteAct: null,
    trim: 0,
    notch: 0,
    hoverAmplitude: 0,
  };
}

function createMockContext(): MockCanvasContext {
  const filledRects: FilledRect[] = [];
  const gradient = { addColorStop: vi.fn() } as unknown as CanvasGradient;
  return {
    filledRects,
    beginPath: vi.fn(),
    createRadialGradient: vi.fn(() => gradient),
    ellipse: vi.fn(),
    fillRect: vi.fn((x: number, y: number, width: number, height: number) => {
      filledRects.push({ x, y, width, height });
    }),
    restore: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
    fillStyle: "#000000",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    lineWidth: 1,
    strokeStyle: "#000000",
  } as unknown as MockCanvasContext;
}

function visibleRects(context: MockCanvasContext) {
  return context.filledRects.filter((rect) => (
    rect.x < WIDTH
    && rect.x + rect.width > 0
    && rect.y < HEIGHT
    && rect.y + rect.height > 0
  ));
}

describe("high-platform treasure telegraph", () => {
  beforeEach(() => {
    resetState();
    state.highPlatformTreasure = {
      host: platform(),
      segmentKind: "stairUp",
      forced: false,
      dismissElapsed: null,
      unlockElapsed: 0,
      claimHoldElapsed: 0,
      phase: 0,
      arrivalGlowElapsed:
        HIGH_PLATFORM_TREASURE_CONFIG.telegraph.arrivalGlowDurationSeconds
          * ACTIVE_GLOW_PROGRESS,
      seen: false,
      climbStarted: false,
    };
  });

  afterEach(() => {
    setCanvas(null);
    resetState();
  });

  it("lets the brief arrival glow spill into the scene before its host appears", () => {
    const context = createMockContext();
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);

    drawTreasureTelegraph();

    expect(visibleRects(context).length).toBeGreaterThan(0);
  });

  it.each([
    ["before the approach cue", null],
    [
      "after the flash has dispersed",
      HIGH_PLATFORM_TREASURE_CONFIG.telegraph.arrivalGlowDurationSeconds,
    ],
  ])("does not leave a fixed screen-edge marker %s", (_label, elapsed) => {
    const context = createMockContext();
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    if (state.highPlatformTreasure) {
      state.highPlatformTreasure.arrivalGlowElapsed = elapsed;
    }

    drawTreasureTelegraph();

    expect(visibleRects(context)).toEqual([]);
  });
});
