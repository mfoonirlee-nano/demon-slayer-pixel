import {
  GROUND_TILE_SPRITES,
  type GroundTilePatternEntry,
  type GroundTilePatternKey,
} from "../constants";

import { bossPreludeWaitSeconds } from "../systems/runProgression";

export type GroundTileRenderInput = {
  elapsed: number;
  bossActive: boolean;
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

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function phaseScrollPixels(elapsed: number, duration: number, transitionTiles: number) {
  const progress = duration <= 0 ? 1 : clamp01(elapsed / duration);
  return progress * transitionTiles * GROUND_TILE_SPRITES.tileSize;
}

function approachTransitionDuration(act: number) {
  return Math.max(
    GROUND_TILE_SPRITES.minBossApproachTransitionSeconds,
    bossPreludeWaitSeconds(act),
  );
}

export function resolveGroundTileRenderPlan(input: GroundTileRenderInput): GroundTileRenderPlan {
  if (input.bossActive) {
    return {
      patternKey: "shrine",
      pattern: GROUND_TILE_SPRITES.patterns.shrine,
      scrollPixels: input.elapsed * GROUND_TILE_SPRITES.scrollSpeed,
    };
  }

  if (input.bossPreludeElapsed !== null) {
    return {
      patternKey: "forestToShrine",
      pattern: GROUND_TILE_SPRITES.patterns.forestToShrine,
      scrollPixels: phaseScrollPixels(
        input.bossPreludeElapsed,
        approachTransitionDuration(input.act),
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
      scrollPixels: phaseScrollPixels(
        input.elapsedInAct,
        GROUND_TILE_SPRITES.bossExitTransitionSeconds,
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
