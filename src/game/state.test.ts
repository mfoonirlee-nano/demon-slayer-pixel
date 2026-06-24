import { describe, expect, it, vi } from "vitest";
import { createInitialState, resetState, state } from "./state";

const DIRTY_VALUE = "dirty";

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
});
