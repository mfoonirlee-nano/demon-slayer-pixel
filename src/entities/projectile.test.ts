import { describe, expect, it } from "vitest";
import { GROUND_Y } from "../constants";
import { resetState, state } from "../game/state";
import type { ProjectileState } from "../types/game-state";
import { spawnEnemyById, updateEnemies } from "./enemy";
import { updateProjectiles } from "./projectile";

const FRAMES_PER_SECOND = 60;
const CASTER_WISP_TRACKING_SECONDS = 5;
const CASTER_WISP_TRACKING_FRAMES = CASTER_WISP_TRACKING_SECONDS * FRAMES_PER_SECOND;
const TEST_CASTER_ID = 4242;
const TEST_WISP_SPEED = 3;
const TEST_WISP_TURN_RATE = Math.PI / 2;
const CASTER_CAST_FRAMES = 28;
const CASTER_CAST_SPAWN_FRAME = 14;
const TUNED_WISP_SPEED_FLOOR = 2.3;
const TEST_WISP_START_X = 120;
const TEST_WISP_START_Y = 120;

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
