import type {
  EnemyDirectorState,
  EnemyId,
  EnemyPoolEntryState,
  EnemyProfileId,
  EnemyState,
  EnemyTag,
} from "../types/game-state";
import {
  AWAKENED_PROFILE_CANDIDATES,
  ENEMY_ARCHETYPES,
  FINAL_WEIGHT_MULTIPLIERS,
  INTRO_PROFILE_CYCLE,
  MID_PROFILE_CANDIDATES,
  PROFILE_CONFIGS,
  TIER_FOUR_ENEMIES,
  TIER_ONE_ENEMIES,
  TIER_THREE_ENEMIES,
  TIER_TWO_ENEMIES,
} from "./enemyDirectorConfig";
import { actForBossKills, clampAct, threatScalarForRun } from "./runProgression";

const RUN_SEED_MOD = 0x7fffffff;
const RNG_INCREMENT = 0x6d2b79f5;
const RNG_FIRST_SHIFT = 15;
const RNG_SECOND_SHIFT = 7;
const RNG_SECOND_MASK = 61;
const RNG_FINAL_SHIFT = 14;
const RNG_UNIT_DIVISOR = 4294967296;
export const RECENT_ENEMY_LIMIT = 6;
const DEFAULT_UNLOCKED_ENEMY_COUNT = 12;
const DEFAULT_REGULAR_POOL_SIZE = 8;
const FINAL_ACT = 13;
const FINAL_ACT_REGULAR_POOL_SIZE = 9;
const TIER_TWO_SHUFFLE_OFFSET = 17;
const TIER_THREE_SHUFFLE_OFFSET = 31;
const TIER_FOUR_SHUFFLE_OFFSET = 47;
const MID_PROFILE_SEED_ACT_MULTIPLIER = 101;
const REQUIRED_TAG_MISSING_PENALTY = 10;
const PREFERRED_TAG_MISSING_PENALTY = 2;
const REPEAT_PROFILE_PENALTY = -6;
const INTRO_PROFILE_LAST_ACT = 3;
const MID_PROFILE_LAST_ACT = 6;
const AWAKENED_PROFILE_FIRST_ACT = 7;
const AWAKENED_PROFILE_LAST_ACT = 12;
const REQUIRED_TAG_PROFILE_WEIGHT = 1.55;
const PREFERRED_TAG_PROFILE_WEIGHT = 1.25;
const FALLBACK_PROFILE_WEIGHT = 0.85;
const IMMEDIATE_REPEAT_WEIGHT = 0.35;
const RECENT_REPEAT_WINDOW = 2;
const RECENT_REPEAT_WEIGHT = 0.55;
const LATE_TIER_ONE_FIRST_ACT = 6;
const LATE_TIER_ONE_WEIGHT = 0.65;
const TIER_ONE_COMPLEXITY = 1;
const AWAKENED_PROFILE_SHUFFLE_OFFSET = 503;
const ACTIVE_SPAWN_COST_RAMP_SECONDS = 45;
const ELITE_SPAWN_COST_MULTIPLIER = 1.6;
const AWAKENED_BOSS_SUMMON_PHASE = 4;
const ENRAGED_BOSS_SUMMON_PHASE = 3;
const PRESSURE_BOSS_SUMMON_PHASE = 2;
const FINAL_BOSS_MAX_SUMMON_TIER = 4;
const AWAKENED_BOSS_MAX_SUMMON_TIER = 4;
const ENRAGED_BOSS_MAX_SUMMON_TIER = 3;
const ACT_HP_SCALE = 0.035;
const AWAKENED_HP_SCALE_BONUS = 0.1;
const FINAL_HP_SCALE_BONUS = 0.08;
const ACT_DAMAGE_SCALE = 0.04;
const AWAKENED_DAMAGE_SCALE_BONUS = 0.12;
const FINAL_DAMAGE_SCALE_BONUS = 0.15;
const ACT_DAMAGE_CAP_SCALE = 0.04;
const AWAKENED_DAMAGE_CAP_SCALE_BONUS = 0.12;
const FINAL_DAMAGE_CAP_SCALE_BONUS = 0.15;
const ACT_SPEED_SCALE = 0.008;
const AWAKENED_SPEED_SCALE_BONUS = 0.025;
const FINAL_SPEED_SCALE_BONUS = 0.02;

const UNLOCKED_ENEMY_COUNT_BY_ACT: Partial<Record<number, number>> = {
  1: 3,
  2: 5,
  3: 7,
  4: 9,
  5: 11,
};

