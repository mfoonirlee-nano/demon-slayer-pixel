/* eslint-disable no-magic-numbers -- Named DSP recipes are numeric signal specifications. */
import { DASH_REPOSITION_DURATION_FRAMES, ULTIMATE_OPENING_FRAME } from "../src/constants/playerSkillTiming.js";

const FRAMES_PER_SECOND = 60;
export const PLAYER_DASH_SHEATHE_START_SECONDS = DASH_REPOSITION_DURATION_FRAMES / FRAMES_PER_SECOND;
export const PLAYER_ULTIMATE_WINDUP_SECONDS = ULTIMATE_OPENING_FRAME / FRAMES_PER_SECOND;

export function createTideSfxSpecs({ mixNoise, mixOscillator, mixBreath, mixDryPluck, mixTaiko, mixWood, sound, swell }) {
  // Short filtered droplets color the water; they are not separate impact cues.
  function water(samples, rng, start, duration, gain, rising = true) {
    mixNoise(samples, rng, { start, duration, gain, color: "band", lowCutoff: rising ? 260 : 900,
      cutoff: rising ? 1600 : 4200, endLowCutoff: rising ? 1000 : 220, endCutoff: rising ? 4600 : 1200,
      attack: 0.004, release: 0.045, contour: swell });
    for (let index = 0; index < 5; index += 1) {
      const offset = index * duration * 0.14;
      const frequency = 740 + index * 230;
      mixOscillator(samples, { start: start + offset, duration: Math.min(0.05, duration * 0.25),
        frequency, endFrequency: frequency * 0.64, gain: gain * 0.05, wave: "sine",
        attack: 0.002, release: 0.018, decay: 3 });
    }
  }
  function edge(samples, start, duration, frequency, gain) {
    mixOscillator(samples, { start, duration, frequency, endFrequency: frequency * 0.58,
      gain, wave: "sine", attack: 0.002, release: 0.025, decay: 3.2 });
  }
  return [
    sound("playerSkillArc", 0.34, -3.4, (s, r) => {
      water(s, r, 0, 0.23, 0.76); water(s, r, 0.09, 0.22, 0.29, false);
      edge(s, 0.025, 0.09, 2100, 0.045);
    }),
    sound("playerSkillGuard", 0.38, -7, (s, r) => {
      water(s, r, 0, 0.3, 0.32, false);
      mixDryPluck(s, r, { start: 0.02, duration: 0.24, frequency: 523, gain: 0.12 });
      edge(s, 0.06, 0.22, 1047, 0.025);
    }),
    sound("playerSkillDash", 0.34, -4, (s, r) => {
      water(s, r, 0, 0.14, 0.55);
      const sheathe = PLAYER_DASH_SHEATHE_START_SECONDS;
      water(s, r, sheathe, 0.17, 0.52, false); edge(s, sheathe, 0.08, 2400, 0.045);
      mixWood(s, r, { start: sheathe, duration: 0.08, frequency: 640, gain: 0.12 });
    }),
    sound("playerSkillVortex", 0.86, -5.6, (s, r) => {
      mixNoise(s, r, { duration: 0.8, gain: 0.44, color: "band", lowCutoff: 150, cutoff: 1800,
        endLowCutoff: 280, endCutoff: 1100, contour: (t) => Math.sin(Math.PI * t) * (0.7 + 0.3 * Math.sin(t * Math.PI * 6)), release: 0.08 });
      water(s, r, 0.08, 0.36, 0.2, false); water(s, r, 0.37, 0.35, 0.17, false);
      mixOscillator(s, { duration: 0.7, frequency: 165, endFrequency: 110, gain: 0.07, wave: "sine", contour: swell, release: 0.08 });
    }),
    sound("playerSkillArmorBreak", 0.3, -5.8, (s, r) => {
      water(s, r, 0, 0.25, 0.56); edge(s, 0.025, 0.1, 1700, 0.055);
      mixBreath(s, r, { duration: 0.22, gain: 0.22, lowCutoff: 180, cutoff: 1100 });
    }),
    sound("playerSkillRain", 0.44, -5.2, (s, r) => {
      // A continuous descending hiss avoids pre-recorded fake impact counts.
      mixNoise(s, r, { duration: 0.4, gain: 0.55, color: "band", lowCutoff: 1900, cutoff: 6200,
        endLowCutoff: 760, endCutoff: 2800, attack: 0.006, release: 0.06, contour: swell });
      water(s, r, 0.05, 0.3, 0.18, false); edge(s, 0.015, 0.16, 3200, 0.022);
    }),
    sound("playerSkillReturningBlade", 0.38, -4, (s, r) => {
      water(s, r, 0, 0.24, 0.6); water(s, r, 0.1, 0.24, 0.28, false);
      edge(s, 0.03, 0.12, 1960, 0.045);
      mixDryPluck(s, r, { start: 0.02, duration: 0.23, frequency: 784, gain: 0.09 });
    }),
    sound("playerSkillVerticalWave", 0.42, -3.7, (s, r) => {
      water(s, r, 0, 0.34, 0.68);
      mixNoise(s, r, { duration: 0.13, gain: 0.3, color: "low", cutoff: 680, decay: 2.6 });
      edge(s, 0.11, 0.16, 2300, 0.035);
    }),
    sound("playerUltimateCast", PLAYER_ULTIMATE_WINDUP_SECONDS, -8, (s, r) => {
      water(s, r, 0, PLAYER_ULTIMATE_WINDUP_SECONDS, 0.38);
      mixOscillator(s, { duration: 0.19, frequency: 196, endFrequency: 392, gain: 0.075, wave: "sine", contour: swell, release: 0.035 });
      mixDryPluck(s, r, { start: 0.015, duration: 0.13, frequency: 392, gain: 0.13 });
      mixDryPluck(s, r, { start: 0.075, duration: 0.13, frequency: 587, gain: 0.1 });
    }),
    sound("playerUltimateImpact", 0.62, -2.8, (s, r) => {
      mixTaiko(s, r, { duration: 0.25, frequency: 66, gain: 0.55 });
      water(s, r, 0, 0.34, 0.85); water(s, r, 0.17, 0.35, 0.35, false);
      edge(s, 0.015, 0.12, 2500, 0.045);
      mixDryPluck(s, r, { start: 0.025, duration: 0.28, frequency: 784, gain: 0.18 });
      mixDryPluck(s, r, { start: 0.075, duration: 0.28, frequency: 1047, gain: 0.13 });
      mixDryPluck(s, r, { start: 0.14, duration: 0.25, frequency: 1175, gain: 0.09 });
    }),
    sound("playerUltimateAfterimage", 0.17, -7.2, (s, r) => {
      water(s, r, 0, 0.145, 0.5); edge(s, 0.01, 0.07, 2700, 0.035);
    }),
    sound("playerUltimateEnd", 0.42, -8, (s, r) => {
      water(s, r, 0, 0.35, 0.25, false);
      mixDryPluck(s, r, { start: 0, duration: 0.2, frequency: 587, gain: 0.12 });
      mixDryPluck(s, r, { start: 0.1, duration: 0.22, frequency: 392, gain: 0.1 });
    }),
    sound("playerCounter", 0.3, -2.6, (s, r) => {
      mixWood(s, r, { duration: 0.09, frequency: 640, gain: 0.38 });
      water(s, r, 0.015, 0.24, 0.55); edge(s, 0.01, 0.08, 2600, 0.06);
      mixDryPluck(s, r, { start: 0.02, duration: 0.2, frequency: 1047, gain: 0.18 });
    }),
  ];
}
