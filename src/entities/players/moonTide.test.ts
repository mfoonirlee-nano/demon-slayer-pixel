import { beforeEach, describe, expect, it } from "vitest";
import { PLAYER_ANIMATION_STATES, PLAYER_COMBAT } from "../../constants";
import { keys } from "../../game/input";
import { resetState, state } from "../../game/state";
import type { UltimatePlayerGhostAction, UltimatePlayerGhostSnapshot } from "../../types/game-state";
import { updatePlayer } from "../player";
import { updateUltimatePlayerGhosts } from "../particle";
import { drawPlayer } from "./render";
import {
  moonTidePlayerAnimationFrameSpeed,
  moonTidePlayerGhostMaxCount,
  recordMoonTidePlayerGhost,
} from "./moonTide";

const LEVEL_ONE_GHOST_CAP = 3;
const LEVEL_THREE_GHOST_CAP = 5;
const IDLE_GHOST_VISIBLE_FRAMES = 18;
const HURT_INVINCIBILITY_GHOST_RESUME_OFFSET = 12;
const MOON_TIDE_LEVEL_THREE_MOVE_MULTIPLIER = 1.25;

function ghostSnapshot(action: UltimatePlayerGhostAction): UltimatePlayerGhostSnapshot {
  return {
    source: "player",
    animationState: action === "fallAttack"
      ? PLAYER_ANIMATION_STATES.fallAttack
      : PLAYER_ANIMATION_STATES.attack,
    action,
    frame: 0,
    x: 120,
    y: 220,
    w: 96,
    h: 120,
    facing: 1,
  };
}

