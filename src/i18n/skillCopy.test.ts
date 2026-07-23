import { describe, expect, it } from "vitest";
import {
  RETURNING_BLADE_WATER_RING_CONFIG,
  SKILLS,
  SKILL_IDS,
  VERTICAL_WAVE_PILLAR_CONFIG,
  VORTEX_CONTROL_DOUBLE_JUMP_CONFIG,
} from "../constants";
import { formatPercent } from "../utils";
import { skillCopy, skillDescription, skillName } from "./skillCopy";

const LEVEL_TWO = 2;
const LEVEL_THREE = 3;

describe("localized skill copy", () => {
  it("returns the canonical Chinese copy through the public interface", () => {
    expect(skillCopy("zh-CN", SKILL_IDS.lineProjectile)).toEqual({
      name: "潮龙·破阵",
      description: "直线远程技能。向前打出潮龙，适合穿透成排敌人或安全消耗首领。",
      levelDescriptions: {
        1: "向前释放潮龙，造成窄长直线伤害，适合点杀和穿排。",
        2: "潮龙伤害 +18%，潮龙身形变长，贴住目标时更容易追加命中。",
        3: "潮龙伤害 +35%，命中普通敌人时击退两个身位；装备后，其他攻击命中有 10% 概率触发相同击退，首领免疫。",
      },
    });
  });

  it("preserves the current Chinese copy for every skill", () => {
    const localizedCopy = SKILLS.map((skill) => skillCopy("zh-CN", skill.id));
    const canonicalCopy = SKILLS.map(({ name, description, levelDescriptions }) => ({
      name,
      description,
      levelDescriptions,
    }));

    expect(localizedCopy).toEqual(canonicalCopy);
  });

  it("provides concise English copy for a skill and each of its levels", () => {
    expect(skillCopy("en", SKILL_IDS.lineProjectile)).toEqual({
      name: "Tidal Dragon: Breakthrough",
      description: "A ranged line attack. Launch a tidal dragon straight ahead to pierce enemy ranks or pressure bosses from safety.",
      levelDescriptions: {
        1: "Launch a tidal dragon forward in a long, narrow line, ideal for focused attacks and piercing groups.",
        2: "Tidal dragon damage +18%. Its longer body makes follow-up hits easier at close range.",
        3: "Tidal dragon damage +35%. Knocks normal enemies back two body lengths; while equipped, other attacks have a 10% chance to trigger the same knockback. Bosses are immune.",
      },
    });
  });

  it("covers every skill and all three levels in English without Han characters", () => {
    const englishCopy = SKILLS.map((skill) => skillCopy("en", skill.id));

    for (const copy of englishCopy) {
      const exposedCopy = [
        copy.name,
        copy.description,
        copy.levelDescriptions[1],
        copy.levelDescriptions[2],
        copy.levelDescriptions[3],
      ];

      expect(exposedCopy.every((value) => value.trim().length > 0)).toBe(true);
      expect(exposedCopy.join("\n")).not.toMatch(/\p{Script=Han}/u);
    }
  });

  it("formats localized skill names with an optional level", () => {
    expect(skillName("en", SKILL_IDS.closeArc)).toBe("Crescent Tideblade");
    expect(skillName("en", SKILL_IDS.closeArc, LEVEL_TWO)).toBe("Crescent Tideblade II");
    expect(skillName("zh-CN", SKILL_IDS.closeArc, LEVEL_THREE)).toBe("弦月·潮刃 III");
  });

  it("returns the localized description for the requested level", () => {
    expect(skillDescription("en", SKILL_IDS.closeArc, LEVEL_THREE)).toBe(
      "Tideblade damage +35%. Reaches full size and adds a brief crescent slash to basic attacks.",
    );
    expect(skillDescription("zh-CN", SKILL_IDS.closeArc, LEVEL_TWO)).toBe(
      "潮刃伤害 +18%，月牙身形变大，飞得更远。",
    );
  });

  it("localizes the level-three armor break shield penetration passive", () => {
    const description = skillDescription("en", SKILL_IDS.armorBreak, LEVEL_THREE);

    expect(description).toContain("50%");
    expect(description).toContain("equipped");
    expect(description).toContain("shield");
  });

  it("localizes the level-three dash reposition movement speed passive", () => {
    const description = skillDescription("en", SKILL_IDS.dashReposition, LEVEL_THREE);

    expect(description).toContain("15%");
    expect(description).toContain("equipped");
    expect(description).toContain("movement speed");
  });

  it("localizes the level-three vortex control double jump passive", () => {
    const description = skillDescription(
      "en",
      SKILL_IDS.vortexControl,
      VORTEX_CONTROL_DOUBLE_JUMP_CONFIG.requiredLevel,
    );

    expect(description).toContain("equipped");
    expect(description).toContain(
      `${VORTEX_CONTROL_DOUBLE_JUMP_CONFIG.extraAirJumps} extra midair jump`,
    );
    expect(description).toContain("refreshes on landing");
    expect(description).toContain("jump over a boss's head");
    expect(description).toContain("still cannot pull bosses");
  });

  it("localizes the level-three returning blade water-ring slash", () => {
    const description = skillDescription(
      "en",
      SKILL_IDS.returningBlade,
      RETURNING_BLADE_WATER_RING_CONFIG.requiredLevel,
    );

    expect(description).toContain("original tideblade still travels out and returns");
    expect(description).toContain(formatPercent(RETURNING_BLADE_WATER_RING_CONFIG.chance));
    expect(description).toContain("one spinning water-ring slash");
    expect(description).toContain(
      `${formatPercent(RETURNING_BLADE_WATER_RING_CONFIG.damageMultiplier)} skill damage`,
    );
    expect(description).toContain("does not track targets across the arena");
  });

  it("localizes the level-three vertical wave pillar chain", () => {
    const description = skillDescription(
      "en",
      SKILL_IDS.verticalWave,
      VERTICAL_WAVE_PILLAR_CONFIG.requiredLevel,
    );

    expect(description).toContain("original wave pillar still rises");
    expect(description).toContain(formatPercent(VERTICAL_WAVE_PILLAR_CONFIG.chance));
    expect(description).toContain(`${VERTICAL_WAVE_PILLAR_CONFIG.count} additional water pillars`);
    expect(description).toContain("near to far");
    expect(description).toContain("crash downward");
    expect(description).toContain(
      `${formatPercent(VERTICAL_WAVE_PILLAR_CONFIG.damageMultiplier)} skill damage each`,
    );
  });
});
