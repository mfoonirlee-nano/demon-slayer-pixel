import { describe, expect, it } from "vitest";
import { SKILL_IDS } from "../constants";
import { createInitialState } from "../game/state";
import {
  addRunXp,
  applyUpgradeChoice,
  hasLearnedUltimate,
  maybeDropBossUltimateUnlock,
  skillDamageMultiplier,
  xpToNextLevel,
} from "./progression";

const LINE_PROJECTILE_LEVEL_TWO_DAMAGE_MULTIPLIER = 1.18;
const BOSS_DROP_FAIL_ROLL = 0.99;

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
    expect(state.player.ultimateLevel).toBe(0);
    expect(hasLearnedUltimate(state)).toBe(false);
  });

  it("does not offer ultimate upgrades before the boss drop teaches the ultimate", () => {
    const state = createInitialState();

    addRunXp(state, xpToNextLevel(1));

    expect(state.player.runLevel).toBe(2);
    expect(state.pendingUpgradeChoices.map((choice) => choice.type)).toEqual([
      "unlockSkill",
      "upgradeSkill",
      "unlockSkill",
    ]);
    expect(state.pendingUpgradeChoices[0]).toMatchObject({
      skillId: SKILL_IDS.dashReposition,
      nextLevel: 1,
    });
    expect(state.pendingUpgradeChoices[1]).toMatchObject({
      skillId: SKILL_IDS.lineProjectile,
      nextLevel: 2,
    });
    expect(state.pendingUpgradeChoices.some((choice) => choice.type === "upgradeUltimate")).toBe(false);
  });

  it("can drop the ultimate unlock from a boss kill and learn it as level 1", () => {
    const state = createInitialState();

    expect(maybeDropBossUltimateUnlock(state, () => BOSS_DROP_FAIL_ROLL)).toBe(false);
    expect(state.pendingUpgradeChoices).toEqual([]);

    expect(maybeDropBossUltimateUnlock(state, () => 0)).toBe(true);
    expect(state.pendingUpgradeChoices[0]).toMatchObject({
      type: "upgradeUltimate",
      title: "习得终式",
      name: "终式·月潮无间 I",
      nextLevel: 1,
    });

    expect(applyUpgradeChoice(state, 0)).toBe(true);

    expect(state.player.ultimateLevel).toBe(1);
    expect(hasLearnedUltimate(state)).toBe(true);
  });

  it("offers ultimate upgrades after the boss drop teaches the ultimate", () => {
    const state = createInitialState();
    state.player.ultimateLevel = 1;

    addRunXp(state, xpToNextLevel(1));

    expect(state.pendingUpgradeChoices[1]).toMatchObject({
      type: "upgradeUltimate",
      title: "终式精进",
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

  it("uses core skill growth for cast damage and leaves generic damage to each skill tuning", () => {
    const state = createInitialState();

    expect(skillDamageMultiplier(state, SKILL_IDS.lineProjectile)).toBe(1);

    state.player.skillLevels[SKILL_IDS.lineProjectile] = 2;
    expect(skillDamageMultiplier(state, SKILL_IDS.lineProjectile)).toBe(LINE_PROJECTILE_LEVEL_TWO_DAMAGE_MULTIPLIER);

    state.player.skillLevels[SKILL_IDS.dashReposition] = 3;
    expect(skillDamageMultiplier(state, SKILL_IDS.dashReposition)).toBe(1);

    expect(skillDamageMultiplier(state, SKILL_IDS.verticalWave)).toBe(0);
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
