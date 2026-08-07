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
  sound,
}) {
  return [
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
