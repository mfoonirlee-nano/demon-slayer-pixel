import type { SkillId } from "../../types/assets";
import type { EquipmentItemId, EquipmentSlot } from "../../types/game-state";

export type PauseTab = "info" | "equipment" | "skills" | "controls" | "settings";

export type EquipmentDetailTarget =
  | { type: "slot"; slot: EquipmentSlot }
  | { type: "item"; itemId: EquipmentItemId };

export type SkillDetailTarget =
  | { type: "slot"; slotIndex: number }
  | { type: "item"; skillId: SkillId };

export type PauseDetailCopy = {
  kicker: string;
  title: string;
  body: string;
};
