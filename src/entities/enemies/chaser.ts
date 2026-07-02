import { state } from "../../game/state";
import { playSfx } from "../../game/audio";
import { ENEMY_SHEETS, WIDTH } from "../../constants";
import type { EnemyState } from "../../types/game-state";
import type { EnemyArchetype, EnemySpawnContext } from "./common";
import { drawEnemyFrame, enemyCenterX, enemyDrawScale, enemyFeetY, hasAwakenedGrowth } from "./common";

const CHASER_CONFIG = {
  chargeBaseSpeed: 2.18,
  chargeRandomSpeed: 0.26,
  chargeSpeedScaleByElapsed: 0.012,
  chargeMaxSpeed: 3.45,
  awakenedChargeSpeedScale: 1.06,
  awakenedCloseRangeSpeedScale: 1.5,
  awakenedCloseRangeDistance: 190,
  reenterMinFrames: 24,
  awakenedReenterMinFrames: 16,
  reenterFrameJitter: 18,
  offscreenBuffer: 56,
  animSpeed: 5,
} as const;

const CHASER_WARNING_PITCH = 0.74;
const CHASER_CHARGE_PITCH = 0.94;

function randomFrameCount(min: number, jitter: number) {
  return min + Math.floor(Math.random() * jitter);
}

function chaserChargeSpeed() {
  return Math.min(
    CHASER_CONFIG.chargeMaxSpeed,
    CHASER_CONFIG.chargeBaseSpeed
      + state.elapsed * CHASER_CONFIG.chargeSpeedScaleByElapsed
      + Math.random() * CHASER_CONFIG.chargeRandomSpeed,
  );
}

function chaserChargeSpeedScale(enemy: EnemyState) {
  return hasAwakenedGrowth(enemy) ? CHASER_CONFIG.awakenedChargeSpeedScale : 1;
}

function chaserReenterMinFrames(enemy: EnemyState) {
  return hasAwakenedGrowth(enemy)
    ? CHASER_CONFIG.awakenedReenterMinFrames
    : CHASER_CONFIG.reenterMinFrames;
}

function chaserChargeSpeedForRange(enemy: EnemyState) {
  const baseSpeed = enemy.chaserBaseSpeed ?? chaserChargeSpeed() * chaserChargeSpeedScale(enemy);
  if (!hasAwakenedGrowth(enemy)) return baseSpeed;

  const facing = enemy.chaserFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const playerCenterX = state.player.x + state.player.w / 2;
  const playerDelta = playerCenterX - enemyCenterX(enemy);
  const playerAhead = Math.sign(playerDelta) === facing;
  if (!playerAhead || Math.abs(playerDelta) > CHASER_CONFIG.awakenedCloseRangeDistance) return baseSpeed;

  return baseSpeed * CHASER_CONFIG.awakenedCloseRangeSpeedScale;
}

function chaserHiddenX(enemy: EnemyState, facing: number) {
  return facing === 1
    ? -enemy.w - CHASER_CONFIG.offscreenBuffer
    : WIDTH + enemy.w + CHASER_CONFIG.offscreenBuffer;
}

function enterChaserReenter(enemy: EnemyState, nextFacing: number) {
  const duration = randomFrameCount(chaserReenterMinFrames(enemy), CHASER_CONFIG.reenterFrameJitter);
  enemy.chaserPhase = "reenter";
  enemy.chaserTimer = duration;
  enemy.chaserReenterDuration = duration;
  enemy.chaserFacing = nextFacing;
  enemy.vx = 0;
  enemy.x = chaserHiddenX(enemy, nextFacing);
  playSfx("enemyWarning", CHASER_WARNING_PITCH);
}

function initChaser(enemy: EnemyState, context: EnemySpawnContext) {
  enemy.chaserPhase = "charge";
  enemy.chaserTimer = 0;
  enemy.chaserReenterDuration = 0;
  enemy.chaserFacing = -context.side;
  enemy.chaserBaseSpeed = context.speed * chaserChargeSpeedScale(enemy);
  enemy.vx = enemy.chaserFacing * enemy.chaserBaseSpeed;
}

function updateChaser(enemy: EnemyState) {
  enemy.chaserPhase ??= "charge";
  enemy.chaserTimer ??= 0;
  enemy.chaserFacing ??= enemy.vx >= 0 ? 1 : -1;
  enemy.chaserBaseSpeed ??= chaserChargeSpeed() * chaserChargeSpeedScale(enemy);

  if (enemy.chaserPhase === "reenter") {
    enemy.chaserTimer -= 1;
    enemy.vx = 0;
    enemy.x = chaserHiddenX(enemy, enemy.chaserFacing);
    if (enemy.chaserTimer <= 0) {
      enemy.chaserPhase = "charge";
      enemy.vx = enemy.chaserFacing * chaserChargeSpeedForRange(enemy);
      playSfx("enemyDash", CHASER_CHARGE_PITCH);
    }
    return;
  }

  enemy.vx = enemy.chaserFacing * chaserChargeSpeedForRange(enemy);
  enemy.x += enemy.vx;

  if (enemy.chaserFacing === 1 && enemy.x > WIDTH + CHASER_CONFIG.offscreenBuffer) {
    enterChaserReenter(enemy, -1);
  } else if (enemy.chaserFacing === -1 && enemy.x + enemy.w < -CHASER_CONFIG.offscreenBuffer) {
    enterChaserReenter(enemy, 1);
  }
}

export const CHASER_ARCHETYPE: EnemyArchetype = {
  speed: chaserChargeSpeed,
  init: initChaser,
  update: updateChaser,
  draw(enemy) {
    const phase = enemy.chaserPhase ?? "charge";
    const facing = enemy.chaserFacing ?? (enemy.vx >= 0 ? 1 : -1);
    if (phase === "reenter") {
      return;
    }

    drawEnemyFrame(enemy, ENEMY_SHEETS[0], enemyDrawScale(CHASER_ARCHETYPE), CHASER_CONFIG.animSpeed, state.elapsed, facing);
  },
  contactDamageDisabled: (enemy) => enemy.chaserPhase === "reenter",
};
