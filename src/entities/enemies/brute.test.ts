import { describe, expect, it, beforeEach } from "vitest";
import { resetState, state } from "../../game/state";
import { spawnEnemyById } from "../enemy";
import { damageEnemy } from "./common";

const SHIELD_TEST_DAMAGE = 30;
const LOW_SHIELD_HP = 12;
const SHIELD_HIT_SOURCE_OFFSET = 12;

function spawnBrute() {
  expect(spawnEnemyById("brute", "debug", "left")).toBe(true);
  return state.enemies[0];
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

    damageEnemy(brute, SHIELD_TEST_DAMAGE, undefined, "normal", frontSourceX(brute));

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
});
