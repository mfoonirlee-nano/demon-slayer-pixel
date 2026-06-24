import { describe, expect, it } from "vitest";
import { GROUND_Y } from "../../constants";
import { resetState, state } from "../../game/state";
import { spawnEnemyById, updateEnemies } from "../enemy";

const TEST_SPLITTER_DAMAGE = 10;
const EXPECTED_PLAYER_HP_AFTER_HIT = 90;

describe("splitter attack", () => {
  it("plays the attack animation and applies contact damage when overlapping the player", () => {
    resetState();
    expect(spawnEnemyById("splitter", "debug", "left")).toBe(true);
    const splitter = state.enemies[0];
    splitter.damage = TEST_SPLITTER_DAMAGE;
    splitter.x = state.player.x + state.player.w / 2 - splitter.w / 2;
    splitter.y = GROUND_Y - splitter.h;

    updateEnemies();

    expect(splitter.splitterPhase).toBe("attack");
    expect(state.player.hp).toBe(EXPECTED_PLAYER_HP_AFTER_HIT);
  });
});
