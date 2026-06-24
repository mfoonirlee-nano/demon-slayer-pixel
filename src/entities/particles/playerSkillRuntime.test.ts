import { beforeEach, describe, expect, it } from "vitest";
import { SKILL_IDS, WIDTH } from "../../constants";
import { resetState, state } from "../../game/state";
import type { EnemyState } from "../../types/game-state";
import { spawnPlayerSkillEffect } from "./playerSkillSpawn";
import { updatePlayerSkillEffects } from "./playerSkillRuntime";

const PLAYER_TEST_X = 420;
const PLAYER_TEST_Y = 300;

function spawnReturningBlade(facing: 1 | -1 = 1) {
  state.player.x = PLAYER_TEST_X;
  state.player.y = PLAYER_TEST_Y;
  state.player.facing = facing;
  state.player.skillLevels[SKILL_IDS.returningBlade] = 1;

  expect(spawnPlayerSkillEffect(SKILL_IDS.returningBlade)).toBe(true);
  return state.playerSkillEffects[0];
}

describe("returning blade runtime", () => {
  beforeEach(() => {
    resetState();
  });

  it("travels beyond the facing screen edge before returning", () => {
    const effect = spawnReturningBlade(1);

    expect(effect.x + (effect.maxDistance ?? 0)).toBeGreaterThan(WIDTH);
  });

  it("does not return early just because the outbound hit cap is reached", () => {
    const effect = spawnReturningBlade(1);
    const hitCap = effect.maxHits ?? 0;
    effect.hitEnemies = Array.from({ length: hitCap }, () => ({}) as EnemyState);

    updatePlayerSkillEffects();

    expect(effect.phase).toBe("out");
  });

  it("returns after reaching the offscreen outbound distance", () => {
    const effect = spawnReturningBlade(1);
    effect.traveled = effect.maxDistance ?? 0;

    updatePlayerSkillEffects();

    expect(effect.phase).toBe("return");
  });
});
