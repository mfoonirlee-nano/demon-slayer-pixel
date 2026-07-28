import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GROUND_Y, HEIGHT, SKILL_IDS } from "../../constants";
import * as collisionDebug from "../../game/collisionDebug";
import { resetState, state } from "../../game/state";
import type { ActBand, EnemyState, SkillLevel } from "../../types/game-state";
import { spawnEnemyById, updateEnemies } from "../enemy";
import { applyEnemyDamage } from "../../systems/combatResolution";
import {
  damageEnemy,
  recordEliteBruteProtectionCollisionDebug,
} from "./common";

const SHIELD_TEST_DAMAGE = 30;
const HIGH_SHIELD_TEST_DAMAGE = 60;
const LOW_SHIELD_HP = 12;
const ARMOR_BREAK_PASSIVE_LEVEL = 3;
const ARMOR_BREAK_LEVEL_BEFORE_PASSIVE = 2;
const ARMOR_BREAK_SHIELD_PENETRATION = 0.5;
const SHIELD_HIT_SOURCE_OFFSET = 12;
const FINAL_REFLECT_RATIO = 0.25;
const FINAL_REFLECT_CAP = 12;
const TEST_BRUTE_X = 520;
const TEST_PLAYER_X = 40;
const TEST_GUARD_FRAMES = 20;
const TEST_COUNTER_ACTIVE_FRAMES = 72;
const ELITE_PROTECTION_DAMAGE_SCALE = 0.86;
const ELITE_PROTECTION_RANGE = 190;
const CROWDED_ENEMY_COUNT = 16;
const ELITE_PROTECTION_ALLY_OFFSET = 100;

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

function equipArmorBreak(level: SkillLevel = ARMOR_BREAK_PASSIVE_LEVEL) {
  state.player.skillLevels[SKILL_IDS.armorBreak] = level;
  state.player.equippedSkillIds[0] = SKILL_IDS.armorBreak;
}

function frontSourceX(brute: ReturnType<typeof spawnBrute>) {
  brute.bruteFacing = 1;
  return brute.x + brute.w + SHIELD_HIT_SOURCE_OFFSET;
}

function backSourceX(brute: ReturnType<typeof spawnBrute>) {
  brute.bruteFacing = 1;
  return brute.x - SHIELD_HIT_SOURCE_OFFSET;
}

