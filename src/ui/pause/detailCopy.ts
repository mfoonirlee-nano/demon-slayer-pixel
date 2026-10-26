import type { GameSnapshot } from "../../game/gameStore";
import {
  equipmentFamilyResonanceCopy,
  equipmentPrimaryStatLabel,
  equipmentSlotLabel,
  equipmentTierEffectCopy,
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
import { equipmentSkillRuleCopy } from "../../i18n/equipmentSkillCopy";
import { resolveEquipmentSkillRules } from "../../systems/equipmentSkillRules";
import {
  currentSkillEquipmentLines,
  equipmentSkillLoadout,
  equipmentSkillPreviewLines,
} from "../equipmentSkillPreview";

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
      body: equipmentItemDetailBody(item, equipment, language, equipped, unlocked),
    };
  }

  const equippedItem = equipment.equipped[target.slot];
  const item = equippedItem ? localizeEquipmentItem(language, equippedItem) : null;
  return {
    kicker: `${equipmentSlotLabel(language, target.slot)} · ${item?.uiTags.join(" · ") ?? message(language, "status.notEquipped")}`,
    title: item?.name ?? message(language, "status.emptySlot"),
    body: item ? equipmentItemDetailBody(item, equipment, language, true, true) : message(language, "pause.detail.currentEquipmentEmpty"),
  };
}

function equipmentItemDetailBody(
  item: EquipmentItemState,
  equipment: GameSnapshot["equipment"],
  language: Language,
  equipped: boolean,
  unlocked: boolean,
) {
  const primaryStatPercent = formatSignedPercent(item.primaryStatBonusRatio);
  const resonance = equipmentFamilyResonanceCopy(language, item.family);
  const zh = language === "zh-CN";
  const comboLines = equipped
    ? resolveEquipmentSkillRules(equipmentSkillLoadout(equipment)).map((rule) => equipmentSkillRuleCopy(language, rule).description)
    : equipmentSkillPreviewLines(equipment, item, language);
  const comboLabel = equipped
    ? zh ? "当前构筑联动" : "Current Build Combos"
    : unlocked
      ? zh ? "装备后联动" : "Combos After Equipping"
      : zh ? "获得并装备后联动" : "Combos After Obtaining and Equipping";
  const combo = comboLines.length ? `${comboLabel}：\n${comboLines.join("\n")}\n` : "";
  const tierEffect = equipmentTierEffectCopy(language, item.id, item.tier);
  const tierLine = tierEffect !== item.summary
    ? `\n${zh ? "品质机制" : "Tier Effect"}: ${tierEffect}`
    : "";
  return combo + (zh
    ? `基础属性：${equipmentPrimaryStatLabel(language, item.slot)} ${primaryStatPercent}。专属机制：${item.summary}${tierLine}\n套装效果：${resonance.pair}\n${resonance.full}`
    : `Base Stat: ${equipmentPrimaryStatLabel(language, item.slot)} ${primaryStatPercent}. Unique Effect: ${item.summary}${tierLine}\nSet Bonuses: ${resonance.pair}\n${resonance.full}`);
}

export function skillDetailCopy(
  target: SkillDetailTarget,
  player: GameSnapshot["player"],
  language: Language = DEFAULT_LANGUAGE,
  equipment?: GameSnapshot["equipment"],
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
      body: appendSkillCombos(skill && level
        ? skillDescription(language, target.skillId, level)
        : copy?.description ?? message(language, "pause.detail.noSkillDescription"), target.skillId, equipment, language, equippedSlot >= 0),
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
    body: appendSkillCombos(skillId && level
      ? skillDescription(language, skillId, level)
      : copy?.description ?? message(language, "pause.detail.currentSkillEmpty"), skillId, equipment, language, true),
  };
}

function appendSkillCombos(
  body: string,
  skillId: Parameters<typeof currentSkillEquipmentLines>[1] | null,
  equipment: GameSnapshot["equipment"] | undefined,
  language: Language,
  equipped: boolean,
) {
  if (!equipment || !skillId) return body;
  const lines = currentSkillEquipmentLines(equipment, skillId, language);
  if (!lines.length) return body;
  const label = language === "zh-CN"
    ? equipped ? "当前装备联动" : "习得并装备此招后"
    : equipped ? "Current Equipment Combos" : "After Learning and Equipping This Skill";
  return `${body}\n${label}：\n${lines.join("\n")}`;
}
