export type {
  SegmentKind,
  SegmentSpawnResult,
  TreasureRouteSpawnResult,
} from "./platforms/generator";
export {
  nextMapSpawnInterval,
  resetMapGenerator,
  spawnMapSegmentOfKind,
  spawnNextMapSegment,
  spawnTreasureRouteSegment,
} from "./platforms/generator";
export { drawPlatformOcclusion, drawPlatforms, updatePlatforms } from "./platforms/runtime";
