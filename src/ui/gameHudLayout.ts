import { UI_SPRITES, type UiSpriteId } from "../constants";

const STATUS_ICON_BASE_SIZE = 24;
const STATUS_GAP_BASE_SIZE = 3;
const STATUS_STACK_FONT_BASE_SIZE = 7;
const STATUS_PROGRESS_BASE_HEIGHT = 2;
const HUD_DESKTOP_BREAKPOINT_PX = 768;
const RESIDUAL_SPIRIT_INTAKE_LEFT = 28;
const RESIDUAL_SPIRIT_INTAKE_TOP = 21;
const RESIDUAL_SPIRIT_INTAKE_SIZE = 8;
export const HUD_STATUS_BAR_SCALE = 0.8;
export const HUD_SCREEN_INSET = 8;
export const HUD_RESIDUAL_SPIRIT_COMPACT_SCALE = 0.88;

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
export const HUD_RESIDUAL_SPIRIT_WIDTH =
  UI_SPRITES.residualSpiritVesselFrame.displayW;
export const HUD_RESIDUAL_SPIRIT_HEIGHT =
  UI_SPRITES.residualSpiritVesselFrame.displayH;
export const HUD_RESIDUAL_SPIRIT_LEFT =
  (UI_SPRITES.ultimateFrame.displayW - HUD_RESIDUAL_SPIRIT_WIDTH) / 2;
export const HUD_RESIDUAL_SPIRIT_TOP = 63;
export const HUD_RESIDUAL_SPIRIT_INTAKE = {
  left: RESIDUAL_SPIRIT_INTAKE_LEFT,
  top: RESIDUAL_SPIRIT_INTAKE_TOP,
  size: RESIDUAL_SPIRIT_INTAKE_SIZE,
} as const;

export function residualSpiritVesselIntakePoint(compact: boolean) {
  const intakeCenterX = HUD_RESIDUAL_SPIRIT_INTAKE.left
    + HUD_RESIDUAL_SPIRIT_INTAKE.size / 2;
  const intakeCenterY = HUD_RESIDUAL_SPIRIT_INTAKE.top
    + HUD_RESIDUAL_SPIRIT_INTAKE.size / 2;
  if (compact) {
    return {
      x: HUD_SCREEN_INSET + intakeCenterX * HUD_RESIDUAL_SPIRIT_COMPACT_SCALE,
      y: HUD_SCREEN_INSET + intakeCenterY * HUD_RESIDUAL_SPIRIT_COMPACT_SCALE,
    };
  }

  return {
    x: HUD_SCREEN_INSET + HUD_RESIDUAL_SPIRIT_LEFT + intakeCenterX,
    y: HUD_SCREEN_INSET + HUD_RESIDUAL_SPIRIT_TOP + intakeCenterY,
  };
}

export function usesCompactGameHud() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return !window.matchMedia(`(min-width: ${HUD_DESKTOP_BREAKPOINT_PX}px)`).matches;
}

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
