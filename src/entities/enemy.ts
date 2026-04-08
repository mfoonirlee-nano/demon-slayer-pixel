import { state } from "../state";
import { WIDTH, GROUND_Y, ENEMY_SHEETS, ENEMY_DRAW_SCALE, ENEMY_CONFIG } from "../constants";
import type { EnemyState } from "../types/game-state";
import { hitbox, frameIndex } from "../utils";
import { drawSheetFrame } from "../graphics";
import { hurtPlayer } from "./player";

export function spawnEnemy() {
  const side = Math.random() < ENEMY_CONFIG.spawnSideChance ? -1 : 1;
  const speed = ENEMY_CONFIG.baseSpeed + Math.random() * ENEMY_CONFIG.randomSpeed + state.elapsed * ENEMY_CONFIG.speedScaleByElapsed;
  const damage = Math.min(ENEMY_CONFIG.maxDamage, ENEMY_CONFIG.baseDamage + state.elapsed * ENEMY_CONFIG.damageScaleByElapsed);
  state.enemies.push({
    x: side === 1 ? WIDTH + ENEMY_CONFIG.spawnOffsetRight : ENEMY_CONFIG.spawnOffsetLeft,
    y: GROUND_Y - ENEMY_CONFIG.yOffsetFromGround,
    w: ENEMY_CONFIG.w,
    h: ENEMY_CONFIG.h,
    vx: -side * speed,
    hp: ENEMY_CONFIG.baseHp + state.elapsed * ENEMY_CONFIG.hpScaleByElapsed,
    damage,
    hitCd: 0,
    animSeed: Math.floor(Math.random() * ENEMY_CONFIG.animSeedMax),
    sheetIndex: Math.floor(Math.random() * ENEMY_SHEETS.length),
  });
}

export function updateEnemies() {
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const e = state.enemies[i];
    e.x += e.vx;
    e.hitCd -= 1;

    const toward = state.player.x + state.player.w / 2 - (e.x + e.w / 2);
    e.vx += Math.sign(toward) * ENEMY_CONFIG.steeringForce;
    e.vx = Math.max(-ENEMY_CONFIG.maxAbsVelocity, Math.min(ENEMY_CONFIG.maxAbsVelocity, e.vx));

    if (hitbox(state.player, e)) {
      hurtPlayer(e.damage, e.vx);
    }

    if (e.x < -ENEMY_CONFIG.despawnMargin || e.x > WIDTH + ENEMY_CONFIG.despawnMargin) {
      state.enemies.splice(i, 1);
    }
  }
}

export function drawEnemy(e: EnemyState) {
  const sheet = ENEMY_SHEETS[e.sheetIndex % ENEMY_SHEETS.length] || ENEMY_SHEETS[0];
  const frame = frameIndex(sheet.count, ENEMY_CONFIG.animSpeed, state.elapsed, e.animSeed);
  const facing = e.vx > 0 ? 1 : -1;
  const drawW = Math.round(sheet.frameW * ENEMY_DRAW_SCALE);
  const drawH = Math.round(sheet.frameH * ENEMY_DRAW_SCALE);
  const centerX = e.x + e.w / 2;
  const feetY = e.y + e.h;
  drawSheetFrame(sheet, frame, centerX - drawW / 2, feetY - drawH, drawW, drawH, facing);
}
