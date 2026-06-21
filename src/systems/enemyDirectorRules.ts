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
export const RECENT_ENEMY_LIMIT = 6;

export type EnemySpawnStats = {
  hp: number;
  damage: number;
  speed: number;
};

export function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
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
  if (clampedAct === 1) return 3;
  if (clampedAct === 2) return 5;
  if (clampedAct === 3) return 7;
  if (clampedAct === 4) return 9;
  if (clampedAct === 5) return 11;
  return 12;
}

function regularPoolSizeForAct(act: number) {
  const clampedAct = clampAct(act);
  if (clampedAct === 1) return 3;
  if (clampedAct === 2) return 4;
  if (clampedAct === 3) return 5;
  if (clampedAct === 4) return 6;
  if (clampedAct === 5) return 7;
  if (clampedAct === 13) return 9;
  return 8;
}

export function buildRunEnemyOrder(seed: number) {
  return [
    ...TIER_ONE_ENEMIES,
    ...shuffled(TIER_TWO_ENEMIES, seed + 17),
    ...shuffled(TIER_THREE_ENEMIES, seed + 31),
    ...shuffled(TIER_FOUR_ENEMIES, seed + 47),
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
  const rng = seededRandom(seed + act * 101);
  const featured = new Set(featuredTags);
  const scored = MID_PROFILE_CANDIDATES.map((profileId) => {
    const profile = PROFILE_CONFIGS[profileId];
    const missingRequired = profile.requiredTags.filter((tag) => !featured.has(tag)).length;
    const missingPreferred = profile.preferredTags.filter((tag) => !featured.has(tag)).length;
    const repeatPenalty = profileId === previousProfile ? -6 : 0;
    return {
      profileId,
      score: missingRequired * 10 + missingPreferred * 2 + repeatPenalty + rng(),
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
  if (clampedAct <= 3) return INTRO_PROFILE_CYCLE[clampedAct - 1];
  if (clampedAct <= 6) return chooseMidProfile(clampedAct, seed, featuredTags, previousProfile);
  if (clampedAct <= 12) {
    return awakenedProfileOrder[clampedAct - 7] ?? AWAKENED_PROFILE_CANDIDATES[clampedAct - 7];
  }
  return "final";
}

function profileWeight(enemyId: EnemyId, profileId: EnemyProfileId) {
  const profile = PROFILE_CONFIGS[profileId];
  if (anyEnemyHasTag(enemyId, profile.requiredTags)) return 1.55;
  if (anyEnemyHasTag(enemyId, profile.preferredTags)) return 1.25;
  return 0.85;
}

function recentWeight(enemyId: EnemyId, recentEnemyIds: readonly EnemyId[]) {
  const distanceFromEnd = recentEnemyIds.length - 1 - recentEnemyIds.lastIndexOf(enemyId);
  if (distanceFromEnd === 0) return 0.35;
  if (distanceFromEnd > 0 && distanceFromEnd <= 2) return 0.55;
  return 1;
}

function actWeight(enemyId: EnemyId, act: number) {
  if (act === 13) return FINAL_WEIGHT_MULTIPLIERS[enemyId] ?? 0;
  if (act >= 6 && act <= 12 && ENEMY_ARCHETYPES[enemyId].complexityTier === 1) return 0.65;
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
  const candidates = act === 13
    ? order.filter((enemyId) => ENEMY_ARCHETYPES[enemyId].complexityTier > 1)
    : unlocked;
  const sorted = [...candidates].sort((a, b) => (
    poolWeight(b, act, profileId, recentEnemyIds) - poolWeight(a, act, profileId, recentEnemyIds)
  ));
  const selected: EnemyId[] = [];
  const profile = PROFILE_CONFIGS[profileId];

  addProfileTagCoverage(selected, sorted, profile.requiredTags);
  addProfileTagCoverage(selected, sorted, profile.preferredTags);
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
  const awakenedProfileOrder = shuffled(AWAKENED_PROFILE_CANDIDATES, runSeed + 503);
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

export function enemySpawnStats(
  enemyId: EnemyId,
  bossKills: number,
  elapsedSeconds: number,
  random = Math.random,
): EnemySpawnStats {
  const config = ENEMY_ARCHETYPES[enemyId];
  const threatScalar = threatScalarForRun(bossKills, elapsedSeconds);
  return {
    hp: Math.round((config.hpBase + bossKills * config.hpPerBossKill) * threatScalar),
    damage: Math.min(config.damageCap, config.damageBase + bossKills * config.damagePerBossKill),
    speed: config.speedBase + bossKills * config.speedPerBossKill + random() * config.randomSpeed,
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
  const base = clampedAct === 1
    ? 6
    : clampedAct === 2
      ? 7
      : clampedAct === 3
        ? 8
        : clampedAct === 4
          ? 9
          : clampedAct === 5
            ? 10
            : clampedAct === 6
              ? 11
              : clampedAct <= 9
                ? 12
                : clampedAct <= 12
                  ? 13
                  : 11;
  return base + Math.min(2, Math.floor(elapsedInAct / 45));
}

export function canSpawnByDirectorCap(enemies: readonly EnemyState[], enemyId: EnemyId) {
  const maxActive = ENEMY_ARCHETYPES[enemyId].maxActive;
  if (maxActive === "budget") return true;
  return activeEnemyCountById(enemies, enemyId) < maxActive;
}

export function bossSummonBudgetForPhase(phase: number, awakened: boolean, finalBoss: boolean) {
  if (finalBoss) return { maxCount: 4, maxCost: 7 };
  if (awakened && phase >= 4) return { maxCount: 3, maxCost: 5 };
  if (phase >= 3) return { maxCount: 3, maxCost: 4 };
  if (phase >= 2) return { maxCount: 2, maxCost: 3 };
  return { maxCount: 1, maxCost: 1.2 };
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
    ? 4
    : boss.awakened && boss.phase >= 4
      ? 4
      : boss.phase >= 3
        ? 3
        : boss.phase >= 2
          ? 2
          : 1;
  const pool = director.currentPool.filter((entry) => {
    const config = ENEMY_ARCHETYPES[entry.enemyId];
    if (boss.finalBoss && config.complexityTier === 1) return false;
    return config.complexityTier <= maxTier;
  });
  return pickEnemyFromPool(pool.length > 0 ? pool : director.currentPool, random);
}
