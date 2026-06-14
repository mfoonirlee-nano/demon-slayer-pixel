import { state } from "../state";
import {
  WIDTH,
  ENEMY_SHEETS,
  ENEMY_CONFIG,
  LEAPER_UNLOCK_SECONDS,
  SPLITTER_UNLOCK_SECONDS,
  WARDEN_UNLOCK_SECONDS,
  BURROWER_UNLOCK_SECONDS,
  LANTERN_EMBER_CONFIG,
  RUNTIME_CONFIG,
} from "../constants";
import type { EnemyState } from "../types/game-state";
import { hitbox } from "../utils";
import { hurtPlayer } from "./player";
import { createEnemyState, enemyBaseHp, enemyDamage } from "./enemies/common";
import { canSpawnBrute, isBruteSheet } from "./enemies/brute";
import { BINDER_UNLOCK_SECONDS, canSpawnBinder, isBinderSheet } from "./enemies/binder";
import { canSpawnDuelist, isDuelistSheet } from "./enemies/duelist";
import { GLIDER_UNLOCK_SECONDS, canSpawnGlider, isGliderSheet } from "./enemies/glider";
import { canSpawnLeaper, isLeaperSheet } from "./enemies/leaper";
import { canSpawnSplitter, isSplitterSheet } from "./enemies/splitter";
import { applyWardenAuraBuffs, canSpawnWarden, isWardenSheet } from "./enemies/warden";
import { canSpawnBurrower, isBurrowerSheet } from "./enemies/burrower";
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
  if (isGliderSheet(sheetIndex)) return canSpawnGlider();
  if (isLeaperSheet(sheetIndex)) return canSpawnLeaper();
  if (isSplitterSheet(sheetIndex)) return canSpawnSplitter();
  if (isWardenSheet(sheetIndex)) return canSpawnWarden();
  if (isBurrowerSheet(sheetIndex)) return canSpawnBurrower();
  return true;
}

function canRandomSpawnSheetIndex(sheetIndex: number) {
  if (isBinderSheet(sheetIndex) && state.elapsed < BINDER_UNLOCK_SECONDS) return false;
  if (isGliderSheet(sheetIndex) && state.elapsed < GLIDER_UNLOCK_SECONDS) return false;
  if (isLeaperSheet(sheetIndex) && state.elapsed < LEAPER_UNLOCK_SECONDS) return false;
  if (isSplitterSheet(sheetIndex) && state.elapsed < SPLITTER_UNLOCK_SECONDS) return false;
  if (isWardenSheet(sheetIndex) && state.elapsed < WARDEN_UNLOCK_SECONDS) return false;
  if (isBurrowerSheet(sheetIndex) && state.elapsed < BURROWER_UNLOCK_SECONDS) return false;
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
  enemyArchetypeForSheet(enemy.sheetIndex).draw(enemy);
}
