import { beforeEach, describe, expect, it } from "vitest";
import { RESIDUAL_SPIRIT_CONFIG } from "../constants";
import { resetState, state } from "../game/state";
import { spawnResidualSpirit, updateResidualSpirits } from "./residualSpirit";

const TEST_ENEMY = { x: 100, y: 200, w: 40, h: 60 };
const TEST_SPAWN_AMOUNT = RESIDUAL_SPIRIT_CONFIG.dropByTier[2];
const TEST_PICKUP_AMOUNT = RESIDUAL_SPIRIT_CONFIG.dropByTier[1];
const DAMAGED_HP = 40;
const MAGNET_OFFSET_X = 100;
const UPDATE_SECONDS = 0.1;
const EXPIRING_LIFETIME_SECONDS = 0.05;

function spiritAtPlayer(amount: number) {
  state.residualSpirits.push({
    x: state.player.x + state.player.w / 2,
    y: state.player.y + state.player.h / 2,
    amount,
    phase: 0,
    lifetime: RESIDUAL_SPIRIT_CONFIG.pickup.lifetimeSeconds,
  });
}

describe("residual-spirit pickups", () => {
  beforeEach(() => {
    resetState();
  });

  it("spawns at the defeated enemy center", () => {
    spawnResidualSpirit(TEST_ENEMY, TEST_SPAWN_AMOUNT);

    expect(state.residualSpirits).toEqual([
      expect.objectContaining({
        x: TEST_ENEMY.x + TEST_ENEMY.w / 2,
        y: TEST_ENEMY.y + TEST_ENEMY.h / 2,
        amount: TEST_SPAWN_AMOUNT,
      }),
    ]);
  });

  it("stores a pickup without immediately restoring health", () => {
    state.player.hp = DAMAGED_HP;
    spiritAtPlayer(TEST_PICKUP_AMOUNT);

    updateResidualSpirits(0);

    expect(state.player.residualSpirit).toBe(TEST_PICKUP_AMOUNT);
    expect(state.player.hp).toBe(DAMAGED_HP);
    expect(state.residualSpirits).toHaveLength(0);
  });

  it("leaves the uncollected remainder when only part of a pickup fits", () => {
    state.player.residualSpirit = RESIDUAL_SPIRIT_CONFIG.maxStored - 1;
    spiritAtPlayer(TEST_PICKUP_AMOUNT);

    updateResidualSpirits(0);

    expect(state.player.residualSpirit).toBe(RESIDUAL_SPIRIT_CONFIG.maxStored);
    expect(state.residualSpirits).toEqual([
      expect.objectContaining({ amount: 2 }),
    ]);
  });

  it("pulls a collectible pickup toward the player and expires stale pickups", () => {
    const playerCenterX = state.player.x + state.player.w / 2;
    state.residualSpirits.push({
      x: playerCenterX + MAGNET_OFFSET_X,
      y: state.player.y + state.player.h / 2,
      amount: TEST_PICKUP_AMOUNT,
      phase: 0,
      lifetime: RESIDUAL_SPIRIT_CONFIG.pickup.lifetimeSeconds,
    });

    updateResidualSpirits(UPDATE_SECONDS);

    expect(state.residualSpirits[0].x).toBeCloseTo(
      playerCenterX
        + MAGNET_OFFSET_X
        - RESIDUAL_SPIRIT_CONFIG.pickup.magnetSpeed * UPDATE_SECONDS,
    );

    state.residualSpirits[0].lifetime = EXPIRING_LIFETIME_SECONDS;
    updateResidualSpirits(UPDATE_SECONDS);
    expect(state.residualSpirits).toHaveLength(0);
  });
});
