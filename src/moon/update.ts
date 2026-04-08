import type { MoonState } from "./types";

export function updateMoon(
  moon: MoonState,
  dt: number,
  options: { bloodActive: boolean; bloodLerpSpeed: number },
) {
  const target = options.bloodActive ? 1 : 0;
  moon.bloodLerp += (target - moon.bloodLerp) * Math.min(1, dt * options.bloodLerpSpeed);
}
