import { describe, expect, it } from "vitest";
import {
  COVER_KILLS_STORAGE_KEY,
  COVER_LAST_SEEN_KILLS_STORAGE_KEY,
  COVER_PROGRESS_TARGET_KILLS,
  addCoverKills,
  getCoverMoonPhaseIndex,
  getCoverProgress,
  readCoverKills,
  readLastSeenCoverKills,
  writeLastSeenCoverKills,
  type CoverProgressStorage,
} from "./coverProgress";

class MemoryStorage implements CoverProgressStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

class ThrowingStorage implements CoverProgressStorage {
  getItem(): string | null {
    throw new Error("storage unavailable");
  }

  setItem() {
    throw new Error("storage unavailable");
  }
}

const FIRST_KILL_INCREMENT = 3;
const OVER_TARGET_KILL_INCREMENT = 20;
const OVER_TARGET_STORED_KILLS = 5023;
const FRACTIONAL_LAST_SEEN_KILLS = 5000.9;
const FLOORED_LAST_SEEN_KILLS = 5000;
const STORED_LAST_SEEN_KILLS = 6200;
const QUARTER_TARGET_DIVISOR = 4;
const NEAR_COMPLETE_PROGRESS = 0.999;
const FINAL_MOON_PHASE_INDEX = 7;
const STORAGE_FALLBACK_ADD_KILLS = 10;
const STORAGE_FALLBACK_LAST_SEEN_KILLS = 12;

describe("cover progress", () => {
  it("reads missing, invalid, and negative kills as zero", () => {
    const storage = new MemoryStorage();

    expect(readCoverKills(storage)).toBe(0);

    storage.setItem(COVER_KILLS_STORAGE_KEY, "not-a-number");
    expect(readCoverKills(storage)).toBe(0);

    storage.setItem(COVER_KILLS_STORAGE_KEY, "-8");
    expect(readCoverKills(storage)).toBe(0);
  });

  it("adds weighted kills without clamping the stored total", () => {
    const storage = new MemoryStorage();

    expect(addCoverKills(FIRST_KILL_INCREMENT, storage)).toBe(FIRST_KILL_INCREMENT);
    expect(addCoverKills(COVER_PROGRESS_TARGET_KILLS + OVER_TARGET_KILL_INCREMENT, storage)).toBe(OVER_TARGET_STORED_KILLS);
    expect(readCoverKills(storage)).toBe(OVER_TARGET_STORED_KILLS);
  });

  it("stores last seen kills using the same real kill-count semantics", () => {
    const storage = new MemoryStorage();

    expect(writeLastSeenCoverKills(FRACTIONAL_LAST_SEEN_KILLS, storage)).toBe(FLOORED_LAST_SEEN_KILLS);
    expect(readLastSeenCoverKills(storage)).toBe(FLOORED_LAST_SEEN_KILLS);

    storage.setItem(COVER_LAST_SEEN_KILLS_STORAGE_KEY, String(STORED_LAST_SEEN_KILLS));
    expect(readLastSeenCoverKills(storage)).toBe(STORED_LAST_SEEN_KILLS);
  });

  it("clamps only visual progress, not the stored kill values", () => {
    expect(getCoverProgress(0)).toBe(0);
    expect(getCoverProgress(COVER_PROGRESS_TARGET_KILLS / QUARTER_TARGET_DIVISOR)).toBe(0.5);
    expect(getCoverProgress(COVER_PROGRESS_TARGET_KILLS * QUARTER_TARGET_DIVISOR)).toBe(1);
  });

  it("maps progress to a clamped moon phase index", () => {
    expect(getCoverMoonPhaseIndex(-1)).toBe(0);
    expect(getCoverMoonPhaseIndex(0)).toBe(0);
    expect(getCoverMoonPhaseIndex(NEAR_COMPLETE_PROGRESS)).toBe(FINAL_MOON_PHASE_INDEX);
    expect(getCoverMoonPhaseIndex(1)).toBe(FINAL_MOON_PHASE_INDEX);
    expect(getCoverMoonPhaseIndex(2)).toBe(FINAL_MOON_PHASE_INDEX);
  });

  it("falls back to zero and still returns write values when storage throws", () => {
    const storage = new ThrowingStorage();

    expect(readCoverKills(storage)).toBe(0);
    expect(readLastSeenCoverKills(storage)).toBe(0);
    expect(addCoverKills(STORAGE_FALLBACK_ADD_KILLS, storage)).toBe(STORAGE_FALLBACK_ADD_KILLS);
    expect(writeLastSeenCoverKills(STORAGE_FALLBACK_LAST_SEEN_KILLS, storage)).toBe(STORAGE_FALLBACK_LAST_SEEN_KILLS);
  });
});
