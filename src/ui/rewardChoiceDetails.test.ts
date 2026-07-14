import { describe, expect, it } from "vitest";
import { SKILL_IDS } from "../constants";
import { EQUIPMENT_CHOICE_IDS, equipmentItemForTier } from "../systems/equipmentCatalog";
import { implementedPlayerSkillIds } from "../systems/skillCatalog";
import type {
  EquipmentChoiceReason,
  EquipmentChoiceState,
  EquipmentItemId,
  EquipmentTier,
  UpgradeChoiceState,
} from "../types/game-state";
import { equipmentRewardMetrics, upgradeRewardMetrics, type RewardChoiceMetric } from "./rewardChoiceDetails";

const BASE_PLAYER = {
  baseAttack: 16,
  attackBonus: 0,
};

function makeEquipmentChoice(
  itemId: EquipmentItemId,
  tier: EquipmentTier,
  previousTier: EquipmentTier | null = null,
  reason: EquipmentChoiceReason = "new",
): EquipmentChoiceState {
  return {
    ...equipmentItemForTier(itemId, tier),
    previousTier,
    reason,
  };
}

function metricValue(metrics: RewardChoiceMetric[], label: string) {
  return metrics.find((metric) => metric.label === label)?.value;
}

describe("reward choice details", () => {
  it.each([
    ["flow_blade", "common", null, "new", { label: "攻击力", value: "+12%" }],
    ["flow_garb", "fine", "common", "tierUpgrade", { label: "最大生命", value: "+10% -> +20%" }],
    [
      "flow_talisman",
      "awakened",
      "fine",
      "tierUpgrade",
      { label: "技能能量上限", value: "+22% -> +35%" },
    ],
  ] as const)(
    "shows the %s primary stat first for a %s reward",
    (itemId, tier, previousTier, reason, expectedMetric) => {
      const metrics = equipmentRewardMetrics(makeEquipmentChoice(itemId, tier, previousTier, reason));

      expect(metrics[0]).toMatchObject(expectedMetric);
    },
  );

  it("returns concrete numeric metrics for every equipment choice", () => {
    for (const itemId of EQUIPMENT_CHOICE_IDS) {
      const choice = makeEquipmentChoice(itemId, "awakened");
      const metrics = equipmentRewardMetrics(choice);

      expect(metrics.length, itemId).toBeGreaterThan(0);
      expect(metrics[0]?.label, itemId).toBe({
        blade: "攻击力",
        garb: "最大生命",
        talisman: "技能能量上限",
      }[choice.slot]);
      expect(metrics[0]?.value, itemId).toMatch(/^\+\d+%$/);
      expect(
        metrics.some((metric) => /\d|%|->/.test(metric.value)),
        itemId,
      ).toBe(true);
    }
  });

  it("returns damage metrics for every implemented skill unlock", () => {
    for (const skillId of implementedPlayerSkillIds()) {
      const choice: UpgradeChoiceState = {
        id: `unlock-${skillId}`,
        type: "unlockSkill",
        title: "习得新技能",
        name: skillId,
        description: "技能说明。",
        skillId,
        nextLevel: 1,
      };

      const metrics = upgradeRewardMetrics(choice, BASE_PLAYER);

      expect(
        metrics.some((metric) => metric.label === "命中伤害" || metric.label === "小怪伤害"),
        skillId,
      ).toBe(true);
    }
  });

  it("shows concrete equipment improvements when an owned item upgrades tiers", () => {
    const metrics = equipmentRewardMetrics(makeEquipmentChoice("flow_blade", "fine", "common", "tierUpgrade"));

    expect(metricValue(metrics, "蓄势命中")).toBe("4次 -> 3次");
    expect(metricValue(metrics, "技能伤害")).toBe("+25% -> +30%");
    expect(metricValue(metrics, "命中返能")).toBe("+6");
  });

  it("shows concrete equipment values when a new item changes a base resource cost", () => {
    const metrics = equipmentRewardMetrics(makeEquipmentChoice("tempo_talisman", "common"));

    expect(metricValue(metrics, "技能消耗")).toBe("30 -> 27");
    expect(metricValue(metrics, "终能获取")).toBe("-10%");
  });

  it("shows current attack-based damage for core skill upgrades", () => {
    const choice: UpgradeChoiceState = {
      id: "upgrade-line-projectile",
      type: "upgradeSkill",
      title: "技能精进",
      name: "潮龙·破阵 II",
      description: "潮龙伤害提高。",
      skillId: SKILL_IDS.lineProjectile,
      nextLevel: 2,
    };

    const metrics = upgradeRewardMetrics(choice, BASE_PLAYER);

    expect(metricValue(metrics, "命中伤害")).toBe("19 -> 23");
  });

  it("shows current attack-based enemy and boss damage for generic skill upgrades", () => {
    const choice: UpgradeChoiceState = {
      id: "upgrade-dash-reposition",
      type: "upgradeSkill",
      title: "技能精进",
      name: "流步·潮闪 II",
      description: "收刀斩范围和伤害提升。",
      skillId: SKILL_IDS.dashReposition,
      nextLevel: 2,
    };

    const metrics = upgradeRewardMetrics(choice, { baseAttack: 16, attackBonus: 4 });

    expect(metricValue(metrics, "小怪伤害")).toBe("24 -> 28");
    expect(metricValue(metrics, "Boss伤害")).toBe("18 -> 19");
    expect(metricValue(metrics, "距离")).toBe("92px -> 108px");
  });

  it("shows damage and duration changes for ultimate upgrades", () => {
    const choice: UpgradeChoiceState = {
      id: "upgrade-ultimate",
      type: "upgradeUltimate",
      title: "终式精进",
      name: "终式·月潮无间 II",
      description: "提高月潮强化效果。",
      nextLevel: 2,
    };

    const metrics = upgradeRewardMetrics(choice, BASE_PLAYER);

    expect(metricValue(metrics, "终式伤害")).toBe("+15% -> +25%");
    expect(metricValue(metrics, "持续时间")).toBe("6秒 -> 7.5秒");
  });
});
