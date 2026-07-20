import { describe, expect, it } from "vitest";
import type { DebugEnemyKind } from "../game/debug";
import type { SegmentKind } from "../entities/platform";
import type { ActBand } from "../types/game-state";
import { debugEnemyLabel, debugGrowthLabel, debugPlatformLabel } from "./debugCopy";

const ENEMIES: DebugEnemyKind[] = [
  "chaser",
  "crawler",
  "runner",
  "caster",
  "duelist",
  "brute",
  "binder",
  "glider",
  "leaper",
  "splitter",
  "warden",
  "burrower",
];
const GROWTH_STAGES: ActBand[] = ["intro", "awakened", "final"];
const PLATFORMS: SegmentKind[] = [
  "safeBridge",
  "breather",
  "stairUp",
  "stairDown",
  "zigzag",
  "gapJump",
  "hoverPair",
  "rewardRisk",
];

describe("debug presentation copy", () => {
  it("covers every debug selector in Chinese and English", () => {
    const chinese = [
      ...ENEMIES.map((value) => debugEnemyLabel("zh-CN", value)),
      ...GROWTH_STAGES.map((value) => debugGrowthLabel("zh-CN", value)),
      ...PLATFORMS.map((value) => debugPlatformLabel("zh-CN", value)),
    ];
    const english = [
      ...ENEMIES.map((value) => debugEnemyLabel("en", value)),
      ...GROWTH_STAGES.map((value) => debugGrowthLabel("en", value)),
      ...PLATFORMS.map((value) => debugPlatformLabel("en", value)),
    ];

    expect(chinese.every((value) => value.length > 0)).toBe(true);
    expect(english.every((value) => value.length > 0)).toBe(true);
    expect(english.join(" ")).not.toMatch(/\p{Script=Han}/u);
  });
});
