import type {
  EnemyDirectorState,
  EnemyId,
  EnemyState,
  SpawnPattern,
  WaveEntryRole,
  WaveEntryRuntimeState,
} from "../types/game-state";
import { ENEMY_ARCHETYPES, PROFILE_CONFIGS } from "./enemyDirectorConfig";
import {
  activeSpawnCost,
  advanceEnemyDirectorToAct,
  anyEnemyHasTag,
  canSpawnByDirectorCap,
  maxActiveSpawnCostForAct,
  RECENT_ENEMY_LIMIT,
  seededRandom,
  weightedPick,
} from "./enemyDirectorRules";
import {
  actForBossKills,
  bossGateForAct,
  bossPreludeTargetCost,
  bossPreludeWaitSeconds,
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
const LOW_HEALTH_BREATHER_BONUS = 1.1;
const MIN_ENTRY_DELAY = 0.42;
const MIN_BREATHER_SECONDS = 1.2;
const BASE_BREATHER_SECONDS = 2.1;
const MAX_BREATHER_SECONDS = 4.5;
const HARD_WAVE_INTERVAL = 4;
const LIGHT_WAVE_INTERVAL = 3;
const WAVE_SEED_ACT_SALT = 1009;
const WAVE_SEED_CLEAR_SALT = 9176;
const WAVE_SEED_RECENT_SALT = 37;
const TIER_ONE_COMPLEXITY = 1;
const PRESSURE_PINCER_CHANCE = 0.35;
const REINFORCE_CLUSTER_CHANCE = 0.45;
const DOUBLE_OPENER_CHANCE = 0.45;
const OPENER_ENTRY_DELAY = 0.2;
const PRESSURE_ENTRY_DELAY = 0.8;
const SUPPORT_ENTRY_DELAY = 1.1;
const EXTRA_ENTRY_BASE_DELAY = 0.7;
const EXTRA_ENTRY_RANDOM_DELAY = 0.6;
const MAX_WAVE_ENTRIES = 5;
const PREPARE_WAVE_SECONDS = 0.65;
const ACTIVE_COST_BREATHER_SCALE = 0.22;
const LOW_HEALTH_RATIO = 0.35;

export type EnemySpawnRequest = {
  enemyId: EnemyId;
  pattern: SpawnPattern;
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
  return weightedPick(candidates, (entry) => entry.weight, rng)?.enemyId
    ?? director.currentPool[0]?.enemyId
    ?? "chaser";
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
    if (plannedCost >= targetBudget) return;
    const enemyId = pickPoolEnemy(director, rng, predicate);
    const config = ENEMY_ARCHETYPES[enemyId];
    const role = roleForEnemy(enemyId, director);
    const canDouble = config.complexityTier === TIER_ONE_COMPLEXITY && plannedCost + config.spawnCost * 2 <= targetBudget;
    const remaining = canDouble && rng() < DOUBLE_OPENER_CHANCE ? 2 : 1;
    entries.push(makeWaveEntry(enemyId, role, rng, remaining, delay));
    plannedCost += config.spawnCost * remaining;
  };

  addEntry((enemyId) => ENEMY_ARCHETYPES[enemyId].complexityTier <= 2, OPENER_ENTRY_DELAY);
  addEntry((enemyId) => anyEnemyHasTag(enemyId, profile.requiredTags), PRESSURE_ENTRY_DELAY);
  addEntry((enemyId) => anyEnemyHasTag(enemyId, ["ranged", "control", "support"]), SUPPORT_ENTRY_DELAY);
  while (plannedCost < targetBudget && entries.length < MAX_WAVE_ENTRIES) {
    addEntry(() => true, EXTRA_ENTRY_BASE_DELAY + rng() * EXTRA_ENTRY_RANDOM_DELAY);
  }

  return entries.length > 0
    ? entries
    : [makeWaveEntry(director.currentPool[0]?.enemyId ?? "chaser", "opener", rng, 1, OPENER_ENTRY_DELAY)];
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

function updateBossPrelude(director: EnemyDirectorState, dt: number, activeCost: number) {
  if (!director.bossPrelude) return false;
  director.bossPrelude.elapsed += dt;
  const readyByWait = director.bossPrelude.elapsed >= bossPreludeWaitSeconds(director.act);
  const readyByPressure = activeCost <= bossPreludeTargetCost(director.act);
  if (!readyByWait && !readyByPressure) return false;

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
    + spawnRequests.reduce((total, request) => total + ENEMY_ARCHETYPES[request.enemyId].spawnCost, 0);

  wave.timer = Math.max(0, wave.timer - dt);
  if (wave.timer > 0) return;

  const entry = wave.entries[wave.nextEntryIndex];
  if (!entry) {
    finishWave(director, activeCost, lowHealth);
    return;
  }

  const spawnCost = ENEMY_ARCHETYPES[entry.enemyId].spawnCost;
  if (
    activeCost + spawnCost > wave.activeBudget
    || !canSpawnByDirectorCap(activeEnemies, entry.enemyId)
  ) {
    wave.timer = MIN_ENTRY_DELAY;
    return;
  }

  spawnRequests.push({ enemyId: entry.enemyId, pattern: entry.spawnPattern });
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
  const activeCost = activeSpawnCost(input.activeEnemies);
  if (updateBossPrelude(director, input.dt, activeCost)) {
    return { spawnRequests, spawnBoss: true };
  }

  if (!director.bossPrelude && shouldStartBossPrelude(director)) {
    director.bossPrelude = { elapsed: 0 };
    director.wave = null;
    return { spawnRequests, spawnBoss: bossPreludeWaitSeconds(director.act) <= 0 };
  }

  const lowHealth = input.playerMaxHp > 0 && input.playerHp / input.playerMaxHp < LOW_HEALTH_RATIO;
  if (!director.wave) startWave(director, lowHealth);
  if (!director.wave) return { spawnRequests, spawnBoss: false };

  if (director.wave.phase === "prepare") {
    director.wave.timer = Math.max(0, director.wave.timer - input.dt);
    if (director.wave.timer <= 0) {
      director.wave.phase = "spawning";
      director.wave.timer = director.wave.entries[0]?.delayAfterPrevious ?? 0;
    }
  } else if (director.wave.phase === "spawning") {
    updateSpawningWave(director, input.dt, input.activeEnemies, spawnRequests, lowHealth);
  } else {
    director.wave.timer = Math.max(0, director.wave.timer - input.dt);
    if (director.wave.timer <= 0) startWave(director, lowHealth);
  }

  return { spawnRequests, spawnBoss: false };
}