describe("moon tide player ghosts", () => {
  beforeEach(() => {
    resetState();
    keys.clear();
  });

  it("caps concurrent ghosts by ultimate level", () => {
    state.player.ultimateLevel = 1;
    for (let timer = 60; timer > 0; timer -= 1) {
      state.player.ultimateTimer = timer;
      recordMoonTidePlayerGhost(ghostSnapshot("attack"));
    }

    expect(moonTidePlayerGhostMaxCount()).toBe(LEVEL_ONE_GHOST_CAP);
    expect(state.ultimatePlayerGhosts).toHaveLength(LEVEL_ONE_GHOST_CAP);

    resetState();
    state.player.ultimateLevel = 3;
    for (let timer = 60; timer > 0; timer -= 1) {
      state.player.ultimateTimer = timer;
      recordMoonTidePlayerGhost(ghostSnapshot("attack"));
    }

    expect(moonTidePlayerGhostMaxCount()).toBe(LEVEL_THREE_GHOST_CAP);
    expect(state.ultimatePlayerGhosts).toHaveLength(LEVEL_THREE_GHOST_CAP);
  });

  it("keeps idle ghosts sparse even while moon tide is active", () => {
    state.player.ultimateLevel = 3;
    state.player.ultimateTimer = 36;

    expect(recordMoonTidePlayerGhost(ghostSnapshot("idle"))).toBe(true);

    state.player.ultimateTimer = 18;

    expect(recordMoonTidePlayerGhost(ghostSnapshot("idle"))).toBe(false);
    expect(state.ultimatePlayerGhosts).toHaveLength(1);
  });

  it("keeps idle ghosts alive long enough to be visible while standing still", () => {
    state.player.ultimateLevel = 1;
    state.player.ultimateTimer = 36;

    expect(recordMoonTidePlayerGhost(ghostSnapshot("idle"))).toBe(true);

    for (let frame = 0; frame < IDLE_GHOST_VISIBLE_FRAMES; frame += 1) {
      updateUltimatePlayerGhosts();
    }

    expect(state.ultimatePlayerGhosts).toHaveLength(1);
  });

  it("keeps motion ghosts shorter than idle ghosts so old action frames do not dominate", () => {
    state.player.ultimateLevel = 1;
    state.player.ultimateTimer = 36;

    expect(recordMoonTidePlayerGhost(ghostSnapshot("idle"))).toBe(true);
    const idleLife = state.ultimatePlayerGhosts[0].maxLife;

    resetState();
    state.player.ultimateLevel = 1;
    state.player.ultimateTimer = 30;

    expect(recordMoonTidePlayerGhost(ghostSnapshot("move"))).toBe(true);
    const moveLife = state.ultimatePlayerGhosts[0].maxLife;

    expect(moveLife).toBeLessThan(idleLife);
  });

  it("samples ghosts through the real player draw path during moon tide", () => {
    state.player.ultimateLevel = 1;
    state.player.ultimateTimer = 36;

    drawPlayer();

    expect(state.ultimatePlayerGhosts).toHaveLength(1);
    expect(state.ultimatePlayerGhosts[0]).toMatchObject({
      source: "player",
      action: "idle",
    });
  });

  it("stops spawning after moon tide ends and lets existing ghosts fade out", () => {
    state.player.ultimateLevel = 3;
    state.player.ultimateTimer = 30;

    expect(recordMoonTidePlayerGhost(ghostSnapshot("attack"))).toBe(true);

    const life = state.ultimatePlayerGhosts[0].maxLife;
    state.player.ultimateTimer = 0;

    expect(recordMoonTidePlayerGhost(ghostSnapshot("attack"))).toBe(false);
    expect(state.ultimatePlayerGhosts).toHaveLength(1);

    for (let frame = 0; frame < life; frame += 1) {
      updateUltimatePlayerGhosts();
    }

    expect(state.ultimatePlayerGhosts).toHaveLength(0);
  });

  it("pauses new ghosts during the early hurt invincibility window", () => {
    state.player.ultimateLevel = 3;
    state.player.ultimateTimer = 30;
    state.player.invincible = PLAYER_COMBAT.hurtInvincibleFrames;

    expect(recordMoonTidePlayerGhost(ghostSnapshot("attack"))).toBe(false);

    state.player.invincible = PLAYER_COMBAT.hurtInvincibleFrames - HURT_INVINCIBILITY_GHOST_RESUME_OFFSET;

    expect(recordMoonTidePlayerGhost(ghostSnapshot("attack"))).toBe(true);
  });

  it("clears ghosts on state reset", () => {
    state.player.ultimateLevel = 3;
    state.player.ultimateTimer = 30;

    expect(recordMoonTidePlayerGhost(ghostSnapshot("attack"))).toBe(true);

    resetState();

    expect(state.ultimatePlayerGhosts).toHaveLength(0);
  });

  it("applies the moon tide movement multiplier during the active buff", () => {
    keys.add("d");

    const normalStartX = state.player.x;
    updatePlayer();
    const normalDistance = state.player.x - normalStartX;

    resetState();
    keys.clear();
    keys.add("d");
    state.player.ultimateLevel = 3;
    state.player.ultimateTimer = 30;

    const moonTideStartX = state.player.x;
    updatePlayer();
    const moonTideDistance = state.player.x - moonTideStartX;

    expect(moonTideDistance).toBeGreaterThan(normalDistance);
    expect(moonTideDistance).toBeCloseTo(state.player.speed * MOON_TIDE_LEVEL_THREE_MOVE_MULTIPLIER);
  });

  it("speeds up movement animation cadence during the active buff", () => {
    const baseRunFrameSpeed = 4;

    expect(moonTidePlayerAnimationFrameSpeed("move", baseRunFrameSpeed)).toBe(baseRunFrameSpeed);

    state.player.ultimateLevel = 3;
    state.player.ultimateTimer = 30;

    expect(moonTidePlayerAnimationFrameSpeed("move", baseRunFrameSpeed))
      .toBeCloseTo(baseRunFrameSpeed / MOON_TIDE_LEVEL_THREE_MOVE_MULTIPLIER);
    expect(moonTidePlayerAnimationFrameSpeed("attack", baseRunFrameSpeed)).toBe(baseRunFrameSpeed);
  });
});
