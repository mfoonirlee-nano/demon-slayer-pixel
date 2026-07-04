const STAR_FULL_MOON_DENSITY = 0.22;
const CLOUD_FULL_MOON_DENSITY = 0.62;

export type SkyLayerVisibility = {
  density: number;
  visibleCount: number;
  alphaScale: number;
};

function clampProgress(coverProgress: number) {
  return Math.max(0, Math.min(1, coverProgress));
}

function resolveSkyLayerVisibility(
  coverProgress: number,
  totalCount: number,
  fullMoonDensity: number,
): SkyLayerVisibility {
  const safeTotal = Math.max(0, Math.floor(totalCount));
  const density = 1 - clampProgress(coverProgress) * (1 - fullMoonDensity);
  const visibleCount = safeTotal === 0 ? 0 : Math.max(1, Math.min(safeTotal, Math.ceil(safeTotal * density)));

  return {
    density,
    visibleCount,
    alphaScale: density,
  };
}

export function resolveStarVisibility(coverProgress: number, totalCount: number) {
  return resolveSkyLayerVisibility(coverProgress, totalCount, STAR_FULL_MOON_DENSITY);
}

export function resolveCloudVisibility(coverProgress: number, totalCount: number) {
  return resolveSkyLayerVisibility(coverProgress, totalCount, CLOUD_FULL_MOON_DENSITY);
}

export function isSkyElementVisible(index: number, totalCount: number, visibleCount: number) {
  if (index < 0 || index >= totalCount || visibleCount <= 0) return false;
  if (visibleCount >= totalCount) return true;

  return (
    Math.floor((index + 1) * visibleCount / totalCount)
    > Math.floor(index * visibleCount / totalCount)
  );
}
