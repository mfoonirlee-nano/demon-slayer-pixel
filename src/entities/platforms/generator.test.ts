import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACT_PLATFORM_SPRITES,
  GROUND_Y,
  MAP_GENERATION_CONFIG,
  PLATFORM_SPRITES,
} from "../../constants";
import { resetState, state } from "../../game/state";
import { seededRandom } from "../../game/utils";
import {
  resetMapGenerator,
  spawnMapSegmentOfKind,
  spawnNextMapSegment,
  spawnTreasureRouteSegment,
} from "./generator";
import { yToLayer } from "./helpers";

const LOW_LAYER_RANDOM_ROLL = 0.2;
const TREASURE_HOST_MIN_WIDTH = 120;
const TREASURE_ROUTE_BLOCKER_X = 1080;
const HIGH_LAYER_Y = 182;
const TREASURE_ROUTE_PLATFORM_COUNT = 3;
const TEST_TREASURE_ROUTE_SEED = 12_345;

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
    const platform = state.platforms[0];
    const sheet = platform.spriteAct === null
      ? PLATFORM_SPRITES
      : ACT_PLATFORM_SPRITES[platform.spriteAct];
    expect(sheet?.wide).toContain(platform.spriteIndex);
  });

  it("returns the platforms created by an explicitly requested segment", () => {
    resetState();
    resetMapGenerator();
    vi.spyOn(Math, "random").mockReturnValue(LOW_LAYER_RANDOM_ROLL);

    const result = spawnMapSegmentOfKind("breather");

    expect(result.kind).toBe("breather");
    expect(result.platforms).toEqual(state.platforms);
  });

  it("returns the platforms created by the next generated segment", () => {
    resetState();
    resetMapGenerator();
    vi.spyOn(Math, "random").mockReturnValue(LOW_LAYER_RANDOM_ROLL);

    const result = spawnNextMapSegment();

    expect(result.platforms).toEqual(state.platforms);
  });

  it("creates a reachable safe route with a reserved static high treasure host", () => {
    resetState();
    resetMapGenerator();
    vi.spyOn(Math, "random").mockReturnValue(LOW_LAYER_RANDOM_ROLL);

    const result = spawnTreasureRouteSegment();

    expect(result.kind).toBe("riskFork");
    expect(result.platforms).toHaveLength(TREASURE_ROUTE_PLATFORM_COUNT);
    expect(result.platforms).toEqual(state.platforms);

    const [safeRoute] = result.platforms;
    const treasureHost = result.treasureHost;
    expect(result.treasureHost).toBe(treasureHost);
    expect(safeRoute.reservedForTreasure).not.toBe(true);
    expect(GROUND_Y - safeRoute.baseY).toBeLessThanOrEqual(
      MAP_GENERATION_CONFIG.reachability.maxRise,
    );
    expect(["high", "top"]).toContain(yToLayer(treasureHost.baseY));
    expect(treasureHost.w).toBeGreaterThanOrEqual(TREASURE_HOST_MIN_WIDTH);
    expect(treasureHost.kind).toBe("normal");
    expect(treasureHost.hoverAmplitude).toBe(0);
    expect(treasureHost.reservedForTreasure).toBe(true);
    for (let index = 1; index < result.platforms.length; index += 1) {
      const previous = result.platforms[index - 1];
      const next = result.platforms[index];
      const gap = next.x - (previous.x + previous.w);
      const rise = previous.baseY - next.baseY;
      expect(rise).toBeLessThanOrEqual(MAP_GENERATION_CONFIG.reachability.maxRise);
      expect(gap).toBeGreaterThanOrEqual(MAP_GENERATION_CONFIG.reachability.minGap);
      expect(gap).toBeLessThanOrEqual(MAP_GENERATION_CONFIG.reachability.highRiseMaxGap);
    }

    const nextSegment = spawnMapSegmentOfKind("stairUp");
    expect(yToLayer(nextSegment.platforms[0].baseY)).toBe("mid");
  });

  it("preserves the reachable treasure gap when existing high platforms block its first placement", () => {
    resetState();
    resetMapGenerator();
    vi.spyOn(Math, "random").mockReturnValue(LOW_LAYER_RANDOM_ROLL);
    const blocker = spawnMapSegmentOfKind("breather").platforms[0];
    blocker.x = TREASURE_ROUTE_BLOCKER_X;
    blocker.y = HIGH_LAYER_Y;
    blocker.baseY = HIGH_LAYER_Y;
    resetMapGenerator();

    const result = spawnTreasureRouteSegment();
    const treasureHostIndex = result.platforms.indexOf(result.treasureHost);
    const previous = result.platforms[treasureHostIndex - 1];
    const gap = result.treasureHost.x - (previous.x + previous.w);

    expect(gap).toBeLessThanOrEqual(MAP_GENERATION_CONFIG.reachability.highRiseMaxGap);
  });

  it("replays the dedicated route geometry from the same treasure seed", () => {
    const routeSnapshot = () => {
      resetState();
      resetMapGenerator();
      return spawnTreasureRouteSegment(seededRandom(TEST_TREASURE_ROUTE_SEED))
        .platforms.map((platform) => ({
          baseY: platform.baseY,
          phase: platform.phase,
          spriteAct: platform.spriteAct,
          spriteIndex: platform.spriteIndex,
          style: platform.style,
          w: platform.w,
          x: platform.x,
        }));
    };

    expect(routeSnapshot()).toEqual(routeSnapshot());
  });
});
