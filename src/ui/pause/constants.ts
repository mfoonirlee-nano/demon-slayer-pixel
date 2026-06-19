import { EQUIPMENT_CHOICE_IDS, EQUIPMENT_ITEMS } from "../../systems/equipment";
import { allPlayerSkills } from "../../systems/skillCatalog";
import type { EquipmentSlot } from "../../types/game-state";
import type { PauseTab } from "./types";

export const EQUIPMENT_SLOTS: EquipmentSlot[] = ["blade", "garb", "talisman"];
export const ALL_EQUIPMENT_ITEMS = EQUIPMENT_CHOICE_IDS.map((itemId) => EQUIPMENT_ITEMS[itemId]);
export const PAUSE_SKILLS = allPlayerSkills();
export const PAUSE_TABS: Array<{ id: PauseTab; label: string }> = [
  { id: "info", label: "基础信息" },
  { id: "equipment", label: "装备" },
  { id: "skills", label: "技能" },
  { id: "settings", label: "设置" },
];

export const AUDIO_PERCENT_SCALE = 100;
export const PAUSE_PANEL_W = 600;
export const PAUSE_PANEL_H = 340;
export const PAUSE_PANEL_INSET_X = 24;
export const PAUSE_PANEL_CONTENT_TOP = 42;
export const PAUSE_PANEL_CONTENT_BOTTOM = 28;
export const PAUSE_TAB_W = 126;
export const PAUSE_TAB_H = 42;
export const PAUSE_TAB_GAP = 4;
export const PAUSE_CURRENT_COLUMN_W = 176;
export const PAUSE_CHOICES_COLUMN_W = 360;
export const PAUSE_CURRENT_FRAME_SIZE = 44;
export const PAUSE_CHOICE_FRAME_SIZE = 58;
export const PAUSE_CURRENT_ICON_SIZE = 28;
export const PAUSE_CHOICE_ICON_SIZE = 36;
export const PAUSE_CURRENT_BADGE_SIZE = 14;
export const PAUSE_CHOICE_BADGE_SIZE = 16;
export const PAUSE_ICON_OFFSET_Y = 2;
export const PAUSE_CURRENT_ROW_GAP = 6;
export const PAUSE_CHOICE_GRID_GAP = 8;
export const PAUSE_COLUMN_GAP = 16;
export const PAUSE_INFO_INSET_X = 32;
export const PAUSE_INFO_ROW_GAP = 6;
export const PAUSE_INFO_COLUMN_GAP = 40;
export const PAUSE_SETTINGS_GAP = 12;
export const PAUSE_SLIDER_TRACK_W = 420;
export const PAUSE_SLIDER_TRACK_H = 18;
export const PAUSE_SLIDER_THUMB_W = 22;
export const PAUSE_SLIDER_THUMB_H = 24;
export const PAUSE_SLIDER_TRACK_TOP = 8;
export const PAUSE_SLIDER_THUMB_TOP = 5;
export const PAUSE_SLIDER_WRAP_H = 30;
export const PAUSE_SETTINGS_INSET_X = (PAUSE_PANEL_W - PAUSE_PANEL_INSET_X * 2 - PAUSE_SLIDER_TRACK_W) / 2;
export const PAUSE_TAB_CONTENT_CLASS = "flex items-center justify-center px-[18px] pb-[5px] pt-[8px] text-center leading-none";
