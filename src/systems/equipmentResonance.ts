import type { EquipmentFamily, GameState } from "../types/game-state";
import {
  BURST_BLADE_PAIR_RESONANCE_EXECUTE_HP_RATIO,
  BURST_TALISMAN_PAIR_RESONANCE_COOLDOWN_FRAMES,
  EQUIPMENT_PAIR_COOLDOWN_MULTIPLIER,
  EQUIPMENT_PAIR_TRIGGER_REDUCTION,
  FLOW_FULL_HEALTH_REGEN_PER_SECOND,
  FLOW_PAIR_SKILL_ENERGY_REGEN_PER_SECOND,
  FULL_RESONANCE_SKILL_ENERGY_GAIN,
  SHADOWSTEP_FULL_RESONANCE_SKILL_ENERGY_GAIN,
  SHADOWSTEP_PAIR_DODGE_CHANCE,
} from "../constants";
import { EQUIPMENT_ITEMS } from "./equipmentCatalog";
import { grantSkillEnergy } from "./equipmentResources";
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

export function cooldownWithFamilyResonance(state: GameState, family: EquipmentFamily, baseCooldown: number) {
  if (equippedFamilyCount(state, family) < PAIR_RESONANCE_COUNT) return baseCooldown;
  return Math.max(1, Math.floor(baseCooldown * EQUIPMENT_PAIR_COOLDOWN_MULTIPLIER));
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