const REGULAR_POOL_SIZE_BY_ACT: Partial<Record<number, number>> = {
  1: 3,
  2: 4,
  3: 5,
  4: 6,
  5: 7,
  [FINAL_ACT]: FINAL_ACT_REGULAR_POOL_SIZE,
};

const MAX_ACTIVE_SPAWN_COST_BY_ACT: Partial<Record<number, number>> = {
  1: 6,
  2: 7,
  3: 8,
  4: 9,
  5: 10,
  6: 11,
  7: 12,
  8: 12,
  9: 12,
  10: 13,
  11: 13,
  12: 13,
  [FINAL_ACT]: 11,
};

const FINAL_BOSS_SUMMON_BUDGET = { maxCount: 4, maxCost: 7 };
const AWAKENED_BOSS_SUMMON_BUDGET = { maxCount: 3, maxCost: 5 };
const ENRAGED_BOSS_SUMMON_BUDGET = { maxCount: 3, maxCost: 4 };
const PRESSURE_BOSS_SUMMON_BUDGET = { maxCount: 2, maxCost: 3 };
const BASE_BOSS_SUMMON_BUDGET = { maxCount: 1, maxCost: 1.2 };

export type EnemySpawnStats = {
  hp: number;
  damage: number;
  speed: number;
};

export function enemySpawnCost(enemyId: EnemyId, elite = false) {
  const baseCost = ENEMY_ARCHETYPES[enemyId].spawnCost;
  return elite ? baseCost * ELITE_SPAWN_COST_MULTIPLIER : baseCost;
}

export function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += RNG_INCREMENT;
    let next = value;
    next = Math.imul(next ^ (next >>> RNG_FIRST_SHIFT), next | 1);
    next ^= next + Math.imul(next ^ (next >>> RNG_SECOND_SHIFT), next | RNG_SECOND_MASK);
    return ((next ^ (next >>> RNG_FINAL_SHIFT)) >>> 0) / RNG_UNIT_DIVISOR;
  };
}

export function weightedPick<T>(
  items: readonly T[],
  weightFor: (item: T) => number,
  rng: () => number,
): T | null {
  let total = 0;
  for (const item of items) total += Math.max(0, weightFor(item));
  if (total <= 0) return items[0] ?? null;

  let roll = rng() * total;
  for (const item of items) {
    roll -= Math.max(0, weightFor(item));
    if (roll <= 0) return item;
  }
  return items[items.length - 1] ?? null;
}

