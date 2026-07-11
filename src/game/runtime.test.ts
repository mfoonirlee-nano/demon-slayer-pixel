import { beforeEach, describe, expect, it } from "vitest";
import { PLAYER_ANIMATION_STATES } from "../constants";
import { resetState, state } from "./state";
import { updateUltimateCastFreezeFrame } from "./runtime";

describe("ultimate cast freeze", () => {
  beforeEach(() => {
    resetState();
  });

  it("continues aging visual-only effects instead of locking a crowded frame", () => {
    state.player.ultimateCastTimer = 20;
    state.particles.push({ x: 0, y: 0, vx: 0, vy: 0, life: 1, color: "#fff" });
    state.hitBursts.push({
      x: 0,
      y: 0,
      life: 1,
      maxLife: 1,
      radius: 1,
      grow: 1,
      color: "#fff",
      sparks: [],
    });
    state.ultimateTrails.push({
      x: 0,
      y: 0,
      facing: 1,
      life: 1,
      maxLife: 1,
      width: 10,
      height: 4,
      phase: 0,
    });
    state.ultimateAfterimageSlashes.push({
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      facing: 1,
      life: 1,
      maxLife: 1,
      power: 1,
    });
    state.ultimatePlayerGhosts.push({
      source: "player",
      action: "idle",
      animationState: PLAYER_ANIMATION_STATES.idle,
      frame: 0,
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      facing: 1,
      life: 1,
      maxLife: 1,
      strength: 1,
    });

    updateUltimateCastFreezeFrame();

    expect(state.particles).toHaveLength(0);
    expect(state.hitBursts).toHaveLength(0);
    expect(state.ultimateTrails).toHaveLength(0);
    expect(state.ultimateAfterimageSlashes).toHaveLength(0);
    expect(state.ultimatePlayerGhosts).toHaveLength(0);
  });
});
