/* eslint-disable no-magic-numbers -- Named DSP recipes are numeric signal specifications. */

export function createBossSfxSpecs({
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
