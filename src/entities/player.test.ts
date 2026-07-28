import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BOSS_CONFIG,
  CLOSE_ARC_BASIC_CRESCENT_CONFIG,
  GROUND_Y,
  PLAYER_ANIMATION_STATES,
  PLAYER_SHEETS,
  SKILL_IDS,
} from "../constants";
import { keys } from "../game/input";
import { resetState, state } from "../game/state";
import { equipmentMoveSpeedMultiplier } from "../systems/equipment";
import { spawnEnemyById } from "./enemy";
import { updateCloseArcBasicCrescentEffects } from "./particle";
import {
  attackBox,
  castSelectedSkill,
  hurtPlayer,
  triggerAttack,
  tryJump,
  updatePlayer,
} from "./player";

const TEST_ENEMY_HP = 100;
const TEST_ATTACK_BONUS = 4;
const OUTER_RANGE_GAP = 2;
const CLOSE_ARC_SLOT_INDEX = 1;
const CLOSE_ARC_BASIC_CRESCENT_ATTACK_FRAME_START = 3;
const CLOSE_ARC_BASIC_CRESCENT_ATTACK_FRAME_END = 5;
const LINE_PROJECTILE_LEVEL_THREE = 3;
const GUARD_COUNTER_LEVEL_THREE = 3;
const DASH_REPOSITION_LEVEL_THREE = 3;
const DASH_REPOSITION_LEVEL_BEFORE_PASSIVE = 2;
const DASH_REPOSITION_PASSIVE_SLOT_INDEX = 2;
const DASH_REPOSITION_MOVE_SPEED_MULTIPLIER = 1.15;
const DASH_REPOSITION_LEVEL_THREE_DISTANCE = 124;
const MOON_TIDE_LEVEL_THREE_MOVE_SPEED_MULTIPLIER = 1.25;
const VORTEX_CONTROL_LEVEL_THREE = 3;
const VORTEX_CONTROL_LEVEL_BEFORE_PASSIVE = 2;
const VORTEX_CONTROL_PASSIVE_SLOT_INDEX = 2;
const VORTEX_CONTROL_TEST_AIR_HEIGHT = 100;
const VORTEX_CONTROL_TEST_FALL_VELOCITY = 3;
const VORTEX_CONTROL_TEST_PLATFORM_MARGIN_X = 20;
const VORTEX_CONTROL_TEST_PLATFORM_Y_OFFSET = 140;
const VORTEX_CONTROL_BOSS_CLEARANCE_FRAMES = 120;
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

function enableVortexControlDoubleJump(skillSlot = VORTEX_CONTROL_PASSIVE_SLOT_INDEX) {
  state.player.skillLevels[SKILL_IDS.vortexControl] = VORTEX_CONTROL_LEVEL_THREE;
  state.player.equippedSkillIds[skillSlot] = SKILL_IDS.vortexControl;
}

