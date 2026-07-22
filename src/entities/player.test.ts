import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CLOSE_ARC_BASIC_CRESCENT_CONFIG,
  GROUND_Y,
  PLAYER_ANIMATION_STATES,
  PLAYER_SHEETS,
  SKILL_IDS,
} from "../constants";
import { keys } from "../game/input";
import { resetState, state } from "../game/state";
import { spawnEnemyById } from "./enemy";
import { updateCloseArcBasicCrescentEffects } from "./particle";
import { attackBox, hurtPlayer, triggerAttack, updatePlayer } from "./player";

const TEST_ENEMY_HP = 100;
const TEST_ATTACK_BONUS = 4;
const OUTER_RANGE_GAP = 2;
const CLOSE_ARC_SLOT_INDEX = 1;
const CLOSE_ARC_BASIC_CRESCENT_ATTACK_FRAME_START = 3;
const CLOSE_ARC_BASIC_CRESCENT_ATTACK_FRAME_END = 5;
const LINE_PROJECTILE_LEVEL_THREE = 3;
const GUARD_COUNTER_LEVEL_THREE = 3;
const PASSIVE_INCOMING_DAMAGE = 40;
const LEVEL_ONE_PASSIVE_DAMAGE = 34;
const SUCCESSFUL_KNOCKBACK_ROLL = 0.09;
const KNOCKBACK_CHANCE_BOUNDARY = 0.1;

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

function fallAttackSplashParticles() {
  return state.particles.filter((particle) => particle.kind === "fallAttackSplash");
}

afterEach(() => {
  vi.restoreAllMocks();
});

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

describe("line projectile equipped passive", () => {
  beforeEach(() => {
    resetState();
    keys.clear();
    state.player.facing = 1;
    state.player.skillLevels[SKILL_IDS.lineProjectile] = LINE_PROJECTILE_LEVEL_THREE;
    state.player.skillIndex = CLOSE_ARC_SLOT_INDEX;
  });

  it.each([1, -1])(
    "lets another equipped skill stay active while a successful roll knocks an enemy away",
    (facing) => {
      state.player.facing = facing;
      const enemy = spawnRunnerAt(attackBox().x);
      const startingX = enemy.x;
      vi.spyOn(Math, "random").mockReturnValue(SUCCESSFUL_KNOCKBACK_ROLL);

      triggerAttack();
      updatePlayer();

      expect(state.player.equippedSkillIds[state.player.skillIndex]).toBe(SKILL_IDS.closeArc);
      expect(enemy.x).toBe(startingX + facing * enemy.w * 2);
    },
  );

  it.each([
    {
      scenario: "the roll equals ten percent",
      level: LINE_PROJECTILE_LEVEL_THREE,
      equipped: true,
      roll: KNOCKBACK_CHANCE_BOUNDARY,
    },
    { scenario: "line projectile is below level three", level: 2, equipped: true, roll: 0 },
    {
      scenario: "line projectile is not equipped",
      level: LINE_PROJECTILE_LEVEL_THREE,
      equipped: false,
      roll: 0,
    },
  ] as const)("does not knock an enemy back when $scenario", ({ level, equipped, roll }) => {
    state.player.skillLevels[SKILL_IDS.lineProjectile] = level;
    if (!equipped) state.player.equippedSkillIds[0] = null;
    const enemy = spawnRunnerAt(attackBox().x);
    const startingX = enemy.x;
    vi.spyOn(Math, "random").mockReturnValue(roll);

    triggerAttack();
    updatePlayer();

    expect(enemy.x).toBe(startingX);
  });
});

describe("guard counter equipped passive", () => {
  beforeEach(() => {
    resetState();
  });

  it("reduces incoming damage by fifteen percent at player level one", () => {
    state.player.skillLevels[SKILL_IDS.guardCounter] = GUARD_COUNTER_LEVEL_THREE;
    const hpBefore = state.player.hp;

    hurtPlayer(PASSIVE_INCOMING_DAMAGE, 1);

    expect(hpBefore - state.player.hp).toBeCloseTo(LEVEL_ONE_PASSIVE_DAMAGE);
  });

  it.each([
    { playerLevel: 7, expectedDamage: 31 },
    { playerLevel: 13, expectedDamage: 28 },
    { playerLevel: 20, expectedDamage: 28 },
  ])(
    "scales damage reduction through level thirteen and caps afterward at level $playerLevel",
    ({ playerLevel, expectedDamage }) => {
      state.player.skillLevels[SKILL_IDS.guardCounter] = GUARD_COUNTER_LEVEL_THREE;
      state.player.runLevel = playerLevel;
      const hpBefore = state.player.hp;

      hurtPlayer(PASSIVE_INCOMING_DAMAGE, 1);

      expect(hpBefore - state.player.hp).toBeCloseTo(expectedDamage);
    },
  );

  it.each([
    { scenario: "the skill is below level three", skillLevel: 2, equipped: true },
    { scenario: "the skill is not equipped", skillLevel: GUARD_COUNTER_LEVEL_THREE, equipped: false },
  ] as const)("does not reduce damage when $scenario", ({ skillLevel, equipped }) => {
    state.player.skillLevels[SKILL_IDS.guardCounter] = skillLevel;
    if (!equipped) state.player.equippedSkillIds[2] = null;
    const hpBefore = state.player.hp;

    hurtPlayer(PASSIVE_INCOMING_DAMAGE, 1);

    expect(hpBefore - state.player.hp).toBeCloseTo(PASSIVE_INCOMING_DAMAGE);
  });
});

describe("player action animation state", () => {
  beforeEach(() => {
    resetState();
    keys.clear();
  });

  it("locks a moving attack variant and resets the run cycle for its exit", () => {
    keys.add("d");
    updatePlayer();
    expect(state.player.runStepDistance).toBeGreaterThan(0);

    triggerAttack();
    expect(state.player.attackFromRun).toBe(true);

    updatePlayer();
    expect(state.player.runStepDistance).toBe(0);
  });
});

describe("fall attack landing feedback", () => {
  beforeEach(() => {
    resetState();
    keys.clear();
  });

  it("does not emit a water splash for a normal landing", () => {
    state.player.y = GROUND_Y - state.player.h - 1;
    state.player.vy = 1;

    updatePlayer();

    expect(fallAttackSplashParticles()).toHaveLength(0);
  });

  it("emits one aligned water splash when a fall attack lands", () => {
    state.player.x = 240;
    state.player.y = GROUND_Y - state.player.h - 1;
    const expectedX = state.player.x + state.player.w / 2;
    keys.add("s");

    triggerAttack();
    updatePlayer();

    const splashParticles = fallAttackSplashParticles();
    expect(splashParticles.length).toBeGreaterThan(0);
    expect(splashParticles.every(({ x, y }) => x === expectedX && y === GROUND_Y)).toBe(true);
    expect(splashParticles.some(({ vx }) => vx < 0)).toBe(true);
    expect(splashParticles.some(({ vx }) => vx > 0)).toBe(true);
    expect(splashParticles.every(({ vy }) => vy < 0)).toBe(true);
    expect(splashParticles.every(({ gravity }) => (gravity ?? 0) > 0)).toBe(true);

    updatePlayer();
    expect(fallAttackSplashParticles()).toHaveLength(splashParticles.length);
  });
});
