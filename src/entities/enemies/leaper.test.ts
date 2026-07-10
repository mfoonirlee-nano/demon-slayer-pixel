import { afterEach, describe, expect, it, vi } from "vitest";
import { GROUND_Y, WIDTH } from "../../constants";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import type { ActBand, EnemyState, PlatformState } from "../../types/game-state";
import { spawnEnemyById, updateEnemies } from "../enemy";
import { updateParticles } from "../particle";
import { updateProjectiles } from "../projectile";
import { LEAPER_ARCHETYPE } from "./leaper";

const TEST_PLATFORM_X = 220;
const TEST_PLATFORM_Y_OFFSET_FROM_GROUND = 150;
const TEST_PLATFORM_Y = GROUND_Y - TEST_PLATFORM_Y_OFFSET_FROM_GROUND;
const TEST_PLATFORM_WIDTH = 280;
const TEST_PLATFORM_HEIGHT = 22;
const TEST_PLAYER_PLATFORM_OFFSET_X = 120;
const TEST_LEAPER_START_X = 120;
const LANDING_GUARD_FRAMES = 140;
const SPIKE_RELEASE_GUARD_FRAMES = 24;
const EXPECTED_SPIKE_COUNT = 8;
const DIRECTION_PRECISION = 3;
const FINAL_ATTACK_GUARD_FRAMES = 160;
const FINAL_PLAYER_DODGE_OFFSET_X = 80;
const WARNING_LINE_MAX_WIDTH = 4;
const WARNING_LINE_MIN_HEIGHT = 100;
const EXPECTED_WARNING_LINE_COUNT = 2;
const TEST_FINAL_IMPACT_DAMAGE = 10;
const FINAL_IMPACT_MIN_DAMAGE_MULTIPLIER = 3;
const EXPECTED_ROCK_COUNT = 16;
const PLATFORM_EDGE_EXIT_OFFSET = 10;
const GROWTH_STAGES: ActBand[] = ["intro", "awakened", "final"];

type FillRectCall = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type EllipseCall = {
  radiusX: number;
  radiusY: number;
};

let fillRects: FillRectCall[] = [];
let ellipses: EllipseCall[] = [];

function platform(): PlatformState {
  return {
    x: TEST_PLATFORM_X,
    y: TEST_PLATFORM_Y,
    baseY: TEST_PLATFORM_Y,
    w: TEST_PLATFORM_WIDTH,
    h: TEST_PLATFORM_HEIGHT,
    vx: 0,
    phase: 0,
    style: "stone",
    kind: "normal",
    spriteIndex: 0,
    trim: 0,
    notch: 0,
    hoverAmplitude: 0,
  };
}

function hasNotLanded(leaper: EnemyState) {
  return leaper.leaperPhase !== "impact";
}

function currentLeaperPhase(leaper: EnemyState) {
  return leaper.leaperPhase ?? "stalk";
}

function installCanvasContext() {
  const context = {
    imageSmoothingEnabled: false,
    fillStyle: "",
    strokeStyle: "",
    globalAlpha: 1,
    lineWidth: 1,
    save() {},
    restore() {},
    beginPath() {},
    ellipse(
      _x: number,
      _y: number,
      radiusX: number,
      radiusY: number,
    ) {
      ellipses.push({ radiusX, radiusY });
    },
    stroke() {},
    fillRect(x: number, y: number, w: number, h: number) {
      fillRects.push({ x, y, w, h });
    },
  } as unknown as CanvasRenderingContext2D;

  const canvas = {
    getContext() {
      return context;
    },
  } as unknown as HTMLCanvasElement;

  setCanvas(canvas);
}

function landLeaperOnPlayerPlatform(growthStage: ActBand) {
  resetState();
  vi.spyOn(Math, "random").mockReturnValue(0);

  const targetPlatform = platform();
  state.platforms.push(targetPlatform);
  state.player.onPlatform = targetPlatform;
  state.player.x = targetPlatform.x + TEST_PLAYER_PLATFORM_OFFSET_X;
  state.player.y = targetPlatform.y - state.player.h;

  expect(spawnEnemyById("leaper", "debug", "left", { growthStage })).toBe(true);
  const leaper = state.enemies[0];
  leaper.x = TEST_LEAPER_START_X;
  leaper.y = GROUND_Y - leaper.h;
  leaper.leaperPhase = "windup";
  leaper.leaperTimer = 1;
  leaper.vx = 0;

  for (
    let guard = 0;
    hasNotLanded(leaper) && guard < LANDING_GUARD_FRAMES;
    guard += 1
  ) {
    updateEnemies();
  }

  return { leaper, targetPlatform };
}

afterEach(() => {
  vi.restoreAllMocks();
  setCanvas(null);
});

