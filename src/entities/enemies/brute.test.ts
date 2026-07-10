import { describe, expect, it, beforeEach } from "vitest";
import { GROUND_Y } from "../../constants";
import { resetState, state } from "../../game/state";
import type { ActBand } from "../../types/game-state";
import { spawnEnemyById, updateEnemies } from "../enemy";
import { applyEnemyDamage } from "../../systems/combatResolution";
import { damageEnemy } from "./common";

const SHIELD_TEST_DAMAGE = 30;
const HIGH_SHIELD_TEST_DAMAGE = 60;
const LOW_SHIELD_HP = 12;
const SHIELD_HIT_SOURCE_OFFSET = 12;
const FINAL_REFLECT_RATIO = 0.25;
const FINAL_REFLECT_CAP = 12;
const TEST_BRUTE_X = 520;
const TEST_PLAYER_X = 40;
const TEST_GUARD_FRAMES = 20;
const TEST_COUNTER_ACTIVE_FRAMES = 72;

function spawnBrute(growthStage: ActBand = "intro") {
  expect(spawnEnemyById("brute", "debug", "left", { growthStage })).toBe(true);
  return state.enemies[0];
}

function guardWithShield(brute: ReturnType<typeof spawnBrute>) {
  brute.x = TEST_BRUTE_X;
  brute.y = GROUND_Y - brute.h;
  brute.bruteFacing = 1;
  brute.brutePhase = "guard";
  brute.bruteTimer = TEST_GUARD_FRAMES;
  state.player.x = TEST_PLAYER_X;
  state.player.y = GROUND_Y - state.player.h;
}

function activateGuardCounter() {
  state.guardCounterEffect = {
    elapsed: 0,
    frame: 0,
    hitsRemaining: 1,
    maxHits: 1,
    activeFrames: TEST_COUNTER_ACTIVE_FRAMES,
    counterPadding: 0,
    damageMultiplier: 1,
    barrierFlash: 0,
  };
}

function frontSourceX(brute: ReturnType<typeof spawnBrute>) {
  brute.bruteFacing = 1;
  return brute.x + brute.w + SHIELD_HIT_SOURCE_OFFSET;
}

function backSourceX(brute: ReturnType<typeof spawnBrute>) {
  brute.bruteFacing = 1;
  return brute.x - SHIELD_HIT_SOURCE_OFFSET;
}

