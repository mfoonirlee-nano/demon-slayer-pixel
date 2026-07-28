import { describe, expect, it } from "vitest";
import { BASIC_ATTACK, RUN_LEVEL_PACING } from "../constants";
import { createInitialState } from "../game/state";
import type { EnemyState } from "../types/game-state";
import {
  ENEMY_ARCHETYPES,
  advanceEnemyDirectorToAct,
  createEnemyDirectorState,
  enemySpawnCost,
  enemySpawnStats,
  updateEnemyDirector,
  type EnemySpawnRequest,
} from "./enemyDirector";
import {
  addEnemyRunXp,
  addRunXp,
  applyUpgradeChoice,
  baseAttackForLevel,
  bossXpForLevelUp,
  enemyXp,
  maxHpForLevel,
  maxSkillEnergyForLevel,
  xpToNextLevel,
} from "./progression";

const TEST_RUN_SEED = 1234;
const FIRST_ACT_EDGE_SEED = 23012;
const FINAL_ACT_EDGE_SEED = 240;
const ACT_TWELVE_EDGE_SEED = 8038;
const SPLITTER_HEAVY_SEED = 9404;
const LOW_XP_MIX_SEED = 37716;
const PACING_SEED_SAMPLE_COUNT = 256;
const PACING_SEEDS = [...new Set([
  TEST_RUN_SEED,
  FIRST_ACT_EDGE_SEED,
  FINAL_ACT_EDGE_SEED,
  ACT_TWELVE_EDGE_SEED,
  SPLITTER_HEAVY_SEED,
  LOW_XP_MIX_SEED,
  ...Array.from(
    { length: PACING_SEED_SAMPLE_COUNT },
    (_, index) => index + 1,
  ),
])];
const FINAL_ACT = 13;
const DIRECTOR_STEP_SECONDS = 0.25;
const MAX_DIRECTOR_STEPS_PER_ACT = 1200;
const FRAMES_PER_SECOND = 60;
const BASIC_ATTACK_INTERVAL_SECONDS = BASIC_ATTACK.frames / FRAMES_PER_SECOND;
const FULL_HEALTH_RATIO = 1;
const LOW_HEALTH_RATIO = 0.34;
const PLAYER_MAX_HP = 100;
const MIN_RANDOM_ROLL = 0;
const LEVEL_ONE_XP_REQUIREMENT = 300;
const FINAL_ACT_MID_LEVEL = 25;
const FINAL_ACT_XP_REQUIREMENT = 834;
const FIRST_ACT_COMPLETE_LEVEL = 3;
const EXPECTED_FINAL_RUN_LEVEL = 27;
const FIRST_ACT_UPGRADE_EARLIEST_SECONDS = 30;
const FIRST_ACT_UPGRADE_LATEST_SECONDS = 45;
const XP_MONOTONIC_SAMPLE_LEVELS = 20;

function enemyStateForRequest(
  request: EnemySpawnRequest,
  bossKills: number,
  elapsedSeconds: number,
): EnemyState {
  const config = ENEMY_ARCHETYPES[request.enemyId];
  const stats = enemySpawnStats(
    request.enemyId,
    bossKills,
    elapsedSeconds,
    () => MIN_RANDOM_ROLL,
  );
  return {
    id: request.enemyId,
    sheetIndex: config.sheetIndex,
    spawnSource: "regular",
    spawnCost: enemySpawnCost(request.enemyId, request.elite),
    elite: request.elite,
    hp: stats.hp,
  } as EnemyState;
}

type ActCombatResult = {
  elapsedSeconds: number;
  firstUpgradeAt: number | null;
};

type ActPacingResult = {
  act: number;
  levelBeforeAct: number;
  levelAfterCombat: number;
  runXpAfterCombat: number;
  levelAfterBoss: number;
  runXpAfterBoss: number;
};

type RunPacingResult = {
  acts: ActPacingResult[];
  firstActUpgradeAt: number | null;
};

