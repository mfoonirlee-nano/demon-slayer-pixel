import { describe, expect, it } from "vitest";
import type { EnemyId, EnemyState } from "../types/game-state";
import {
  bossSummonBudgetForPhase,
  buildCurrentEnemyPool,
  buildRunEnemyOrder,
  canSpawnBossSummon,
  createEnemyDirectorState,
  pickBossSummonEnemyId,
  updateEnemyDirector,
} from "./enemyDirector";
import {
  actForBossKills,
  bossGateForAct,
  bossPreludeWaitSeconds,
  rewardValuesForAct,
  threatScalarForRun,
} from "./runProgression";

describe("act progression", () => {
  it("derives the capped 13-act structure from boss kills", () => {
    expect(actForBossKills(0)).toBe(1);
    expect(actForBossKills(5)).toBe(6);
    expect(actForBossKills(12)).toBe(13);
    expect(actForBossKills(99)).toBe(13);
  });

  it("uses the segmented threat scalar from the act design", () => {
    expect(threatScalarForRun(0, 0)).toBeCloseTo(1);
    expect(threatScalarForRun(6, 240)).toBeCloseTo(1 + 6 * 0.26 + 0.1);
    expect(threatScalarForRun(8, 999)).toBeCloseTo(1 + 6 * 0.26 + 2 * 0.34 + 0.15);
  });

  it("uses act-band reward values", () => {
    expect(rewardValuesForAct(1)).toMatchObject({ attackCrystal: 2, healthCrystal: 24 });
    expect(rewardValuesForAct(7)).toMatchObject({ attackCrystal: 4, chestHeal: 60 });
    expect(rewardValuesForAct(13)).toMatchObject({ attackCrystal: 4, healthCrystal: 32, chestHeal: 64 });
  });

  it("uses wave and prelude gates by act band", () => {
    expect(bossGateForAct(1)).toEqual({ minWaves: 3, minElapsed: 45, maxElapsed: 75 });
    expect(bossGateForAct(8)).toEqual({ minWaves: 5, minElapsed: 75, maxElapsed: 120 });
    expect(bossPreludeWaitSeconds(13)).toBe(0);
  });
});

describe("enemy director rules", () => {
  it("builds a stable enemy order with the three tutorial pressures first", () => {
    const order = buildRunEnemyOrder(1234);

    expect(order.slice(0, 3)).toEqual(["chaser", "crawler", "runner"]);
    expect(new Set(order).size).toBe(12);
  });

  it("builds act pools with the designed sizes and final basic-enemy exclusion", () => {
    const order = buildRunEnemyOrder(1234);
    const act1 = buildCurrentEnemyPool(1, order, "basic_intro").map((entry) => entry.enemyId);
    const act6 = buildCurrentEnemyPool(6, order, "mixed_pressure").map((entry) => entry.enemyId);
    const final = buildCurrentEnemyPool(13, order, "final").map((entry) => entry.enemyId);

    expect(act1).toEqual(["chaser", "crawler", "runner"]);
    expect(act6).toHaveLength(8);
    expect(final).toHaveLength(9);
    expect(final).not.toContain("chaser");
    expect(final).not.toContain("crawler");
    expect(final).not.toContain("runner");
  });

  it("creates a non-repeating awakened profile cycle", () => {
    const director = createEnemyDirectorState(1234);
    const awakenedProfiles = new Set(director.awakenedProfileOrder);

    expect(director.awakenedProfileOrder).toHaveLength(6);
    expect(awakenedProfiles.size).toBe(6);
  });

  it("starts boss prelude after the act gate and then requests the boss", () => {
    const director = createEnemyDirectorState(1234);
    director.wavesCleared = 3;
    director.elapsedInAct = 45;

    const firstUpdate = updateEnemyDirector(director, {
      dt: 0,
      bossKills: 0,
      elapsedSeconds: 45,
      activeEnemies: [],
      playerHp: 100,
      playerMaxHp: 100,
      bossActive: false,
    });
    const secondUpdate = updateEnemyDirector(director, {
      dt: bossPreludeWaitSeconds(1),
      bossKills: 0,
      elapsedSeconds: 48,
      activeEnemies: [],
      playerHp: 100,
      playerMaxHp: 100,
      bossActive: false,
    });

    expect(firstUpdate.spawnBoss).toBe(false);
    expect(secondUpdate.spawnBoss).toBe(true);
  });

  it("does not request regular tier-one enemies in the final pool", () => {
    const tierOne: EnemyId[] = ["chaser", "crawler", "runner"];
    const finalPool = createEnemyDirectorState(1234);
    finalPool.act = 13;
    finalPool.currentProfile = "final";
    finalPool.currentPool = buildCurrentEnemyPool(13, finalPool.runEnemyOrder, "final");

    expect(finalPool.currentPool.some((entry) => tierOne.includes(entry.enemyId))).toBe(false);
  });

  it("narrows boss summon picks by phase and caps final boss summons", () => {
    const director = createEnemyDirectorState(1234);
    director.currentPool = buildCurrentEnemyPool(6, director.runEnemyOrder, "mixed_pressure");

    const phaseOneSummon = pickBossSummonEnemyId(director, () => 0.99, {
      phase: 1,
      awakened: false,
      finalBoss: false,
    });
    const finalBudget = bossSummonBudgetForPhase(5, true, true);
    const existingSummons = Array.from({ length: finalBudget.maxCount }, () => ({
      id: "duelist",
      spawnSource: "boss",
      spawnCost: 1,
    })) as EnemyState[];

    expect(["chaser", "crawler", "runner"]).toContain(phaseOneSummon);
    expect(finalBudget.maxCount).toBe(4);
    expect(canSpawnBossSummon(existingSummons, 1, 5, true, true)).toBe(false);
  });
});
