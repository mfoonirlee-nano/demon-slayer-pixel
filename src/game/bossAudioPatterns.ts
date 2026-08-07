import type { GameSfx, ToneStep } from "./audioTypes";

type MistBoneSfx = Extract<
  GameSfx,
  | "bossMistBoneCast"
  | "bossMistBoneDart"
  | "bossMistBoneWarning"
  | "bossMistBoneSpike"
  | "bossMistBoneCharge"
  | "bossMistBoneDeath"
>;

export const MIST_BONE_SFX_MIN_GAPS = {
  bossMistBoneCast: 0.18,
  bossMistBoneDart: 0.08,
  bossMistBoneWarning: 0.18,
  bossMistBoneSpike: 0.1,
  bossMistBoneCharge: 0.25,
  bossMistBoneDeath: 1,
} satisfies Record<MistBoneSfx, number>;

const MIST_BONE_SFX_PATTERNS = {
  bossMistBoneCast: [
    { frequency: 220, slideTo: 142, duration: 0.24, type: "sine", volume: 0.04 },
    { frequency: 580, slideTo: 820, duration: 0.18, type: "triangle", volume: 0.032, delay: 0.035 },
    { frequency: 96, slideTo: 62, duration: 0.28, type: "sawtooth", volume: 0.027, delay: 0.02 },
  ],
  bossMistBoneDart: [
    { frequency: 920, slideTo: 430, duration: 0.055, type: "triangle", volume: 0.038 },
    { frequency: 260, slideTo: 155, duration: 0.065, type: "square", volume: 0.022, delay: 0.008 },
  ],
  bossMistBoneWarning: [
    { frequency: 330, slideTo: 440, duration: 0.22, type: "sine", volume: 0.038 },
    { frequency: 660, slideTo: 880, duration: 0.18, type: "triangle", volume: 0.026, delay: 0.045 },
    { frequency: 132, slideTo: 92, duration: 0.25, type: "sawtooth", volume: 0.018 },
  ],
  bossMistBoneSpike: [
    { frequency: 104, slideTo: 52, duration: 0.14, type: "sawtooth", volume: 0.06 },
    { frequency: 620, slideTo: 210, duration: 0.09, type: "square", volume: 0.034 },
    { frequency: 1_050, slideTo: 480, duration: 0.055, type: "triangle", volume: 0.022, delay: 0.012 },
  ],
  bossMistBoneCharge: [
    { frequency: 250, slideTo: 78, duration: 0.34, type: "sawtooth", volume: 0.052 },
    { frequency: 540, slideTo: 160, duration: 0.26, type: "triangle", volume: 0.03, delay: 0.025 },
    { frequency: 82, slideTo: 48, duration: 0.38, type: "sine", volume: 0.038 },
  ],
  bossMistBoneDeath: [
    { frequency: 130, slideTo: 42, duration: 0.42, type: "sawtooth", volume: 0.075 },
    { frequency: 760, slideTo: 230, duration: 0.18, type: "square", volume: 0.038, delay: 0.025 },
    { frequency: 520, slideTo: 160, duration: 0.2, type: "triangle", volume: 0.034, delay: 0.12 },
    { frequency: 86, slideTo: 38, duration: 0.52, type: "sine", volume: 0.04, delay: 0.08 },
  ],
} satisfies Record<MistBoneSfx, ToneStep[]>;

export function bossMistBoneSfxPattern(sfx: GameSfx) {
  if (!(sfx in MIST_BONE_SFX_PATTERNS)) return null;
  return MIST_BONE_SFX_PATTERNS[sfx as MistBoneSfx];
}
