import type { GameSfx, ToneStep } from "./audioTypes";

type TreasureSfx = Extract<
  GameSfx,
  "treasureTelegraph" | "treasureOpen" | "treasureConfirm"
>;

const TREASURE_SFX_PATTERNS = {
  treasureTelegraph: [
    { frequency: 392, slideTo: 523, duration: 0.13, type: "sine", volume: 0.032 },
    { frequency: 659, slideTo: 784, duration: 0.15, type: "triangle", volume: 0.026, delay: 0.07 },
    { frequency: 988, duration: 0.12, type: "sine", volume: 0.02, delay: 0.16 },
  ],
  treasureOpen: [
    { frequency: 146, slideTo: 92, duration: 0.11, type: "square", volume: 0.038 },
    { frequency: 440, slideTo: 880, duration: 0.2, type: "triangle", volume: 0.05, delay: 0.025 },
    { frequency: 1_176, slideTo: 1_568, duration: 0.18, type: "sine", volume: 0.032, delay: 0.11 },
  ],
  treasureConfirm: [
    { frequency: 659, slideTo: 784, duration: 0.09, type: "triangle", volume: 0.04 },
    { frequency: 988, duration: 0.13, type: "sine", volume: 0.035, delay: 0.055 },
  ],
} satisfies Record<TreasureSfx, ToneStep[]>;

export function treasureSfxPattern(sfx: GameSfx) {
  if (!(sfx in TREASURE_SFX_PATTERNS)) return null;
  return TREASURE_SFX_PATTERNS[sfx as TreasureSfx];
}
