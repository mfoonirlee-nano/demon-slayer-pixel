import type { EquipmentItemId, EquipmentTier } from "../types/game-state";

const EQUIPMENT_FRAMES_PER_SECOND = 60;

export const FLOW_PAIR_SKILL_ENERGY_REGEN_PER_SECOND = 2;
export const FLOW_FULL_HEALTH_REGEN_PER_SECOND = 1;
export const BURST_BLADE_PAIR_RESONANCE_EXECUTE_HP_RATIO = 0.5;
export const BURST_TALISMAN_PAIR_RESONANCE_COOLDOWN_FRAMES = 60;
export const EQUIPMENT_PAIR_TRIGGER_REDUCTION = 1;
export const FULL_RESONANCE_SKILL_ENERGY_GAIN = 2;
export const SHADOWSTEP_PAIR_DODGE_CHANCE = 0.15;
export const SHADOWSTEP_FULL_RESONANCE_SKILL_ENERGY_GAIN = 10;
export const HUNT_KILL_WINDOW_SECONDS = 4;
export const HUNT_KILL_WINDOW_FRAMES = (
  HUNT_KILL_WINDOW_SECONDS * EQUIPMENT_FRAMES_PER_SECOND
);
export const HUNT_BLADE_KILLS_REQUIRED = 2;
export const HUNT_BLADE_REACH_BONUS: Record<EquipmentTier, number> = {
  common: 40,
  fine: 48,
  awakened: 48,
};
export const HUNT_BLADE_DAMAGE_MULTIPLIER: Record<EquipmentTier, number> = {
  common: 1.1,
  fine: 1.2,
  awakened: 1.18,
};
export const HUNT_BLADE_WATER_DURATION_SECONDS = 5;
export const HUNT_BLADE_WATER_TIMER_FRAMES = (
  HUNT_BLADE_WATER_DURATION_SECONDS * EQUIPMENT_FRAMES_PER_SECOND
);
export const HUNT_GARB_DURATION_SECONDS = 3;
export const HUNT_GARB_TIMER_FRAMES = HUNT_GARB_DURATION_SECONDS * EQUIPMENT_FRAMES_PER_SECOND;
export const HUNT_GARB_KILLS_REQUIRED = 3;
export const HUNT_GARB_SPEED_MULTIPLIER: Record<EquipmentTier, number> = {
  common: 1.14,
  fine: 1.16,
  awakened: 1.16,
};
export const HUNT_GARB_GUARD_DAMAGE_MULTIPLIER = 0.75;
export const HUNT_TALISMAN_COOLDOWN_SECONDS = 4;
export const HUNT_TALISMAN_COOLDOWN_FRAMES = (
  HUNT_TALISMAN_COOLDOWN_SECONDS * EQUIPMENT_FRAMES_PER_SECOND
);
export const HUNT_TALISMAN_SKILL_GAIN: Record<EquipmentTier, number> = {
  common: 10,
  fine: 20,
  awakened: 30,
};
export const HUNT_TALISMAN_ULTIMATE_GAIN: Record<EquipmentTier, number> = {
  common: 10,
  fine: 20,
  awakened: 30,
};
export const HUNT_PAIR_BLADE_KILLS_REQUIRED = 1;
export const HUNT_PAIR_GARB_KILLS_REQUIRED = 2;
export const HUNT_PAIR_TALISMAN_COOLDOWN_SECONDS = 3;
export const HUNT_PAIR_TALISMAN_COOLDOWN_FRAMES = (
  HUNT_PAIR_TALISMAN_COOLDOWN_SECONDS * EQUIPMENT_FRAMES_PER_SECOND
);
export const HUNT_FULL_GARB_KILLS_REQUIRED = 1;
export const HUNT_FULL_TALISMAN_COOLDOWN_SECONDS = 2;
export const HUNT_FULL_TALISMAN_COOLDOWN_FRAMES = (
  HUNT_FULL_TALISMAN_COOLDOWN_SECONDS * EQUIPMENT_FRAMES_PER_SECOND
);

export const EQUIPMENT_PRIMARY_STAT_BONUS_RATIOS: Record<
  EquipmentItemId,
  Record<EquipmentTier, number>
> = {
  flow_blade: { common: 0.12, fine: 0.25, awakened: 0.38 },
  burst_blade: { common: 0.14, fine: 0.27, awakened: 0.4 },
  shadowstep_blade: { common: 0.11, fine: 0.24, awakened: 0.37 },
  hunt_blade: { common: 0.13, fine: 0.26, awakened: 0.39 },
  risk_blade: { common: 0.15, fine: 0.28, awakened: 0.41 },
  tempo_blade: { common: 0.1, fine: 0.23, awakened: 0.36 },
  flow_garb: { common: 0.1, fine: 0.2, awakened: 0.3 },
  burst_garb: { common: 0.12, fine: 0.22, awakened: 0.32 },
  shadowstep_garb: { common: 0.09, fine: 0.19, awakened: 0.29 },
  hunt_garb: { common: 0.11, fine: 0.21, awakened: 0.31 },
  risk_garb: { common: 0.13, fine: 0.23, awakened: 0.33 },
  tempo_garb: { common: 0.08, fine: 0.18, awakened: 0.28 },
  flow_talisman: { common: 0.11, fine: 0.22, awakened: 0.35 },
  burst_talisman: { common: 0.1, fine: 0.21, awakened: 0.34 },
  shadowstep_talisman: { common: 0.12, fine: 0.23, awakened: 0.36 },
  hunt_talisman: { common: 0.13, fine: 0.24, awakened: 0.37 },
  risk_talisman: { common: 0.14, fine: 0.25, awakened: 0.38 },
  tempo_talisman: { common: 0.09, fine: 0.2, awakened: 0.33 },
};
