/* eslint-disable no-magic-numbers -- DSP recipes are numeric signal specifications. */

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createBossSfxSpecs } from "./boss-sfx-recipes.mjs";
import { createEnemySfxSpecs } from "./enemy-sfx-recipes.mjs";
import { encodeMonoPcm16Wav, measureAndValidatePcm } from "./enemy-sfx-wav.mjs";
import { createPlayerSfxSpecs } from "./player-sfx-recipes.mjs";

const SAMPLE_RATE = 48_000;
const BITS_PER_SAMPLE = 16;
const PCM_MAX = 32_767;
const PEAK_LIMIT_RATIO = 0.89;
const PEAK_LIMIT = Math.floor(PCM_MAX * PEAK_LIMIT_RATIO);
const TWO_PI = Math.PI * 2;
const BASE_SEED = 0x4d4f4f4e;
const EXPECTED_SOUND_COUNT = 67;
const START_FADE_SECONDS = 0.001;
const END_FADE_SECONDS = 0.012;
const MIN_PEAK_SPREAD_DB = 4;
const CAST_RELEASE_RMS_ADVANTAGE_DB = 2;
const IMPACT_RMS_ADVANTAGE_DB = 3;
const PLAYER_HIT_RMS_ADVANTAGE_DB = 1;
const DEAD_BELL_REPRISAL_RMS_ADVANTAGE_DB = 4;
const OUTPUT_DIRECTORY = path.join(process.cwd(), "assets/audio/sfx");

const rise = (power) => (progress) => Math.pow(progress, power);
const swell = (progress) => Math.sin(Math.PI * progress);

const RECIPE_TOOLS = {
  mixBlade,
  mixBreath,
  mixCrackedBell,
  mixDarkEcho,
  mixDryPluck,
  mixDullIron,
  mixNoise,
  mixOscillator,
  mixPaper,
  mixRasp,
  mixTaiko,
  mixWood,
  rise,
  sound,
  swell,
};
const SOUND_SPECS = [
  ...createBossSfxSpecs(RECIPE_TOOLS),
  ...createEnemySfxSpecs(RECIPE_TOOLS),
  ...createPlayerSfxSpecs(RECIPE_TOOLS),
];

function sound(name, duration, peakDb, render) {
  return { name, duration, peakDb, render };
}

function mixOscillator(samples, options) {
  const {
    start = 0,
    duration,
    frequency,
    endFrequency = frequency,
    gain,
    wave = "sine",
    attack = 0.004,
    release = 0.04,
    decay = 1,
    contour,
    phaseOffset = 0,
  } = options;
  const startIndex = toSample(start);
  const sampleCount = Math.min(toSample(duration), samples.length - startIndex);
  const attackSamples = toSample(attack);
  const releaseSamples = toSample(release);
  let phase = phaseOffset * TWO_PI;

  for (let index = 0; index < sampleCount; index += 1) {
    const progress = sampleCount === 1 ? 1 : index / (sampleCount - 1);
    const currentFrequency = exponentialLerp(frequency, endFrequency, progress);
    phase += TWO_PI * currentFrequency / SAMPLE_RATE;
    const shape = contour ? contour(progress) : Math.pow(1 - progress, decay);
    const envelope = edgeEnvelope(index, sampleCount, attackSamples, releaseSamples);
    samples[startIndex + index] += oscillatorSample(phase, wave) * gain * shape * envelope;
  }
}

