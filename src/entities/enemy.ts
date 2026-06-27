import { state } from "../game/state";
import {
  WIDTH,
  ENEMY_SHEETS,
  ENEMY_CONFIG,
  LANTERN_EMBER_CONFIG,
} from "../constants";
import type { EnemyId, EnemySpawnSource, EnemyState, SpawnPattern } from "../types/game-state";
import { hitbox } from "../game/utils";
import { hurtPlayer } from "./player";
import { createEnemyState, drawEnemyGrowthMarker } from "./enemies/common";
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
};

function sideForPattern(pattern: SpawnPattern): number {
  if (pattern === "left") return -1;
  if (pattern === "right") return 1;
  return Math.random() < ENEMY_CONFIG.spawnSideChance ? -1 : 1;
}

function createSpawnedEnemy(
  enemyId: EnemyId,
  side: number,
  spawnSource: EnemySpawnSource,
  options: SpawnEnemyOptions = {},
): EnemyState {
  const config = enemyArchetypeById(enemyId);
  const archetype = enemyArchetypeForSheet(config.sheetIndex);
  const stats = enemySpawnStats(enemyId, state.bossKills, state.elapsed);
  const elite = options.elite === true && spawnSource === "regular";
  const spawnContext = {
    enemyId,
    spawnSource,
    spawnCost: enemySpawnCost(enemyId, elite),
    growthStage: actBandForAct(state.enemyDirector.act),
    elite,
    side,
    sheetIndex: config.sheetIndex,
    speed: stats.speed,
    damage: stats.damage,
    baseHp: stats.hp / (archetype.hpMultiplier ?? 1),
  };
  const enemy = createEnemyState(spawnContext, archetype);
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

export function spawnEnemyBySheetIndex(sheetIndex: number, side = 1) {
  if (!canSpawnSheetIndex(sheetIndex)) return;
  const enemyId = enemyIdForSheetIndex(sheetIndex);
  state.enemies.push(createSpawnedEnemy(enemyId, side, "debug"));
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
    archetype.update(enemy);
    if (archetype.shouldRemove?.(enemy)) {
      state.enemies.splice(i, 1);
      continue;
    }

    if (lanternBuffed) {
      enemy.x += enemy.vx * LANTERN_EMBER_CONFIG.buffSpeedExtraScale;
      enemy.lanternBuffTimer = Math.max(0, (enemy.lanternBuffTimer ?? 0) - 1);
    }
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
  drawEnemyGrowthMarker(enemy, archetype);
}
