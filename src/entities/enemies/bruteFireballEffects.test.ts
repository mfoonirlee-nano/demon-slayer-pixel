import { beforeEach, describe, expect, it } from "vitest";
import {
  BRUTE_FIREBALL_EXPLOSION_SHEET,
  BRUTE_FIREBALL_LAUNCH_SHEET,
  BRUTE_FIREBALL_ROLL_SHEET,
  GROUND_Y,
  WIDTH,
} from "../../constants";
import { resetState, state } from "../../game/state";
import type { ActBand, BruteFireballPhase, PlatformState } from "../../types/game-state";
import { spawnEnemyById, updateEnemies } from "../enemy";
import {
  BRUTE_FIREBALL_CONFIG,
  spawnBruteFireballs,
  updateBruteFireballEffects,
} from "./bruteFireballEffects";

const SHIELD_BASH_TRIGGER_TIMER = 10;
const SHIELD_BASH_PRE_TRIGGER_TIMER = 11;
const TEST_BRUTE_X = 220;
const TEST_PLAYER_X = 720;
const TEST_PLAYER_LEFT_X = 40;
const MAX_TRANSITION_FRAMES = 240;
const TEST_PLATFORM_Y_OFFSET = 140;
const TEST_PLATFORM_Y = GROUND_Y - TEST_PLATFORM_Y_OFFSET;
const TEST_PLATFORM_X = 180;
const TEST_PLATFORM_W = 150;
const TEST_PLATFORM_H = 24;

function testPlatform(): PlatformState {
  return {
    x: TEST_PLATFORM_X,
    y: TEST_PLATFORM_Y,
    w: TEST_PLATFORM_W,
    h: TEST_PLATFORM_H,
    vx: 0,
    phase: 0,
    style: "stone",
    kind: "normal",
    spriteIndex: 0,
    trim: 0,
    notch: 0,
    hoverAmplitude: 0,
    baseY: TEST_PLATFORM_Y,
  };
}

function prepareShieldBash(growthStage: ActBand, facing = 1) {
  expect(spawnEnemyById("brute", "debug", "left", { growthStage })).toBe(true);
  const brute = state.enemies[0];
  brute.x = TEST_BRUTE_X;
  brute.y = GROUND_Y - brute.h;
  brute.vx = 0;
  brute.vy = 0;
  brute.bruteFacing = facing;
  brute.brutePhase = "shieldBash";
  brute.bruteTimer = SHIELD_BASH_TRIGGER_TIMER;
  brute.bruteAttackHit = false;
  state.player.x = facing > 0 ? TEST_PLAYER_X : TEST_PLAYER_LEFT_X;
  state.player.y = GROUND_Y - state.player.h;
  return brute;
}

function forceShieldBash(growthStage: ActBand, facing = 1) {
  const brute = prepareShieldBash(growthStage, facing);
  updateEnemies();
  return brute;
}

function advanceUntil(predicate: () => boolean) {
  for (let frame = 0; frame < MAX_TRANSITION_FRAMES; frame += 1) {
    if (predicate()) return;
    updateBruteFireballEffects();
  }
  throw new Error("Brute fireball did not reach the expected phase");
}

function phaseFrameSets(): Record<BruteFireballPhase, Set<number>> {
  return {
    launch: new Set(),
    roll: new Set(),
    explode: new Set(),
  };
}

function expectedFrames(count: number) {
  return Array.from({ length: count }, (_, index) => index);
}

