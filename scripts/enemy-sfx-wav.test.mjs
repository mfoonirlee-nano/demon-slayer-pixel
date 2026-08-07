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
const PLAYER_ATTACK_TAIL_START_SECONDS = 0.1;
const PLAYER_ATTACK_MAX_TAIL_ENERGY_RATIO = 0.15;
const ENEMY_HURT_MAX_DURATION_SECONDS = 0.13;
const ENEMY_HURT_FRONT_END_SECONDS = 0.015;
const ENEMY_HURT_MIN_FRONT_ENERGY_RATIO = 0.5;
const ENEMY_HURT_MAX_FRONT_ENERGY_RATIO = 0.8;
const ENEMY_HURT_TAIL_START_SECONDS = 0.06;
const ENEMY_HURT_MIN_BODY_ENERGY_RATIO = 0.15;
const ENEMY_HURT_MAX_TAIL_ENERGY_RATIO = 0.04;
const ENEMY_HURT_LOW_PASS_CUTOFF_HZ = 250;
const ENEMY_HURT_MAX_LOW_FREQUENCY_ENERGY_RATIO = 0.3;
const DUELIST_SLASH_MAX_DURATION_SECONDS = 0.24;
const DUELIST_SLASH_TAIL_START_SECONDS = 0.14;
const DUELIST_SLASH_MAX_TAIL_ENERGY_RATIO = 0.2;
const DUELIST_SLASH_LOW_PASS_CUTOFF_HZ = 2_500;
const DUELIST_SLASH_MIN_LOW_FREQUENCY_ENERGY_RATIO = 0.5;
const PLAYER_SKILL_LINE_MIN_DURATION_SECONDS = 0.7;
const PLAYER_SKILL_LINE_MAX_DURATION_SECONDS = 0.85;
const PLAYER_SKILL_LINE_TAIL_START_SECONDS = 0.35;
const PLAYER_SKILL_LINE_MIN_TAIL_ENERGY_RATIO = 0.12;
const PLAYER_SKILL_LINE_LOW_PASS_CUTOFF_HZ = 500;
const PLAYER_SKILL_LINE_MIN_LOW_FREQUENCY_ENERGY_RATIO = 0.5;
const PLAYER_SFX_DIRECTORY = path.join(process.cwd(), "assets/audio/sfx/players");
const ENEMY_SFX_DIRECTORY = path.join(process.cwd(), "assets/audio/sfx/enemies");
const BOSS_SFX_DIRECTORY = path.join(process.cwd(), "assets/audio/sfx/bosses");
const EXPECTED_BOSS_SFX_FILES = [
  "bossKill.wav",
  "bossMistBoneCast.wav",
  "bossMistBoneCharge.wav",
  "bossMistBoneDart.wav",
  "bossMistBoneDeath.wav",
  "bossMistBoneSpike.wav",
  "bossMistBoneWarning.wav",
];
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

function expectValidWav(filePath) {
  const wav = readFileSync(filePath);
  expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
  expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
  expect(wav.readUInt16LE(20)).toBe(1);
  expect(wav.readUInt16LE(22)).toBe(1);
  expect(wav.readUInt32LE(24)).toBe(SAMPLE_RATE);
  expect(wav.readUInt16LE(34)).toBe(16);
  expect(wav.length).toBe(WAV_HEADER_BYTES + wav.readUInt32LE(40));

  const metrics = measureAndValidatePcm(
    path.basename(filePath),
    decodePcm16(wav),
    PCM_MAX,
    PEAK_LIMIT,
  );
  expect(metrics.rmsDb).toBeGreaterThan(-35);
}

function measureEnergy(pcm) {
  let energy = 0;
  for (const sample of pcm) energy += sample * sample;
  return energy;
}

function measureEnergyRatioInRange(pcm, startSeconds, endSeconds) {
  const start = Math.floor(startSeconds * SAMPLE_RATE);
  const end = Math.min(pcm.length, Math.floor(endSeconds * SAMPLE_RATE));
  let rangeEnergy = 0;

  for (let index = start; index < end; index += 1) {
    rangeEnergy += pcm[index] * pcm[index];
  }

  return rangeEnergy / measureEnergy(pcm);
}

