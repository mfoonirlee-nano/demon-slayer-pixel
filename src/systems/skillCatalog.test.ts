import { describe, expect, it } from "vitest";
import {
  CLOSE_ARC_BASIC_CRESCENT_CONFIG,
  CLOSE_ARC_BASIC_CRESCENT_SHEET,
  LINE_PROJECTILE_EFFECT_CONFIG,
  SKILL_IDS,
} from "../constants";
import { ANTI_AIR_MULTI_BONUS_DROP_CONFIG } from "./playerSkills";
import {
  implementedPlayerSkills,
  lineProjectileEffectSheetForLevel,
  playerSkillEffectSheets,
  playerSkillDescription,
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
const GUARD_COUNTER_LEVEL_THREE = 3;
const DASH_REPOSITION_LEVEL_THREE = 3;
const ARMOR_BREAK_LEVEL_THREE = 3;
const ANTI_AIR_MULTI_LEVEL_THREE = 3;
const PERCENT_MULTIPLIER = 100;

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

  it("explains the level-three line projectile knockback and equipped passive", () => {
    const description = playerSkillDescription(SKILL_IDS.lineProjectile, LINE_PROJECTILE_LEVEL_THREE);

    expect(description).toContain("击退两个身位");
    expect(description).toContain("10%");
    expect(description).toContain("首领");
  });

  it("explains the level-three guard counter scaling damage reduction", () => {
    const description = playerSkillDescription(SKILL_IDS.guardCounter, GUARD_COUNTER_LEVEL_THREE);

    expect(description).toContain("15%");
    expect(description).toContain("30%");
    expect(description).toContain("玩家等级");
  });

  it("explains the level-three dash reposition equipped movement speed passive", () => {
    const description = playerSkillDescription(SKILL_IDS.dashReposition, DASH_REPOSITION_LEVEL_THREE);

    expect(description).toContain("15%");
    expect(description).toContain("装备");
    expect(description).toContain("移动速度");
  });

  it("explains the level-three armor break equipped shield penetration passive", () => {
    const description = playerSkillDescription(SKILL_IDS.armorBreak, ARMOR_BREAK_LEVEL_THREE);

    expect(description).toContain("50%");
    expect(description).toContain("装备");
    expect(description).toContain("举盾");
  });

  it("explains the level-three anti-air bonus drop chance and damage", () => {
    const description = playerSkillDescription(SKILL_IDS.antiAirMulti, ANTI_AIR_MULTI_LEVEL_THREE);

    expect(description).toContain(`${ANTI_AIR_MULTI_BONUS_DROP_CONFIG.chance * PERCENT_MULTIPLIER}%`);
    expect(description).toContain(`${ANTI_AIR_MULTI_BONUS_DROP_CONFIG.damageMultiplier * PERCENT_MULTIPLIER}%`);
  });

  it("preloads the close arc level three basic attack crescent sheet", () => {
    const preloadedSources = playerSkillEffectSheets().map((sheet) => sheet.src);

    expect(preloadedSources).toContain(CLOSE_ARC_BASIC_CRESCENT_SHEET.src);
    expect(CLOSE_ARC_BASIC_CRESCENT_SHEET.count).toBe(CLOSE_ARC_BASIC_CRESCENT_FRAME_COUNT);
    expect(CLOSE_ARC_BASIC_CRESCENT_CONFIG.frameDuration).toBe(CLOSE_ARC_BASIC_CRESCENT_FRAME_DURATION);
  });
});
