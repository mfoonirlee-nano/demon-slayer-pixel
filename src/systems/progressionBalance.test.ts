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
const FINAL_ACT = 13;
const DIRECTOR_STEP_SECONDS = 0.25;
const MAX_DIRECTOR_STEPS_PER_ACT = 1200;
const FULL_HP = 100;
const LEVEL_ONE_XP_REQUIREMENT = 700;
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

function fullClearActXp(act: number) {
  const bossKills = act - 1;
  const director = createEnemyDirectorState(TEST_RUN_SEED);
  if (bossKills > 0) advanceEnemyDirectorToAct(director, bossKills, 0);

  let xp = 0;
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
      xp += enemyXp(enemyStateForRequest(request));
    }

    if (update.spawnBoss) return xp + bossXp(bossKills);
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

  it("allows a full clear of each current act to grant at least one run level", () => {
    let level = 1;
    let runXp = 0;

    for (let act = 1; act <= FINAL_ACT; act += 1) {
      const previousLevel = level;
      const earnedXp = fullClearActXp(act);
      ({ level, runXp } = applyXp(level, runXp, earnedXp));

      expect(level).toBeGreaterThan(previousLevel);
    }
  });
});