function shuffled<T>(items: readonly T[], seed: number): T[] {
  const rng = seededRandom(seed);
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function enemyHasTag(enemyId: EnemyId, tag: EnemyTag) {
  return ENEMY_ARCHETYPES[enemyId].tags.includes(tag);
}

export function anyEnemyHasTag(enemyId: EnemyId, tags: readonly EnemyTag[]) {
  return tags.some((tag) => enemyHasTag(enemyId, tag));
}

function unlockedEnemyCountForAct(act: number) {
  const clampedAct = clampAct(act);
  return UNLOCKED_ENEMY_COUNT_BY_ACT[clampedAct] ?? DEFAULT_UNLOCKED_ENEMY_COUNT;
}

function regularPoolSizeForAct(act: number) {
  const clampedAct = clampAct(act);
  return REGULAR_POOL_SIZE_BY_ACT[clampedAct] ?? DEFAULT_REGULAR_POOL_SIZE;
}

export function buildRunEnemyOrder(seed: number) {
  return [
    ...TIER_ONE_ENEMIES,
    ...shuffled(TIER_TWO_ENEMIES, seed + TIER_TWO_SHUFFLE_OFFSET),
    ...shuffled(TIER_THREE_ENEMIES, seed + TIER_THREE_SHUFFLE_OFFSET),
    ...shuffled(TIER_FOUR_ENEMIES, seed + TIER_FOUR_SHUFFLE_OFFSET),
  ];
}

export function unlockedEnemiesForAct(order: readonly EnemyId[], act: number) {
  return order.slice(0, unlockedEnemyCountForAct(act));
}

function chooseMidProfile(
  act: number,
  seed: number,
  featuredTags: readonly EnemyTag[],
  previousProfile?: EnemyProfileId,
) {
  const rng = seededRandom(seed + act * MID_PROFILE_SEED_ACT_MULTIPLIER);
  const featured = new Set(featuredTags);
  const scored = MID_PROFILE_CANDIDATES.map((profileId) => {
    const profile = PROFILE_CONFIGS[profileId];
    const missingRequired = profile.requiredTags.filter((tag) => !featured.has(tag)).length;
    const missingPreferred = profile.preferredTags.filter((tag) => !featured.has(tag)).length;
    const repeatPenalty = profileId === previousProfile ? REPEAT_PROFILE_PENALTY : 0;
    return {
      profileId,
      score: missingRequired * REQUIRED_TAG_MISSING_PENALTY
        + missingPreferred * PREFERRED_TAG_MISSING_PENALTY
        + repeatPenalty
        + rng(),
    };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.profileId ?? "mixed_pressure";
}

export function selectActProfile(
  act: number,
  seed: number,
  featuredTags: readonly EnemyTag[],
  awakenedProfileOrder: readonly EnemyProfileId[],
  previousProfile?: EnemyProfileId,
) {
  const clampedAct = clampAct(act);
  if (clampedAct <= INTRO_PROFILE_LAST_ACT) return INTRO_PROFILE_CYCLE[clampedAct - 1];
  if (clampedAct <= MID_PROFILE_LAST_ACT) return chooseMidProfile(clampedAct, seed, featuredTags, previousProfile);
  if (clampedAct <= AWAKENED_PROFILE_LAST_ACT) {
    const awakenedIndex = clampedAct - AWAKENED_PROFILE_FIRST_ACT;
    return awakenedProfileOrder[awakenedIndex] ?? AWAKENED_PROFILE_CANDIDATES[awakenedIndex];
  }
  return "final";
}

function profileWeight(enemyId: EnemyId, profileId: EnemyProfileId) {
  const profile = PROFILE_CONFIGS[profileId];
  if (anyEnemyHasTag(enemyId, profile.requiredTags)) return REQUIRED_TAG_PROFILE_WEIGHT;
  if (anyEnemyHasTag(enemyId, profile.preferredTags)) return PREFERRED_TAG_PROFILE_WEIGHT;
  return FALLBACK_PROFILE_WEIGHT;
}

function recentWeight(enemyId: EnemyId, recentEnemyIds: readonly EnemyId[]) {
  const distanceFromEnd = recentEnemyIds.length - 1 - recentEnemyIds.lastIndexOf(enemyId);
  if (distanceFromEnd === 0) return IMMEDIATE_REPEAT_WEIGHT;
  if (distanceFromEnd > 0 && distanceFromEnd <= RECENT_REPEAT_WINDOW) return RECENT_REPEAT_WEIGHT;
  return 1;
}

function actWeight(enemyId: EnemyId, act: number) {
  if (act === FINAL_ACT) return FINAL_WEIGHT_MULTIPLIERS[enemyId] ?? 0;
  if (
    act >= LATE_TIER_ONE_FIRST_ACT
    && act <= AWAKENED_PROFILE_LAST_ACT
    && ENEMY_ARCHETYPES[enemyId].complexityTier === TIER_ONE_COMPLEXITY
  ) {
    return LATE_TIER_ONE_WEIGHT;
  }
  return 1;
}

function poolWeight(enemyId: EnemyId, act: number, profileId: EnemyProfileId, recentEnemyIds: readonly EnemyId[]) {
  return ENEMY_ARCHETYPES[enemyId].baseWeight
    * profileWeight(enemyId, profileId)
    * recentWeight(enemyId, recentEnemyIds)
    * actWeight(enemyId, act);
}

function addProfileTagCoverage(
  selected: EnemyId[],
  candidates: EnemyId[],
  tags: readonly EnemyTag[],
) {
  for (const tag of tags) {
    if (selected.some((enemyId) => enemyHasTag(enemyId, tag))) continue;
    const match = candidates.find((enemyId) => (
      !selected.includes(enemyId) && enemyHasTag(enemyId, tag)
    ));
    if (match) selected.push(match);
  }
}

export function buildCurrentEnemyPool(
  act: number,
  order: readonly EnemyId[],
  profileId: EnemyProfileId,
  recentEnemyIds: readonly EnemyId[] = [],
) {
  const poolSize = regularPoolSizeForAct(act);
  const unlocked = unlockedEnemiesForAct(order, act);
  const candidates = act === FINAL_ACT
    ? order.filter((enemyId) => ENEMY_ARCHETYPES[enemyId].complexityTier > TIER_ONE_COMPLEXITY)
    : unlocked;
  const sorted = [...candidates].sort((a, b) => (
    poolWeight(b, act, profileId, recentEnemyIds) - poolWeight(a, act, profileId, recentEnemyIds)
  ));
  const selected: EnemyId[] = [];
  const profile = PROFILE_CONFIGS[profileId];

  addProfileTagCoverage(selected, sorted, profile.requiredTags);
  for (const enemyId of sorted) {
    if (selected.length >= poolSize) break;
    if (!selected.includes(enemyId)) selected.push(enemyId);
  }

  return selected.slice(0, poolSize).map((enemyId): EnemyPoolEntryState => ({
    enemyId,
    weight: poolWeight(enemyId, act, profileId, recentEnemyIds),
  }));
}

function featuredTagsForProfile(profileId: EnemyProfileId) {
  const profile = PROFILE_CONFIGS[profileId];
  return [...profile.requiredTags, ...profile.preferredTags];
}

function uniqueTags(tags: readonly EnemyTag[]) {
  return [...new Set(tags)];
}

function nextDirectorState(
  seed: number,
  order: EnemyId[],
  awakenedProfileOrder: EnemyProfileId[],
  bossKills: number,
  elapsedSeconds: number,
  previous?: EnemyDirectorState,
): EnemyDirectorState {
  const act = actForBossKills(bossKills);
  const featuredTags = previous?.featuredTags ?? [];
  const profile = selectActProfile(
    act,
    seed,
    featuredTags,
    awakenedProfileOrder,
    previous?.currentProfile,
  );
  const nextFeaturedTags = uniqueTags([...featuredTags, ...featuredTagsForProfile(profile)]);

  return {
    runSeed: seed,
    act,
    actStartedAt: elapsedSeconds,
    elapsedInAct: 0,
    runEnemyOrder: order,
    unlockedEnemyIds: unlockedEnemiesForAct(order, act),
    currentProfile: profile,
    currentPool: buildCurrentEnemyPool(act, order, profile, previous?.recentEnemyIds),
    featuredTags: nextFeaturedTags,
    recentEnemyIds: previous?.recentEnemyIds ?? [],
    wavesCleared: 0,
    awakenedProfileOrder,
    bossPrelude: null,
    wave: null,
  };
}

export function createEnemyDirectorState(seed = Math.floor(Math.random() * RUN_SEED_MOD)): EnemyDirectorState {
  const runSeed = seed || 1;
  const order = buildRunEnemyOrder(runSeed);
  const awakenedProfileOrder = shuffled(AWAKENED_PROFILE_CANDIDATES, runSeed + AWAKENED_PROFILE_SHUFFLE_OFFSET);
  return nextDirectorState(runSeed, order, awakenedProfileOrder, 0, 0);
}

export function advanceEnemyDirectorToAct(
  director: EnemyDirectorState,
  bossKills: number,
  elapsedSeconds: number,
) {
  const next = nextDirectorState(
    director.runSeed,
    director.runEnemyOrder,
    director.awakenedProfileOrder,
    bossKills,
    elapsedSeconds,
    director,
  );
  Object.assign(director, next);
}

export function enemyArchetypeById(enemyId: EnemyId) {
  return ENEMY_ARCHETYPES[enemyId];
}

export function enemyIdForSheetIndex(sheetIndex: number): EnemyId {
  const found = Object.values(ENEMY_ARCHETYPES).find((config) => config.sheetIndex === sheetIndex);
  return found?.id ?? "chaser";
}

function actGrowthScale(
  bossKills: number,
  perAct: number,
  awakenedBonus: number,
  finalBonus: number,
) {
  const act = actForBossKills(bossKills);
  const scale = 1
    + (act - 1) * perAct
    + (act >= AWAKENED_PROFILE_FIRST_ACT ? awakenedBonus : 0)
    + (act === FINAL_ACT ? finalBonus : 0);
  return scale;
}

export function enemySpawnStats(
  enemyId: EnemyId,
  bossKills: number,
  elapsedSeconds: number,
  random = Math.random,
): EnemySpawnStats {
  const config = ENEMY_ARCHETYPES[enemyId];
  const threatScalar = threatScalarForRun(bossKills, elapsedSeconds);
  const hpScale = actGrowthScale(bossKills, ACT_HP_SCALE, AWAKENED_HP_SCALE_BONUS, FINAL_HP_SCALE_BONUS);
  const damageScale = actGrowthScale(
    bossKills,
    ACT_DAMAGE_SCALE,
    AWAKENED_DAMAGE_SCALE_BONUS,
    FINAL_DAMAGE_SCALE_BONUS,
  );
  const damageCapScale = actGrowthScale(
    bossKills,
    ACT_DAMAGE_CAP_SCALE,
    AWAKENED_DAMAGE_CAP_SCALE_BONUS,
    FINAL_DAMAGE_CAP_SCALE_BONUS,
  );
  const speedScale = actGrowthScale(
    bossKills,
    ACT_SPEED_SCALE,
    AWAKENED_SPEED_SCALE_BONUS,
    FINAL_SPEED_SCALE_BONUS,
  );
  const baseDamage = config.damageBase + bossKills * config.damagePerBossKill;
  const baseSpeed = config.speedBase + bossKills * config.speedPerBossKill + random() * config.randomSpeed;

  return {
    hp: Math.round((config.hpBase + bossKills * config.hpPerBossKill) * threatScalar * hpScale),
    damage: Math.min(config.damageCap * damageCapScale, baseDamage * damageScale),
    speed: baseSpeed * speedScale,
  };
}

export function activeSpawnCost(
  enemies: readonly EnemyState[],
  source: "regular" | "boss" | "all" = "regular",
) {
  return enemies.reduce((total, enemy) => {
    if (source !== "all" && enemy.spawnSource !== source) return total;
    return total + (enemy.spawnCost ?? ENEMY_ARCHETYPES[enemy.id]?.spawnCost ?? 1);
  }, 0);
}

export function activeEnemyCountById(enemies: readonly EnemyState[], enemyId: EnemyId) {
  return enemies.filter((enemy) => enemy.id === enemyId).length;
}

export function maxActiveSpawnCostForAct(act: number, elapsedInAct: number) {
  const clampedAct = clampAct(act);
  const base = MAX_ACTIVE_SPAWN_COST_BY_ACT[clampedAct] ?? MAX_ACTIVE_SPAWN_COST_BY_ACT[FINAL_ACT]!;
  return base + Math.min(2, Math.floor(elapsedInAct / ACTIVE_SPAWN_COST_RAMP_SECONDS));
}

export function canSpawnByDirectorCap(enemies: readonly EnemyState[], enemyId: EnemyId) {
  const maxActive = ENEMY_ARCHETYPES[enemyId].maxActive;
  if (maxActive === "budget") return true;
  return activeEnemyCountById(enemies, enemyId) < maxActive;
}

export function bossSummonBudgetForPhase(phase: number, awakened: boolean, finalBoss: boolean) {
  if (finalBoss) return FINAL_BOSS_SUMMON_BUDGET;
  if (awakened && phase >= AWAKENED_BOSS_SUMMON_PHASE) return AWAKENED_BOSS_SUMMON_BUDGET;
  if (phase >= ENRAGED_BOSS_SUMMON_PHASE) return ENRAGED_BOSS_SUMMON_BUDGET;
  if (phase >= PRESSURE_BOSS_SUMMON_PHASE) return PRESSURE_BOSS_SUMMON_BUDGET;
  return BASE_BOSS_SUMMON_BUDGET;
}

export function canSpawnBossSummon(
  enemies: readonly EnemyState[],
  spawnCost: number,
  phase: number,
  awakened: boolean,
  finalBoss: boolean,
) {
  const budget = bossSummonBudgetForPhase(phase, awakened, finalBoss);
  const bossSummons = enemies.filter((enemy) => enemy.spawnSource === "boss");
  const summonCost = activeSpawnCost(enemies, "boss");
  return bossSummons.length < budget.maxCount && summonCost + spawnCost <= budget.maxCost;
}

export function pickEnemyFromPool(pool: readonly EnemyPoolEntryState[], random = Math.random) {
  return weightedPick(pool, (entry) => entry.weight, random)?.enemyId ?? "chaser";
}

export function pickRegularEnemyId(director: EnemyDirectorState, random = Math.random) {
  return pickEnemyFromPool(director.currentPool, random);
}

export function pickBossSummonEnemyId(
  director: EnemyDirectorState,
  random = Math.random,
  boss: { phase: number; awakened: boolean; finalBoss: boolean } = { phase: 1, awakened: false, finalBoss: false },
) {
  const maxTier = boss.finalBoss
    ? FINAL_BOSS_MAX_SUMMON_TIER
    : boss.awakened && boss.phase >= AWAKENED_BOSS_SUMMON_PHASE
      ? AWAKENED_BOSS_MAX_SUMMON_TIER
      : boss.phase >= ENRAGED_BOSS_SUMMON_PHASE
        ? ENRAGED_BOSS_MAX_SUMMON_TIER
        : boss.phase >= 2
          ? 2
          : 1;
  const pool = director.currentPool.filter((entry) => {
    const config = ENEMY_ARCHETYPES[entry.enemyId];
    if (boss.finalBoss && config.complexityTier === TIER_ONE_COMPLEXITY) return false;
    return config.complexityTier <= maxTier;
  });
  return pickEnemyFromPool(pool.length > 0 ? pool : director.currentPool, random);
}
