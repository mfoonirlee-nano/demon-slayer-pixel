import { describe, expect, it } from "vitest";
import { getStateSnapshot, resetState, state } from "../../game/state";
import { EQUIPMENT_CHOICE_IDS, chooseBossEquipment } from "../../systems/equipment";
import { spawnBoss } from "../boss";
import { defeatBoss } from "./defeat";
import { BOSS_ARCHETYPE_IDS } from "./registry";

const BOSS_REWARD_CHOICE_COUNT = 3;
const FINAL_BOSS_START_KILLS = 12;
const FINAL_BOSS_CLEARED_KILLS = 13;
const SECOND_ACT = 2;

describe("boss defeat progression", () => {
  it("grants equipment and continues the run after a non-final boss", () => {
    resetState();
    state.bossKills = 0;
    spawnBoss(BOSS_ARCHETYPE_IDS.spiderString);
    if (!state.boss) throw new Error("Boss did not spawn");
    state.boss.hp = 0;

    expect(defeatBoss()).toBe(true);

    expect(state.gameOver).toBe(false);
    expect(state.runCleared).toBe(false);
    expect(state.bossKills).toBe(1);
    expect(state.enemyDirector.act).toBe(SECOND_ACT);
    expect(getStateSnapshot().act).toBe(SECOND_ACT);
    expect(state.pendingEquipmentChoices).toHaveLength(BOSS_REWARD_CHOICE_COUNT);
  });

  it("does not create an ultimate reward after a boss defeat", () => {
    resetState();
    spawnBoss(BOSS_ARCHETYPE_IDS.spiderString);
    if (!state.boss) throw new Error("Boss did not spawn");
    state.boss.hp = 0;

    expect(defeatBoss()).toBe(true);

    expect(state.pendingEquipmentChoices).toHaveLength(BOSS_REWARD_CHOICE_COUNT);
    expect(state.pendingUpgradeChoices).toEqual([]);
    expect(getStateSnapshot().activeOverlay).toBe("bossEquipment");
  });

  it("opens awakened equipment choices after defeating the final boss, then clears after selection", () => {
    resetState();
    state.bossKills = FINAL_BOSS_START_KILLS;
    state.player.ultimateLevel = 1;
    spawnBoss(BOSS_ARCHETYPE_IDS.bloodMoon);
    if (!state.boss) throw new Error("Boss did not spawn");
    state.boss.hp = 0;

    expect(defeatBoss()).toBe(true);

    expect(state.gameOver).toBe(false);
    expect(state.runCleared).toBe(false);
    expect(state.bossKills).toBe(FINAL_BOSS_CLEARED_KILLS);
    expect(state.boss).toBeNull();
    expect(state.pendingEquipmentChoices).toHaveLength(BOSS_REWARD_CHOICE_COUNT);
    expect(state.pendingEquipmentChoices.every((choice) => choice.tier === "awakened")).toBe(true);
    expect(state.pendingUpgradeChoices).toEqual([]);
    expect(getStateSnapshot().activeOverlay).toBe("bossEquipment");

    expect(chooseBossEquipment(state, 0)).toBe(true);

    expect(state.gameOver).toBe(true);
    expect(state.runCleared).toBe(true);
    expect(state.pendingEquipmentChoices).toEqual([]);
    expect(getStateSnapshot().activeOverlay).toBe("victory");
  });

  it("clears the run immediately after the final boss when no awakened equipment candidates exist", () => {
    resetState();
    state.bossKills = FINAL_BOSS_START_KILLS;
    state.equipmentInventory = EQUIPMENT_CHOICE_IDS.map((id) => ({ id, tier: "awakened" }));
    spawnBoss(BOSS_ARCHETYPE_IDS.bloodMoon);
    if (!state.boss) throw new Error("Boss did not spawn");
    state.boss.hp = 0;

    expect(defeatBoss()).toBe(true);

    expect(state.gameOver).toBe(true);
    expect(state.runCleared).toBe(true);
    expect(state.bossKills).toBe(FINAL_BOSS_CLEARED_KILLS);
    expect(state.boss).toBeNull();
    expect(state.pendingEquipmentChoices).toEqual([]);
    expect(state.pendingUpgradeChoices).toEqual([]);
    expect(getStateSnapshot().activeOverlay).toBe("victory");
  });
});
