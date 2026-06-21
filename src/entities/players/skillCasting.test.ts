import { describe, expect, it } from "vitest";
import {
  CLOSE_ARC_EFFECT_CONFIG,
  GUARD_COUNTER_EFFECT_CONFIG,
  LINE_PROJECTILE_EFFECT_CONFIG,
  SKILL_IDS,
} from "../../constants";
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
      maxHits: 3,
      activeFrames: GUARD_COUNTER_EFFECT_CONFIG.activeFrames,
      counterPadding: 0,
      damageMultiplier: 1,
    });
  });

  it("applies core skill growth to spawned effect state", () => {
    resetState();
    state.player.skillEnergy = state.player.skillEnergyMax;
    state.player.skillLevels[SKILL_IDS.lineProjectile] = 3;
    state.player.skillIndex = 0;
    const lineProjectile = skillById(SKILL_IDS.lineProjectile);

    castSelectedSkill();
    for (let frame = 0; frame < playerSkillReleaseFrame(lineProjectile); frame += 1) {
      updateSkillCastRelease();
    }

    expect(state.lineProjectileEffects[0]).toMatchObject({
      drawScale: 0.715,
      damageMultiplier: 1.35,
    });
    expect(state.lineProjectileEffects[0].drawScale).toBeGreaterThan(LINE_PROJECTILE_EFFECT_CONFIG.drawScale);

    resetState();
    state.player.skillEnergy = state.player.skillEnergyMax;
    state.player.skillLevels[SKILL_IDS.closeArc] = 2;
    state.player.skillIndex = 1;
    const closeArc = skillById(SKILL_IDS.closeArc);

    castSelectedSkill();
    for (let frame = 0; frame < playerSkillReleaseFrame(closeArc); frame += 1) {
      updateSkillCastRelease();
    }

    expect(state.closeArcEffects[0]).toMatchObject({
      drawScale: 0.705,
      maxTravel: 158,
      damageMultiplier: 1.18,
    });
    expect(state.closeArcEffects[0].maxTravel).toBeGreaterThan(CLOSE_ARC_EFFECT_CONFIG.maxTravel);

    resetState();
    state.player.skillEnergy = state.player.skillEnergyMax;
    state.player.skillLevels[SKILL_IDS.guardCounter] = 3;
    state.player.skillIndex = 2;
    const guardCounter = skillById(SKILL_IDS.guardCounter);

    castSelectedSkill();
    for (let frame = 0; frame < playerSkillReleaseFrame(guardCounter); frame += 1) {
      updateSkillCastRelease();
    }

    expect(state.guardCounterEffect).toMatchObject({
      hitsRemaining: 4,
      maxHits: 4,
      activeFrames: 84,
      counterPadding: 10,
      damageMultiplier: 1.35,
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
