import { describe, expect, it } from "vitest";
import { createBossEncounter } from "./encounter";
import {
  BOSS_ACT_SEQUENCE,
  BOSS_ARCHETYPE_IDS,
  bossArchetypeForKillCount,
} from "./registry";

describe("boss act registry", () => {
  it("matches the fixed 13-act boss sequence", () => {
    expect(BOSS_ACT_SEQUENCE).toEqual([
      BOSS_ARCHETYPE_IDS.spiderString,
      BOSS_ARCHETYPE_IDS.mistBone,
      BOSS_ARCHETYPE_IDS.mirrorDream,
      BOSS_ARCHETYPE_IDS.fangGale,
      BOSS_ARCHETYPE_IDS.lanternEmber,
      BOSS_ARCHETYPE_IDS.deadBell,
      BOSS_ARCHETYPE_IDS.spiderString,
      BOSS_ARCHETYPE_IDS.mistBone,
      BOSS_ARCHETYPE_IDS.mirrorDream,
      BOSS_ARCHETYPE_IDS.fangGale,
      BOSS_ARCHETYPE_IDS.lanternEmber,
      BOSS_ARCHETYPE_IDS.deadBell,
      BOSS_ARCHETYPE_IDS.bloodMoon,
    ]);
  });

  it("selects Mist Bone, Fang Gale, and awakened repeats by kill count", () => {
    expect(bossArchetypeForKillCount(1).id).toBe(BOSS_ARCHETYPE_IDS.mistBone);
    expect(bossArchetypeForKillCount(3).id).toBe(BOSS_ARCHETYPE_IDS.fangGale);
    expect(createBossEncounter({ bossKills: 7, elapsedSeconds: 0 }).id).toBe(BOSS_ARCHETYPE_IDS.mistBone);
    expect(createBossEncounter({ bossKills: 7, elapsedSeconds: 0 }).awakened).toBe(true);
    expect(createBossEncounter({ bossKills: 9, elapsedSeconds: 0 }).id).toBe(BOSS_ARCHETYPE_IDS.fangGale);
    expect(createBossEncounter({ bossKills: 9, elapsedSeconds: 0 }).awakened).toBe(true);
  });
});
