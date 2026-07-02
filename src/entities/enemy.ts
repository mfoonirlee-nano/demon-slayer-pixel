import { state } from "../game/state";
import {
  WIDTH,
  GRAVITY,
  GROUND_Y,
  ENEMY_SHEETS,
  ENEMY_CONFIG,
  LANTERN_EMBER_CONFIG,
  PLAYER_COMBAT,
} from "../constants";
import type { ActBand, EnemyId, EnemySpawnSource, EnemyState, PlatformState, SpawnPattern } from "../types/game-state";
import { hitbox } from "../game/utils";
import { hurtPlayer } from "./player";
import { createEnemyState, drawEnemyEliteMarker } from "./enemies/common";
import { canSpawnBrute, isBruteSheet } from "./enemies/brute";
import { canSpawnBinder, isBinderSheet } from "./enemies/binder";
import { canSpawnDuelist, isDuelistSheet } from "./enemies/duelist";
import { canSpawnGlider, isGliderSheet } from "./enemies/glider";
import { canSpawnLeaper, isLeaperSheet } from "./enemies/leaper";
import { canSpawnSplitter, isSplitterSheet } from "./enemies/splitter";
import { applyWardenAuraBuffs, canSpawnWarden, isWardenSheet } from "./enemies/warden";
import { canSpawnBurrower, isBurrowerSheet } from "./enemies/burrower";
import { enemyArchetypeForSheet } from "./enemies/registry";
import {
  activeSpawnCost,
  canSpawnByDirectorCap,
  canSpawnBossSummon,
  enemySpawnCost,
  enemyArchetypeById,
  enemyIdForSheetIndex,
  enemySpawnStats,
  maxActiveSpawnCostForAct,
  pickBossSummonEnemyId,
  pickRegularEnemyId,
} from "../systems/enemyDirector";
import { BOSS_ARCHETYPE_IDS } from "./bosses/registry";
import { actBandForAct } from "../systems/runProgression";

type SpawnEnemyOptions = {
  elite?: boolean;
  growthStage?: ActBand;
};

const PLATFORM_SPAWN_MAX_DISTANCE = 260;
const PLATFORM_SPAWN_CENTER_RATIO = 0.35;
const PLATFORM_READY_ENEMY_IDS: readonly EnemyId[] = [
  "chaser",
  "crawler",
  "runner",
  "duelist",
  "caster",
  "splitter",
  "brute",
  "binder",
  "warden",
];
const DEBUG_BOSS_KILLS_BY_GROWTH_STAGE: Record<ActBand, number> = {
  intro: 0,
  awakened: 6,
  final: 12,
};

function sideForPattern(pattern: SpawnPattern): number {
  if (pattern === "left") return -1;
  if (pattern === "right") return 1;
  return Math.random() < ENEMY_CONFIG.spawnSideChance ? -1 : 1;
}

function isPlatformSpawnCandidate(platform: PlatformState) {
  return platform.x >= WIDTH
    && platform.x <= WIDTH + PLATFORM_SPAWN_MAX_DISTANCE
    && platform.kind !== "hover";
}

function platformSpawnCandidate() {
  let picked: PlatformState | null = null;

  for (const platform of state.platforms) {
    if (!isPlatformSpawnCandidate(platform)) continue;
    if (!picked || platform.x < picked.x) picked = platform;
  }

  return picked;
}

function canUsePlatformSpawn(enemyId: EnemyId, source: EnemySpawnSource) {
  return source === "regular" && PLATFORM_READY_ENEMY_IDS.includes(enemyId);
}

function enemyUsesPlatformPhysics(enemy: EnemyState) {
  if (enemy.id === "crawler" && enemy.crawlerPhase === "leap") return false;
  return PLATFORM_READY_ENEMY_IDS.includes(enemy.id);
}

function clampEnemyCenterToPlatform(centerX: number, enemy: EnemyState, platform: PlatformState) {
  const minCenterX = platform.x + enemy.w / 2;
  const maxCenterX = platform.x + platform.w - enemy.w / 2;
  if (minCenterX > maxCenterX) return platform.x + platform.w / 2;
  return Math.min(maxCenterX, Math.max(minCenterX, centerX));
}

