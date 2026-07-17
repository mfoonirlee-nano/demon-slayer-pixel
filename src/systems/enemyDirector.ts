import type {
  EnemyDirectorState,
  EnemyId,
  EnemyState,
  SpawnPattern,
  WaveEntryRole,
  WaveEntryRuntimeState,
} from "../types/game-state";
import { ELITE_ELIGIBLE_ENEMIES, ENEMY_ARCHETYPES, PROFILE_CONFIGS } from "./enemyDirectorConfig";
import {
  activeSpawnCost,
  advanceEnemyDirectorToAct,
  anyEnemyHasTag,
  canSpawnByDirectorCap,
  enemySpawnCost,
  maxActiveSpawnCostForAct,
  RECENT_ENEMY_LIMIT,
  seededRandom,
  weightedPick,
} from "./enemyDirectorRules";
import {
  ACT_TIMING_SCALE,
  actForBossKills,
  bossApproachGroundTransitionSeconds,
  bossGateForAct,
} from "./runProgression";

export {
  activeSpawnCost,
  advanceEnemyDirectorToAct,
  buildCurrentEnemyPool,
  buildRunEnemyOrder,
  bossSummonBudgetForPhase,
  canSpawnByDirectorCap,
  canSpawnBossSummon,
  createEnemyDirectorState,
  enemyArchetypeById,
  enemyIdForSheetIndex,
  enemySpawnCost,
  enemySpawnStats,
  maxActiveSpawnCostForAct,
  pickBossSummonEnemyId,
  pickRegularEnemyId,
  RECENT_ENEMY_LIMIT,
  selectActProfile,
  unlockedEnemiesForAct,
} from "./enemyDirectorRules";
export { ENEMY_ARCHETYPES } from "./enemyDirectorConfig";

const LIGHT_WAVE_RATIO = 0.45;
const NORMAL_WAVE_RATIO = 0.65;
const HARD_WAVE_RATIO = 0.85;
const LOW_HEALTH_WAVE_RATIO = 0.75;
const UNCOMPRESSED_LOW_HEALTH_BREATHER_BONUS = 1.1;
const UNCOMPRESSED_MIN_ENTRY_DELAY = 0.42;
const UNCOMPRESSED_MIN_BREATHER_SECONDS = 1.2;
const UNCOMPRESSED_BASE_BREATHER_SECONDS = 2.1;
const UNCOMPRESSED_MAX_BREATHER_SECONDS = 4.5;
const LOW_HEALTH_BREATHER_BONUS = UNCOMPRESSED_LOW_HEALTH_BREATHER_BONUS * ACT_TIMING_SCALE;
const MIN_ENTRY_DELAY = UNCOMPRESSED_MIN_ENTRY_DELAY * ACT_TIMING_SCALE;
const MIN_BREATHER_SECONDS = UNCOMPRESSED_MIN_BREATHER_SECONDS * ACT_TIMING_SCALE;
const BASE_BREATHER_SECONDS = UNCOMPRESSED_BASE_BREATHER_SECONDS * ACT_TIMING_SCALE;
const MAX_BREATHER_SECONDS = UNCOMPRESSED_MAX_BREATHER_SECONDS * ACT_TIMING_SCALE;
const HARD_WAVE_INTERVAL = 4;
const LIGHT_WAVE_INTERVAL = 3;
const WAVE_SEED_ACT_SALT = 1009;
const WAVE_SEED_CLEAR_SALT = 9176;
const WAVE_SEED_RECENT_SALT = 37;
const TIER_ONE_COMPLEXITY = 1;
const FIRST_ACT = 1;
const FINAL_ACT = 13;
const FIRST_ACT_SPAWN_TIMER_MULTIPLIER = 1.25;
const PRESSURE_PINCER_CHANCE = 0.35;
const REINFORCE_CLUSTER_CHANCE = 0.45;
const DOUBLE_OPENER_CHANCE = 0.45;
const UNCOMPRESSED_OPENER_ENTRY_DELAY = 0.2;
const UNCOMPRESSED_PRESSURE_ENTRY_DELAY = 0.8;
const UNCOMPRESSED_SUPPORT_ENTRY_DELAY = 1.1;
const UNCOMPRESSED_EXTRA_ENTRY_BASE_DELAY = 0.7;
const UNCOMPRESSED_EXTRA_ENTRY_RANDOM_DELAY = 0.6;
const OPENER_ENTRY_DELAY = UNCOMPRESSED_OPENER_ENTRY_DELAY * ACT_TIMING_SCALE;
const PRESSURE_ENTRY_DELAY = UNCOMPRESSED_PRESSURE_ENTRY_DELAY * ACT_TIMING_SCALE;
const SUPPORT_ENTRY_DELAY = UNCOMPRESSED_SUPPORT_ENTRY_DELAY * ACT_TIMING_SCALE;
const EXTRA_ENTRY_BASE_DELAY = UNCOMPRESSED_EXTRA_ENTRY_BASE_DELAY * ACT_TIMING_SCALE;
const EXTRA_ENTRY_RANDOM_DELAY = UNCOMPRESSED_EXTRA_ENTRY_RANDOM_DELAY * ACT_TIMING_SCALE;
const MAX_WAVE_ENTRIES = 5;
const UNCOMPRESSED_PREPARE_WAVE_SECONDS = 0.65;
const UNCOMPRESSED_ACTIVE_COST_BREATHER_SCALE = 0.22;
const UNCOMPRESSED_BOSS_PRELUDE_REINFORCEMENT_INTERVAL = 2;
const PREPARE_WAVE_SECONDS = UNCOMPRESSED_PREPARE_WAVE_SECONDS * ACT_TIMING_SCALE;
const ACTIVE_COST_BREATHER_SCALE = UNCOMPRESSED_ACTIVE_COST_BREATHER_SCALE * ACT_TIMING_SCALE;
const BOSS_PRELUDE_REINFORCEMENT_INTERVAL = UNCOMPRESSED_BOSS_PRELUDE_REINFORCEMENT_INTERVAL * ACT_TIMING_SCALE;
const BOSS_PRELUDE_REINFORCEMENT_BUDGET_RATIO = 0.7;
const BOSS_PRELUDE_REINFORCEMENT_ACT_SALT = 7919;
const BOSS_PRELUDE_REINFORCEMENT_SPAWN_SALT = 6151;
const LOW_HEALTH_RATIO = 0.35;
const AWAKENED_ELITE_CHANCE = 0.45;
const FINAL_SECOND_ELITE_CHANCE = 0.5;
const AWAKENED_FIRST_ACT = 7;
const AWAKENED_LAST_ACT = 12;
const FINAL_ELITE_BASE_COUNT = 1;
const ELITE_PRIORITY_ROLE_WEIGHT_BONUS = 0.4;
const MIN_FINAL_ELITE_CANDIDATES = 1;

