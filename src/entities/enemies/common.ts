import {
  WIDTH,
  GROUND_Y,
  ENEMY_SHEETS,
  ENEMY_DRAW_SCALE,
  ENEMY_CONFIG,
} from "../../constants";
import type { SpriteSheet } from "../../types/assets";
import type { EnemyState } from "../../types/game-state";
import { frameIndex } from "../../utils";
import { drawSheetFrame } from "../../graphics";

const HALF_DIVISOR = 2;

export type EnemySpawnContext = {
  side: number;
  sheetIndex: number;
  speed: number;
  damage: number;
  baseHp: number;
};

export type EnemyArchetype = {
  speed: () => number;
  hpMultiplier?: number;
  drawScale?: number;
  init?: (enemy: EnemyState, context: EnemySpawnContext) => void;
  update: (enemy: EnemyState) => void;
  draw: (enemy: EnemyState) => void;
};

export function commonEnemySpeed() {
  return ENEMY_CONFIG.baseSpeed + Math.random() * ENEMY_CONFIG.randomSpeed;
}

export function enemyDamage(elapsed: number) {
  return Math.min(ENEMY_CONFIG.maxDamage, ENEMY_CONFIG.baseDamage + elapsed * ENEMY_CONFIG.damageScaleByElapsed);
}

export function enemyBaseHp(elapsed: number) {
  return ENEMY_CONFIG.baseHp + elapsed * ENEMY_CONFIG.hpScaleByElapsed;
}

export function enemyDrawScale(archetype: EnemyArchetype) {
  return ENEMY_DRAW_SCALE * (archetype.drawScale ?? 1);
}

export function enemyCollisionSize(sheetIndex: number, archetype: EnemyArchetype) {
  const sheet = ENEMY_SHEETS[sheetIndex % ENEMY_SHEETS.length] || ENEMY_SHEETS[0];
  const drawScale = enemyDrawScale(archetype);
  const drawW = Math.round(sheet.frameW * drawScale);
  const drawH = Math.round(sheet.frameH * drawScale);
  return {
    w: Math.round(drawW * ENEMY_CONFIG.collisionScaleX),
    h: Math.round(drawH * ENEMY_CONFIG.collisionScaleY),
  };
}

export function createEnemyState(context: EnemySpawnContext, archetype: EnemyArchetype): EnemyState {
  const size = enemyCollisionSize(context.sheetIndex, archetype);
  return {
    x: context.side === 1 ? WIDTH + ENEMY_CONFIG.spawnOffsetRight : ENEMY_CONFIG.spawnOffsetLeft,
    y: GROUND_Y - size.h,
    w: size.w,
    h: size.h,
    vx: -context.side * context.speed,
    hp: context.baseHp * (archetype.hpMultiplier ?? 1),
    damage: context.damage,
    hitCd: 0,
    animSeed: Math.floor(Math.random() * ENEMY_CONFIG.animSeedMax),
    sheetIndex: context.sheetIndex,
  };
}

export function enemyCenterX(enemy: EnemyState) {
  return enemy.x + enemy.w / HALF_DIVISOR;
}

export function enemyFeetY(enemy: EnemyState) {
  return enemy.y + enemy.h;
}

export function steerEnemyTowardX(enemy: EnemyState, targetX: number) {
  const toward = targetX - enemyCenterX(enemy);
  enemy.vx += Math.sign(toward) * ENEMY_CONFIG.steeringForce;
  enemy.vx = Math.max(-ENEMY_CONFIG.maxAbsVelocity, Math.min(ENEMY_CONFIG.maxAbsVelocity, enemy.vx));
}

export function drawEnemyFrame(
  enemy: EnemyState,
  sheet: SpriteSheet,
  drawScale: number,
  animSpeed: number,
  elapsed: number,
  facing: number,
) {
  const frame = frameIndex(sheet.count, animSpeed, elapsed, enemy.animSeed);
  const drawW = Math.round(sheet.frameW * drawScale);
  const drawH = Math.round(sheet.frameH * drawScale);
  const centerX = enemyCenterX(enemy);
  const feetY = enemyFeetY(enemy);
  drawSheetFrame(sheet, frame, centerX - drawW / HALF_DIVISOR, feetY - drawH, drawW, drawH, facing);
}