describe("brute shield", () => {
  beforeEach(() => {
    resetState();
  });

  it("starts with shield hp at two times body hp", () => {
    const brute = spawnBrute();

    expect(brute.bruteShieldHp).toBeCloseTo(brute.hp * 2);
    expect(brute.bruteShieldBroken).toBe(false);
  });

  it("lets ultimate damage hit the shield instead of bypassing or breaking it", () => {
    const brute = spawnBrute();
    const hpBefore = brute.hp;
    const shieldBefore = brute.bruteShieldHp ?? 0;

    damageEnemy(brute, SHIELD_TEST_DAMAGE, undefined, "ultimate");

    expect(brute.hp).toBe(hpBefore);
    expect(brute.bruteShieldHp).toBeCloseTo(shieldBefore - SHIELD_TEST_DAMAGE);
    expect(brute.bruteShieldBroken).toBe(false);
    expect(brute.brutePhase).toBe("advance");
  });

  it("puts all frontal damage into the shield without spilling into body hp", () => {
    const brute = spawnBrute();
    const hpBefore = brute.hp;
    brute.bruteShieldHp = LOW_SHIELD_HP;

    applyEnemyDamage(brute, SHIELD_TEST_DAMAGE, undefined, "normal", frontSourceX(brute));

    expect(brute.hp).toBe(hpBefore);
    expect(brute.bruteShieldHp).toBe(0);
    expect(brute.bruteShieldBroken).toBe(true);
    expect(brute.brutePhase).toBe("shieldBreak");
  });

  it("does not shield damage from behind", () => {
    const brute = spawnBrute();
    const hpBefore = brute.hp;
    const shieldBefore = brute.bruteShieldHp ?? 0;

    damageEnemy(brute, SHIELD_TEST_DAMAGE, undefined, "normal", backSourceX(brute));

    expect(brute.hp).toBeCloseTo(hpBefore - SHIELD_TEST_DAMAGE);
    expect(brute.bruteShieldHp).toBe(shieldBefore);
    expect(brute.bruteShieldBroken).toBe(false);
  });

  it("breaks the shield with armor_break without damaging the body", () => {
    const brute = spawnBrute();
    const hpBefore = brute.hp;

    damageEnemy(brute, SHIELD_TEST_DAMAGE, undefined, "armorBreak");

    expect(brute.hp).toBe(hpBefore);
    expect(brute.bruteShieldHp).toBe(0);
    expect(brute.bruteShieldBroken).toBe(true);
    expect(brute.brutePhase).toBe("shieldBreak");
  });

  it("reflects a share of frontal shield damage during final guard", () => {
    const brute = spawnBrute("final");
    guardWithShield(brute);
    const hpBefore = state.player.hp;

    applyEnemyDamage(brute, SHIELD_TEST_DAMAGE, undefined, "normal", frontSourceX(brute));
    updateEnemies();

    expect(state.player.hp).toBeCloseTo(
      hpBefore - Math.min(FINAL_REFLECT_CAP, SHIELD_TEST_DAMAGE * FINAL_REFLECT_RATIO),
    );
  });

  it("caps reflected guard damage", () => {
    const brute = spawnBrute("final");
    guardWithShield(brute);
    const hpBefore = state.player.hp;

    applyEnemyDamage(brute, HIGH_SHIELD_TEST_DAMAGE, undefined, "normal", frontSourceX(brute));
    updateEnemies();

    expect(state.player.hp).toBe(hpBefore - FINAL_REFLECT_CAP);
  });

  it("does not reflect shield damage before the final stage", () => {
    const brute = spawnBrute("awakened");
    guardWithShield(brute);
    const hpBefore = state.player.hp;

    applyEnemyDamage(brute, SHIELD_TEST_DAMAGE, undefined, "normal", frontSourceX(brute));
    updateEnemies();

    expect(state.player.hp).toBe(hpBefore);
  });

  it("does not reflect final-stage damage outside guard or from behind", () => {
    const brute = spawnBrute("final");
    guardWithShield(brute);
    const hpBefore = state.player.hp;

    applyEnemyDamage(brute, SHIELD_TEST_DAMAGE, undefined, "normal", backSourceX(brute));
    updateEnemies();
    expect(state.player.hp).toBe(hpBefore);

    brute.brutePhase = "advance";
    applyEnemyDamage(brute, SHIELD_TEST_DAMAGE, undefined, "normal", frontSourceX(brute));
    updateEnemies();
    expect(state.player.hp).toBe(hpBefore);
  });

  it("does not reflect armor break damage", () => {
    const brute = spawnBrute("final");
    guardWithShield(brute);
    const hpBefore = state.player.hp;

    applyEnemyDamage(brute, SHIELD_TEST_DAMAGE, undefined, "armorBreak", frontSourceX(brute));
    updateEnemies();

    expect(state.player.hp).toBe(hpBefore);
    expect(brute.bruteShieldBroken).toBe(true);
  });

  it("does not reflect the normal hit that breaks the shield", () => {
    const brute = spawnBrute("final");
    guardWithShield(brute);
    brute.bruteShieldHp = LOW_SHIELD_HP;
    const hpBefore = state.player.hp;

    applyEnemyDamage(brute, SHIELD_TEST_DAMAGE, undefined, "normal", frontSourceX(brute));
    updateEnemies();

    expect(state.player.hp).toBe(hpBefore);
    expect(brute.bruteShieldBroken).toBe(true);
  });

  it("still settles earlier guard reflection when a later hit breaks the shield", () => {
    const brute = spawnBrute("final");
    guardWithShield(brute);
    brute.bruteShieldHp = SHIELD_TEST_DAMAGE + LOW_SHIELD_HP;
    const hpBefore = state.player.hp;

    applyEnemyDamage(brute, SHIELD_TEST_DAMAGE, undefined, "normal", frontSourceX(brute));
    applyEnemyDamage(brute, SHIELD_TEST_DAMAGE, undefined, "normal", frontSourceX(brute));
    updateEnemies();

    expect(brute.bruteShieldBroken).toBe(true);
    expect(state.player.hp).toBeCloseTo(
      hpBefore - SHIELD_TEST_DAMAGE * FINAL_REFLECT_RATIO,
    );
  });

  it("does not reflect non-player damage absorbed by the final guard", () => {
    const brute = spawnBrute("final");
    guardWithShield(brute);
    const hpBefore = state.player.hp;

    damageEnemy(brute, SHIELD_TEST_DAMAGE, undefined, "normal", frontSourceX(brute));
    updateEnemies();

    expect(state.player.hp).toBe(hpBefore);
  });

  it("lets guard counter block reflection without queuing recursive reflection", () => {
    const brute = spawnBrute("final");
    guardWithShield(brute);
    brute.x = state.player.x;
    brute.y = state.player.y;
    activateGuardCounter();
    const hpBefore = state.player.hp;

    applyEnemyDamage(brute, SHIELD_TEST_DAMAGE, undefined, "normal", frontSourceX(brute));
    updateEnemies();

    expect(state.player.hp).toBe(hpBefore);
    expect(state.bruteGuardReflections).toHaveLength(0);
    expect(state.guardCounterEffect?.hitsRemaining).toBe(0);
    expect(state.guardCounterEffect?.barrierFlash ?? 0).toBeGreaterThan(0);

    brute.x = TEST_BRUTE_X;
    brute.y = GROUND_Y - brute.h;
    state.player.invincible = 0;
    updateEnemies();

    expect(state.player.hp).toBe(hpBefore);
    expect(state.bruteGuardReflections).toHaveLength(0);
  });
});