function simulateActCombat(
  state: ReturnType<typeof createInitialState>,
  director: ReturnType<typeof createEnemyDirectorState>,
  runElapsedAtActStart: number,
  playerHealthRatio: number,
): ActCombatResult {
  let activeEnemies: EnemyState[] = [];
  let attackTimer = BASIC_ATTACK_INTERVAL_SECONDS;
  let firstUpgradeAt: number | null = null;
  let steps = 0;

  while (steps < MAX_DIRECTOR_STEPS_PER_ACT) {
    steps += 1;
    const update = updateEnemyDirector(director, {
      dt: DIRECTOR_STEP_SECONDS,
      bossKills: state.bossKills,
      elapsedSeconds: runElapsedAtActStart + director.elapsedInAct,
      activeEnemies,
      playerHp: PLAYER_MAX_HP * playerHealthRatio,
      playerMaxHp: PLAYER_MAX_HP,
      bossActive: false,
    });

    for (const request of update.spawnRequests) {
      activeEnemies.push(enemyStateForRequest(
        request,
        state.bossKills,
        runElapsedAtActStart + director.elapsedInAct,
      ));
    }

    attackTimer -= DIRECTOR_STEP_SECONDS;
    while (attackTimer <= 0) {
      const attackDamage = baseAttackForLevel(state.player.runLevel);
      // All-target pulses approximate normal cleave and skill uptime while retaining real durability.
      for (const enemy of activeEnemies) {
        enemy.hp -= attackDamage;
      }
      attackTimer += BASIC_ATTACK_INTERVAL_SECONDS;
    }

    const survivingEnemies: EnemyState[] = [];
    for (const enemy of activeEnemies) {
      if (enemy.hp > 0) {
        survivingEnemies.push(enemy);
        continue;
      }

      const levelBeforeReward = state.player.runLevel;
      addEnemyRunXp(state, enemyXp(enemy));
      if (state.player.runLevel > levelBeforeReward) {
        firstUpgradeAt ??= director.elapsedInAct;
      }
      choosePendingUpgrade(state);
    }
    activeEnemies = survivingEnemies;

    if (update.spawnBoss) {
      return {
        elapsedSeconds: director.elapsedInAct,
        firstUpgradeAt,
      };
    }
  }

  throw new Error(`Enemy director did not spawn the act ${state.bossKills + 1} boss.`);
}

function choosePendingUpgrade(state: ReturnType<typeof createInitialState>) {
  if (state.pendingUpgradeChoices.length === 0) return;
  expect(applyUpgradeChoice(state, 0)).toBe(true);
}

function simulateRunPacing(
  seed: number,
  playerHealthRatio: number,
): RunPacingResult {
  const state = createInitialState();
  const director = createEnemyDirectorState(seed);
  const acts: ActPacingResult[] = [];
  let firstActUpgradeAt: number | null = null;
  let runElapsedSeconds = 0;

  for (let act = 1; act <= FINAL_ACT; act += 1) {
    if (act > 1) {
      advanceEnemyDirectorToAct(
        director,
        state.bossKills,
        runElapsedSeconds,
      );
    }
    const levelBeforeAct = state.player.runLevel;
    const combat = simulateActCombat(
      state,
      director,
      runElapsedSeconds,
      playerHealthRatio,
    );
    runElapsedSeconds += combat.elapsedSeconds;
    if (act === 1) {
      firstActUpgradeAt = combat.firstUpgradeAt;
    }
    const levelAfterCombat = state.player.runLevel;
    const runXpAfterCombat = state.player.runXp;

    addRunXp(
      state,
      bossXpForLevelUp(state.player.runLevel, state.player.runXp),
    );
    const levelAfterBoss = state.player.runLevel;
    const runXpAfterBoss = state.player.runXp;
    choosePendingUpgrade(state);
    state.bossKills += 1;
    acts.push({
      act,
      levelBeforeAct,
      levelAfterCombat,
      runXpAfterCombat,
      levelAfterBoss,
      runXpAfterBoss,
    });
  }

  return { acts, firstActUpgradeAt };
}

