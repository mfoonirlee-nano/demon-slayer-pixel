const THIN_CRESCENT_GLOW_SCALE = 0.35;
const WAXING_CRESCENT_GLOW_SCALE = 0.45;
const QUARTER_MOON_GLOW_SCALE = 0.58;
const WAXING_GIBBOUS_ENTRY_GLOW_SCALE = 0.72;
const WAXING_GIBBOUS_GLOW_SCALE = 0.84;
const NEAR_FULL_GLOW_SCALE = 0.93;
const FULL_MOON_BASE_GLOW_SCALE = 1;
const FULL_MOON_PEAK_GLOW_SCALE = 1.05;

export const MOON_PHASE_GLOW_SCALES = [
  THIN_CRESCENT_GLOW_SCALE,
  WAXING_CRESCENT_GLOW_SCALE,
  QUARTER_MOON_GLOW_SCALE,
  WAXING_GIBBOUS_ENTRY_GLOW_SCALE,
  WAXING_GIBBOUS_GLOW_SCALE,
  NEAR_FULL_GLOW_SCALE,
  FULL_MOON_BASE_GLOW_SCALE,
  FULL_MOON_PEAK_GLOW_SCALE,
] as const;

export const MOON_BLOOD_RING_GLOW_SCALE_FLOOR = 0.7;

function clampPhaseIndex(phaseIndex: number) {
  return Math.max(
    0,
    Math.min(MOON_PHASE_GLOW_SCALES.length - 1, Math.floor(phaseIndex)),
  );
}

export function getMoonPhaseGlowScale(phaseIndex: number) {
  return MOON_PHASE_GLOW_SCALES[clampPhaseIndex(phaseIndex)];
}

export function getMoonBloodRingGlowScale(phaseIndex: number) {
  return Math.max(MOON_BLOOD_RING_GLOW_SCALE_FLOOR, getMoonPhaseGlowScale(phaseIndex));
}
