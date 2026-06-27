import { describe, expect, it } from "vitest";
import type { EnemyId, EnemyState } from "../types/game-state";
import {
  bossSummonBudgetForPhase,
  buildCurrentEnemyPool,
  buildRunEnemyOrder,
  canSpawnBossSummon,
  createEnemyDirectorState,
  enemySpawnCost,
  maxActiveSpawnCostForAct,
  pickBossSummonEnemyId,
  pickWavePlan,
  updateEnemyDirector,
} from "./enemyDirector";
import {
  actForBossKills,
  bossGateForAct,
  bossPreludeWaitSeconds,
  rewardValuesForAct,
  threatScalarForRun,
} from "./runProgression";

const NO_BOSS_KILLS = 0;
const ACT_SIX_BOSS_KILLS = 5;
const FINAL_ACT_BOSS_KILLS = 12;
const OVER_CAP_BOSS_KILLS = 99;
const ACT_ONE = 1;
const ACT_SIX = 6;
const ACT_SEVEN = 7;
const ACT_EIGHT = 8;
const FINAL_ACT = 13;
const THREAT_RAMP_BOSS_KILLS = 6;
const THREAT_RAMP_SECONDS = 240;
const THREAT_RAMP_PER_BOSS = 0.26;
const THREAT_RAMP_TIME_BONUS = 0.1;
const AWAKENED_THREAT_BOSS_KILLS = 8;
const AWAKENED_THREAT_SECONDS = 999;
const AWAKENED_EXTRA_BOSS_KILLS = 2;
const AWAKENED_THREAT_PER_BOSS = 0.34;
const AWAKENED_TIME_BONUS = 0.15;
const BASE_THREAT_SCALAR = 1;
const EARLY_REWARD_HEALTH_CRYSTALS = 24;
const MID_REWARD_ATTACK_CRYSTALS = 4;
const MID_REWARD_CHEST_HEAL = 60;
const FINAL_REWARD_HEALTH_CRYSTALS = 32;
const FINAL_REWARD_CHEST_HEAL = 64;
const ACT_ONE_MIN_WAVES = 3;
const ACT_ONE_MIN_ELAPSED = 45;
const ACT_ONE_MAX_ELAPSED = 75;
const ACT_EIGHT_MIN_WAVES = 5;
const ACT_EIGHT_MIN_ELAPSED = 75;
const ACT_EIGHT_MAX_ELAPSED = 120;
const TEST_RUN_SEED = 1234;
const TUTORIAL_ENEMY_COUNT = 3;
const FULL_ENEMY_ROSTER_SIZE = 12;
const FINAL_POOL_SIZE = 9;
const ACT_ONE_PLAYER_HP = 100;
const ACT_ONE_PLAYER_MAX_HP = 100;
const SECOND_UPDATE_ELAPSED_SECONDS = 48;
const BOSS_PHASE_FIVE = 5;
const FINAL_BOSS_SUMMON_BUDGET_COUNT = 4;
const BOSS_SUMMON_SPAWN_COST = 1;
const LATE_POOL_RANDOM_ROLL = 0.99;
const AWAKENED_SAMPLE_WAVES = 12;
const FINAL_SAMPLE_WAVES = 6;

function wavePlanSpawnCost(entries: ReturnType<typeof pickWavePlan>) {
  return entries.reduce((total, entry) => (
    total + enemySpawnCost(entry.enemyId, entry.elite) * entry.count
  ), 0);
}

