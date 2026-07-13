import type { GameSnapshot } from "../../game/gameStore";
import { EQUIPMENT_ITEMS } from "../../systems/equipment";
import { EQUIPMENT_PRIMARY_STAT_LABELS } from "../../systems/equipmentCatalog";
import type { EquipmentItemId, EquipmentItemState } from "../../types/game-state";
import {
  EQUIPMENT_SLOT_LABELS,
  getSkill,
  romanLevel,
} from "../uiDisplay";
import { playerSkillDescription } from "../../systems/skillCatalog";
import type { EquipmentDetailTarget, PauseDetailCopy, SkillDetailTarget } from "./types";

export function equipmentDetailCopy(
  target: EquipmentDetailTarget,
  equipment: GameSnapshot["equipment"],
  unlockedEquipmentIds: ReadonlySet<EquipmentItemId>,
): PauseDetailCopy {
  if (target.type === "item") {
    const catalogItem = EQUIPMENT_ITEMS[target.itemId];
    const ownedItem = equipment.inventory.find((entry) => entry.id === target.itemId);
    const item = ownedItem ?? catalogItem;
    const equipped = equipment.equipped[item.slot]?.id === item.id;
    const unlocked = unlockedEquipmentIds.has(item.id);

    return {
      kicker: `${EQUIPMENT_SLOT_LABELS[item.slot]} · ${item.uiTags.join(" · ")} · ${equipped ? "已装备" : unlocked ? "可装备" : "未解锁"}`,
      title: item.name,
      body: equipmentItemDetailBody(item),
    };
  }

  const item = equipment.equipped[target.slot];
  return {
    kicker: `${EQUIPMENT_SLOT_LABELS[target.slot]} · ${item?.uiTags.join(" · ") ?? "未装备"}`,
    title: item?.name ?? "空槽",
    body: item ? equipmentItemDetailBody(item) : "当前槽位未装备。",
  };
}

function equipmentItemDetailBody(item: EquipmentItemState) {
  return `基础属性：${EQUIPMENT_PRIMARY_STAT_LABELS[item.slot]} +${item.primaryStatBonus}。专属机制：${item.summary}`;
}

export function skillDetailCopy(target: SkillDetailTarget, player: GameSnapshot["player"]): PauseDetailCopy {
  if (target.type === "item") {
    const skill = getSkill(target.skillId);
    const level = player.skillLevels[target.skillId];
    const equippedSlot = player.equippedSkillIds.findIndex((skillId) => skillId === target.skillId);

    return {
      kicker: `技能 · 等级 ${level ? romanLevel(level) : "未解锁"}${equippedSlot >= 0 ? ` · 已装备 ${equippedSlot + 1}` : ""}`,
      title: skill?.name ?? "未知技能",
      body: skill && level ? playerSkillDescription(target.skillId, level) : skill?.description ?? "暂无技能说明。",
    };
  }

  const skillId = player.equippedSkillIds[target.slotIndex];
  const skill = getSkill(skillId);
  const level = skillId ? player.skillLevels[skillId] : undefined;

  return {
    kicker: `槽位 ${target.slotIndex + 1} · 快捷键 ${target.slotIndex + 1} · ${skill ? `等级 ${romanLevel(level)}` : "空槽"}`,
    title: skill?.name ?? "空槽",
    body: skillId && level ? playerSkillDescription(skillId, level) : skill?.description ?? "当前槽位未装备技能。",
  };
}
