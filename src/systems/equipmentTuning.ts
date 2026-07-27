import type { EquipmentSlot, EquipmentTier } from "../types/game-state";

export const EQUIPMENT_SLOTS: EquipmentSlot[] = ["blade", "garb", "talisman"];
export const EQUIPMENT_TIER_ORDER: EquipmentTier[] = ["common", "fine", "awakened"];
export const BOSS_EQUIPMENT_CHOICE_COUNT = 3;
export const LOW_HP_RATIO = 0.35;
export const NO_CANDIDATE_HEAL_RATIO = 0.2;

export const FLOW_BLADE_HITS_REQUIRED: Record<EquipmentTier, number> = { common: 4, fine: 3, awakened: 3 };
export const FLOW_BLADE_SKILL_DAMAGE_MULTIPLIER: Record<EquipmentTier, number> = {
  common: 1.25,
  fine: 1.3,
  awakened: 1.3,
};
export const FLOW_BLADE_SURGE_SKILL_FRAMES = 180;
export const FLOW_BLADE_SKILL_REFUND = 6;
export const FLOW_BLADE_ULTIMATE_GAIN = 2;
export const FLOW_GARB_TIMER_FRAMES = 180;
export const FLOW_GARB_EXTEND_FRAMES = 90;
export const FLOW_GARB_SPEED_MULTIPLIER = 1.18;
export const FLOW_GARB_DAMAGE_MULTIPLIER = 0.92;
export const FLOW_TALISMAN_REFUND: Record<EquipmentTier, number> = { common: 8, fine: 12, awakened: 12 };
export const FLOW_TALISMAN_HIT_THRESHOLD: Record<EquipmentTier, number> = { common: 2, fine: 2, awakened: 3 };
export const FLOW_TALISMAN_ULTIMATE_GAIN = 2;

export const BURST_BLADE_BOSS_HP_RATIO = 0.35;
export const BURST_BLADE_PAIR_RESONANCE_BOSS_HP_RATIO = 0.5;
export const BURST_BLADE_BOSS_DAMAGE_MULTIPLIER: Record<EquipmentTier, number> = {
  common: 1.22,
  fine: 1.28,
  awakened: 1.28,
};
export const BURST_BLADE_EXECUTE_ATTACK_MULTIPLIER = 1.35;
export const BURST_BLADE_AWAKENED_SLASH_ATTACK_SCALE = 1.2;
export const BURST_GARB_INVINCIBLE_FRAMES = 90;
export const BURST_GARB_SPEED_TIMER_FRAMES = 150;
export const BURST_GARB_SPEED_MULTIPLIER = 1.15;
export const BURST_TALISMAN_COOLDOWN = 90;
export const BURST_TALISMAN_PAIR_RESONANCE_COOLDOWN = 60;
export const BURST_TALISMAN_ULTIMATE_GAIN: Record<EquipmentTier, number> = { common: 3, fine: 4, awakened: 4 };
export const BURST_TALISMAN_SKILL_BOSS_ULTIMATE_GAIN = 2;
export const BURST_TALISMAN_RETAIN_RATIO = 0.25;

export const SHADOWSTEP_DISTANCE_REQUIRED = 220;
export const SHADOWSTEP_QUICK_DISTANCE_REQUIRED = 140;
export const SHADOWSTEP_BLADE_REACH_BONUS: Record<EquipmentTier, number> = { common: 36, fine: 48, awakened: 48 };
export const SHADOWSTEP_BLADE_DAMAGE_MULTIPLIER: Record<EquipmentTier, number> = {
  common: 1.12,
  fine: 1.18,
  awakened: 1.18,
};
export const SHADOWSTEP_BLADE_QUICK_TIMER_FRAMES = 180;
export const SHADOWSTEP_BLADE_ULTIMATE_GAIN = 2;
export const SHADOWSTEP_GARB_MOVING_FRAMES = 8;
export const SHADOWSTEP_GARB_HURT_SPEED_TIMER_FRAMES = 150;
export const SHADOWSTEP_GARB_HURT_SPEED_MULTIPLIER = 1.14;
export const SHADOWSTEP_DISTANCE_DECAY = 4;
export const SHADOWSTEP_GARB_DAMAGE_MULTIPLIER: Record<EquipmentTier, number> = {
  common: 0.88,
  fine: 0.84,
  awakened: 0.84,
};
export const SHADOWSTEP_GARB_KNOCKBACK_MULTIPLIER = 0.82;
export const SHADOWSTEP_TALISMAN_RADIUS = 120;
export const SHADOWSTEP_TALISMAN_BOSS_RADIUS_MULTIPLIER = 1.4;
export const SHADOWSTEP_TALISMAN_COOLDOWN = 80;
export const SHADOWSTEP_TALISMAN_SKILL_GAIN: Record<EquipmentTier, number> = { common: 3, fine: 4, awakened: 4 };
export const SHADOWSTEP_TALISMAN_ULTIMATE_GAIN = 1;

