import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PLAYER_COMBAT, RESIDUAL_SPIRIT_CONFIG } from "../../constants";
import { resetState, state } from "../../game/state";
import { spawnEnemyById } from "../enemy";
import { resolveEnemyDefeat } from "./defeat";

describe("enemy defeat residual-spirit rewards", () => {
  beforeEach(() => {
    resetState();
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    { roll: RESIDUAL_SPIRIT_CONFIG.dropChance - Number.EPSILON, count: 1 },
    { roll: RESIDUAL_SPIRIT_CONFIG.dropChance, count: 0 },
  ])("drops ordinary spirit below the chance boundary: $roll", ({ roll, count }) => {
    expect(spawnEnemyById("chaser", "debug", "left")).toBe(true);
    const enemy = state.enemies[0];
    enemy.hp = 0;
    vi.mocked(Math.random).mockReturnValue(roll);

    expect(resolveEnemyDefeat(enemy, 0, "attack")).toBe(true);
    expect(state.residualSpirits).toHaveLength(count);
    expect(state.player.score).toBe(PLAYER_COMBAT.attackKillScore);
    expect(state.player.skillEnergy).toBe(PLAYER_COMBAT.enemyEnergyGain);
  });

  it("guarantees elite spirit even when an ordinary drop would fail", () => {
    expect(spawnEnemyById("chaser", "debug", "left")).toBe(true);
    const enemy = state.enemies[0];
    enemy.hp = 0;
    enemy.elite = true;
    vi.mocked(Math.random).mockReturnValue(RESIDUAL_SPIRIT_CONFIG.dropChance);

    resolveEnemyDefeat(enemy, 0, "attack");

    expect(state.residualSpirits).toEqual([
      expect.objectContaining({ amount: RESIDUAL_SPIRIT_CONFIG.eliteDrop }),
    ]);
  });

  it("does not drop spirit for a non-player-attributed defeat", () => {
    expect(spawnEnemyById("chaser", "debug", "left")).toBe(true);
    const enemy = state.enemies[0];
    enemy.hp = 0;

    expect(resolveEnemyDefeat(enemy, 0, "none")).toBe(true);
    expect(state.residualSpirits).toHaveLength(0);
  });

  it("drops a splitter parent's reward only once during its death sequence", () => {
    expect(spawnEnemyById("splitter", "debug", "left")).toBe(true);
    const enemy = state.enemies[0];
    enemy.hp = 0;

    expect(resolveEnemyDefeat(enemy, 0, "attack")).toBe(true);
    expect(state.residualSpirits).toEqual([
      expect.objectContaining({ amount: 5 }),
    ]);

    expect(resolveEnemyDefeat(enemy, 0, "attack")).toBe(true);
    expect(state.residualSpirits).toHaveLength(1);
  });
});
