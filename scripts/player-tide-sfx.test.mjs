import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PLAYER_COMBAT } from "../src/constants/combat";
import { PLAYER_ULTIMATE_WINDUP_SECONDS } from "./player-tide-sfx-recipes.mjs";

const SAMPLE_RATE = 48000;
const AMPLITUDE_DB_SCALE = 20;
const FRAMES_PER_SECOND = 60;
const PCM_HEADER_BYTES = 44;
const SAMPLE_BYTES = 2;
const TEST = { minImpactAdvantageDb: 2, minCounterAdvantageDb: 3, maxAfterimageDuration: 0.2, minAfterimageHeadroomDb: 3 };
function metrics(name) {
  const wav = readFileSync(`assets/audio/sfx/players/${name}.wav`);
  const samples = new Int16Array(wav.buffer, wav.byteOffset + PCM_HEADER_BYTES, (wav.length - PCM_HEADER_BYTES) / SAMPLE_BYTES);
  let squares = 0;
  let peak = 0;
  for (const sample of samples) { squares += sample * sample; peak = Math.max(peak, Math.abs(sample)); }
  return { duration: samples.length / SAMPLE_RATE, rms: Math.sqrt(squares / samples.length), peak };
}
const dbRatio = (a, b) => AMPLITUDE_DB_SCALE * Math.log10(a / b);

describe("moon tide SFX timing and mix", () => {
  it("finishes the generated windup at the actual opening frame", () => {
    const openingSeconds = Math.floor(PLAYER_COMBAT.ultimateCastFrames * PLAYER_COMBAT.ultimateEffectSpawnRatio) / FRAMES_PER_SECOND;
    expect(PLAYER_ULTIMATE_WINDUP_SECONDS).toBe(openingSeconds);
    expect(metrics("playerUltimateCast").duration).toBeCloseTo(openingSeconds);
  });
  it("keeps the opening stronger than windup and frequent afterimages short and quieter", () => {
    const opening = metrics("playerUltimateImpact");
    const windup = metrics("playerUltimateCast");
    const afterimage = metrics("playerUltimateAfterimage");
    expect(dbRatio(opening.rms, windup.rms)).toBeGreaterThanOrEqual(TEST.minImpactAdvantageDb);
    expect(afterimage.duration).toBeLessThanOrEqual(TEST.maxAfterimageDuration);
    expect(dbRatio(opening.peak, afterimage.peak)).toBeGreaterThanOrEqual(TEST.minAfterimageHeadroomDb);
  });
  it("makes successful guard counter distinct from merely activating protection", () => {
    expect(dbRatio(metrics("playerCounter").rms, metrics("playerSkillGuard").rms)).toBeGreaterThanOrEqual(TEST.minCounterAdvantageDb);
  });
});