afterEach(() => {
  vi.restoreAllMocks();
});

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

  it("lets the equipped level-three armor break passive pierce half of frontal shield damage", () => {
    const brute = spawnBrute();
    const hpBefore = brute.hp;
    const shieldBefore = brute.bruteShieldHp ?? 0;
    equipArmorBreak();

    applyEnemyDamage(brute, SHIELD_TEST_DAMAGE, undefined, "normal", frontSourceX(brute));

    const penetratingDamage = SHIELD_TEST_DAMAGE * ARMOR_BREAK_SHIELD_PENETRATION;
    expect(brute.hp).toBeCloseTo(hpBefore - penetratingDamage);
    expect(brute.bruteShieldHp).toBeCloseTo(shieldBefore - penetratingDamage);
    expect(brute.bruteShieldBroken).toBe(false);
  });

  it("keeps frontal damage fully blocked before the armor break passive level", () => {
    const brute = spawnBrute();
    const hpBefore = brute.hp;
    const shieldBefore = brute.bruteShieldHp ?? 0;
    equipArmorBreak(ARMOR_BREAK_LEVEL_BEFORE_PASSIVE);

    applyEnemyDamage(brute, SHIELD_TEST_DAMAGE, undefined, "normal", frontSourceX(brute));

    expect(brute.hp).toBe(hpBefore);
    expect(brute.bruteShieldHp).toBeCloseTo(shieldBefore - SHIELD_TEST_DAMAGE);
  });

  it("keeps frontal damage fully blocked while level-three armor break is unequipped", () => {
    const brute = spawnBrute();
    const hpBefore = brute.hp;
    const shieldBefore = brute.bruteShieldHp ?? 0;
    state.player.skillLevels[SKILL_IDS.armorBreak] = ARMOR_BREAK_PASSIVE_LEVEL;

    applyEnemyDamage(brute, SHIELD_TEST_DAMAGE, undefined, "normal", frontSourceX(brute));

    expect(brute.hp).toBe(hpBefore);
    expect(brute.bruteShieldHp).toBeCloseTo(shieldBefore - SHIELD_TEST_DAMAGE);
  });

  it("does not shield damage from behind", () => {
    const brute = spawnBrute();
    const hpBefore = brute.hp;
    const shieldBefore = brute.bruteShieldHp ?? 0;
    equipArmorBreak();

    applyEnemyDamage(brute, SHIELD_TEST_DAMAGE, undefined, "normal", backSourceX(brute));

    expect(brute.hp).toBeCloseTo(hpBefore - SHIELD_TEST_DAMAGE);
    expect(brute.bruteShieldHp).toBe(shieldBefore);
    expect(brute.bruteShieldBroken).toBe(false);
  });

  it("does not grant the player passive to damage outside the player damage boundary", () => {
    const brute = spawnBrute();
    const hpBefore = brute.hp;
    const shieldBefore = brute.bruteShieldHp ?? 0;
    equipArmorBreak();

    damageEnemy(brute, SHIELD_TEST_DAMAGE, undefined, "normal", frontSourceX(brute));

    expect(brute.hp).toBe(hpBefore);
    expect(brute.bruteShieldHp).toBeCloseTo(shieldBefore - SHIELD_TEST_DAMAGE);
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

  it("reflects only the shield half of armor break passive damage during final guard", () => {
    const brute = spawnBrute("final");
    guardWithShield(brute);
    equipArmorBreak();
    const hpBefore = state.player.hp;

    applyEnemyDamage(brute, SHIELD_TEST_DAMAGE, undefined, "normal", frontSourceX(brute));
    updateEnemies();

    const shieldDamage = SHIELD_TEST_DAMAGE * (1 - ARMOR_BREAK_SHIELD_PENETRATION);
    expect(state.player.hp).toBeCloseTo(hpBefore - shieldDamage * FINAL_REFLECT_RATIO);
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
    equipArmorBreak();
    const playerHpBefore = state.player.hp;
    const bruteHpBefore = brute.hp;

    applyEnemyDamage(brute, SHIELD_TEST_DAMAGE, undefined, "armorBreak", frontSourceX(brute));
    updateEnemies();

    expect(state.player.hp).toBe(playerHpBefore);
    expect(brute.hp).toBe(bruteHpBefore);
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

describe("elite brute protection", () => {
  beforeEach(() => {
    resetState();
  });

  it("reduces damage for a nearby ally only while the elite shield is active", () => {
    const brute = spawnBrute();
    brute.elite = true;
    brute.x = 300;
    expect(spawnEnemyById("chaser", "debug", "left")).toBe(true);
    const ally = state.enemies[1];
    ally.x = brute.x + ELITE_PROTECTION_ALLY_OFFSET;

    expect(damageEnemy(ally, SHIELD_TEST_DAMAGE)).toBeCloseTo(
      SHIELD_TEST_DAMAGE * ELITE_PROTECTION_DAMAGE_SCALE,
    );

    brute.bruteShieldBroken = true;
    expect(damageEnemy(ally, SHIELD_TEST_DAMAGE)).toBeCloseTo(SHIELD_TEST_DAMAGE);
  });

  it("records the active elite protection band and removes it with the shield", () => {
    const brute = spawnBrute();
    brute.elite = true;
    guardWithShield(brute);
    const recordRect = vi.spyOn(collisionDebug, "recordCollisionDebugRect")
      .mockImplementation(() => {});

    recordEliteBruteProtectionCollisionDebug();

    expect(recordRect).toHaveBeenCalledWith(
      {
        x: brute.x + brute.w / 2 - ELITE_PROTECTION_RANGE,
        y: 0,
        w: ELITE_PROTECTION_RANGE * 2,
        h: HEIGHT,
      },
      "supportRange",
    );

    brute.bruteShieldBroken = true;
    recordRect.mockClear();
    recordEliteBruteProtectionCollisionDebug();

    expect(recordRect).not.toHaveBeenCalledWith(
      expect.any(Object),
      "supportRange",
    );
  });

  it("indexes elite protectors once for a crowded same-frame damage batch", () => {
    for (let index = 0; index < CROWDED_ENEMY_COUNT; index += 1) {
      expect(spawnEnemyById("chaser", "debug", "left")).toBe(true);
    }
    let enemyIdReads = 0;
    for (const enemy of state.enemies) {
      Object.defineProperty(enemy, "id", {
        configurable: true,
        get: () => {
          enemyIdReads += 1;
          return "chaser" satisfies EnemyState["id"];
        },
      });
    }

    for (const enemy of state.enemies) damageEnemy(enemy, 0);

    expect(enemyIdReads).toBeLessThanOrEqual(CROWDED_ENEMY_COUNT * 2);
  });
});