function mixNoise(samples, rng, options) {
  const {
    start = 0,
    duration,
    gain,
    color = "white",
    cutoff = 1_000,
    lowCutoff = 120,
    endCutoff = cutoff,
    endLowCutoff = lowCutoff,
    attack = 0.003,
    release = 0.04,
    decay = 1,
    contour,
  } = options;
  const startIndex = toSample(start);
  const sampleCount = Math.min(toSample(duration), samples.length - startIndex);
  const attackSamples = toSample(attack);
  const releaseSamples = toSample(release);
  let highLowPass = 0;
  let lowLowPass = 0;
  let brown = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const progress = sampleCount === 1 ? 1 : index / (sampleCount - 1);
    const white = rng() * 2 - 1;
    const highAlpha = onePoleAlpha(exponentialLerp(cutoff, endCutoff, progress));
    const lowAlpha = onePoleAlpha(exponentialLerp(lowCutoff, endLowCutoff, progress));
    highLowPass += highAlpha * (white - highLowPass);
    lowLowPass += lowAlpha * (white - lowLowPass);
    brown = brown * 0.985 + white * 0.015;
    const value = coloredNoise(color, white, highLowPass, lowLowPass, brown);
    const shape = contour ? contour(progress) : Math.pow(1 - progress, decay);
    const envelope = edgeEnvelope(index, sampleCount, attackSamples, releaseSamples);
    samples[startIndex + index] += value * gain * shape * envelope;
  }
}

function mixTaiko(samples, rng, options) {
  const { start = 0, duration, frequency, gain } = options;
  mixOscillator(samples, {
    start,
    duration,
    frequency,
    endFrequency: frequency * 0.8,
    gain,
    wave: "sine",
    attack: 0.001,
    release: Math.min(0.09, duration * 0.4),
    decay: 2.4,
  });
  mixOscillator(samples, {
    start,
    duration: duration * 0.72,
    frequency: frequency * 1.52,
    endFrequency: frequency * 1.36,
    gain: gain * 0.15,
    wave: "sine",
    attack: 0.001,
    release: Math.min(0.055, duration * 0.3),
    decay: 3.2,
  });
  mixNoise(samples, rng, {
    start,
    duration: Math.min(duration, 0.13),
    gain: gain * 0.22,
    color: "low",
    cutoff: 820,
    attack: 0.001,
    release: 0.045,
    decay: 2.8,
  });
}

function mixWood(samples, rng, options) {
  const { start = 0, duration, frequency, gain } = options;
  const partials = [
    [1, 1],
    [2.07, 0.32],
    [3.31, 0.15],
  ];

  mixNoise(samples, rng, {
    start,
    duration: Math.min(0.026, duration),
    gain: gain * 0.35,
    color: "band",
    lowCutoff: 620,
    cutoff: 3_200,
    attack: 0.001,
    release: 0.012,
    decay: 3.8,
  });

  for (let index = 0; index < partials.length; index += 1) {
    const [ratio, partialGain] = partials[index];
    mixOscillator(samples, {
      start,
      duration: duration * (1 - index * 0.18),
      frequency: frequency * ratio,
      gain: gain * partialGain,
      wave: "sine",
      attack: 0.001,
      release: Math.min(0.035, duration * 0.35),
      decay: 3.2 + index * 0.7,
      phaseOffset: ratio,
    });
  }
}

function mixDullIron(samples, rng, options) {
  const { start = 0, duration, baseFrequency, gain } = options;
  const partials = [
    [1, 1, 1],
    [1.38, 0.45, 0.76],
    [1.91, 0.25, 0.55],
    [2.57, 0.12, 0.38],
  ];

  mixNoise(samples, rng, {
    start,
    duration: Math.min(0.035, duration),
    gain: gain * 0.5,
    color: "band",
    lowCutoff: 360,
    cutoff: 3_100,
    attack: 0.001,
    release: 0.018,
    decay: 3,
  });

  for (const [ratio, partialGain, durationScale] of partials) {
    mixOscillator(samples, {
      start,
      duration: duration * durationScale,
      frequency: baseFrequency * ratio,
      endFrequency: baseFrequency * ratio * (0.985 + ratio * 0.002),
      gain: gain * partialGain,
      wave: "sine",
      attack: 0.001,
      release: Math.min(0.065, duration * durationScale * 0.35),
      decay: 2.1 + ratio * 0.45,
      phaseOffset: ratio * 0.37,
    });
  }
}