export type EnemySpawnRequest = {
  enemyId: EnemyId;
  pattern: SpawnPattern;
  elite: boolean;
};

export type EnemyDirectorUpdate = {
  spawnRequests: EnemySpawnRequest[];
  spawnBoss: boolean;
};

function waveBudgetRatio(wavesCleared: number, lowHealth: boolean) {
  if (lowHealth) return LOW_HEALTH_WAVE_RATIO * LIGHT_WAVE_RATIO;
  if (wavesCleared > 0 && wavesCleared % HARD_WAVE_INTERVAL === 0) return HARD_WAVE_RATIO;
  if (wavesCleared % LIGHT_WAVE_INTERVAL === 0) return LIGHT_WAVE_RATIO;
  return NORMAL_WAVE_RATIO;
}

function maxEliteEntriesForAct(act: number) {
  if (act === FINAL_ACT) return 2;
  if (act >= AWAKENED_FIRST_ACT && act <= AWAKENED_LAST_ACT) return 1;
  return 0;
}

function spawnTimerDelta(act: number, dt: number) {
  return dt * (act === FIRST_ACT ? FIRST_ACT_SPAWN_TIMER_MULTIPLIER : 1);
}

function desiredEliteEntriesForWave(act: number, rng: () => number) {
  const maxEliteEntries = maxEliteEntriesForAct(act);
  if (maxEliteEntries === 0) return 0;
  if (act === FINAL_ACT) {
    return FINAL_ELITE_BASE_COUNT + (rng() < FINAL_SECOND_ELITE_CHANCE ? 1 : 0);
  }
  return rng() < AWAKENED_ELITE_CHANCE ? 1 : 0;
}

function eliteUpgradeExtraCost(entry: WaveEntryRuntimeState) {
  return enemySpawnCost(entry.enemyId, true) - enemySpawnCost(entry.enemyId, false);
}

