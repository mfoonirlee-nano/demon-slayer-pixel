import { describe, expect, it } from "vitest";
import { RUNNER_SHEET_INDEX, SKILL_IDS } from "../constants";
import { createInitialState } from "../game/state";
import type { EnemyState } from "../types/game-state";
import { equipEquipment } from "./equipment";
import {
  addEnemyRunXp,
  addRunXp,
  applyUpgradeChoice,
  enemyXp,
  hasLearnedUltimate,
  grantNonBossRunXp,
  nonBossRunXpHeadroom,
  skillDamageMultiplier,
  xpToNextLevel,
} from "./progression";

const LINE_PROJECTILE_LEVEL_TWO_DAMAGE_MULTIPLIER = 1.18;
const RUNNER_XP = 10;
const ELITE_RUNNER_XP = 15;
const UPGRADE_CHOICE_COUNT = 3;
const MAX_UNLEARNED_CHOICE_COUNT = 2;
const MAX_TEST_SKILL_LEVEL = 3;
const INITIAL_NON_BOSS_XP_HEADROOM = 869;
const LARGE_NON_BOSS_XP_GRANT = 10_000;
const EXPECTED_CAPPED_RUN_XP = 569;

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

  it("offers and learns the ultimate through character level-up choices", () => {
    const state = createInitialState();

    addRunXp(state, xpToNextLevel(1));

    expect(state.player.runLevel).toBe(2);
    expect(state.pendingUpgradeChoices).toHaveLength(UPGRADE_CHOICE_COUNT);
    expect(state.pendingUpgradeChoices.map((choice) => choice.type)).toEqual([
      "upgradeUltimate",
      "upgradeSkill",
      "unlockSkill",
    ]);
    expect(state.pendingUpgradeChoices[0]).toMatchObject({
      title: "习得终式",
      nextLevel: 1,
    });
    expect(state.pendingUpgradeChoices[1]).toMatchObject({
      skillId: SKILL_IDS.lineProjectile,
      nextLevel: 2,
    });
    expect(state.pendingUpgradeChoices.filter((choice) => choice.type === "unlockSkill")).toHaveLength(1);

    expect(applyUpgradeChoice(state, 0)).toBe(true);
    expect(state.player.ultimateLevel).toBe(1);
    expect(hasLearnedUltimate(state)).toBe(true);
  });

  it("limits unlearned normal skill options to two", () => {
    const state = createInitialState();
    state.player.ultimateLevel = MAX_TEST_SKILL_LEVEL;
    state.player.skillLevels[SKILL_IDS.lineProjectile] = MAX_TEST_SKILL_LEVEL;
    state.player.skillLevels[SKILL_IDS.closeArc] = MAX_TEST_SKILL_LEVEL;
    state.player.skillLevels[SKILL_IDS.guardCounter] = MAX_TEST_SKILL_LEVEL;

    addRunXp(state, xpToNextLevel(1));

    expect(
      state.pendingUpgradeChoices.filter((choice) => choice.type === "unlockSkill").length,
    ).toBeLessThanOrEqual(MAX_UNLEARNED_CHOICE_COUNT);
  });

  it("counts the ultimate unlock against the unlearned option limit", () => {
    const state = createInitialState();
    state.player.skillLevels[SKILL_IDS.lineProjectile] = MAX_TEST_SKILL_LEVEL;
    state.player.skillLevels[SKILL_IDS.closeArc] = MAX_TEST_SKILL_LEVEL;
    state.player.skillLevels[SKILL_IDS.guardCounter] = MAX_TEST_SKILL_LEVEL;

    addRunXp(state, xpToNextLevel(1));

    const unlearnedChoiceCount = state.pendingUpgradeChoices.filter((choice) => (
      choice.type === "unlockSkill" || choice.title === "习得终式"
    )).length;
    expect(unlearnedChoiceCount).toBeLessThanOrEqual(MAX_UNLEARNED_CHOICE_COUNT);
  });

  it("waits for one level 3 normal skill before offering ultimate level 2", () => {
    const state = createInitialState();
    state.player.ultimateLevel = 1;

    addRunXp(state, xpToNextLevel(1));

    expect(state.pendingUpgradeChoices.some((choice) => choice.type === "upgradeUltimate")).toBe(false);

    const readyState = createInitialState();
    readyState.player.ultimateLevel = 1;
    readyState.player.skillLevels[SKILL_IDS.lineProjectile] = MAX_TEST_SKILL_LEVEL;

    addRunXp(readyState, xpToNextLevel(1));

    expect(readyState.pendingUpgradeChoices).toContainEqual(expect.objectContaining({
      type: "upgradeUltimate",
      title: "终式精进",
      nextLevel: 2,
    }));
  });

  it("waits for three level 3 normal skills before offering ultimate level 3", () => {
    const state = createInitialState();
    state.player.ultimateLevel = 2;
    state.player.skillLevels[SKILL_IDS.lineProjectile] = MAX_TEST_SKILL_LEVEL;
    state.player.skillLevels[SKILL_IDS.closeArc] = MAX_TEST_SKILL_LEVEL;

    addRunXp(state, xpToNextLevel(1));

    expect(state.pendingUpgradeChoices.some((choice) => choice.type === "upgradeUltimate")).toBe(false);

    const readyState = createInitialState();
    readyState.player.ultimateLevel = 2;
    readyState.player.skillLevels[SKILL_IDS.lineProjectile] = MAX_TEST_SKILL_LEVEL;
    readyState.player.skillLevels[SKILL_IDS.closeArc] = MAX_TEST_SKILL_LEVEL;
    readyState.player.skillLevels[SKILL_IDS.guardCounter] = MAX_TEST_SKILL_LEVEL;

    addRunXp(readyState, xpToNextLevel(1));

    expect(readyState.pendingUpgradeChoices).toContainEqual(expect.objectContaining({
      type: "upgradeUltimate",
      title: "终式精进",
      nextLevel: 3,
    }));
  });

  it("learns a new skill at level 1 without replacing the full default loadout", () => {
    const state = createInitialState();

    addRunXp(state, xpToNextLevel(1));
    const unlockSkillIndex = state.pendingUpgradeChoices.findIndex((choice) => (
      choice.type === "unlockSkill" && choice.skillId === SKILL_IDS.dashReposition
    ));
    expect(unlockSkillIndex).toBeGreaterThanOrEqual(0);
    expect(applyUpgradeChoice(state, unlockSkillIndex)).toBe(true);

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

  it("keeps all equipped primary stat bonuses after level growth", () => {
    const state = createInitialState();
    state.equipmentInventory.push(
      { id: "flow_blade", tier: "fine" },
      { id: "flow_garb", tier: "fine" },
      { id: "flow_talisman", tier: "fine" },
    );
    expect(equipEquipment(state, "blade", "flow_blade")).toBe(true);
    expect(equipEquipment(state, "garb", "flow_garb")).toBe(true);
    expect(equipEquipment(state, "talisman", "flow_talisman")).toBe(true);
    expect(state.player).toMatchObject({ baseAttack: 20, maxHp: 120, skillEnergyMax: 110 });

    addRunXp(state, xpToNextLevel(1));

    expect(state.player).toMatchObject({
      runLevel: 2, baseAttack: 21, maxHp: 132, skillEnergyMax: 116, maxSkillCharges: 3,
    });
  });

  it("splits the old per-act healing budget across two smaller level-ups", () => {
    const state = createInitialState();
    state.player.hp = 50;

    addRunXp(state, xpToNextLevel(1));
    expect(state.player).toMatchObject({ runLevel: 2, hp: 58, maxHp: 110 });
    expect(applyUpgradeChoice(state, 0)).toBe(true);

    addRunXp(state, xpToNextLevel(2));
    expect(state.player).toMatchObject({ runLevel: 3, hp: 64, maxHp: 118 });
  });

  it("only gives the elite XP bonus to regular elite enemies", () => {
    const regularRunner = { sheetIndex: RUNNER_SHEET_INDEX, spawnSource: "regular" } as EnemyState;
    const regularEliteRunner = {
      sheetIndex: RUNNER_SHEET_INDEX,
      spawnSource: "regular",
      elite: true,
    } as EnemyState;
    const bossEliteRunner = {
      sheetIndex: RUNNER_SHEET_INDEX,
      spawnSource: "boss",
      elite: true,
    } as EnemyState;

    expect(enemyXp(regularRunner)).toBe(RUNNER_XP);
    expect(enemyXp(regularEliteRunner)).toBe(ELITE_RUNNER_XP);
    expect(enemyXp(bossEliteRunner)).toBe(RUNNER_XP);
  });

  it("banks enemy XP below the second act level until the boss is defeated", () => {
    const state = createInitialState();

    addEnemyRunXp(state, xpToNextLevel(1));
    expect(state.player.runLevel).toBe(2);
    expect(applyUpgradeChoice(state, 0)).toBe(true);

    addEnemyRunXp(state, xpToNextLevel(2));

    expect(state.player.runLevel).toBe(2);
    expect(state.player.runXp).toBe(xpToNextLevel(2) - 1);
    expect(state.pendingUpgradeChoices).toEqual([]);
  });

  it("clips a single large non-Boss XP grant before the Boss-reserved level", () => {
    const state = createInitialState();

    expect(nonBossRunXpHeadroom(state)).toBe(INITIAL_NON_BOSS_XP_HEADROOM);
    expect(grantNonBossRunXp(state, LARGE_NON_BOSS_XP_GRANT)).toBe(
      INITIAL_NON_BOSS_XP_HEADROOM,
    );

    expect(state.player.runLevel).toBe(2);
    expect(state.player.runXp).toBe(EXPECTED_CAPPED_RUN_XP);
    expect(state.pendingUpgradeChoices).toHaveLength(UPGRADE_CHOICE_COUNT);
  });
});
