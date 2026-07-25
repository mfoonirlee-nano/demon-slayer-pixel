import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GROUND_Y,
  LANTERN_EMBER_AWAKENED_GRID_SHEET,
  LANTERN_EMBER_BUFF_TETHER_SHEET,
  LANTERN_EMBER_CONFIG,
  LANTERN_EMBER_FIRELINE_SHEET,
  LANTERN_EMBER_LURE_EFFECT_SHEET,
} from "../../constants";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import type {
  EnemyState,
  LanternEmberAwakenedGridState,
  LanternEmberBuffTetherState,
  LanternEmberFirelineState,
  LanternEmberLureState,
} from "../../types/game-state";
import { drawLanternEmberEffects, updateLanternEmberEffects } from "./lanternEmberEffects";

type TestContext = CanvasRenderingContext2D & {
  drawImage: ReturnType<typeof vi.fn>;
  rotate: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
};

const LONG_EFFECT_LIFE = 1_000;
const FIRELINE_VISIBLE_FRAMES = middleFrames(LANTERN_EMBER_FIRELINE_SHEET.count);
const GRID_VISIBLE_FRAMES = middleFrames(LANTERN_EMBER_AWAKENED_GRID_SHEET.count);
const LURE_VISIBLE_FRAMES = middleFrames(LANTERN_EMBER_LURE_EFFECT_SHEET.count);
const originalFirelineImage = LANTERN_EMBER_FIRELINE_SHEET.image;
const originalTetherImage = LANTERN_EMBER_BUFF_TETHER_SHEET.image;
const originalGridImage = LANTERN_EMBER_AWAKENED_GRID_SHEET.image;
const TARGET_MOVE_X = 34;
const TARGET_MOVE_Y = 12;

describe("lantern ember effects", () => {
  beforeEach(() => {
    resetState();
  });

  afterEach(() => {
    setCanvas(null);
    LANTERN_EMBER_FIRELINE_SHEET.image = originalFirelineImage;
    LANTERN_EMBER_BUFF_TETHER_SHEET.image = originalTetherImage;
    LANTERN_EMBER_AWAKENED_GRID_SHEET.image = originalGridImage;
  });

  it("loops a long-lived active fireline through visible frames 1 to 6", () => {
    const fireline = createFireline({
      elapsed: LANTERN_EMBER_CONFIG.firelineWarningFrames
        + 2 * FIRELINE_VISIBLE_FRAMES.length * LANTERN_EMBER_CONFIG.firelineFrameDuration,
      life: LONG_EFFECT_LIFE,
    });
    state.lanternEmberFirelines.push(fireline);

    const frames = advanceAndCollectFrames(
      FIRELINE_VISIBLE_FRAMES.length * LANTERN_EMBER_CONFIG.firelineFrameDuration,
      () => state.lanternEmberFirelines[0]?.frame,
    );

    expect(state.lanternEmberFirelines).toHaveLength(1);
    expect(uniqueSorted(frames)).toEqual(FIRELINE_VISIBLE_FRAMES);
  });

  it("loops a long-lived active awakened grid through visible frames 1 to 6", () => {
    const grid = createAwakenedGrid({
      elapsed: LANTERN_EMBER_CONFIG.awakenedGridWarningFrames
        + 2 * GRID_VISIBLE_FRAMES.length * LANTERN_EMBER_CONFIG.awakenedGridFrameDuration,
      life: LONG_EFFECT_LIFE,
    });
    state.lanternEmberAwakenedGrids.push(grid);

    const frames = advanceAndCollectFrames(
      GRID_VISIBLE_FRAMES.length * LANTERN_EMBER_CONFIG.awakenedGridFrameDuration,
      () => state.lanternEmberAwakenedGrids[0]?.frame,
    );

    expect(state.lanternEmberAwakenedGrids).toHaveLength(1);
    expect(uniqueSorted(frames)).toEqual(GRID_VISIBLE_FRAMES);
  });

  it("loops a long-lived lure through visible middle frames 1 to 4", () => {
    const lure = createLure({
      elapsed: 2 * LURE_VISIBLE_FRAMES.length * LANTERN_EMBER_CONFIG.lureFrameDuration,
      life: LONG_EFFECT_LIFE,
    });
    state.lanternEmberLures.push(lure);

    const frames = advanceAndCollectFrames(
      LURE_VISIBLE_FRAMES.length * LANTERN_EMBER_CONFIG.lureFrameDuration,
      () => state.lanternEmberLures[0]?.frame,
    );

    expect(state.lanternEmberLures).toHaveLength(1);
    expect(uniqueSorted(frames)).toEqual(LURE_VISIBLE_FRAMES);
  });

  it("draws a sprite-backed warning trajectory from the caster to the fireline target", () => {
    const context = createContext();
    const firelineImage = {} as HTMLImageElement;
    const trajectoryImage = {} as HTMLImageElement;
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    LANTERN_EMBER_FIRELINE_SHEET.image = firelineImage;
    LANTERN_EMBER_BUFF_TETHER_SHEET.image = trajectoryImage;

    const fireline = createFireline({
      x: 420,
      y: GROUND_Y,
      w: LANTERN_EMBER_CONFIG.firelineHitW,
      elapsed: 1,
      frame: 0,
      sourceX: 160,
      sourceY: 180,
    });
    state.lanternEmberFirelines.push(fireline);

    drawLanternEmberEffects();

    const targetCenterX = fireline.x + fireline.w / 2;
    const targetCenterY = fireline.y;
    const trajectoryAngle = Math.atan2(
      targetCenterY - fireline.sourceY,
      targetCenterX - fireline.sourceX,
    );
    expect(context.drawImage).toHaveBeenCalledTimes(2);
    expect(context.drawImage.mock.calls.map(([drawnImage]) => drawnImage))
      .toEqual([trajectoryImage, firelineImage]);
    expect(context.translate).toHaveBeenCalledWith(fireline.sourceX, fireline.sourceY);
    expect(context.rotate).toHaveBeenCalledWith(trajectoryAngle);
  });

  it("renders the dangerous side of grid tiles consistently in both travel directions", () => {
    const context = createContext();
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    LANTERN_EMBER_AWAKENED_GRID_SHEET.image = {} as HTMLImageElement;
    state.lanternEmberAwakenedGrids.push(
      createAwakenedGrid({ x: 0, vx: -1 }),
      createAwakenedGrid({ x: 0, vx: 1 }),
    );

    drawLanternEmberEffects();

    expect(context.scale).toHaveBeenCalled();
    expect(context.scale.mock.calls.every(([scaleX, scaleY]) => scaleX === 1 && scaleY === 1))
      .toBe(true);
  });

  it("keeps a short buff tether attached to a moving target", () => {
    const context = createContext();
    const tetherImage = {} as HTMLImageElement;
    const target = createEnemy();
    const tether = createBuffTether(target);
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    LANTERN_EMBER_BUFF_TETHER_SHEET.image = tetherImage;
    state.lanternEmberBuffTethers.push(tether);

    target.x += TARGET_MOVE_X;
    target.y += TARGET_MOVE_Y;
    updateLanternEmberEffects();
    drawLanternEmberEffects();

    const targetX = target.x + target.w / 2;
    const targetY = target.y + target.h / 2;
    const expectedLength = Math.hypot(targetX - tether.fromX, targetY - tether.fromY);
    const [, , , , , drawX, , drawW] = context.drawImage.mock.calls[0] ?? [];
    expect(tether.toX).toBe(targetX);
    expect(tether.toY).toBe(targetY);
    expect(drawX).toBe(0);
    expect(drawW).toBeCloseTo(expectedLength);
  });
});