function canUpgradeEntryToElite(entry: WaveEntryRuntimeState, plannedCost: number, maxCost: number) {
  return !entry.elite
    && entry.count === 1
    && ELITE_ELIGIBLE_ENEMIES.includes(entry.enemyId)
    && plannedCost + eliteUpgradeExtraCost(entry) <= maxCost;
}

function eliteEntryWeight(entry: WaveEntryRuntimeState) {
  const roleBonus = entry.role === "pressure" || entry.role === "support" ? ELITE_PRIORITY_ROLE_WEIGHT_BONUS : 0;
  return ENEMY_ARCHETYPES[entry.enemyId].spawnCost + roleBonus;
}

function applyEliteUpgrades(
  entries: WaveEntryRuntimeState[],
  act: number,
  rng: () => number,
  plannedCost: number,
  maxCost: number,
) {
  let budgetedCost = plannedCost;
  let remainingEliteEntries = desiredEliteEntriesForWave(act, rng);

  while (remainingEliteEntries > 0) {
    const candidates = entries.filter((entry) => canUpgradeEntryToElite(entry, budgetedCost, maxCost));
    const picked = weightedPick(candidates, eliteEntryWeight, rng);
    if (!picked) return;

    picked.elite = true;
    budgetedCost += eliteUpgradeExtraCost(picked);
    remainingEliteEntries -= 1;
  }
}

function hasEliteCandidateEntry(entries: readonly WaveEntryRuntimeState[]) {
  return entries.some(isEliteCandidateEntry);
}

function isEliteCandidateEntry(entry: WaveEntryRuntimeState) {
  return entry.count === 1 && ELITE_ELIGIBLE_ENEMIES.includes(entry.enemyId);
}

function currentEntryCost(entries: readonly WaveEntryRuntimeState[]) {
  return entries.reduce((total, entry) => total + enemySpawnCost(entry.enemyId, entry.elite) * entry.count, 0);
}

function ensureFinalEliteCandidateEntry(
  entries: WaveEntryRuntimeState[],
  director: EnemyDirectorState,
  rng: () => number,
  maxCost: number,
) {
  if (director.act !== FINAL_ACT || hasEliteCandidateEntry(entries)) return;

  const candidates = director.currentPool.filter((entry) => ELITE_ELIGIBLE_ENEMIES.includes(entry.enemyId));
  const picked = weightedPick(candidates, (entry) => entry.weight, rng);
  if (!picked) return;

  const replacement = makeWaveEntry(
    picked.enemyId,
    roleForEnemy(picked.enemyId, director),
    rng,
    1,
    EXTRA_ENTRY_BASE_DELAY,
  );
  const replacementCost = enemySpawnCost(replacement.enemyId, false);
  const existingCost = currentEntryCost(entries);

  if (entries.length < MAX_WAVE_ENTRIES && existingCost + replacementCost <= maxCost) {
    entries.push(replacement);
    return;
  }

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    const nextCost = existingCost - enemySpawnCost(entry.enemyId, entry.elite) * entry.count + replacementCost;
    if (nextCost <= maxCost) {
      entries[index] = replacement;
      return;
    }
  }
}

function reserveFinalEliteBudget(entries: WaveEntryRuntimeState[], act: number, maxCost: number) {
  if (act !== FINAL_ACT) return;
  const eliteCandidates = entries.filter(isEliteCandidateEntry);
  const minEliteExtraCost = Math.min(...eliteCandidates.map(eliteUpgradeExtraCost));
  if (!Number.isFinite(minEliteExtraCost)) return;

  while (currentEntryCost(entries) + minEliteExtraCost > maxCost && entries.length > 1) {
    let removableIndex = -1;
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index];
      if (!isEliteCandidateEntry(entry)) {
        removableIndex = index;
        break;
      }
    }
    if (removableIndex < 0) {
      const candidateCount = entries.filter(isEliteCandidateEntry).length;
      if (candidateCount <= MIN_FINAL_ELITE_CANDIDATES) return;
      removableIndex = entries.length - 1;
    }
    entries.splice(removableIndex, 1);
  }
}

function waveSeed(director: EnemyDirectorState) {
  return director.runSeed
    + director.act * WAVE_SEED_ACT_SALT
    + director.wavesCleared * WAVE_SEED_CLEAR_SALT
    + director.recentEnemyIds.length * WAVE_SEED_RECENT_SALT;
}

