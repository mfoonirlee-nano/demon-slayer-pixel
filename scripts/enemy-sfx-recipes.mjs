/* eslint-disable no-magic-numbers -- Named DSP recipes are numeric signal specifications. */

export function createEnemySfxSpecs({
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
}) {
  return [
    sound("enemyDefeat", 0.52, -5, (samples, rng) => {
      mixTaiko(samples, rng, { duration: 0.2, frequency: 82, gain: 0.5 });
      mixRasp(samples, rng, { start: 0.015, duration: 0.22, frequency: 145, gain: 0.42 });
      mixPaper(samples, rng, { start: 0.09, duration: 0.32, gain: 0.34 });
      mixCrackedBell(samples, rng, { start: 0.1, duration: 0.4, baseFrequency: 196, gain: 0.13 });
      mixDarkEcho(samples, { delay: 0.085, gain: 0.08, cutoff: 1_600 });
    }),
    sound("enemyWarning", 0.22, -6, (samples, rng) => {
      mixBreath(samples, rng, { duration: 0.15, gain: 0.26, lowCutoff: 320, cutoff: 1_400, contour: rise(1.25) });
      mixWood(samples, rng, { start: 0.105, duration: 0.08, frequency: 340, gain: 0.52 });
      mixWood(samples, rng, { start: 0.165, duration: 0.05, frequency: 430, gain: 0.3 });
    }),
    sound("enemyLunge", 0.27, -3, (samples, rng) => {
      mixNoise(samples, rng, { duration: 0.24, gain: 0.46, color: "band", lowCutoff: 150, cutoff: 1_100, endCutoff: 1_700, contour: swell, release: 0.035 });
      mixRasp(samples, rng, { start: 0.015, duration: 0.2, frequency: 150, gain: 0.26 });
      mixWood(samples, rng, { start: 0.11, duration: 0.13, frequency: 220, gain: 0.48 });
    }),
    sound("enemyDash", 0.25, -3, (samples, rng) => {
      mixBreath(samples, rng, { duration: 0.22, gain: 0.34, lowCutoff: 180, cutoff: 1_300, endLowCutoff: 540, endCutoff: 2_500, contour: swell });
      mixTaiko(samples, rng, { start: 0.025, duration: 0.14, frequency: 100, gain: 0.38 });
      mixWood(samples, rng, { start: 0.03, duration: 0.09, frequency: 190, gain: 0.42 });
      mixWood(samples, rng, { start: 0.115, duration: 0.09, frequency: 160, gain: 0.34 });
    }),
    sound("enemySlash", 0.21, -2.5, (samples, rng) => {
      mixNoise(samples, rng, { duration: 0.072, gain: 0.22, color: "band", lowCutoff: 900, cutoff: 4_500, endLowCutoff: 2_200, endCutoff: 7_200, attack: 0.002, release: 0.018, contour: swell });
      mixDullIron(samples, rng, { start: 0.018, duration: 0.17, baseFrequency: 620, gain: 0.52 });
      mixOscillator(samples, { start: 0.01, duration: 0.12, frequency: 2_100, endFrequency: 780, gain: 0.18, wave: "triangle", attack: 0.001, release: 0.035, decay: 2.2 });
      mixDryPluck(samples, rng, { start: 0.026, duration: 0.13, frequency: 980, gain: 0.16 });
    }),
    sound("enemyCastStart", 0.56, -6.8, (samples, rng) => {
      mixBreath(samples, rng, { duration: 0.5, gain: 0.25, lowCutoff: 170, cutoff: 1_350, endCutoff: 2_200, contour: rise(0.75) });
      mixDryPluck(samples, rng, { start: 0.08, duration: 0.22, frequency: 165, gain: 0.25 });
      mixDryPluck(samples, rng, { start: 0.25, duration: 0.22, frequency: 196, gain: 0.21 });
      mixNoise(samples, rng, { start: 0.2, duration: 0.24, gain: 0.18, color: "band", lowCutoff: 520, cutoff: 2_500, contour: swell });
      mixCrackedBell(samples, rng, { start: 0.31, duration: 0.23, baseFrequency: 260, gain: 0.13 });
      mixDarkEcho(samples, { delay: 0.075, gain: 0.07, cutoff: 1_900 });
    }),
    sound("enemyCastRelease", 0.38, -2, (samples, rng) => {
      mixTaiko(samples, rng, { duration: 0.26, frequency: 88, gain: 0.46 });
      mixNoise(samples, rng, { duration: 0.27, gain: 0.5, color: "band", lowCutoff: 220, cutoff: 2_400, endLowCutoff: 520, endCutoff: 3_400, decay: 1.5 });
      mixWood(samples, rng, { start: 0.018, duration: 0.12, frequency: 240, gain: 0.28 });
      mixCrackedBell(samples, rng, { start: 0.04, duration: 0.31, baseFrequency: 320, gain: 0.16 });
      mixDarkEcho(samples, { delay: 0.07, gain: 0.08, cutoff: 2_100 });
    }),
    sound("enemyTalismanCastStart", 0.56, -5.7, (samples, rng) => {
      mixPaper(samples, rng, { duration: 0.46, gain: 0.32 });
      mixBreath(samples, rng, { duration: 0.43, gain: 0.18, lowCutoff: 180, cutoff: 1_200, contour: rise(0.9) });
      mixDryPluck(samples, rng, { start: 0.12, duration: 0.2, frequency: 147, gain: 0.24 });
      mixDryPluck(samples, rng, { start: 0.31, duration: 0.2, frequency: 175, gain: 0.2 });
      mixCrackedBell(samples, rng, { start: 0.32, duration: 0.22, baseFrequency: 220, gain: 0.11 });
      mixDarkEcho(samples, { delay: 0.08, gain: 0.06, cutoff: 1_700 });
    }),
    sound("enemyTalismanCastRelease", 0.38, -2.5, (samples, rng) => {
      mixPaper(samples, rng, { duration: 0.26, gain: 0.62 });
      mixWood(samples, rng, { start: 0.014, duration: 0.13, frequency: 270, gain: 0.42 });
      mixDryPluck(samples, rng, { start: 0.02, duration: 0.25, frequency: 118, gain: 0.23 });
      mixCrackedBell(samples, rng, { start: 0.065, duration: 0.28, baseFrequency: 245, gain: 0.12 });
      mixDarkEcho(samples, { delay: 0.075, gain: 0.07, cutoff: 1_800 });
    }),
    sound("enemyCurseTick", 0.26, -5, (samples, rng) => {
      mixPaper(samples, rng, { duration: 0.12, gain: 0.36 });
      mixWood(samples, rng, { duration: 0.1, frequency: 260, gain: 0.28 });
      mixRasp(samples, rng, { start: 0.02, duration: 0.16, frequency: 125, gain: 0.2 });
      mixCrackedBell(samples, rng, { start: 0.025, duration: 0.22, baseFrequency: 190, gain: 0.13 });
    }),
    sound("enemyShieldGuard", 0.22, -6, (samples, rng) => {
      mixTaiko(samples, rng, { duration: 0.18, frequency: 92, gain: 0.3 });
      mixWood(samples, rng, { duration: 0.13, frequency: 175, gain: 0.66 });
      mixDullIron(samples, rng, { start: 0.006, duration: 0.2, baseFrequency: 190, gain: 0.24 });
    }),
    sound("enemyShieldBash", 0.42, -1.3, (samples, rng) => {
      mixBreath(samples, rng, { duration: 0.16, gain: 0.18, lowCutoff: 120, cutoff: 900, contour: rise(1.2) });
      mixTaiko(samples, rng, { start: 0.065, duration: 0.33, frequency: 72, gain: 1 });
      mixWood(samples, rng, { start: 0.07, duration: 0.25, frequency: 150, gain: 0.52 });
      mixDullIron(samples, rng, { start: 0.075, duration: 0.31, baseFrequency: 180, gain: 0.22 });
    }),
    sound("enemyShieldBreak", 0.68, -1.05, (samples, rng) => {
      mixTaiko(samples, rng, { duration: 0.34, frequency: 76, gain: 0.58 });
      mixWood(samples, rng, { duration: 0.19, frequency: 175, gain: 0.64 });
      mixWood(samples, rng, { start: 0.07, duration: 0.17, frequency: 230, gain: 0.5 });
      mixWood(samples, rng, { start: 0.15, duration: 0.15, frequency: 305, gain: 0.4 });
      mixWood(samples, rng, { start: 0.24, duration: 0.13, frequency: 390, gain: 0.3 });
      mixDullIron(samples, rng, { start: 0.018, duration: 0.58, baseFrequency: 170, gain: 0.36 });
      mixNoise(samples, rng, { start: 0.08, duration: 0.38, gain: 0.34, color: "band", lowCutoff: 420, cutoff: 3_100, decay: 1.8 });
      mixDarkEcho(samples, { delay: 0.085, gain: 0.07, cutoff: 1_600 });
    }),
    sound("enemyCleave", 0.42, -2, (samples, rng) => {
      mixBlade(samples, rng, { duration: 0.34, baseFrequency: 260, gain: 0.62 });
      mixTaiko(samples, rng, { start: 0.115, duration: 0.27, frequency: 74, gain: 0.5 });
      mixDullIron(samples, rng, { start: 0.12, duration: 0.25, baseFrequency: 235, gain: 0.17 });
    }),
    sound("enemyDive", 0.38, -3, (samples, rng) => {
      mixNoise(samples, rng, { duration: 0.075, gain: 0.28, color: "band", lowCutoff: 120, cutoff: 950, decay: 1.8 });
      mixNoise(samples, rng, { start: 0.07, duration: 0.08, gain: 0.31, color: "band", lowCutoff: 140, cutoff: 1_100, decay: 1.8 });
      mixNoise(samples, rng, { start: 0.145, duration: 0.09, gain: 0.34, color: "band", lowCutoff: 170, cutoff: 1_250, decay: 1.8 });
      mixBreath(samples, rng, { start: 0.1, duration: 0.25, gain: 0.36, lowCutoff: 200, cutoff: 1_300, endLowCutoff: 720, endCutoff: 2_500, contour: swell });
      mixRasp(samples, rng, { start: 0.13, duration: 0.21, frequency: 220, gain: 0.18, endRatio: 0.78 });
    }),
    sound("enemyLeap", 0.33, -5, (samples, rng) => {
      mixBreath(samples, rng, { duration: 0.24, gain: 0.28, lowCutoff: 160, cutoff: 1_150, endCutoff: 1_800, contour: rise(1.1) });
      mixWood(samples, rng, { duration: 0.12, frequency: 145, gain: 0.36 });
      mixWood(samples, rng, { start: 0.13, duration: 0.11, frequency: 195, gain: 0.32 });
      mixTaiko(samples, rng, { start: 0.19, duration: 0.12, frequency: 102, gain: 0.3 });
    }),
    sound("enemyImpact", 0.46, -1.05, (samples, rng) => {
      mixTaiko(samples, rng, { duration: 0.39, frequency: 64, gain: 1 });
      mixNoise(samples, rng, { duration: 0.36, gain: 0.58, color: "low", cutoff: 760, decay: 1.6 });
      mixNoise(samples, rng, { start: 0.012, duration: 0.29, gain: 0.36, color: "band", lowCutoff: 260, cutoff: 2_200, decay: 2.1 });
      mixWood(samples, rng, { start: 0.014, duration: 0.15, frequency: 185, gain: 0.42 });
      mixWood(samples, rng, { start: 0.11, duration: 0.09, frequency: 480, gain: 0.2 });
      mixWood(samples, rng, { start: 0.18, duration: 0.08, frequency: 620, gain: 0.15 });
    }),
    sound("enemySplit", 0.6, -2, (samples, rng) => {
      mixPaper(samples, rng, { duration: 0.4, gain: 0.62 });
      mixWood(samples, rng, { start: 0.035, duration: 0.17, frequency: 230, gain: 0.48 });
      mixRasp(samples, rng, { start: 0.1, duration: 0.31, frequency: 170, gain: 0.27 });
      mixRasp(samples, rng, { start: 0.23, duration: 0.3, frequency: 215, gain: 0.23, endRatio: 0.86 });
      mixDarkEcho(samples, { delay: 0.095, gain: 0.1, cutoff: 1_800 });
    }),
    sound("enemyBirth", 0.34, -7, (samples, rng) => {
      mixBreath(samples, rng, { duration: 0.25, gain: 0.3, lowCutoff: 180, cutoff: 1_300, contour: rise(0.8) });
      mixPaper(samples, rng, { start: 0.1, duration: 0.18, gain: 0.25 });
      mixDryPluck(samples, rng, { start: 0.08, duration: 0.2, frequency: 130, gain: 0.18 });
      mixWood(samples, rng, { start: 0.24, duration: 0.08, frequency: 300, gain: 0.22 });
    }),
    sound("enemyAura", 0.92, -4.2, (samples, rng) => {
      mixOscillator(samples, { duration: 0.86, frequency: 82, gain: 0.1, wave: "sine", contour: swell, release: 0.08 });
      mixCrackedBell(samples, rng, { start: 0.035, duration: 0.78, baseFrequency: 230, gain: 0.3 });
      mixTaiko(samples, rng, { start: 0.07, duration: 0.22, frequency: 86, gain: 0.28 });
      mixTaiko(samples, rng, { start: 0.34, duration: 0.2, frequency: 80, gain: 0.23 });
      mixTaiko(samples, rng, { start: 0.61, duration: 0.18, frequency: 74, gain: 0.18 });
      mixWood(samples, rng, { start: 0.08, duration: 0.12, frequency: 210, gain: 0.22 });
      mixWood(samples, rng, { start: 0.35, duration: 0.11, frequency: 190, gain: 0.18 });
      mixWood(samples, rng, { start: 0.62, duration: 0.1, frequency: 170, gain: 0.14 });
      mixDarkEcho(samples, { delay: 0.09, gain: 0.08, cutoff: 1_800 });
    }),
    sound("enemyBurrow", 0.58, -5, (samples, rng) => {
      mixNoise(samples, rng, { duration: 0.53, gain: 0.52, color: "brown", decay: 0.6, release: 0.07 });
      mixNoise(samples, rng, { duration: 0.49, gain: 0.38, color: "band", lowCutoff: 90, cutoff: 950, endLowCutoff: 180, endCutoff: 650, contour: swell });
      mixTaiko(samples, rng, { duration: 0.28, frequency: 90, gain: 0.24 });
      mixWood(samples, rng, { start: 0.09, duration: 0.07, frequency: 470, gain: 0.18 });
      mixWood(samples, rng, { start: 0.22, duration: 0.07, frequency: 540, gain: 0.16 });
      mixWood(samples, rng, { start: 0.39, duration: 0.06, frequency: 620, gain: 0.13 });
    }),
    sound("enemyEmerge", 0.52, -1.3, (samples, rng) => {
      mixNoise(samples, rng, { duration: 0.17, gain: 0.34, color: "low", cutoff: 620, contour: rise(1.2), release: 0.012 });
      mixNoise(samples, rng, { start: 0.13, duration: 0.34, gain: 0.58, color: "band", lowCutoff: 170, cutoff: 2_700, decay: 1.7 });
      mixTaiko(samples, rng, { start: 0.14, duration: 0.34, frequency: 68, gain: 0.92 });
      mixWood(samples, rng, { start: 0.155, duration: 0.13, frequency: 210, gain: 0.42 });
      mixWood(samples, rng, { start: 0.24, duration: 0.09, frequency: 500, gain: 0.22 });
      mixWood(samples, rng, { start: 0.33, duration: 0.08, frequency: 680, gain: 0.16 });
    }),
    sound("enemyHurt", 0.12, -5.5, (samples, rng) => {
      mixNoise(samples, rng, {
        duration: 0.026,
        gain: 0.42,
        color: "band",
        lowCutoff: 950,
        cutoff: 5_200,
        endLowCutoff: 700,
        endCutoff: 3_600,
        attack: 0.001,
        release: 0.01,
        decay: 3.2,
      });
      mixOscillator(samples, {
        start: 0.002,
        duration: 0.082,
        frequency: 420,
        endFrequency: 240,
        gain: 0.5,
        wave: "triangle",
        attack: 0.001,
        release: 0.024,
        decay: 2.1,
      });
      mixNoise(samples, rng, {
        start: 0.002,
        duration: 0.076,
        gain: 0.38,
        color: "band",
        lowCutoff: 260,
        cutoff: 2_400,
        endLowCutoff: 360,
        endCutoff: 1_500,
        attack: 0.001,
        release: 0.024,
        decay: 2,
      });
    }),
  ];
}
