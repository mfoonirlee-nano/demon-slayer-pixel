import { describe, expect, it } from "vitest";
import { SKILL_IDS } from "../constants";
import { implementedPlayerSkills } from "./skillCatalog";

const BLOCKED_TECHNICAL_COPY = ["px", "帧", "判定", "半径", "宽高", "倍率", "系数", "Boss"];

describe("player skill catalog copy", () => {
  it("uses the canonical display names for all implemented normal skills", () => {
    const skillNames = Object.fromEntries(
      implementedPlayerSkills().map((skill) => [skill.id, skill.name]),
    );

    expect(skillNames).toMatchObject({
      [SKILL_IDS.lineProjectile]: "潮龙·破阵",
      [SKILL_IDS.closeArc]: "弦月·潮刃",
      [SKILL_IDS.guardCounter]: "镜潮·护返",
      [SKILL_IDS.dashReposition]: "流步·潮闪",
      [SKILL_IDS.vortexControl]: "回涡·引潮",
      [SKILL_IDS.armorBreak]: "断浪·裂甲",
      [SKILL_IDS.antiAirMulti]: "雨线·穿针",
      [SKILL_IDS.returningBlade]: "回刃·归潮",
      [SKILL_IDS.verticalWave]: "升浪·托月",
    });
  });

  it("does not expose legacy style-name copy", () => {
    const legacyNames = ["潮龙破", "打潮刃", "镜潮返", "镜潮·返刃"];
    const exposedCopy = implementedPlayerSkills()
      .flatMap((skill) => [
        skill.name,
        skill.description,
        ...Object.values(skill.levelDescriptions),
      ])
      .join("\n");

    for (const legacyName of legacyNames) {
      expect(exposedCopy).not.toContain(legacyName);
    }
  });

  it("does not expose implementation units in player-facing skill copy", () => {
    const exposedCopy = implementedPlayerSkills()
      .flatMap((skill) => [
        skill.description,
        ...Object.values(skill.levelDescriptions),
      ])
      .join("\n");

    for (const blockedCopy of BLOCKED_TECHNICAL_COPY) {
      expect(exposedCopy).not.toContain(blockedCopy);
    }
  });
});
