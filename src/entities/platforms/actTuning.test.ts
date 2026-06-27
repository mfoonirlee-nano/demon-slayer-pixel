import { describe, expect, it } from "vitest";
import { platformSpeedForRun } from "./actTuning";

const EARLY_BOSS_KILLS = 0;
const EARLY_ELAPSED_SECONDS = 0;
const EARLY_RANDOM_SPEED = 0;
const EARLY_EXPECTED_SPEED = 1.008;

const MID_BOSS_KILLS = 2;
const MID_ELAPSED_SECONDS = 120;
const MID_RANDOM_SPEED = 0.45;
const MID_EXPECTED_SPEED = 2.1096;

const LATE_BOSS_KILLS = 4;
const LATE_ELAPSED_SECONDS = 300;
const LATE_RANDOM_SPEED = 0.9;
const LATE_EXPECTED_SPEED = 3.2112;

describe("platformSpeedForRun", () => {
  it("keeps platform scroll speed below the previous tuning curve", () => {
    expect(platformSpeedForRun(
      EARLY_BOSS_KILLS,
      EARLY_ELAPSED_SECONDS,
      EARLY_RANDOM_SPEED,
    )).toBeCloseTo(EARLY_EXPECTED_SPEED);
    expect(platformSpeedForRun(
      MID_BOSS_KILLS,
      MID_ELAPSED_SECONDS,
      MID_RANDOM_SPEED,
    )).toBeCloseTo(MID_EXPECTED_SPEED);
    expect(platformSpeedForRun(
      LATE_BOSS_KILLS,
      LATE_ELAPSED_SECONDS,
      LATE_RANDOM_SPEED,
    )).toBeCloseTo(LATE_EXPECTED_SPEED);
  });
});
