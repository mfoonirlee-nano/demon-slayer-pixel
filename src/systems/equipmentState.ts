import { actBandForAct, actForBossKills } from "./runProgression";
import type {
  ActBand,
  EquipmentChoiceState,
  EquipmentInventoryEntry,
  EquipmentItemId,
  EquipmentSlot,
  EquipmentTier,
  GameState,
} from "../types/game-state";
import {
  EQUIPMENT_CHOICE_IDS,
  EQUIPMENT_IDS_BY_SLOT,
  equipmentItemForTier,
  equipmentRequiresUltimate,
} from "./equipmentCatalog";
import {
  BOSS_EQUIPMENT_CHOICE_COUNT,
  EQUIPMENT_SLOTS,
  EQUIPMENT_TIER_ORDER,
  NO_CANDIDATE_HEAL_RATIO,
} from "./equipmentTuning";
import { LOW_HP_RATIO } from "../constants";

export function equipmentItem(itemId: EquipmentItemId | null | undefined, tier: EquipmentTier = "common") {
  return itemId ? equipmentItemForTier(itemId, tier) : null;
}

export function equipmentTierForActBand(actBand: ActBand): EquipmentTier {
  if (actBand === "final") return "awakened";
  if (actBand === "awakened") return "fine";
  return "common";
}

export function equipmentTierForState(state: GameState) {
  return equipmentTierForActBand(actBandForAct(actForBossKills(state.bossKills)));
}

export function createBossEquipmentChoices(state: GameState): EquipmentChoiceState[] {
  const tier = equipmentTierForState(state);
  const seed = state.bossKills + state.equipmentInventory.length;
  const validChoices = EQUIPMENT_CHOICE_IDS
    .map((itemId) => createEquipmentChoice(state, itemId, tier))
    .filter((choice) => choice !== null);
  const choices: EquipmentChoiceState[] = [];

  const addChoice = (choice: EquipmentChoiceState | null | undefined) => {
    if (!choice || choices.length >= BOSS_EQUIPMENT_CHOICE_COUNT) return;
    if (choices.some((existing) => existing.id === choice.id)) return;
    choices.push(choice);
  };

  const byId = new Map(validChoices.map((choice) => [choice.id, choice]));
  const equippedUpgrade = rotated(EQUIPMENT_SLOTS, seed)
    .map((slot) => state.equippedEquipment[slot])
    .map((itemId) => itemId ? byId.get(itemId) : undefined)
    .find((choice) => choice?.reason === "tierUpgrade");
  addChoice(equippedUpgrade);

  for (const slot of prioritizedSlots(state, seed + 1)) {
    if (choices.length >= BOSS_EQUIPMENT_CHOICE_COUNT) break;
    if (choices.some((choice) => choice.slot === slot) && choices.length < EQUIPMENT_SLOTS.length) continue;
    addChoice(pickChoiceForSlot(validChoices, slot, seed + choices.length, choices));
  }

  for (const choice of rotated(validChoices, seed + choices.length)) {
    if (choices.length >= BOSS_EQUIPMENT_CHOICE_COUNT) break;
    addChoice(choice);
  }

  return choices;
}

export function queueBossEquipmentChoices(
  state: GameState,
  options: { placeholderReward?: boolean } = {},
) {
  const choices = createBossEquipmentChoices(state);
  state.pendingEquipmentChoices = choices;
  if (choices.length > 0) return true;

  if (options.placeholderReward !== false) {
    const heal = Math.ceil(state.player.maxHp * NO_CANDIDATE_HEAL_RATIO);
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
  }
  return false;
}

export function hasEquipment(state: GameState, itemId: EquipmentItemId) {
  return equipmentInventoryEntry(state, itemId) !== undefined;
}

export function addEquipmentToInventory(state: GameState, itemId: EquipmentItemId, tier: EquipmentTier = "common") {
  const existing = equipmentInventoryEntry(state, itemId);
  if (!existing) {
    state.equipmentInventory.push({ id: itemId, tier });
    return true;
  }
  if (compareEquipmentTiers(tier, existing.tier) <= 0) return false;
  existing.tier = tier;
  return true;
}

export function equipmentInventoryEntry(
  state: GameState,
  itemId: EquipmentItemId,
): EquipmentInventoryEntry | undefined {
  return state.equipmentInventory.find((entry) => entry.id === itemId);
}

export function equipmentInventoryTier(state: GameState, itemId: EquipmentItemId) {
  return equipmentInventoryEntry(state, itemId)?.tier;
}

export function equippedTier(state: GameState, slot: EquipmentSlot, itemId: EquipmentItemId): EquipmentTier | null {
  if (state.equippedEquipment[slot] !== itemId) return null;
  return equipmentInventoryTier(state, itemId) ?? "common";
}

export function isPlayerLowHp(state: GameState) {
  return state.player.hp / Math.max(1, state.player.maxHp) <= LOW_HP_RATIO;
}

export function compareEquipmentTiers(left: EquipmentTier, right: EquipmentTier) {
  return EQUIPMENT_TIER_ORDER.indexOf(left) - EQUIPMENT_TIER_ORDER.indexOf(right);
}

export function tierAtLeast(tier: EquipmentTier, minimum: EquipmentTier) {
  return compareEquipmentTiers(tier, minimum) >= 0;
}

function createEquipmentChoice(
  state: GameState,
  itemId: EquipmentItemId,
  tier: EquipmentTier,
): EquipmentChoiceState | null {
  if (equipmentRequiresUltimate(itemId, tier) && state.player.ultimateLevel <= 0) return null;

  const previousTier = equipmentInventoryTier(state, itemId) ?? null;
  if (previousTier && compareEquipmentTiers(previousTier, tier) >= 0) return null;

  const item = equipmentItemForTier(itemId, tier);
  const equippedId = state.equippedEquipment[item.slot];
  const reason = previousTier ? "tierUpgrade" : equippedId ? "replacement" : "new";
  return { ...item, previousTier, reason };
}

function prioritizedSlots(state: GameState, seed: number) {
  const emptySlots = EQUIPMENT_SLOTS.filter((slot) => state.equippedEquipment[slot] === null);
  const filledSlots = EQUIPMENT_SLOTS.filter((slot) => state.equippedEquipment[slot] !== null);
  return [...rotated(emptySlots, seed), ...rotated(filledSlots, seed)];
}

function pickChoiceForSlot(
  candidates: EquipmentChoiceState[],
  slot: EquipmentSlot,
  seed: number,
  choices: EquipmentChoiceState[],
) {
  const choiceIds = new Set(choices.map((choice) => choice.id));
  const ids = rotated(EQUIPMENT_IDS_BY_SLOT[slot], seed);
  return ids
    .map((itemId) => candidates.find((choice) => choice.id === itemId))
    .find((choice) => choice && !choiceIds.has(choice.id));
}

function rotated<T>(items: T[], seed: number) {
  if (items.length === 0) return [];
  const offset = positiveModulo(seed, items.length);
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}
