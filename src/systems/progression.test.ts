import { describe, expect, it } from "vitest";
import { SKILL_IDS } from "../constants";
import { createInitialState } from "../game/state";
import {
  addRunXp,
  applyUpgradeChoice,
  xpToNextLevel,
} from "./progression";

describe("run progression skills", () => {
  it("starts each run with the three default normal skills learned and equipped", () => {
    const state = createInitialState();

    expect(state.player.skillLevels).toMatchObject({
      [SKILL_IDS.lineProjectile]: 1,
      [SKILL_IDS.closeArc]: 1,
      [SKILL_IDS.guardCounter]: 1,
    });
    expect(state.player.equippedSkillIds).toEqual([
      SKILL_IDS.lineProjectile,
      SKILL_IDS.closeArc,
      SKILL_IDS.guardCounter,
    ]);
  });

  it("offers an unlock, ultimate upgrade, and learned skill upgrade on the first level up", () => {
    const state = createInitialState();

    addRunXp(state, xpToNextLevel(1));

    expect(state.player.runLevel).toBe(2);
    expect(state.pendingUpgradeChoices.map((choice) => choice.type)).toEqual([
      "unlockSkill",
      "upgradeUltimate",
      "upgradeSkill",
    ]);
    expect(state.pendingUpgradeChoices[0]).toMatchObject({
      skillId: SKILL_IDS.dashReposition,
      nextLevel: 1,
    });
    expect(state.pendingUpgradeChoices[1]).toMatchObject({
      nextLevel: 1,
    });
    expect(state.pendingUpgradeChoices[2]).toMatchObject({
      skillId: SKILL_IDS.lineProjectile,
      nextLevel: 2,
    });
  });

  it("learns a new skill at level 1 without replacing the full default loadout", () => {
    const state = createInitialState();

    addRunXp(state, xpToNextLevel(1));
    expect(applyUpgradeChoice(state, 0)).toBe(true);

    expect(state.player.skillLevels[SKILL_IDS.dashReposition]).toBe(1);
    expect(state.player.equippedSkillIds).toEqual([
      SKILL_IDS.lineProjectile,
      SKILL_IDS.closeArc,
      SKILL_IDS.guardCounter,
    ]);
  });

  it("skips upgrade choices when every implemented skill and ultimate are capped", () => {
    const state = createInitialState();

    for (const skillId of Object.values(SKILL_IDS)) {
      state.player.skillLevels[skillId] = 3;
    }
    state.player.ultimateLevel = 3;

    addRunXp(state, xpToNextLevel(1));

    expect(state.player.runLevel).toBe(2);
    expect(state.pendingUpgradeChoices).toEqual([]);
  });
});
