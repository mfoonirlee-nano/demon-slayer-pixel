import { describe, expect, it } from "vitest";
import { UI_SPRITES } from "../constants";
import {
  HUD_CURRENT_SKILL_FRAME_TOP,
  HUD_HP_METER_FRAME,
  HUD_HP_METER_PLACEMENT,
  HUD_SKILL_METER_FRAME,
  HUD_SKILL_METER_PLACEMENT,
  HUD_STATUS_BAR_ICON_SIZE,
  HUD_STATUS_BAR_LEFT,
  HUD_STATUS_BAR_TOP,
  HUD_ULTIMATE_FRAME_TOP,
} from "./gameHudLayout";

const HP_RIGHT_CAP_DISPLAY_W = 25;
const HP_RIGHT_CAP_DISPLAY_H = 24;
const SKILL_RIGHT_CAP_DISPLAY_W = 31;
const SKILL_RIGHT_CAP_DISPLAY_H = 25;
const STATUS_BAR_GAP_FROM_SKILL_FRAME = 4;
const STATUS_ICON_DISPLAY_SIZE = 24;
// First fully visible upper-rail rows at each join after runtime sprite scaling.
const HP_MID_UPPER_RAIL_TOP = 6;
const HP_RIGHT_CAP_UPPER_RAIL_TOP = 6;
const HP_MID_FILL_WINDOW = { top: 10, bottom: 15 };
const HP_RIGHT_CAP_FILL_WINDOW = { top: 10, bottom: 15 };
const SKILL_MID_UPPER_RAIL_TOP = 2;
const SKILL_RIGHT_CAP_UPPER_RAIL_TOP = 6;

describe("game HUD layout", () => {
  it("centers the skill meter fill in the skill frame artwork", () => {
    const fillCenterY = (
      HUD_SKILL_METER_FRAME.fillTop
      + HUD_SKILL_METER_FRAME.height
      - HUD_SKILL_METER_FRAME.fillBottom
    ) / 2;

    expect(fillCenterY).toBe(HUD_SKILL_METER_FRAME.height / 2);
  });

  it("centers player meter tracks on their ability frames", () => {
    const hpFillCenterY = HUD_HP_METER_PLACEMENT.top
      + (HUD_HP_METER_FRAME.fillTop + HUD_HP_METER_FRAME.height - HUD_HP_METER_FRAME.fillBottom) / 2;
    const skillFillCenterY = HUD_SKILL_METER_PLACEMENT.top
      + (HUD_SKILL_METER_FRAME.fillTop + HUD_SKILL_METER_FRAME.height - HUD_SKILL_METER_FRAME.fillBottom) / 2;

    expect({
      hp: HUD_HP_METER_PLACEMENT.left,
      skill: HUD_SKILL_METER_PLACEMENT.left,
    }).toEqual({ hp: 68, skill: 92 });
    expect(hpFillCenterY).toBe(HUD_ULTIMATE_FRAME_TOP + UI_SPRITES.ultimateFrame.displayH / 2);
    expect(skillFillCenterY).toBe(HUD_CURRENT_SKILL_FRAME_TOP + UI_SPRITES.currentSkillFrame.displayH / 2);
  });

  it("aligns the visible rails and HP fill window across frame joins", () => {
    expect({
      hp: HUD_HP_METER_FRAME.rightTop + HP_RIGHT_CAP_UPPER_RAIL_TOP,
      skill: HUD_SKILL_METER_FRAME.rightTop + SKILL_RIGHT_CAP_UPPER_RAIL_TOP,
    }).toEqual({
      hp: HP_MID_UPPER_RAIL_TOP,
      skill: SKILL_MID_UPPER_RAIL_TOP,
    });
    expect({
      top: HUD_HP_METER_FRAME.rightTop + HP_RIGHT_CAP_FILL_WINDOW.top,
      bottom: HUD_HP_METER_FRAME.rightTop + HP_RIGHT_CAP_FILL_WINDOW.bottom,
    }).toEqual(HP_MID_FILL_WINDOW);
    expect(UI_SPRITES.hudHpBarRight.displayW).toBe(HP_RIGHT_CAP_DISPLAY_W);
    expect(UI_SPRITES.hudHpBarRight.displayH).toBe(HP_RIGHT_CAP_DISPLAY_H);
    expect(UI_SPRITES.hudSkillBarRight.displayW).toBe(SKILL_RIGHT_CAP_DISPLAY_W);
    expect(UI_SPRITES.hudSkillBarRight.displayH).toBe(SKILL_RIGHT_CAP_DISPLAY_H);
  });

  it("places status icons below both the skill meter and current-skill frame", () => {
    const occupiedBottom = Math.max(
      HUD_SKILL_METER_PLACEMENT.top + HUD_SKILL_METER_FRAME.height,
      HUD_CURRENT_SKILL_FRAME_TOP + UI_SPRITES.currentSkillFrame.displayH,
    );

    expect(HUD_STATUS_BAR_LEFT).toBe(HUD_SKILL_METER_PLACEMENT.left);
    expect(HUD_STATUS_BAR_TOP).toBe(occupiedBottom + STATUS_BAR_GAP_FROM_SKILL_FRAME);
    expect(HUD_STATUS_BAR_ICON_SIZE).toBe(STATUS_ICON_DISPLAY_SIZE);
  });
});
