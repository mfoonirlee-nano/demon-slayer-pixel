import { afterEach, describe, expect, it, vi } from "vitest";
import { GROUND_Y } from "../constants";
import { resetState, state } from "../game/state";
import { keys } from "../game/input";
import type { ProjectileState } from "../types/game-state";
import { spawnEnemyById, updateEnemies } from "./enemy";
import { updateBindingZones } from "./enemies/binder";
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

afterEach(() => {
  keys.clear();
  vi.restoreAllMocks();
});

function spawnCasterOwner() {
  expect(spawnEnemyById("caster", "debug", "left")).toBe(true);
  const caster = state.enemies[0];
  caster.casterId = TEST_CASTER_ID;
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

  it("spawns caster wisps fast enough to keep tracking for the full five seconds", () => {
    resetState();
    state.player.x = 640;
    state.player.y = GROUND_Y - state.player.h;
    expect(spawnEnemyById("caster", "debug", "left")).toBe(true);
    const caster = state.enemies[0];
    caster.x = 180;
    caster.y = GROUND_Y - caster.h;
    caster.casterPhase = "cast";
    caster.casterTimer = CASTER_CAST_FRAMES - CASTER_CAST_SPAWN_FRAME;
    caster.casterCastSpawned = false;
    caster.casterFacing = 1;

    updateEnemies();

    expect(state.projectiles).toHaveLength(1);
    const wisp = state.projectiles[0];
    expect(wisp.trackingFrames).toBe(CASTER_WISP_TRACKING_FRAMES);
    expect(wisp.life).toBeGreaterThan(CASTER_WISP_TRACKING_FRAMES);
    expect(wisp.speed ?? 0).toBeGreaterThan(TUNED_WISP_SPEED_FLOOR);
    expect(Math.hypot(wisp.vx, wisp.vy ?? 0)).toBeCloseTo(wisp.speed ?? 0);
  });
});

describe("binder talismans", () => {
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

  it("reverses horizontal movement while key scramble is active", () => {
    resetState();
    state.player.binderTalismanKeyScrambleTimer = 30;
    const startX = state.player.x;
    keys.add("a");

    updatePlayer();

    expect(state.player.x).toBeGreaterThan(startX);
  });
});
