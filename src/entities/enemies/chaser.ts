import { state } from "../../state";
import { ENEMY_CONFIG, ENEMY_SHEETS } from "../../constants";
import type { EnemyArchetype } from "./common";
import { commonEnemySpeed, drawEnemyFrame, enemyDrawScale, steerEnemyTowardX } from "./common";

const HALF_DIVISOR = 2;

function playerCenterX() {
  return state.player.x + state.player.w / HALF_DIVISOR;
}

export const CHASER_ARCHETYPE: EnemyArchetype = {
  speed: () => commonEnemySpeed() + state.elapsed * ENEMY_CONFIG.speedScaleByElapsed,
  update(enemy) {
    enemy.x += enemy.vx;
    steerEnemyTowardX(enemy, playerCenterX());
  },
  draw(enemy) {
    const sheet = ENEMY_SHEETS[enemy.sheetIndex % ENEMY_SHEETS.length] || ENEMY_SHEETS[0];
    const facing = enemy.vx > 0 ? 1 : -1;
    drawEnemyFrame(enemy, sheet, enemyDrawScale(CHASER_ARCHETYPE), ENEMY_CONFIG.animSpeed, state.elapsed, facing);
  },
};
