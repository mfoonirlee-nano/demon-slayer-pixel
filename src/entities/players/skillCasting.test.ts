import { describe, expect, it } from "vitest";
import { GUARD_COUNTER_EFFECT_CONFIG, SKILL_IDS } from "../../constants";
import { updateGuardCounterEffect } from "../particle";
import { resetState, state } from "../../game/state";
import { playerSkillById } from "../../systems/skillCatalog";
import type { SkillId } from "../../types/assets";
import {
  castSelectedSkill,
  playerSkillCastFrames,
  playerSkillReleaseFrame,
  updateSkillCastRelease,
} from "./skillCasting";

function skillById(skillId: SkillId) {
  const skill = playerSkillById(skillId);
  if (!skill) throw new Error(`Missing skill ${skillId}`);
  return skill;
}

describe("player skill casting", () => {
  it("uses release frames that preserve each skill wind-up tier", () => {
    const releaseFrames: Record<SkillId, number> = {
      [SKILL_IDS.closeArc]: 8,
      [SKILL_IDS.dashReposition]: 6,
      [SKILL_IDS.lineProjectile]: 12,
      [SKILL_IDS.guardCounter]: 11,
      [SKILL_IDS.verticalWave]: 12,
      [SKILL_IDS.vortexControl]: 18,
      [SKILL_IDS.armorBreak]: 18,
      [SKILL_IDS.returningBlade]: 18,
      [SKILL_IDS.antiAirMulti]: 24,
    };

    for (const [skillId, releaseFrame] of Object.entries(releaseFrames) as Array<[SkillId, number]>) {
      const skill = skillById(skillId);

      expect(playerSkillReleaseFrame(skill)).toBe(releaseFrame);
      expect(playerSkillReleaseFrame(skill)).toBeLessThanOrEqual(playerSkillCastFrames(skill));
    }
  });

  it("does not activate guard counter before its release frame", () => {
    resetState();
    state.player.skillEnergy = state.player.skillEnergyMax;
    state.player.skillIndex = 2;
    const guardCounter = skillById(SKILL_IDS.guardCounter);
    const releaseFrame = playerSkillReleaseFrame(guardCounter);

    castSelectedSkill();

    expect(state.guardCounterEffect).toBeNull();
    for (let frame = 1; frame < releaseFrame; frame += 1) {
      updateSkillCastRelease();
      expect(state.guardCounterEffect).toBeNull();
    }

    updateSkillCastRelease();
    expect(state.guardCounterEffect).toMatchObject({
      hitsRemaining: 3,
      damageMultiplier: 1,
    });
  });

  it("expires guard counter if no hit consumes the limited counter window", () => {
    resetState();
    state.player.skillEnergy = state.player.skillEnergyMax;
    state.player.skillIndex = 2;
    const guardCounter = skillById(SKILL_IDS.guardCounter);

    castSelectedSkill();
    for (let frame = 0; frame < playerSkillReleaseFrame(guardCounter); frame += 1) {
      updateSkillCastRelease();
    }
    expect(state.guardCounterEffect).not.toBeNull();

    for (let frame = 0; frame < GUARD_COUNTER_EFFECT_CONFIG.activeFrames; frame += 1) {
      updateGuardCounterEffect();
    }

    expect(state.guardCounterEffect).toBeNull();
  });
});
