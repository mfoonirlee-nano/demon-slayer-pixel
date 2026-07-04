import { describe, expect, it } from "vitest";

import { isSkyElementVisible, resolveCloudVisibility, resolveStarVisibility } from "./skyVisibility";

const STAR_COUNT = 9;
const CLOUD_COUNT = 8;
const HALF_MOON_PROGRESS = 0.5;
const FULL_MOON_PROGRESS = 1;
const PHASE_STEP_0 = 0;
const PHASE_STEP_1 = 0.2;
const PHASE_STEP_2 = 0.4;
const PHASE_STEP_3 = 0.6;
const PHASE_STEP_4 = 0.8;
const FULL_MOON_STAR_COUNT = 2;
const FULL_MOON_CLOUD_COUNT = 5;
const REDUCED_STAR_VISIBLE_INDEX_0 = 4;
const REDUCED_STAR_VISIBLE_INDEX_1 = 8;
const REDUCED_CLOUD_VISIBLE_INDEX_0 = 1;
const REDUCED_CLOUD_VISIBLE_INDEX_1 = 3;
const REDUCED_CLOUD_VISIBLE_INDEX_2 = 4;
const REDUCED_CLOUD_VISIBLE_INDEX_3 = 6;
const REDUCED_CLOUD_VISIBLE_INDEX_4 = 7;
const REDUCED_STAR_VISIBLE_INDICES = [
  REDUCED_STAR_VISIBLE_INDEX_0,
  REDUCED_STAR_VISIBLE_INDEX_1,
];
const REDUCED_CLOUD_VISIBLE_INDICES = [
  REDUCED_CLOUD_VISIBLE_INDEX_0,
  REDUCED_CLOUD_VISIBLE_INDEX_1,
  REDUCED_CLOUD_VISIBLE_INDEX_2,
  REDUCED_CLOUD_VISIBLE_INDEX_3,
  REDUCED_CLOUD_VISIBLE_INDEX_4,
];

function selectedIndices(totalCount: number, visibleCount: number) {
  return Array.from({ length: totalCount }, (_, index) => index)
    .filter((index) => isSkyElementVisible(index, totalCount, visibleCount));
}

describe("sky visibility", () => {
  it("shows every sky element while the moon phase is small", () => {
    expect(resolveStarVisibility(0, STAR_COUNT)).toMatchObject({
      density: 1,
      visibleCount: STAR_COUNT,
      alphaScale: 1,
    });
    expect(resolveCloudVisibility(0, CLOUD_COUNT)).toMatchObject({
      density: 1,
      visibleCount: CLOUD_COUNT,
      alphaScale: 1,
    });
  });

  it("reduces stars faster than clouds as the moon fills", () => {
    const starMid = resolveStarVisibility(HALF_MOON_PROGRESS, STAR_COUNT);
    const cloudMid = resolveCloudVisibility(HALF_MOON_PROGRESS, CLOUD_COUNT);
    const starFull = resolveStarVisibility(FULL_MOON_PROGRESS, STAR_COUNT);
    const cloudFull = resolveCloudVisibility(FULL_MOON_PROGRESS, CLOUD_COUNT);

    expect(starMid.density).toBeLessThan(cloudMid.density);
    expect(starMid.visibleCount / STAR_COUNT).toBeLessThan(cloudMid.visibleCount / CLOUD_COUNT);
    expect(starFull.visibleCount).toBe(FULL_MOON_STAR_COUNT);
    expect(cloudFull.visibleCount).toBe(FULL_MOON_CLOUD_COUNT);
    expect(starFull.alphaScale).toBeLessThan(cloudFull.alphaScale);
  });

  it("never increases sky element visibility while the moon fills", () => {
    const phases = [
      PHASE_STEP_0,
      PHASE_STEP_1,
      PHASE_STEP_2,
      PHASE_STEP_3,
      PHASE_STEP_4,
      FULL_MOON_PROGRESS,
    ];
    const stars = phases.map((phase) => resolveStarVisibility(phase, STAR_COUNT));
    const clouds = phases.map((phase) => resolveCloudVisibility(phase, CLOUD_COUNT));

    for (let i = 1; i < phases.length; i += 1) {
      expect(stars[i].visibleCount).toBeLessThanOrEqual(stars[i - 1].visibleCount);
      expect(stars[i].alphaScale).toBeLessThan(stars[i - 1].alphaScale);
      expect(clouds[i].visibleCount).toBeLessThanOrEqual(clouds[i - 1].visibleCount);
      expect(clouds[i].alphaScale).toBeLessThan(clouds[i - 1].alphaScale);
    }
  });

  it("spreads reduced sky elements across the layer instead of keeping a prefix", () => {
    expect(selectedIndices(STAR_COUNT, FULL_MOON_STAR_COUNT)).toEqual(REDUCED_STAR_VISIBLE_INDICES);
    expect(selectedIndices(CLOUD_COUNT, FULL_MOON_CLOUD_COUNT)).toEqual(REDUCED_CLOUD_VISIBLE_INDICES);
  });
});
