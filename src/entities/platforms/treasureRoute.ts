import {
  HIGH_PLATFORM_TREASURE_CONFIG,
  MAP_GENERATION_CONFIG,
} from "../../constants";
import type { PlatformLayer, PlatformState } from "../../types/game-state";
import type { PlatformSpriteKind } from "./actPlatformSprites";
import { layerY, platformWidth, randomBetween } from "./helpers";

type MakePlatform = (
  x: number,
  y: number,
  width: number,
  vx: number,
  isHover: boolean,
  isChain: boolean,
  intendedSpriteKind?: PlatformSpriteKind,
  random?: () => number,
) => PlatformState;

type CanReachNextPlatform = (
  fromY: number,
  toY: number,
  gap: number,
  width: number,
  isHover: boolean,
) => boolean;

type CreateTreasureRouteOptions = {
  fromLayer: PlatformLayer;
  vx: number;
  firstX: number;
  existingPlatforms: readonly PlatformState[];
  makePlatform: MakePlatform;
  canReachNextPlatform: CanReachNextPlatform;
  platformsOverlap: (a: PlatformState, b: PlatformState) => boolean;
  random: () => number;
};

export type TreasureRoutePlatforms = {
  platforms: PlatformState[];
  treasureHost: PlatformState;
};

function entryLayerForTreasure(fromLayer: PlatformLayer): PlatformLayer {
  return fromLayer === "top" ? "high" : fromLayer;
}

function treasureBranchLayers(entryLayer: PlatformLayer): PlatformLayer[] {
  if (entryLayer === "low") return ["mid", "high"];
  if (entryLayer === "mid") return ["high"];
  return ["top"];
}

function reachableStepGap(
  fromY: number,
  toY: number,
  width: number,
  canReachNextPlatform: CanReachNextPlatform,
  random: () => number,
) {
  const reach = MAP_GENERATION_CONFIG.reachability;

  for (let attempt = 0; attempt < MAP_GENERATION_CONFIG.segment.retryCount; attempt += 1) {
    const gap = randomBetween(reach.minGap, reach.highRiseMaxGap, random);
    if (canReachNextPlatform(fromY, toY, gap, width, false)) return gap;
  }

  return reach.minGap;
}

function placeRoutePastBlockers(
  platforms: PlatformState[],
  firstX: number,
  existingPlatforms: readonly PlatformState[],
  platformsOverlap: (a: PlatformState, b: PlatformState) => boolean,
) {
  let safeX = firstX;
  const offsets = platforms.map((platform) => platform.x - platforms[0].x);

  for (
    let attempt = 0;
    attempt < MAP_GENERATION_CONFIG.overlap.maxResolveAttempts;
    attempt += 1
  ) {
    platforms.forEach((platform, index) => {
      platform.x = safeX + offsets[index];
    });
    const blocked = platforms.flatMap((platform) => {
      const blocker = existingPlatforms.find((existing) => platformsOverlap(platform, existing));
      return blocker ? [{ platform, blocker }] : [];
    });
    if (blocked.length === 0) break;

    const minGap = MAP_GENERATION_CONFIG.overlap.minHorizontalGap;
    const shift = Math.max(...blocked.map(({ platform, blocker }) => (
      blocker.x + blocker.w + minGap - platform.x
    )));
    safeX += shift;
  }

  platforms.forEach((platform, index) => {
    platform.x = safeX + offsets[index];
  });
}

export function createTreasureRoutePlatforms(
  options: CreateTreasureRouteOptions,
): TreasureRoutePlatforms {
  const safeLayer = entryLayerForTreasure(options.fromLayer);
  const safeY = layerY(safeLayer, options.random);
  const safeRoute = options.makePlatform(
    0,
    safeY,
    platformWidth("wide", options.random),
    options.vx,
    false,
    false,
    "wide",
    options.random,
  );
  const platforms = [safeRoute];
  let previous = safeRoute;
  const branchLayers = treasureBranchLayers(safeLayer);
  for (const [index, layer] of branchLayers.entries()) {
    const isHost = index === branchLayers.length - 1;
    const width = isHost
      ? Math.max(
        HIGH_PLATFORM_TREASURE_CONFIG.host.minimumWidth,
        platformWidth("wide", options.random),
      )
      : platformWidth("normal", options.random);
    const next = options.makePlatform(
      0,
      layerY(layer, options.random),
      width,
      options.vx,
      false,
      false,
      isHost ? "wide" : "normal",
      options.random,
    );
    const gap = reachableStepGap(
      previous.baseY,
      next.baseY,
      next.w,
      options.canReachNextPlatform,
      options.random,
    );
    next.x = previous.x + previous.w + gap;
    platforms.push(next);
    previous = next;
  }
  const treasureHost = platforms[platforms.length - 1];
  treasureHost.reservedForTreasure = true;
  placeRoutePastBlockers(
    platforms,
    options.firstX,
    options.existingPlatforms,
    options.platformsOverlap,
  );

  return { platforms, treasureHost };
}
