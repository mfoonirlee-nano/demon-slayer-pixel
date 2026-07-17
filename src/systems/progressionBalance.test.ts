import { describe, expect, it } from "vitest";
import type { EnemyState } from "../types/game-state";
import {
  ENEMY_ARCHETYPES,
  advanceEnemyDirectorToAct,
  createEnemyDirectorState,
  updateEnemyDirector,
  type EnemySpawnRequest,
} from "./enemyDirector";
import { bossXp, enemyXp, xpToNextLevel } from "./progression";

const TEST_RUN_SEED = 1234;
const FIRST_ACT_BASELINE_FAILURE_SEED = 3975;
const FIRST_ACT_SPAWN_COUNT_EDGE_SEED = 596;
const FIRST_ACT_XP_EDGE_SEED = 1013;
const FIRST_ACT_PACING_SEEDS = [
  TEST_RUN_SEED,
  FIRST_ACT_BASELINE_FAILURE_SEED,
  FIRST_ACT_SPAWN_COUNT_EDGE_SEED,
  FIRST_ACT_XP_EDGE_SEED,
];
const FINAL_ACT = 13;
const DIRECTOR_STEP_SECONDS = 0.25;
const MAX_DIRECTOR_STEPS_PER_ACT = 1200;
const FULL_HP = 100;
const LEVEL_ONE_XP_REQUIREMENT = 700;
const FIRST_ACT_MIN_ENEMIES_BEFORE_BOSS = 88;
const FINAL_ACT_XP_REQUIREMENT = 1537;
const XP_MONOTONIC_SAMPLE_LEVELS = 20;

function enemyStateForRequest(request: EnemySpawnRequest): EnemyState {
  const config = ENEMY_ARCHETYPES[request.enemyId];
  return {
    id: request.enemyId,
    sheetIndex: config.sheetIndex,
    spawnSource: "regular",
    elite: request.elite,
  } as EnemyState;
}

function actXpPacing(act: number, seed = TEST_RUN_SEED) {
  const bossKills = act - 1;
  const director = createEnemyDirectorState(seed);
  if (bossKills > 0) advanceEnemyDirectorToAct(director, bossKills, 0);

  let xp = 0;
  let spawnCount = 0;
  let steps = 0;

  while (steps < MAX_DIRECTOR_STEPS_PER_ACT) {
    steps += 1;
    const update = updateEnemyDirector(director, {
      dt: DIRECTOR_STEP_SECONDS,
      bossKills,
      elapsedSeconds: director.elapsedInAct,
      activeEnemies: [],
      playerHp: FULL_HP,
      playerMaxHp: FULL_HP,
      bossActive: false,
    });

    for (const request of update.spawnRequests) {
      spawnCount += 1;
      xp += enemyXp(enemyStateForRequest(request));
    }

    if (update.spawnBoss) {
      return {
        preBossXp: xp,
        preBossSpawnCount: spawnCount,
        fullClearXp: xp + bossXp(bossKills),
      };
    }
  }

  throw new Error(`Enemy director did not spawn the act ${act} boss.`);
}

function applyXp(level: number, runXp: number, earnedXp: number) {
  let nextLevel = level;
  let nextRunXp = runXp + earnedXp;

  while (nextRunXp >= xpToNextLevel(nextLevel)) {
    nextRunXp -= xpToNextLevel(nextLevel);
    nextLevel += 1;
  }

  return { level: nextLevel, runXp: nextRunXp };
}

describe("progression balance", () => {
  it("uses a steeper XP curve that still increases every level", () => {
    expect(xpToNextLevel(1)).toBe(LEVEL_ONE_XP_REQUIREMENT);
    expect(xpToNextLevel(FINAL_ACT)).toBe(FINAL_ACT_XP_REQUIREMENT);

    for (let level = 2; level <= XP_MONOTONIC_SAMPLE_LEVELS; level += 1) {
      expect(xpToNextLevel(level)).toBeGreaterThan(xpToNextLevel(level - 1));
    }
  });

  it("offers enough enemy XP to reach level two before the first boss", () => {
    for (const seed of FIRST_ACT_PACING_SEEDS) {
      expect(actXpPacing(1, seed).preBossXp).toBeGreaterThanOrEqual(LEVEL_ONE_XP_REQUIREMENT);
    }
  });

  it("offers enough first-act enemies to reach level two regardless of the tier-one mix", () => {
    for (const seed of FIRST_ACT_PACING_SEEDS) {
      expect(actXpPacing(1, seed).preBossSpawnCount).toBeGreaterThanOrEqual(
        FIRST_ACT_MIN_ENEMIES_BEFORE_BOSS,
      );
    }
  });

  it("allows a full clear of each current act to grant at least one run level", () => {
    let level = 1;
    let runXp = 0;

    for (let act = 1; act <= FINAL_ACT; act += 1) {
      const previousLevel = level;
      const earnedXp = actXpPacing(act).fullClearXp;
      ({ level, runXp } = applyXp(level, runXp, earnedXp));

      expect(level).toBeGreaterThan(previousLevel);
    }
  });
});