describe("act progression", () => {
  it("derives the capped 13-act structure from boss kills", () => {
    expect(actForBossKills(NO_BOSS_KILLS)).toBe(ACT_ONE);
    expect(actForBossKills(ACT_SIX_BOSS_KILLS)).toBe(ACT_SIX);
    expect(actForBossKills(FINAL_ACT_BOSS_KILLS)).toBe(FINAL_ACT);
    expect(actForBossKills(OVER_CAP_BOSS_KILLS)).toBe(FINAL_ACT);
  });

  it("uses the segmented threat scalar from the act design", () => {
    expect(threatScalarForRun(NO_BOSS_KILLS, 0)).toBeCloseTo(BASE_THREAT_SCALAR);
    expect(threatScalarForRun(THREAT_RAMP_BOSS_KILLS, THREAT_RAMP_SECONDS)).toBeCloseTo(
      BASE_THREAT_SCALAR + THREAT_RAMP_BOSS_KILLS * THREAT_RAMP_PER_BOSS + THREAT_RAMP_TIME_BONUS,
    );
    expect(threatScalarForRun(AWAKENED_THREAT_BOSS_KILLS, AWAKENED_THREAT_SECONDS)).toBeCloseTo(
      BASE_THREAT_SCALAR
        + THREAT_RAMP_BOSS_KILLS * THREAT_RAMP_PER_BOSS
        + AWAKENED_EXTRA_BOSS_KILLS * AWAKENED_THREAT_PER_BOSS
        + AWAKENED_TIME_BONUS,
    );
  });

  it("uses act-band reward values", () => {
    expect(rewardValuesForAct(ACT_ONE)).toMatchObject({ attackCrystal: 2, healthCrystal: EARLY_REWARD_HEALTH_CRYSTALS });
    expect(rewardValuesForAct(ACT_SEVEN)).toMatchObject({
      attackCrystal: MID_REWARD_ATTACK_CRYSTALS,
      chestHeal: MID_REWARD_CHEST_HEAL,
    });
    expect(rewardValuesForAct(FINAL_ACT)).toMatchObject({
      attackCrystal: MID_REWARD_ATTACK_CRYSTALS,
      healthCrystal: FINAL_REWARD_HEALTH_CRYSTALS,
      chestHeal: FINAL_REWARD_CHEST_HEAL,
    });
  });

  it("uses wave and prelude gates by act band", () => {
    expect(bossGateForAct(ACT_ONE)).toEqual({
      minWaves: ACT_ONE_MIN_WAVES,
      minElapsed: ACT_ONE_MIN_ELAPSED,
      maxElapsed: ACT_ONE_MAX_ELAPSED,
    });
    expect(bossGateForAct(ACT_EIGHT)).toEqual({
      minWaves: ACT_EIGHT_MIN_WAVES,
      minElapsed: ACT_EIGHT_MIN_ELAPSED,
      maxElapsed: ACT_EIGHT_MAX_ELAPSED,
    });
    expect(bossPreludeWaitSeconds(FINAL_ACT)).toBe(0);
  });
});

