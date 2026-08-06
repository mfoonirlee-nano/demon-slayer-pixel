import { PLAYER_COMBAT } from "../constants";
import type { EquipmentItemId, EquipmentTier, GameState } from "../types/game-state";
import { equipmentInventoryTier, equippedTier } from "./equipmentState";
import {
  TEMPO_TALISMAN_SKILL_COST,
  TEMPO_TALISMAN_ULTIMATE_GAIN_MULTIPLIER,
} from "./equipmentTuning";

export function skillEnergyCostForTalisman(
  talismanId: EquipmentItemId | null | undefined,
  tier: EquipmentTier = "common",
) {
  return talismanId === "tempo_talisman"
    ? TEMPO_TALISMAN_SKILL_COST[tier]
    : PLAYER_COMBAT.skillCastEnergyCost;
}

export function equipmentSkillEnergyCost(state: GameState) {
  const talismanId = state.equippedEquipment.talisman;
  return skillEnergyCostForTalisman(
    talismanId,
    talismanId ? equipmentInventoryTier(state, talismanId) ?? "common" : "common",
  );
}

export function syncSkillChargesForEquipment(state: GameState) {
  const player = state.player;
  player.skillCharges = Math.min(
    player.maxSkillCharges,
    Math.floor(player.skillEnergy / equipmentSkillEnergyCost(state)),
  );
}

export function grantSkillEnergy(state: GameState, amount: number) {
  const player = state.player;
  player.skillEnergy = Math.min(player.skillEnergyMax, player.skillEnergy + amount);
  syncSkillChargesForEquipment(state);
}

export function grantUltimateEnergy(state: GameState, amount: number) {
  const granted = previewUltimateEnergyGain(state, amount);
  if (granted <= 0) return 0;
  state.player.ultimateEnergy += granted;
  return granted;
}

export function previewUltimateEnergyGain(state: GameState, amount: number) {
  const player = state.player;
  if (amount <= 0) return 0;
  if (player.ultimateLevel <= 0) return 0;
  if (player.ultimateTimer > 0 || player.ultimateCastTimer > 0) return 0;
  const tempoTier = equippedTier(state, "talisman", "tempo_talisman");
  const multiplier = tempoTier ? TEMPO_TALISMAN_ULTIMATE_GAIN_MULTIPLIER[tempoTier] : 1;
  return Math.min(
    player.ultimateEnergyMax - player.ultimateEnergy,
    amount * multiplier,
  );
}
