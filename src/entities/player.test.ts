import { beforeEach, describe, expect, it } from "vitest";
import {
  CLOSE_ARC_BASIC_CRESCENT_CONFIG,
  GROUND_Y,
  PLAYER_ANIMATION_STATES,
  PLAYER_SHEETS,
  SKILL_IDS,
} from "../constants";
import { resetState, state } from "../game/state";
import { spawnEnemyById } from "./enemy";
import { updateCloseArcBasicCrescentEffects } from "./particle";
import { attackBox, triggerAttack, updatePlayer } from "./player";

const TEST_ENEMY_HP = 100;
const TEST_ATTACK_BONUS = 4;
const OUTER_RANGE_GAP = 2;
const CLOSE_ARC_SLOT_INDEX = 1;
const CLOSE_ARC_BASIC_CRESCENT_ATTACK_FRAME_START = 3;
const CLOSE_ARC_BASIC_CRESCENT_ATTACK_FRAME_END = 5;

function spawnRunnerAt(x: number) {
  expect(spawnEnemyById("runner", "debug", "left")).toBe(true);
  const enemy = state.enemies[0];
  enemy.x = x;
  enemy.y = GROUND_Y - enemy.h;
  enemy.hp = TEST_ENEMY_HP;
  enemy.hitCd = 0;
  return enemy;
}

function selectCloseArc() {
  state.player.skillIndex = CLOSE_ARC_SLOT_INDEX;
}

function attackFrameStartElapsed(frameIndex: number) {
  const attackFrameCount = PLAYER_SHEETS[PLAYER_ANIMATION_STATES.attack].count;
  const duration = Math.max(1, state.player.attackDuration);
  return Math.max(1, Math.ceil(frameIndex * duration / attackFrameCount));
}

function updatePlayerFrames(frames: number) {
  for (let frame = 0; frame < frames; frame += 1) updatePlayer();
}

function advanceAttackToBasicCrescentFrame() {
  updatePlayerFrames(attackFrameStartElapsed(CLOSE_ARC_BASIC_CRESCENT_ATTACK_FRAME_START));
}

function advanceThroughAttack() {
  while (state.player.attackTimer > 0) updatePlayer();
}

describe("close arc basic attack crescent", () => {
  beforeEach(() => {
    resetState();
    state.player.facing = 1;
    state.player.attackBonus = TEST_ATTACK_BONUS;
  });

  it("does not spawn before close arc reaches level three", () => {
    selectCloseArc();
    state.player.skillLevels[SKILL_IDS.closeArc] = 2;

    triggerAttack();
    advanceThroughAttack();

    expect(state.closeArcBasicCrescents).toHaveLength(0);
  });

  it("requires close arc to be the current active skill", () => {
    state.player.skillLevels[SKILL_IDS.closeArc] = 3;

    triggerAttack();
    advanceThroughAttack();

    expect(state.closeArcBasicCrescents).toHaveLength(0);
  });

  it("spawns on the fourth attack sprite frame and covers the fifth", () => {
    selectCloseArc();
    state.player.skillLevels[SKILL_IDS.closeArc] = 3;

    triggerAttack();
    const startElapsed = attackFrameStartElapsed(CLOSE_ARC_BASIC_CRESCENT_ATTACK_FRAME_START);
    const endElapsed = attackFrameStartElapsed(CLOSE_ARC_BASIC_CRESCENT_ATTACK_FRAME_END);

    updatePlayerFrames(startElapsed - 1);

    expect(state.closeArcBasicCrescents).toHaveLength(0);

    updatePlayer();

    expect(state.closeArcBasicCrescents).toHaveLength(1);
    expect(state.closeArcBasicCrescents[0].maxLife).toBe(endElapsed - startElapsed + 1);

    updatePlayerFrames(endElapsed - startElapsed - 1);

    expect(state.closeArcBasicCrescents).toHaveLength(1);
  });

  it("extends the basic attack tip and deals half of current attack damage", () => {
    selectCloseArc();
    state.player.skillLevels[SKILL_IDS.closeArc] = 3;
    const baseBox = attackBox();
    const enemy = spawnRunnerAt(baseBox.x + baseBox.w + OUTER_RANGE_GAP);
    const expectedDamage = attackBox().damage * CLOSE_ARC_BASIC_CRESCENT_CONFIG.damageMultiplier;

    triggerAttack();
    advanceAttackToBasicCrescentFrame();
    updateCloseArcBasicCrescentEffects();

    expect(state.closeArcBasicCrescents[0].w).toBeCloseTo(
      state.player.h * CLOSE_ARC_BASIC_CRESCENT_CONFIG.rangeExtensionPlayerRatio,
    );
    expect(enemy.hp).toBeCloseTo(TEST_ENEMY_HP - expectedDamage);
  });

  it("does not double hit a target already struck by the base basic attack", () => {
    selectCloseArc();
    state.player.skillLevels[SKILL_IDS.closeArc] = 3;
    const baseBox = attackBox();
    const enemy = spawnRunnerAt(baseBox.x);
    enemy.x = baseBox.x + baseBox.w - enemy.w / 2;
    const expectedDamage = attackBox().damage;

    triggerAttack();
    advanceAttackToBasicCrescentFrame();
    updateCloseArcBasicCrescentEffects();

    expect(enemy.hp).toBeCloseTo(TEST_ENEMY_HP - expectedDamage);
  });
});
