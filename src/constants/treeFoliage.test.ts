import { describe, expect, it } from "vitest";

import { REGULAR_TREE_FOLIAGE, TALL_TREE_FOLIAGE } from "./treeFoliage";

const EXPECTED_REGULAR_TREE_FOLIAGE = [
  "pine",
  "pine",
  "broadleaf",
  "bare",
  "willow",
  "pine",
  "broadleaf",
  "bare",
  "pine",
  "pine",
  "bare",
  "broadleaf",
  "pine",
  "pine",
  "bare",
  "pine",
  "bamboo",
  "broadleaf",
  "willow",
  "bare",
  "pine",
  "pine",
  "broadleaf",
  "pine",
] as const;

describe("tree foliage profiles", () => {
  it("binds every regular-tree atlas variant to its visible leaf family", () => {
    expect(REGULAR_TREE_FOLIAGE.map((profile) => profile?.kind ?? "bare")).toEqual(
      EXPECTED_REGULAR_TREE_FOLIAGE,
    );
  });

  it("binds every tall-tree variant to pine needles", () => {
    expect(TALL_TREE_FOLIAGE.map((profile) => profile.kind)).toEqual([
      "pine",
      "pine",
      "pine",
      "pine",
    ]);
  });

  it("keeps every release anchor normalized inside its atlas region", () => {
    const profiles = [...REGULAR_TREE_FOLIAGE, ...TALL_TREE_FOLIAGE].filter((profile) => (
      profile !== null
    ));

    for (const profile of profiles) {
      expect(profile.anchors.length).toBeGreaterThan(0);
      for (const anchor of profile.anchors) {
        expect(anchor.x).toBeGreaterThanOrEqual(0);
        expect(anchor.x).toBeLessThanOrEqual(1);
        expect(anchor.y).toBeGreaterThanOrEqual(0);
        expect(anchor.y).toBeLessThanOrEqual(1);
      }
    }
  });
});
