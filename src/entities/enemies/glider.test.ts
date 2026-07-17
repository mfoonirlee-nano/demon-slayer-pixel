import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetState, state } from "../../game/state";
import { maxHpForLevel } from "../../systems/playerStatGrowth";
import type { ActBand, GliderPhase, ProjectileState } from "../../types/game-state";
import { spawnEnemyById, updateEnemies } from "../enemy";
import { updateProjectiles } from "../projectile";

const TEST_PLAYER_CENTER_X = 720;
const TEST_GLIDER_X = 220;
const PLAYER_JUMP_HEIGHT = 120;
const MAX_SMOOTH_VERTICAL_STEP = 1;
const SONIC_RELEASE_GUARD_FRAMES = 180;
const SONIC_HIT_GUARD_FRAMES = 120;
const FRAMES_PER_SECOND = 60;
const DIVE_SPEED_MIN_MULTIPLIER = 3;
const AWAKENED_PLAYER_LEVEL = 7;
const MIN_SONIC_BLADE_DAMAGE_RATIO = 0.08;
const MAX_SONIC_BLADE_DAMAGE_RATIO = 0.1;

function setPlayerCenterX(centerX: number) {
  state.player.x = centerX - state.player.w / 2;
}

function spawnGlider(growthStage: ActBand = "intro") {
  expect(spawnEnemyById("glider", "debug", "left", { growthStage })).toBe(true);
  const glider = state.enemies[0];
  glider.x = TEST_GLIDER_X;
  glider.gliderTimer = 1_000;
  glider.gliderBaseSpeed = 1;
  return glider;
}

function hoverSpeed(growthStage: ActBand) {
  resetState();
  setPlayerCenterX(TEST_PLAYER_CENTER_X);
  const glider = spawnGlider(growthStage);

  updateEnemies();

  return Math.abs(glider.vx);
}

function releaseSonicBlade(growthStage: Exclude<ActBand, "intro">) {
  resetState();
  setPlayerCenterX(TEST_PLAYER_CENTER_X);
  spawnGlider(growthStage);

  for (let frame = 0; frame < SONIC_RELEASE_GUARD_FRAMES; frame += 1) {
    state.elapsed += 1 / FRAMES_PER_SECOND;
    updateEnemies();
    const sonicBlade = state.projectiles.find((projectile) => (
      projectile.kind === "gliderSonicBlade"
    ));
    if (sonicBlade) return sonicBlade;
  }

  throw new Error(`${growthStage} glider did not release a sonic blade`);
}

describe("glider flight behavior", () => {
  beforeEach(() => {
    resetState();
    state.elapsed = 0;
    vi.spyOn(Math, "random").mockReturnValue(0);
    setPlayerCenterX(TEST_PLAYER_CENTER_X);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each<GliderPhase>(["hover", "windup", "recover"])(
    "follows a player's jump gradually during %s",
    (phase) => {
      const glider = spawnGlider();
      glider.gliderPhase = phase;
      const startY = glider.y;
      state.player.y -= PLAYER_JUMP_HEIGHT;

      updateEnemies();

      const upwardStep = startY - glider.y;
      expect(upwardStep).toBeGreaterThan(0);
      expect(upwardStep).toBeLessThanOrEqual(MAX_SMOOTH_VERTICAL_STEP);
    },
  );

  it("approaches slowly before accelerating sharply into a dive", () => {
    const glider = spawnGlider();
    updateEnemies();
    const hoverSpeed = Math.abs(glider.vx);

    glider.gliderPhase = "windup";
    glider.gliderTimer = 1;
    updateEnemies();

    expect(glider.gliderPhase).toBe("dive");
    expect(Math.abs(glider.vx)).toBeGreaterThan(hoverSpeed * DIVE_SPEED_MIN_MULTIPLIER);
  });

  it("gives awakened and final gliders faster cruising flight", () => {
    const introSpeed = hoverSpeed("intro");
    const awakenedSpeed = hoverSpeed("awakened");
    const finalSpeed = hoverSpeed("final");

    expect(awakenedSpeed).toBeGreaterThan(introSpeed);
    expect(finalSpeed).toBeGreaterThan(introSpeed);
  });
});

describe("glider sonic blades", () => {
  beforeEach(() => {
    resetState();
    state.elapsed = 0;
    vi.spyOn(Math, "random").mockReturnValue(0);
    setPlayerCenterX(TEST_PLAYER_CENTER_X);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps sonic blades exclusive to awakened growth stages", () => {
    spawnGlider("intro");

    for (let frame = 0; frame < SONIC_RELEASE_GUARD_FRAMES; frame += 1) {
      state.elapsed += 1 / FRAMES_PER_SECOND;
      updateEnemies();
    }

    expect(state.projectiles).toHaveLength(0);
    expect(releaseSonicBlade("awakened").kind).toBe("gliderSonicBlade");
  });

  it("makes final sonic blades larger and faster than awakened blades", () => {
    const awakenedBlade = releaseSonicBlade("awakened");
    const finalBlade = releaseSonicBlade("final");

    expect(finalBlade.w).toBeGreaterThan(awakenedBlade.w);
    expect(finalBlade.h).toBeGreaterThan(awakenedBlade.h);
    expect(projectileSpeed(finalBlade)).toBeGreaterThan(projectileSpeed(awakenedBlade));
  });

  it("makes an awakened sonic blade register against same-stage max health", () => {
    const sonicBlade = releaseSonicBlade("awakened");
    const damageRatio = sonicBlade.damage / maxHpForLevel(AWAKENED_PLAYER_LEVEL);

    expect(damageRatio).toBeGreaterThanOrEqual(MIN_SONIC_BLADE_DAMAGE_RATIO);
    expect(damageRatio).toBeLessThanOrEqual(MAX_SONIC_BLADE_DAMAGE_RATIO);
  });

  it("damages the player when a sonic blade connects", () => {
    const sonicBlade = releaseSonicBlade("awakened");
    const hpBefore = state.player.hp;

    for (
      let frame = 0;
      state.player.hp === hpBefore && frame < SONIC_HIT_GUARD_FRAMES;
      frame += 1
    ) {
      updateProjectiles();
    }

    expect(state.player.hp).toBeLessThan(hpBefore);
    expect(state.projectiles).not.toContain(sonicBlade);
  });
});

function projectileSpeed(projectile: ProjectileState) {
  return Math.hypot(projectile.vx, projectile.vy ?? 0);
}