function placeEnemyOnPlatform(enemy: EnemyState, platform: PlatformState) {
  const centerX = clampEnemyCenterToPlatform(
    platform.x + platform.w * PLATFORM_SPAWN_CENTER_RATIO,
    enemy,
    platform,
  );
  enemy.x = centerX - enemy.w / 2;
  enemy.y = platform.y - enemy.h;
  enemy.vy = 0;
  enemy.onPlatform = platform;
}

function enemyOverlapsPlatform(enemy: EnemyState, platform: PlatformState) {
  return enemy.x + enemy.w > platform.x + PLAYER_COMBAT.platformEdgePadding
    && enemy.x < platform.x + platform.w - PLAYER_COMBAT.platformEdgePadding;
}

function prepareEnemyPlatformPhysics(enemy: EnemyState) {
  const platform = enemy.onPlatform ?? null;
  if (platform && state.platforms.includes(platform) && enemyOverlapsPlatform(enemy, platform)) {
    enemy.x += platform.vx;
  } else {
    enemy.onPlatform = null;
  }

  return enemy.y + enemy.h;
}

function applyEnemyPlatformPhysics(enemy: EnemyState, prevBottom: number) {
  enemy.vy = (enemy.vy ?? 0) + GRAVITY;
  enemy.y += enemy.vy;
  enemy.onPlatform = null;

  let landed = false;
  if (enemy.vy >= 0) {
    for (const platform of state.platforms) {
      if (!enemyOverlapsPlatform(enemy, platform)) continue;
      const nowBottom = enemy.y + enemy.h;
      if (prevBottom <= platform.y + PLAYER_COMBAT.platformLandingTolerance && nowBottom >= platform.y) {
        enemy.y = platform.y - enemy.h;
        enemy.vy = 0;
        enemy.onPlatform = platform;
        landed = true;
        break;
      }
    }
  }

  if (!landed && enemy.y + enemy.h >= GROUND_Y) {
    enemy.y = GROUND_Y - enemy.h;
    enemy.vy = 0;
  }
}

function createSpawnedEnemy(
  enemyId: EnemyId,
  side: number,
  spawnSource: EnemySpawnSource,
  options: SpawnEnemyOptions = {},
): EnemyState {
  const config = enemyArchetypeById(enemyId);
  const archetype = enemyArchetypeForSheet(config.sheetIndex);
  const growthStage = options.growthStage ?? actBandForAct(state.enemyDirector.act);
  const statBossKills = spawnSource === "debug" && options.growthStage
    ? DEBUG_BOSS_KILLS_BY_GROWTH_STAGE[options.growthStage]
    : state.bossKills;
  const stats = enemySpawnStats(enemyId, statBossKills, state.elapsed);
  const elite = options.elite === true && spawnSource === "regular";
  const spawnContext = {
    enemyId,
    spawnSource,
    spawnCost: enemySpawnCost(enemyId, elite),
    growthStage,
    elite,
    side,
    sheetIndex: config.sheetIndex,
    speed: stats.speed,
    damage: stats.damage,
    baseHp: stats.hp / (archetype.hpMultiplier ?? 1),
  };
  const enemy = createEnemyState(spawnContext, archetype);
  if (canUsePlatformSpawn(enemyId, spawnSource)) {
    const platform = platformSpawnCandidate();
    if (platform) placeEnemyOnPlatform(enemy, platform);
  }
  archetype.init?.(enemy, spawnContext);
  return enemy;
}

function canSpawnSheetIndex(sheetIndex: number) {
  if (!ENEMY_SHEETS[sheetIndex]) return false;
  if (isBruteSheet(sheetIndex)) return canSpawnBrute();
  if (isBinderSheet(sheetIndex)) return canSpawnBinder();
  if (isDuelistSheet(sheetIndex)) return canSpawnDuelist();
  if (isGliderSheet(sheetIndex)) return canSpawnGlider();
  if (isLeaperSheet(sheetIndex)) return canSpawnLeaper();
  if (isSplitterSheet(sheetIndex)) return canSpawnSplitter();
  if (isWardenSheet(sheetIndex)) return canSpawnWarden();
  if (isBurrowerSheet(sheetIndex)) return canSpawnBurrower();
  return true;
}

