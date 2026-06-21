import { describe, expect, it } from "vitest";
import { getStateSnapshot, resetState, state } from "../../game/state";
import { spawnBoss } from "../boss";
import { defeatBoss } from "./defeat";
import { BOSS_ARCHETYPE_IDS } from "./registry";

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
    expect(state.pendingEquipmentChoices).toHaveLength(3);
  });

  it("clears the run after defeating the final boss without opening equipment choices", () => {
    resetState();
    state.bossKills = 12;
    spawnBoss(BOSS_ARCHETYPE_IDS.bloodMoon);
    if (!state.boss) throw new Error("Boss did not spawn");
    state.boss.hp = 0;

    expect(defeatBoss()).toBe(true);

    expect(state.gameOver).toBe(true);
    expect(state.runCleared).toBe(true);
    expect(state.bossKills).toBe(13);
    expect(state.boss).toBeNull();
    expect(state.pendingEquipmentChoices).toEqual([]);
    expect(state.pendingUpgradeChoices).toEqual([]);
    expect(getStateSnapshot().activeOverlay).toBe("victory");
  });
});
