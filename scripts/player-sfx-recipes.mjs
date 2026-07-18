/* eslint-disable no-magic-numbers -- Named DSP recipes are numeric signal specifications. */

import { DASH_REPOSITION_DURATION_FRAMES } from "../src/constants/playerSkillTiming.js";

const PLAYER_SFX_FRAMES_PER_SECOND = 60;
export const PLAYER_DASH_SHEATHE_START_SECONDS = (
  DASH_REPOSITION_DURATION_FRAMES / PLAYER_SFX_FRAMES_PER_SECOND
);

export function createPlayerSfxSpecs({
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
    sound("playerAttackStart", 0.19, -6.5, (samples, rng) => {
      mixBlade(samples, rng, { start: 0.002, duration: 0.165, baseFrequency: 900, gain: 0.64 });
      mixNoise(samples, rng, { duration: 0.038, gain: 0.12, color: "band", lowCutoff: 2_400, cutoff: 8_800, attack: 0.001, release: 0.012, decay: 4.2 });
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
    sound("playerSkillLine", 0.48, -2, (samples, rng) => {
      mixBlade(samples, rng, { duration: 0.4, baseFrequency: 620, gain: 0.78 });
      mixBreath(samples, rng, { duration: 0.38, gain: 0.3, lowCutoff: 420, cutoff: 2_200, endLowCutoff: 1_400, endCutoff: 5_200, contour: swell });
      mixOscillator(samples, { start: 0.025, duration: 0.3, frequency: 440, endFrequency: 880, gain: 0.1, wave: "triangle", contour: swell, release: 0.04 });
      mixDryPluck(samples, rng, { start: 0.06, duration: 0.27, frequency: 784, gain: 0.12 });
    }),
    sound("playerSkillArc", 0.44, -2.3, (samples, rng) => {
      mixBlade(samples, rng, { duration: 0.36, baseFrequency: 520, gain: 0.72 });
      mixBreath(samples, rng, { duration: 0.34, gain: 0.28, lowCutoff: 540, cutoff: 2_800, endLowCutoff: 1_000, endCutoff: 4_600, contour: swell });
      mixDryPluck(samples, rng, { start: 0.035, duration: 0.25, frequency: 659, gain: 0.14 });
      mixCrackedBell(samples, rng, { start: 0.08, duration: 0.31, baseFrequency: 880, gain: 0.08 });
    }),
    sound("playerSkillGuard", 0.58, -3.3, (samples, rng) => {
      mixBreath(samples, rng, { duration: 0.44, gain: 0.25, lowCutoff: 380, cutoff: 2_100, endCutoff: 3_600, contour: rise(0.75) });
      mixOscillator(samples, { duration: 0.45, frequency: 330, endFrequency: 660, gain: 0.1, wave: "triangle", contour: swell, release: 0.07 });
      mixDullIron(samples, rng, { start: 0.055, duration: 0.42, baseFrequency: 440, gain: 0.2 });
      mixCrackedBell(samples, rng, { start: 0.12, duration: 0.41, baseFrequency: 698, gain: 0.13 });
      mixTaiko(samples, rng, { start: 0.06, duration: 0.23, frequency: 104, gain: 0.22 });
      mixDarkEcho(samples, { delay: 0.085, gain: 0.06, cutoff: 2_200 });
    }),
    sound("playerSkillDash", 0.44, -2.8, (samples, rng) => {
      mixBreath(samples, rng, { duration: 0.34, gain: 0.42, lowCutoff: 260, cutoff: 1_800, endLowCutoff: 1_100, endCutoff: 4_500, contour: swell });
      mixBlade(samples, rng, { start: 0.025, duration: 0.25, baseFrequency: 560, gain: 0.62 });
      mixWood(samples, rng, { start: 0.015, duration: 0.11, frequency: 290, gain: 0.32 });
      mixBlade(samples, rng, { start: PLAYER_DASH_SHEATHE_START_SECONDS, duration: 0.22, baseFrequency: 720, gain: 0.48 });
      mixDryPluck(samples, rng, { start: PLAYER_DASH_SHEATHE_START_SECONDS + 0.025, duration: 0.2, frequency: 880, gain: 0.12 });
    }),
    sound("playerSkillVortex", 0.98, -3.8, (samples, rng) => {
      mixNoise(samples, rng, { duration: 0.9, gain: 0.38, color: "band", lowCutoff: 180, cutoff: 1_500, endLowCutoff: 620, endCutoff: 3_100, contour: swell, release: 0.1 });
      mixOscillator(samples, { duration: 0.88, frequency: 124, endFrequency: 248, gain: 0.12, wave: "sine", contour: swell, release: 0.1 });
      mixOscillator(samples, { start: 0.06, duration: 0.76, frequency: 370, endFrequency: 247, gain: 0.08, wave: "triangle", contour: swell, release: 0.09 });
      mixCrackedBell(samples, rng, { start: 0.16, duration: 0.67, baseFrequency: 494, gain: 0.13 });
      mixTaiko(samples, rng, { start: 0.12, duration: 0.28, frequency: 82, gain: 0.24 });
      mixDarkEcho(samples, { delay: 0.105, gain: 0.09, cutoff: 1_900 });
    }),
    sound("playerSkillArmorBreak", 0.5, -4.2, (samples, rng) => {
      mixBlade(samples, rng, { duration: 0.39, baseFrequency: 360, gain: 0.58 });
      mixBreath(samples, rng, { duration: 0.38, gain: 0.32, lowCutoff: 260, cutoff: 1_800, endLowCutoff: 880, endCutoff: 4_100, contour: swell });
      mixOscillator(samples, { start: 0.025, duration: 0.32, frequency: 196, endFrequency: 392, gain: 0.09, wave: "triangle", contour: swell, release: 0.05 });
      mixDullIron(samples, rng, { start: 0.04, duration: 0.36, baseFrequency: 330, gain: 0.15 });
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
    sound("playerSkillRain", 0.78, -2.5, (samples, rng) => {
      mixBreath(samples, rng, { duration: 0.65, gain: 0.2, lowCutoff: 700, cutoff: 3_200, contour: swell });
      mixBlade(samples, rng, { start: 0.02, duration: 0.18, baseFrequency: 780, gain: 0.42 });
      mixBlade(samples, rng, { start: 0.13, duration: 0.18, baseFrequency: 880, gain: 0.45 });
      mixBlade(samples, rng, { start: 0.25, duration: 0.18, baseFrequency: 980, gain: 0.48 });
      mixBlade(samples, rng, { start: 0.38, duration: 0.18, baseFrequency: 1080, gain: 0.5 });
      mixBlade(samples, rng, { start: 0.52, duration: 0.18, baseFrequency: 1180, gain: 0.46 });
      mixDryPluck(samples, rng, { start: 0.08, duration: 0.17, frequency: 988, gain: 0.11 });
      mixDryPluck(samples, rng, { start: 0.32, duration: 0.17, frequency: 1175, gain: 0.1 });
      mixDryPluck(samples, rng, { start: 0.55, duration: 0.17, frequency: 1319, gain: 0.09 });
    }),
    sound("playerSkillReturningBlade", 0.52, -2.2, (samples, rng) => {
      mixBlade(samples, rng, { duration: 0.42, baseFrequency: 590, gain: 0.7 });
      mixBreath(samples, rng, { duration: 0.4, gain: 0.33, lowCutoff: 500, cutoff: 2_400, endLowCutoff: 1_100, endCutoff: 4_600, contour: swell });
      mixOscillator(samples, { start: 0.025, duration: 0.34, frequency: 392, endFrequency: 784, gain: 0.09, wave: "triangle", contour: swell, release: 0.05 });
      mixDryPluck(samples, rng, { start: 0.06, duration: 0.3, frequency: 698, gain: 0.12 });
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
    sound("playerSkillVerticalWave", 0.68, -1.9, (samples, rng) => {
      mixNoise(samples, rng, { duration: 0.58, gain: 0.48, color: "band", lowCutoff: 180, cutoff: 1_300, endLowCutoff: 1_200, endCutoff: 5_200, contour: rise(0.65), release: 0.07 });
      mixBlade(samples, rng, { start: 0.04, duration: 0.45, baseFrequency: 460, gain: 0.62 });
      mixOscillator(samples, { start: 0.03, duration: 0.48, frequency: 220, endFrequency: 880, gain: 0.12, wave: "triangle", contour: rise(0.75), release: 0.07 });
      mixTaiko(samples, rng, { start: 0.035, duration: 0.27, frequency: 82, gain: 0.42 });
      mixCrackedBell(samples, rng, { start: 0.22, duration: 0.4, baseFrequency: 659, gain: 0.1 });
    }),
    sound("playerUltimateCast", 1.25, -5.5, (samples, rng) => {
      mixBreath(samples, rng, { duration: 1.12, gain: 0.36, lowCutoff: 170, cutoff: 1_400, endLowCutoff: 900, endCutoff: 4_300, contour: rise(0.72) });
      mixOscillator(samples, { duration: 1.08, frequency: 110, endFrequency: 220, gain: 0.13, wave: "sine", contour: rise(0.7), release: 0.12 });
      mixTaiko(samples, rng, { start: 0.05, duration: 0.34, frequency: 72, gain: 0.5 });
      mixTaiko(samples, rng, { start: 0.49, duration: 0.3, frequency: 82, gain: 0.44 });
      mixDryPluck(samples, rng, { start: 0.2, duration: 0.36, frequency: 294, gain: 0.2 });
      mixDryPluck(samples, rng, { start: 0.43, duration: 0.36, frequency: 392, gain: 0.19 });
      mixDryPluck(samples, rng, { start: 0.67, duration: 0.36, frequency: 523, gain: 0.18 });
      mixDryPluck(samples, rng, { start: 0.9, duration: 0.3, frequency: 659, gain: 0.16 });
      mixCrackedBell(samples, rng, { start: 0.52, duration: 0.66, baseFrequency: 440, gain: 0.18 });
      mixDarkEcho(samples, { delay: 0.11, gain: 0.09, cutoff: 2_000 });
    }),
    sound("playerUltimateImpact", 1.05, -1.05, (samples, rng) => {
      mixTaiko(samples, rng, { duration: 0.8, frequency: 52, gain: 1 });
      mixNoise(samples, rng, { duration: 0.78, gain: 0.76, color: "low", cutoff: 820, decay: 1.25 });
      mixNoise(samples, rng, { start: 0.018, duration: 0.67, gain: 0.6, color: "band", lowCutoff: 240, cutoff: 4_600, decay: 1.5 });
      mixBlade(samples, rng, { start: 0.025, duration: 0.58, baseFrequency: 420, gain: 0.66 });
      mixDullIron(samples, rng, { start: 0.02, duration: 0.72, baseFrequency: 180, gain: 0.34 });
      mixCrackedBell(samples, rng, { start: 0.08, duration: 0.84, baseFrequency: 523, gain: 0.22 });
      mixOscillator(samples, { start: 0.03, duration: 0.62, frequency: 220, endFrequency: 880, gain: 0.12, wave: "triangle", contour: swell, release: 0.09 });
      mixDarkEcho(samples, { delay: 0.1, gain: 0.1, cutoff: 1_800 });
    }),
    sound("playerUltimateAfterimage", 0.3, -2.4, (samples, rng) => {
      mixBlade(samples, rng, { duration: 0.24, baseFrequency: 820, gain: 0.66 });
      mixBreath(samples, rng, { duration: 0.23, gain: 0.3, lowCutoff: 820, cutoff: 3_500, endLowCutoff: 1_600, endCutoff: 5_600, contour: swell });
      mixDryPluck(samples, rng, { start: 0.025, duration: 0.2, frequency: 1047, gain: 0.15 });
    }),
    sound("playerUltimateEnd", 0.8, -5, (samples, rng) => {
      mixBreath(samples, rng, { duration: 0.68, gain: 0.28, lowCutoff: 820, cutoff: 3_500, endLowCutoff: 180, endCutoff: 1_100, contour: swell });
      mixOscillator(samples, { duration: 0.65, frequency: 659, endFrequency: 196, gain: 0.11, wave: "triangle", contour: swell, release: 0.1 });
      mixCrackedBell(samples, rng, { start: 0.06, duration: 0.66, baseFrequency: 523, gain: 0.14 });
      mixPaper(samples, rng, { start: 0.24, duration: 0.36, gain: 0.16 });
      mixDarkEcho(samples, { delay: 0.1, gain: 0.1, cutoff: 1_700 });
    }),
    sound("playerCounter", 0.46, -1.1, (samples, rng) => {
      mixDullIron(samples, rng, { duration: 0.38, baseFrequency: 520, gain: 0.36 });
      mixBlade(samples, rng, { start: 0.015, duration: 0.31, baseFrequency: 760, gain: 0.68 });
      mixWood(samples, rng, { start: 0.012, duration: 0.13, frequency: 380, gain: 0.42 });
      mixDryPluck(samples, rng, { start: 0.04, duration: 0.28, frequency: 784, gain: 0.18 });
      mixDryPluck(samples, rng, { start: 0.12, duration: 0.26, frequency: 1047, gain: 0.15 });
      mixTaiko(samples, rng, { start: 0.018, duration: 0.25, frequency: 92, gain: 0.38 });
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
