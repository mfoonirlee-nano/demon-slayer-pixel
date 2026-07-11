import { afterEach, describe, expect, it, vi } from "vitest";
import { GROUND_Y } from "../constants";
import { resetState, state } from "../game/state";
import { keys } from "../game/input";
import type { ProjectileState } from "../types/game-state";
import { spawnEnemyById, updateEnemies } from "./enemy";
import { updateBindingZones } from "./enemies/binder";
import { binderTalismanFrameEffect } from "./enemies/binderTalismanVisuals";
import { updatePlayer } from "./player";
import { updateProjectiles } from "./projectile";

const FRAMES_PER_SECOND = 60;
const CASTER_WISP_TRACKING_SECONDS = 5;
const CASTER_WISP_TRACKING_FRAMES = CASTER_WISP_TRACKING_SECONDS * FRAMES_PER_SECOND;
const TEST_CASTER_ID = 4242;
const TEST_WISP_SPEED = 3;
const TEST_WISP_TURN_RATE = Math.PI / 2;
const CASTER_CAST_FRAMES = 28;
const CASTER_CAST_SPAWN_FRAME = 14;
const CASTER_WINDUP_FRAMES = 36;
const CASTER_RECOVER_FRAMES = 34;
const CASTER_NORMAL_INTERVAL_FRAMES = 300;
const CASTER_EMPOWERED_INTERVAL_FRAMES = 180;
const CASTER_BASE_WISP_SPEED = 2.45;
const CASTER_NORMAL_WISP_SPEED_MULTIPLIER = 1.1;
const CASTER_AWAKENED_SPEED_FROM_NORMAL = 1.3;
const CASTER_FINAL_SPEED_FROM_NORMAL = 3;
const CASTER_AWAKENED_WISP_SPEED_MULTIPLIER = CASTER_NORMAL_WISP_SPEED_MULTIPLIER
  * CASTER_AWAKENED_SPEED_FROM_NORMAL;
const CASTER_FINAL_WISP_SPEED_MULTIPLIER = CASTER_NORMAL_WISP_SPEED_MULTIPLIER
  * CASTER_FINAL_SPEED_FROM_NORMAL;
const CASTER_BASE_WISP_DAMAGE = 4;
const CASTER_AWAKENED_WISP_DAMAGE_MULTIPLIER = 1.2;
const CASTER_FINAL_WISP_DAMAGE_MULTIPLIER = 1.5;
const CASTER_FINAL_WISP_HEX_RADIUS = 42;
const CASTER_NORMAL_WISP_FRAME_DURATION = 6;
const CASTER_FINAL_WISP_FRAME_DURATION = 3;
const CASTER_AWAKENED_SHOT_COUNT = 3;
const CASTER_FINAL_SHOT_COUNT = 6;
const FULL_CIRCLE_RADIANS = Math.PI * 2;
const BINDER_CAST_FRAMES = 24;
const BINDER_CAST_SPAWN_FRAME = 10;
const BINDER_CIRCLE_TALISMAN_RELEASE_FRAME = 14;
const BINDER_TALISMAN_DAMAGE_FIRST_FRAME = 24;
const TUNED_WISP_SPEED_FLOOR = 2.3;
const TEST_WISP_START_X = 120;
const TEST_WISP_START_Y = 120;
const TEST_BINDER_X = 180;
const TEST_BINDER_FACING = 1;
const TEST_BINDER_PLAYER_X_OFFSET = 240;
const TEST_GUARD_COUNTER_HITS = 2;
const TEST_GUARD_COUNTER_ACTIVE_FRAMES = 72;
const AWAKENED_WISP_STRESS_VOLLEYS = 5;

afterEach(() => {
  keys.clear();
  vi.restoreAllMocks();
});

function spawnCasterOwner() {
  expect(spawnEnemyById("caster", "debug", "left")).toBe(true);
  const caster = state.enemies[0];
  caster.casterId = TEST_CASTER_ID;
}

