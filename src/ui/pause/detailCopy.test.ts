import { describe, expect, it } from "vitest";
import { SKILL_IDS } from "../../constants";
import type { GameSnapshot } from "../../game/gameStore";
import { equipmentItemForTier } from "../../systems/equipmentCatalog";
import { playerSkillById, playerSkillDescription } from "../../systems/skillCatalog";
import type { EquipmentItemId, EquipmentTier } from "../../types/game-state";
import { equipmentDetailCopy, skillDetailCopy } from "./detailCopy";

const LEARNED_SKILL_LEVEL = 3;

function makePlayer(overrides: Partial<GameSnapshot["player"]> = {}): GameSnapshot["player"] {
  return {
    hp: 100,
    maxHp: 100,
    score: 0,
    runLevel: 1,
    runXp: 0,
    xpToNext: 85,
    baseAttack: 16,
    attackBonus: 0,
    totalAttack: 16,
    skillEnergy: 0,
    skillEnergyMax: 90,
    skillCharges: 0,
    maxSkillCharges: 3,
    skillIndex: 0,
    equippedSkillIds: [SKILL_IDS.lineProjectile, null, null],
    skillLevels: {
      [SKILL_IDS.lineProjectile]: LEARNED_SKILL_LEVEL,
    },
    ultimateEnergy: 0,
    ultimateEnergyMax: 100,
    ultimateLevel: 0,
    ultimateTimer: 0,
    ultimateDuration: 360,
    ultimateCastTimer: 0,
    ultimateCastDuration: 24,
    ultimateReady: false,
    ...overrides,
  };
}

function makeEquipment(itemId: EquipmentItemId, tier: EquipmentTier): GameSnapshot["equipment"] {
  const item = equipmentItemForTier(itemId, tier);
  return {
    inventory: [item],
    equipped: {
      blade: item.slot === "blade" ? item : null,
      garb: item.slot === "garb" ? item : null,
      talisman: item.slot === "talisman" ? item : null,
    },
  };
}

describe("pause equipment detail copy", () => {
  it.each([
    ["flow_blade", "common", "item", "攻击力 +2"],
    ["flow_garb", "fine", "slot", "最大生命 +20"],
    ["flow_talisman", "awakened", "item", "技能能量上限 +30"],
  ] as const)("shows the %s primary stat and keeps its unique effect", (itemId, tier, targetType, expectedStat) => {
    const equipment = makeEquipment(itemId, tier);
    const item = equipment.inventory[0];
    const target = targetType === "item"
      ? { type: "item" as const, itemId }
      : { type: "slot" as const, slot: item.slot };
    const detail = equipmentDetailCopy(
      target,
      equipment,
      new Set([itemId]),
    );

    expect(detail.body).toContain(`基础属性：${expectedStat}`);
    expect(detail.body).toContain(`专属机制：${item.summary}`);
  });
});

describe("pause skill detail copy", () => {
  it("shows the learned skill's current level effect", () => {
    const player = makePlayer();
    const detail = skillDetailCopy({ type: "slot", slotIndex: 0 }, player);

    expect(detail.body).toBe(playerSkillDescription(SKILL_IDS.lineProjectile, LEARNED_SKILL_LEVEL));
    expect(detail.body).not.toBe(playerSkillById(SKILL_IDS.lineProjectile)?.description);
  });

  it("shows the base positioning copy for locked skill list items", () => {
    const player = makePlayer({ skillLevels: {} });
    const detail = skillDetailCopy({ type: "item", skillId: SKILL_IDS.vortexControl }, player);

    expect(detail.body).toBe(playerSkillById(SKILL_IDS.vortexControl)?.description);
  });
});
