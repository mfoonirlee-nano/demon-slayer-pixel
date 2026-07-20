import { describe, expect, it } from "vitest";
import type { BossArchetypeId } from "../types/game-state";
import { bossName, bossPhaseTitle } from "./bossCopy";

const CHINESE_BOSS_NAMES: Record<BossArchetypeId, string> = {
  "spider-string": "蛛弦",
  "mist-bone": "雾骨",
  "mirror-dream": "镜魇",
  "fang-gale": "牙岚",
  "lantern-ember": "灯烬",
  "dead-bell": "枯铃",
  "blood-moon-many-faces": "万相血月",
};

const ENGLISH_BOSS_NAMES: Record<BossArchetypeId, string> = {
  "spider-string": "Spider String",
  "mist-bone": "Mist Bone",
  "mirror-dream": "Mirror Dream",
  "fang-gale": "Fang Gale",
  "lantern-ember": "Lantern Ember",
  "dead-bell": "Dead Bell",
  "blood-moon-many-faces": "Many-Faced Blood Moon",
};

const CHINESE_BOSS_TITLES: Record<BossArchetypeId, { base: string; awakened: string }> = {
  "spider-string": {
    base: "血月眷属 · 蛛弦 · 阶段 2",
    awakened: "血月眷属 · 蛛弦·蚀醒 · 阶段 2",
  },
  "mist-bone": {
    base: "血月眷属 · 雾骨 · 阶段 2",
    awakened: "血月眷属 · 雾骨·蚀醒 · 阶段 2",
  },
  "mirror-dream": {
    base: "血月眷属 · 镜魇 · 阶段 2",
    awakened: "血月眷属 · 镜魇·蚀醒 · 阶段 2",
  },
  "fang-gale": {
    base: "血月眷属 · 牙岚 · 阶段 2",
    awakened: "血月眷属 · 牙岚·蚀醒 · 阶段 2",
  },
  "lantern-ember": {
    base: "血月眷属 · 灯烬 · 阶段 2",
    awakened: "血月眷属 · 灯烬·蚀醒 · 阶段 2",
  },
  "dead-bell": {
    base: "血月眷属 · 枯铃 · 阶段 2",
    awakened: "血月眷属 · 枯铃·蚀醒 · 阶段 2",
  },
  "blood-moon-many-faces": {
    base: "终幕夜相 · 万相血月 · 第 2 相",
    awakened: "终幕夜相 · 万相血月 · 第 2 相",
  },
};

const ENGLISH_BOSS_TITLES: Record<BossArchetypeId, { base: string; awakened: string }> = {
  "spider-string": {
    base: "Blood Moon Kin · Spider String · Phase 2",
    awakened: "Blood Moon Kin · Awakened Spider String · Phase 2",
  },
  "mist-bone": {
    base: "Blood Moon Kin · Mist Bone · Phase 2",
    awakened: "Blood Moon Kin · Awakened Mist Bone · Phase 2",
  },
  "mirror-dream": {
    base: "Blood Moon Kin · Mirror Dream · Phase 2",
    awakened: "Blood Moon Kin · Awakened Mirror Dream · Phase 2",
  },
  "fang-gale": {
    base: "Blood Moon Kin · Fang Gale · Phase 2",
    awakened: "Blood Moon Kin · Awakened Fang Gale · Phase 2",
  },
  "lantern-ember": {
    base: "Blood Moon Kin · Lantern Ember · Phase 2",
    awakened: "Blood Moon Kin · Awakened Lantern Ember · Phase 2",
  },
  "dead-bell": {
    base: "Blood Moon Kin · Dead Bell · Phase 2",
    awakened: "Blood Moon Kin · Awakened Dead Bell · Phase 2",
  },
  "blood-moon-many-faces": {
    base: "Final Night · Many-Faced Blood Moon · Aspect 2",
    awakened: "Final Night · Many-Faced Blood Moon · Aspect 2",
  },
};

const PHASE = 2;

describe("localized boss presentation copy", () => {
  it("preserves the current Chinese name for every boss", () => {
    for (const [bossId, expectedName] of bossEntries(CHINESE_BOSS_NAMES)) {
      expect(bossName("zh-CN", bossId)).toBe(expectedName);
    }
  });

  it("preserves every current Chinese base and awakened phase title", () => {
    for (const [bossId, expectedTitle] of bossEntries(CHINESE_BOSS_TITLES)) {
      expect(bossPhaseTitle("zh-CN", bossId, PHASE, false)).toBe(expectedTitle.base);
      expect(bossPhaseTitle("zh-CN", bossId, PHASE, true)).toBe(expectedTitle.awakened);
    }
  });

  it("provides concise English names and phase titles for every boss", () => {
    for (const [bossId, expectedName] of bossEntries(ENGLISH_BOSS_NAMES)) {
      const expectedTitle = ENGLISH_BOSS_TITLES[bossId];

      expect(bossName("en", bossId)).toBe(expectedName);
      expect(bossPhaseTitle("en", bossId, PHASE, false)).toBe(expectedTitle.base);
      expect(bossPhaseTitle("en", bossId, PHASE, true)).toBe(expectedTitle.awakened);
    }
  });

  it("keeps every English boss name and title free of Han characters", () => {
    for (const [bossId] of bossEntries(ENGLISH_BOSS_NAMES)) {
      const exposedCopy = [
        bossName("en", bossId),
        bossPhaseTitle("en", bossId, PHASE, false),
        bossPhaseTitle("en", bossId, PHASE, true),
      ];

      expect(exposedCopy.every((value) => value.trim().length > 0)).toBe(true);
      expect(exposedCopy.join("\n")).not.toMatch(/\p{Script=Han}/u);
    }
  });
});

function bossEntries<T>(record: Record<BossArchetypeId, T>) {
  return Object.entries(record) as [BossArchetypeId, T][];
}
