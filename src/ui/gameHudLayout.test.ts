import { describe, expect, it } from "vitest";
import { UI_SPRITES } from "../constants";
import {
  HUD_CURRENT_SKILL_FRAME_TOP,
  HUD_HP_METER_FRAME,
  HUD_HP_METER_PLACEMENT,
  HUD_SKILL_METER_FRAME,
  HUD_SKILL_METER_PLACEMENT,
  HUD_ULTIMATE_FRAME_TOP,
} from "./gameHudLayout";

const HP_RIGHT_CAP_TOP = -3;
const HP_RIGHT_CAP_DISPLAY_W = 25;
const HP_RIGHT_CAP_DISPLAY_H = 24;
const SKILL_RIGHT_CAP_TOP = -3;
const SKILL_RIGHT_CAP_DISPLAY_W = 31;
const SKILL_RIGHT_CAP_DISPLAY_H = 25;

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

  it("aligns the taller right cap artwork with the middle frame segments", () => {
    expect(HUD_HP_METER_FRAME.rightTop).toBe(HP_RIGHT_CAP_TOP);
    expect(UI_SPRITES.hudHpBarRight.displayW).toBe(HP_RIGHT_CAP_DISPLAY_W);
    expect(UI_SPRITES.hudHpBarRight.displayH).toBe(HP_RIGHT_CAP_DISPLAY_H);
    expect(HUD_SKILL_METER_FRAME.rightTop).toBe(SKILL_RIGHT_CAP_TOP);
    expect(UI_SPRITES.hudSkillBarRight.displayW).toBe(SKILL_RIGHT_CAP_DISPLAY_W);
    expect(UI_SPRITES.hudSkillBarRight.displayH).toBe(SKILL_RIGHT_CAP_DISPLAY_H);
  });
});
