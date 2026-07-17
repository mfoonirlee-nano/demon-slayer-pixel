import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENEMY_BACKGROUND_SPAWN, ENEMY_CONFIG, GROUND_Y, WIDTH } from "../constants";
import { resetState, state } from "../game/state";
import { hitbox } from "../game/utils";
import { resolveNearForegroundOccluders } from "../rendering/nearForeground";
import { enemySpawnCost } from "../systems/enemyDirector";
import type { PlatformState } from "../types/game-state";
import { enemyVisualSize } from "./enemies/common";
import { enemyArchetypeForSheet } from "./enemies/registry";
import {
  backgroundOccluderSpawnChanceForAct,
  spawnEnemyById,
  updateEnemies,
} from "./enemy";

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
const BACKGROUND_OCCLUDER_TEST_ACT = 9;
const INTRO_OCCLUDER_TEST_ACT = 1;
const FINAL_ACT = 13;
const OCCLUDER_TEST_ELAPSED = 0;
const FIRST_RANDOM_VALUE = 0;
const HALF_DIVISOR = 2;
const SECOND_SPAWN_INDEX = 1;

const CHASER_TEST_BASE_SPEED = 2;
const CHASER_NEAR_SPEED_SCALE = 1.5;
const CHASER_NEAR_SPEED = CHASER_TEST_BASE_SPEED * CHASER_NEAR_SPEED_SCALE;
const CHASER_FAR_PLAYER_OFFSET = 260;
const CHASER_NEAR_PLAYER_OFFSET = 120;
const PLAYER_OVERLAP_ACT_PROP_X = 400;
const RANGED_RETREAT_PLAYER_X = 300;

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
    spriteAct: null,
    trim: 0,
    notch: 0,
    hoverAmplitude: 0,
    ...overrides,
  };
}

function occluderCenterX(occluder: { x: number; drawW: number }) {
  return occluder.x + occluder.drawW / HALF_DIVISOR;
}

afterEach(() => {
  vi.restoreAllMocks();
});

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

describe("chaser awakened charge", () => {
  it("keeps awakened chaser speed at its base value while the player is far ahead", () => {
    resetState();

    expect(spawnEnemyById("chaser", "debug", "left", { growthStage: "awakened" })).toBe(true);

    const chaser = state.enemies[0];
    chaser.chaserPhase = "charge";
    chaser.chaserFacing = 1;
    chaser.chaserBaseSpeed = CHASER_TEST_BASE_SPEED;
    chaser.x = 100;
    state.player.x = chaser.x + chaser.w + CHASER_FAR_PLAYER_OFFSET;

    updateEnemies();

    expect(chaser.vx).toBe(CHASER_TEST_BASE_SPEED);
  });

  it("accelerates awakened chasers by fifty percent when the player is close ahead", () => {
    resetState();

    expect(spawnEnemyById("chaser", "debug", "left", { growthStage: "awakened" })).toBe(true);

    const chaser = state.enemies[0];
    chaser.chaserPhase = "charge";
    chaser.chaserFacing = 1;
    chaser.chaserBaseSpeed = CHASER_TEST_BASE_SPEED;
    chaser.x = 100;
    state.player.x = chaser.x + CHASER_NEAR_PLAYER_OFFSET;

    updateEnemies();

    expect(chaser.vx).toBe(CHASER_NEAR_SPEED);
  });

  it("does not accelerate intro chasers near the player", () => {
    resetState();

    expect(spawnEnemyById("chaser", "debug", "left", { growthStage: "intro" })).toBe(true);

    const chaser = state.enemies[0];
    chaser.chaserPhase = "charge";
    chaser.chaserFacing = 1;
    chaser.chaserBaseSpeed = CHASER_TEST_BASE_SPEED;
    chaser.x = 100;
    state.player.x = chaser.x + CHASER_NEAR_PLAYER_OFFSET;

    updateEnemies();

    expect(chaser.vx).toBe(CHASER_TEST_BASE_SPEED);
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
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(ENEMY_BACKGROUND_SPAWN.maxChance);
  });

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

  it("carries platform-spawned enemies with their supporting platform", () => {
    resetState();
    const movingPlatform = platform({ vx: -3 });
    state.platforms.push(movingPlatform);

    expect(spawnEnemyById("runner", "regular", "left")).toBe(true);

    const runner = state.enemies[0];
    runner.runnerPhase = "windup";
    runner.runnerTimer = 10;
    runner.vx = 0;
    const originalX = runner.x;
    movingPlatform.x += movingPlatform.vx;

    updateEnemies();

    expect(runner.x).toBeCloseTo(originalX + movingPlatform.vx);
    expect(runner.y + runner.h).toBe(TEST_PLATFORM_Y);
    expect(runner.onPlatform).toBe(movingPlatform);
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

  it("keeps regular casters on the ground even when a platform is available", () => {
    resetState();
    state.platforms.push(platform());

    expect(spawnEnemyById("caster", "regular", "left")).toBe(true);

    const caster = state.enemies[0];
    expect(caster.y + caster.h).toBe(GROUND_Y);
    expect(caster.onPlatform).toBeNull();
  });

  it("ignores hover platforms when choosing regular enemy spawn platforms", () => {
    resetState();
    state.platforms.push(platform({ kind: "hover", hoverAmplitude: 18 }));

    expect(spawnEnemyById("runner", "regular", "left")).toBe(true);

    const runner = state.enemies[0];
    expect(runner.y + runner.h).toBe(GROUND_Y);
  });

  it("applies gravity to platform-spawned enemies once their platform no longer supports them", () => {
    resetState();
    state.platforms.push(platform());

    expect(spawnEnemyById("runner", "regular", "left")).toBe(true);

    const runner = state.enemies[0];
    runner.runnerPhase = "windup";
    runner.runnerTimer = 10;
    runner.vx = 0;
    const originalY = runner.y;
    state.platforms.length = 0;

    updateEnemies();

    expect(runner.y).toBeGreaterThan(originalY);
    expect(runner.vy ?? 0).toBeGreaterThan(0);
    expect(runner.onPlatform).toBeNull();
  });
});

describe("enemy spawn spacing", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(ENEMY_BACKGROUND_SPAWN.maxChance);
  });

  it("keeps consecutive ground spawns from overlapping on the same side", () => {
    resetState();

    expect(spawnEnemyById("runner", "regular", "left")).toBe(true);
    expect(spawnEnemyById("runner", "regular", "left")).toBe(true);

    const firstRunner = state.enemies[0];
    const secondRunner = state.enemies[SECOND_SPAWN_INDEX];
    expect(hitbox(firstRunner, secondRunner)).toBe(false);
    expect(secondRunner.x).toBeLessThan(firstRunner.x);
  });

  it("keeps consecutive platform spawns from overlapping before they enter play", () => {
    resetState();
    state.platforms.push(platform());

    expect(spawnEnemyById("runner", "regular", "left")).toBe(true);
    expect(spawnEnemyById("runner", "regular", "left")).toBe(true);

    const firstRunner = state.enemies[0];
    const secondRunner = state.enemies[SECOND_SPAWN_INDEX];
    expect(firstRunner.onPlatform).toBe(state.platforms[0]);
    expect(secondRunner.onPlatform).toBe(state.platforms[0]);
    expect(hitbox(firstRunner, secondRunner)).toBe(false);
  });
});

