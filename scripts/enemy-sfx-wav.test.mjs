/* eslint-disable no-magic-numbers -- RIFF/WAV tests assert fixed binary field offsets. */

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { measureAndValidatePcm } from "./enemy-sfx-wav.mjs";

const PCM_MAX = 32_767;
const PEAK_LIMIT = Math.floor(PCM_MAX * 0.89);
const PCM_SAMPLE_COUNT = 8;
const WAV_HEADER_BYTES = 44;
const SAMPLE_RATE = 48_000;
const PLAYER_ATTACK_TAIL_START_SECONDS = 0.16;
const PLAYER_ATTACK_MAX_TAIL_ENERGY_RATIO = 0.1;
const PLAYER_SFX_DIRECTORY = path.join(process.cwd(), "assets/audio/sfx/players");
const EXPECTED_PLAYER_SFX_FILES = [
  "playerAttackHit.wav",
  "playerAttackStart.wav",
  "playerBossHit.wav",
  "playerCounter.wav",
  "playerDeath.wav",
  "playerFallAttackImpact.wav",
  "playerFallAttackStart.wav",
  "playerHurt.wav",
  "playerJump.wav",
  "playerLand.wav",
  "playerRunStep.wav",
  "playerSkillArc.wav",
  "playerSkillArmorBreak.wav",
  "playerSkillArmorBreakImpact.wav",
  "playerSkillCast.wav",
  "playerSkillDash.wav",
  "playerSkillGuard.wav",
  "playerSkillLine.wav",
  "playerSkillRain.wav",
  "playerSkillReturningBlade.wav",
  "playerSkillReturningBladeCatch.wav",
  "playerSkillReturningBladeTurn.wav",
  "playerSkillVerticalWave.wav",
  "playerSkillVortex.wav",
  "playerStatusStun.wav",
  "playerUltimateAfterimage.wav",
  "playerUltimateCast.wav",
  "playerUltimateEnd.wav",
  "playerUltimateImpact.wav",
];

function decodePcm16(wav) {
  const dataBytes = wav.readUInt32LE(40);
  const pcm = new Int16Array(dataBytes / 2);
  for (let index = 0; index < pcm.length; index += 1) {
    pcm[index] = wav.readInt16LE(WAV_HEADER_BYTES + index * 2);
  }
  return pcm;
}

function measureEnergyRatioAfter(pcm, startSeconds) {
  const tailStart = Math.floor(startSeconds * SAMPLE_RATE);
  let totalEnergy = 0;
  let tailEnergy = 0;

  for (let index = 0; index < pcm.length; index += 1) {
    const energy = pcm[index] * pcm[index];
    totalEnergy += energy;
    if (index >= tailStart) tailEnergy += energy;
  }

  return tailEnergy / totalEnergy;
}

describe("SFX WAV validation", () => {
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

  it("ships every player cue as a valid WAV", () => {
    const files = readdirSync(PLAYER_SFX_DIRECTORY).filter((file) => file.endsWith(".wav")).sort();
    expect(files).toEqual([...EXPECTED_PLAYER_SFX_FILES].sort());

    for (const file of files) {
      const wav = readFileSync(path.join(PLAYER_SFX_DIRECTORY, file));
      expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
      expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
      expect(wav.readUInt16LE(20)).toBe(1);
      expect(wav.readUInt16LE(22)).toBe(1);
      expect(wav.readUInt32LE(24)).toBe(SAMPLE_RATE);
      expect(wav.readUInt16LE(34)).toBe(16);
      expect(wav.length).toBe(WAV_HEADER_BYTES + wav.readUInt32LE(40));

      const metrics = measureAndValidatePcm(file, decodePcm16(wav), PCM_MAX, PEAK_LIMIT);
      expect(metrics.rmsDb).toBeGreaterThan(-35);
    }
  });

  it("keeps the basic attack cue front-loaded like a sword swing", () => {
    const wav = readFileSync(path.join(PLAYER_SFX_DIRECTORY, "playerAttackStart.wav"));
    const pcm = decodePcm16(wav);
    const tailEnergyRatio = measureEnergyRatioAfter(pcm, PLAYER_ATTACK_TAIL_START_SECONDS);

    expect(tailEnergyRatio).toBeLessThanOrEqual(PLAYER_ATTACK_MAX_TAIL_ENERGY_RATIO);
  });
});