function placePlayerInAir(surfaceY = GROUND_Y) {
  state.player.y = surfaceY - state.player.h - VORTEX_CONTROL_TEST_AIR_HEIGHT;
  state.player.vy = VORTEX_CONTROL_TEST_FALL_VELOCITY;
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
    { playerLevel: 13, expectedDamage: 31 },
    { playerLevel: 25, expectedDamage: 28 },
    { playerLevel: 40, expectedDamage: 28 },
  ])(
    "scales damage reduction through level twenty-five and caps afterward at level $playerLevel",
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

describe("dash reposition level-three movement passive", () => {
  beforeEach(() => {
    resetState();
    keys.clear();
    keys.add("d");
  });

  it.each([0, 1, 2] as const)(
    "increases movement speed while equipped in non-selected slot %i",
    (skillSlot) => {
      state.player.skillLevels[SKILL_IDS.dashReposition] = DASH_REPOSITION_LEVEL_THREE;
      state.player.equippedSkillIds[skillSlot] = SKILL_IDS.dashReposition;
      state.player.skillIndex = (skillSlot + 1) % state.player.equippedSkillIds.length;
      const startX = state.player.x;

      updatePlayer();

      expect(state.player.x - startX)
        .toBeCloseTo(state.player.speed * DASH_REPOSITION_MOVE_SPEED_MULTIPLIER);
    },
  );

  it.each([
    {
      scenario: "the skill is below level three",
      skillLevel: DASH_REPOSITION_LEVEL_BEFORE_PASSIVE,
      equipped: true,
    },
    {
      scenario: "the skill is not equipped",
      skillLevel: DASH_REPOSITION_LEVEL_THREE,
      equipped: false,
    },
  ] as const)("does not increase movement speed when $scenario", ({ skillLevel, equipped }) => {
    state.player.skillLevels[SKILL_IDS.dashReposition] = skillLevel;
    if (equipped) {
      state.player.equippedSkillIds[DASH_REPOSITION_PASSIVE_SLOT_INDEX] = SKILL_IDS.dashReposition;
    }
    const startX = state.player.x;

    updatePlayer();

    expect(state.player.x - startX).toBeCloseTo(state.player.speed);
  });

  it("also increases leftward movement speed", () => {
    state.player.skillLevels[SKILL_IDS.dashReposition] = DASH_REPOSITION_LEVEL_THREE;
    state.player.equippedSkillIds[DASH_REPOSITION_PASSIVE_SLOT_INDEX] = SKILL_IDS.dashReposition;
    keys.clear();
    keys.add("a");
    const startX = state.player.x;

    updatePlayer();

    expect(state.player.x - startX)
      .toBeCloseTo(-state.player.speed * DASH_REPOSITION_MOVE_SPEED_MULTIPLIER);
  });

  it("stacks multiplicatively with the moon tide movement bonus", () => {
    state.player.skillLevels[SKILL_IDS.dashReposition] = DASH_REPOSITION_LEVEL_THREE;
    state.player.equippedSkillIds[DASH_REPOSITION_PASSIVE_SLOT_INDEX] = SKILL_IDS.dashReposition;
    state.player.ultimateLevel = 3;
    state.player.ultimateTimer = 30;
    const startX = state.player.x;

    updatePlayer();

    expect(state.player.x - startX).toBeCloseTo(
      state.player.speed
        * DASH_REPOSITION_MOVE_SPEED_MULTIPLIER
        * MOON_TIDE_LEVEL_THREE_MOVE_SPEED_MULTIPLIER,
    );
  });

  it("stacks multiplicatively with equipment movement bonuses", () => {
    state.player.skillLevels[SKILL_IDS.dashReposition] = DASH_REPOSITION_LEVEL_THREE;
    state.player.equippedSkillIds[DASH_REPOSITION_PASSIVE_SLOT_INDEX] = SKILL_IDS.dashReposition;
    state.equipmentInventory.push({ id: "flow_garb", tier: "common" });
    state.equippedEquipment.garb = "flow_garb";
    state.player.flowGarbTimer = 30;
    const equipmentMultiplier = equipmentMoveSpeedMultiplier(state);
    const startX = state.player.x;

    updatePlayer();

    expect(state.player.x - startX).toBeCloseTo(
      state.player.speed * DASH_REPOSITION_MOVE_SPEED_MULTIPLIER * equipmentMultiplier,
    );
  });

  it("does not change the level-three dash travel distance", () => {
    state.player.skillLevels[SKILL_IDS.dashReposition] = DASH_REPOSITION_LEVEL_THREE;
    state.player.equippedSkillIds[DASH_REPOSITION_PASSIVE_SLOT_INDEX] = SKILL_IDS.dashReposition;
    state.player.skillIndex = DASH_REPOSITION_PASSIVE_SLOT_INDEX;
    state.player.skillEnergy = state.player.skillEnergyMax;
    keys.clear();
    const startX = state.player.x;

    castSelectedSkill();
    while (!state.player.dashReposition && state.player.skillTimer > 0) updatePlayer();

    expect(state.player.dashReposition).toMatchObject({
      startX,
      targetX: startX + DASH_REPOSITION_LEVEL_THREE_DISTANCE,
    });

    while (state.player.dashReposition) updatePlayer();

    expect(state.player.x - startX).toBeCloseTo(DASH_REPOSITION_LEVEL_THREE_DISTANCE);
  });
});

describe("vortex control level-three double jump passive", () => {
  beforeEach(() => {
    resetState();
    keys.clear();
  });

  it.each([0, 1, 2] as const)(
    "grants one air jump while equipped in non-selected slot %i",
    (skillSlot) => {
      enableVortexControlDoubleJump(skillSlot);
      state.player.skillIndex = (skillSlot + 1) % state.player.equippedSkillIds.length;
      placePlayerInAir();

      tryJump();

      expect(state.player.vy).toBe(-state.player.jump);

      state.player.vy = VORTEX_CONTROL_TEST_FALL_VELOCITY;
      tryJump();

      expect(state.player.vy).toBe(VORTEX_CONTROL_TEST_FALL_VELOCITY);
    },
  );

  it.each([
    {
      scenario: "the skill is below level three",
      skillLevel: VORTEX_CONTROL_LEVEL_BEFORE_PASSIVE,
      equipped: true,
    },
    {
      scenario: "the skill is not equipped",
      skillLevel: VORTEX_CONTROL_LEVEL_THREE,
      equipped: false,
    },
  ] as const)("does not grant an air jump when $scenario", ({ skillLevel, equipped }) => {
    state.player.skillLevels[SKILL_IDS.vortexControl] = skillLevel;
    if (equipped) {
      state.player.equippedSkillIds[VORTEX_CONTROL_PASSIVE_SLOT_INDEX] = SKILL_IDS.vortexControl;
    }
    placePlayerInAir();

    tryJump();

    expect(state.player.vy).toBe(VORTEX_CONTROL_TEST_FALL_VELOCITY);
  });

  it("restores the air jump after landing", () => {
    enableVortexControlDoubleJump();
    placePlayerInAir();

    tryJump();
    state.player.y = GROUND_Y - state.player.h - 1;
    state.player.vy = VORTEX_CONTROL_TEST_FALL_VELOCITY;
    updatePlayer();
    tryJump();
    updatePlayer();
    state.player.vy = VORTEX_CONTROL_TEST_FALL_VELOCITY;
    tryJump();

    expect(state.player.vy).toBe(-state.player.jump);
  });

  it("restores the air jump after landing on a platform", () => {
    enableVortexControlDoubleJump();
    const platform = {
      x: state.player.x - VORTEX_CONTROL_TEST_PLATFORM_MARGIN_X,
      y: GROUND_Y - VORTEX_CONTROL_TEST_PLATFORM_Y_OFFSET,
      baseY: GROUND_Y - VORTEX_CONTROL_TEST_PLATFORM_Y_OFFSET,
      w: 160,
      h: 22,
      vx: 0,
      phase: 0,
      style: "stone",
      kind: "normal",
      spriteIndex: 0,
      spriteAct: null,
      trim: 0,
      notch: 0,
      hoverAmplitude: 0,
    } as const;
    state.platforms.push(platform);
    placePlayerInAir(platform.y);

    tryJump();
    state.player.y = platform.y - state.player.h - 1;
    state.player.vy = 2;
    updatePlayer();

    expect(state.player.onPlatform).toBe(platform);

    tryJump();
    updatePlayer();
    state.player.vy = VORTEX_CONTROL_TEST_FALL_VELOCITY;
    tryJump();

    expect(state.player.vy).toBe(-state.player.jump);
  });

  it("does not consume the air jump during a fall attack", () => {
    enableVortexControlDoubleJump();
    placePlayerInAir();
    state.player.fallAttackTimer = 1;

    tryJump();

    expect(state.player.vy).toBe(VORTEX_CONTROL_TEST_FALL_VELOCITY);

    state.player.fallAttackTimer = 0;
    tryJump();

    expect(state.player.vy).toBe(-state.player.jump);
  });

  it("applies the moon tide jump multiplier to both jumps", () => {
    enableVortexControlDoubleJump();
    state.player.ultimateLevel = 3;
    state.player.ultimateTimer = 30;

    tryJump();
    const firstJumpVelocity = state.player.vy;
    placePlayerInAir();
    tryJump();

    expect(state.player.vy).toBe(firstJumpVelocity);
  });

  it("can raise the player's feet above the boss collision body", () => {
    enableVortexControlDoubleJump();
    let minimumPlayerBottom = state.player.y + state.player.h;

    tryJump();
    while (state.player.vy < 0) {
      updatePlayer();
      minimumPlayerBottom = Math.min(minimumPlayerBottom, state.player.y + state.player.h);
    }
    tryJump();
    for (let frame = 0; frame < VORTEX_CONTROL_BOSS_CLEARANCE_FRAMES; frame += 1) {
      updatePlayer();
      minimumPlayerBottom = Math.min(minimumPlayerBottom, state.player.y + state.player.h);
    }

    expect(minimumPlayerBottom).toBeLessThan(GROUND_Y - BOSS_CONFIG.h);
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
