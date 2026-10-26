import type { GameSnapshot } from "../game/gameStore";
import { equipmentSkillRuleCopy, equipmentSkillUsageCopy } from "../i18n/equipmentSkillCopy";
import type { Language } from "../i18n/language";
import {
  previewEquipmentSkillRules,
  resolveEquipmentSkillRules,
  type EquipmentSkillLoadout,
  type EquipmentSkillRuleId,
} from "../systems/equipmentSkillRules";
import type { SkillId } from "../types/assets";
import type { EquipmentItemState } from "../types/game-state";

export function equipmentSkillLoadout(equipment: GameSnapshot["equipment"]): EquipmentSkillLoadout {
  return {
    blade: equipment.equipped.blade?.id ?? null,
    garb: equipment.equipped.garb?.id ?? null,
    talisman: equipment.equipped.talisman?.id ?? null,
  };
}

export function equipmentSkillPreviewLines(
  equipment: GameSnapshot["equipment"],
  item: EquipmentItemState,
  language: Language,
) {
  const preview = previewEquipmentSkillRules(equipmentSkillLoadout(equipment), item);
  const zh = language === "zh-CN";
  const line = (rule: EquipmentSkillRuleId, label: string) =>
    `${label} · ${equipmentSkillRuleCopy(language, rule).description}`;
  return [
    ...preview.added.map((rule) => line(rule, zh ? "装备后获得" : "On equip")),
    ...preview.removed.map((rule) => `${zh ? "装备后失去" : "Removed on equip"} · ${equipmentSkillRuleCopy(language, rule).name}`),
    ...preview.dormant.map((rule) => line(rule, zh ? "需同时装备流水刃" : "Requires Flow Blade")),
  ];
}

export function currentSkillEquipmentLines(
  equipment: GameSnapshot["equipment"],
  skillId: SkillId,
  language: Language,
) {
  const rules = resolveEquipmentSkillRules(equipmentSkillLoadout(equipment));
  if (rules.length === 0) return [];
  const usage = equipmentSkillUsageCopy(language, skillId, rules);
  return [
    ...rules.map((rule) => equipmentSkillRuleCopy(language, rule).description),
    ...(usage ? [usage] : []),
  ];
}

export function EquipmentSkillPreview({ equipment, item, language, compact = false }: {
  equipment: GameSnapshot["equipment"];
  item: EquipmentItemState;
  language: Language;
  compact?: boolean;
}) {
  const lines = equipmentSkillPreviewLines(equipment, item, language);
  if (lines.length === 0) return null;
  if (compact) {
    const preview = previewEquipmentSkillRules(equipmentSkillLoadout(equipment), item);
    const names = [
      ...preview.added.map((rule) => equipmentSkillRuleCopy(language, rule).name),
      ...preview.dormant.map((rule) => `${equipmentSkillRuleCopy(language, rule).name} (${language === "zh-CN" ? "需流水刃" : "needs Flow Blade"})`),
    ];
    return (
      <div className="mt-1 text-center text-[8px] font-bold leading-[1.35] text-[#8fffd0]">
        {names.length ? names.join(" · ") : language === "zh-CN" ? "改变当前联动" : "Changes current combos"}
      </div>
    );
  }
  return (
    <div className="max-h-[104px] overflow-y-auto rounded-sm border border-[#4b9f9c] bg-[#071824] px-3 py-2 text-[9px] leading-[1.5] text-[#d5f7ee]" tabIndex={0}>
      <div className="mb-1 font-bold text-[#8fffd0]">{language === "zh-CN" ? "装备组合变化" : "Equipment Combo Changes"}</div>
      {lines.map((line) => <div key={line}>{line}</div>)}
    </div>
  );
}

export function SkillEquipmentPreview({ snapshot, skillId, language }: {
  snapshot: GameSnapshot;
  skillId: SkillId;
  language: Language;
}) {
  const lines = currentSkillEquipmentLines(snapshot.equipment, skillId, language);
  if (lines.length === 0) return null;
  const equipped = snapshot.player.equippedSkillIds.includes(skillId);
  return (
    <div className="max-h-[104px] overflow-y-auto rounded-sm border border-[#4b9f9c] bg-[#071824] px-3 py-2 text-[9px] leading-[1.5] text-[#d5f7ee]" tabIndex={0}>
      <div className="mb-1 font-bold text-[#8fffd0]">
        {language === "zh-CN"
          ? equipped ? "当前装备联动" : "习得并装备此招后"
          : equipped ? "Current Equipment Combos" : "After Learning and Equipping This Skill"}
      </div>
      {lines.map((line) => <div key={line}>{line}</div>)}
    </div>
  );
}
