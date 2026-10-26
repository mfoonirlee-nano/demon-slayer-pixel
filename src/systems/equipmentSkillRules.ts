import type { EquipmentItemId, EquipmentSlot } from "../types/game-state";

export type EquipmentSkillLoadout = Record<EquipmentSlot, EquipmentItemId | null>;
export type EquipmentSkillRuleId =
  | "mark"
  | "sweep"
  | "gather"
  | "rupture"
  | "tideEye"
  | "lingering"
  | "spread";

const EQUIPMENT_SKILL_REQUIREMENTS: Record<EquipmentSkillRuleId, readonly EquipmentItemId[]> = {
  mark: ["flow_blade"],
  sweep: ["flow_blade"],
  gather: ["flow_blade", "tempo_talisman"],
  rupture: ["burst_blade"],
  tideEye: ["shadowstep_garb"],
  lingering: ["flow_garb"],
  spread: ["flow_blade", "hunt_talisman"],
};

export function resolveEquipmentSkillRules(loadout: EquipmentSkillLoadout): EquipmentSkillRuleId[] {
  const equipped = new Set(Object.values(loadout));
  return (Object.keys(EQUIPMENT_SKILL_REQUIREMENTS) as EquipmentSkillRuleId[]).filter((rule) => {
    if (rule === "sweep" && equipped.has("tempo_talisman")) return false;
    return EQUIPMENT_SKILL_REQUIREMENTS[rule].every((itemId) => equipped.has(itemId));
  });
}

export function previewEquipmentSkillRules(
  loadout: EquipmentSkillLoadout,
  item: { id: EquipmentItemId; slot: EquipmentSlot },
) {
  const before = resolveEquipmentSkillRules(loadout);
  const afterLoadout = { ...loadout, [item.slot]: item.id };
  const active = resolveEquipmentSkillRules(afterLoadout);
  const available = new Set(Object.values(afterLoadout));
  const dormant = (Object.keys(EQUIPMENT_SKILL_REQUIREMENTS) as EquipmentSkillRuleId[])
    .filter((rule) => EQUIPMENT_SKILL_REQUIREMENTS[rule].includes(item.id)
      && !active.includes(rule)
      && EQUIPMENT_SKILL_REQUIREMENTS[rule].some((required) => !available.has(required)));
  return {
    active,
    added: active.filter((rule) => !before.includes(rule)),
    removed: before.filter((rule) => !active.includes(rule)),
    dormant,
  };
}
