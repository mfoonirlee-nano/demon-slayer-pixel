import { describe, expect, it } from "vitest";
import { createEnemyDirectorState } from "./enemyDirector";
import {
  bossApproachGroundTransitionSeconds,
  bossGateForAct,
  isPastActMidpoint,
  isTreasureAttachWindowOpen,
  isTreasureClaimWindowOpen,
} from "./runProgression";

const TEST_RUN_SEED = 4_221;
const TEST_ACT = 8;
const FINAL_BOSS_APPROACH_LOCKOUT_SECONDS = 10;
const MINIMUM_CLIMB_WINDOW_SECONDS = 10;
const JUST_BEFORE_BOUNDARY_SECONDS = 0.001;

describe("treasure timing semantics", () => {
  it("opens the treasure opportunity at half of the act's boss timing gate", () => {
    const director = createEnemyDirectorState(TEST_RUN_SEED);
    director.act = TEST_ACT;
    const midpoint = bossGateForAct(TEST_ACT).minElapsed / 2;

    director.elapsedInAct = midpoint - JUST_BEFORE_BOUNDARY_SECONDS;
    expect(isPastActMidpoint(director)).toBe(false);

    director.elapsedInAct = midpoint;
    expect(isPastActMidpoint(director)).toBe(true);
  });

  it("keeps treasure claimable through the early prelude and closes its final ten seconds", () => {
    const director = createEnemyDirectorState(TEST_RUN_SEED);
    director.act = TEST_ACT;
    const approachSeconds = bossApproachGroundTransitionSeconds(TEST_ACT);
    const lockoutStartsAt = approachSeconds - FINAL_BOSS_APPROACH_LOCKOUT_SECONDS;

    director.bossPrelude = {
      elapsed: 0,
      reinforcementTimer: 0,
      reinforcementsSpawned: 0,
    };
    expect(isTreasureClaimWindowOpen(director, false)).toBe(true);

    director.bossPrelude.elapsed = lockoutStartsAt - JUST_BEFORE_BOUNDARY_SECONDS;
    expect(isTreasureClaimWindowOpen(director, false)).toBe(true);

    director.bossPrelude.elapsed = lockoutStartsAt;
    expect(isTreasureClaimWindowOpen(director, false)).toBe(false);
  });

  it("stops attaching treasures early enough to preserve a full climb window", () => {
    const director = createEnemyDirectorState(TEST_RUN_SEED);
    director.act = TEST_ACT;
    const approachSeconds = bossApproachGroundTransitionSeconds(TEST_ACT);
    const attachLockoutStartsAt = approachSeconds
      - FINAL_BOSS_APPROACH_LOCKOUT_SECONDS
      - MINIMUM_CLIMB_WINDOW_SECONDS;
    director.bossPrelude = {
      elapsed: attachLockoutStartsAt - JUST_BEFORE_BOUNDARY_SECONDS,
      reinforcementTimer: 0,
      reinforcementsSpawned: 0,
    };

    expect(isTreasureAttachWindowOpen(director, false)).toBe(true);
    director.bossPrelude.elapsed = attachLockoutStartsAt;
    expect(isTreasureAttachWindowOpen(director, false)).toBe(false);
    expect(isTreasureClaimWindowOpen(director, false)).toBe(true);
  });

  it("never permits treasure claims while a boss is active", () => {
    const director = createEnemyDirectorState(TEST_RUN_SEED);

    expect(isTreasureClaimWindowOpen(director, false)).toBe(true);
    expect(isTreasureClaimWindowOpen(director, true)).toBe(false);
  });
});
