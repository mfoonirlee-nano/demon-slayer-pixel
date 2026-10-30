/* eslint-disable no-magic-numbers -- Named DSP recipes are numeric signal specifications. */

import { createTideSfxSpecs } from "./player-tide-sfx-recipes.mjs";
export { PLAYER_DASH_SHEATHE_START_SECONDS } from "./player-tide-sfx-recipes.mjs";

export function createPlayerSfxSpecs(tools) {
  const {
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
  } = tools;
  return [
    ...createTideSfxSpecs(tools),
    sound("playerRunStep", 0.14, -8, (samples, rng) => {
      mixOscillator(samples, { duration: 0.055, frequency: 105, endFrequency: 72, gain: 0.06, wave: "triangle", attack: 0.001, release: 0.025, decay: 4 });
      mixNoise(samples, rng, { duration: 0.065, gain: 0.42, color: "low", cutoff: 380, endCutoff: 240, attack: 0.001, release: 0.025, decay: 4.8 });
      mixNoise(samples, rng, { start: 0.007, duration: 0.085, gain: 0.28, color: "band", lowCutoff: 190, cutoff: 1_650, endLowCutoff: 340, endCutoff: 1_050, attack: 0.001, release: 0.028, decay: 4.2 });
      mixNoise(samples, rng, { start: 0.035, duration: 0.07, gain: 0.11, color: "band", lowCutoff: 680, cutoff: 2_800, endLowCutoff: 960, endCutoff: 1_750, attack: 0.002, release: 0.03, decay: 3.6 });
    }),
    sound("playerLand", 0.3, -4.8, (samples, rng) => {
      mixTaiko(samples, rng, { duration: 0.23, frequency: 96, gain: 0.46 });
      mixNoise(samples, rng, { duration: 0.2, gain: 0.3, color: "low", cutoff: 920, decay: 2.1 });
      mixWood(samples, rng, { start: 0.018, duration: 0.13, frequency: 230, gain: 0.33 });
      mixBreath(samples, rng, { start: 0.045, duration: 0.18, gain: 0.12, lowCutoff: 420, cutoff: 2_400 });
    }),
    sound("playerAttackStart", 0.18, -6, (samples, rng) => {
      // One passing arc with a soft tide tail keeps repeated swings distinct from confirmed hits.
      mixNoise(samples, rng, { duration: 0.105, gain: 0.64, color: "band", lowCutoff: 260, cutoff: 1_800, endLowCutoff: 900, endCutoff: 5_400, attack: 0.003, release: 0.035, contour: (progress) => Math.sin(Math.PI * Math.pow(progress, 0.55)) });
      mixNoise(samples, rng, { start: 0.021, duration: 0.072, gain: 0.46, color: "band", lowCutoff: 1_600, cutoff: 6_400, endLowCutoff: 680, endCutoff: 2_800, attack: 0.003, release: 0.026, decay: 2.4 });
      mixNoise(samples, rng, { start: 0.052, duration: 0.112, gain: 0.17, color: "band", lowCutoff: 440, cutoff: 2_800, endLowCutoff: 220, endCutoff: 1_100, attack: 0.012, release: 0.045, decay: 2.2 });
      mixOscillator(samples, { start: 0.023, duration: 0.057, frequency: 2_400, endFrequency: 1_480, gain: 0.022, wave: "sine", attack: 0.003, release: 0.026, decay: 3 });
      mixOscillator(samples, { start: 0.027, duration: 0.039, frequency: 3_370, endFrequency: 2_150, gain: 0.009, wave: "sine", attack: 0.003, release: 0.022, decay: 3.5 });
    }),
    sound("playerAttackHit", 0.25, -1.05, (samples, rng) => {
      mixTaiko(samples, rng, { duration: 0.19, frequency: 106, gain: 0.4 });
      mixWood(samples, rng, { duration: 0.13, frequency: 510, gain: 0.48 });
      mixDullIron(samples, rng, { start: 0.008, duration: 0.2, baseFrequency: 610, gain: 0.2 });
      mixNoise(samples, rng, { duration: 0.16, gain: 0.34, color: "band", lowCutoff: 720, cutoff: 4_300, decay: 2.5 });
    }),
    sound("playerBossHit", 0.42, -1.05, (samples, rng) => {
      mixTaiko(samples, rng, { duration: 0.35, frequency: 70, gain: 0.86 });
      mixBlade(samples, rng, { duration: 0.22, baseFrequency: 330, gain: 0.46 });
      mixDullIron(samples, rng, { start: 0.012, duration: 0.35, baseFrequency: 270, gain: 0.34 });
      mixCrackedBell(samples, rng, { start: 0.055, duration: 0.32, baseFrequency: 420, gain: 0.1 });
    }),
    sound("playerFallAttackStart", 0.38, -5.5, (samples, rng) => {
      mixNoise(samples, rng, { duration: 0.32, gain: 0.52, color: "band", lowCutoff: 860, cutoff: 4_200, endLowCutoff: 220, endCutoff: 1_300, contour: swell });
      mixBlade(samples, rng, { start: 0.035, duration: 0.26, baseFrequency: 280, gain: 0.42 });
      mixTaiko(samples, rng, { start: 0.17, duration: 0.17, frequency: 94, gain: 0.3 });
    }),
    sound("playerFallAttackImpact", 0.62, -1.05, (samples, rng) => {
      mixTaiko(samples, rng, { duration: 0.5, frequency: 58, gain: 1 });
      mixNoise(samples, rng, { duration: 0.48, gain: 0.68, color: "low", cutoff: 780, decay: 1.5 });
      mixNoise(samples, rng, { start: 0.012, duration: 0.38, gain: 0.5, color: "band", lowCutoff: 280, cutoff: 3_600, decay: 1.9 });
      mixWood(samples, rng, { start: 0.018, duration: 0.17, frequency: 190, gain: 0.54 });
      mixWood(samples, rng, { start: 0.12, duration: 0.12, frequency: 520, gain: 0.28 });
      mixDullIron(samples, rng, { start: 0.025, duration: 0.44, baseFrequency: 230, gain: 0.28 });
      mixDarkEcho(samples, { delay: 0.09, gain: 0.07, cutoff: 1_500 });
    }),
    sound("playerSkillCast", 0.62, -5, (samples, rng) => {
      mixBreath(samples, rng, { duration: 0.54, gain: 0.24, lowCutoff: 340, cutoff: 1_900, endLowCutoff: 820, endCutoff: 3_800, contour: rise(0.72) });
      mixOscillator(samples, { start: 0.04, duration: 0.48, frequency: 294, endFrequency: 588, gain: 0.09, wave: "triangle", contour: rise(0.8), release: 0.08 });
      mixDryPluck(samples, rng, { start: 0.08, duration: 0.22, frequency: 392, gain: 0.18 });
      mixDryPluck(samples, rng, { start: 0.2, duration: 0.22, frequency: 523, gain: 0.16 });
      mixDryPluck(samples, rng, { start: 0.34, duration: 0.23, frequency: 659, gain: 0.14 });
      mixCrackedBell(samples, rng, { start: 0.32, duration: 0.27, baseFrequency: 784, gain: 0.08 });
      mixDarkEcho(samples, { delay: 0.08, gain: 0.06, cutoff: 2_600 });
    }),
    sound("playerSkillLine", 0.75, -2, (samples, rng) => {
      mixNoise(samples, rng, { start: 0.08, duration: 0.5, gain: 0.18, color: "band", lowCutoff: 550, cutoff: 2400, endLowCutoff: 260, endCutoff: 1200, contour: swell, release: 0.06 });
      mixTaiko(samples, rng, { duration: 0.3, frequency: 64, gain: 0.5 });
      mixRasp(samples, rng, { start: 0.015, duration: 0.62, frequency: 145, gain: 0.8, endRatio: 0.45 });
      mixBreath(samples, rng, { start: 0.035, duration: 0.66, gain: 0.55, lowCutoff: 120, cutoff: 1_250, endLowCutoff: 180, endCutoff: 950, contour: swell });
      mixOscillator(samples, { start: 0.02, duration: 0.58, frequency: 200, endFrequency: 75, gain: 0.2, wave: "triangle", contour: swell, release: 0.09 });
      mixDarkEcho(samples, { delay: 0.105, gain: 0.13, cutoff: 1_300 });
    }),
    sound("playerSkillArmorBreakImpact", 0.52, -1.05, (samples, rng) => {
      mixTaiko(samples, rng, { duration: 0.42, frequency: 64, gain: 0.92 });
      mixDullIron(samples, rng, { duration: 0.46, baseFrequency: 210, gain: 0.48 });
      mixWood(samples, rng, { start: 0.012, duration: 0.18, frequency: 210, gain: 0.6 });
      mixWood(samples, rng, { start: 0.07, duration: 0.15, frequency: 340, gain: 0.48 });
      mixWood(samples, rng, { start: 0.14, duration: 0.13, frequency: 520, gain: 0.34 });
      mixNoise(samples, rng, { start: 0.02, duration: 0.37, gain: 0.48, color: "band", lowCutoff: 360, cutoff: 4_100, decay: 1.8 });
      mixDarkEcho(samples, { delay: 0.08, gain: 0.07, cutoff: 1_700 });
    }),
    sound("playerSkillReturningBladeTurn", 0.34, -3.5, (samples, rng) => {
      mixNoise(samples, rng, { duration: 0.27, gain: 0.46, color: "band", lowCutoff: 1_200, cutoff: 4_600, endLowCutoff: 360, endCutoff: 2_100, contour: swell });
      mixBreath(samples, rng, { start: 0.055, duration: 0.24, gain: 0.26, lowCutoff: 280, cutoff: 1_800, endLowCutoff: 820, endCutoff: 3_700, contour: swell });
      mixDryPluck(samples, rng, { start: 0.035, duration: 0.24, frequency: 784, gain: 0.16 });
      mixDryPluck(samples, rng, { start: 0.12, duration: 0.18, frequency: 523, gain: 0.1 });
    }),
    sound("playerSkillReturningBladeCatch", 0.28, -5, (samples, rng) => {
      mixBreath(samples, rng, { duration: 0.2, gain: 0.18, lowCutoff: 540, cutoff: 2_800, contour: swell });
      mixWood(samples, rng, { start: 0.015, duration: 0.12, frequency: 520, gain: 0.35 });
      mixDryPluck(samples, rng, { start: 0.03, duration: 0.2, frequency: 880, gain: 0.2 });
      mixCrackedBell(samples, rng, { start: 0.055, duration: 0.2, baseFrequency: 1047, gain: 0.08 });
    }),
    sound("playerStatusStun", 0.5, -4, (samples, rng) => {
      mixPaper(samples, rng, { duration: 0.22, gain: 0.38 });
      mixWood(samples, rng, { start: 0.012, duration: 0.14, frequency: 470, gain: 0.32 });
      mixCrackedBell(samples, rng, { start: 0.025, duration: 0.42, baseFrequency: 932, gain: 0.22 });
      mixCrackedBell(samples, rng, { start: 0.09, duration: 0.36, baseFrequency: 622, gain: 0.14 });
      mixNoise(samples, rng, { start: 0.05, duration: 0.28, gain: 0.22, color: "band", lowCutoff: 1_100, cutoff: 4_300, decay: 1.8 });
    }),
    sound("playerJump", 0.2, -7.5, (samples, rng) => {
      mixBreath(samples, rng, { duration: 0.15, gain: 0.22, lowCutoff: 240, cutoff: 1_500, endLowCutoff: 780, endCutoff: 3_100, contour: rise(0.8) });
      mixWood(samples, rng, { duration: 0.09, frequency: 330, gain: 0.24 });
      mixDryPluck(samples, rng, { start: 0.025, duration: 0.14, frequency: 587, gain: 0.11 });
    }),
    sound("playerHurt", 0.27, -4, (samples, rng) => {
      mixRasp(samples, rng, { duration: 0.22, frequency: 210, gain: 0.48, endRatio: 0.75 });
      mixWood(samples, rng, { duration: 0.12, frequency: 190, gain: 0.38 });
      mixNoise(samples, rng, { duration: 0.18, gain: 0.3, color: "band", lowCutoff: 160, cutoff: 1_700, decay: 2.1 });
      mixTaiko(samples, rng, { start: 0.01, duration: 0.18, frequency: 98, gain: 0.25 });
    }),
    sound("playerDeath", 0.98, -2.6, (samples, rng) => {
      mixRasp(samples, rng, { duration: 0.58, frequency: 180, gain: 0.5, endRatio: 0.48 });
      mixTaiko(samples, rng, { duration: 0.52, frequency: 60, gain: 0.66 });
      mixOscillator(samples, { start: 0.05, duration: 0.72, frequency: 330, endFrequency: 92, gain: 0.12, wave: "triangle", contour: swell, release: 0.12 });
      mixCrackedBell(samples, rng, { start: 0.13, duration: 0.76, baseFrequency: 294, gain: 0.18 });
      mixPaper(samples, rng, { start: 0.28, duration: 0.48, gain: 0.24 });
      mixDarkEcho(samples, { delay: 0.12, gain: 0.11, cutoff: 1_400 });
    }),
  ];
}
