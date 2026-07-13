import { PLAYER_COMBAT } from "../constants";
import type { EquipmentSlot, GameState } from "../types/game-state";
import { syncSkillChargesForEquipment } from "./equipmentResources";
import { equipmentInventoryTier } from "./equipmentState";
import { EQUIPMENT_PRIMARY_STAT_BONUSES } from "./equipmentTuning";

export type EquipmentStatBonuses = {
  attack: number;
  maxHp: number;
  skillEnergyMax: number;
};

export function equipmentStatBonuses(state: GameState): EquipmentStatBonuses {
  return {
    attack: equippedSlotBonus(state, "blade"),
    maxHp: equippedSlotBonus(state, "garb"),
    skillEnergyMax: equippedSlotBonus(state, "talisman"),
  };
}

export function applyEquipmentStatChange(state: GameState, previous: EquipmentStatBonuses) {
  const next = equipmentStatBonuses(state);
  const player = state.player;
  player.baseAttack += next.attack - previous.attack;
  player.maxHp += next.maxHp - previous.maxHp;
  player.skillEnergyMax += next.skillEnergyMax - previous.skillEnergyMax;
  player.hp = Math.min(player.hp, player.maxHp);
  player.skillEnergy = Math.min(player.skillEnergy, player.skillEnergyMax);
  player.maxSkillCharges = Math.max(
    0,
    Math.floor(player.skillEnergyMax / PLAYER_COMBAT.skillCastEnergyCost),
  );
  syncSkillChargesForEquipment(state);
}

function equippedSlotBonus(state: GameState, slot: EquipmentSlot) {
  const itemId = state.equippedEquipment[slot];
  if (!itemId) return 0;
  const tier = equipmentInventoryTier(state, itemId) ?? "common";
  return EQUIPMENT_PRIMARY_STAT_BONUSES[slot][tier];
}
