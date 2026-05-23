import { state } from "../state";
import { WIDTH, ENEMY_SHEETS, ENEMY_CONFIG, RUNTIME_CONFIG } from "../constants";
import type { EnemyState } from "../types/game-state";
import { hitbox } from "../utils";
import { hurtPlayer } from "./player";
import { createEnemyState, enemyBaseHp, enemyDamage } from "./enemies/common";
import { canSpawnBrute, isBruteSheet } from "./enemies/brute";
import { enemyArchetypeForSheet } from "./enemies/registry";

export function spawnEnemy() {
  if (state.enemies.length >= RUNTIME_CONFIG.enemyMaxCount) return;

  const side = Math.random() < ENEMY_CONFIG.spawnSideChance ? -1 : 1;
  let sheetIndex = Math.floor(Math.random() * ENEMY_SHEETS.length);
  if (isBruteSheet(sheetIndex) && !canSpawnBrute() && ENEMY_SHEETS.length > 1) {
    sheetIndex = Math.floor(Math.random() * (ENEMY_SHEETS.length - 1));
  }
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
  state.enemies.push(enemy);
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