describe("enemy director rules", () => {
  it("builds a stable enemy order with the three tutorial pressures first", () => {
    const order = buildRunEnemyOrder(TEST_RUN_SEED);

    expect(order.slice(0, TUTORIAL_ENEMY_COUNT)).toEqual(["chaser", "crawler", "runner"]);
    expect(new Set(order).size).toBe(FULL_ENEMY_ROSTER_SIZE);
  });

  it("builds act pools with the designed sizes and final basic-enemy exclusion", () => {
    const order = buildRunEnemyOrder(TEST_RUN_SEED);
    const act1 = buildCurrentEnemyPool(ACT_ONE, order, "basic_intro").map((entry) => entry.enemyId);
    const act6 = buildCurrentEnemyPool(ACT_SIX, order, "mixed_pressure").map((entry) => entry.enemyId);
    const final = buildCurrentEnemyPool(FINAL_ACT, order, "final").map((entry) => entry.enemyId);

    expect(act1).toEqual(["chaser", "crawler", "runner"]);
    expect(act6).toHaveLength(ACT_EIGHT);
    expect(final).toHaveLength(FINAL_POOL_SIZE);
    expect(final).not.toContain("chaser");
    expect(final).not.toContain("crawler");
    expect(final).not.toContain("runner");
  });

  it("creates a non-repeating awakened profile cycle", () => {
    const director = createEnemyDirectorState(TEST_RUN_SEED);
    const awakenedProfiles = new Set(director.awakenedProfileOrder);

    expect(director.awakenedProfileOrder).toHaveLength(ACT_SIX);
    expect(awakenedProfiles.size).toBe(ACT_SIX);
  });

  it("starts boss prelude after the act gate and then requests the boss", () => {
    const director = createEnemyDirectorState(TEST_RUN_SEED);
    director.wavesCleared = ACT_ONE_MIN_WAVES;
    director.elapsedInAct = ACT_ONE_MIN_ELAPSED;

    const firstUpdate = updateEnemyDirector(director, {
      dt: 0,
      bossKills: NO_BOSS_KILLS,
      elapsedSeconds: ACT_ONE_MIN_ELAPSED,
      activeEnemies: [],
      playerHp: ACT_ONE_PLAYER_HP,
      playerMaxHp: ACT_ONE_PLAYER_MAX_HP,
      bossActive: false,
    });
    const secondUpdate = updateEnemyDirector(director, {
      dt: bossPreludeWaitSeconds(ACT_ONE),
      bossKills: NO_BOSS_KILLS,
      elapsedSeconds: SECOND_UPDATE_ELAPSED_SECONDS,
      activeEnemies: [],
      playerHp: ACT_ONE_PLAYER_HP,
      playerMaxHp: ACT_ONE_PLAYER_MAX_HP,
      bossActive: false,
    });

    expect(firstUpdate.spawnBoss).toBe(false);
    expect(secondUpdate.spawnBoss).toBe(true);
  });

  it("does not request regular tier-one enemies in the final pool", () => {
    const tierOne: EnemyId[] = ["chaser", "crawler", "runner"];
    const finalPool = createEnemyDirectorState(TEST_RUN_SEED);
    finalPool.act = FINAL_ACT;
    finalPool.currentProfile = "final";
    finalPool.currentPool = buildCurrentEnemyPool(FINAL_ACT, finalPool.runEnemyOrder, "final");

    expect(finalPool.currentPool.some((entry) => tierOne.includes(entry.enemyId))).toBe(false);
  });

  it("does not mark intro wave entries as elite", () => {
    const director = createEnemyDirectorState(TEST_RUN_SEED);
    const plan = pickWavePlan(director, false);

    expect(plan.every((entry) => !entry.elite)).toBe(true);
  });

  it("caps awakened elite replacements at one per wave and charges their spawn cost", () => {
    const director = createEnemyDirectorState(TEST_RUN_SEED);
    director.act = ACT_SEVEN;
    director.currentProfile = "fast_mix";
    director.currentPool = buildCurrentEnemyPool(ACT_SEVEN, director.runEnemyOrder, "fast_mix");
    let sawElite = false;

    for (let wave = 0; wave < AWAKENED_SAMPLE_WAVES; wave += 1) {
      director.wavesCleared = wave;
      const plan = pickWavePlan(director, false);
      const eliteEntries = plan.filter((entry) => entry.elite);

      expect(eliteEntries.length).toBeLessThanOrEqual(1);
      expect(wavePlanSpawnCost(plan)).toBeLessThanOrEqual(maxActiveSpawnCostForAct(ACT_SEVEN, director.elapsedInAct));
      for (const entry of eliteEntries) {
        sawElite = true;
        expect(entry.count).toBe(1);
        expect(enemySpawnCost(entry.enemyId, true)).toBeGreaterThan(enemySpawnCost(entry.enemyId, false));
      }
    }

    expect(sawElite).toBe(true);
  });

  it("puts one or two elite replacements into final waves within active budget", () => {
    const director = createEnemyDirectorState(TEST_RUN_SEED);
    director.act = FINAL_ACT;
    director.currentProfile = "final";
    director.currentPool = buildCurrentEnemyPool(FINAL_ACT, director.runEnemyOrder, "final");

    for (let wave = 0; wave < FINAL_SAMPLE_WAVES; wave += 1) {
      director.wavesCleared = wave;
      const plan = pickWavePlan(director, false);
      const eliteEntries = plan.filter((entry) => entry.elite);

      expect(eliteEntries.length).toBeGreaterThanOrEqual(1);
      expect(eliteEntries.length).toBeLessThanOrEqual(2);
      expect(wavePlanSpawnCost(plan)).toBeLessThanOrEqual(maxActiveSpawnCostForAct(FINAL_ACT, director.elapsedInAct));
    }
  });

  it("narrows boss summon picks by phase and caps final boss summons", () => {
    const director = createEnemyDirectorState(TEST_RUN_SEED);
    director.currentPool = buildCurrentEnemyPool(ACT_SIX, director.runEnemyOrder, "mixed_pressure");

    const phaseOneSummon = pickBossSummonEnemyId(director, () => LATE_POOL_RANDOM_ROLL, {
      phase: ACT_ONE,
      awakened: false,
      finalBoss: false,
    });
    const finalBudget = bossSummonBudgetForPhase(BOSS_PHASE_FIVE, true, true);
    const existingSummons = Array.from({ length: finalBudget.maxCount }, () => ({
      id: "duelist",
      spawnSource: "boss",
      spawnCost: BOSS_SUMMON_SPAWN_COST,
    })) as EnemyState[];

    expect(["chaser", "crawler", "runner"]).toContain(phaseOneSummon);
    expect(finalBudget.maxCount).toBe(FINAL_BOSS_SUMMON_BUDGET_COUNT);
    expect(canSpawnBossSummon(existingSummons, BOSS_SUMMON_SPAWN_COST, BOSS_PHASE_FIVE, true, true)).toBe(false);
  });
});
