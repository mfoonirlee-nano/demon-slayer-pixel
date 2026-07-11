import { describe, expect, it } from "vitest";
import { DASH_REPOSITION_DURATION_FRAMES } from "../src/constants/playerSkillTiming.js";
import { PLAYER_DASH_SHEATHE_START_SECONDS } from "./player-sfx-recipes.mjs";

const FRAMES_PER_SECOND = 60;

describe("player SFX recipe timing", () => {
  it("aligns the dash sheathe layer with the runtime dash finish", () => {
    expect(PLAYER_DASH_SHEATHE_START_SECONDS).toBeCloseTo(
      DASH_REPOSITION_DURATION_FRAMES / FRAMES_PER_SECOND,
    );
  });
});
