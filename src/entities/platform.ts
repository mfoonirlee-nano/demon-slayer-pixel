export type { SegmentKind } from "./platforms/generator";
export {
  nextMapSpawnInterval,
  resetMapGenerator,
  spawnMapSegmentOfKind,
  spawnNextMapSegment,
} from "./platforms/generator";
export { drawPlatforms, updatePlatforms } from "./platforms/runtime";
export {
  drawChests,
  drawCrystals,
  spawnCrystalOnPlatform,
  updateChests,
  updateCrystals,
} from "./platforms/collectibles";
