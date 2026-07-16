import type { PlatformSpriteSheet } from "./scenery";

const ACT_PLATFORM_REGIONS = [
  { sx: 0, sy: 0, sw: 80, sh: 64, surfaceY: 4 },
  { sx: 96, sy: 0, sw: 160, sh: 96, surfaceY: 4 },
  { sx: 272, sy: 0, sw: 272, sh: 128, surfaceY: 4 },
] as const;

function createActPlatformSheet(src: string): PlatformSpriteSheet {
  return {
    src,
    image: null,
    drawScale: 0.75,
    regions: [...ACT_PLATFORM_REGIONS],
    chain: [0],
    normal: [1],
    wide: [2],
  };
}

export const ACT_PLATFORM_SPRITES: Record<number, PlatformSpriteSheet> = {
  1: createActPlatformSheet("assets/sprites/platform/acts/act-01-spider-string.png"),
  2: createActPlatformSheet("assets/sprites/platform/acts/act-02-mist-bone.png"),
  3: createActPlatformSheet("assets/sprites/platform/acts/act-03-mirror-dream.png"),
  4: createActPlatformSheet("assets/sprites/platform/acts/act-04-fang-gale.png"),
  5: createActPlatformSheet("assets/sprites/platform/acts/act-05-lantern-ember.png"),
  6: createActPlatformSheet("assets/sprites/platform/acts/act-06-dead-bell.png"),
  7: createActPlatformSheet("assets/sprites/platform/acts/act-07-spider-string-awakened.png"),
  8: createActPlatformSheet("assets/sprites/platform/acts/act-08-mist-bone-awakened.png"),
  9: createActPlatformSheet("assets/sprites/platform/acts/act-09-mirror-dream-awakened.png"),
  10: createActPlatformSheet("assets/sprites/platform/acts/act-10-fang-gale-awakened.png"),
  11: createActPlatformSheet("assets/sprites/platform/acts/act-11-lantern-ember-awakened.png"),
  12: createActPlatformSheet("assets/sprites/platform/acts/act-12-dead-bell-awakened.png"),
  13: createActPlatformSheet("assets/sprites/platform/acts/act-13-blood-moon-many-faces.png"),
};