function pickPoolEnemy(
  director: EnemyDirectorState,
  rng: () => number,
  predicate: (enemyId: EnemyId) => boolean = () => true,
) {
  const candidates = director.currentPool.filter((entry) => predicate(entry.enemyId));
  return weightedPick(candidates, (entry) => entry.weight, rng)?.enemyId ?? null;
}

function roleForEnemy(enemyId: EnemyId, director: EnemyDirectorState): WaveEntryRole {
  const profile = PROFILE_CONFIGS[director.currentProfile];
  if (anyEnemyHasTag(enemyId, ["ranged", "control", "support"])) return "support";
  if (anyEnemyHasTag(enemyId, profile.requiredTags)) return "pressure";
  if (ENEMY_ARCHETYPES[enemyId].complexityTier === TIER_ONE_COMPLEXITY) return "opener";
  return "reinforce";
}

function spawnPatternForRole(role: WaveEntryRole, rng: () => number): SpawnPattern {
  if (role === "support") return rng() < 0.5 ? "left" : "right";
  if (role === "pressure") return rng() < PRESSURE_PINCER_CHANCE ? "pincer" : "random_edge";
  if (role === "reinforce") return rng() < REINFORCE_CLUSTER_CHANCE ? "same_edge_cluster" : "random_edge";
  return "random_edge";
}

function makeWaveEntry(
  enemyId: EnemyId,
  role: WaveEntryRole,
  rng: () => number,
  remaining: number,
  delay: number,
): WaveEntryRuntimeState {
  return {
    enemyId,
    role,
    elite: false,
    count: remaining,
    remaining,
    spawnPattern: spawnPatternForRole(role, rng),
    delayAfterPrevious: delay,
  };
}

export function pickWavePlan(director: EnemyDirectorState, lowHealth: boolean) {
  const rng = seededRandom(waveSeed(director));
  const profile = PROFILE_CONFIGS[director.currentProfile];
  const maxCost = maxActiveSpawnCostForAct(director.act, director.elapsedInAct);
  const targetBudget = maxCost * waveBudgetRatio(director.wavesCleared, lowHealth);
  const entries: WaveEntryRuntimeState[] = [];
  let plannedCost = 0;

  const addEntry = (predicate: (enemyId: EnemyId) => boolean, delay: number) => {
    if (plannedCost >= targetBudget) return false;
    const enemyId = pickPoolEnemy(director, rng, predicate);
    if (!enemyId) return false;
    const config = ENEMY_ARCHETYPES[enemyId];
    const role = roleForEnemy(enemyId, director);
    const canDouble = config.complexityTier === TIER_ONE_COMPLEXITY && plannedCost + config.spawnCost * 2 <= targetBudget;
    const remaining = canDouble && rng() < DOUBLE_OPENER_CHANCE ? 2 : 1;
    entries.push(makeWaveEntry(enemyId, role, rng, remaining, delay));
    plannedCost += config.spawnCost * remaining;
    return true;
  };

  addEntry((enemyId) => ENEMY_ARCHETYPES[enemyId].complexityTier <= 2, OPENER_ENTRY_DELAY);
  addEntry((enemyId) => anyEnemyHasTag(enemyId, profile.requiredTags), PRESSURE_ENTRY_DELAY);
  addEntry((enemyId) => anyEnemyHasTag(enemyId, ["ranged", "control", "support"]), SUPPORT_ENTRY_DELAY);
  while (plannedCost < targetBudget && entries.length < MAX_WAVE_ENTRIES) {
    if (!addEntry(() => true, EXTRA_ENTRY_BASE_DELAY + rng() * EXTRA_ENTRY_RANDOM_DELAY)) break;
  }

  if (entries.length === 0) {
    entries.push(makeWaveEntry(director.currentPool[0]?.enemyId ?? "chaser", "opener", rng, 1, OPENER_ENTRY_DELAY));
  }
  ensureFinalEliteCandidateEntry(entries, director, rng, maxCost);
  reserveFinalEliteBudget(entries, director.act, maxCost);
  const wavePlannedCost = entries.reduce((total, entry) => (
    total + enemySpawnCost(entry.enemyId, false) * entry.count
  ), 0);
  applyEliteUpgrades(entries, director.act, rng, wavePlannedCost, maxCost);

  return entries;
}

