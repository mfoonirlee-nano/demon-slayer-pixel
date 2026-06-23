import { describe, expect, it } from "vitest";
import { GROUND_Y } from "../../constants";
import { resetState, state } from "../../game/state";
import { spawnEnemyById, updateEnemies } from "../enemy";

describe("splitter attack", () => {
  it("plays the attack animation and applies contact damage when overlapping the player", () => {
    resetState();
    expect(spawnEnemyById("splitter", "debug", "left")).toBe(true);
    const splitter = state.enemies[0];
    splitter.damage = 10;
    splitter.x = state.player.x + state.player.w / 2 - splitter.w / 2;
    splitter.y = GROUND_Y - splitter.h;

    updateEnemies();

    expect(splitter.splitterPhase).toBe("attack");
    expect(state.player.hp).toBe(90);
  });
});
