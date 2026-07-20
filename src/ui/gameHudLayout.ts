import type { UiSpriteId } from "../constants";

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
  rightTop: -4,
};

export const HUD_SKILL_METER_PLACEMENT: HudMeterPlacement = {
  left: 92,
  top: 45,
};
