import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GROUND_TILE_SPRITES } from "../constants";
import { resetState, state } from "../game/state";
import { drawGroundTileBase, drawGroundTileOcclusion } from "./background";
import { setCanvas } from "./context";

type GroundDraw = {
  alpha: number;
  image: CanvasImageSource;
  sourceX: number;
  destinationX: number;
  destinationY: number;
};

type MockCanvasContext = CanvasRenderingContext2D & {
  draws: GroundDraw[];
};

const FOREST_IMAGE = {} as HTMLImageElement;
const TRANSITION_IMAGE = {} as HTMLImageElement;
const SHRINE_IMAGE = {} as HTMLImageElement;
const REVERSE_TRANSITION_IMAGE = {} as HTMLImageElement;
const FOREST_OCCLUSION_IMAGE = {} as HTMLImageElement;
const TRANSITION_OCCLUSION_IMAGE = {} as HTMLImageElement;
const SHRINE_OCCLUSION_IMAGE = {} as HTMLImageElement;
const REVERSE_TRANSITION_OCCLUSION_IMAGE = {} as HTMLImageElement;
const TRANSITION_START_ELAPSED = 23.375;
const PRELUDE_ELAPSED = 23.5;
const BASE_FIRST_BLEND_FRAME = 0;
const BASE_FIRST_OPAQUE_FRAME = 3;
const OCCLUSION_FIRST_BLEND_FRAME = 2;
const OCCLUSION_FIRST_OPAQUE_FRAME = 5;
const EARLY_STONE_BLEND_ALPHA = 0.2;
const MID_STONE_BLEND_ALPHA = 0.5;
const LATE_STONE_BLEND_ALPHA = 0.85;
const EXPECTED_BLEND_ALPHAS = [
  EARLY_STONE_BLEND_ALPHA,
  MID_STONE_BLEND_ALPHA,
  LATE_STONE_BLEND_ALPHA,
];

function createMockContext(): MockCanvasContext {
  const draws: GroundDraw[] = [];
  const alphaStack: number[] = [];
  let globalAlpha = 1;
  const context = {
    draws,
    drawImage: vi.fn((
      image: CanvasImageSource,
      sourceX: number,
      _sourceY: number,
      _sourceW: number,
      _sourceH: number,
      destinationX: number,
      destinationY: number,
    ) => {
      draws.push({ alpha: globalAlpha, image, sourceX, destinationX, destinationY });
    }),
    save: vi.fn(() => alphaStack.push(globalAlpha)),
    restore: vi.fn(() => {
      globalAlpha = alphaStack.pop() ?? 1;
    }),
  } as unknown as MockCanvasContext;

  Object.defineProperty(context, "globalAlpha", {
    get: () => globalAlpha,
    set: (value: number) => {
      globalAlpha = value;
    },
  });

  return context;
}

function enterForestToShrineTransition() {
  state.elapsed = TRANSITION_START_ELAPSED + PRELUDE_ELAPSED;
  state.enemyDirector.bossPrelude = {
    elapsed: PRELUDE_ELAPSED,
    reinforcementTimer: 0,
    reinforcementsSpawned: 0,
  };
}

function expectAlignedStoneBlend(
  context: MockCanvasContext,
  shrineImage: HTMLImageElement,
  firstBlendFrame: number,
  firstOpaqueFrame: number,
) {
  const blendedShrineDraws = context.draws.filter((draw) => (
    draw.image === shrineImage && draw.alpha < 1
  ));
  const topRowY = Math.min(...blendedShrineDraws.map((draw) => draw.destinationY));
  const firstShrineDraw = context.draws.find((draw) => (
    draw.image === shrineImage
    && draw.alpha === 1
    && draw.destinationX === (EXPECTED_BLEND_ALPHAS.length + 1) * GROUND_TILE_SPRITES.tileSize
    && draw.destinationY === topRowY
  ));

  expect(blendedShrineDraws.filter((draw) => draw.destinationY === topRowY)).toEqual(
    EXPECTED_BLEND_ALPHAS.map((alpha, index) => ({
      alpha,
      image: shrineImage,
      sourceX: (firstBlendFrame + index) * GROUND_TILE_SPRITES.tileSize,
      destinationX: (index + 1) * GROUND_TILE_SPRITES.tileSize,
      destinationY: topRowY,
    })),
  );
  expect(firstShrineDraw?.sourceX).toBe(firstOpaqueFrame * GROUND_TILE_SPRITES.tileSize);
  expect(context.globalAlpha).toBe(1);
}

describe("ground tile rendering", () => {
  beforeEach(() => {
    resetState();
    GROUND_TILE_SPRITES.sets.forest.image = FOREST_IMAGE;
    GROUND_TILE_SPRITES.sets.forestToShrine.image = TRANSITION_IMAGE;
    GROUND_TILE_SPRITES.sets.shrine.image = SHRINE_IMAGE;
    GROUND_TILE_SPRITES.sets.shrineToForest.image = REVERSE_TRANSITION_IMAGE;
    GROUND_TILE_SPRITES.sets.forest.occlusionImage = FOREST_OCCLUSION_IMAGE;
    GROUND_TILE_SPRITES.sets.forestToShrine.occlusionImage = TRANSITION_OCCLUSION_IMAGE;
    GROUND_TILE_SPRITES.sets.shrine.occlusionImage = SHRINE_OCCLUSION_IMAGE;
    GROUND_TILE_SPRITES.sets.shrineToForest.occlusionImage = REVERSE_TRANSITION_OCCLUSION_IMAGE;
  });

  afterEach(() => {
    for (const tileSet of Object.values(GROUND_TILE_SPRITES.sets)) {
      tileSet.image = null;
      tileSet.occlusionImage = null;
    }
    setCanvas(null);
    resetState();
  });

  it("crossfades the forest-to-shrine edge into aligned shrine variants", () => {
    const context = createMockContext();
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    enterForestToShrineTransition();

    drawGroundTileBase();

    expectAlignedStoneBlend(
      context,
      SHRINE_IMAGE,
      BASE_FIRST_BLEND_FRAME,
      BASE_FIRST_OPAQUE_FRAME,
    );
  });

  it("keeps the seven-frame occlusion sequence aligned while blending", () => {
    const context = createMockContext();
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    enterForestToShrineTransition();

    drawGroundTileOcclusion();

    expectAlignedStoneBlend(
      context,
      SHRINE_OCCLUSION_IMAGE,
      OCCLUSION_FIRST_BLEND_FRAME,
      OCCLUSION_FIRST_OPAQUE_FRAME,
    );
  });
});