describe("leaper platform attacks", () => {
  it.each(GROWTH_STAGES)("lands %s jumps on the player's platform", (growthStage) => {
    const { leaper, targetPlatform } = landLeaperOnPlayerPlatform(growthStage);

    expect(leaper.leaperPhase).toBe("impact");
    expect(leaper.y + leaper.h).toBeCloseTo(targetPlatform.y);
    expect(leaper.onPlatform).toBe(targetPlatform);
  });

  it("releases platform support after moving beyond its edge", () => {
    resetState();
    const targetPlatform = platform();
    state.platforms.push(targetPlatform);

    expect(spawnEnemyById("leaper", "debug", "left", { growthStage: "intro" })).toBe(true);
    const leaper = state.enemies[0];
    leaper.leaperPhase = "stalk";
    leaper.leaperTimer = LANDING_GUARD_FRAMES;
    leaper.onPlatform = targetPlatform;
    leaper.x = targetPlatform.x + targetPlatform.w + PLATFORM_EDGE_EXIT_OFFSET;
    leaper.y = targetPlatform.y - leaper.h;

    updateEnemies();

    expect(leaper.onPlatform).toBeNull();
    expect(leaper.y + leaper.h).toBeGreaterThan(targetPlatform.y);
    expect(leaper.y + leaper.h).toBeLessThan(GROUND_Y);
  });

  it("draws the landing warning as wide as the impact area", () => {
    resetState();
    fillRects = [];
    ellipses = [];
    installCanvasContext();

    expect(spawnEnemyById("leaper", "debug", "left", { growthStage: "awakened" })).toBe(true);
    const leaper = state.enemies[0];
    leaper.leaperPhase = "windup";
    leaper.leaperTimer = 10;
    leaper.leaperPhaseDuration = 20;
    leaper.leaperLandingX = TEST_PLATFORM_X;
    leaper.leaperLandingY = TEST_PLATFORM_Y - leaper.h;

    LEAPER_ARCHETYPE.draw(leaper);

    expect(ellipses).toHaveLength(1);
    expect(ellipses[0].radiusX).toBeGreaterThan(leaper.w);
  });
});

describe("awakened leaper spikes", () => {
  it("releases one eight-way spike burst from its back during a jump", () => {
    resetState();
    vi.spyOn(Math, "random").mockReturnValue(0);

    expect(spawnEnemyById("leaper", "debug", "left", { growthStage: "awakened" })).toBe(true);
    const leaper = state.enemies[0];
    leaper.x = TEST_LEAPER_START_X;
    leaper.y = GROUND_Y - leaper.h;
    leaper.leaperPhase = "windup";
    leaper.leaperTimer = 1;
    leaper.leaperFacing = 1;

    for (
      let guard = 0;
      state.projectiles.length === 0 && guard < SPIKE_RELEASE_GUARD_FRAMES;
      guard += 1
    ) {
      updateEnemies();
    }

    const spikes = state.projectiles.filter((projectile) => projectile.kind === "leaperSpike");
    const directions = new Set(spikes.map((spike) => (
      Math.atan2(spike.vy ?? 0, spike.vx).toFixed(DIRECTION_PRECISION)
    )));
    const originCenterX = spikes.reduce((sum, spike) => sum + spike.x + spike.w / 2, 0) / spikes.length;
    const originCenterY = spikes.reduce((sum, spike) => sum + spike.y + spike.h / 2, 0) / spikes.length;

    expect(spikes).toHaveLength(EXPECTED_SPIKE_COUNT);
    expect(directions.size).toBe(EXPECTED_SPIKE_COUNT);
    expect(spikes.some((spike) => spike.vx > 0)).toBe(true);
    expect(spikes.some((spike) => spike.vx < 0)).toBe(true);
    expect(spikes.some((spike) => (spike.vy ?? 0) > 0)).toBe(true);
    expect(spikes.some((spike) => (spike.vy ?? 0) < 0)).toBe(true);
    expect(originCenterX).toBeGreaterThan(leaper.x);
    expect(originCenterX).toBeLessThan(leaper.x + leaper.w);
    expect(originCenterY).toBeGreaterThan(leaper.y);
    expect(originCenterY).toBeLessThan(leaper.y + leaper.h / 2);

    const upwardSpike = spikes.reduce((highest, spike) => (
      (spike.vy ?? 0) < (highest.vy ?? 0) ? spike : highest
    ));
    const upwardSpikeStartY = upwardSpike.y;
    state.player.x = WIDTH - state.player.w;
    updateProjectiles();
    expect(upwardSpike.y).toBeLessThan(upwardSpikeStartY);

    for (let frame = 0; frame < SPIKE_RELEASE_GUARD_FRAMES; frame += 1) updateEnemies();
    expect(state.projectiles.filter((projectile) => projectile.kind === "leaperSpike"))
      .toHaveLength(EXPECTED_SPIKE_COUNT);
  });
});

