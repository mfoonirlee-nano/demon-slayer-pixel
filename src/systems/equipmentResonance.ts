import type { EquipmentFamily, GameState } from "../types/game-state";
import {
  FLOW_FULL_HEALTH_REGEN_PER_SECOND,
  FLOW_PAIR_SKILL_ENERGY_REGEN_PER_SECOND,
} from "../constants";
import { EQUIPMENT_ITEMS } from "./equipmentCatalog";
import { grantSkillEnergy } from "./equipmentResources";

const PAIR_RESONANCE_COUNT = 2;
const FULL_RESONANCE_COUNT = 3;
const PAIR_TRIGGER_REDUCTION = 1;
const PAIR_COOLDOWN_MULTIPLIER = 0.9;
const FULL_RESONANCE_SKILL_GAIN = 2;

export function equippedFamilyCount(state: GameState, family: EquipmentFamily) {
  return Object.values(state.equippedEquipment).filter((itemId) => (
    itemId !== null && EQUIPMENT_ITEMS[itemId].family === family
  )).length;
}

export function triggerCountWithFamilyResonance(state: GameState, family: EquipmentFamily, baseCount: number) {
  if (equippedFamilyCount(state, family) < PAIR_RESONANCE_COUNT) return baseCount;
  return Math.max(1, baseCount - PAIR_TRIGGER_REDUCTION);
}

export function cooldownWithFamilyResonance(state: GameState, family: EquipmentFamily, baseCooldown: number) {
  if (equippedFamilyCount(state, family) < PAIR_RESONANCE_COUNT) return baseCooldown;
  return Math.max(1, Math.floor(baseCooldown * PAIR_COOLDOWN_MULTIPLIER));
}

export function applyFamilyResonanceReward(state: GameState, family: EquipmentFamily) {
  if (equippedFamilyCount(state, family) < FULL_RESONANCE_COUNT) return;
  grantSkillEnergy(state, FULL_RESONANCE_SKILL_GAIN);
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
