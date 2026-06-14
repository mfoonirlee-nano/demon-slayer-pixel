import { SKILLS } from "./constants";
import type { SkillId } from "./types/assets";
import type { EquipmentItemId, EquipmentSlot, SkillLevel, UltimateLevel } from "./types/game-state";

export const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlot, string> = {
  blade: "刃器",
  garb: "衣装",
  talisman: "饰符",
};

export function getSkill(skillId: SkillId | null | undefined) {
  if (!skillId) return null;
  return SKILLS.find((skill) => skill.id === skillId) ?? null;
}

export function skillIconSrc(skillId: SkillId) {
  return getSkill(skillId)?.iconSrc ?? `assets/sprites/ui/${skillId}_icon.png`;
}

export function equipmentIconSrc(itemId: EquipmentItemId) {
  return `assets/sprites/ui/equipment/${itemId}_icon.png`;
}

export function equipmentSlotBadgeSrc(slot: EquipmentSlot) {
  return `assets/sprites/ui/equipment/slot_${slot}_badge.png`;
}

export function romanLevel(level: SkillLevel | UltimateLevel | 0 | undefined) {
  if (!level) return "0";
  if (level === 1) return "I";
  if (level === 2) return "II";
  return "III";
}
