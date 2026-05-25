import { state } from "../state";
import {
  WIDTH,
  ENEMY_SHEETS,
  ENEMY_CONFIG,
  RUNTIME_CONFIG,
} from "../constants";
import type { EnemyState } from "../types/game-state";
import { hitbox } from "../utils";
import { hurtPlayer } from "./player";
import { createEnemyState, enemyBaseHp, enemyDamage } from "./enemies/common";
import { canSpawnBrute, isBruteSheet } from "./enemies/brute";
import { BINDER_UNLOCK_SECONDS, canSpawnBinder, isBinderSheet } from "./enemies/binder";
import { canSpawnDuelist, isDuelistSheet } from "./enemies/duelist";
import { enemyArchetypeForSheet } from "./enemies/registry";

const CHASER_SHEET_INDEX = 0;

function createSpawnedEnemy(sheetIndex: number, side: number): EnemyState {
  const archetype = enemyArchetypeForSheet(sheetIndex);
  const spawnContext = {
    side,
    sheetIndex,
    speed: archetype.speed(),
    damage: enemyDamage(state.elapsed),
    baseHp: enemyBaseHp(state.elapsed),
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
  return true;
}

function canRandomSpawnSheetIndex(sheetIndex: number) {
  if (isBinderSheet(sheetIndex) && state.elapsed < BINDER_UNLOCK_SECONDS) return false;
  return canSpawnSheetIndex(sheetIndex);
}

function randomSpawnSheetIndex() {
  const candidates = ENEMY_SHEETS
    .map((_, sheetIndex) => sheetIndex)
    .filter(canRandomSpawnSheetIndex);
  if (candidates.length === 0) return CHASER_SHEET_INDEX;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function spawnEnemy() {
  if (state.enemies.length >= RUNTIME_CONFIG.enemyMaxCount) return;

  const side = Math.random() < ENEMY_CONFIG.spawnSideChance ? -1 : 1;
  const sheetIndex = randomSpawnSheetIndex();
  state.enemies.push(createSpawnedEnemy(sheetIndex, side));
}

export function spawnEnemyBySheetIndex(sheetIndex: number, side = 1) {
  if (!canSpawnSheetIndex(sheetIndex)) return;
  state.enemies.push(createSpawnedEnemy(sheetIndex, side));
}

export function updateEnemies() {
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];
    enemy.hitCd -= 1;

    enemyArchetypeForSheet(enemy.sheetIndex).update(enemy);

    if (hitbox(state.player, enemy)) {
      hurtPlayer(enemy.damage, enemy.vx);
    }

    if (enemy.x < -ENEMY_CONFIG.despawnMargin || enemy.x > WIDTH + ENEMY_CONFIG.despawnMargin) {
      state.enemies.splice(i, 1);
    }
  }
}

export function drawEnemy(enemy: EnemyState) {
  enemyArchetypeForSheet(enemy.sheetIndex).draw(enemy);
}