function createFireline(
  overrides: Partial<LanternEmberFirelineState> = {},
): LanternEmberFirelineState {
  return {
    x: 10_000,
    y: -1_000,
    w: LANTERN_EMBER_CONFIG.firelineHitW,
    h: LANTERN_EMBER_CONFIG.firelineHitH,
    warningFrames: LANTERN_EMBER_CONFIG.firelineWarningFrames,
    elapsed: 0,
    frame: 0,
    life: LANTERN_EMBER_CONFIG.firelineLife,
    damage: 1,
    hitPlayer: false,
    sourceX: 0,
    sourceY: 0,
    ...overrides,
  };
}

function createAwakenedGrid(
  overrides: Partial<LanternEmberAwakenedGridState> = {},
): LanternEmberAwakenedGridState {
  return {
    x: 10_000,
    y: -1_000,
    w: LANTERN_EMBER_CONFIG.awakenedGridDrawW,
    h: LANTERN_EMBER_CONFIG.awakenedGridHitH,
    vx: 0,
    warningFrames: LANTERN_EMBER_CONFIG.awakenedGridWarningFrames,
    elapsed: 0,
    frame: 0,
    life: LANTERN_EMBER_CONFIG.awakenedGridLife,
    damage: 1,
    hitPlayerCd: 0,
    ...overrides,
  };
}

function createLure(
  overrides: Partial<LanternEmberLureState> = {},
): LanternEmberLureState {
  return {
    x: 10_000,
    y: -1_000,
    vx: 0,
    facing: 1,
    elapsed: 0,
    frame: 0,
    life: LANTERN_EMBER_CONFIG.lureLife,
    ...overrides,
  };
}

function createBuffTether(target: EnemyState): LanternEmberBuffTetherState {
  return {
    fromX: 100,
    fromY: 180,
    toX: target.x + target.w / 2,
    toY: target.y + target.h / 2,
    target,
    facing: 1,
    elapsed: 0,
    frame: 0,
    life: LANTERN_EMBER_CONFIG.buffTetherLife,
  };
}

function createEnemy(): EnemyState {
  return {
    id: "chaser",
    spawnSource: "boss",
    spawnCost: 1,
    aiState: "move",
    aiTimer: 0,
    x: 130,
    y: 160,
    w: 40,
    h: 70,
    vx: 0,
    hp: 10,
    damage: 4,
    hitCd: 0,
    animSeed: 0,
    sheetIndex: 0,
  };
}

function advanceAndCollectFrames(
  frames: number,
  currentFrame: () => number | undefined,
) {
  const result: number[] = [];
  for (let i = 0; i < frames; i += 1) {
    updateLanternEmberEffects();
    const frame = currentFrame();
    if (frame !== undefined) result.push(frame);
  }
  return result;
}

function uniqueSorted(frames: number[]) {
  return [...new Set(frames)].sort((a, b) => a - b);
}

function middleFrames(frameCount: number) {
  return Array.from({ length: frameCount - 2 }, (_, index) => index + 1);
}

function createContext(): TestContext {
  return {
    drawImage: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
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
