import { describe, expect, it } from "vitest";
import { SKILL_IDS } from "../constants";
import { createInitialState } from "../game/state";
import { equipSkillSlot, setSkillLevel, skillLevel } from "./loadout";

const MAX_TEST_SKILL_LEVEL = 3;

describe("skill loadout", () => {
  it("sets a learned skill to the requested level", () => {
    const state = createInitialState();

    expect(setSkillLevel(state, SKILL_IDS.lineProjectile, MAX_TEST_SKILL_LEVEL)).toBe(true);

    expect(skillLevel(state, SKILL_IDS.lineProjectile)).toBe(MAX_TEST_SKILL_LEVEL);
  });

  it("can learn an unlearned skill at a requested level before equipping it", () => {
    const state = createInitialState();

    expect(equipSkillSlot(state, 0, SKILL_IDS.dashReposition)).toBe(false);

    expect(setSkillLevel(state, SKILL_IDS.dashReposition, 2)).toBe(true);

    expect(skillLevel(state, SKILL_IDS.dashReposition)).toBe(2);
    expect(equipSkillSlot(state, 0, SKILL_IDS.dashReposition)).toBe(true);
  });
});
