import { describe, expect, it } from "vitest";
import { createBossEncounter } from "./encounter";
import {
  BOSS_ACT_SEQUENCE,
  BOSS_ARCHETYPE_IDS,
  bossArchetypeForId,
  bossArchetypeForKillCount,
} from "./registry";

const FANG_GALE_KILL_COUNT = 3;

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
    expect(bossArchetypeForKillCount(FANG_GALE_KILL_COUNT).id).toBe(BOSS_ARCHETYPE_IDS.fangGale);
    expect(createBossEncounter({ bossKills: 7, elapsedSeconds: 0 }).id).toBe(BOSS_ARCHETYPE_IDS.mistBone);
    expect(createBossEncounter({ bossKills: 7, elapsedSeconds: 0 }).awakened).toBe(true);
    expect(createBossEncounter({ bossKills: 9, elapsedSeconds: 0 }).id).toBe(BOSS_ARCHETYPE_IDS.fangGale);
    expect(createBossEncounter({ bossKills: 9, elapsedSeconds: 0 }).awakened).toBe(true);
  });

  it("keeps Mist Bone's cast sprite bottom on the same feet line as movement", () => {
    const mistBone = bossArchetypeForId(BOSS_ARCHETYPE_IDS.mistBone);

    expect(mistBone.castBottomPadding).toBe(0);
  });
});
