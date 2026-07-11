import { describe, expect, it } from "vitest";

import { ACT_LANDMARK_SPRITES } from "../constants";
import { spriteImageLoadTargets } from "./manifest";

describe("sprite manifest", () => {
  it("preloads every act landmark exactly once", () => {
    const loadedSources = spriteImageLoadTargets().map((target) => target.src);

    for (const landmark of ACT_LANDMARK_SPRITES) {
      expect(loadedSources.filter((src) => src === landmark.src)).toHaveLength(1);
    }
  });
});
