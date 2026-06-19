import type { Skill, SkillId } from "../types/assets";
import type { GameState, SkillLevel } from "../types/game-state";
import { playerSkillById } from "./skillCatalog";

export const SKILL_SLOT_COUNT = 3;

export function skillById(skillId: SkillId | null): Skill | null {
  return playerSkillById(skillId);
}

export function selectedSkill(state: GameState): Skill | null {
  return skillById(state.player.equippedSkillIds[state.player.skillIndex] ?? null);
}

export function isSkillLearned(state: GameState, skillId: SkillId) {
  return Boolean(state.player.skillLevels[skillId]);
}

export function skillLevel(state: GameState, skillId: SkillId): SkillLevel | 0 {
  return state.player.skillLevels[skillId] ?? 0;
}

export function selectSkillSlot(state: GameState, index: number) {
  const nextIndex = Math.max(0, Math.min(SKILL_SLOT_COUNT - 1, index));
  if (!state.player.equippedSkillIds[nextIndex]) return;
  state.player.skillIndex = nextIndex;
}

export function equipSkillSlot(state: GameState, slotIndex: number, skillId: SkillId) {
  if (!isSkillLearned(state, skillId)) return false;
  if (slotIndex < 0 || slotIndex >= SKILL_SLOT_COUNT) return false;

  const duplicateSlot = state.player.equippedSkillIds.findIndex((equippedId, index) => (
    index !== slotIndex && equippedId === skillId
  ));
  if (duplicateSlot !== -1) return false;

  state.player.equippedSkillIds[slotIndex] = skillId;
  if (!state.player.equippedSkillIds[state.player.skillIndex]) {
    state.player.skillIndex = slotIndex;
  }
  return true;
}

export function autoEquipLearnedSkill(state: GameState, skillId: SkillId) {
  const emptySlot = state.player.equippedSkillIds.findIndex((equippedId) => equippedId === null);
  if (emptySlot === -1) return;
  equipSkillSlot(state, emptySlot, skillId);
}
