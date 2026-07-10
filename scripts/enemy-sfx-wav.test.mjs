import { describe, expect, it } from "vitest";
import { measureAndValidatePcm } from "./enemy-sfx-wav.mjs";

const PCM_MAX = 32_767;
const PEAK_LIMIT = 29_000;
const PCM_SAMPLE_COUNT = 8;

describe("enemy SFX WAV validation", () => {
  it("rejects silent and non-finite PCM", () => {
    expect(() => measureAndValidatePcm(
      "silent",
      new Int16Array(PCM_SAMPLE_COUNT),
      PCM_MAX,
      PEAK_LIMIT,
    )).toThrow("generated silent PCM");

    expect(() => measureAndValidatePcm(
      "non-finite",
      new Float64Array([0, Number.NaN, 0]),
      PCM_MAX,
      PEAK_LIMIT,
    )).toThrow("generated non-finite PCM metrics");
  });
});
