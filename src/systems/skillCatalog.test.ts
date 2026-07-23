import { describe, expect, it } from "vitest";
import {
  ANTI_AIR_MULTI_BONUS_DROP_CONFIG,
  CLOSE_ARC_BASIC_CRESCENT_CONFIG,
  CLOSE_ARC_BASIC_CRESCENT_SHEET,
  LINE_PROJECTILE_EFFECT_CONFIG,
  RETURNING_BLADE_WATER_RING_CONFIG,
  RETURNING_BLADE_WATER_RING_SHEET,
  SKILL_IDS,
  VERTICAL_WAVE_PILLAR_CONFIG,
  VERTICAL_WAVE_PILLAR_SHEET,
  VORTEX_CONTROL_DOUBLE_JUMP_CONFIG,
} from "../constants";
import { formatPercent } from "../utils";
import {
  implementedPlayerSkills,
  lineProjectileEffectSheetForLevel,
  playerSkillEffectSheet,
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
const RETURNING_BLADE_WATER_RING_FRAME_WIDTH = 240;
const RETURNING_BLADE_WATER_RING_FRAME_HEIGHT = 160;
const VERTICAL_WAVE_PILLAR_FRAME_WIDTH = 480;
const VERTICAL_WAVE_PILLAR_FRAME_HEIGHT = 520;
const VERTICAL_WAVE_PILLAR_FRAME_COUNT = VERTICAL_WAVE_PILLAR_CONFIG.frameCount;

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

  it("explains the level-three vortex control equipped double jump passive", () => {
    const description = playerSkillDescription(
      SKILL_IDS.vortexControl,
      VORTEX_CONTROL_DOUBLE_JUMP_CONFIG.requiredLevel,
    );

    expect(description).toContain("装备");
    expect(description).toContain(`空中追加跳跃 ${VORTEX_CONTROL_DOUBLE_JUMP_CONFIG.extraAirJumps} 次`);
    expect(description).toContain("落地后恢复");
    expect(description).toContain("越过首领头顶");
    expect(description).toContain("仍拉不动首领");
  });

  it("explains the level-three armor break equipped shield penetration passive", () => {
    const description = playerSkillDescription(SKILL_IDS.armorBreak, ARMOR_BREAK_LEVEL_THREE);

    expect(description).toContain("50%");
    expect(description).toContain("装备");
    expect(description).toContain("举盾");
  });

  it("explains the level-three anti-air bonus drop chance and damage", () => {
    const description = playerSkillDescription(SKILL_IDS.antiAirMulti, ANTI_AIR_MULTI_LEVEL_THREE);

    expect(description).toContain(formatPercent(ANTI_AIR_MULTI_BONUS_DROP_CONFIG.chance));
    expect(description).toContain(formatPercent(ANTI_AIR_MULTI_BONUS_DROP_CONFIG.damageMultiplier));
  });

  it("explains the level-three returning blade water-ring slash", () => {
    const description = playerSkillDescription(
      SKILL_IDS.returningBlade,
      RETURNING_BLADE_WATER_RING_CONFIG.requiredLevel,
    );

    expect(description).toContain("原有潮刃照常往返");
    expect(description).toContain(formatPercent(RETURNING_BLADE_WATER_RING_CONFIG.chance));
    expect(description).toContain("追加 1 道");
    expect(description).toContain("回旋水波纹剑气");
    expect(description).toContain(
      `造成 ${formatPercent(RETURNING_BLADE_WATER_RING_CONFIG.damageMultiplier)} 技能伤害`,
    );
    expect(description).toContain("不自动追踪全场");
  });

  it("explains the level-three vertical wave pillar chain", () => {
    const description = playerSkillDescription(
      SKILL_IDS.verticalWave,
      VERTICAL_WAVE_PILLAR_CONFIG.requiredLevel,
    );

    expect(description).toContain("原有浪柱照常升起");
    expect(description).toContain(formatPercent(VERTICAL_WAVE_PILLAR_CONFIG.chance));
    expect(description).toContain(`追加 ${VERTICAL_WAVE_PILLAR_CONFIG.count} 道`);
    expect(description).toContain("由近及远");
    expect(description).toContain("向下冲击");
    expect(description).toContain(
      `每道造成 ${formatPercent(VERTICAL_WAVE_PILLAR_CONFIG.damageMultiplier)} 技能伤害`,
    );
  });

  it("preloads and selects the separate downward pillar sheet", () => {
    const preloadedSources = playerSkillEffectSheets().map((sheet) => sheet.src);

    expect(preloadedSources.filter((src) => src === VERTICAL_WAVE_PILLAR_SHEET.src)).toHaveLength(1);
    expect(playerSkillEffectSheet(SKILL_IDS.verticalWave, "verticalWavePillar"))
      .toBe(VERTICAL_WAVE_PILLAR_SHEET);
    expect(playerSkillEffectSheet(SKILL_IDS.verticalWave, "verticalWave"))
      .not.toBe(VERTICAL_WAVE_PILLAR_SHEET);
    expect(VERTICAL_WAVE_PILLAR_SHEET).toMatchObject({
      frameW: VERTICAL_WAVE_PILLAR_FRAME_WIDTH,
      frameH: VERTICAL_WAVE_PILLAR_FRAME_HEIGHT,
      count: VERTICAL_WAVE_PILLAR_FRAME_COUNT,
    });
  });

  it("preloads and selects the separate returning blade water-ring sheet", () => {
    const preloadedSources = playerSkillEffectSheets().map((sheet) => sheet.src);

    expect(
      preloadedSources.filter((src) => src === RETURNING_BLADE_WATER_RING_SHEET.src),
    ).toHaveLength(1);
    expect(playerSkillEffectSheet(SKILL_IDS.returningBlade, "returningBladeWaterRing"))
      .toBe(RETURNING_BLADE_WATER_RING_SHEET);
    expect(playerSkillEffectSheet(SKILL_IDS.returningBlade, "returningBlade"))
      .not.toBe(RETURNING_BLADE_WATER_RING_SHEET);
    expect(RETURNING_BLADE_WATER_RING_SHEET).toMatchObject({
      frameW: RETURNING_BLADE_WATER_RING_FRAME_WIDTH,
      frameH: RETURNING_BLADE_WATER_RING_FRAME_HEIGHT,
      count: RETURNING_BLADE_WATER_RING_CONFIG.frameCount,
    });
  });

  it("preloads the close arc level three basic attack crescent sheet", () => {
    const preloadedSources = playerSkillEffectSheets().map((sheet) => sheet.src);

    expect(preloadedSources).toContain(CLOSE_ARC_BASIC_CRESCENT_SHEET.src);
    expect(CLOSE_ARC_BASIC_CRESCENT_SHEET.count).toBe(CLOSE_ARC_BASIC_CRESCENT_FRAME_COUNT);
    expect(CLOSE_ARC_BASIC_CRESCENT_CONFIG.frameDuration).toBe(CLOSE_ARC_BASIC_CRESCENT_FRAME_DURATION);
  });
});
