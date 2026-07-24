import { UI_SPRITES, type UiSpriteId } from "../constants";

const STATUS_ICON_BASE_SIZE = 24;
const STATUS_GAP_BASE_SIZE = 3;
const STATUS_STACK_FONT_BASE_SIZE = 7;
const STATUS_PROGRESS_BASE_HEIGHT = 2;
export const HUD_STATUS_BAR_SCALE = 0.8;

export type HudMeterFrame = {
  left: UiSpriteId;
  mid: UiSpriteId;
  right: UiSpriteId;
  height: number;
  fillTop: number;
  fillBottom: number;
  fillInsetLeft: number;
  fillInsetRight: number;
  rightTop: number;
};

export type HudMeterPlacement = {
  left: number;
  top: number;
};

export const HUD_ULTIMATE_FRAME_TOP = 0;
export const HUD_CURRENT_SKILL_FRAME_LEFT = 60;
export const HUD_CURRENT_SKILL_FRAME_TOP = 36;

export const HUD_HP_METER_FRAME: HudMeterFrame = {
  left: "hudHpBarLeft",
  mid: "hudHpBarMid",
  right: "hudHpBarRight",
  height: 20,
  fillTop: 7,
  fillBottom: 1,
  fillInsetLeft: 15,
  fillInsetRight: 7,
  rightTop: 0,
};

export const HUD_HP_METER_PLACEMENT: HudMeterPlacement = {
  left: 68,
  top: 23,
};

export const HUD_SKILL_METER_FRAME: HudMeterFrame = {
  left: "hudSkillBarLeft",
  mid: "hudSkillBarMid",
  right: "hudSkillBarRight",
  height: 18,
  fillTop: 5,
  fillBottom: 5,
  fillInsetLeft: 15,
  fillInsetRight: 7,
  rightTop: -3,
};

export const HUD_SKILL_METER_PLACEMENT: HudMeterPlacement = {
  left: 92,
  top: 45,
};

export const HUD_STATUS_BAR_LEFT =
  HUD_CURRENT_SKILL_FRAME_LEFT + UI_SPRITES.currentSkillFrame.displayW;
export const HUD_STATUS_BAR_TOP = HUD_SKILL_METER_PLACEMENT.top + Math.max(
  HUD_SKILL_METER_FRAME.height,
  HUD_SKILL_METER_FRAME.rightTop + UI_SPRITES.hudSkillBarRight.displayH,
);
export const HUD_STATUS_BAR_ICON_SIZE = STATUS_ICON_BASE_SIZE * HUD_STATUS_BAR_SCALE;
export const HUD_STATUS_BAR_GAP = STATUS_GAP_BASE_SIZE * HUD_STATUS_BAR_SCALE;
export const HUD_STATUS_STACK_FONT_SIZE =
  STATUS_STACK_FONT_BASE_SIZE * HUD_STATUS_BAR_SCALE;
export const HUD_STATUS_PROGRESS_HEIGHT =
  STATUS_PROGRESS_BASE_HEIGHT * HUD_STATUS_BAR_SCALE;
