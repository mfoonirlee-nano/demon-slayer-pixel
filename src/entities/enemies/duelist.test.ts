import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DUELIST_SHEETS, GROUND_Y } from "../../constants";
import { resetState, state } from "../../game/state";
import type { ActBand, EnemyState } from "../../types/game-state";
import { spawnEnemyById, updateEnemies } from "../enemy";

const NORMAL_ATTACK_DESIRE_DISTANCE = 140;
const SPIN_FINAL_ONLY_DISTANCE = 120;
const ACTIVE_SPIN_TIMER = 14;
const TEST_DUELIST_CENTER_X = 260;
const ATTACK_TRANSITION_PLAYER_OFFSET = 40;
const SPIN_ARC_TARGET_OFFSET = 110;
const SPIN_ARC_SAMPLE_FRAMES = 8;
const SPIN_COMPLETION_GUARD_FRAMES = 30;
const SPIN_SHEET_FRAME_COUNT = 6;

function setPlayerCenterX(centerX: number) {
  state.player.x = centerX - state.player.w / 2;
}

function playerCenterX() {
  return state.player.x + state.player.w / 2;
}

function enemyCenterX(enemy: EnemyState) {
  return enemy.x + enemy.w / 2;
}

function moveEnemyCenterX(enemy: EnemyState, centerX: number) {
  enemy.x = centerX - enemy.w / 2;
}

function spawnDuelist(growthStage: ActBand = "intro") {
  expect(spawnEnemyById("duelist", "debug", "left", { growthStage })).toBe(true);
  return state.enemies[0];
}

function enterDuelistAttack(growthStage: ActBand) {
  resetState();
  const duelist = spawnDuelist(growthStage);
  moveEnemyCenterX(duelist, TEST_DUELIST_CENTER_X);
  setPlayerCenterX(enemyCenterX(duelist) + ATTACK_TRANSITION_PLAYER_OFFSET);
  duelist.duelistPhase = "windup";
  duelist.duelistTimer = 1;
  duelist.duelistFacing = 1;
  duelist.vx = 0;

  updateEnemies();

  return duelist;
}

function enterAwakenedSpinTowardPlayer(offset: number) {
  resetState();
  const duelist = spawnDuelist("awakened");
  moveEnemyCenterX(duelist, TEST_DUELIST_CENTER_X);
  duelist.y = GROUND_Y - duelist.h;
  setPlayerCenterX(enemyCenterX(duelist) + offset);
  duelist.duelistPhase = "windup";
  duelist.duelistTimer = 1;
  duelist.duelistFacing = 1;
  duelist.vx = 0;

  updateEnemies();

  expect(duelist.duelistPhase).toBe("spin");
  return duelist;
}

function spinDamageAtDistance(growthStage: Exclude<ActBand, "intro">, distance: number) {
  resetState();
  const duelist = spawnDuelist(growthStage);
  moveEnemyCenterX(duelist, TEST_DUELIST_CENTER_X);
  duelist.y = GROUND_Y - duelist.h;
  duelist.duelistPhase = "spin";
  duelist.duelistTimer = ACTIVE_SPIN_TIMER;
  duelist.duelistFacing = 1;
  duelist.duelistSlashHit = false;
  duelist.duelistSpinStartX = duelist.x;
  duelist.duelistSpinStartY = duelist.y;
  duelist.duelistSpinTargetX = duelist.x;
  duelist.duelistSpinGroundY = duelist.y;
  duelist.vx = 0;
  setPlayerCenterX(enemyCenterX(duelist) + distance);

  const hpBefore = state.player.hp;
  updateEnemies();
  return hpBefore - state.player.hp;
}

describe("duelist tuning", () => {
  beforeEach(() => {
    resetState();
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads a dedicated airborne spin attack sheet", () => {
    expect(DUELIST_SHEETS.spin.src).toBe("assets/sprites/enemies/duelist/duelist_spin.png");
    expect(DUELIST_SHEETS.spin.count).toBe(SPIN_SHEET_FRAME_COUNT);
    expect(DUELIST_SHEETS.spin).not.toBe(DUELIST_SHEETS.slash);
  });

  it("lets intro duelists commit to attacks from a longer normal range", () => {
    const duelist = spawnDuelist("intro");
    moveEnemyCenterX(duelist, TEST_DUELIST_CENTER_X);
    setPlayerCenterX(enemyCenterX(duelist) + NORMAL_ATTACK_DESIRE_DISTANCE);
    duelist.duelistPhase = "approach";
    duelist.duelistTimer = 0;
    duelist.vx = 0;

    updateEnemies();

    expect(duelist.duelistPhase).toBe("windup");
  });

  it("turns awakened and final windups into spin attacks", () => {
    expect(enterDuelistAttack("intro").duelistPhase).toBe("slash");
    expect(enterDuelistAttack("awakened").duelistPhase).toBe("spin");
    expect(enterDuelistAttack("final").duelistPhase).toBe("spin");
  });

  it("gives final spin attacks a larger hit range than awakened spin attacks", () => {
    expect(spinDamageAtDistance("awakened", SPIN_FINAL_ONLY_DISTANCE)).toBe(0);
    expect(spinDamageAtDistance("final", SPIN_FINAL_ONLY_DISTANCE)).toBeGreaterThan(0);
  });

  it("moves spin attacks through an arc toward the locked player position", () => {
    const duelist = enterAwakenedSpinTowardPlayer(SPIN_ARC_TARGET_OFFSET);
    const startX = duelist.x;
    const startY = duelist.y;
    const targetX = playerCenterX() - duelist.w / 2;

    for (let frame = 0; frame < SPIN_ARC_SAMPLE_FRAMES; frame += 1) {
      updateEnemies();
    }

    expect(duelist.duelistPhase).toBe("spin");
    expect(duelist.x).toBeGreaterThan(startX);
    expect(duelist.x).toBeLessThan(targetX);
    expect(duelist.y).toBeLessThan(startY);

    for (
      let guard = 0;
      duelist.duelistPhase === "spin" && guard < SPIN_COMPLETION_GUARD_FRAMES;
      guard += 1
    ) {
      updateEnemies();
    }

    expect(duelist.duelistPhase).toBe("recover");
    expect(duelist.x).toBeCloseTo(targetX);
    expect(duelist.y).toBeCloseTo(startY);
  });
});
