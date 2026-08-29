import type { SpriteSheet } from "../../types/assets";
import type { FallingLeafKind } from "../treeFoliage";

type SpriteRegion = { sx: number; sy: number; sw: number; sh: number };
type TreeSpriteCatalog = {
  sourceScale: number;
  sheets: Array<{
    src: string;
    image: HTMLImageElement | null;
    variants: SpriteRegion[];
  }>;
};
export type PlatformSpriteRegion = SpriteRegion & {
  /** First stable material row used as the platform's visual standing surface. */
  surfaceY: number;
};
export type PlatformSpriteSheet = {
  src: string;
  image: HTMLImageElement | null;
  drawScale: number;
  regions: PlatformSpriteRegion[];
  chain: number[];
  normal: number[];
  wide: number[];
};
export type GroundTileRegion = SpriteRegion & { surfaceY: number };
export type GroundTileSetKey = "forest" | "forestToShrine" | "shrine" | "shrineToForest";
export type GroundTilePatternKey = GroundTileSetKey;
export type GroundTilePatternEntry = {
  set: GroundTileSetKey;
  regionIndex?: number;
  blend?: {
    set: GroundTileSetKey;
    alpha: number;
  };
};
type GroundTileSet = {
  src: string;
  image: HTMLImageElement | null;
  occlusionSrc: string;
  occlusionImage: HTMLImageElement | null;
  occlusionRegions?: GroundTileRegion[];
  regions: GroundTileRegion[];
};

const GROUND_TILE_VISIBLE_BUFFER_TILES = 8;
const GROUND_TILE_TRANSITION_FRAME_COUNT = 4;
const GROUND_TILE_TRANSITION_SCROLL_TILES = (
  GROUND_TILE_VISIBLE_BUFFER_TILES + GROUND_TILE_TRANSITION_FRAME_COUNT
);
const GROUND_TILE_SIZE = 150;
const GROUND_TILE_SCROLL_SPEED = 48;
const GROUND_TILE_EARLY_STONE_BLEND_ALPHA = 0.2;
const GROUND_TILE_MID_STONE_BLEND_ALPHA = 0.5;
const GROUND_TILE_LATE_STONE_BLEND_ALPHA = 0.85;
const GROUND_TILE_TRANSITION_SECONDS = (
  GROUND_TILE_TRANSITION_SCROLL_TILES * GROUND_TILE_SIZE / GROUND_TILE_SCROLL_SPEED
);
// Shrine base has 8 regions while its occlusion layer has 7. The looping
// pattern must cover their shared period or the occlusion layer jumps at wrap.
const GROUND_TILE_SHRINE_LOOP_TILES = 56;

function repeatedGroundTiles(set: GroundTileSetKey, count: number): GroundTilePatternEntry[] {
  return Array.from({ length: count }, () => ({ set }));
}

export const STAR_SPRITES: {
  src: string;
  image: HTMLImageElement | null;
  variants: SpriteRegion[];
} = {
  src: "assets/sprites/background/stars.png",
  image: null,
  variants: [
    { sx: 277, sy: 83, sw: 110, sh: 109 },
    { sx: 621, sy: 39, sw: 120, sh: 188 },
    { sx: 266, sy: 292, sw: 132, sh: 150 },
    { sx: 603, sy: 292, sw: 155, sh: 156 },
  ],
};

export const COVER_MOON_PHASE_SPRITES: {
  src: string;
  image: HTMLImageElement | null;
  frameW: number;
  frameH: number;
  frames: number;
} = {
  src: "assets/sprites/ui/cover/moon.png",
  image: null,
  frameW: 160,
  frameH: 160,
  frames: 8,
};

export const FALLING_LEAF_SHEETS: Record<FallingLeafKind, SpriteSheet> = {
  pine: {
    src: "assets/sprites/scenery/weather/falling-leaf-pine-tumble.png",
    frameW: 24,
    frameH: 24,
    count: 8,
    image: null,
  },
  willow: {
    src: "assets/sprites/scenery/weather/falling-leaf-willow-tumble.png",
    frameW: 24,
    frameH: 24,
    count: 8,
    image: null,
  },
  broadleaf: {
    src: "assets/sprites/scenery/weather/falling-leaf-broadleaf-tumble.png",
    frameW: 24,
    frameH: 24,
    count: 8,
    image: null,
  },
  bamboo: {
    src: "assets/sprites/scenery/weather/falling-leaf-bamboo-tumble.png",
    frameW: 24,
    frameH: 24,
    count: 8,
    image: null,
  },
};