function canSpawnEnemyId(enemyId: EnemyId, source: EnemySpawnSource, options: SpawnEnemyOptions = {}) {
  const config = enemyArchetypeById(enemyId);
  const elite = options.elite === true && source === "regular";
  const spawnCost = enemySpawnCost(enemyId, elite);
  if (!ENEMY_SHEETS[config.sheetIndex]) return false;
  if (!canSpawnSheetIndex(config.sheetIndex)) return false;
  if (source === "debug") return true;
  if (!canSpawnByDirectorCap(state.enemies, enemyId)) return false;
  if (source === "boss") {
    return canSpawnBossSummon(
      state.enemies,
      spawnCost,
      state.boss?.phase ?? 1,
      state.boss?.awakened ?? false,
      state.boss?.id === BOSS_ARCHETYPE_IDS.bloodMoon,
    );
  }
  return activeSpawnCost(state.enemies) + spawnCost <= maxActiveSpawnCostForAct(
    state.enemyDirector.act,
    state.enemyDirector.elapsedInAct,
  );
}

export function spawnEnemyById(
  enemyId: EnemyId,
  source: EnemySpawnSource = "regular",
  pattern: SpawnPattern = "random_edge",
  options: SpawnEnemyOptions = {},
) {
  if (!canSpawnEnemyId(enemyId, source, options)) return false;

  state.enemies.push(createSpawnedEnemy(enemyId, sideForPattern(pattern), source, options));
  return true;
}

export function spawnEnemy(source: EnemySpawnSource = "regular") {
  const enemyId = source === "boss"
    ? pickBossSummonEnemyId(state.enemyDirector, Math.random, {
        phase: state.boss?.phase ?? 1,
        awakened: state.boss?.awakened ?? false,
        finalBoss: state.boss?.id === BOSS_ARCHETYPE_IDS.bloodMoon,
      })
    : pickRegularEnemyId(state.enemyDirector);
  return spawnEnemyById(enemyId, source);
}

export function spawnBossSummonEnemy() {
  return spawnEnemy("boss");
}

export function spawnEnemyBySheetIndex(sheetIndex: number, side = 1, options: SpawnEnemyOptions = {}) {
  if (!canSpawnSheetIndex(sheetIndex)) return;
  const enemyId = enemyIdForSheetIndex(sheetIndex);
  state.enemies.push(createSpawnedEnemy(enemyId, side, "debug", options));
}

export function updateEnemies() {
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];
    const lanternBuffed = (enemy.lanternBuffTimer ?? 0) > 0;
    enemy.hitCd -= 1;
    if ((enemy.armorBreakTimer ?? 0) > 0) {
      enemy.armorBreakTimer = Math.max(0, (enemy.armorBreakTimer ?? 0) - 1);
    }

    const archetype = enemyArchetypeForSheet(enemy.sheetIndex);
    const usesPlatformPhysics = enemyUsesPlatformPhysics(enemy);
    const prevBottom = usesPlatformPhysics ? prepareEnemyPlatformPhysics(enemy) : 0;
    archetype.update(enemy);
    if (archetype.shouldRemove?.(enemy)) {
      state.enemies.splice(i, 1);
      continue;
    }

    if (lanternBuffed) {
      enemy.x += enemy.vx * LANTERN_EMBER_CONFIG.buffSpeedExtraScale;
      enemy.lanternBuffTimer = Math.max(0, (enemy.lanternBuffTimer ?? 0) - 1);
    }

    if (usesPlatformPhysics) applyEnemyPlatformPhysics(enemy, prevBottom);
  }

  applyWardenAuraBuffs();

  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];
    const lanternBuffed = (enemy.lanternBuffTimer ?? 0) > 0;
    const archetype = enemyArchetypeForSheet(enemy.sheetIndex);
    if (!archetype.contactDamageDisabled?.(enemy) && hitbox(state.player, enemy)) {
      const damage = lanternBuffed
        ? enemy.damage * LANTERN_EMBER_CONFIG.buffDamageScale
        : enemy.damage;
      hurtPlayer(damage, enemy.vx);
    }

    if (enemy.x < -ENEMY_CONFIG.despawnMargin || enemy.x > WIDTH + ENEMY_CONFIG.despawnMargin) {
      state.enemies.splice(i, 1);
    }
  }
}

export function drawEnemy(enemy: EnemyState) {
  const archetype = enemyArchetypeForSheet(enemy.sheetIndex);
  archetype.draw(enemy);
  drawEnemyEliteMarker(enemy, archetype);
}