describe("progression balance", () => {
  it("uses the two-level-per-act XP curve and still increases every level", () => {
    expect(xpToNextLevel(1)).toBe(LEVEL_ONE_XP_REQUIREMENT);
    expect(xpToNextLevel(FINAL_ACT_MID_LEVEL)).toBe(FINAL_ACT_XP_REQUIREMENT);

    for (let level = 2; level <= XP_MONOTONIC_SAMPLE_LEVELS; level += 1) {
      expect(xpToNextLevel(level)).toBeGreaterThan(xpToNextLevel(level - 1));
    }
  });

  it("keeps two smaller level steps within the previous per-act stat budget", () => {
    expect({
      attack: baseAttackForLevel(FIRST_ACT_COMPLETE_LEVEL),
      maxHp: maxHpForLevel(FIRST_ACT_COMPLETE_LEVEL),
      skillEnergyMax: maxSkillEnergyForLevel(FIRST_ACT_COMPLETE_LEVEL),
    }).toEqual({
      attack: 18,
      maxHp: 118,
      skillEnergyMax: 100,
    });
    expect({
      attack: baseAttackForLevel(FINAL_ACT_MID_LEVEL),
      maxHp: maxHpForLevel(FINAL_ACT_MID_LEVEL),
      skillEnergyMax: maxSkillEnergyForLevel(FINAL_ACT_MID_LEVEL),
    }).toEqual({
      attack: 35,
      maxHp: 247,
      skillEnergyMax: 210,
    });
  });

  it("grants one normal-combat level and one boss level in every act", () => {
    for (const seed of PACING_SEEDS) {
      const run = simulateRunPacing(seed, FULL_HEALTH_RATIO);

      for (const result of run.acts) {
        expect(
          result.levelAfterCombat,
          `seed ${seed}, act ${result.act} normal combat (${result.runXpAfterCombat} XP)`,
        ).toBe(
          result.levelBeforeAct + RUN_LEVEL_PACING.enemyLevelsPerAct,
        );
        expect(
          result.levelAfterBoss,
          `seed ${seed}, act ${result.act} boss`,
        ).toBe(
          result.levelBeforeAct + RUN_LEVEL_PACING.levelsPerAct,
        );
        expect(result.runXpAfterBoss).toBe(0);
      }

      expect(run.acts[run.acts.length - 1].levelAfterBoss).toBe(
        EXPECTED_FINAL_RUN_LEVEL,
      );
      if (run.firstActUpgradeAt === null) {
        throw new Error(`seed ${seed} did not produce a first-act upgrade`);
      }
      expect(run.firstActUpgradeAt).toBeGreaterThanOrEqual(
        FIRST_ACT_UPGRADE_EARLIEST_SECONDS,
      );
      expect(run.firstActUpgradeAt).toBeLessThanOrEqual(
        FIRST_ACT_UPGRADE_LATEST_SECONDS,
      );
    }
  });

  it("keeps low-health pacing within the combat cap and the boss reward at one level", () => {
    for (const seed of PACING_SEEDS) {
      const run = simulateRunPacing(seed, LOW_HEALTH_RATIO);

      for (const result of run.acts) {
        const combatLevelCap = RUN_LEVEL_PACING.initialLevel
          + (result.act - 1) * RUN_LEVEL_PACING.levelsPerAct
          + RUN_LEVEL_PACING.enemyLevelsPerAct;
        expect(
          result.levelAfterCombat,
          `seed ${seed}, act ${result.act} low-health combat cap`,
        ).toBeLessThanOrEqual(combatLevelCap);
        expect(
          result.levelAfterBoss,
          `seed ${seed}, act ${result.act} low-health boss`,
        ).toBe(result.levelAfterCombat + 1);
        expect(result.runXpAfterBoss).toBe(0);
      }
    }
  });
});
