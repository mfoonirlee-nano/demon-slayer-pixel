import {
  GROUND_TILE_SPRITES,
  type GroundTilePatternEntry,
  type GroundTilePatternKey,
} from "../constants";

export type GroundTileRenderInput = {
  elapsed: number;
  bossActive: boolean;
  bossActiveElapsed: number | null;
  bossKills: number;
  bossPreludeElapsed: number | null;
  act: number;
  elapsedInAct: number;
};

export type GroundTileRenderPlan = {
  patternKey: GroundTilePatternKey;
  pattern: GroundTilePatternEntry[];
  scrollPixels: number;
  variantOffset: number;
};

function approachTransitionScrollPixels() {
  return GROUND_TILE_SPRITES.bossApproachTransitionTiles * GROUND_TILE_SPRITES.tileSize;
}

function approachTransitionSeconds() {
  return approachTransitionScrollPixels() / GROUND_TILE_SPRITES.scrollSpeed;
}

function transitionScrollPixels(elapsed: number, transitionTiles: number) {
  const transitionPixels = transitionTiles * GROUND_TILE_SPRITES.tileSize;
  return Math.min(elapsed * GROUND_TILE_SPRITES.scrollSpeed, transitionPixels);
}

function groundScrollAnchor(elapsed: number) {
  const scrollPixels = elapsed * GROUND_TILE_SPRITES.scrollSpeed;
  const tileSize = GROUND_TILE_SPRITES.tileSize;
  const tileOffset = ((scrollPixels % tileSize) + tileSize) % tileSize;

  return {
    tileOffset,
    variantOffset: Math.floor(scrollPixels / tileSize),
  };
}

export function resolveGroundTileRenderPlan(input: GroundTileRenderInput): GroundTileRenderPlan {
  if (input.bossActive) {
    const bossActiveElapsed = input.bossActiveElapsed ?? 0;
    const transitionStartElapsed = input.elapsed - bossActiveElapsed - approachTransitionSeconds();
    const anchor = groundScrollAnchor(transitionStartElapsed);
    return {
      patternKey: "shrine",
      pattern: GROUND_TILE_SPRITES.patterns.shrine,
      scrollPixels: anchor.tileOffset
        + approachTransitionScrollPixels()
        + bossActiveElapsed * GROUND_TILE_SPRITES.scrollSpeed,
      variantOffset: anchor.variantOffset,
    };
  }

  if (input.bossPreludeElapsed !== null) {
    const transitionStartElapsed = input.elapsed - input.bossPreludeElapsed;
    const anchor = groundScrollAnchor(transitionStartElapsed);
    return {
      patternKey: "forestToShrine",
      pattern: GROUND_TILE_SPRITES.patterns.forestToShrine,
      scrollPixels: anchor.tileOffset + transitionScrollPixels(
        input.bossPreludeElapsed,
        GROUND_TILE_SPRITES.bossApproachTransitionTiles,
      ),
      variantOffset: anchor.variantOffset,
    };
  }

  if (
    input.bossKills > 0
    && input.elapsedInAct < GROUND_TILE_SPRITES.bossExitTransitionSeconds
  ) {
    const transitionStartElapsed = input.elapsed - input.elapsedInAct;
    const anchor = groundScrollAnchor(transitionStartElapsed);
    return {
      patternKey: "shrineToForest",
      pattern: GROUND_TILE_SPRITES.patterns.shrineToForest,
      scrollPixels: anchor.tileOffset + transitionScrollPixels(
        input.elapsedInAct,
        GROUND_TILE_SPRITES.bossExitTransitionTiles,
      ),
      variantOffset: anchor.variantOffset,
    };
  }

  return {
    patternKey: "forest",
    pattern: GROUND_TILE_SPRITES.patterns.forest,
    scrollPixels: input.elapsed * GROUND_TILE_SPRITES.scrollSpeed,
    variantOffset: 0,
  };
}
