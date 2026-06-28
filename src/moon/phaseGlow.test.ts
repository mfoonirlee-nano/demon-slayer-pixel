import { describe, expect, it } from "vitest";
import { COVER_MOON_PHASE_COUNT } from "../game/coverProgress";
import {
  MOON_BLOOD_RING_GLOW_SCALE_FLOOR,
  MOON_PHASE_GLOW_SCALES,
  getMoonBloodRingGlowScale,
  getMoonPhaseGlowScale,
} from "./phaseGlow";

const FIRST_PHASE_INDEX = 0;
const LAST_PHASE_INDEX = COVER_MOON_PHASE_COUNT - 1;
const OUT_OF_RANGE_LOW_PHASE_INDEX = -1;
const OUT_OF_RANGE_HIGH_PHASE_INDEX = 99;

describe("moon phase glow", () => {
  it("defines one glow scale per cover moon phase", () => {
    expect(MOON_PHASE_GLOW_SCALES).toHaveLength(COVER_MOON_PHASE_COUNT);
  });

  it("gets brighter as the moon waxes", () => {
    MOON_PHASE_GLOW_SCALES.forEach((scale, index) => {
      if (index === 0) return;

      expect(scale).toBeGreaterThan(MOON_PHASE_GLOW_SCALES[index - 1]);
    });
  });

  it("clamps phase glow scale to the supported phase range", () => {
    expect(getMoonPhaseGlowScale(OUT_OF_RANGE_LOW_PHASE_INDEX)).toBe(MOON_PHASE_GLOW_SCALES[FIRST_PHASE_INDEX]);
    expect(getMoonPhaseGlowScale(FIRST_PHASE_INDEX)).toBe(MOON_PHASE_GLOW_SCALES[FIRST_PHASE_INDEX]);
    expect(getMoonPhaseGlowScale(LAST_PHASE_INDEX)).toBe(MOON_PHASE_GLOW_SCALES[LAST_PHASE_INDEX]);
    expect(getMoonPhaseGlowScale(OUT_OF_RANGE_HIGH_PHASE_INDEX)).toBe(MOON_PHASE_GLOW_SCALES[LAST_PHASE_INDEX]);
  });

  it("keeps blood moon rings readable on thin moon phases", () => {
    expect(getMoonBloodRingGlowScale(FIRST_PHASE_INDEX)).toBe(MOON_BLOOD_RING_GLOW_SCALE_FLOOR);
    expect(getMoonBloodRingGlowScale(LAST_PHASE_INDEX)).toBe(MOON_PHASE_GLOW_SCALES[LAST_PHASE_INDEX]);
  });
});
