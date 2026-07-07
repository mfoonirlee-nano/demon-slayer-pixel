import { describe, expect, it } from "vitest";
import {
  CLOSE_ARC_EFFECT_CONFIG,
  GUARD_COUNTER_EFFECT_CONFIG,
  LINE_PROJECTILE_EFFECT_CONFIG,
  SKILL_IDS,
} from "../../constants";
import { updateGuardCounterEffect } from "../particle";
import { applyDebugInfiniteUltimateCharge } from "../../game/debug";
import { resetState, state } from "../../game/state";
import { playerSkillById } from "../../systems/skillCatalog";
import type { SkillId } from "../../types/assets";
import { tryJump, updatePlayer } from "../player";
import {
  castSelectedSkill,
  castUltimateSkill,
  playerSkillCastFrame,
  playerSkillCastFrames,
  playerSkillReleaseCastFrame,
  playerSkillReleaseFrame,
  triggerUltimateOpeningEffect,
  updateSkillCastRelease,
} from "./skillCasting";

const ULTIMATE_FREEZE_TEST_VELOCITY = 5;

function skillById(skillId: SkillId) {
  const skill = playerSkillById(skillId);
  if (!skill) throw new Error(`Missing skill ${skillId}`);
  return skill;
}

describe("player skill casting", () => {
  it("does not cast the ultimate before it is learned", () => {
    resetState();
    state.player.ultimateEnergy = state.player.ultimateEnergyMax;

    castUltimateSkill();

    expect(state.player.ultimateCastTimer).toBe(0);
    expect(state.player.ultimateEnergy).toBe(state.player.ultimateEnergyMax);
  });

  it("casts the ultimate once it is learned and fully charged", () => {
    resetState();
    state.player.ultimateLevel = 1;
    state.player.ultimateEnergy = state.player.ultimateEnergyMax;

    castUltimateSkill();

    expect(state.player.ultimateCastTimer).toBeGreaterThan(0);
    expect(state.player.ultimateEnergy).toBe(0);
  });

  it("keeps the player position frozen while the ultimate cast animation plays", () => {
    resetState();
    state.player.ultimateLevel = 1;
    state.player.ultimateEnergy = state.player.ultimateEnergyMax;
    state.player.vx = 4;
    state.player.vy = ULTIMATE_FREEZE_TEST_VELOCITY;
    const startX = state.player.x;
    const startY = state.player.y;

    castUltimateSkill();
    const castTimer = state.player.ultimateCastTimer;

    tryJump();
    expect(state.player.vy).toBe(ULTIMATE_FREEZE_TEST_VELOCITY);

    updatePlayer();

    expect(state.player.x).toBe(startX);
    expect(state.player.y).toBe(startY);
    expect(state.player.ultimateCastTimer).toBe(castTimer - 1);
  });

  it("lets debug ultimate charge make the ultimate castable", () => {
    resetState();

    applyDebugInfiniteUltimateCharge(state);
    castUltimateSkill();

    expect(state.player.ultimateLevel).toBe(1);
    expect(state.player.ultimateCastTimer).toBeGreaterThan(0);
    expect(state.player.ultimateEnergy).toBe(0);
  });

  it("keeps only one ultimate opening aura instance", () => {
    resetState();
    state.player.ultimateLevel = 3;

    triggerUltimateOpeningEffect();
    triggerUltimateOpeningEffect();

    expect(state.ultimateEffects).toHaveLength(1);
  });

  it("uses release frames that preserve each skill wind-up tier", () => {
    const releaseFrames: Record<SkillId, number> = {
      [SKILL_IDS.closeArc]: 8,
      [SKILL_IDS.dashReposition]: 6,
      [SKILL_IDS.lineProjectile]: 10,
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

  it("links line projectile release timing to the cast sprite frame", () => {
    resetState();
    state.player.skillEnergy = state.player.skillEnergyMax;
    state.player.skillIndex = 0;
    const lineProjectile = skillById(SKILL_IDS.lineProjectile);
    const releaseFrame = playerSkillReleaseFrame(lineProjectile);
    const castFrameAtRelease = playerSkillCastFrame(
      lineProjectile,
      playerSkillCastFrames(lineProjectile) - releaseFrame,
    );

    expect(playerSkillReleaseCastFrame(lineProjectile)).toBe(2);
    expect(castFrameAtRelease).toBe(2);

    castSelectedSkill();
    for (let frame = 1; frame < releaseFrame; frame += 1) {
      updateSkillCastRelease();
      expect(state.lineProjectileEffects).toHaveLength(0);
    }

    updateSkillCastRelease();
    expect(state.lineProjectileEffects).toHaveLength(1);
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
      drawScale: LINE_PROJECTILE_EFFECT_CONFIG.drawScale,
      effectLevel: 3,
      damageMultiplier: 1.35,
    });
    expect(state.lineProjectileEffects[0]).not.toHaveProperty("lengthScale");
    expect(state.lineProjectileEffects[0]).not.toHaveProperty("hitCooldown");

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
