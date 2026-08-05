import { describe, expect, it } from "vitest";
import type { EnemyId, EnemyState } from "../types/game-state";
import {
  ENEMY_ARCHETYPES,
  advanceEnemyDirectorToAct,
  bossSummonBudgetForPhase,
  buildCurrentEnemyPool,
  buildRunEnemyOrder,
  canSpawnBossSummon,
  createEnemyDirectorState,
  enemySpawnCost,
  enemySpawnStats,
  maxActiveSpawnCostForAct,
  pickBossSummonEnemyId,
  pickWavePlan,
  updateEnemyDirector,
} from "./enemyDirector";
import {
  ACT_TIMING_SCALE,
  actForBossKills,
  bossApproachGroundTransitionSeconds,
  bossGateForAct,
  bossPreludeWaitSeconds,
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
const ACT_ONE_MIN_WAVES = 3;
const ACT_ONE_UNCOMPRESSED_MIN_ELAPSED = 45;
const ACT_ONE_UNCOMPRESSED_MAX_ELAPSED = 75;
const ACT_EIGHT_MIN_WAVES = 5;
const ACT_EIGHT_UNCOMPRESSED_MIN_ELAPSED = 75;
const ACT_EIGHT_UNCOMPRESSED_MAX_ELAPSED = 120;
const TEST_RUN_SEED = 1234;
const FIRST_ACT_BASELINE_FAILURE_SEED = 3975;
const FIRST_ACT_FREQUENCY_EDGE_SEED = 76;
const FIRST_ACT_PACING_SEEDS = [
  FIRST_ACT_FREQUENCY_EDGE_SEED,
  TEST_RUN_SEED,
  FIRST_ACT_BASELINE_FAILURE_SEED,
];
const FIRST_ACT_FREQUENCY_CHECKPOINT_SECONDS = 30;
const FIRST_ACT_MIN_SPAWNS_BY_CHECKPOINT = 28;
const TUTORIAL_ENEMY_COUNT = 3;
const FULL_ENEMY_ROSTER_SIZE = 12;
const FINAL_POOL_SIZE = 9;
const ACT_ONE_PLAYER_HP = 100;
const ACT_ONE_PLAYER_MAX_HP = 100;
const SECOND_UPDATE_ELAPSED_SECONDS = 48;
const DIRECTOR_STEP_SECONDS = 0.25;
const MAX_DIRECTOR_PRELUDE_STEPS = 800;
const ACT_ONE_APPROACH_TRANSITION_SECONDS = bossApproachGroundTransitionSeconds(ACT_ONE);
const BOSS_PHASE_FIVE = 5;
const FINAL_BOSS_SUMMON_BUDGET_COUNT = 4;
const BOSS_SUMMON_SPAWN_COST = 1;
const LATE_POOL_RANDOM_ROLL = 0.99;
const AWAKENED_SAMPLE_WAVES = 12;
const FINAL_SAMPLE_WAVES = 6;
const AWAKENED_ACT_BOSS_KILLS = 6;
const MIN_RANDOM_ROLL = 0;
const RUNNER_DESIGN_MAX_ACTIVE = 3;
const CHASER_BASE_RUN_SPEED = 2.86;

function compressedSeconds(seconds: number) {
  return Math.round(seconds * ACT_TIMING_SCALE);
}

const ACT_ONE_MIN_ELAPSED = compressedSeconds(ACT_ONE_UNCOMPRESSED_MIN_ELAPSED);
const ACT_ONE_MAX_ELAPSED = compressedSeconds(ACT_ONE_UNCOMPRESSED_MAX_ELAPSED);
const ACT_EIGHT_MIN_ELAPSED = compressedSeconds(ACT_EIGHT_UNCOMPRESSED_MIN_ELAPSED);
const ACT_EIGHT_MAX_ELAPSED = compressedSeconds(ACT_EIGHT_UNCOMPRESSED_MAX_ELAPSED);

function wavePlanSpawnCost(entries: ReturnType<typeof pickWavePlan>) {
  return entries.reduce((total, entry) => (
    total + enemySpawnCost(entry.enemyId, entry.elite) * entry.count
  ), 0);
}

function runDirectorUntilPrelude(director: ReturnType<typeof createEnemyDirectorState>, bossKills: number) {
  let spawnCount = 0;
  let steps = 0;

  while (!director.bossPrelude) {
    steps += 1;
    if (steps > MAX_DIRECTOR_PRELUDE_STEPS) throw new Error("Enemy director did not reach boss prelude.");

    const update = updateEnemyDirector(director, {
      dt: DIRECTOR_STEP_SECONDS,
      bossKills,
      elapsedSeconds: director.elapsedInAct,
      activeEnemies: [],
      playerHp: ACT_ONE_PLAYER_HP,
      playerMaxHp: ACT_ONE_PLAYER_MAX_HP,
      bossActive: false,
    });
    spawnCount += update.spawnRequests.length;
  }

  return {
    elapsedInAct: director.elapsedInAct,
    spawnCount,
    wavesCleared: director.wavesCleared,
  };
}

function runDirectorUntilElapsed(
  director: ReturnType<typeof createEnemyDirectorState>,
  bossKills: number,
  targetElapsed: number,
) {
  let spawnCount = 0;

  while (director.elapsedInAct < targetElapsed) {
    const update = updateEnemyDirector(director, {
      dt: DIRECTOR_STEP_SECONDS,
      bossKills,
      elapsedSeconds: director.elapsedInAct,
      activeEnemies: [],
      playerHp: ACT_ONE_PLAYER_HP,
      playerMaxHp: ACT_ONE_PLAYER_MAX_HP,
      bossActive: false,
    });
    spawnCount += update.spawnRequests.length;
  }

  return spawnCount;
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

  it("adds act growth on top of per-kill enemy stats", () => {
    const config = ENEMY_ARCHETYPES.runner;
    const awakenedStats = enemySpawnStats("runner", AWAKENED_ACT_BOSS_KILLS, 0, () => MIN_RANDOM_ROLL);
    const threatOnlyHp = Math.round(
      (config.hpBase + AWAKENED_ACT_BOSS_KILLS * config.hpPerBossKill)
        * threatScalarForRun(AWAKENED_ACT_BOSS_KILLS, 0),
    );
    const perKillDamage = config.damageBase + AWAKENED_ACT_BOSS_KILLS * config.damagePerBossKill;
    const perKillSpeed = config.speedBase + AWAKENED_ACT_BOSS_KILLS * config.speedPerBossKill;

    expect(awakenedStats.hp).toBeGreaterThan(threatOnlyHp);
    expect(awakenedStats.damage).toBeGreaterThan(perKillDamage);
    expect(awakenedStats.speed).toBeGreaterThan(perKillSpeed);
  });

  it("uses the thirty-percent-faster chaser base run speed", () => {
    const chaserStats = enemySpawnStats("chaser", NO_BOSS_KILLS, 0, () => MIN_RANDOM_ROLL);

    expect(chaserStats.speed).toBeCloseTo(CHASER_BASE_RUN_SPEED);
  });

  it("lets final-act enemy damage grow beyond the old base cap", () => {
    const finalBrute = enemySpawnStats("brute", FINAL_ACT_BOSS_KILLS, 0, () => MIN_RANDOM_ROLL);

    expect(finalBrute.damage).toBeGreaterThan(ENEMY_ARCHETYPES.brute.damageCap);
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

  it("keeps required wave volume inside the compressed act windows", () => {
    const actOneDirector = createEnemyDirectorState(TEST_RUN_SEED);
    const actOneResult = runDirectorUntilPrelude(actOneDirector, NO_BOSS_KILLS);
    const actEightDirector = createEnemyDirectorState(TEST_RUN_SEED);
    const actEightBossKills = ACT_EIGHT - 1;
    advanceEnemyDirectorToAct(actEightDirector, actEightBossKills, 0);
    const actEightResult = runDirectorUntilPrelude(actEightDirector, actEightBossKills);

    expect(actOneResult.elapsedInAct).toBeLessThanOrEqual(ACT_ONE_MIN_ELAPSED + DIRECTOR_STEP_SECONDS);
    expect(actOneResult.wavesCleared).toBeGreaterThanOrEqual(ACT_ONE_MIN_WAVES);
    expect(actOneResult.spawnCount).toBeGreaterThan(ACT_ONE_MIN_WAVES);
    expect(actEightResult.elapsedInAct).toBeLessThanOrEqual(ACT_EIGHT_MIN_ELAPSED + DIRECTOR_STEP_SECONDS);
    expect(actEightResult.wavesCleared).toBeGreaterThanOrEqual(ACT_EIGHT_MIN_WAVES);
    expect(actEightResult.spawnCount).toBeGreaterThan(ACT_EIGHT_MIN_WAVES);
  });

  it("offers at least 28 first-act spawns during the first 30 seconds", () => {
    for (const seed of FIRST_ACT_PACING_SEEDS) {
      const spawnCount = runDirectorUntilElapsed(
        createEnemyDirectorState(seed),
        NO_BOSS_KILLS,
        FIRST_ACT_FREQUENCY_CHECKPOINT_SECONDS,
      );
      expect(spawnCount).toBeGreaterThanOrEqual(FIRST_ACT_MIN_SPAWNS_BY_CHECKPOINT);
    }
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

  it("keeps preferred tags as weighted support instead of mandatory pool coverage", () => {
    const order = buildRunEnemyOrder(TEST_RUN_SEED);
    const chaosPool = buildCurrentEnemyPool(ACT_SEVEN, order, "chaos_mixed").map((entry) => entry.enemyId);

    expect(ENEMY_ARCHETYPES.runner.maxActive).toBe(RUNNER_DESIGN_MAX_ACTIVE);
    expect(chaosPool).not.toContain("binder");
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
      dt: ACT_ONE_APPROACH_TRANSITION_SECONDS,
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

  it("does not request the boss before the approach ground transition can complete", () => {
    const director = createEnemyDirectorState(TEST_RUN_SEED);
    director.wavesCleared = ACT_ONE_MIN_WAVES;
    director.elapsedInAct = ACT_ONE_MIN_ELAPSED;

    updateEnemyDirector(director, {
      dt: 0,
      bossKills: NO_BOSS_KILLS,
      elapsedSeconds: ACT_ONE_MIN_ELAPSED,
      activeEnemies: [],
      playerHp: ACT_ONE_PLAYER_HP,
      playerMaxHp: ACT_ONE_PLAYER_MAX_HP,
      bossActive: false,
    });
    const earlyUpdate = updateEnemyDirector(director, {
      dt: ACT_ONE_APPROACH_TRANSITION_SECONDS - DIRECTOR_STEP_SECONDS,
      bossKills: NO_BOSS_KILLS,
      elapsedSeconds: SECOND_UPDATE_ELAPSED_SECONDS,
      activeEnemies: [],
      playerHp: ACT_ONE_PLAYER_HP,
      playerMaxHp: ACT_ONE_PLAYER_MAX_HP,
      bossActive: false,
    });
    const readyUpdate = updateEnemyDirector(director, {
      dt: DIRECTOR_STEP_SECONDS,
      bossKills: NO_BOSS_KILLS,
      elapsedSeconds: SECOND_UPDATE_ELAPSED_SECONDS + DIRECTOR_STEP_SECONDS,
      activeEnemies: [],
      playerHp: ACT_ONE_PLAYER_HP,
      playerMaxHp: ACT_ONE_PLAYER_MAX_HP,
      bossActive: false,
    });

    expect(earlyUpdate.spawnBoss).toBe(false);
    expect(readyUpdate.spawnBoss).toBe(true);
  });

  it("spawns regular reinforcements during the boss prelude", () => {
    const director = createEnemyDirectorState(TEST_RUN_SEED);
    director.wavesCleared = ACT_ONE_MIN_WAVES;
    director.elapsedInAct = ACT_ONE_MIN_ELAPSED;

    updateEnemyDirector(director, {
      dt: 0,
      bossKills: NO_BOSS_KILLS,
      elapsedSeconds: ACT_ONE_MIN_ELAPSED,
      activeEnemies: [],
      playerHp: ACT_ONE_PLAYER_HP,
      playerMaxHp: ACT_ONE_PLAYER_MAX_HP,
      bossActive: false,
    });
    const update = updateEnemyDirector(director, {
      dt: DIRECTOR_STEP_SECONDS,
      bossKills: NO_BOSS_KILLS,
      elapsedSeconds: SECOND_UPDATE_ELAPSED_SECONDS,
      activeEnemies: [],
      playerHp: ACT_ONE_PLAYER_HP,
      playerMaxHp: ACT_ONE_PLAYER_MAX_HP,
      bossActive: false,
    });

    expect(update.spawnBoss).toBe(false);
    expect(update.spawnRequests.length).toBeGreaterThan(0);
    expect(update.spawnRequests.every((request) => !request.elite)).toBe(true);
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

  it("falls back safely if a wave has no pool entries", () => {
    const director = createEnemyDirectorState(TEST_RUN_SEED);
    director.currentPool = [];

    const plan = pickWavePlan(director, false);

    expect(plan).toHaveLength(1);
    expect(plan[0]?.enemyId).toBe("chaser");
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