function rememberRecentEnemy(director: EnemyDirectorState, enemyId: EnemyId) {
  director.recentEnemyIds.push(enemyId);
  if (director.recentEnemyIds.length > RECENT_ENEMY_LIMIT) {
    director.recentEnemyIds.shift();
  }
}

function startWave(director: EnemyDirectorState, lowHealth: boolean) {
  const entries = pickWavePlan(director, lowHealth);
  director.wave = {
    phase: "prepare",
    timer: PREPARE_WAVE_SECONDS,
    entries,
    nextEntryIndex: 0,
    activeBudget: maxActiveSpawnCostForAct(director.act, director.elapsedInAct),
  };
}

function finishWave(director: EnemyDirectorState, activeCost: number, lowHealth: boolean) {
  director.wavesCleared += 1;
  const pressureDelay = Math.min(MAX_BREATHER_SECONDS, BASE_BREATHER_SECONDS + activeCost * ACTIVE_COST_BREATHER_SCALE);
  director.wave = {
    phase: "breather",
    timer: Math.max(
      MIN_BREATHER_SECONDS,
      pressureDelay + (lowHealth ? LOW_HEALTH_BREATHER_BONUS : 0),
    ),
    entries: [],
    nextEntryIndex: 0,
    activeBudget: maxActiveSpawnCostForAct(director.act, director.elapsedInAct),
  };
}

function shouldStartBossPrelude(director: EnemyDirectorState) {
  const gate = bossGateForAct(director.act);
  if (director.elapsedInAct >= gate.maxElapsed) return true;
  return director.wavesCleared >= gate.minWaves && director.elapsedInAct >= gate.minElapsed;
}

function preludeReinforcementRng(director: EnemyDirectorState) {
  return seededRandom(
    director.runSeed
    + director.act * BOSS_PRELUDE_REINFORCEMENT_ACT_SALT
    + (director.bossPrelude?.reinforcementsSpawned ?? 0) * BOSS_PRELUDE_REINFORCEMENT_SPAWN_SALT,
  );
}

function queuedSpawnCost(spawnRequests: readonly EnemySpawnRequest[]) {
  return spawnRequests.reduce((total, request) => (
    total + enemySpawnCost(request.enemyId, request.elite)
  ), 0);
}

function queueBossPreludeReinforcement(
  director: EnemyDirectorState,
  activeEnemies: readonly EnemyState[],
  spawnRequests: EnemySpawnRequest[],
) {
  if (!director.bossPrelude) return false;

  const rng = preludeReinforcementRng(director);
  const enemyId = pickPoolEnemy(
    director,
    rng,
    (candidateId) => ENEMY_ARCHETYPES[candidateId].complexityTier <= 2,
  ) ?? pickPoolEnemy(director, rng);
  if (!enemyId) return false;

  const spawnCost = enemySpawnCost(enemyId, false);
  const activeCost = activeSpawnCost(activeEnemies) + queuedSpawnCost(spawnRequests);
  const preludeBudget = maxActiveSpawnCostForAct(director.act, director.elapsedInAct)
    * BOSS_PRELUDE_REINFORCEMENT_BUDGET_RATIO;
  if (activeCost + spawnCost > preludeBudget) return false;

  const role = roleForEnemy(enemyId, director);
  spawnRequests.push({
    enemyId,
    pattern: spawnPatternForRole(role, rng),
    elite: false,
  });
  rememberRecentEnemy(director, enemyId);
  director.bossPrelude.reinforcementsSpawned += 1;
  return true;
}

function updateBossPreludeReinforcements(
  director: EnemyDirectorState,
  dt: number,
  activeEnemies: readonly EnemyState[],
  spawnRequests: EnemySpawnRequest[],
) {
  const prelude = director.bossPrelude;
  if (!prelude) return;

  prelude.reinforcementTimer -= dt;
  while (prelude.reinforcementTimer <= 0) {
    if (!queueBossPreludeReinforcement(director, activeEnemies, spawnRequests)) {
      prelude.reinforcementTimer = BOSS_PRELUDE_REINFORCEMENT_INTERVAL;
      return;
    }
    prelude.reinforcementTimer += BOSS_PRELUDE_REINFORCEMENT_INTERVAL;
  }
}

