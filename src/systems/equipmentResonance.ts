import type { EquipmentFamily, GameState } from "../types/game-state";
import {
  BURST_BLADE_PAIR_RESONANCE_EXECUTE_HP_RATIO,
  BURST_TALISMAN_PAIR_RESONANCE_COOLDOWN_FRAMES,
  EQUIPMENT_PAIR_TRIGGER_REDUCTION,
  FLOW_FULL_HEALTH_REGEN_PER_SECOND,
  FLOW_PAIR_SKILL_ENERGY_REGEN_PER_SECOND,
  FULL_RESONANCE_SKILL_ENERGY_GAIN,
  HUNT_BLADE_KILLS_REQUIRED,
  HUNT_FULL_GARB_KILLS_REQUIRED,
  HUNT_FULL_TALISMAN_COOLDOWN_FRAMES,
  HUNT_GARB_KILLS_REQUIRED,
  HUNT_PAIR_BLADE_KILLS_REQUIRED,
  HUNT_PAIR_GARB_KILLS_REQUIRED,
  HUNT_PAIR_TALISMAN_COOLDOWN_FRAMES,
  HUNT_TALISMAN_COOLDOWN_FRAMES,
  RISK_FULL_SPEED_MULTIPLIER,
  RISK_FULL_SHIELD_COOLDOWN_FRAMES,
  RISK_PAIR_SPEED_MULTIPLIER,
  SHADOWSTEP_FULL_RESONANCE_SKILL_ENERGY_GAIN,
  SHADOWSTEP_PAIR_DODGE_CHANCE,
} from "../constants";
import { EQUIPMENT_ITEMS } from "./equipmentCatalog";
import { grantSkillEnergy } from "./equipmentResources";
import { isPlayerLowHp } from "./equipmentState";
import {
  BURST_BLADE_BOSS_HP_RATIO,
  BURST_TALISMAN_COOLDOWN,
} from "./equipmentTuning";

const PAIR_RESONANCE_COUNT = 2;
const FULL_RESONANCE_COUNT = 3;

export function equippedFamilyCount(state: GameState, family: EquipmentFamily) {
  return Object.values(state.equippedEquipment).filter((itemId) => (
    itemId !== null && EQUIPMENT_ITEMS[itemId].family === family
  )).length;
}

export function shouldDodgeWithShadowstepResonance(state: GameState) {
  return equippedFamilyCount(state, "shadowstep") >= PAIR_RESONANCE_COUNT
    && Math.random() < SHADOWSTEP_PAIR_DODGE_CHANCE;
}

export function burstBladeExecuteHpRatio(state: GameState) {
  return equippedFamilyCount(state, "burst") >= PAIR_RESONANCE_COUNT
    ? BURST_BLADE_PAIR_RESONANCE_EXECUTE_HP_RATIO
    : BURST_BLADE_BOSS_HP_RATIO;
}

export function burstTalismanCooldownFrames(state: GameState) {
  return equippedFamilyCount(state, "burst") >= PAIR_RESONANCE_COUNT
    ? BURST_TALISMAN_PAIR_RESONANCE_COOLDOWN_FRAMES
    : BURST_TALISMAN_COOLDOWN;
}

export function triggerCountWithFamilyResonance(state: GameState, family: EquipmentFamily, baseCount: number) {
  if (equippedFamilyCount(state, family) < PAIR_RESONANCE_COUNT) return baseCount;
  return Math.max(1, baseCount - EQUIPMENT_PAIR_TRIGGER_REDUCTION);
}

export function huntBladeKillsRequired(state: GameState) {
  return equippedFamilyCount(state, "hunt") >= PAIR_RESONANCE_COUNT
    ? HUNT_PAIR_BLADE_KILLS_REQUIRED
    : HUNT_BLADE_KILLS_REQUIRED;
}

export function isHuntBladeAlwaysActive(state: GameState) {
  return equippedFamilyCount(state, "hunt") >= FULL_RESONANCE_COUNT;
}

export function huntGarbKillsRequired(state: GameState) {
  const huntCount = equippedFamilyCount(state, "hunt");
  if (huntCount >= FULL_RESONANCE_COUNT) return HUNT_FULL_GARB_KILLS_REQUIRED;
  if (huntCount >= PAIR_RESONANCE_COUNT) return HUNT_PAIR_GARB_KILLS_REQUIRED;
  return HUNT_GARB_KILLS_REQUIRED;
}

export function huntTalismanCooldownFrames(state: GameState) {
  const huntCount = equippedFamilyCount(state, "hunt");
  if (huntCount >= FULL_RESONANCE_COUNT) return HUNT_FULL_TALISMAN_COOLDOWN_FRAMES;
  if (huntCount >= PAIR_RESONANCE_COUNT) return HUNT_PAIR_TALISMAN_COOLDOWN_FRAMES;
  return HUNT_TALISMAN_COOLDOWN_FRAMES;
}

export function riskResonanceSpeedMultiplier(state: GameState) {
  const riskCount = equippedFamilyCount(state, "risk");
  if (riskCount >= FULL_RESONANCE_COUNT) return RISK_FULL_SPEED_MULTIPLIER;
  if (riskCount >= PAIR_RESONANCE_COUNT) return RISK_PAIR_SPEED_MULTIPLIER;
  return 1;
}

export function hasRiskFullResonance(state: GameState) {
  return equippedFamilyCount(state, "risk") >= FULL_RESONANCE_COUNT;
}

export function consumeRiskFullSetShield(state: GameState) {
  const player = state.player;
  if (!hasRiskFullResonance(state)) return false;
  if (!isPlayerLowHp(state)) return false;
  if (player.riskShieldCooldown > 0) return false;

  player.riskShieldCooldown = RISK_FULL_SHIELD_COOLDOWN_FRAMES;
  return true;
}

export function applyFamilyResonanceReward(state: GameState, family: EquipmentFamily) {
  if (equippedFamilyCount(state, family) < FULL_RESONANCE_COUNT) return;
  const skillEnergyGain = family === "shadowstep"
    ? SHADOWSTEP_FULL_RESONANCE_SKILL_ENERGY_GAIN
    : FULL_RESONANCE_SKILL_ENERGY_GAIN;
  grantSkillEnergy(state, skillEnergyGain);
}

export function tickFlowResonanceRegeneration(state: GameState, deltaSeconds: number) {
  if (deltaSeconds <= 0) return;
  const flowCount = equippedFamilyCount(state, "flow");
  if (flowCount < PAIR_RESONANCE_COUNT) return;

  grantSkillEnergy(state, FLOW_PAIR_SKILL_ENERGY_REGEN_PER_SECOND * deltaSeconds);
  if (flowCount < FULL_RESONANCE_COUNT) return;

  const player = state.player;
  player.hp = Math.min(
    player.maxHp,
    player.hp + FLOW_FULL_HEALTH_REGEN_PER_SECOND * deltaSeconds,
  );
}
