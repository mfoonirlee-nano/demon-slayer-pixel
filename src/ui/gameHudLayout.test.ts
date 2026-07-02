import { describe, expect, it } from "vitest";
import { UI_SPRITES } from "../constants";
import {
  HUD_HP_METER_FRAME,
  HUD_HP_METER_PLACEMENT,
  HUD_SKILL_METER_FRAME,
  HUD_SKILL_METER_PLACEMENT,
} from "./gameHudLayout";

const HP_RIGHT_CAP_TOP = -4;
const HP_RIGHT_CAP_DISPLAY_W = 25;
const HP_RIGHT_CAP_DISPLAY_H = 24;
const SKILL_RIGHT_CAP_TOP = -4;
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

  it("places player meters tight against their left ability frames", () => {
    expect(HUD_HP_METER_PLACEMENT).toEqual({ left: 68, top: 15 });
    expect(HUD_SKILL_METER_PLACEMENT).toEqual({ left: 92, top: 39 });
  });

  it("keeps the right cap artwork tall enough for the upper corner flourish", () => {
    expect(HUD_HP_METER_FRAME.rightTop).toBe(HP_RIGHT_CAP_TOP);
    expect(UI_SPRITES.hudHpBarRight.displayW).toBe(HP_RIGHT_CAP_DISPLAY_W);
    expect(UI_SPRITES.hudHpBarRight.displayH).toBe(HP_RIGHT_CAP_DISPLAY_H);
    expect(HUD_SKILL_METER_FRAME.rightTop).toBe(SKILL_RIGHT_CAP_TOP);
    expect(UI_SPRITES.hudSkillBarRight.displayW).toBe(SKILL_RIGHT_CAP_DISPLAY_W);
    expect(UI_SPRITES.hudSkillBarRight.displayH).toBe(SKILL_RIGHT_CAP_DISPLAY_H);
  });
});
