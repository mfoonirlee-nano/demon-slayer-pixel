import { describe, expect, it } from "vitest";
import type { EnemyId } from "../types/game-state";
import { enemySpawnStats } from "./enemyDirector";
import { baseAttackForLevel, maxHpForLevel } from "./playerStatGrowth";

const INTRO_BOSS_KILLS = 0;
const INTRO_ELAPSED_SECONDS = 0;
const LEVEL_ONE = 1;
const MIN_RANDOM_ROLL = 0;
const FINAL_BOSS_KILLS = 12;
const FINAL_PLAYER_LEVEL = 13;
const MIN_FINAL_DURABILITY_TIERS = 5;
const MAX_FINAL_BASIC_ATTACKS_TO_DEFEAT = 30;
const MIN_FINAL_BASE_DAMAGE_RATIO = 0.04;
const MAX_FINAL_BASE_DAMAGE_RATIO = 0.15;
const MEDIUM_DURABILITY_ATTACKS = 3;
const CORE_DURABILITY_ATTACKS = 4;
const HEAVY_DURABILITY_ATTACKS = 5;
const SUPPORT_BASE_DAMAGE_RATIO = 0.04;
const LIGHT_BASE_DAMAGE_RATIO = 0.06;
const AERIAL_BASE_DAMAGE_RATIO = 0.07;
const STANDARD_BASE_DAMAGE_RATIO = 0.08;
const BURST_BASE_DAMAGE_RATIO = 0.09;
const HEAVY_BASE_DAMAGE_RATIO = 0.1;
const MIN_FINAL_HP_RETENTION_RATIO = 0.99;
const MAX_FINAL_HP_RETENTION_RATIO = 1.04;
// Fixed pre-retune outputs prove the new bases move durability forward without growing the final wall.
const LEGACY_FINAL_CHASER_HP = 294;
const LEGACY_FINAL_CRAWLER_HP = 197;
const LEGACY_FINAL_RUNNER_HP = 221;
const LEGACY_FINAL_DUELIST_HP = 392;
const LEGACY_FINAL_CASTER_HP = 342;
const LEGACY_FINAL_LEAPER_HP = 327;
const LEGACY_FINAL_GLIDER_HP = 286;
const LEGACY_FINAL_SPLITTER_HP = 489;
const LEGACY_FINAL_BRUTE_HP = 913;
const LEGACY_FINAL_BURROWER_HP = 294;
const LEGACY_FINAL_BINDER_HP = 309;
const LEGACY_FINAL_WARDEN_HP = 456;

const FINAL_ENEMY_ROSTER = [
  "duelist",
  "caster",
  "leaper",
  "glider",
  "splitter",
  "brute",
  "burrower",
  "binder",
  "warden",
] as const satisfies readonly EnemyId[];

const LEGACY_FINAL_HP_BY_ENEMY = [
  ["chaser", LEGACY_FINAL_CHASER_HP],
  ["crawler", LEGACY_FINAL_CRAWLER_HP],
  ["runner", LEGACY_FINAL_RUNNER_HP],
  ["duelist", LEGACY_FINAL_DUELIST_HP],
  ["caster", LEGACY_FINAL_CASTER_HP],
  ["leaper", LEGACY_FINAL_LEAPER_HP],
  ["glider", LEGACY_FINAL_GLIDER_HP],
  ["splitter", LEGACY_FINAL_SPLITTER_HP],
  ["brute", LEGACY_FINAL_BRUTE_HP],
  ["burrower", LEGACY_FINAL_BURROWER_HP],
  ["binder", LEGACY_FINAL_BINDER_HP],
  ["warden", LEGACY_FINAL_WARDEN_HP],
] as const satisfies readonly (readonly [EnemyId, number])[];

const INTRO_BASIC_ATTACKS_TO_DEFEAT = [
  ["crawler", 1],
  ["chaser", 2],
  ["runner", 2],
  ["glider", 2],
  ["duelist", MEDIUM_DURABILITY_ATTACKS],
  ["caster", MEDIUM_DURABILITY_ATTACKS],
  ["leaper", MEDIUM_DURABILITY_ATTACKS],
  ["burrower", MEDIUM_DURABILITY_ATTACKS],
  ["binder", MEDIUM_DURABILITY_ATTACKS],
  ["splitter", CORE_DURABILITY_ATTACKS],
  ["warden", CORE_DURABILITY_ATTACKS],
  ["brute", HEAVY_DURABILITY_ATTACKS],
] as const satisfies readonly (readonly [EnemyId, number])[];

