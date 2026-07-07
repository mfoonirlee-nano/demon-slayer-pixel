import { describe, expect, it } from "vitest";
import {
  CLOSE_ARC_BASIC_CRESCENT_CONFIG,
  CLOSE_ARC_BASIC_CRESCENT_SHEET,
  LINE_PROJECTILE_EFFECT_CONFIG,
  SKILL_IDS,
} from "../constants";
import {
  implementedPlayerSkills,
  lineProjectileEffectSheetForLevel,
  playerSkillEffectSheets,
} from "./skillCatalog";

const BLOCKED_TECHNICAL_COPY = ["px", "帧", "判定", "半径", "宽高", "倍率", "系数", "Boss"];
const LINE_PROJECTILE_LEVEL_ONE = 1;
const LINE_PROJECTILE_LEVEL_TWO = 2;
const LINE_PROJECTILE_LEVEL_THREE = 3;
const LINE_PROJECTILE_LEVEL_ONE_FRAME_W = 480;
const LINE_PROJECTILE_LEVEL_TWO_FRAME_W = 720;
const LINE_PROJECTILE_LEVEL_THREE_FRAME_W = 840;
const LINE_PROJECTILE_EFFECT_FRAME_WIDTHS = [
  LINE_PROJECTILE_LEVEL_ONE_FRAME_W,
  LINE_PROJECTILE_LEVEL_TWO_FRAME_W,
  LINE_PROJECTILE_LEVEL_THREE_FRAME_W,
];
const LINE_PROJECTILE_EFFECT_FRAME_COUNT = 8;
const LINE_PROJECTILE_EFFECT_LOOP_FROM_FRAME = 5;
const CLOSE_ARC_BASIC_CRESCENT_FRAME_COUNT = 2;
const CLOSE_ARC_BASIC_CRESCENT_FRAME_DURATION = 4;

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

  it("maps line projectile levels to progressively longer 8-frame effect sheets", () => {
    const levelOne = lineProjectileEffectSheetForLevel(LINE_PROJECTILE_LEVEL_ONE);
    const levelTwo = lineProjectileEffectSheetForLevel(LINE_PROJECTILE_LEVEL_TWO);
    const levelThree = lineProjectileEffectSheetForLevel(LINE_PROJECTILE_LEVEL_THREE);
    const preloadedSources = playerSkillEffectSheets().map((sheet) => sheet.src);

    expect([levelOne.frameW, levelTwo.frameW, levelThree.frameW]).toEqual(LINE_PROJECTILE_EFFECT_FRAME_WIDTHS);
    expect([levelOne.count, levelTwo.count, levelThree.count]).toEqual([
      LINE_PROJECTILE_EFFECT_FRAME_COUNT,
      LINE_PROJECTILE_EFFECT_FRAME_COUNT,
      LINE_PROJECTILE_EFFECT_FRAME_COUNT,
    ]);
    expect(LINE_PROJECTILE_EFFECT_CONFIG.loopFromFrame).toBe(LINE_PROJECTILE_EFFECT_LOOP_FROM_FRAME);
    expect(preloadedSources).toEqual(expect.arrayContaining([
      levelOne.src,
      levelTwo.src,
      levelThree.src,
    ]));
  });

  it("preloads the close arc level three basic attack crescent sheet", () => {
    const preloadedSources = playerSkillEffectSheets().map((sheet) => sheet.src);

    expect(preloadedSources).toContain(CLOSE_ARC_BASIC_CRESCENT_SHEET.src);
    expect(CLOSE_ARC_BASIC_CRESCENT_SHEET.count).toBe(CLOSE_ARC_BASIC_CRESCENT_FRAME_COUNT);
    expect(CLOSE_ARC_BASIC_CRESCENT_CONFIG.frameDuration).toBe(CLOSE_ARC_BASIC_CRESCENT_FRAME_DURATION);
  });
});
