import type { GameSfx, ToneStep } from "./audioTypes";

type DynamicPlayerSfx = Extract<
  GameSfx,
  | "playerSkillArmorBreakImpact"
  | "playerSkillReturningBladeCatch"
  | "playerSkillReturningBladeTurn"
  | "playerStatusStun"
  | "playerUltimateAfterimage"
  | "playerUltimateEnd"
>;

const DYNAMIC_PLAYER_SFX_PATTERNS = {
  playerSkillArmorBreakImpact: () => [
    { frequency: 118, slideTo: 64, duration: 0.12, type: "sawtooth", volume: 0.072 },
    { frequency: 620, slideTo: 940, duration: 0.07, type: "triangle", volume: 0.042, delay: 0.014 },
  ],
  playerSkillReturningBladeCatch: () => [
    { frequency: 760, slideTo: 980, duration: 0.055, type: "triangle", volume: 0.038 },
    { frequency: 360, slideTo: 240, duration: 0.08, type: "sine", volume: 0.026, delay: 0.015 },
  ],
  playerSkillReturningBladeTurn: () => [
    { frequency: 720, slideTo: 400, duration: 0.08, type: "triangle", volume: 0.04 },
    { frequency: 280, slideTo: 520, duration: 0.07, type: "sine", volume: 0.03, delay: 0.03 },
  ],
  playerStatusStun: () => [
    { frequency: 940, slideTo: 520, duration: 0.07, type: "square", volume: 0.043 },
    { frequency: 760, slideTo: 340, duration: 0.08, type: "square", volume: 0.036, delay: 0.07 },
  ],
  playerUltimateAfterimage: () => [
    { frequency: 640, slideTo: 1040, duration: 0.055, type: "triangle", volume: 0.042 },
    { frequency: 1100, slideTo: 760, duration: 0.045, type: "sine", volume: 0.03, delay: 0.025 },
  ],
  playerUltimateEnd: () => [
    { frequency: 700, slideTo: 280, duration: 0.18, type: "sine", volume: 0.05 },
    { frequency: 350, slideTo: 160, duration: 0.22, type: "triangle", volume: 0.035, delay: 0.03 },
  ],
} satisfies Record<DynamicPlayerSfx, () => ToneStep[]>;

export function playerDynamicSfxPattern(sfx: GameSfx) {
  if (!(sfx in DYNAMIC_PLAYER_SFX_PATTERNS)) return null;
  return DYNAMIC_PLAYER_SFX_PATTERNS[sfx as DynamicPlayerSfx]();
}
