import { describe, expect, it, vi } from "vitest";
import { createInitialState, getStateSnapshot, resetState, state } from "./state";

const DIRTY_VALUE = "dirty";
const ACT_FIVE_BOSS_KILLS = 4;
const ACT_FIVE = 5;
const ULTIMATE_LEVEL_ONE_DURATION_FRAMES = 360;

function snapshotResettableState() {
  const { spritesReady: _spritesReady, ...resettableState } = state;
  return JSON.parse(JSON.stringify(resettableState));
}

function dirtyResettableState() {
  const stateRecord = state as unknown as Record<string, unknown>;

  for (const [key, value] of Object.entries(stateRecord)) {
    if (key === "spritesReady") continue;

    if (Array.isArray(value)) {
      value.push(DIRTY_VALUE);
      continue;
    }

    stateRecord[key] = DIRTY_VALUE;
  }
}

describe("resetState", () => {
  it("restores every resettable top-level field while preserving sprite readiness", () => {
    state.spritesReady = true;
    dirtyResettableState();

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    resetState();

    const { spritesReady: _spritesReady, ...expectedState } = createInitialState();
    randomSpy.mockRestore();
    expect(snapshotResettableState()).toEqual(expectedState);
    expect(state.spritesReady).toBe(true);
  });

  it("derives act fields in the snapshot from boss kills", () => {
    resetState();
    state.bossKills = ACT_FIVE_BOSS_KILLS;

    const snapshot = getStateSnapshot();

    expect(snapshot.act).toBe(ACT_FIVE);
    expect(snapshot.actBand).toBe("intro");
    expect(snapshot.bossKills).toBe(ACT_FIVE_BOSS_KILLS);
    expect(snapshot.threatScalar).toBeGreaterThan(1);
  });

  it("does not mark the ultimate ready before it is learned", () => {
    resetState();
    state.player.ultimateEnergy = state.player.ultimateEnergyMax;

    expect(getStateSnapshot().player.ultimateReady).toBe(false);

    state.player.ultimateLevel = 1;

    expect(getStateSnapshot().player.ultimateReady).toBe(true);
  });

  it("exposes only the level-three skill passives that can currently trigger", () => {
    resetState();
    state.player.skillLevels.line_projectile = 3;
    state.player.skillLevels.close_arc = 3;
    state.player.equippedSkillIds = ["line_projectile", "close_arc", null];
    state.player.skillIndex = 1;

    expect(getStateSnapshot().player.statuses).toEqual([
      {
        id: "line_projectile_knockback",
        remainingFrames: null,
        durationFrames: null,
      },
      {
        id: "close_arc_basic_crescent",
        remainingFrames: null,
        durationFrames: null,
      },
    ]);

    state.player.skillIndex = 0;

    expect(getStateSnapshot().player.statuses.map((status) => status.id)).toEqual([
      "line_projectile_knockback",
    ]);
  });

  it("exposes the level-three guard counter damage reduction while equipped", () => {
    resetState();
    state.player.skillLevels.guard_counter = 3;

    expect(getStateSnapshot().player.statuses).toContainEqual({
      id: "guard_counter_damage_reduction",
      remainingFrames: null,
      durationFrames: null,
    });
  });

  it("exposes active guard counter and ultimate durations in gameplay frames", () => {
    resetState();
    state.guardCounterEffect = {
      elapsed: 12,
      frame: 0,
      hitsRemaining: 2,
      maxHits: 3,
      activeFrames: 72,
      counterPadding: 0,
      damageMultiplier: 1,
      barrierFlash: 0,
    };
    state.player.ultimateLevel = 1;
    state.player.ultimateTimer = 180;
    state.player.ultimateDuration = ULTIMATE_LEVEL_ONE_DURATION_FRAMES;

    expect(getStateSnapshot().player.statuses).toEqual([
      {
        id: "guard_counter",
        remainingFrames: 60,
        durationFrames: 72,
        stacks: 2,
        maxStacks: 3,
      },
      {
        id: "moon_tide",
        remainingFrames: 180,
        durationFrames: 360,
      },
    ]);
  });

  it("keeps the cast-time ultimate duration if the ultimate levels up while active", () => {
    resetState();
    state.player.ultimateLevel = 1;
    state.player.ultimateTimer = 180;
    state.player.ultimateDuration = ULTIMATE_LEVEL_ONE_DURATION_FRAMES;

    state.player.ultimateLevel = 2;

    const snapshot = getStateSnapshot();
    expect(snapshot.player.ultimateDuration).toBe(ULTIMATE_LEVEL_ONE_DURATION_FRAMES);
    expect(snapshot.player.statuses).toContainEqual({
      id: "moon_tide",
      remainingFrames: 180,
      durationFrames: ULTIMATE_LEVEL_ONE_DURATION_FRAMES,
    });
  });
});
