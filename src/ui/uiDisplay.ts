import { resolveStaticAssetUrl } from "../assets/staticAssetUrl";
import type { SkillId } from "../types/assets";
import type { EquipmentItemId, EquipmentSlot, SkillLevel, UltimateLevel } from "../types/game-state";
import { playerSkillById, playerSkillIconSrc } from "../systems/skillCatalog";

export function getSkill(skillId: SkillId | null | undefined) {
  return playerSkillById(skillId);
}

export function skillIconSrc(skillId: SkillId) {
  return resolveStaticAssetUrl(playerSkillIconSrc(skillId));
}

export function equipmentIconSrc(itemId: EquipmentItemId) {
  return resolveStaticAssetUrl(`assets/sprites/ui/equipment/${itemId}_icon.png`);
}

export function equipmentSlotBadgeSrc(slot: EquipmentSlot) {
  return resolveStaticAssetUrl(`assets/sprites/ui/equipment/slot_${slot}_badge.png`);
}

export function romanLevel(level: SkillLevel | UltimateLevel | 0 | undefined) {
  if (!level) return "0";
  if (level === 1) return "I";
  if (level === 2) return "II";
  return "III";
}
