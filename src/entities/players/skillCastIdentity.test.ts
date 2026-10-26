import { beforeEach, describe, expect, it } from "vitest";
import { SKILL_IDS } from "../../constants";
import { resetState, state } from "../../game/state";
import { castingSkill, selectSkillSlot } from "../../systems/loadout";
import { castSelectedSkill, updateSkillCastRelease } from "./skillCasting";
import { spawnEnemyById } from "../enemy";
import { updatePlayerSkillEffects } from "../particles/playerSkillRuntime";

const VORTEX_TEST = { offset: 20, size: 30, velocity: 4, hp: 1000 } as const;

beforeEach(() => {
  resetState();
  state.player.skillEnergy = state.player.skillEnergyMax;
});

function finishCast() {
  while (state.player.skillTimer > 0) updateSkillCastRelease();
}

function vortexResponse(upgrade: "none" | "duringCast" | "afterRelease") {
  resetState();
  state.player.skillEnergy = state.player.skillEnergyMax;
  state.player.equippedSkillIds[0] = SKILL_IDS.vortexControl;
  state.player.skillLevels[SKILL_IDS.vortexControl] = 1;
  castSelectedSkill();
  if (upgrade === "duringCast") state.player.skillLevels[SKILL_IDS.vortexControl] = 3;
  finishCast();
  if (upgrade === "afterRelease") state.player.skillLevels[SKILL_IDS.vortexControl] = 3;
  const effect = state.playerSkillEffects[0];
  spawnEnemyById("chaser", "debug");
  const enemy = state.enemies[0];
  Object.assign(enemy, {
    x: effect.x + VORTEX_TEST.offset, y: effect.y - VORTEX_TEST.size,
    w: VORTEX_TEST.size, h: VORTEX_TEST.size,
    vx: VORTEX_TEST.velocity, hp: VORTEX_TEST.hp,
  });
  const startX = enemy.x;
  updatePlayerSkillEffects();
  return { delta: enemy.x - startX, velocity: enemy.vx, width: effect.w, life: effect.maxLife };
}

describe("skill identity across queued selections", () => {
  it.each(["duringCast", "afterRelease"] as const)("keeps vortex control strength after an upgrade %s", (upgrade) => {
    const baseline = vortexResponse("none");
    expect(baseline.delta).toBeLessThan(0);
    expect(baseline.velocity).toBeLessThan(VORTEX_TEST.velocity);
    expect(vortexResponse(upgrade)).toEqual(baseline);
  });
  it("keeps paid skill, level and animation when switching slots before release", () => {
    castSelectedSkill();
    const energyAfterCast = state.player.skillEnergy;
    const source = state.player.activeSkillCast;
    selectSkillSlot(state, 1);
    state.player.skillLevels[SKILL_IDS.lineProjectile] = 3;

    expect(castingSkill(state)?.id).toBe(SKILL_IDS.lineProjectile);
    finishCast();

    expect(state.lineProjectileEffects).toHaveLength(1);
    expect(state.closeArcEffects).toHaveLength(0);
    expect(state.lineProjectileEffects[0].effectLevel).toBe(1);
    expect(state.lineProjectileEffects[0].skillSource).toEqual(source);
    expect(state.player.skillEnergy).toBe(energyAfterCast);
    expect(state.player.activeSkillCast).toBeNull();
    expect(state.player.skillIndex).toBe(1);

    state.player.skillEnergy = state.player.skillEnergyMax;
    castSelectedSkill();
    finishCast();
    expect(state.closeArcEffects).toHaveLength(1);
    expect(state.closeArcEffects[0].skillSource?.castId).toBeGreaterThan(source!.castId);
  });

  it("locks generic skill level and source while the player changes loadout", () => {
    state.player.equippedSkillIds[0] = SKILL_IDS.returningBlade;
    state.player.skillLevels[SKILL_IDS.returningBlade] = 1;
    castSelectedSkill();
    const source = state.player.activeSkillCast;
    selectSkillSlot(state, 2);
    state.player.skillLevels[SKILL_IDS.returningBlade] = 3;
    finishCast();

    const blade = state.playerSkillEffects.find((effect) => effect.kind === "returningBlade");
    expect(blade?.returningBlade?.level).toBe(1);
    expect(blade?.skillSource).toEqual(source);
    expect(state.guardCounterEffect).toBeNull();
  });

  it("creates no cast provenance when insufficient energy rejects the input", () => {
    state.player.skillEnergy = 0;
    castSelectedSkill();
    expect(state.player.activeSkillCast).toBeNull();
    expect(state.player.offenseActionSequence).toBe(0);
  });
});
