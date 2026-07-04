import { afterEach, describe, expect, it, vi } from "vitest";
import { PLATFORM_SPRITES } from "../../constants";
import { resetState, state } from "../../game/state";
import { resetMapGenerator, spawnMapSegmentOfKind } from "./generator";
import { yToLayer } from "./helpers";

const LOW_LAYER_RANDOM_ROLL = 0.2;

describe("platform segment generator", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps wide platform sprites out of the lowest layer", () => {
    resetState();
    resetMapGenerator();
    vi.spyOn(Math, "random").mockReturnValue(LOW_LAYER_RANDOM_ROLL);

    spawnMapSegmentOfKind("breather");

    expect(state.platforms).toHaveLength(1);
    expect(yToLayer(state.platforms[0].baseY)).toBe("mid");
    expect(PLATFORM_SPRITES.wide).toContain(state.platforms[0].spriteIndex);
  });
});
