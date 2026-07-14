import type { EquipmentSlot, GameState } from "../types/game-state";
import { EQUIPMENT_PRIMARY_STAT_BONUS_RATIOS } from "../constants";
import { syncSkillChargesForEquipment } from "./equipmentResources";
import { equipmentInventoryTier } from "./equipmentState";
import {
  baseAttackForLevel,
  maxHpForLevel,
  maxSkillChargesForEnergy,
  maxSkillEnergyForLevel,
} from "./playerStatGrowth";

export type EquipmentStatBonuses = {
  attack: number;
  maxHp: number;
  skillEnergyMax: number;
};

export function equipmentStatBonuses(state: GameState): EquipmentStatBonuses {
  const level = state.player.runLevel;
  return {
    attack: percentageBonus(baseAttackForLevel(level), equippedSlotBonusRatio(state, "blade")),
    maxHp: percentageBonus(maxHpForLevel(level), equippedSlotBonusRatio(state, "garb")),
    skillEnergyMax: percentageBonus(
      maxSkillEnergyForLevel(level),
      equippedSlotBonusRatio(state, "talisman"),
    ),
  };
}

export function applyEquipmentStatChange(state: GameState) {
  const next = equipmentStatBonuses(state);
  const player = state.player;
  player.baseAttack = baseAttackForLevel(player.runLevel) + next.attack;
  player.maxHp = maxHpForLevel(player.runLevel) + next.maxHp;
  player.skillEnergyMax = maxSkillEnergyForLevel(player.runLevel) + next.skillEnergyMax;
  player.hp = Math.min(player.hp, player.maxHp);
  player.skillEnergy = Math.min(player.skillEnergy, player.skillEnergyMax);
  player.maxSkillCharges = maxSkillChargesForEnergy(player.skillEnergyMax);
  syncSkillChargesForEquipment(state);
}

function equippedSlotBonusRatio(state: GameState, slot: EquipmentSlot) {
  const itemId = state.equippedEquipment[slot];
  if (!itemId) return 0;
  const tier = equipmentInventoryTier(state, itemId) ?? "common";
  return EQUIPMENT_PRIMARY_STAT_BONUS_RATIOS[itemId][tier];
}

function percentageBonus(baseValue: number, ratio: number) {
  return Math.round(baseValue * (1 + ratio)) - baseValue;
}