function mixCrackedBell(samples, rng, options) {
  const { start = 0, duration, baseFrequency, gain } = options;
  const partials = [
    [1, 1, 1],
    [1.437, 0.48, 0.82],
    [2.02, 0.26, 0.58],
    [2.79, 0.12, 0.4],
  ];

  mixNoise(samples, rng, {
    start,
    duration: Math.min(0.022, duration),
    gain: gain * 0.34,
    color: "band",
    lowCutoff: 720,
    cutoff: 4_200,
    attack: 0.001,
    release: 0.012,
    decay: 3.6,
  });

  for (const [ratio, partialGain, durationScale] of partials) {
    mixOscillator(samples, {
      start,
      duration: duration * durationScale,
      frequency: baseFrequency * ratio,
      endFrequency: baseFrequency * ratio * (0.995 - partialGain * 0.006),
      gain: gain * partialGain,
      wave: "sine",
      attack: 0.001,
      release: Math.min(0.08, duration * durationScale * 0.3),
      decay: 1.7 + ratio * 0.35,
      phaseOffset: ratio * 0.61,
    });
  }
}

function mixPaper(samples, rng, options) {
  const { start = 0, duration, gain } = options;
  const bursts = [
    [0, 1],
    [0.22, 0.78],
    [0.48, 0.58],
    [0.72, 0.38],
  ];

  for (const [offsetRatio, burstGain] of bursts) {
    mixNoise(samples, rng, {
      start: start + duration * offsetRatio,
      duration: Math.min(0.065, duration * 0.32),
      gain: gain * burstGain,
      color: "band",
      lowCutoff: 820,
      cutoff: 4_500,
      endLowCutoff: 1_200,
      endCutoff: 3_200,
      attack: 0.001,
      release: 0.02,
      decay: 2.4,
    });
  }
}

function mixBreath(samples, rng, options) {
  const {
    start = 0,
    duration,
    gain,
    lowCutoff = 180,
    cutoff = 1_600,
    endLowCutoff = lowCutoff,
    endCutoff = cutoff,
    contour = swell,
  } = options;
  mixNoise(samples, rng, {
    start,
    duration,
    gain,
    color: "band",
    lowCutoff,
    cutoff,
    endLowCutoff,
    endCutoff,
    contour,
    attack: 0.008,
    release: Math.min(0.04, duration * 0.25),
  });
}

function mixRasp(samples, rng, options) {
  const { start = 0, duration, frequency, gain, endRatio = 0.84 } = options;
  mixNoise(samples, rng, {
    start,
    duration,
    gain: gain * 0.55,
    color: "band",
    lowCutoff: 130,
    cutoff: 1_350,
    decay: 1.8,
    attack: 0.001,
    release: Math.min(0.035, duration * 0.3),
  });
  mixOscillator(samples, {
    start,
    duration,
    frequency,
    endFrequency: frequency * endRatio,
    gain: gain * 0.38,
    wave: "triangle",
    attack: 0.001,
    release: Math.min(0.04, duration * 0.35),
    decay: 2.1,
  });
  mixOscillator(samples, {
    start: start + 0.008,
    duration: duration * 0.75,
    frequency: frequency * 1.53,
    endFrequency: frequency * 1.53 * Math.min(0.92, endRatio + 0.05),
    gain: gain * 0.12,
    wave: "sine",
    attack: 0.001,
    release: Math.min(0.03, duration * 0.25),
    decay: 2.6,
  });
}

function mixDryPluck(samples, rng, options) {
  const { start = 0, duration, frequency, gain } = options;
  mixNoise(samples, rng, {
    start,
    duration: Math.min(0.018, duration),
    gain: gain * 0.45,
    color: "band",
    lowCutoff: 520,
    cutoff: 3_400,
    attack: 0.001,
    release: 0.01,
    decay: 4,
  });
  const partials = [[1, 1], [2.03, 0.34], [3.08, 0.14]];
  for (const [ratio, partialGain] of partials) {
    mixOscillator(samples, {
      start,
      duration: duration / Math.sqrt(ratio),
      frequency: frequency * ratio,
      gain: gain * partialGain,
      wave: "sine",
      attack: 0.001,
      release: Math.min(0.04, duration * 0.3),
      decay: 2.7 + ratio * 0.4,
      phaseOffset: ratio * 0.2,
    });
  }
}