export const TREE_SPRITES: TreeSpriteCatalog = {
  sourceScale: 2,
  sheets: [
    {
      src: "assets/sprites/tree/tree_sprites.png",
      image: null,
      variants: [
        { sx: 88, sy: 9, sw: 390, sh: 527 },
        { sx: 1554, sy: 14, sw: 459, sh: 488 },
        { sx: 1038, sy: 6, sw: 483, sh: 530 },
        { sx: 2582, sy: 31, sw: 385, sh: 465 },
        { sx: 2100, sy: 54, sw: 421, sh: 442 },
        { sx: 563, sy: 66, sw: 430, sh: 468 },
        { sx: 69, sy: 529, sw: 415, sh: 471 },
        { sx: 1572, sy: 529, sw: 426, sh: 438 },
        { sx: 2094, sy: 541, sw: 399, sh: 424 },
        { sx: 2554, sy: 534, sw: 442, sh: 431 },
        { sx: 550, sy: 554, sw: 432, sh: 443 },
        { sx: 1030, sy: 619, sw: 469, sh: 367 },
        { sx: 1096, sy: 1044, sw: 367, sh: 490 },
        { sx: 35, sy: 1031, sw: 361, sh: 480 },
        { sx: 2077, sy: 1054, sw: 432, sh: 420 },
        { sx: 419, sy: 1076, sw: 643, sh: 430 },
        { sx: 1599, sy: 1098, sw: 380, sh: 376 },
        { sx: 2584, sy: 1181, sw: 442, sh: 290 },
        { sx: 1049, sy: 1525, sw: 449, sh: 466 },
        { sx: 2072, sy: 1536, sw: 437, sh: 450 },
        { sx: 598, sy: 1541, sw: 346, sh: 440 },
        { sx: 1580, sy: 1693, sw: 388, sh: 292 },
        { sx: 2583, sy: 1720, sw: 445, sh: 266 },
        { sx: 2, sy: 1724, sw: 484, sh: 257 },
      ],
    },
  ],
};

export const TALL_TREE_SPRITES: TreeSpriteCatalog = {
  sourceScale: 2,
  sheets: [
    {
      src: "assets/sprites/tree/tree_tall_sprites.png",
      image: null,
      variants: [
        { sx: 0, sy: 0, sw: 768, sh: 1024 },
        { sx: 768, sy: 0, sw: 768, sh: 1024 },
        { sx: 1536, sy: 0, sw: 768, sh: 1024 },
        { sx: 2304, sy: 0, sw: 768, sh: 1024 },
      ],
    },
  ],
};

export const CLOUD_SPRITES: Record<"big" | "small", {
  src: string;
  image: HTMLImageElement | null;
}> = {
  big: {
    src: "assets/sprites/cloud/cloud_big.png",
    image: null,
  },
  small: {
    src: "assets/sprites/cloud/cloud_small.png",
    image: null,
  },
};


export const STONE_TOWER_SPRITES: {
  src: string;
  image: HTMLImageElement | null;
  variants: SpriteRegion[];
} = {
  src: "assets/sprites/background/stone_tower_sprites2.png",
  image: null,
  variants: [
    { sx: 8, sy: 8, sw: 160, sh: 278 },
    { sx: 182, sy: 11, sw: 152, sh: 272 },
    { sx: 348, sy: 17, sw: 140, sh: 259 },
    { sx: 502, sy: 22, sw: 174, sh: 250 },
    { sx: 690, sy: 26, sw: 196, sh: 242 },
    { sx: 900, sy: 31, sw: 122, sh: 232 },
    { sx: 8, sy: 300, sw: 178, sh: 238 },
    { sx: 200, sy: 306, sw: 188, sh: 226 },
    { sx: 402, sy: 307, sw: 180, sh: 223 },
    { sx: 596, sy: 301, sw: 149, sh: 235 },
    { sx: 759, sy: 304, sw: 183, sh: 230 },
    { sx: 956, sy: 305, sw: 176, sh: 228 },
  ],
};