describe("brute fireballs", () => {
  beforeEach(() => {
    resetState();
  });

  it.each([
    ["intro", 0],
    ["awakened", 1],
    ["final", 2],
  ] as const)("spawns the stage-specific volley for %s", (growthStage, expectedCount) => {
    forceShieldBash(growthStage);

    expect(state.bruteFireballs).toHaveLength(expectedCount);
  });

  it("spawns distinct near and far final fireballs only once per shield bash", () => {
    forceShieldBash("final");

    const [near, far] = state.bruteFireballs;
    expect(near.targetX).toBeLessThan(far.targetX);
    expect(near.rollSpeed).not.toBe(far.rollSpeed);
    expect(near.vx).not.toBe(far.vx);

    updateEnemies();
    expect(state.bruteFireballs).toHaveLength(2);
  });

  it("spawns a new volley after returning to a later shield bash", () => {
    const brute = forceShieldBash("awakened");
    expect(state.bruteFireballs).toHaveLength(1);

    brute.brutePhase = "recover";
    brute.bruteTimer = 1;
    updateEnemies();
    state.player.x = brute.x + brute.w;
    updateEnemies();
    expect(brute.brutePhase).toBe("guard");

    brute.bruteTimer = 1;
    updateEnemies();
    brute.bruteTimer = SHIELD_BASH_TRIGGER_TIMER;
    updateEnemies();

    expect(state.bruteFireballs).toHaveLength(2);
  });

  it("spawns at the shield-bash keyframe, not one frame early", () => {
    const brute = prepareShieldBash("awakened");
    brute.bruteTimer = SHIELD_BASH_PRE_TRIGGER_TIMER;

    updateEnemies();
    expect(state.bruteFireballs).toHaveLength(0);

    updateEnemies();
    expect(state.bruteFireballs).toHaveLength(1);
  });

  it("orders near and far targets correctly when firing left", () => {
    forceShieldBash("final", -1);

    const [near, far] = state.bruteFireballs;
    expect(near.targetX).toBeGreaterThan(far.targetX);
    expect(Math.abs(near.targetX - near.x)).toBeLessThan(Math.abs(far.targetX - far.x));
  });

  it("keeps final targets distinct when firing out of either screen edge", () => {
    const rightBrute = prepareShieldBash("final");
    rightBrute.x = WIDTH - rightBrute.w / 2;
    updateEnemies();
    const [rightNear, rightFar] = state.bruteFireballs;
    expect(rightNear.targetX).toBeLessThan(rightFar.targetX);

    resetState();
    const leftBrute = prepareShieldBash("final", -1);
    leftBrute.x = -leftBrute.w / 2;
    updateEnemies();
    const [leftNear, leftFar] = state.bruteFireballs;
    expect(leftNear.targetX).toBeGreaterThan(leftFar.targetX);
  });

  it("caps active fireballs across repeated final volleys", () => {
    const brute = forceShieldBash("final");

    spawnBruteFireballs(brute);
    spawnBruteFireballs(brute);

    expect(state.bruteFireballs).toHaveLength(BRUTE_FIREBALL_CONFIG.maxActive);
  });

  it("does not truncate a final volley to a single fireball when only one slot remains", () => {
    const brute = forceShieldBash("final");
    spawnBruteFireballs(brute);
    state.bruteFireballs.pop();
    expect(state.bruteFireballs).toHaveLength(BRUTE_FIREBALL_CONFIG.maxActive - 1);

    spawnBruteFireballs(brute);

    expect(state.bruteFireballs).toHaveLength(BRUTE_FIREBALL_CONFIG.maxActive - 1);
  });

  it("advances from launch to roll to explosion and removes the finished effect", () => {
    forceShieldBash("awakened");
    const effect = state.bruteFireballs[0];

    advanceUntil(() => effect.phase === "roll");
    expect(effect.y + effect.h).toBe(effect.groundY);

    advanceUntil(() => effect.phase === "explode");
    advanceUntil(() => state.bruteFireballs.length === 0);

    expect(state.bruteFireballs).toHaveLength(0);
  });

  it("runs both final fireballs through every phase", () => {
    forceShieldBash("final");
    const effects = [...state.bruteFireballs];
    const seenPhases = effects.map(() => new Set<string>());
    const seenFrames = effects.map(phaseFrameSets);

    for (let frame = 0; frame < MAX_TRANSITION_FRAMES; frame += 1) {
      effects.forEach((effect, index) => {
        seenPhases[index].add(effect.phase);
        seenFrames[index][effect.phase].add(effect.frame);
      });
      if (state.bruteFireballs.length === 0) break;
      updateBruteFireballEffects();
    }

    for (const phases of seenPhases) {
      expect(phases).toEqual(new Set(["launch", "roll", "explode"]));
    }
    for (const frames of seenFrames) {
      expect([...frames.launch]).toEqual(expectedFrames(BRUTE_FIREBALL_LAUNCH_SHEET.count));
      expect([...frames.roll]).toEqual(expectedFrames(BRUTE_FIREBALL_ROLL_SHEET.count));
      expect([...frames.explode]).toEqual(expectedFrames(BRUTE_FIREBALL_EXPLOSION_SHEET.count));
    }
    expect(state.bruteFireballs).toHaveLength(0);
  });

  it("falls to world ground after rolling off a platform", () => {
    const brute = prepareShieldBash("awakened");
    const platform = testPlatform();
    state.platforms.push(platform);
    brute.x = platform.x + TEST_PLATFORM_H;
    brute.y = platform.y - brute.h;
    brute.onPlatform = platform;
    updateEnemies();
    const effect = state.bruteFireballs[0];

    expect(effect.surface).toBe(platform);
    advanceUntil(() => effect.surface === null);
    expect(effect.groundY).toBe(GROUND_Y);
    expect(effect.y + effect.h).toBeLessThan(GROUND_Y);

    advanceUntil(() => effect.phase === "explode");
    expect(effect.y + effect.h).toBe(GROUND_Y);
  });

  it("gives final fireballs more damage and a larger explosion than awakened", () => {
    forceShieldBash("awakened");
    const awakened = state.bruteFireballs[0];

    resetState();
    forceShieldBash("final");

    for (const final of state.bruteFireballs) {
      expect(final.damage).toBeGreaterThan(awakened.damage);
      expect(final.explosionRadius).toBeGreaterThan(awakened.explosionRadius);
    }
  });

  it("deals damage once on the explosion keyframe, not while launching or rolling", () => {
    forceShieldBash("awakened");
    const effect = state.bruteFireballs[0];
    state.player.x = effect.targetX - state.player.w / 2;
    state.player.y = effect.groundY - state.player.h;
    const hpBefore = state.player.hp;

    advanceUntil(() => effect.phase === "explode");
    expect(state.player.hp).toBe(hpBefore);

    advanceUntil(() => effect.damageResolved);
    expect(effect.frame).toBe(BRUTE_FIREBALL_CONFIG.explosionDamageFrame);
    const hpAfterExplosion = state.player.hp;
    expect(hpAfterExplosion).toBeCloseTo(
      hpBefore
        - state.enemies[0].damage * BRUTE_FIREBALL_CONFIG.awakenedDamageMultiplier
        - BRUTE_FIREBALL_CONFIG.awakenedDamageBonus,
    );

    while (state.bruteFireballs.length > 0) {
      state.player.invincible = 0;
      updateBruteFireballEffects();
    }
    expect(state.player.hp).toBe(hpAfterExplosion);
  });

  it("does not deal delayed damage when the player enters after the explosion keyframe", () => {
    forceShieldBash("awakened");
    const effect = state.bruteFireballs[0];
    const hpBefore = state.player.hp;

    advanceUntil(() => effect.damageResolved);
    expect(state.player.hp).toBe(hpBefore);

    state.player.x = effect.targetX - state.player.w / 2;
    state.player.y = effect.groundY - state.player.h;
    state.player.invincible = 0;
    updateBruteFireballEffects();

    expect(state.player.hp).toBe(hpBefore);
  });

  it("clears active fireballs when the game state resets", () => {
    forceShieldBash("final");

    resetState();

    expect(state.bruteFireballs).toHaveLength(0);
  });
});