function forceCasterCast(growthStage: "intro" | "awakened" | "final" = "intro") {
  expect(spawnEnemyById("caster", "debug", "left", { growthStage })).toBe(true);
  const caster = state.enemies[0];
  caster.x = 180;
  caster.y = GROUND_Y - caster.h;
  state.player.x = 640;
  state.player.y = GROUND_Y - state.player.h;
  caster.casterPhase = "cast";
  caster.casterTimer = CASTER_CAST_FRAMES - CASTER_CAST_SPAWN_FRAME;
  caster.casterCastSpawned = false;
  caster.casterFacing = 1;
  updateEnemies();
  return caster;
}

function expectProjectileSpeed(projectile: ProjectileState, speed: number) {
  expect(projectile.speed ?? 0).toBeCloseTo(speed);
  expect(Math.hypot(projectile.vx, projectile.vy ?? 0)).toBeCloseTo(speed);
}

function projectileCenter(projectile: ProjectileState) {
  return {
    x: projectile.x + projectile.w / 2,
    y: projectile.y + projectile.h / 2,
  };
}

function normalizeAngle(angle: number) {
  let normalized = angle;
  while (normalized > Math.PI) normalized -= FULL_CIRCLE_RADIANS;
  while (normalized < -Math.PI) normalized += FULL_CIRCLE_RADIANS;
  return normalized;
}

function casterWisp(overrides: Partial<ProjectileState> = {}): ProjectileState {
  return {
    kind: "casterWisp",
    x: TEST_WISP_START_X,
    y: TEST_WISP_START_Y,
    w: 10,
    h: 10,
    vx: TEST_WISP_SPEED,
    vy: 0,
    life: 1000,
    damage: 0,
    ownerId: TEST_CASTER_ID,
    frame: 0,
    elapsed: 0,
    speed: TEST_WISP_SPEED,
    trackingFrames: CASTER_WISP_TRACKING_FRAMES,
    turnRate: TEST_WISP_TURN_RATE,
    ...overrides,
  };
}

function forceBinderCast(growthStage: "intro" | "awakened" | "final" = "intro") {
  expect(spawnEnemyById("binder", "debug", "left", { growthStage })).toBe(true);
  const binder = state.enemies[0];
  binder.x = TEST_BINDER_X;
  binder.y = GROUND_Y - binder.h;
  state.player.x = binder.x + binder.w + TEST_BINDER_PLAYER_X_OFFSET;
  binder.binderPhase = "cast";
  binder.binderTimer = BINDER_CAST_FRAMES - BINDER_CAST_SPAWN_FRAME;
  binder.binderCastSpawned = false;
  binder.binderFacing = TEST_BINDER_FACING;
  updateEnemies();
  return binder;
}

function releaseBinderTalisman() {
  for (let frame = 0; frame < BINDER_CIRCLE_TALISMAN_RELEASE_FRAME; frame += 1) {
    updateBindingZones();
  }
}

function activateGuardCounter(hitsRemaining = TEST_GUARD_COUNTER_HITS) {
  state.guardCounterEffect = {
    elapsed: 0,
    frame: 0,
    hitsRemaining,
    maxHits: hitsRemaining,
    activeFrames: TEST_GUARD_COUNTER_ACTIVE_FRAMES,
    counterPadding: 0,
    damageMultiplier: 1,
    barrierFlash: 0,
  };
}

