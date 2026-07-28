import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GROUND_Y,
  SPIDER_STRING_CAGE_CONFIG,
  SPIDER_STRING_ULTIMATE_WEB_SHEET,
  WIDTH,
} from "../../constants";
import * as collisionDebug from "../../game/collisionDebug";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import type { SpiderStringCageState } from "../../types/game-state";
import {
  drawSpiderStringCageEffects,
  updateSpiderStringCageEffects,
} from "./spiderStringCageEffects";

type TestContext = CanvasRenderingContext2D & {
  beginPath: ReturnType<typeof vi.fn>;
  clip: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
  rect: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
};

const originalWebImage = SPIDER_STRING_ULTIMATE_WEB_SHEET.image;
const SAFE_COLUMN = 2;
const DRAW_IMAGE_SOURCE_ARGUMENT_COUNT = 5;
const DRAW_IMAGE_DESTINATION_WIDTH_ARGUMENT = 7;
const FIRST_HIT_FRAME = 2;
const LAST_HIT_FRAME = 6;
const FADE_FRAME = 7;
const SPAN_EDGE_COUNT = 2;

describe("spider string cage effects", () => {
  beforeEach(() => {
    resetState();
    vi.spyOn(collisionDebug, "recordCollisionDebugPoint").mockImplementation(() => {});
    vi.spyOn(collisionDebug, "recordCollisionDebugRect").mockImplementation(() => {});
  });

  afterEach(() => {
    setCanvas(null);
    SPIDER_STRING_ULTIMATE_WEB_SHEET.image = originalWebImage;
    vi.restoreAllMocks();
  });

  it("draws two continuous web spans that converge on the safe segment", () => {
    const context = createContext();
    const webImage = {} as HTMLImageElement;
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    SPIDER_STRING_ULTIMATE_WEB_SHEET.image = webImage;
    state.spiderStringCages.push(createCage());

    drawSpiderStringCageEffects();

    const columnW = WIDTH / SPIDER_STRING_CAGE_CONFIG.columns;
    const safeLeft = SAFE_COLUMN * columnW + SPIDER_STRING_CAGE_CONFIG.safePaddingX;
    const safeRight = (SAFE_COLUMN + 1) * columnW
      - SPIDER_STRING_CAGE_CONFIG.safePaddingX;
    const drawY = GROUND_Y
      - SPIDER_STRING_CAGE_CONFIG.webDrawH
      + SPIDER_STRING_CAGE_CONFIG.groundDrawYOffset;
    const spanW = safeLeft;
    const visualSpanW = spanW
      + SPIDER_STRING_CAGE_CONFIG.safePaddingX * SPAN_EDGE_COUNT;
    const drawW = SPIDER_STRING_CAGE_CONFIG.webDrawW * visualSpanW / columnW;
    const centerY = drawY + SPIDER_STRING_CAGE_CONFIG.webDrawH / 2;

    expect(context.rect.mock.calls).toEqual([
      [0, drawY, safeLeft, SPIDER_STRING_CAGE_CONFIG.webDrawH],
      [
        safeRight,
        drawY,
        WIDTH - safeRight,
        SPIDER_STRING_CAGE_CONFIG.webDrawH,
      ],
    ]);
    expect(context.clip).toHaveBeenCalledTimes(2);
    expect(context.translate.mock.calls).toEqual([
      [safeLeft / 2, centerY],
      [(safeRight + WIDTH) / 2, centerY],
    ]);
    expect(context.scale.mock.calls).toEqual([
      [1, 1],
      [-1, 1],
    ]);
    expect(context.drawImage).toHaveBeenCalledTimes(2);
    expect(context.drawImage.mock.calls.map(
      (call) => call.slice(0, DRAW_IMAGE_SOURCE_ARGUMENT_COUNT),
    )).toEqual([
      [
        webImage,
        0,
        0,
        SPIDER_STRING_ULTIMATE_WEB_SHEET.frameW,
        SPIDER_STRING_ULTIMATE_WEB_SHEET.frameH,
      ],
      [
        webImage,
        0,
        0,
        SPIDER_STRING_ULTIMATE_WEB_SHEET.frameW,
        SPIDER_STRING_ULTIMATE_WEB_SHEET.frameH,
      ],
    ]);
    expect(context.drawImage.mock.calls.map(
      (call) => call.slice(DRAW_IMAGE_SOURCE_ARGUMENT_COUNT),
    )).toEqual([
      [-drawW / 2, -SPIDER_STRING_CAGE_CONFIG.webDrawH / 2, drawW, SPIDER_STRING_CAGE_CONFIG.webDrawH],
      [-drawW / 2, -SPIDER_STRING_CAGE_CONFIG.webDrawH / 2, drawW, SPIDER_STRING_CAGE_CONFIG.webDrawH],
    ]);
  });

  it("clips asymmetric edge spans to the actual dangerous boundaries", () => {
    const context = createContext();
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    SPIDER_STRING_ULTIMATE_WEB_SHEET.image = {} as HTMLImageElement;
    state.spiderStringCages.push(createCage({ safeColumn: 0 }));

    drawSpiderStringCageEffects();

    const columnW = WIDTH / SPIDER_STRING_CAGE_CONFIG.columns;
    const safeLeft = SPIDER_STRING_CAGE_CONFIG.safePaddingX;
    const safeRight = columnW - SPIDER_STRING_CAGE_CONFIG.safePaddingX;
    const drawY = GROUND_Y
      - SPIDER_STRING_CAGE_CONFIG.webDrawH
      + SPIDER_STRING_CAGE_CONFIG.groundDrawYOffset;
    const visualPadding = SPIDER_STRING_CAGE_CONFIG.safePaddingX * SPAN_EDGE_COUNT;
    const expectedDrawWidths = [safeLeft, WIDTH - safeRight].map(
      (spanW) => SPIDER_STRING_CAGE_CONFIG.webDrawW
        * (spanW + visualPadding)
        / columnW,
    );

    expect(context.rect.mock.calls).toEqual([
      [0, drawY, safeLeft, SPIDER_STRING_CAGE_CONFIG.webDrawH],
      [
        safeRight,
        drawY,
        WIDTH - safeRight,
        SPIDER_STRING_CAGE_CONFIG.webDrawH,
      ],
    ]);
    expect(context.drawImage.mock.calls.map(
      (call) => call[DRAW_IMAGE_DESTINATION_WIDTH_ARGUMENT],
    )).toEqual(expectedDrawWidths);
  });

  it("maps warning, hit, and fade phases to their intended frame ranges", () => {
    state.player.x = WIDTH / 2 - state.player.w / 2;
    state.spiderStringCages.push(createCage());

    const warningFrames = advanceAndCollectFrames(SPIDER_STRING_CAGE_CONFIG.firstWarningFrames);
    const hitFrames = advanceAndCollectFrames(SPIDER_STRING_CAGE_CONFIG.hitFrames);
    updateSpiderStringCageEffects();

    expect(uniqueSorted(warningFrames)).toEqual([0, 1]);
    expect(uniqueSorted(hitFrames)).toEqual(frameRange(FIRST_HIT_FRAME, LAST_HIT_FRAME));
    expect(state.spiderStringCages[0].frame).toBe(FADE_FRAME);
  });

  it("records dangerous columns and active height bands only during the hit window", () => {
    const cage = createCage({
      elapsed: SPIDER_STRING_CAGE_CONFIG.firstWarningFrames - 1,
      kind: "mixed",
    });
    const columnW = WIDTH / cage.columns;
    state.player.x = (SAFE_COLUMN + 0.5) * columnW - state.player.w / 2;
    state.spiderStringCages.push(cage);
    const recordPoint = vi.mocked(collisionDebug.recordCollisionDebugPoint);
    const recordRect = vi.mocked(collisionDebug.recordCollisionDebugRect);

    updateSpiderStringCageEffects();
    expect(recordPoint).not.toHaveBeenCalled();
    expect(recordRect).not.toHaveBeenCalled();

    updateSpiderStringCageEffects();

    const safeLeft = SAFE_COLUMN * columnW + SPIDER_STRING_CAGE_CONFIG.safePaddingX;
    const safeRight = (SAFE_COLUMN + 1) * columnW
      - SPIDER_STRING_CAGE_CONFIG.safePaddingX;
    const groundY = GROUND_Y - SPIDER_STRING_CAGE_CONFIG.groundBandTopOffset;
    const groundH = SPIDER_STRING_CAGE_CONFIG.groundBandTopOffset
      + SPIDER_STRING_CAGE_CONFIG.groundBandBottomOffset;
    const airY = GROUND_Y - SPIDER_STRING_CAGE_CONFIG.airBandTopOffset;
    const airH = SPIDER_STRING_CAGE_CONFIG.airBandTopOffset
      - SPIDER_STRING_CAGE_CONFIG.airBandBottomOffset;
    expect(recordRect.mock.calls).toEqual([
      [{ x: 0, y: groundY, w: safeLeft, h: groundH }, "enemyAttack"],
      [{ x: safeRight, y: groundY, w: WIDTH - safeRight, h: groundH }, "enemyAttack"],
      [{ x: 0, y: airY, w: safeLeft, h: airH }, "enemyAttack"],
      [{ x: safeRight, y: airY, w: WIDTH - safeRight, h: airH }, "enemyAttack"],
    ]);
    expect(recordPoint).toHaveBeenCalledWith(
      state.player.x + state.player.w / 2,
      state.player.y + state.player.h,
      "enemyAttack",
    );

    cage.hitPlayer = true;
    recordPoint.mockClear();
    recordRect.mockClear();
    updateSpiderStringCageEffects();
    expect(recordPoint).not.toHaveBeenCalled();
    expect(recordRect).not.toHaveBeenCalled();
  });
});