function updateBossPrelude(
  director: EnemyDirectorState,
  dt: number,
  activeEnemies: readonly EnemyState[],
  spawnRequests: EnemySpawnRequest[],
) {
  if (!director.bossPrelude) return false;
  director.bossPrelude.elapsed += dt;
  if (director.bossPrelude.elapsed < bossApproachGroundTransitionSeconds(director.act)) {
    updateBossPreludeReinforcements(director, dt, activeEnemies, spawnRequests);
    return false;
  }

  director.bossPrelude = null;
  director.wave = null;
  return true;
}

function updateSpawningWave(
  director: EnemyDirectorState,
  dt: number,
  activeEnemies: readonly EnemyState[],
  spawnRequests: EnemySpawnRequest[],
  lowHealth: boolean,
) {
  const wave = director.wave;
  if (!wave) return;
  const activeCost = activeSpawnCost(activeEnemies)
    + spawnRequests.reduce((total, request) => total + enemySpawnCost(request.enemyId, request.elite), 0);

  wave.timer = Math.max(0, wave.timer - dt);
  if (wave.timer > 0) return;

  const entry = wave.entries[wave.nextEntryIndex];
  if (!entry) {
    finishWave(director, activeCost, lowHealth);
    return;
  }

  const spawnCost = enemySpawnCost(entry.enemyId, entry.elite);
  if (
    activeCost + spawnCost > wave.activeBudget
    || !canSpawnByDirectorCap(activeEnemies, entry.enemyId)
  ) {
    wave.timer = MIN_ENTRY_DELAY;
    return;
  }

  spawnRequests.push({ enemyId: entry.enemyId, pattern: entry.spawnPattern, elite: entry.elite });
  rememberRecentEnemy(director, entry.enemyId);
  entry.remaining -= 1;

  if (entry.remaining > 0) {
    wave.timer = MIN_ENTRY_DELAY;
    return;
  }

  wave.nextEntryIndex += 1;
  const nextEntry = wave.entries[wave.nextEntryIndex];
  wave.timer = nextEntry ? nextEntry.delayAfterPrevious : MIN_ENTRY_DELAY;
}

export function updateEnemyDirector(
  director: EnemyDirectorState,
  input: {
    dt: number;
    bossKills: number;
    elapsedSeconds: number;
    activeEnemies: readonly EnemyState[];
    playerHp: number;
    playerMaxHp: number;
    bossActive: boolean;
  },
): EnemyDirectorUpdate {
  if (director.act !== actForBossKills(input.bossKills)) {
    advanceEnemyDirectorToAct(director, input.bossKills, input.elapsedSeconds);
  }

  const spawnRequests: EnemySpawnRequest[] = [];
  if (input.bossActive) return { spawnRequests, spawnBoss: false };

  director.elapsedInAct += input.dt;
  if (updateBossPrelude(director, input.dt, input.activeEnemies, spawnRequests)) {
    return { spawnRequests, spawnBoss: true };
  }

  if (!director.bossPrelude && shouldStartBossPrelude(director)) {
    director.bossPrelude = {
      elapsed: 0,
      reinforcementTimer: 0,
      reinforcementsSpawned: 0,
    };
    director.wave = null;
    return {
      spawnRequests,
      spawnBoss: bossApproachGroundTransitionSeconds(director.act) <= 0,
    };
  }

  const lowHealth = input.playerMaxHp > 0 && input.playerHp / input.playerMaxHp < LOW_HEALTH_RATIO;
  if (!director.wave) startWave(director, lowHealth);
  if (!director.wave) return { spawnRequests, spawnBoss: false };
  const waveDt = spawnTimerDelta(director.act, input.dt);

  if (director.wave.phase === "prepare") {
    director.wave.timer = Math.max(0, director.wave.timer - waveDt);
    if (director.wave.timer <= 0) {
      director.wave.phase = "spawning";
      director.wave.timer = director.wave.entries[0]?.delayAfterPrevious ?? 0;
    }
  } else if (director.wave.phase === "spawning") {
    updateSpawningWave(director, waveDt, input.activeEnemies, spawnRequests, lowHealth);
  } else {
    director.wave.timer = Math.max(0, director.wave.timer - waveDt);
    if (director.wave.timer <= 0) startWave(director, lowHealth);
  }

  return { spawnRequests, spawnBoss: false };
}
