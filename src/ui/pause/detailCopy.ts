import type { GameSnapshot } from "../../game/gameStore";
import {
  equipmentPrimaryStatLabel,
  equipmentSlotLabel,
  localizeEquipmentItem,
} from "../../i18n/equipmentCopy";
import { DEFAULT_LANGUAGE, type Language } from "../../i18n/language";
import { message } from "../../i18n/messages";
import { skillCopy, skillDescription } from "../../i18n/skillCopy";
import { EQUIPMENT_ITEMS } from "../../systems/equipment";
import type { EquipmentItemId, EquipmentItemState } from "../../types/game-state";
import {
  getSkill,
  romanLevel,
} from "../uiDisplay";
import { formatSignedPercent } from "../../utils";
import type { EquipmentDetailTarget, PauseDetailCopy, SkillDetailTarget } from "./types";

export function equipmentDetailCopy(
  target: EquipmentDetailTarget,
  equipment: GameSnapshot["equipment"],
  unlockedEquipmentIds: ReadonlySet<EquipmentItemId>,
  language: Language = DEFAULT_LANGUAGE,
): PauseDetailCopy {
  if (target.type === "item") {
    const catalogItem = EQUIPMENT_ITEMS[target.itemId];
    const ownedItem = equipment.inventory.find((entry) => entry.id === target.itemId);
    const item = localizeEquipmentItem(language, ownedItem ?? catalogItem);
    const equipped = equipment.equipped[item.slot]?.id === item.id;
    const unlocked = unlockedEquipmentIds.has(item.id);

    return {
      kicker: `${equipmentSlotLabel(language, item.slot)} · ${item.uiTags.join(" · ")} · ${
        message(language, equipped ? "status.equipped" : unlocked ? "status.canEquip" : "status.locked")
      }`,
      title: item.name,
      body: equipmentItemDetailBody(item, language),
    };
  }

  const equippedItem = equipment.equipped[target.slot];
  const item = equippedItem ? localizeEquipmentItem(language, equippedItem) : null;
  return {
    kicker: `${equipmentSlotLabel(language, target.slot)} · ${item?.uiTags.join(" · ") ?? message(language, "status.notEquipped")}`,
    title: item?.name ?? message(language, "status.emptySlot"),
    body: item ? equipmentItemDetailBody(item, language) : message(language, "pause.detail.currentEquipmentEmpty"),
  };
}

function equipmentItemDetailBody(item: EquipmentItemState, language: Language) {
  const primaryStatPercent = formatSignedPercent(item.primaryStatBonusRatio);
  return language === "zh-CN"
    ? `基础属性：${equipmentPrimaryStatLabel(language, item.slot)} ${primaryStatPercent}。专属机制：${item.summary}`
    : `Base Stat: ${equipmentPrimaryStatLabel(language, item.slot)} ${primaryStatPercent}. Unique Effect: ${item.summary}`;
}

export function skillDetailCopy(
  target: SkillDetailTarget,
  player: GameSnapshot["player"],
  language: Language = DEFAULT_LANGUAGE,
): PauseDetailCopy {
  if (target.type === "item") {
    const skill = getSkill(target.skillId);
    const level = player.skillLevels[target.skillId];
    const equippedSlot = player.equippedSkillIds.findIndex((skillId) => skillId === target.skillId);

    const copy = skill ? skillCopy(language, target.skillId) : null;
    const levelText = level ? romanLevel(level) : message(language, "status.locked");
    const equippedText = equippedSlot >= 0
      ? ` · ${message(language, "pause.detail.equippedSlot", { slot: equippedSlot + 1 })}`
      : "";

    return {
      kicker: `${message(language, "pause.detail.skill")} · ${message(language, "pause.detail.level", { level: levelText })}${equippedText}`,
      title: copy?.name ?? message(language, "pause.detail.unknownSkill"),
      body: skill && level
        ? skillDescription(language, target.skillId, level)
        : copy?.description ?? message(language, "pause.detail.noSkillDescription"),
    };
  }

  const skillId = player.equippedSkillIds[target.slotIndex];
  const skill = getSkill(skillId);
  const level = skillId ? player.skillLevels[skillId] : undefined;

  const copy = skillId && skill ? skillCopy(language, skillId) : null;
  const stateText = skill
    ? message(language, "pause.detail.level", { level: romanLevel(level) })
    : message(language, "status.emptySlot");

  return {
    kicker: `${message(language, "pause.detail.slot", { slot: target.slotIndex + 1 })} · ${message(language, "pause.detail.hotkey", { key: target.slotIndex + 1 })} · ${stateText}`,
    title: copy?.name ?? message(language, "status.emptySlot"),
    body: skillId && level
      ? skillDescription(language, skillId, level)
      : copy?.description ?? message(language, "pause.detail.currentSkillEmpty"),
  };
}