describe("caster wisps", () => {
  it("turns toward the player during the first five seconds", () => {
    resetState();
    spawnCasterOwner();
    state.player.x = TEST_WISP_START_X;
    state.player.y = 460;
    const wisp = casterWisp();
    state.projectiles.push(wisp);

    updateProjectiles();

    expect(wisp.vy ?? 0).toBeGreaterThan(0);
  });

  it("keeps flying in its last direction after five seconds", () => {
    resetState();
    spawnCasterOwner();
    state.player.x = TEST_WISP_START_X;
    state.player.y = 460;
    const wisp = casterWisp({ elapsed: CASTER_WISP_TRACKING_FRAMES });
    state.projectiles.push(wisp);

    updateProjectiles();

    expect(wisp.vx).toBeCloseTo(TEST_WISP_SPEED);
    expect(wisp.vy ?? 0).toBeCloseTo(0);
    expect(wisp.x).toBeCloseTo(TEST_WISP_START_X + TEST_WISP_SPEED);
    expect(wisp.y).toBeCloseTo(TEST_WISP_START_Y);
  });

  it("indexes caster owners once per frame instead of scanning enemies for every wisp", () => {
    resetState();
    spawnCasterOwner();
    const enemyScan = vi.spyOn(state.enemies, "some");
    state.projectiles.push(
      ...Array.from({
        length: CASTER_AWAKENED_SHOT_COUNT * AWAKENED_WISP_STRESS_VOLLEYS,
      }, () => casterWisp()),
      casterWisp({ ownerId: TEST_CASTER_ID + 1 }),
    );

    updateProjectiles();

    expect(enemyScan).not.toHaveBeenCalled();
    expect(state.projectiles).toHaveLength(
      CASTER_AWAKENED_SHOT_COUNT * AWAKENED_WISP_STRESS_VOLLEYS,
    );
  });

  it("spawns caster wisps fast enough to keep tracking for the full five seconds", () => {
    resetState();
    forceCasterCast();

    expect(state.projectiles).toHaveLength(1);
    const wisp = state.projectiles[0];
    expect(wisp.trackingFrames).toBe(CASTER_WISP_TRACKING_FRAMES);
    expect(wisp.life).toBeGreaterThan(CASTER_WISP_TRACKING_FRAMES);
    expect(wisp.speed ?? 0).toBeGreaterThan(TUNED_WISP_SPEED_FLOOR);
    expect(Math.hypot(wisp.vx, wisp.vy ?? 0)).toBeCloseTo(wisp.speed ?? 0);
  });

  it("fires one normal wisp at the faster base speed", () => {
    resetState();
    forceCasterCast("intro");

    expect(state.projectiles).toHaveLength(1);
    const wisp = state.projectiles[0];
    expect(wisp.wispStage).toBe("intro");
    expect(wisp.damage).toBeCloseTo(CASTER_BASE_WISP_DAMAGE);
    expect(wisp.frameDuration).toBe(CASTER_NORMAL_WISP_FRAME_DURATION);
    expectProjectileSpeed(
      wisp,
      CASTER_BASE_WISP_SPEED * CASTER_NORMAL_WISP_SPEED_MULTIPLIER,
    );
  });

  it("fires three purple-red awakened wisps from different angles", () => {
    resetState();
    forceCasterCast("awakened");

    expect(state.projectiles).toHaveLength(CASTER_AWAKENED_SHOT_COUNT);
    expect(new Set(state.projectiles.map((wisp) => wisp.y))).toHaveLength(CASTER_AWAKENED_SHOT_COUNT);
    for (const wisp of state.projectiles) {
      expect(wisp.wispStage).toBe("awakened");
      expect(wisp.damage).toBeCloseTo(
        CASTER_BASE_WISP_DAMAGE * CASTER_AWAKENED_WISP_DAMAGE_MULTIPLIER,
      );
      expectProjectileSpeed(
        wisp,
        CASTER_BASE_WISP_SPEED * CASTER_AWAKENED_WISP_SPEED_MULTIPLIER,
      );
    }
  });

  it("fires six doubled-speed dark-red final wisps in a hexagon toward the player", () => {
    resetState();
    forceCasterCast("final");

    expect(state.projectiles).toHaveLength(CASTER_FINAL_SHOT_COUNT);
    const centers = state.projectiles.map(projectileCenter);
    const centerX = centers.reduce((sum, center) => sum + center.x, 0) / centers.length;
    const centerY = centers.reduce((sum, center) => sum + center.y, 0) / centers.length;
    const playerCenterX = state.player.x + state.player.w / 2;
    const playerCenterY = state.player.y + state.player.h / 2;

    for (const wisp of state.projectiles) {
      expect(wisp.wispStage).toBe("final");
      expect(wisp.frameDuration).toBe(CASTER_FINAL_WISP_FRAME_DURATION);
      expect(wisp.damage).toBeCloseTo(
        CASTER_BASE_WISP_DAMAGE * CASTER_FINAL_WISP_DAMAGE_MULTIPLIER,
      );
      expectProjectileSpeed(
        wisp,
        CASTER_BASE_WISP_SPEED * CASTER_FINAL_WISP_SPEED_MULTIPLIER,
      );
    }

    centers.forEach((center, index) => {
      const expectedAngle = -Math.PI / 2
        + index * (FULL_CIRCLE_RADIANS / CASTER_FINAL_SHOT_COUNT);
      expect(center.x).toBeCloseTo(
        centerX + Math.cos(expectedAngle) * CASTER_FINAL_WISP_HEX_RADIUS,
      );
      expect(center.y).toBeCloseTo(
        centerY + Math.sin(expectedAngle) * CASTER_FINAL_WISP_HEX_RADIUS,
      );

      const wisp = state.projectiles[index];
      const targetAngle = Math.atan2(playerCenterY - center.y, playerCenterX - center.x);
      const velocityAngle = Math.atan2(wisp.vy ?? 0, wisp.vx);
      expect(normalizeAngle(velocityAngle - targetAngle)).toBeCloseTo(0);
    });
  });

  it("uses five-second normal casts and three-second empowered casts", () => {
    resetState();
    const caster = forceCasterCast("intro");
    caster.casterPhase = "recover";
    caster.casterTimer = 1;

    updateEnemies();

    expect(caster.casterPhase).toBe("seekRange");
    expect(caster.casterTimer).toBe(
      CASTER_NORMAL_INTERVAL_FRAMES
      - CASTER_WINDUP_FRAMES
      - CASTER_CAST_FRAMES
      - CASTER_RECOVER_FRAMES,
    );

    resetState();
    const awakenedCaster = forceCasterCast("awakened");
    awakenedCaster.casterPhase = "recover";
    awakenedCaster.casterTimer = 1;

    updateEnemies();

    expect(awakenedCaster.casterPhase).toBe("seekRange");
    expect(awakenedCaster.casterTimer).toBe(
      CASTER_EMPOWERED_INTERVAL_FRAMES
      - CASTER_WINDUP_FRAMES
      - CASTER_CAST_FRAMES
      - CASTER_RECOVER_FRAMES,
    );

    resetState();
    const finalCaster = forceCasterCast("final");
    finalCaster.casterPhase = "recover";
    finalCaster.casterTimer = 1;

    updateEnemies();

    expect(finalCaster.casterPhase).toBe("seekRange");
    expect(finalCaster.casterTimer).toBe(
      CASTER_EMPOWERED_INTERVAL_FRAMES
      - CASTER_WINDUP_FRAMES
      - CASTER_CAST_FRAMES
      - CASTER_RECOVER_FRAMES,
    );
  });
});

