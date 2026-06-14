import type { CrystalType, PlatformStyle } from "../types/game-state";
import type { PlayerAnimationState, SkillId } from "../types/assets";

export const PLAYER_ANIMATION_STATES = {
  idle: "idle",
  run: "run",
  jump: "jump",
  attack: "attack",
  fallAttack: "fallAttack",
} as const satisfies Record<PlayerAnimationState, PlayerAnimationState>;

export const SKILL_IDS = {
  skill1: "skill1",
  skill2: "skill2",
  skill3: "skill3",
  dashReposition: "dash_reposition",
  vortexControl: "vortex_control",
  armorBreak: "armor_break",
  antiAirMulti: "anti_air_multi",
  returningBlade: "returning_blade",
  verticalWave: "vertical_wave",
} as const satisfies Record<string, SkillId>;

export const PLATFORM_STYLES = {
  stone: "stone",
  moss: "moss",
  shrine: "shrine",
  ruin: "ruin",
} as const satisfies Record<PlatformStyle, PlatformStyle>;

export const PLATFORM_STYLE_VALUES: PlatformStyle[] = [
  PLATFORM_STYLES.stone,
  PLATFORM_STYLES.moss,
  PLATFORM_STYLES.shrine,
  PLATFORM_STYLES.ruin,
];

export const CRYSTAL_TYPES = {
  attack: "atk",
  health: "hp",
} as const satisfies {
  attack: CrystalType;
  health: CrystalType;
};
