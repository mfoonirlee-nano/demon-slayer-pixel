import { state } from "../../state";
import { playSfx } from "../../audio";
import { ENEMY_SHEETS, WIDTH } from "../../constants";
import { ctx } from "../../context";
import type { EnemyState } from "../../types/game-state";
import type { EnemyArchetype, EnemySpawnContext } from "./common";
import { drawEnemyFrame, enemyDrawScale, enemyFeetY } from "./common";

const CHASER_CONFIG = {
  chargeBaseSpeed: 2.18,
  chargeRandomSpeed: 0.26,
  chargeSpeedScaleByElapsed: 0.012,
  chargeMaxSpeed: 3.45,
  reenterMinFrames: 24,
  reenterFrameJitter: 18,
  offscreenBuffer: 56,
  animSpeed: 5,
} as const;

const TRAIL_MAIN_WIDTH = 30;
const TRAIL_MAIN_HEIGHT = 4;
const TRAIL_DETAIL_WIDTH = 16;
const TRAIL_DETAIL_HEIGHT = 3;
const TRAIL_Y_OFFSET = 8;
const TRAIL_DETAIL_Y_OFFSET = 18;
const CUE_WIDTH = 36;
const CUE_HEIGHT = 5;
const CUE_Y_OFFSET = 12;
const CUE_MARK_HEIGHT = 26;
const CUE_MARK_WIDTH = 3;
const CUE_ALPHA_BASE = 0.22;
const CUE_ALPHA_RANGE = 0.34;
const CUE_ALPHA_HIGHLIGHT_BOOST = 0.12;
const CUE_EDGE_INSET = 8;
const CUE_SECOND_MARK_LEFT_INSET = 15;
const CUE_SECOND_MARK_RIGHT_OFFSET = -18;
const CUE_SECOND_MARK_Y_OFFSET = 8;
const CUE_SECOND_MARK_HEIGHT_REDUCTION = 8;
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

function chaserHiddenX(enemy: EnemyState, facing: number) {
  return facing === 1
    ? -enemy.w - CHASER_CONFIG.offscreenBuffer
    : WIDTH + enemy.w + CHASER_CONFIG.offscreenBuffer;
}

function enterChaserReenter(enemy: EnemyState, nextFacing: number) {
  const duration = randomFrameCount(CHASER_CONFIG.reenterMinFrames, CHASER_CONFIG.reenterFrameJitter);
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
  enemy.chaserBaseSpeed = context.speed;
  enemy.vx = enemy.chaserFacing * context.speed;
}

function updateChaser(enemy: EnemyState) {
  enemy.chaserPhase ??= "charge";
  enemy.chaserTimer ??= 0;
  enemy.chaserFacing ??= enemy.vx >= 0 ? 1 : -1;
  enemy.chaserBaseSpeed ??= chaserChargeSpeed();

  if (enemy.chaserPhase === "reenter") {
    enemy.chaserTimer -= 1;
    enemy.vx = 0;
    enemy.x = chaserHiddenX(enemy, enemy.chaserFacing);
    if (enemy.chaserTimer <= 0) {
      enemy.chaserPhase = "charge";
      enemy.vx = enemy.chaserFacing * enemy.chaserBaseSpeed;
      playSfx("enemyDash", CHASER_CHARGE_PITCH);
    }
    return;
  }

  enemy.vx = enemy.chaserFacing * enemy.chaserBaseSpeed;
  enemy.x += enemy.vx;

  if (enemy.chaserFacing === 1 && enemy.x > WIDTH + CHASER_CONFIG.offscreenBuffer) {
    enterChaserReenter(enemy, -1);
  } else if (enemy.chaserFacing === -1 && enemy.x + enemy.w < -CHASER_CONFIG.offscreenBuffer) {
    enterChaserReenter(enemy, 1);
  }
}

function drawChaserTrail(enemy: EnemyState, facing: number) {
  if (!ctx) return;
  const feetY = enemyFeetY(enemy);
  const trailX = facing === 1 ? enemy.x - TRAIL_MAIN_WIDTH : enemy.x + enemy.w;
  ctx.fillStyle = "rgba(168, 82, 48, 0.42)";
  ctx.fillRect(trailX, feetY - TRAIL_Y_OFFSET, TRAIL_MAIN_WIDTH, TRAIL_MAIN_HEIGHT);
  ctx.fillStyle = "rgba(218, 130, 74, 0.34)";
  ctx.fillRect(
    trailX + (facing === 1 ? -TRAIL_DETAIL_WIDTH : TRAIL_MAIN_WIDTH),
    feetY - TRAIL_DETAIL_Y_OFFSET,
    TRAIL_DETAIL_WIDTH,
    TRAIL_DETAIL_HEIGHT,
  );
}

function drawChaserReentryCue(enemy: EnemyState, facing: number) {
  if (!ctx) return;
  const duration = Math.max(1, enemy.chaserReenterDuration ?? CHASER_CONFIG.reenterMinFrames);
  const timer = Math.max(0, enemy.chaserTimer ?? 0);
  const alpha = CUE_ALPHA_BASE + (1 - timer / duration) * CUE_ALPHA_RANGE;
  const edgeX = facing === 1 ? 0 : WIDTH;
  const markX = facing === 1 ? CUE_EDGE_INSET : WIDTH - CUE_EDGE_INSET - CUE_MARK_WIDTH;
  const dustX = facing === 1 ? 0 : WIDTH - CUE_WIDTH;
  const feetY = enemyFeetY(enemy);
  const secondMarkX = edgeX + (facing === 1 ? CUE_SECOND_MARK_LEFT_INSET : CUE_SECOND_MARK_RIGHT_OFFSET);
  const secondMarkY = feetY - CUE_MARK_HEIGHT - CUE_SECOND_MARK_Y_OFFSET;
  const secondMarkHeight = CUE_MARK_HEIGHT - CUE_SECOND_MARK_HEIGHT_REDUCTION;

  ctx.fillStyle = `rgba(255, 95, 63, ${alpha})`;
  ctx.fillRect(dustX, feetY - CUE_Y_OFFSET, CUE_WIDTH, CUE_HEIGHT);
  ctx.fillStyle = `rgba(255, 174, 91, ${alpha + CUE_ALPHA_HIGHLIGHT_BOOST})`;
  ctx.fillRect(markX, feetY - CUE_MARK_HEIGHT, CUE_MARK_WIDTH, CUE_MARK_HEIGHT);
  ctx.fillRect(secondMarkX, secondMarkY, CUE_MARK_WIDTH, secondMarkHeight);
}

export const CHASER_ARCHETYPE: EnemyArchetype = {
  speed: chaserChargeSpeed,
  init: initChaser,
  update: updateChaser,
  draw(enemy) {
    const phase = enemy.chaserPhase ?? "charge";
    const facing = enemy.chaserFacing ?? (enemy.vx >= 0 ? 1 : -1);
    if (phase === "reenter") {
      drawChaserReentryCue(enemy, facing);
      return;
    }

    drawChaserTrail(enemy, facing);
    drawEnemyFrame(enemy, ENEMY_SHEETS[0], enemyDrawScale(CHASER_ARCHETYPE), CHASER_CONFIG.animSpeed, state.elapsed, facing);
  },
  contactDamageDisabled: (enemy) => enemy.chaserPhase === "reenter",
};