function mixBlade(samples, rng, options) {
  const { start = 0, duration, baseFrequency, gain } = options;
  mixNoise(samples, rng, {
    start,
    duration,
    gain,
    color: "band",
    lowCutoff: 360,
    cutoff: 2_400,
    endLowCutoff: 980,
    endCutoff: 4_600,
    contour: swell,
    attack: 0.001,
    release: Math.min(0.035, duration * 0.2),
  });
  mixNoise(samples, rng, {
    start: start + 0.018,
    duration: Math.min(0.035, duration),
    gain: gain * 0.25,
    color: "band",
    lowCutoff: 1_700,
    cutoff: 4_800,
    attack: 0.001,
    release: 0.015,
    decay: 3.5,
  });
  mixDullIron(samples, rng, {
    start: start + 0.025,
    duration: duration * 0.72,
    baseFrequency,
    gain: gain * 0.2,
  });
}

function mixDarkEcho(samples, options) {
  const { delay, gain, cutoff } = options;
  const delaySamples = toSample(delay);
  const alpha = onePoleAlpha(cutoff);
  let lowPass = 0;
  for (let index = delaySamples; index < samples.length; index += 1) {
    lowPass += alpha * (samples[index - delaySamples] - lowPass);
    samples[index] += lowPass * gain;
  }
}

function finalizeSamples(samples, peakDb) {
  let mean = 0;
  for (const sample of samples) mean += sample;
  mean /= samples.length;

  const startFadeSamples = toSample(START_FADE_SECONDS);
  const endFadeSamples = toSample(END_FADE_SECONDS);
  let peak = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const startGain = smoothStep(Math.min(1, index / startFadeSamples));
    const endGain = smoothStep(Math.min(1, (samples.length - 1 - index) / endFadeSamples));
    samples[index] = (samples[index] - mean) * startGain * endGain;
    peak = Math.max(peak, Math.abs(samples[index]));
  }

  if (peak === 0) throw new Error("Generated silent sound");
  const targetPeak = Math.min(PEAK_LIMIT_RATIO, dbToRatio(peakDb));
  const scale = targetPeak / peak;
  const pcm = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    pcm[index] = Math.round(samples[index] * scale * PCM_MAX);
  }
  pcm[0] = 0;
  pcm[pcm.length - 1] = 0;
  return pcm;
}

function validateSpecs() {
  const names = new Set(SOUND_SPECS.map(({ name }) => name));
  if (SOUND_SPECS.length !== EXPECTED_SOUND_COUNT || names.size !== SOUND_SPECS.length) {
    throw new Error(`Expected exactly ${EXPECTED_SOUND_COUNT} unique sound specifications`);
  }
}

function validateMixBalance(metrics) {
  const peakValues = [...metrics.values()].map(({ peakDb }) => peakDb);
  const peakSpread = Math.max(...peakValues) - Math.min(...peakValues);
  if (peakSpread < MIN_PEAK_SPREAD_DB) {
    throw new Error(`Peak hierarchy is too flat: ${peakSpread.toFixed(2)} dB`);
  }
  validateRmsAdvantage(metrics, "enemyCastRelease", "enemyCastStart", CAST_RELEASE_RMS_ADVANTAGE_DB);
  validateRmsAdvantage(
    metrics,
    "enemyTalismanCastRelease",
    "enemyTalismanCastStart",
    CAST_RELEASE_RMS_ADVANTAGE_DB,
  );
  validateRmsAdvantage(metrics, "enemyImpact", "enemyAura", IMPACT_RMS_ADVANTAGE_DB);
  validateRmsAdvantage(metrics, "playerAttackHit", "playerAttackStart", PLAYER_HIT_RMS_ADVANTAGE_DB);
  validateRmsAdvantage(metrics, "playerFallAttackImpact", "playerFallAttackStart", IMPACT_RMS_ADVANTAGE_DB);
  validateRmsAdvantage(metrics, "playerSkillArmorBreakImpact", "playerSkillArmorBreak", CAST_RELEASE_RMS_ADVANTAGE_DB);
  validateRmsAdvantage(metrics, "playerUltimateImpact", "playerUltimateCast", CAST_RELEASE_RMS_ADVANTAGE_DB);
  validateRmsAdvantage(metrics, "bossDeadBellReprisal", "bossDeadBellSilence", DEAD_BELL_REPRISAL_RMS_ADVANTAGE_DB);
}