function createCage(
  overrides: Partial<SpiderStringCageState> = {},
): SpiderStringCageState {
  return {
    segmentIndex: 0,
    safeColumn: SAFE_COLUMN,
    previousSafeColumn: null,
    columns: SPIDER_STRING_CAGE_CONFIG.columns,
    elapsed: 0,
    warningFrames: SPIDER_STRING_CAGE_CONFIG.firstWarningFrames,
    hitFrames: SPIDER_STRING_CAGE_CONFIG.hitFrames,
    afterFrames: SPIDER_STRING_CAGE_CONFIG.gapFrames,
    frame: 0,
    damage: 0,
    hitPlayer: false,
    kind: "ground",
    ...overrides,
  };
}

function advanceAndCollectFrames(frames: number) {
  const result: number[] = [];
  for (let i = 0; i < frames; i += 1) {
    updateSpiderStringCageEffects();
    result.push(state.spiderStringCages[0].frame);
  }
  return result;
}

function uniqueSorted(frames: number[]) {
  return [...new Set(frames)].sort((a, b) => a - b);
}

function frameRange(first: number, last: number) {
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

function createContext(): TestContext {
  return {
    beginPath: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn(),
    rect: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    translate: vi.fn(),
    filter: "none",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    imageSmoothingEnabled: false,
  } as unknown as TestContext;
}
