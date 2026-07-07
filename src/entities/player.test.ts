import { beforeEach, describe, expect, it } from "vitest";
import { CLOSE_ARC_BASIC_CRESCENT_CONFIG, GROUND_Y, SKILL_IDS } from "../constants";
import { resetState, state } from "../game/state";
import { spawnEnemyById } from "./enemy";
import { updateCloseArcBasicCrescentEffects } from "./particle";
import { attackBox, triggerAttack, updatePlayer } from "./player";

const TEST_ENEMY_HP = 100;
const TEST_ATTACK_BONUS = 4;
const OUTER_RANGE_GAP = 2;

function spawnRunnerAt(x: number) {
  expect(spawnEnemyById("runner", "debug", "left")).toBe(true);
  const enemy = state.enemies[0];
  enemy.x = x;
  enemy.y = GROUND_Y - enemy.h;
  enemy.hp = TEST_ENEMY_HP;
  enemy.hitCd = 0;
  return enemy;
}

describe("close arc basic attack crescent", () => {
  beforeEach(() => {
    resetState();
    state.player.facing = 1;
    state.player.attackBonus = TEST_ATTACK_BONUS;
  });

  it("spawns only after close arc reaches level three", () => {
    state.player.skillLevels[SKILL_IDS.closeArc] = 2;

    triggerAttack();

    expect(state.closeArcBasicCrescents).toHaveLength(0);

    resetState();
    state.player.skillLevels[SKILL_IDS.closeArc] = 3;

    triggerAttack();

    expect(state.closeArcBasicCrescents).toHaveLength(1);
  });

  it("extends the basic attack tip and deals half of current attack damage", () => {
    state.player.skillLevels[SKILL_IDS.closeArc] = 3;
    const baseBox = attackBox();
    const enemy = spawnRunnerAt(baseBox.x + baseBox.w + OUTER_RANGE_GAP);
    const expectedDamage = attackBox().damage * CLOSE_ARC_BASIC_CRESCENT_CONFIG.damageMultiplier;

    triggerAttack();
    updatePlayer();
    updateCloseArcBasicCrescentEffects();

    expect(state.closeArcBasicCrescents[0].w).toBeCloseTo(
      state.player.h * CLOSE_ARC_BASIC_CRESCENT_CONFIG.rangeExtensionPlayerRatio,
    );
    expect(enemy.hp).toBeCloseTo(TEST_ENEMY_HP - expectedDamage);
  });

  it("does not double hit a target already struck by the base basic attack", () => {
    state.player.skillLevels[SKILL_IDS.closeArc] = 3;
    const baseBox = attackBox();
    const enemy = spawnRunnerAt(baseBox.x);
    enemy.x = baseBox.x + baseBox.w - enemy.w / 2;
    const expectedDamage = attackBox().damage;

    triggerAttack();
    updatePlayer();
    updateCloseArcBasicCrescentEffects();

    expect(enemy.hp).toBeCloseTo(TEST_ENEMY_HP - expectedDamage);
  });
});
