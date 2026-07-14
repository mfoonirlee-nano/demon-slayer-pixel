import { describe, expect, it } from "vitest";

import { GROUND_Y, WIDTH } from "../constants";
import { resolveActLandmarkPlacements } from "./actLandmarks";

const FINAL_ACT = 13;
const LANDMARK_SOURCE_SIZE = 256;
const LANDMARK_VISIBLE_BOTTOM = 252;
const LANDMARK_BOTTOM_OFFSET = 6;
const EXPECTED_VISIBLE_BOTTOM_Y = GROUND_Y + LANDMARK_BOTTOM_OFFSET;
const OFFSCREEN_START_ELAPSED = 0;
const EARLY_VISIBLE_ELAPSED = 20;
const LATE_VISIBLE_ELAPSED = 40;
const OFFSCREEN_EXIT_ELAPSED = 90;
const MUCH_LATER_ELAPSED = 180;
const MAX_LANDMARK_DRAW_SIZE = 184;
const ACTS = Array.from({ length: FINAL_ACT }, (_, index) => index + 1);

describe("act landmark placements", () => {
  it.each(ACTS)("moves the Act %i landmark through the viewport once without enlarging it", (act) => {
    const start = resolveActLandmarkPlacements({
      act,
      elapsedSinceActStart: OFFSCREEN_START_ELAPSED,
    });
    const early = resolveActLandmarkPlacements({
      act,
      elapsedSinceActStart: EARLY_VISIBLE_ELAPSED,
    });
    const late = resolveActLandmarkPlacements({
      act,
      elapsedSinceActStart: LATE_VISIBLE_ELAPSED,
    });
    const exit = resolveActLandmarkPlacements({
      act,
      elapsedSinceActStart: OFFSCREEN_EXIT_ELAPSED,
    });
    const muchLater = resolveActLandmarkPlacements({
      act,
      elapsedSinceActStart: MUCH_LATER_ELAPSED,
    });

    expect(start).toEqual([]);
    expect(early).toHaveLength(1);
    expect(late).toHaveLength(1);
    expect(early[0].sprite.act).toBe(act);
    expect(early[0].x).toBeLessThan(WIDTH);
    expect(early[0].x + early[0].drawW).toBeGreaterThan(0);
    expect(late[0].x).toBeLessThan(early[0].x);
    expect(early[0].drawW).toBeLessThanOrEqual(MAX_LANDMARK_DRAW_SIZE);
    expect(early[0].drawH).toBeLessThanOrEqual(MAX_LANDMARK_DRAW_SIZE);
    expect(
      early[0].y + early[0].drawH * LANDMARK_VISIBLE_BOTTOM / LANDMARK_SOURCE_SIZE,
    ).toBe(EXPECTED_VISIBLE_BOTTOM_Y);
    expect(exit).toEqual([]);
    expect(muchLater).toEqual([]);
  });

  it("does not reuse the base landmark for an awakened act", () => {
    const base = resolveActLandmarkPlacements({
      act: 1,
      elapsedSinceActStart: EARLY_VISIBLE_ELAPSED,
    });
    const awakened = resolveActLandmarkPlacements({
      act: 7,
      elapsedSinceActStart: EARLY_VISIBLE_ELAPSED,
    });

    expect(base[0]?.sprite.bossId).toBe(awakened[0]?.sprite.bossId);
    expect(base[0]?.sprite.src).not.toBe(awakened[0]?.sprite.src);
    expect(base[0]?.sprite.form).toBe("base");
    expect(awakened[0]?.sprite.form).toBe("awakened");
  });
});