describe("enemy background occluder spawns", () => {
  it("ramps early cover spawns into the standard chance and caps the final act", () => {
    for (let act = 1; act < ENEMY_BACKGROUND_SPAWN.standardStartAct; act += 1) {
      expect(backgroundOccluderSpawnChanceForAct(act)).toBeCloseTo(
        act * ENEMY_BACKGROUND_SPAWN.earlyChancePerAct,
      );
    }

    expect(backgroundOccluderSpawnChanceForAct(ENEMY_BACKGROUND_SPAWN.standardStartAct)).toBe(
      ENEMY_BACKGROUND_SPAWN.standardChancePerAct,
    );
    expect(backgroundOccluderSpawnChanceForAct(FINAL_ACT)).toBeCloseTo(
      ENEMY_BACKGROUND_SPAWN.maxChance,
    );
    expect(backgroundOccluderSpawnChanceForAct(Number.MAX_SAFE_INTEGER)).toBe(
      ENEMY_BACKGROUND_SPAWN.maxChance,
    );
    expect(backgroundOccluderSpawnChanceForAct(-1)).toBe(0);
  });

  it("lets late regular enemies emerge from visible occluders larger than their body", () => {
    resetState();
    state.enemyDirector.act = BACKGROUND_OCCLUDER_TEST_ACT;
    state.elapsed = OCCLUDER_TEST_ELAPSED;
    vi.spyOn(Math, "random").mockReturnValue(FIRST_RANDOM_VALUE);

    expect(spawnEnemyById("runner", "regular", "left")).toBe(true);

    const runner = state.enemies[0];
    const coverSize = enemyVisualSize(
      runner.sheetIndex,
      enemyArchetypeForSheet(runner.sheetIndex),
    );
    const fittingOccluders = resolveNearForegroundOccluders({
      elapsed: state.elapsed,
      bossPreludeElapsed: null,
      act: state.enemyDirector.act,
    }).filter((occluder) => (
      occluder.x < WIDTH
      && occluder.x + occluder.drawW > 0
      && occluder.drawW > coverSize.w
      && occluder.drawH > coverSize.h
      && occluderCenterX(occluder) >= coverSize.w / HALF_DIVISOR
      && occluderCenterX(occluder) <= WIDTH - coverSize.w / HALF_DIVISOR
      && (
        occluder.x + occluder.drawW <= state.player.x
        || occluder.x >= state.player.x + state.player.w
      )
    ));
    const expectedOccluder = fittingOccluders.find((occluder) => occluder.source === "actProp")
      ?? fittingOccluders[0];

    if (!expectedOccluder) throw new Error("expected at least one fitting occluder");

    expect(runner.onPlatform).toBeNull();
    expect(runner.spawnOccluder).toEqual(expectedOccluder);
    expect(runner.spawnOccluderFrames).toBe(ENEMY_BACKGROUND_SPAWN.coverFrames + 1);
    expect(runner.spawnOccluderStartedAt).toBe(OCCLUDER_TEST_ELAPSED);
    expect(runner.y + runner.h).toBe(GROUND_Y);
    expect(runner.x + runner.w / HALF_DIVISOR).toBeCloseTo(occluderCenterX(expectedOccluder));
    expect(expectedOccluder.drawW).toBeGreaterThan(coverSize.w);
    expect(expectedOccluder.drawH).toBeGreaterThan(coverSize.h);
    expect(
      expectedOccluder.x + expectedOccluder.drawW <= state.player.x
      || expectedOccluder.x >= state.player.x + state.player.w,
    ).toBe(true);

    updateEnemies();

    expect(runner.spawnOccluderFrames).toBe(ENEMY_BACKGROUND_SPAWN.coverFrames);
  });

  it("lets early regular enemies emerge from act scenery", () => {
    resetState();
    state.enemyDirector.act = INTRO_OCCLUDER_TEST_ACT;
    state.elapsed = OCCLUDER_TEST_ELAPSED;
    vi.spyOn(Math, "random").mockReturnValue(FIRST_RANDOM_VALUE);

    expect(spawnEnemyById("runner", "regular", "left")).toBe(true);

    const runner = state.enemies[0];
    expect(runner.y + runner.h).toBe(GROUND_Y);
    expect(runner.onPlatform).toBeNull();
    expect(runner.spawnOccluder?.source).toBe("actProp");
    expect(runner.spawnOccluderFrames).toBe(ENEMY_BACKGROUND_SPAWN.coverFrames + 1);
    expect(runner.spawnOccluderStartedAt).toBe(OCCLUDER_TEST_ELAPSED);
    expect(runner.x).not.toBe(ENEMY_CONFIG.spawnOffsetLeft);
  });

  it("keeps airborne enemies on their dedicated entry path", () => {
    resetState();
    state.enemyDirector.act = BACKGROUND_OCCLUDER_TEST_ACT;
    state.elapsed = OCCLUDER_TEST_ELAPSED;
    vi.spyOn(Math, "random").mockReturnValue(FIRST_RANDOM_VALUE);

    expect(spawnEnemyById("glider", "regular", "left")).toBe(true);

    const glider = state.enemies[0];
    expect(glider.spawnOccluder).toBeUndefined();
    expect(glider.spawnOccluderFrames).toBeUndefined();
    expect(glider.spawnOccluderStartedAt).toBeUndefined();
  });

  it.each(["leaper", "burrower"] as const)(
    "lets the ground-starting %s use act scenery",
    (enemyId) => {
      resetState();
      state.enemyDirector.act = BACKGROUND_OCCLUDER_TEST_ACT;
      state.elapsed = OCCLUDER_TEST_ELAPSED;
      vi.spyOn(Math, "random").mockReturnValue(FIRST_RANDOM_VALUE);

      expect(spawnEnemyById(enemyId, "regular", "left")).toBe(true);
      expect(state.enemies[0].spawnOccluder?.source).toBe("actProp");
    },
  );

  it("does not redraw a wide spawn prop over the player", () => {
    resetState();
    state.enemyDirector.act = BACKGROUND_OCCLUDER_TEST_ACT;
    state.elapsed = OCCLUDER_TEST_ELAPSED;
    state.player.x = PLAYER_OVERLAP_ACT_PROP_X;
    vi.spyOn(Math, "random").mockReturnValue(FIRST_RANDOM_VALUE);

    expect(spawnEnemyById("runner", "regular", "left")).toBe(true);

    const occluder = state.enemies[0].spawnOccluder;
    if (!occluder) throw new Error("expected a clear background occluder");
    expect(
      occluder.x + occluder.drawW <= state.player.x
      || occluder.x >= state.player.x + state.player.w,
    ).toBe(true);
  });

  it("captures the first actual retreat direction for the reveal", () => {
    resetState();
    state.enemyDirector.act = AWAKENED_ACT;
    state.elapsed = OCCLUDER_TEST_ELAPSED;
    state.player.x = RANGED_RETREAT_PLAYER_X;
    vi.spyOn(Math, "random").mockReturnValue(FIRST_RANDOM_VALUE);

    expect(spawnEnemyById("caster", "regular", "left")).toBe(true);

    const caster = state.enemies[0];
    expect(caster.spawnOccluder?.source).toBe("actProp");
    expect(caster.spawnOccluderDirectionPending).toBe(true);
    expect(caster.spawnOccluderDirection).toBe(-1);

    updateEnemies();

    expect(caster.vx).toBeGreaterThan(0);
    expect(caster.spawnOccluderDirection).toBe(1);
    expect(caster.spawnOccluderDirectionPending).toBe(false);
  });
});
