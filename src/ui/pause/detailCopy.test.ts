import { describe, expect, it } from "vitest";
import { SKILL_IDS } from "../../constants";
import type { GameSnapshot } from "../../game/gameStore";
import { playerSkillById, playerSkillDescription } from "../../systems/skillCatalog";
import { skillDetailCopy } from "./detailCopy";

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
