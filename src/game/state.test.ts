import { describe, expect, it, vi } from "vitest";
import { createInitialState, getStateSnapshot, resetState, state } from "./state";

const DIRTY_VALUE = "dirty";
const ACT_FIVE_BOSS_KILLS = 4;
const ACT_FIVE = 5;

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
});
