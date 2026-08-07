import { afterEach, describe, expect, it, vi } from "vitest";
import { BOSS_DEFEAT_SPLIT_VISUAL } from "../../constants";
import { playSfx } from "../../game/audio";
import { getStateSnapshot, resetState, state } from "../../game/state";
import { EQUIPMENT_CHOICE_IDS, chooseBossEquipment } from "../../systems/equipment";
import { addRunXp, xpToNextLevel } from "../../systems/progression";
import { spawnBoss } from "../boss";
import { updateBossDefeatSplitEffect } from "./bossDefeatSplitEffect";
import { defeatBoss } from "./defeat";
import { BOSS_ARCHETYPE_IDS } from "./registry";

vi.mock("../../game/audio", () => ({ playSfx: vi.fn() }));

const BOSS_REWARD_CHOICE_COUNT = 3;
const FINAL_BOSS_START_KILLS = 12;
const FINAL_BOSS_CLEARED_KILLS = 13;
const SECOND_ACT = 2;
const PARTIAL_LEVEL_XP = 200;
const LEVEL_AFTER_FIRST_BOSS = 2;
const LEVEL_AFTER_BANKED_FINAL_REWARDS = 4;

describe("boss defeat progression", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("grants one run level, equipment, and continues after a non-final boss", () => {
    resetState();
    state.bossKills = 0;
    state.player.runXp = PARTIAL_LEVEL_XP;
    spawnBoss(BOSS_ARCHETYPE_IDS.spiderString);
    if (!state.boss) throw new Error("Boss did not spawn");
    state.boss.hp = 0;

    expect(defeatBoss()).toBe(true);

    expect(state.gameOver).toBe(false);
    expect(state.runCleared).toBe(false);
    expect(state.bossKills).toBe(1);
    expect(state.enemyDirector.act).toBe(SECOND_ACT);
    expect(getStateSnapshot().act).toBe(SECOND_ACT);
    expect(state.player.runLevel).toBe(LEVEL_AFTER_FIRST_BOSS);
    expect(state.player.runXp).toBe(0);
    expect(state.pendingUpgradeChoices).toHaveLength(BOSS_REWARD_CHOICE_COUNT);
    expect(state.pendingEquipmentChoices).toHaveLength(BOSS_REWARD_CHOICE_COUNT);
  });

  it("shows equipment before the boss-triggered level-up reward", () => {
    resetState();
    spawnBoss(BOSS_ARCHETYPE_IDS.spiderString);
    if (!state.boss) throw new Error("Boss did not spawn");
    state.boss.hp = 0;

    expect(defeatBoss()).toBe(true);

    expect(state.pendingEquipmentChoices).toHaveLength(BOSS_REWARD_CHOICE_COUNT);
    expect(state.pendingUpgradeChoices).toHaveLength(BOSS_REWARD_CHOICE_COUNT);
    expect(state.bossDefeatSplitEffect).not.toBeNull();
    expect(getStateSnapshot().activeOverlay).toBe("none");

    finishBossDefeatSplitEffect();

    expect(getStateSnapshot().activeOverlay).toBe("bossEquipment");
    expect(chooseBossEquipment(state, 0)).toBe(true);
    expect(getStateSnapshot().activeOverlay).toBe("upgrade");
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
    expect(getStateSnapshot().activeOverlay).toBe("none");

    finishBossDefeatSplitEffect();

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
    expect(getStateSnapshot().activeOverlay).toBe("none");

    finishBossDefeatSplitEffect();

    expect(getStateSnapshot().activeOverlay).toBe("victory");
  });

  it("settles banked level-ups before clearing the final boss reward choices", () => {
    resetState();
    state.bossKills = FINAL_BOSS_START_KILLS;
    addRunXp(state, xpToNextLevel(1));
    addRunXp(state, xpToNextLevel(2));
    spawnBoss(BOSS_ARCHETYPE_IDS.bloodMoon);
    if (!state.boss) throw new Error("Boss did not spawn");
    state.boss.hp = 0;

    expect(defeatBoss()).toBe(true);

    expect(state.player.runLevel).toBe(LEVEL_AFTER_BANKED_FINAL_REWARDS);
    expect(state.player.runXp).toBe(0);
    expect(state.pendingUpgradeChoices).toEqual([]);
  });

  it("clears Mist Bone hazards and uses its own death sound after capturing the lethal pose", () => {
    resetState();
    spawnBoss(BOSS_ARCHETYPE_IDS.mistBone);
    if (!state.boss) throw new Error("Boss did not spawn");
    state.mistBoneFogs.push({
      kind: "thin",
      x: 100,
      y: 300,
      radiusX: 120,
      radiusY: 40,
      life: 60,
      maxLife: 60,
      elapsed: 0,
    });
    state.mistBoneSpikes.push({
      x: 100,
      y: 300,
      w: 40,
      h: 80,
      delay: 0,
      warningFrames: 20,
      elapsed: 0,
      frame: 0,
      life: 60,
      damage: 8,
      hitPlayer: false,
    });
    state.boss.hp = 0;
    vi.mocked(playSfx).mockClear();

    expect(defeatBoss()).toBe(true);

    expect(state.bossDefeatSplitEffect).toMatchObject({ kind: "mistBoneScatter" });
    expect(state.mistBoneFogs).toEqual([]);
    expect(state.mistBoneSpikes).toEqual([]);
    expect(playSfx).toHaveBeenCalledOnce();
    expect(playSfx).toHaveBeenCalledWith("bossMistBoneDeath");
  });
});

function finishBossDefeatSplitEffect() {
  for (let frame = 0; frame < BOSS_DEFEAT_SPLIT_VISUAL.durationFrames; frame += 1) {
    updateBossDefeatSplitEffect();
  }
}
