import { describe, expect, it } from "vitest";
import { ACT_PLATFORM_SPRITES } from "../../constants";
import {
  platformSpritePoolForAct,
  type PlatformSpriteKind,
} from "./actPlatformSprites";

const PLATFORM_SPRITE_KINDS: PlatformSpriteKind[] = ["chain", "normal", "wide"];
const FIRST_ACT = 1;
const MATERIAL_SURFACE_Y_BY_ACT = [
  { chain: 12, normal: 15, wide: 11 },
  { chain: 8, normal: 9, wide: 8 },
  { chain: 8, normal: 11, wide: 14 },
  { chain: 6, normal: 7, wide: 8 },
  { chain: 7, normal: 7, wide: 7 },
  { chain: 9, normal: 11, wide: 20 },
  { chain: 8, normal: 9, wide: 9 },
  { chain: 6, normal: 9, wide: 8 },
  { chain: 10, normal: 10, wide: 10 },
  { chain: 5, normal: 5, wide: 5 },
  { chain: 5, normal: 5, wide: 5 },
  { chain: 7, normal: 8, wide: 9 },
  { chain: 5, normal: 6, wide: 6 },
] as const;
const THEMED_PLATFORM_SOURCES = [
  "assets/sprites/platform/acts/act-01-spider-string.png",
  "assets/sprites/platform/acts/act-02-mist-bone.png",
  "assets/sprites/platform/acts/act-03-mirror-dream.png",
  "assets/sprites/platform/acts/act-04-fang-gale.png",
  "assets/sprites/platform/acts/act-05-lantern-ember.png",
  "assets/sprites/platform/acts/act-06-dead-bell.png",
  "assets/sprites/platform/acts/act-07-spider-string-awakened.png",
  "assets/sprites/platform/acts/act-08-mist-bone-awakened.png",
  "assets/sprites/platform/acts/act-09-mirror-dream-awakened.png",
  "assets/sprites/platform/acts/act-10-fang-gale-awakened.png",
  "assets/sprites/platform/acts/act-11-lantern-ember-awakened.png",
  "assets/sprites/platform/acts/act-12-dead-bell-awakened.png",
  "assets/sprites/platform/acts/act-13-blood-moon-many-faces.png",
];

describe("platformSpritePoolForAct", () => {
  it("maps each themed sprite to its solid material landing surface", () => {
    for (const [index, expectedSurfaceYs] of MATERIAL_SURFACE_Y_BY_ACT.entries()) {
      const act = index + FIRST_ACT;

      expect(
        ACT_PLATFORM_SPRITES[act].regions.map(({ surfaceY }) => surfaceY),
      ).toEqual([
        expectedSurfaceYs.chain,
        expectedSurfaceYs.normal,
        expectedSurfaceYs.wide,
      ]);
    }
  });

  it("mixes the common platform sheet with every act theme", () => {
    for (const [index, themedSrc] of THEMED_PLATFORM_SOURCES.entries()) {
      const act = index + FIRST_ACT;
      for (const kind of PLATFORM_SPRITE_KINDS) {
        const pool = platformSpritePoolForAct(act, kind);

        expect(pool.common.every(({ sheet }) => (
          sheet.src === "assets/sprites/platform/platform.png"
        ))).toBe(true);
        expect(pool.common.every(({ spriteAct }) => spriteAct === null)).toBe(true);
        expect(pool.themed.map(({ sheet }) => sheet.src)).toEqual([themedSrc]);
        expect(pool.themed.every(({ spriteAct }) => spriteAct === act)).toBe(true);
      }
    }
  });
});