export const STONE_TOWER_SMALL_SPRITES: {
  src: string;
  image: HTMLImageElement | null;
  variants: SpriteRegion[];
} = {
  src: "assets/sprites/background/stone_tower_sprites.png",
  image: null,
  variants: [
    { sx: 8, sy: 8, sw: 167, sh: 210 },
    { sx: 189, sy: 10, sw: 179, sh: 206 },
    { sx: 382, sy: 15, sw: 157, sh: 195 },
    { sx: 553, sy: 16, sw: 168, sh: 193 },
    { sx: 8, sy: 238, sw: 158, sh: 207 },
    { sx: 180, sy: 243, sw: 220, sh: 197 },
    { sx: 414, sy: 232, sw: 207, sh: 220 },
    { sx: 635, sy: 236, sw: 158, sh: 212 },
  ],
};

export const TORII_SPRITES: {
  src: string;
  image: HTMLImageElement | null;
  variants: SpriteRegion[];
} = {
  src: "assets/sprites/background/torii_sprites.png",
  image: null,
  variants: [
    { sx: 146, sy: 148, sw: 542, sh: 528 },
    { sx: 866, sy: 128, sw: 602, sh: 548 },
    { sx: 1638, sy: 132, sw: 532, sh: 544 },
    { sx: 2332, sy: 154, sw: 590, sh: 522 },
    { sx: 144, sy: 802, sw: 572, sh: 456 },
    { sx: 932, sy: 812, sw: 432, sh: 446 },
    { sx: 1636, sy: 920, sw: 480, sh: 338 },
    { sx: 2360, sy: 772, sw: 544, sh: 486 },
    { sx: 112, sy: 1386, sw: 628, sh: 530 },
    { sx: 870, sy: 1430, sw: 566, sh: 486 },
    { sx: 1522, sy: 1438, sw: 620, sh: 478 },
    { sx: 2204, sy: 1386, sw: 798, sh: 530 },
  ],
};

// 3 mountain range strips (stacked vertically). Index 0 = farthest/smallest,
// index 2 = closest/tallest (has pine silhouettes at base).
export const MOUNTAIN_SPRITES: {
  src: string;
  image: HTMLImageElement | null;
  variants: SpriteRegion[];
} = {
  src: "assets/sprites/background/mountains.png",
  image: null,
  variants: [
    { sx: 14, sy: 82, sw: 1639, sh: 175 },   // far
    { sx: 6, sy: 308, sw: 1659, sh: 223 },   // mid
    { sx: 6, sy: 562, sw: 1660, sh: 318 },   // near (pines at base)
  ],
};

// 4 ground strip variants (stacked vertically). Intended to progress
// lush → withered → frozen as the player nears the boss.
export const GROUND_SPRITES: {
  src: string;
  image: HTMLImageElement | null;
  variants: SpriteRegion[];
} = {
  src: "assets/sprites/background/ground_sprites.png",
  image: null,
  variants: [
    { sx: 82, sy: 137, sw: 1519, sh: 75 },  // grass-topped dirt (lush)
    { sx: 84, sy: 328, sw: 1516, sh: 77 },  // gray stone (barren)
    { sx: 80, sy: 539, sw: 1520, sh: 77 },  // dirt + dead grass (withering)
    { sx: 75, sy: 731, sw: 1524, sh: 83 },  // icy blue (hostile)
  ],
};

