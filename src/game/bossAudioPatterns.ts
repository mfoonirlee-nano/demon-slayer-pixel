import type { GameSfx, ToneStep } from "./audioTypes";

type DeadBellSfx = Extract<
  GameSfx,
  | "bossDeadBellCast"
  | "bossDeadBellLowToll"
  | "bossDeadBellHighToll"
  | "bossDeadBellBlade"
  | "bossDeadBellSilence"
  | "bossDeadBellReprisal"
  | "bossDeadBellBreak"
  | "bossDeadBellDeath"
>;

type MistBoneSfx = Extract<
  GameSfx,
  | "bossMistBoneCast"
  | "bossMistBoneDart"
  | "bossMistBoneWarning"
  | "bossMistBoneSpike"
  | "bossMistBoneCharge"
  | "bossMistBoneDeath"
>;

export const DEAD_BELL_SFX_MIN_GAPS = {
  bossDeadBellCast: 0.18,
  bossDeadBellLowToll: 0.16,
  bossDeadBellHighToll: 0.16,
  bossDeadBellBlade: 0.08,
  bossDeadBellSilence: 0.35,
  bossDeadBellReprisal: 0.35,
  bossDeadBellBreak: 0.5,
  bossDeadBellDeath: 1,
} satisfies Record<DeadBellSfx, number>;

export const MIST_BONE_SFX_MIN_GAPS = {
  bossMistBoneCast: 0.18,
  bossMistBoneDart: 0.08,
  bossMistBoneWarning: 0.18,
  bossMistBoneSpike: 0.1,
  bossMistBoneCharge: 0.25,
  bossMistBoneDeath: 1,
} satisfies Record<MistBoneSfx, number>;

const DEAD_BELL_SFX_PATTERNS = {
  bossDeadBellCast: [
    { frequency: 176, slideTo: 132, duration: 0.18, type: "triangle", volume: 0.04 },
    { frequency: 248, slideTo: 238, duration: 0.11, type: "sine", volume: 0.026, delay: 0.025 },
    { frequency: 89, slideTo: 72, duration: 0.2, type: "sawtooth", volume: 0.018 },
  ],
  bossDeadBellLowToll: [
    { frequency: 82, slideTo: 76, duration: 0.38, type: "sine", volume: 0.062 },
    { frequency: 118, slideTo: 112, duration: 0.31, type: "triangle", volume: 0.034, delay: 0.008 },
    { frequency: 167, slideTo: 154, duration: 0.24, type: "sine", volume: 0.022, delay: 0.012 },
  ],
  bossDeadBellHighToll: [
    { frequency: 294, slideTo: 276, duration: 0.25, type: "triangle", volume: 0.052 },
    { frequency: 421, slideTo: 398, duration: 0.21, type: "sine", volume: 0.032, delay: 0.006 },
    { frequency: 601, slideTo: 564, duration: 0.16, type: "triangle", volume: 0.022, delay: 0.012 },
  ],
  bossDeadBellBlade: [
    { frequency: 520, slideTo: 1_240, duration: 0.065, type: "sawtooth", volume: 0.05 },
    { frequency: 1_540, slideTo: 610, duration: 0.075, type: "triangle", volume: 0.03, delay: 0.012 },
    { frequency: 172, slideTo: 128, duration: 0.08, type: "square", volume: 0.025, delay: 0.008 },
  ],
  bossDeadBellSilence: [
    { frequency: 310, slideTo: 90, duration: 0.055, type: "triangle", volume: 0.04 },
    { frequency: 142, slideTo: 48, duration: 0.075, type: "square", volume: 0.028, delay: 0.006 },
  ],
  bossDeadBellReprisal: [
    { frequency: 196, slideTo: 126, duration: 0.16, type: "sawtooth", volume: 0.055 },
    { frequency: 207, slideTo: 133, duration: 0.16, type: "triangle", volume: 0.048 },
    { frequency: 880, slideTo: 260, duration: 0.09, type: "square", volume: 0.032, delay: 0.012 },
  ],
  bossDeadBellBreak: [
    { frequency: 108, slideTo: 62, duration: 0.4, type: "sine", volume: 0.042 },
    { frequency: 162, slideTo: 92, duration: 0.3, type: "triangle", volume: 0.022, delay: 0.025 },
  ],
  bossDeadBellDeath: [
    { frequency: 98, slideTo: 38, duration: 0.55, type: "sawtooth", volume: 0.072 },
    { frequency: 147, slideTo: 51, duration: 0.44, type: "triangle", volume: 0.04, delay: 0.012 },
    { frequency: 720, slideTo: 186, duration: 0.18, type: "square", volume: 0.036, delay: 0.025 },
    { frequency: 503, slideTo: 143, duration: 0.24, type: "triangle", volume: 0.03, delay: 0.11 },
  ],
} satisfies Record<DeadBellSfx, ToneStep[]>;

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

export function bossDeadBellSfxPattern(sfx: GameSfx) {
  if (!(sfx in DEAD_BELL_SFX_PATTERNS)) return null;
  return DEAD_BELL_SFX_PATTERNS[sfx as DeadBellSfx];
}

export function bossMistBoneSfxPattern(sfx: GameSfx) {
  if (!(sfx in MIST_BONE_SFX_PATTERNS)) return null;
  return MIST_BONE_SFX_PATTERNS[sfx as MistBoneSfx];
}