function measureLowPassEnergyRatio(pcm, cutoffHz) {
  const alpha = 1 - Math.exp(-2 * Math.PI * cutoffHz / SAMPLE_RATE);
  let lowPass = 0;
  let lowPassEnergy = 0;

  for (const sample of pcm) {
    lowPass += alpha * (sample - lowPass);
    lowPassEnergy += lowPass * lowPass;
  }

  return lowPassEnergy / measureEnergy(pcm);
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
      expectValidWav(path.join(PLAYER_SFX_DIRECTORY, file));
    }
  });

  it("ships every boss cue as a valid WAV", () => {
    const files = readdirSync(BOSS_SFX_DIRECTORY).filter((file) => file.endsWith(".wav")).sort();
    expect(files).toEqual(EXPECTED_BOSS_SFX_FILES);

    for (const file of files) {
      expectValidWav(path.join(BOSS_SFX_DIRECTORY, file));
    }
  });

  it("keeps the basic attack cue front-loaded like a sword swing", () => {
    const wav = readFileSync(path.join(PLAYER_SFX_DIRECTORY, "playerAttackStart.wav"));
    const pcm = decodePcm16(wav);
    const tailEnergyRatio = measureEnergyRatioInRange(
      pcm,
      PLAYER_ATTACK_TAIL_START_SECONDS,
      pcm.length / SAMPLE_RATE,
    );

    expect(tailEnergyRatio).toBeLessThanOrEqual(PLAYER_ATTACK_MAX_TAIL_ENERGY_RATIO);
  });

  it("keeps the enemy hurt cue short, bright, and punchy", () => {
    const wav = readFileSync(path.join(ENEMY_SFX_DIRECTORY, "enemyHurt.wav"));
    const pcm = decodePcm16(wav);
    const frontEnergyRatio = measureEnergyRatioInRange(pcm, 0, ENEMY_HURT_FRONT_END_SECONDS);
    const bodyEnergyRatio = measureEnergyRatioInRange(
      pcm,
      ENEMY_HURT_FRONT_END_SECONDS,
      ENEMY_HURT_TAIL_START_SECONDS,
    );

    expect.soft(pcm.length / SAMPLE_RATE).toBeLessThanOrEqual(ENEMY_HURT_MAX_DURATION_SECONDS);
    expect.soft(frontEnergyRatio).toBeGreaterThanOrEqual(ENEMY_HURT_MIN_FRONT_ENERGY_RATIO);
    expect.soft(frontEnergyRatio).toBeLessThanOrEqual(ENEMY_HURT_MAX_FRONT_ENERGY_RATIO);
    expect.soft(bodyEnergyRatio).toBeGreaterThanOrEqual(ENEMY_HURT_MIN_BODY_ENERGY_RATIO);
    expect.soft(measureEnergyRatioInRange(
      pcm,
      ENEMY_HURT_TAIL_START_SECONDS,
      pcm.length / SAMPLE_RATE,
    ))
      .toBeLessThanOrEqual(ENEMY_HURT_MAX_TAIL_ENERGY_RATIO);
    expect.soft(measureLowPassEnergyRatio(pcm, ENEMY_HURT_LOW_PASS_CUTOFF_HZ))
      .toBeLessThanOrEqual(ENEMY_HURT_MAX_LOW_FREQUENCY_ENERGY_RATIO);
  });

  it("keeps the duelist slash cue short, front-loaded, and metal-bodied", () => {
    const wav = readFileSync(path.join(ENEMY_SFX_DIRECTORY, "enemySlash.wav"));
    const pcm = decodePcm16(wav);

    expect.soft(pcm.length / SAMPLE_RATE).toBeLessThanOrEqual(
      DUELIST_SLASH_MAX_DURATION_SECONDS,
    );
    expect.soft(measureEnergyRatioInRange(
      pcm,
      DUELIST_SLASH_TAIL_START_SECONDS,
      pcm.length / SAMPLE_RATE,
    )).toBeLessThanOrEqual(DUELIST_SLASH_MAX_TAIL_ENERGY_RATIO);
    expect.soft(measureLowPassEnergyRatio(pcm, DUELIST_SLASH_LOW_PASS_CUTOFF_HZ))
      .toBeGreaterThanOrEqual(DUELIST_SLASH_MIN_LOW_FREQUENCY_ENERGY_RATIO);
  });

  it("keeps the line projectile cue long, low, and sustained like a dragon roar", () => {
    const wav = readFileSync(path.join(PLAYER_SFX_DIRECTORY, "playerSkillLine.wav"));
    const pcm = decodePcm16(wav);

    expect.soft(pcm.length / SAMPLE_RATE).toBeGreaterThanOrEqual(
      PLAYER_SKILL_LINE_MIN_DURATION_SECONDS,
    );
    expect.soft(pcm.length / SAMPLE_RATE).toBeLessThanOrEqual(
      PLAYER_SKILL_LINE_MAX_DURATION_SECONDS,
    );
    expect.soft(measureEnergyRatioInRange(
      pcm,
      PLAYER_SKILL_LINE_TAIL_START_SECONDS,
      pcm.length / SAMPLE_RATE,
    )).toBeGreaterThanOrEqual(PLAYER_SKILL_LINE_MIN_TAIL_ENERGY_RATIO);
    expect.soft(measureLowPassEnergyRatio(pcm, PLAYER_SKILL_LINE_LOW_PASS_CUTOFF_HZ))
      .toBeGreaterThanOrEqual(PLAYER_SKILL_LINE_MIN_LOW_FREQUENCY_ENERGY_RATIO);
  });
});
