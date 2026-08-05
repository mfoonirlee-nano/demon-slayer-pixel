import { beforeEach, describe, expect, it } from "vitest";
import { resetState, state } from "../../game/state";
import { spawnEnemyById } from "../enemy";
import { resolveEnemyDefeat } from "./defeat";

describe("enemy defeat residual-spirit rewards", () => {
  beforeEach(() => {
    resetState();
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
