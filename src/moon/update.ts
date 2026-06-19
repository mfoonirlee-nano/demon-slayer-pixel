import type { MoonState } from "./types";

export function updateMoon(
  moon: MoonState,
  dt: number,
  options: {
    bloodActive: boolean;
    bloodLerpSpeed: number;
    coverProgressTarget: number;
    coverProgressLerpSpeed: number;
  },
) {
  const target = options.bloodActive ? 1 : 0;
  moon.bloodLerp += (target - moon.bloodLerp) * Math.min(1, dt * options.bloodLerpSpeed);

  const coverProgressTarget = Math.max(0, Math.min(1, options.coverProgressTarget));
  moon.coverProgress += (
    coverProgressTarget - moon.coverProgress
  ) * Math.min(1, dt * options.coverProgressLerpSpeed);
}