export const HUNT_KILL_WINDOW = 240;
export const HUNT_BLADE_KILLS_REQUIRED = 2;
export const HUNT_BLADE_REACH_BONUS: Record<EquipmentTier, number> = { common: 40, fine: 48, awakened: 48 };
export const HUNT_BLADE_DAMAGE_MULTIPLIER: Record<EquipmentTier, number> = { common: 1.1, fine: 1.2, awakened: 1.18 };
export const HUNT_BLADE_WATER_TIMER_FRAMES = 300;
export const HUNT_GARB_TIMER_FRAMES = 180;
export const HUNT_GARB_SPEED_MULTIPLIER: Record<EquipmentTier, number> = { common: 1.14, fine: 1.16, awakened: 1.16 };
export const HUNT_GARB_GUARD_DAMAGE_MULTIPLIER = 0.75;
export const HUNT_TALISMAN_KILLS_REQUIRED = 3;
export const HUNT_TALISMAN_COOLDOWN = 240;
export const HUNT_TALISMAN_SKILL_GAIN: Record<EquipmentTier, number> = { common: 14, fine: 14, awakened: 16 };
export const HUNT_TALISMAN_ULTIMATE_GAIN: Record<EquipmentTier, number> = { common: 0, fine: 2, awakened: 3 };

export const RISK_BLADE_BASIC_DAMAGE_MULTIPLIER: Record<EquipmentTier, number> = {
  common: 1.2,
  fine: 1.2,
  awakened: 1.22,
};
export const RISK_BLADE_SKILL_DAMAGE_MULTIPLIER = 1.15;
export const RISK_BLADE_AWAKENED_SKILL_MULTIPLIER = 1.25;
export const RISK_GARB_DAMAGE_MULTIPLIER: Record<EquipmentTier, number> = {
  common: 0.82,
  fine: 0.78,
  awakened: 0.78,
};
export const RISK_GARB_FINE_INVINCIBLE_BONUS_FRAMES = 30;
export const RISK_GARB_AWAKENED_INVINCIBLE_FRAMES = 90;
export const RISK_TALISMAN_SKILL_GAIN: Record<EquipmentTier, number> = { common: 22, fine: 30, awakened: 30 };
export const RISK_TALISMAN_ULTIMATE_GAIN = 8;

export const TEMPO_BLADE_ATTACK_FRAME_MULTIPLIER: Record<EquipmentTier, number> = {
  common: 0.82,
  fine: 0.76,
  awakened: 0.76,
};
export const TEMPO_BLADE_DAMAGE_MULTIPLIER: Record<EquipmentTier, number> = {
  common: 0.9,
  fine: 0.95,
  awakened: 0.9,
};
export const TEMPO_BLADE_HITS_FOR_NO_PENALTY = 3;
export const TEMPO_GARB_KNOCKBACK_MULTIPLIER: Record<EquipmentTier, number> = {
  common: 0.72,
  fine: 0.68,
  awakened: 0.68,
};
export const TEMPO_GARB_SPEED_MULTIPLIER = 1.12;
export const TEMPO_GARB_RECOVERY_TIMER_FRAMES = 150;
export const TEMPO_GARB_SKILL_GAIN = 8;
export const TEMPO_TALISMAN_SKILL_COST: Record<EquipmentTier, number> = {
  common: 27,
  fine: 25,
  awakened: 24,
};
export const TEMPO_TALISMAN_ULTIMATE_GAIN_MULTIPLIER: Record<EquipmentTier, number> = {
  common: 0.9,
  fine: 0.95,
  awakened: 1,
};
export const TEMPO_TALISMAN_AWAKENED_REFUND = 5;
