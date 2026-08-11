import { describe, expect, it } from "vitest";

import { FALLING_LEAF_SHEETS, TORII_SPRITES } from "./scenery";

describe("falling leaf sprite sheets", () => {
  it("keeps four tree-matched leaf families on the same tumble contract", () => {
    expect(Object.keys(FALLING_LEAF_SHEETS)).toEqual([
      "pine",
      "willow",
      "broadleaf",
      "bamboo",
    ]);

    expect(Object.values(FALLING_LEAF_SHEETS)).toEqual([
      expect.objectContaining({
        src: "assets/sprites/scenery/weather/falling-leaf-pine-tumble.png",
        frameW: 24,
        frameH: 24,
        count: 8,
      }),
      expect.objectContaining({
        src: "assets/sprites/scenery/weather/falling-leaf-willow-tumble.png",
        frameW: 24,
        frameH: 24,
        count: 8,
      }),
      expect.objectContaining({
        src: "assets/sprites/scenery/weather/falling-leaf-broadleaf-tumble.png",
        frameW: 24,
        frameH: 24,
        count: 8,
      }),
      expect.objectContaining({
        src: "assets/sprites/scenery/weather/falling-leaf-bamboo-tumble.png",
        frameW: 24,
        frameH: 24,
        count: 8,
      }),
    ]);
  });
});

describe("torii sprite regions", () => {
  it("maps all twelve high-definition torii variants in the 3072x2048 atlas", () => {
    expect(TORII_SPRITES.variants).toEqual([
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
    ]);
  });

  it("does not reuse source pixels across variants", () => {
    const overlaps: string[] = [];

    for (const [index, region] of TORII_SPRITES.variants.entries()) {
      for (const [otherIndex, otherRegion] of TORII_SPRITES.variants.entries()) {
        if (otherIndex <= index) continue;

        const overlapsHorizontally =
          region.sx < otherRegion.sx + otherRegion.sw &&
          otherRegion.sx < region.sx + region.sw;
        const overlapsVertically =
          region.sy < otherRegion.sy + otherRegion.sh &&
          otherRegion.sy < region.sy + region.sh;

        if (overlapsHorizontally && overlapsVertically) {
          overlaps.push(`${index}-${otherIndex}`);
        }
      }
    }

    expect(overlaps).toEqual([]);
  });
});
