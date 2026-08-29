import type { PlatformSpriteSheet } from "./scenery";

const ACT_PLATFORM_REGION_BOUNDS = [
  { sx: 0, sy: 0, sw: 80, sh: 64 },
  { sx: 96, sy: 0, sw: 160, sh: 96 },
  { sx: 272, sy: 0, sw: 272, sh: 128 },
] as const;

type ActPlatformSurfaceYs = {
  chain: number;
  normal: number;
  wide: number;
};

function createActPlatformSheet(
  src: string,
  surfaceYs: ActPlatformSurfaceYs,
): PlatformSpriteSheet {
  return {
    src,
    image: null,
    drawScale: 0.75,
    // Decorations may start higher; these rows mark the first stable, player-wide material band.
    regions: [
      { ...ACT_PLATFORM_REGION_BOUNDS[0], surfaceY: surfaceYs.chain },
      { ...ACT_PLATFORM_REGION_BOUNDS[1], surfaceY: surfaceYs.normal },
      { ...ACT_PLATFORM_REGION_BOUNDS[2], surfaceY: surfaceYs.wide },
    ],
    chain: [0],
    normal: [1],
    wide: [2],
  };
}

export const ACT_PLATFORM_SPRITES: Record<number, PlatformSpriteSheet> = {
  1: createActPlatformSheet("assets/sprites/platform/acts/act-01-spider-string.png", {
    chain: 12, normal: 15, wide: 11,
  }),
  2: createActPlatformSheet("assets/sprites/platform/acts/act-02-mist-bone.png", {
    chain: 8, normal: 9, wide: 8,
  }),
  3: createActPlatformSheet("assets/sprites/platform/acts/act-03-mirror-dream.png", {
    chain: 8, normal: 11, wide: 14,
  }),
  4: createActPlatformSheet("assets/sprites/platform/acts/act-04-fang-gale.png", {
    chain: 6, normal: 7, wide: 8,
  }),
  5: createActPlatformSheet("assets/sprites/platform/acts/act-05-lantern-ember.png", {
    chain: 7, normal: 7, wide: 7,
  }),
  6: createActPlatformSheet("assets/sprites/platform/acts/act-06-dead-bell.png", {
    chain: 9, normal: 11, wide: 20,
  }),
  7: createActPlatformSheet("assets/sprites/platform/acts/act-07-spider-string-awakened.png", {
    chain: 8, normal: 9, wide: 9,
  }),
  8: createActPlatformSheet("assets/sprites/platform/acts/act-08-mist-bone-awakened.png", {
    chain: 6, normal: 9, wide: 8,
  }),
  9: createActPlatformSheet("assets/sprites/platform/acts/act-09-mirror-dream-awakened.png", {
    chain: 10, normal: 10, wide: 10,
  }),
  10: createActPlatformSheet("assets/sprites/platform/acts/act-10-fang-gale-awakened.png", {
    chain: 5, normal: 5, wide: 5,
  }),
  11: createActPlatformSheet("assets/sprites/platform/acts/act-11-lantern-ember-awakened.png", {
    chain: 5, normal: 5, wide: 5,
  }),
  12: createActPlatformSheet("assets/sprites/platform/acts/act-12-dead-bell-awakened.png", {
    chain: 7, normal: 8, wide: 9,
  }),
  13: createActPlatformSheet("assets/sprites/platform/acts/act-13-blood-moon-many-faces.png", {
    chain: 5, normal: 6, wide: 6,
  }),
};
