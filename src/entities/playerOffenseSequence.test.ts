import { beforeEach, describe, expect, it } from "vitest";
import { GROUND_Y } from "../constants";
import { keys } from "../game/input";
import { resetState, state } from "../game/state";
import { triggerAttack } from "./player";

const AIRBORNE_TEST_HEIGHT = 80;

describe("player offense action sequence", () => {
  beforeEach(() => {
    resetState();
    keys.clear();
  });

  it("publishes one monotonic edge for each accepted basic or fall attack", () => {
    expect(state.player.offenseActionSequence).toBe(0);

    triggerAttack();
    expect(state.player.offenseActionSequence).toBe(1);

    triggerAttack();
    expect(state.player.offenseActionSequence).toBe(1);

    state.player.attackTimer = 0;
    state.player.y = GROUND_Y - state.player.h - AIRBORNE_TEST_HEIGHT;
    state.player.vy = 1;
    keys.add("s");
    triggerAttack();

    expect(state.player.fallAttackTimer).toBe(1);
    expect(state.player.offenseActionSequence).toBe(2);
  });
});