describe("final leaper sky slam", () => {
  it("leaves the screen before falling at its locked target", () => {
    resetState();
    vi.spyOn(Math, "random").mockReturnValue(0);

    const targetPlatform = platform();
    state.platforms.push(targetPlatform);
    state.player.onPlatform = targetPlatform;
    state.player.x = targetPlatform.x + TEST_PLAYER_PLATFORM_OFFSET_X;
    state.player.y = targetPlatform.y - state.player.h;

    expect(spawnEnemyById("leaper", "debug", "left", { growthStage: "final" })).toBe(true);
    const leaper = state.enemies[0];
    leaper.x = TEST_LEAPER_START_X;
    leaper.y = GROUND_Y - leaper.h;
    leaper.leaperPhase = "windup";
    leaper.leaperTimer = 1;

    const visitedPhases = new Set<string>();
    let lockedLandingX: number | undefined;
    for (let guard = 0; guard < FINAL_ATTACK_GUARD_FRAMES; guard += 1) {
      updateEnemies();
      const phase = currentLeaperPhase(leaper);
      visitedPhases.add(phase);
      lockedLandingX ??= leaper.leaperLandingX;
      if (phase === "skyWait") {
        expect(leaper.y + leaper.h).toBeLessThan(0);
        state.player.x += FINAL_PLAYER_DODGE_OFFSET_X;
      }
      if (phase === "impact") break;
    }

    expect(visitedPhases).toContain("skyRise");
    expect(visitedPhases).toContain("skyWait");
    expect(visitedPhases).toContain("skyFall");
    expect(leaper.leaperPhase).toBe("impact");
    expect(leaper.leaperLandingX).toBeCloseTo(lockedLandingX ?? 0);
    expect(leaper.y + leaper.h).toBeCloseTo(targetPlatform.y);
  });

  it("draws paired vertical warning lines while waiting offscreen", () => {
    resetState();
    fillRects = [];
    ellipses = [];
    installCanvasContext();

    expect(spawnEnemyById("leaper", "debug", "left", { growthStage: "final" })).toBe(true);
    const leaper = state.enemies[0];
    leaper.leaperPhase = "skyWait";
    leaper.leaperTimer = 20;
    leaper.leaperPhaseDuration = 42;
    leaper.leaperLandingX = TEST_PLATFORM_X;
    leaper.leaperLandingY = TEST_PLATFORM_Y - leaper.h;
    leaper.x = leaper.leaperLandingX;
    leaper.y = -leaper.h;

    LEAPER_ARCHETYPE.draw(leaper);

    const warningLines = fillRects.filter((rect) => (
      rect.w <= WARNING_LINE_MAX_WIDTH && rect.h >= WARNING_LINE_MIN_HEIGHT
    ));
    expect(warningLines).toHaveLength(EXPECTED_WARNING_LINE_COUNT);
    expect(warningLines.every((line) => line.y === 0)).toBe(true);
    expect(warningLines.every((line) => line.h >= TEST_PLATFORM_Y)).toBe(true);
  });

  it("deals heavy impact damage and emits one burst of flying rocks", () => {
    resetState();
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    expect(spawnEnemyById("leaper", "debug", "left", { growthStage: "final" })).toBe(true);
    const leaper = state.enemies[0];
    const landingX = state.player.x + state.player.w / 2 - leaper.w / 2;
    leaper.damage = TEST_FINAL_IMPACT_DAMAGE;
    leaper.leaperPhase = "skyFall";
    leaper.leaperTimer = 1;
    leaper.leaperPhaseDuration = 18;
    leaper.leaperLandingX = landingX;
    leaper.leaperLandingY = GROUND_Y - leaper.h;
    leaper.x = landingX;
    leaper.y = -leaper.h;
    state.player.y = GROUND_Y - state.player.h;
    const hpBeforeImpact = state.player.hp;

    updateEnemies();

    const damageTaken = hpBeforeImpact - state.player.hp;
    const rocks = state.particles.filter((particle) => particle.kind === "leaperRock");
    expect(damageTaken).toBeGreaterThan(
      TEST_FINAL_IMPACT_DAMAGE * FINAL_IMPACT_MIN_DAMAGE_MULTIPLIER,
    );
    expect(rocks).toHaveLength(EXPECTED_ROCK_COUNT);
    expect(rocks.some((rock) => rock.vx < 0)).toBe(true);
    expect(rocks.some((rock) => rock.vx > 0)).toBe(true);
    expect(rocks.every((rock) => rock.vy < 0)).toBe(true);

    const hpAfterImpact = state.player.hp;
    updateEnemies();
    expect(state.player.hp).toBe(hpAfterImpact);
    expect(state.particles.filter((particle) => particle.kind === "leaperRock"))
      .toHaveLength(EXPECTED_ROCK_COUNT);

    const firstRock = rocks[0];
    const firstRockStartY = firstRock.y;
    const firstRockStartVy = firstRock.vy;
    updateParticles();
    expect(firstRock.y).toBeLessThan(firstRockStartY);
    expect(firstRock.vy).toBeGreaterThan(firstRockStartVy);
  });
});