export const GROUND_TILE_SPRITES: {
  tileSize: number;
  drawOffsetY: number;
  scrollSpeed: number;
  bossApproachTransitionTiles: number;
  bossExitTransitionTiles: number;
  bossExitTransitionSeconds: number;
  minBossApproachTransitionSeconds: number;
  patterns: Record<GroundTilePatternKey, GroundTilePatternEntry[]>;
  sets: Record<GroundTileSetKey, GroundTileSet>;
} = {
  tileSize: GROUND_TILE_SIZE,
  drawOffsetY: -10,
  scrollSpeed: GROUND_TILE_SCROLL_SPEED,
  bossApproachTransitionTiles: GROUND_TILE_TRANSITION_SCROLL_TILES,
  bossExitTransitionTiles: GROUND_TILE_TRANSITION_SCROLL_TILES,
  bossExitTransitionSeconds: GROUND_TILE_TRANSITION_SECONDS,
  minBossApproachTransitionSeconds: 1.5,
  patterns: {
    forest: [
      { set: "forest" }, { set: "forest" }, { set: "forest" }, { set: "forest" },
      { set: "forest" }, { set: "forest" }, { set: "forest" }, { set: "forest" },
    ],
    forestToShrine: [
      ...repeatedGroundTiles("forest", GROUND_TILE_VISIBLE_BUFFER_TILES),
      { set: "forestToShrine", regionIndex: 0 },
      {
        set: "forestToShrine",
        regionIndex: 1,
        blend: { set: "shrine", alpha: GROUND_TILE_EARLY_STONE_BLEND_ALPHA },
      },
      {
        set: "forestToShrine",
        regionIndex: 2,
        blend: { set: "shrine", alpha: GROUND_TILE_MID_STONE_BLEND_ALPHA },
      },
      {
        set: "forestToShrine",
        regionIndex: 3,
        blend: { set: "shrine", alpha: GROUND_TILE_LATE_STONE_BLEND_ALPHA },
      },
      ...repeatedGroundTiles("shrine", GROUND_TILE_VISIBLE_BUFFER_TILES),
    ],
    shrine: [
      ...repeatedGroundTiles("shrine", GROUND_TILE_SHRINE_LOOP_TILES),
    ],
    shrineToForest: [
      ...repeatedGroundTiles("shrine", GROUND_TILE_VISIBLE_BUFFER_TILES),
      { set: "shrineToForest", regionIndex: 0 },
      { set: "shrineToForest", regionIndex: 1 },
      { set: "shrineToForest", regionIndex: 2 },
      { set: "shrineToForest", regionIndex: 3 },
      ...repeatedGroundTiles("forest", GROUND_TILE_VISIBLE_BUFFER_TILES),
    ],
  },
  sets: {
    forest: {
      src: "assets/sprites/ground/moon_forest_ground_base.png",
      image: null,
      occlusionSrc: "assets/sprites/ground/moon_forest_ground_occlusion.png",
      occlusionImage: null,
      regions: [
        { sx: 0, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 150, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 300, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 450, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 600, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 750, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 900, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 1050, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
      ],
    },
    forestToShrine: {
      src: "assets/sprites/ground/moon_forest_to_shrine_transition_base.png",
      image: null,
      occlusionSrc: "assets/sprites/ground/moon_forest_to_shrine_transition_occlusion.png",
      occlusionImage: null,
      regions: [
        { sx: 0, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 150, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 300, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 450, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
      ],
    },
    shrine: {
      src: "assets/sprites/ground/moon_shrine_stone_base.png",
      image: null,
      occlusionSrc: "assets/sprites/ground/moon_shrine_stone_occlusion.png",
      occlusionImage: null,
      occlusionRegions: [
        { sx: 0, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 150, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 300, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 450, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 600, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 750, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 900, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
      ],
      regions: [
        { sx: 0, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 150, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 300, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 450, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 600, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 750, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 900, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 1050, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
      ],
    },
    shrineToForest: {
      src: "assets/sprites/ground/moon_shrine_to_forest_transition_base.png",
      image: null,
      occlusionSrc: "assets/sprites/ground/moon_shrine_to_forest_transition_occlusion.png",
      occlusionImage: null,
      regions: [
        { sx: 0, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 150, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 300, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
        { sx: 450, sy: 0, sw: 150, sh: 150, surfaceY: 24 },
      ],
    },
  },
};

const PLATFORM_VARIANT_GROUPS = {
  chain: {
    chain01: 4,
    chain02: 6,
    chain03: 7,
    chain04: 8,
    chain05: 10,
    chain06: 12,
    chain07: 13,
    chain08: 16,
    chain09: 17,
    chain10: 19,
    chain11: 25,
    chain12: 29,
  },
  normal: {
    normal01: 0,
    normal02: 5,
    normal03: 9,
    normal04: 11,
    normal05: 14,
    normal06: 15,
    normal07: 18,
    normal08: 20,
    normal09: 22,
    normal10: 23,
    normal11: 24,
    normal12: 26,
  },
  wide: {
    wide01: 1,
    wide02: 2,
    wide03: 3,
    wide04: 21,
    wide05: 27,
    wide06: 28,
  },
} as const;

export const PLATFORM_SPRITES: PlatformSpriteSheet = {
  src: "assets/sprites/platform/platform.png",
  image: null,
  drawScale: 0.75,
  regions: [
    { sx: 28, sy: 54, sw: 142, sh: 67, surfaceY: 15 },
    { sx: 196, sy: 28, sw: 212, sh: 119, surfaceY: 40 },
    { sx: 434, sy: 45, sw: 200, sh: 85, surfaceY: 8 },
    { sx: 660, sy: 49, sw: 186, sh: 77, surfaceY: 8 },
    { sx: 872, sy: 73, sw: 60, sh: 28, surfaceY: 6 },
    { sx: 958, sy: 47, sw: 142, sh: 81, surfaceY: 16 },
    { sx: 28, sy: 184, sw: 58, sh: 50, surfaceY: 12 },
    { sx: 112, sy: 186, sw: 73, sh: 45, surfaceY: 8 },
    { sx: 211, sy: 190, sw: 60, sh: 37, surfaceY: 9 },
    { sx: 297, sy: 177, sw: 104, sh: 64, surfaceY: 24 },
    { sx: 427, sy: 193, sw: 56, sh: 31, surfaceY: 6 },
    { sx: 509, sy: 169, sw: 163, sh: 80, surfaceY: 8 },
    { sx: 28, sy: 290, sw: 77, sh: 52, surfaceY: 15 },
    { sx: 131, sy: 294, sw: 74, sh: 43, surfaceY: 7 },
    { sx: 231, sy: 278, sw: 121, sh: 75, surfaceY: 27 },
    { sx: 378, sy: 271, sw: 155, sh: 90, surfaceY: 26 },
    { sx: 559, sy: 293, sw: 81, sh: 46, surfaceY: 6 },
    { sx: 666, sy: 297, sw: 48, sh: 37, surfaceY: 8 },
    { sx: 28, sy: 398, sw: 131, sh: 79, surfaceY: 10 },
    { sx: 185, sy: 415, sw: 60, sh: 45, surfaceY: 16 },
    { sx: 271, sy: 405, sw: 151, sh: 65, surfaceY: 16 },
    { sx: 448, sy: 383, sw: 190, sh: 110, surfaceY: 38 },
    { sx: 664, sy: 403, sw: 145, sh: 70, surfaceY: 7 },
    { sx: 835, sy: 398, sw: 110, sh: 80, surfaceY: 38 },
    { sx: 28, sy: 556, sw: 134, sh: 73, surfaceY: 12 },
    { sx: 188, sy: 570, sw: 61, sh: 45, surfaceY: 9 },
    { sx: 275, sy: 546, sw: 140, sh: 93, surfaceY: 40 },
    { sx: 441, sy: 539, sw: 237, sh: 108, surfaceY: 24 },
    { sx: 704, sy: 515, sw: 404, sh: 156, surfaceY: 15 },
    { sx: 1134, sy: 573, sw: 50, sh: 39, surfaceY: 12 },
  ],
  chain: Object.values(PLATFORM_VARIANT_GROUPS.chain),
  normal: Object.values(PLATFORM_VARIANT_GROUPS.normal),
  wide: Object.values(PLATFORM_VARIANT_GROUPS.wide),
};

// Top row: rocks, grass, bushes (standalone clutter)
// Bottom row: stone tile patches (flat ground decorations)
export const FOREGROUND_SPRITES: {
  src: string;
  image: HTMLImageElement | null;
  decor: SpriteRegion[];
  patches: SpriteRegion[];
} = {
  src: "assets/sprites/background/foreground_sprites.png",
  image: null,
  decor: [
    { sx: 56, sy: 16, sw: 137, sh: 96 },
    { sx: 240, sy: 36, sw: 165, sh: 71 },
    { sx: 450, sy: 27, sw: 154, sh: 85 },
    { sx: 651, sy: 34, sw: 84, sh: 78 },
    { sx: 767, sy: 37, sw: 90, sh: 79 },
    { sx: 891, sy: 35, sw: 97, sh: 76 },
    { sx: 1019, sy: 45, sw: 89, sh: 69 },
    { sx: 1183, sy: 49, sw: 94, sh: 63 },
    { sx: 1294, sy: 47, sw: 85, sh: 67 },
    { sx: 1407, sy: 39, sw: 127, sh: 72 },
    { sx: 1575, sy: 42, sw: 125, sh: 72 },
    { sx: 1739, sy: 30, sw: 119, sh: 80 },
  ],
  patches: [
    { sx: 54, sy: 156, sw: 161, sh: 54 },
    { sx: 264, sy: 153, sw: 174, sh: 60 },
    { sx: 488, sy: 152, sw: 208, sh: 61 },
    { sx: 750, sy: 150, sw: 213, sh: 67 },
    { sx: 1016, sy: 144, sw: 198, sh: 69 },
    { sx: 1263, sy: 149, sw: 130, sh: 64 },
    { sx: 1432, sy: 149, sw: 151, sh: 65 },
    { sx: 1619, sy: 152, sw: 104, sh: 58 },
    { sx: 1760, sy: 152, sw: 109, sh: 60 },
  ],
};
