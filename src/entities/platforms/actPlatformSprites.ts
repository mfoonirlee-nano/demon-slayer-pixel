import {
  ACT_PLATFORM_SPRITES,
  MAP_GENERATION_CONFIG,
  PLATFORM_SPRITES,
  type PlatformSpriteSheet,
} from "../../constants";
import { nearestSpriteIndex } from "./helpers";

export type PlatformSpriteKind = "normal" | "chain" | "wide";

export type PlatformSpriteRef = {
  sheet: PlatformSpriteSheet;
  regionIndex: number;
  spriteAct: number | null;
};

export type ActPlatformSpritePool = {
  common: PlatformSpriteRef[];
  themed: PlatformSpriteRef[];
};

function refsForKind(
  sheet: PlatformSpriteSheet,
  kind: PlatformSpriteKind,
  spriteAct: number | null,
): PlatformSpriteRef[] {
  return sheet[kind].map((regionIndex) => ({ sheet, regionIndex, spriteAct }));
}

export function platformSpritePoolForAct(
  act: number,
  kind: PlatformSpriteKind,
): ActPlatformSpritePool {
  const themedSheet = ACT_PLATFORM_SPRITES[act];

  return {
    common: refsForKind(PLATFORM_SPRITES, kind, null),
    themed: themedSheet ? refsForKind(themedSheet, kind, act) : [],
  };
}

export function selectPlatformSpriteForAct(
  act: number,
  kind: PlatformSpriteKind,
  width: number,
  random: () => number = Math.random,
): PlatformSpriteRef {
  const pool = platformSpritePoolForAct(act, kind);
  const candidates = pool.themed.length > 0
    && random() < MAP_GENERATION_CONFIG.themedSpriteChance
    ? pool.themed
    : pool.common;
  const sheet = candidates[0].sheet;

  return {
    sheet,
    regionIndex: nearestSpriteIndex(sheet, kind, width),
    spriteAct: candidates[0].spriteAct,
  };
}
