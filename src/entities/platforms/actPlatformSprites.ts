import {
  ACT_PLATFORM_SPRITES,
  PLATFORM_CONFIG,
  PLATFORM_SPRITES,
  type PlatformSpriteSheet,
} from "../../constants";

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
): PlatformSpriteRef {
  const pool = platformSpritePoolForAct(act, kind);
  const candidates = pool.themed.length > 0
    && Math.random() < PLATFORM_CONFIG.themedSpriteChance
    ? pool.themed
    : pool.common;

  return candidates.reduce((best, current) => {
    const bestWidth = best.sheet.regions[best.regionIndex].sw * best.sheet.drawScale;
    const currentWidth = current.sheet.regions[current.regionIndex].sw * current.sheet.drawScale;
    return Math.abs(currentWidth - width) < Math.abs(bestWidth - width) ? current : best;
  }, candidates[0]);
}