function validateRmsAdvantage(metrics, louderName, quieterName, minimumDb) {
  const louder = metrics.get(louderName);
  const quieter = metrics.get(quieterName);
  if (!louder || !quieter) throw new Error(`Missing mix metrics for ${louderName}/${quieterName}`);
  const advantage = louder.rmsDb - quieter.rmsDb;
  if (advantage < minimumDb) {
    throw new Error(`${louderName} is only ${advantage.toFixed(2)} dB louder than ${quieterName}`);
  }
}

function edgeEnvelope(index, sampleCount, attackSamples, releaseSamples) {
  const attack = attackSamples === 0 ? 1 : Math.min(1, index / attackSamples);
  const release = releaseSamples === 0
    ? 1
    : Math.min(1, (sampleCount - 1 - index) / releaseSamples);
  return smoothStep(attack) * smoothStep(release);
}

function oscillatorSample(phase, wave) {
  const sine = Math.sin(phase);
  if (wave === "triangle") return 2 / Math.PI * Math.asin(sine);
  return sine;
}

function coloredNoise(color, white, highLowPass, lowLowPass, brown) {
  if (color === "low") return highLowPass * 2.4;
  if (color === "band") return (highLowPass - lowLowPass) * 2.2;
  if (color === "brown") return brown * 4.5;
  return white;
}

function exponentialLerp(start, end, progress) {
  return start * Math.pow(end / start, progress);
}

function onePoleAlpha(cutoff) {
  return 1 - Math.exp(-TWO_PI * cutoff / SAMPLE_RATE);
}

function smoothStep(value) {
  return value * value * (3 - 2 * value);
}

function dbToRatio(db) {
  return Math.pow(10, db / 20);
}

function toSample(seconds) {
  return Math.max(1, Math.round(seconds * SAMPLE_RATE));
}

function seedFor(name) {
  let hash = 0x811c9dc5;
  for (const character of name) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash ^ BASE_SEED) >>> 0;
}

function createRng(initialSeed) {
  let seed = initialSeed;
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let value = seed;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4_294_967_296;
  };
}

function renderAll() {
  validateSpecs();
  mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
  let totalBytes = 0;
  const metricsByName = new Map();

  for (const spec of SOUND_SPECS) {
    const samples = new Float64Array(toSample(spec.duration));
    spec.render(samples, createRng(seedFor(spec.name)));
    const pcm = finalizeSamples(samples, spec.peakDb);
    const metrics = measureAndValidatePcm(spec.name, pcm, PCM_MAX, PEAK_LIMIT);
    metricsByName.set(spec.name, metrics);
    const wav = encodeMonoPcm16Wav(pcm, SAMPLE_RATE);
    let actorDirectory = "enemies";
    if (spec.name.startsWith("boss")) actorDirectory = "bosses";
    if (spec.name.startsWith("player")) actorDirectory = "players";
    const outputPath = path.join(OUTPUT_DIRECTORY, actorDirectory, `${spec.name}.wav`);
    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, wav);
    totalBytes += wav.length;
    const hash = createHash("sha256").update(wav).digest("hex").slice(0, 12);
    process.stdout.write(
      `${spec.name.padEnd(27)} ${spec.duration.toFixed(2)}s  peak=${metrics.peakDb.toFixed(2)} dBFS  rms=${metrics.rmsDb.toFixed(2)} dBFS  sha256=${hash}\n`,
    );
  }

  validateMixBalance(metricsByName);

  process.stdout.write(
    `Generated ${SOUND_SPECS.length} deterministic mono WAV files (${SAMPLE_RATE} Hz, ${BITS_PER_SAMPLE}-bit, ${totalBytes} bytes).\n`,
  );
}

renderAll();
