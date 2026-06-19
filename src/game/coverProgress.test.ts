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

    expect(addCoverKills(3, storage)).toBe(3);
    expect(addCoverKills(COVER_PROGRESS_TARGET_KILLS + 20, storage)).toBe(5023);
    expect(readCoverKills(storage)).toBe(5023);
  });

  it("stores last seen kills using the same real kill-count semantics", () => {
    const storage = new MemoryStorage();

    expect(writeLastSeenCoverKills(5000.9, storage)).toBe(5000);
    expect(readLastSeenCoverKills(storage)).toBe(5000);

    storage.setItem(COVER_LAST_SEEN_KILLS_STORAGE_KEY, "6200");
    expect(readLastSeenCoverKills(storage)).toBe(6200);
  });

  it("clamps only visual progress, not the stored kill values", () => {
    expect(getCoverProgress(0)).toBe(0);
    expect(getCoverProgress(COVER_PROGRESS_TARGET_KILLS / 4)).toBe(0.5);
    expect(getCoverProgress(COVER_PROGRESS_TARGET_KILLS * 4)).toBe(1);
  });

  it("maps progress to a clamped moon phase index", () => {
    expect(getCoverMoonPhaseIndex(-1)).toBe(0);
    expect(getCoverMoonPhaseIndex(0)).toBe(0);
    expect(getCoverMoonPhaseIndex(0.999)).toBe(7);
    expect(getCoverMoonPhaseIndex(1)).toBe(7);
    expect(getCoverMoonPhaseIndex(2)).toBe(7);
  });

  it("falls back to zero and still returns write values when storage throws", () => {
    const storage = new ThrowingStorage();

    expect(readCoverKills(storage)).toBe(0);
    expect(readLastSeenCoverKills(storage)).toBe(0);
    expect(addCoverKills(10, storage)).toBe(10);
    expect(writeLastSeenCoverKills(12, storage)).toBe(12);
  });
});
