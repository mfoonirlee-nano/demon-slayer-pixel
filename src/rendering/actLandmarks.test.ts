import { describe, expect, it } from "vitest";

import { GROUND_Y, WIDTH } from "../constants";
import { resolveActLandmarkPlacements } from "./actLandmarks";

const FINAL_ACT = 13;
const LANDMARK_SOURCE_SIZE = 256;
const LANDMARK_VISIBLE_BOTTOM = 252;
const LANDMARK_BOTTOM_OFFSET = 6;
const EXPECTED_VISIBLE_BOTTOM_Y = GROUND_Y + LANDMARK_BOTTOM_OFFSET;
const START_ELAPSED = 0;
const MID_SCROLL_ELAPSED = 50;
const LATE_SCROLL_ELAPSED = 95;
const ACTS = Array.from({ length: FINAL_ACT }, (_, index) => index + 1);
const ELAPSED_SAMPLES = [START_ELAPSED, MID_SCROLL_ELAPSED, LATE_SCROLL_ELAPSED];

describe("act landmark placements", () => {
  it.each(ACTS)("keeps the Act %i landmark visible while the scenery scrolls", (act) => {
    for (const elapsed of ELAPSED_SAMPLES) {
      const placements = resolveActLandmarkPlacements({ act, elapsed });

      expect(placements.length).toBeGreaterThan(0);
      expect(placements.every((placement) => placement.sprite.act === act)).toBe(true);
      expect(placements.some((placement) => (
        placement.x < WIDTH && placement.x + placement.drawW > 0
      ))).toBe(true);
      expect(placements.every((placement) => (
        placement.y + placement.drawH * LANDMARK_VISIBLE_BOTTOM / LANDMARK_SOURCE_SIZE
      ) === EXPECTED_VISIBLE_BOTTOM_Y)).toBe(true);
    }
  });

  it("does not reuse the base landmark for an awakened act", () => {
    const base = resolveActLandmarkPlacements({ act: 1, elapsed: 0 });
    const awakened = resolveActLandmarkPlacements({ act: 7, elapsed: 0 });

    expect(base[0]?.sprite.bossId).toBe(awakened[0]?.sprite.bossId);
    expect(base[0]?.sprite.src).not.toBe(awakened[0]?.sprite.src);
    expect(base[0]?.sprite.form).toBe("base");
    expect(awakened[0]?.sprite.form).toBe("awakened");
  });
});