const INTRO_BASE_DAMAGE_RATIOS = [
  ["warden", SUPPORT_BASE_DAMAGE_RATIO],
  ["crawler", LIGHT_BASE_DAMAGE_RATIO],
  ["caster", LIGHT_BASE_DAMAGE_RATIO],
  ["splitter", LIGHT_BASE_DAMAGE_RATIO],
  ["binder", LIGHT_BASE_DAMAGE_RATIO],
  ["glider", AERIAL_BASE_DAMAGE_RATIO],
  ["chaser", STANDARD_BASE_DAMAGE_RATIO],
  ["duelist", STANDARD_BASE_DAMAGE_RATIO],
  ["leaper", STANDARD_BASE_DAMAGE_RATIO],
  ["runner", BURST_BASE_DAMAGE_RATIO],
  ["burrower", BURST_BASE_DAMAGE_RATIO],
  ["brute", HEAVY_BASE_DAMAGE_RATIO],
] as const satisfies readonly (readonly [EnemyId, number])[];

function basicAttacksToDefeat(enemyId: EnemyId) {
  const enemyHp = enemySpawnStats(
    enemyId,
    INTRO_BOSS_KILLS,
    INTRO_ELAPSED_SECONDS,
    () => MIN_RANDOM_ROLL,
  ).hp;

  return Math.ceil(enemyHp / baseAttackForLevel(LEVEL_ONE));
}

describe("enemy combat balance", () => {
  it("gives intro enemies distinct durability roles against the level-one basic attack", () => {
    for (const [enemyId, expectedAttackCount] of INTRO_BASIC_ATTACKS_TO_DEFEAT) {
      expect(basicAttacksToDefeat(enemyId), enemyId).toBe(expectedAttackCount);
    }
  });

  it("makes each intro enemy's base damage register against level-one max health", () => {
    const playerMaxHp = maxHpForLevel(LEVEL_ONE);

    for (const [enemyId, expectedDamageRatio] of INTRO_BASE_DAMAGE_RATIOS) {
      const damage = enemySpawnStats(
        enemyId,
        INTRO_BOSS_KILLS,
        INTRO_ELAPSED_SECONDS,
        () => MIN_RANDOM_ROLL,
      ).damage;

      expect(damage / playerMaxHp, enemyId).toBeCloseTo(expectedDamageRatio);
    }
  });

  it("keeps final-act body durability and base damage strong but bounded", () => {
    const playerAttack = baseAttackForLevel(FINAL_PLAYER_LEVEL);
    const playerMaxHp = maxHpForLevel(FINAL_PLAYER_LEVEL);
    const durabilityTiers = new Set<number>();

    for (const enemyId of FINAL_ENEMY_ROSTER) {
      const stats = enemySpawnStats(
        enemyId,
        FINAL_BOSS_KILLS,
        INTRO_ELAPSED_SECONDS,
        () => MIN_RANDOM_ROLL,
      );
      const attacksToDefeat = Math.ceil(stats.hp / playerAttack);
      durabilityTiers.add(attacksToDefeat);

      expect(attacksToDefeat, enemyId).toBeLessThanOrEqual(MAX_FINAL_BASIC_ATTACKS_TO_DEFEAT);
      expect(stats.damage / playerMaxHp, enemyId).toBeGreaterThanOrEqual(
        MIN_FINAL_BASE_DAMAGE_RATIO,
      );
      expect(stats.damage / playerMaxHp, enemyId).toBeLessThanOrEqual(
        MAX_FINAL_BASE_DAMAGE_RATIO,
      );
    }

    expect(durabilityTiers.size).toBeGreaterThanOrEqual(MIN_FINAL_DURABILITY_TIERS);
  });

  it("retains each enemy's pre-tune final-act body health", () => {
    for (const [enemyId, legacyHp] of LEGACY_FINAL_HP_BY_ENEMY) {
      const currentHp = enemySpawnStats(
        enemyId,
        FINAL_BOSS_KILLS,
        INTRO_ELAPSED_SECONDS,
        () => MIN_RANDOM_ROLL,
      ).hp;
      const retentionRatio = currentHp / legacyHp;

      expect(retentionRatio, enemyId).toBeGreaterThanOrEqual(MIN_FINAL_HP_RETENTION_RATIO);
      expect(retentionRatio, enemyId).toBeLessThanOrEqual(MAX_FINAL_HP_RETENTION_RATIO);
    }
  });
});
