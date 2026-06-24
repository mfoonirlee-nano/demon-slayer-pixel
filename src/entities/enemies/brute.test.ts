import { describe, expect, it, beforeEach } from "vitest";
import { resetState, state } from "../../game/state";
import { spawnEnemyById } from "../enemy";
import { damageEnemy } from "./common";

const SHIELD_TEST_DAMAGE = 30;

function spawnBrute() {
  expect(spawnEnemyById("brute", "debug", "left")).toBe(true);
  return state.enemies[0];
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