describe("binder talismans", () => {
  it("uses distinct visual effects for binder talisman debuffs", () => {
    const slow = binderTalismanFrameEffect(["slow"]);
    const damage = binderTalismanFrameEffect(["damage"]);
    const scramble = binderTalismanFrameEffect(["keyScramble"]);
    const stun = binderTalismanFrameEffect(["stun"]);
    const normalPair = binderTalismanFrameEffect(["slow", "damage"]);
    const awakenedPair = binderTalismanFrameEffect(["keyScramble", "stun"]);

    expect(slow).toBeDefined();
    expect(damage).toBeDefined();
    expect(scramble).toBeDefined();
    expect(stun).toBeDefined();
    expect(normalPair).toBeDefined();
    expect(awakenedPair).toBeDefined();
    expect(slow?.filter).not.toBe(damage?.filter);
    expect(scramble?.filter).not.toBe(stun?.filter);
    expect(normalPair?.filter).not.toBe(awakenedPair?.filter);
  });

  it("spawns the magic circle in front of the binder and releases a normal talisman", () => {
    resetState();
    const binder = forceBinderCast();

    expect(state.bindingZones).toHaveLength(1);
    const zone = state.bindingZones[0];
    expect(zone.x).toBeGreaterThan(binder.x + binder.w / 2);
    expect(zone.y).toBe(binder.y + binder.h);
    expect(zone.debuffs).toEqual(["slow", "damage"]);

    releaseBinderTalisman();

    expect(state.projectiles).toHaveLength(1);
    expect(state.projectiles[0].kind).toBe("binderTalisman");
    expect(state.projectiles[0].debuffs).toEqual(["slow", "damage"]);
  });

  it("uses key scramble and sudden stun for awakened binder talismans", () => {
    resetState();
    forceBinderCast("awakened");

    expect(state.bindingZones[0].debuffs).toEqual(["keyScramble", "stun"]);
  });

  it("randomly picks two debuffs for final binder talismans", () => {
    resetState();

    forceBinderCast("final");

    const debuffs = state.bindingZones[0].debuffs;
    expect(debuffs).toHaveLength(2);
    expect(new Set(debuffs).size).toBe(2);
    expect(debuffs.every((debuff) => (
      debuff === "slow"
      || debuff === "damage"
      || debuff === "keyScramble"
      || debuff === "stun"
    ))).toBe(true);
  });

  it("sticks to the player and applies slow plus damage over time on hit", () => {
    resetState();
    state.projectiles.push({
      kind: "binderTalisman",
      x: state.player.x,
      y: state.player.y,
      w: state.player.w,
      h: state.player.h,
      vx: 0,
      vy: 0,
      life: 30,
      damage: 0,
      frame: 0,
      elapsed: 0,
      speed: 0,
      trackingFrames: 0,
      turnRate: 0,
      debuffs: ["slow", "damage"],
    });

    updateProjectiles();

    expect(state.projectiles).toHaveLength(0);
    expect(state.player.binderTalismanSlowTimer).toBeGreaterThan(0);
    expect(state.player.binderTalismanDamageTimer).toBeGreaterThan(0);

    const hpBeforeDot = state.player.hp;
    for (let frame = 0; frame < BINDER_TALISMAN_DAMAGE_FIRST_FRAME; frame += 1) {
      updateBindingZones();
    }

    expect(state.player.hp).toBeLessThan(hpBeforeDot);
  });

  it("lets guard counter block binder talismans without spending hits", () => {
    resetState();
    activateGuardCounter();
    const hitsBefore = state.guardCounterEffect?.hitsRemaining;
    state.projectiles.push({
      kind: "binderTalisman",
      x: state.player.x,
      y: state.player.y,
      w: state.player.w,
      h: state.player.h,
      vx: 0,
      vy: 0,
      life: 30,
      damage: 0,
      frame: 0,
      elapsed: 0,
      speed: 0,
      trackingFrames: 0,
      turnRate: 0,
      debuffs: ["slow", "damage"],
    });

    updateProjectiles();

    expect(state.projectiles).toHaveLength(0);
    expect(state.guardCounterEffect?.hitsRemaining).toBe(hitsBefore);
    expect(state.guardCounterEffect?.barrierFlash).toBeGreaterThan(0);
    expect(state.player.binderTalismanSlowTimer).toBe(0);
    expect(state.player.binderTalismanDamageTimer).toBe(0);
  });

  it("reverses horizontal movement while key scramble is active", () => {
    resetState();
    state.player.binderTalismanKeyScrambleTimer = 30;
    const startX = state.player.x;
    keys.add("a");

    updatePlayer();

    expect(state.player.x).toBeGreaterThan(startX);
  });
});
