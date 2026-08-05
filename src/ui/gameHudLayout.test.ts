import { describe, expect, it } from "vitest";
import { UI_SPRITES } from "../constants";
import {
  HUD_CURRENT_SKILL_FRAME_LEFT,
  HUD_CURRENT_SKILL_FRAME_TOP,
  HUD_HP_METER_FRAME,
  HUD_HP_METER_PLACEMENT,
  HUD_SKILL_METER_FRAME,
  HUD_SKILL_METER_PLACEMENT,
  HUD_RESIDUAL_SPIRIT_HEIGHT,
  HUD_RESIDUAL_SPIRIT_LEFT,
  HUD_RESIDUAL_SPIRIT_TOP,
  HUD_RESIDUAL_SPIRIT_WIDTH,
  HUD_STATUS_BAR_ICON_SIZE,
  HUD_STATUS_BAR_LEFT,
  HUD_STATUS_BAR_TOP,
  HUD_ULTIMATE_FRAME_TOP,
} from "./gameHudLayout";

const HP_RIGHT_CAP_DISPLAY_W = 25;
const HP_RIGHT_CAP_DISPLAY_H = 24;
const SKILL_RIGHT_CAP_DISPLAY_W = 31;
const SKILL_RIGHT_CAP_DISPLAY_H = 25;
const PREVIOUS_STATUS_ICON_DISPLAY_SIZE = 24;
const STATUS_ICON_SCALE = 0.8;
// Visible join rows after runtime sprite scaling.
const HP_MID_UPPER_RAIL_TOP = 6;
const HP_RIGHT_CAP_UPPER_RAIL_TOP = 6;
const HP_MID_FILL_WINDOW = { top: 10, bottom: 15 };
const HP_RIGHT_CAP_FILL_WINDOW = { top: 10, bottom: 15 };
const SKILL_MID_UPPER_RAIL_HIGHLIGHT = 3;
const SKILL_RIGHT_CAP_UPPER_RAIL_HIGHLIGHT = 6;
const SKILL_MID_INNER_SLOT_CENTER = 9;
const SKILL_RIGHT_CAP_INNER_SLOT_CENTER = 12;

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

  it("aligns visible rails and inner slot centers across frame joins", () => {
    expect({
      hp: HUD_HP_METER_FRAME.rightTop + HP_RIGHT_CAP_UPPER_RAIL_TOP,
      skill: HUD_SKILL_METER_FRAME.rightTop + SKILL_RIGHT_CAP_UPPER_RAIL_HIGHLIGHT,
    }).toEqual({
      hp: HP_MID_UPPER_RAIL_TOP,
      skill: SKILL_MID_UPPER_RAIL_HIGHLIGHT,
    });
    expect(HUD_SKILL_METER_FRAME.rightTop + SKILL_RIGHT_CAP_INNER_SLOT_CENTER)
      .toBe(SKILL_MID_INNER_SLOT_CENTER);
    expect({
      top: HUD_HP_METER_FRAME.rightTop + HP_RIGHT_CAP_FILL_WINDOW.top,
      bottom: HUD_HP_METER_FRAME.rightTop + HP_RIGHT_CAP_FILL_WINDOW.bottom,
    }).toEqual(HP_MID_FILL_WINDOW);
    expect(UI_SPRITES.hudHpBarRight.displayW).toBe(HP_RIGHT_CAP_DISPLAY_W);
    expect(UI_SPRITES.hudHpBarRight.displayH).toBe(HP_RIGHT_CAP_DISPLAY_H);
    expect(UI_SPRITES.hudSkillBarRight.displayW).toBe(SKILL_RIGHT_CAP_DISPLAY_W);
    expect(UI_SPRITES.hudSkillBarRight.displayH).toBe(SKILL_RIGHT_CAP_DISPLAY_H);
  });

  it("attaches the smaller status icons below the skill meter without covering the skill frame", () => {
    const skillFrameRight = HUD_CURRENT_SKILL_FRAME_LEFT + UI_SPRITES.currentSkillFrame.displayW;
    const skillMeterArtworkBottom = HUD_SKILL_METER_PLACEMENT.top + Math.max(
      HUD_SKILL_METER_FRAME.height,
      HUD_SKILL_METER_FRAME.rightTop + UI_SPRITES.hudSkillBarRight.displayH,
    );

    expect(HUD_STATUS_BAR_LEFT).toBe(skillFrameRight);
    expect(HUD_STATUS_BAR_TOP).toBe(skillMeterArtworkBottom);
    expect(HUD_STATUS_BAR_ICON_SIZE).toBe(PREVIOUS_STATUS_ICON_DISPLAY_SIZE * STATUS_ICON_SCALE);
  });

  it("places the residual-spirit vessel under the ability frames and beside statuses", () => {
    expect({
      left: HUD_RESIDUAL_SPIRIT_LEFT,
      top: HUD_RESIDUAL_SPIRIT_TOP,
      width: HUD_RESIDUAL_SPIRIT_WIDTH,
      height: HUD_RESIDUAL_SPIRIT_HEIGHT,
    }).toEqual({ left: 28, top: 63, width: 64, height: 33 });
    expect(HUD_RESIDUAL_SPIRIT_LEFT + HUD_RESIDUAL_SPIRIT_WIDTH)
      .toBeLessThanOrEqual(HUD_STATUS_BAR_LEFT);
  });

  it("registers the generated three-times HUD vessel frame", () => {
    expect(UI_SPRITES.residualSpiritVesselFrame).toEqual({
      src: "assets/sprites/ui/system/hud/residual-spirit-vessel-frame.png",
      w: 192,
      h: 99,
      displayW: 64,
      displayH: 33,
    });
  });
});
