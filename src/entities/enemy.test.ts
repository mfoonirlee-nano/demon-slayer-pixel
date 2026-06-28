import { describe, expect, it } from "vitest";
import { GROUND_Y, WIDTH } from "../constants";
import { resetState, state } from "../game/state";
import { enemySpawnCost } from "../systems/enemyDirector";
import type { PlatformState } from "../types/game-state";
import { spawnEnemyById, updateEnemies } from "./enemy";

const TEST_LEAPER_DAMAGE = 10;
const EXPECTED_CONTACT_HP = 90;
const LEAPER_IMPACT_PHASE_DURATION = 28;
const LEAPER_TEST_LANDING_X = 120;
const LEAPER_TEST_PLAYER_X_OFFSET = 10;
const EXPECTED_IMPACT_HP = 81;
const AWAKENED_ACT = 7;
const AWAKENED_BOSS_KILLS = 6;
const OFFSCREEN_PLATFORM_X_OFFSET = 120;
const TEST_PLATFORM_Y_OFFSET_FROM_GROUND = 132;
const OFFSCREEN_PLATFORM_X = WIDTH + OFFSCREEN_PLATFORM_X_OFFSET;
const TEST_PLATFORM_Y = GROUND_Y - TEST_PLATFORM_Y_OFFSET_FROM_GROUND;
const TEST_PLATFORM_WIDTH = 180;
const PLATFORM_SPAWN_CENTER_RATIO = 0.35;

function platform(overrides: Partial<PlatformState> = {}): PlatformState {
  return {
    x: OFFSCREEN_PLATFORM_X,
    y: TEST_PLATFORM_Y,
    baseY: TEST_PLATFORM_Y,
    w: TEST_PLATFORM_WIDTH,
    h: 22,
    vx: -2,
    phase: 0,
    style: "stone",
    kind: "normal",
    spriteIndex: 0,
    trim: 0,
    notch: 0,
    hoverAmplitude: 0,
    ...overrides,
  };
}

describe("leaper damage", () => {
  it("applies contact damage when the leaper body overlaps the player", () => {
    resetState();
    expect(spawnEnemyById("leaper", "debug", "left")).toBe(true);
    const leaper = state.enemies[0];
    leaper.damage = TEST_LEAPER_DAMAGE;
    leaper.leaperPhase = "recover";
    leaper.leaperTimer = 10;
    leaper.x = state.player.x + state.player.w / 2 - leaper.w / 2;
    leaper.y = GROUND_Y - leaper.h;

    updateEnemies();

    expect(state.player.hp).toBe(EXPECTED_CONTACT_HP);
  });

  it("applies impact damage on the frame the leaper lands", () => {
    resetState();
    expect(spawnEnemyById("leaper", "debug", "left")).toBe(true);
    const leaper = state.enemies[0];
    leaper.damage = TEST_LEAPER_DAMAGE;
    leaper.leaperPhase = "leap";
    leaper.leaperTimer = 1;
    leaper.leaperPhaseDuration = LEAPER_IMPACT_PHASE_DURATION;
    leaper.leaperLandingX = LEAPER_TEST_LANDING_X;
    leaper.leaperLeapStartX = LEAPER_TEST_LANDING_X;
    leaper.leaperLeapStartY = GROUND_Y - leaper.h;
    leaper.x = LEAPER_TEST_LANDING_X;
    leaper.y = GROUND_Y - leaper.h;
    state.player.x = leaper.leaperLandingX + leaper.w + LEAPER_TEST_PLAYER_X_OFFSET;
    state.player.y = GROUND_Y - state.player.h;

    updateEnemies();

    expect(state.player.hp).toBe(EXPECTED_IMPACT_HP);
  });
});

describe("enemy growth spawns", () => {
  it("creates regular elite enemies with the current act growth stage and elite cost", () => {
    resetState();
    state.bossKills = AWAKENED_BOSS_KILLS;
    state.enemyDirector.act = AWAKENED_ACT;

    expect(spawnEnemyById("runner", "regular", "left", { elite: true })).toBe(true);

    const runner = state.enemies[0];
    expect(runner.growthStage).toBe("awakened");
    expect(runner.elite).toBe(true);
    expect(runner.spawnCost).toBeCloseTo(enemySpawnCost("runner", true));
  });
});

describe("enemy platform spawns", () => {
  it("places regular platform-ready enemies on right offscreen platforms when available", () => {
    resetState();
    state.platforms.push(platform());

    expect(spawnEnemyById("runner", "regular", "random_edge")).toBe(true);

    const runner = state.enemies[0];
    expect(runner.y + runner.h).toBe(TEST_PLATFORM_Y);
    expect(runner.x + runner.w / 2).toBeCloseTo(
      OFFSCREEN_PLATFORM_X + TEST_PLATFORM_WIDTH * PLATFORM_SPAWN_CENTER_RATIO,
    );
  });

  it("keeps boss and debug spawns on the ground even when a platform is available", () => {
    resetState();
    state.platforms.push(platform());

    expect(spawnEnemyById("runner", "boss", "left")).toBe(true);
    expect(state.enemies[0].y + state.enemies[0].h).toBe(GROUND_Y);

    resetState();
    state.platforms.push(platform());

    expect(spawnEnemyById("runner", "debug", "left")).toBe(true);
    expect(state.enemies[0].y + state.enemies[0].h).toBe(GROUND_Y);
  });

  it("keeps platform-incompatible regular enemies on the ground", () => {
    resetState();
    state.platforms.push(platform());

    expect(spawnEnemyById("leaper", "regular", "left")).toBe(true);

    const leaper = state.enemies[0];
    expect(leaper.y + leaper.h).toBe(GROUND_Y);
  });

  it("ignores hover platforms when choosing regular enemy spawn platforms", () => {
    resetState();
    state.platforms.push(platform({ kind: "hover", hoverAmplitude: 18 }));

    expect(spawnEnemyById("runner", "regular", "left")).toBe(true);

    const runner = state.enemies[0];
    expect(runner.y + runner.h).toBe(GROUND_Y);
  });
});
