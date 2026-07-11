import { describe, expect, it } from "vitest";

import { TORII_SPRITES } from "./scenery";

const BOTTOM_ROW_START_INDEX = 8;

describe("torii sprite regions", () => {
  it("keeps each bottom-row torii inside its own six-pixel gutter", () => {
    expect(TORII_SPRITES.variants.slice(BOTTOM_ROW_START_INDEX)).toEqual([
      { sx: 56, sy: 693, sw: 314, sh: 265 },
      { sx: 435, sy: 715, sw: 283, sh: 243 },
      { sx: 761, sy: 719, sw: 310, sh: 239 },
      { sx: 1102, sy: 693, sw: 399, sh: 265 },
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
