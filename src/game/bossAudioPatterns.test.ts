import { describe, expect, it } from "vitest";
import type { GameSfx } from "./audioTypes";
import { bossDeadBellSfxPattern, DEAD_BELL_SFX_MIN_GAPS } from "./bossAudioPatterns";

const DEAD_BELL_SFX = [
  "bossDeadBellCast",
  "bossDeadBellLowToll",
  "bossDeadBellHighToll",
  "bossDeadBellBlade",
  "bossDeadBellSilence",
  "bossDeadBellReprisal",
  "bossDeadBellBreak",
  "bossDeadBellDeath",
] as const satisfies readonly GameSfx[];

describe("Dead Bell audio patterns", () => {
  it("provides deterministic oscillator fallbacks and min gaps for every dedicated cue", () => {
    for (const sfx of DEAD_BELL_SFX) {
      expect(bossDeadBellSfxPattern(sfx)).not.toBeNull();
      expect(DEAD_BELL_SFX_MIN_GAPS[sfx]).toBeGreaterThan(0);
    }
  });

  it("keeps the low and high tolls in distinct pitch registers", () => {
    const lowToll = bossDeadBellSfxPattern("bossDeadBellLowToll")!;
    const highToll = bossDeadBellSfxPattern("bossDeadBellHighToll")!;
    const highestLowFrequency = Math.max(...lowToll.map(({ frequency }) => frequency));
    const lowestHighFrequency = Math.min(...highToll.map(({ frequency }) => frequency));

    expect(highestLowFrequency).toBeLessThan(lowestHighFrequency);
  });
});
