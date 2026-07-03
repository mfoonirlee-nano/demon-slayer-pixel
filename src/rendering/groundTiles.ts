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
};

function approachTransitionScrollPixels() {
  return GROUND_TILE_SPRITES.bossApproachTransitionTiles * GROUND_TILE_SPRITES.tileSize;
}

function transitionScrollPixels(elapsed: number, transitionTiles: number) {
  const transitionPixels = transitionTiles * GROUND_TILE_SPRITES.tileSize;
  return Math.min(elapsed * GROUND_TILE_SPRITES.scrollSpeed, transitionPixels);
}

export function resolveGroundTileRenderPlan(input: GroundTileRenderInput): GroundTileRenderPlan {
  if (input.bossActive) {
    return {
      patternKey: "shrine",
      pattern: GROUND_TILE_SPRITES.patterns.shrine,
      scrollPixels: approachTransitionScrollPixels()
        + (input.bossActiveElapsed ?? 0) * GROUND_TILE_SPRITES.scrollSpeed,
    };
  }

  if (input.bossPreludeElapsed !== null) {
    return {
      patternKey: "forestToShrine",
      pattern: GROUND_TILE_SPRITES.patterns.forestToShrine,
      scrollPixels: transitionScrollPixels(
        input.bossPreludeElapsed,
        GROUND_TILE_SPRITES.bossApproachTransitionTiles,
      ),
    };
  }

  if (
    input.bossKills > 0
    && input.elapsedInAct < GROUND_TILE_SPRITES.bossExitTransitionSeconds
  ) {
    return {
      patternKey: "shrineToForest",
      pattern: GROUND_TILE_SPRITES.patterns.shrineToForest,
      scrollPixels: transitionScrollPixels(
        input.elapsedInAct,
        GROUND_TILE_SPRITES.bossExitTransitionTiles,
      ),
    };
  }

  return {
    patternKey: "forest",
    pattern: GROUND_TILE_SPRITES.patterns.forest,
    scrollPixels: input.elapsed * GROUND_TILE_SPRITES.scrollSpeed,
  };
}
