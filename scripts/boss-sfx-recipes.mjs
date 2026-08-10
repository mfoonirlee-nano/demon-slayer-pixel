/* eslint-disable no-magic-numbers -- Named DSP recipes are numeric signal specifications. */

export function createBossSfxSpecs({
  mixBlade,
  mixBreath,
  mixCrackedBell,
  mixDarkEcho,
  mixDryPluck,
  mixDullIron,
  mixNoise,
  mixRasp,
  mixTaiko,
  mixWood,
  sound,
}) {
  return [
    sound("bossDeadBellCast", 0.38, -5.2, (samples, rng) => {
      mixWood(samples, rng, {
        duration: 0.13,
        frequency: 112,
        gain: 0.38,
      });
      mixDullIron(samples, rng, {
        start: 0.015,
        duration: 0.25,
        baseFrequency: 176,
        gain: 0.48,
      });
      mixCrackedBell(samples, rng, {
        start: 0.08,
        duration: 0.22,
        baseFrequency: 238,
        gain: 0.18,
      });
    }),
    sound("bossDeadBellLowToll", 0.92, -2.2, (samples, rng) => {
      mixCrackedBell(samples, rng, {
        duration: 0.86,
        baseFrequency: 92,
        gain: 0.88,
      });
      mixDullIron(samples, rng, {
        start: 0.012,
        duration: 0.72,
        baseFrequency: 55,
        gain: 0.25,
      });
      mixNoise(samples, rng, {
        duration: 0.05,
        gain: 0.18,
        color: "low",
        cutoff: 520,
        decay: 3.4,
      });
      mixDarkEcho(samples, { delay: 0.13, gain: 0.08, cutoff: 680 });
    }),
    sound("bossDeadBellHighToll", 0.68, -3.2, (samples, rng) => {
      mixCrackedBell(samples, rng, {
        duration: 0.62,
        baseFrequency: 294,
        gain: 0.72,
      });
      mixDryPluck(samples, rng, {
        start: 0.012,
        duration: 0.22,
        frequency: 588,
        gain: 0.16,
      });
      mixDarkEcho(samples, { delay: 0.085, gain: 0.07, cutoff: 2_200 });
    }),
    sound("bossDeadBellBlade", 0.24, -2.8, (samples, rng) => {
      mixBlade(samples, rng, {
        duration: 0.21,
        baseFrequency: 360,
        gain: 0.9,
      });
      mixDullIron(samples, rng, {
        start: 0.02,
        duration: 0.14,
        baseFrequency: 183,
        gain: 0.35,
      });
      mixDryPluck(samples, rng, {
        start: 0.02,
        duration: 0.11,
        frequency: 1_240,
        gain: 0.25,
      });
    }),
    sound("bossDeadBellSilence", 0.22, -6, (samples, rng) => {
      mixDullIron(samples, rng, {
        duration: 0.1,
        baseFrequency: 142,
        gain: 0.65,
      });
      mixNoise(samples, rng, {
        duration: 0.06,
        gain: 0.2,
        color: "band",
        lowCutoff: 280,
        cutoff: 2_600,
        endLowCutoff: 90,
        endCutoff: 420,
        decay: 3.8,
      });
    }),
    sound("bossDeadBellReprisal", 0.42, -1.6, (samples, rng) => {
      mixCrackedBell(samples, rng, {
        duration: 0.32,
        baseFrequency: 196,
        gain: 0.7,
      });
      mixCrackedBell(samples, rng, {
        start: 0.004,
        duration: 0.32,
        baseFrequency: 207,
        gain: 0.6,
      });
      mixDullIron(samples, rng, {
        start: 0.015,
        duration: 0.34,
        baseFrequency: 71,
        gain: 0.45,
      });
      mixBlade(samples, rng, {
        start: 0.015,
        duration: 0.17,
        baseFrequency: 610,
        gain: 0.52,
      });
    }),
    sound("bossDeadBellBreak", 0.75, -4.5, (samples, rng) => {
      mixBreath(samples, rng, {
        start: 0.02,
        duration: 0.65,
        gain: 0.34,
        lowCutoff: 70,
        cutoff: 620,
        endLowCutoff: 45,
        endCutoff: 220,
        contour: (progress) => Math.pow(1 - progress, 1.2),
      });
      mixCrackedBell(samples, rng, {
        duration: 0.65,
        baseFrequency: 104,
        gain: 0.38,
      });
      mixDarkEcho(samples, { delay: 0.14, gain: 0.06, cutoff: 520 });
    }),
    sound("bossDeadBellDeath", 1.35, -1.05, (samples, rng) => {
      mixTaiko(samples, rng, { duration: 0.55, frequency: 43, gain: 0.85 });
      mixCrackedBell(samples, rng, {
        start: 0.008,
        duration: 0.95,
        baseFrequency: 96,
        gain: 0.75,
      });
      mixCrackedBell(samples, rng, {
        start: 0.08,
        duration: 0.7,
        baseFrequency: 103,
        gain: 0.55,
      });
      mixRasp(samples, rng, {
        start: 0.018,
        duration: 0.58,
        frequency: 124,
        gain: 0.52,
        endRatio: 0.28,
      });
      mixBlade(samples, rng, {
        start: 0.03,
        duration: 0.22,
        baseFrequency: 470,
        gain: 0.34,
      });
      mixDryPluck(samples, rng, {
        start: 0.16,
        duration: 0.22,
        frequency: 650,
        gain: 0.28,
      });
      mixDryPluck(samples, rng, {
        start: 0.31,
        duration: 0.24,
        frequency: 430,
        gain: 0.24,
      });
      mixDryPluck(samples, rng, {
        start: 0.48,
        duration: 0.28,
        frequency: 280,
        gain: 0.2,
      });
      mixBreath(samples, rng, {
        start: 0.18,
        duration: 1.02,
        gain: 0.32,
        lowCutoff: 70,
        cutoff: 900,
        endLowCutoff: 45,
        endCutoff: 260,
      });
      mixDarkEcho(samples, { delay: 0.13, gain: 0.12, cutoff: 1_100 });
    }),
    sound("bossMistBoneCast", 0.72, -4.2, (samples, rng) => {
      mixBreath(samples, rng, {
        duration: 0.62,
        gain: 0.52,
        lowCutoff: 150,
        cutoff: 1_300,
        endLowCutoff: 320,
        endCutoff: 2_700,
      });
      mixCrackedBell(samples, rng, {
        start: 0.12,
        duration: 0.5,
        baseFrequency: 392,
        gain: 0.34,
      });
      mixDryPluck(samples, rng, {
        start: 0.3,
        duration: 0.24,
        frequency: 587,
        gain: 0.22,
      });
      mixDarkEcho(samples, { delay: 0.09, gain: 0.14, cutoff: 1_700 });
    }),
    sound("bossMistBoneDart", 0.15, -6, (samples, rng) => {
      mixDryPluck(samples, rng, { duration: 0.13, frequency: 880, gain: 0.82 });
      mixBlade(samples, rng, {
        start: 0.005,
        duration: 0.1,
        baseFrequency: 510,
        gain: 0.35,
      });
    }),
    sound("bossMistBoneWarning", 0.68, -4.6, (samples, rng) => {
      mixBreath(samples, rng, {
        duration: 0.58,
        gain: 0.38,
        lowCutoff: 240,
        cutoff: 1_900,
        endLowCutoff: 130,
        endCutoff: 900,
      });
      mixCrackedBell(samples, rng, {
        start: 0.03,
        duration: 0.58,
        baseFrequency: 330,
        gain: 0.42,
      });
      mixCrackedBell(samples, rng, {
        start: 0.18,
        duration: 0.4,
        baseFrequency: 495,
        gain: 0.2,
      });
      mixDarkEcho(samples, { delay: 0.11, gain: 0.12, cutoff: 1_500 });
    }),
    sound("bossMistBoneSpike", 0.34, -2.4, (samples, rng) => {
      mixTaiko(samples, rng, { duration: 0.28, frequency: 58, gain: 0.72 });
      mixDullIron(samples, rng, {
        start: 0.004,
        duration: 0.3,
        baseFrequency: 126,
        gain: 0.7,
      });
      mixRasp(samples, rng, {
        start: 0.008,
        duration: 0.2,
        frequency: 230,
        gain: 0.42,
        endRatio: 0.42,
      });
    }),
    sound("bossMistBoneCharge", 0.62, -3, (samples, rng) => {
      mixBreath(samples, rng, {
        duration: 0.56,
        gain: 0.52,
        lowCutoff: 120,
        cutoff: 1_150,
        endLowCutoff: 480,
        endCutoff: 3_400,
      });
      mixRasp(samples, rng, {
        start: 0.06,
        duration: 0.5,
        frequency: 185,
        gain: 0.5,
        endRatio: 0.46,
      });
      mixBlade(samples, rng, {
        start: 0.14,
        duration: 0.32,
        baseFrequency: 210,
        gain: 0.3,
      });
      mixDarkEcho(samples, { delay: 0.08, gain: 0.1, cutoff: 1_100 });
    }),
    sound("bossMistBoneDeath", 1.18, -1.1, (samples, rng) => {
      mixTaiko(samples, rng, { duration: 0.58, frequency: 46, gain: 0.9 });
      mixDullIron(samples, rng, {
        start: 0.012,
        duration: 0.8,
        baseFrequency: 92,
        gain: 0.58,
      });
      mixRasp(samples, rng, {
        start: 0.018,
        duration: 0.64,
        frequency: 132,
        gain: 0.56,
        endRatio: 0.3,
      });
      mixDryPluck(samples, rng, {
        start: 0.2,
        duration: 0.35,
        frequency: 420,
        gain: 0.34,
      });
      mixDryPluck(samples, rng, {
        start: 0.37,
        duration: 0.38,
        frequency: 560,
        gain: 0.28,
      });
      mixBreath(samples, rng, {
        start: 0.18,
        duration: 0.86,
        gain: 0.4,
        lowCutoff: 100,
        cutoff: 1_100,
        endLowCutoff: 70,
        endCutoff: 420,
      });
      mixDarkEcho(samples, { delay: 0.12, gain: 0.14, cutoff: 1_300 });
    }),
    sound("bossKill", 1.25, -1.05, (samples, rng) => {
      mixTaiko(samples, rng, { duration: 0.62, frequency: 50, gain: 1 });
      mixNoise(samples, rng, { duration: 0.78, gain: 0.68, color: "low", cutoff: 760, endCutoff: 180, decay: 1.3 });
      mixRasp(samples, rng, { start: 0.018, duration: 0.58, frequency: 150, gain: 0.54, endRatio: 0.38 });
      mixDullIron(samples, rng, { start: 0.012, duration: 0.72, baseFrequency: 105, gain: 0.42 });
      mixCrackedBell(samples, rng, { start: 0.18, duration: 0.98, baseFrequency: 392, gain: 0.23 });
      mixDryPluck(samples, rng, { start: 0.34, duration: 0.38, frequency: 392, gain: 0.22 });
      mixDryPluck(samples, rng, { start: 0.54, duration: 0.4, frequency: 523, gain: 0.19 });
      mixDryPluck(samples, rng, { start: 0.76, duration: 0.4, frequency: 659, gain: 0.16 });
      mixDarkEcho(samples, { delay: 0.11, gain: 0.12, cutoff: 1_800 });
    }),
  ];
}
