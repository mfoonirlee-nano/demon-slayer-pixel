import { state } from "../../game/state";
import { playSfx } from "../../game/audio";
import {
  BURROWER_SHEET_INDEX,
  BURROWER_SHEETS,
  ENEMY_SHEETS,
  GROUND_Y,
  WIDTH,
} from "../../constants";
import { ctx } from "../../rendering/context";
import type { BurrowerPhase, EnemyState } from "../../types/game-state";
import { clamp, frameIndex, hitbox, lerp } from "../../game/utils";
import { hurtPlayer } from "../player";
import type { EnemyArchetype, EnemySpawnContext } from "./common";
import {
  drawEnemyFrame,
  drawEnemySheetFrame,
  enemyCenterX,
  enemyDrawScale,
  enemyFeetY,
  hasAwakenedGrowth,
} from "./common";

const BURROWER_CONFIG = {
  triggerDistance: 168,
  awakenedTriggerDistanceBonus: 22,
  moveBaseSpeed: 0.58,
  moveRandomSpeed: 0.45,
  moveSpeedScaleByElapsed: 0.004,
  sinkMinFrames: 13,
  awakenedSinkMinFrames: 10,
  sinkFrameJitter: 3,
  burrowMinFrames: 7,
  awakenedBurrowMinFrames: 5,
  burrowFrameJitter: 3,
  emergeFrames: 18,
  awakenedEmergeFrames: 16,
  emergeImpactElapsedFrames: 8,
  awakenedEmergeImpactElapsedFrames: 6,
  recoverMinFrames: 24,
  awakenedRecoverMinFrames: 18,
  recoverFrameJitter: 8,
  impactDamageMultiplier: 1.6,
  impactDamageBonus: 2,
  targetBodyOffsetScale: 0.5,
  targetClampMargin: 26,
  hpMultiplier: 1,
  maxActiveBurrowers: 1,
  drawScale: 1,
  collisionScaleX: 1.28,
  collisionScaleY: 0.96,
  moveAnimSpeed: 7,
  burrowAnimSpeed: 4,
} as const;

const HALF_DIVISOR = 2;
const EMERGE_BOX_WIDTH_SCALE = 1.45;
const EMERGE_BOX_WIDTH_PAD = 34;
const EMERGE_BOX_HEIGHT_SCALE = 1.28;
const EMERGE_BOX_FORWARD_OFFSET_SCALE = 0.22;
const BURROW_TRAIL_HEIGHT = 5;
const BURROW_TRAIL_Y_OFFSET = 8;
const BURROW_MARKER_RADIUS_X = 38;
const BURROW_MARKER_RADIUS_Y = 7;
const BURROW_MARKER_CRACK_W = 22;
const BURROW_MARKER_CRACK_H = 2;
const BURROW_MARKER_CRACK_GAP = 8;
const BURROW_SINK_ALPHA_BASE = 0.24;
const BURROW_SINK_ALPHA_SCALE = 0.24;
const BURROW_TRAIL_ALPHA = 0.4;
const BURROW_EMERGE_ALPHA = 0.52;

function randomFrameCount(min: number, jitter: number) {
  return min + Math.floor(Math.random() * jitter);
}

function isBurrower(enemy: Pick<EnemyState, "sheetIndex">) {
  return enemy.sheetIndex === BURROWER_SHEET_INDEX;
}

function playerCenterX() {
  return state.player.x + state.player.w / HALF_DIVISOR;
}

function burrowerFacing(enemy: EnemyState, toward: number) {
  if (toward === 0) return enemy.burrowerFacing ?? 1;
  return Math.sign(toward);
}

function burrowerMoveSpeed() {
  return BURROWER_CONFIG.moveBaseSpeed
    + state.elapsed * BURROWER_CONFIG.moveSpeedScaleByElapsed
    + Math.random() * BURROWER_CONFIG.moveRandomSpeed;
}

function burrowerTriggerDistance(enemy: EnemyState) {
  return BURROWER_CONFIG.triggerDistance
    + (hasAwakenedGrowth(enemy) ? BURROWER_CONFIG.awakenedTriggerDistanceBonus : 0);
}

function burrowerSinkMinFrames(enemy: EnemyState) {
  return hasAwakenedGrowth(enemy) ? BURROWER_CONFIG.awakenedSinkMinFrames : BURROWER_CONFIG.sinkMinFrames;
}

function burrowerBurrowMinFrames(enemy: EnemyState) {
  return hasAwakenedGrowth(enemy) ? BURROWER_CONFIG.awakenedBurrowMinFrames : BURROWER_CONFIG.burrowMinFrames;
}

function burrowerEmergeFrames(enemy: EnemyState) {
  return hasAwakenedGrowth(enemy) ? BURROWER_CONFIG.awakenedEmergeFrames : BURROWER_CONFIG.emergeFrames;
}

function burrowerEmergeImpactElapsedFrames(enemy: EnemyState) {
  return hasAwakenedGrowth(enemy)
    ? BURROWER_CONFIG.awakenedEmergeImpactElapsedFrames
    : BURROWER_CONFIG.emergeImpactElapsedFrames;
}

function burrowerRecoverMinFrames(enemy: EnemyState) {
  return hasAwakenedGrowth(enemy) ? BURROWER_CONFIG.awakenedRecoverMinFrames : BURROWER_CONFIG.recoverMinFrames;
}

function burrowerGroundTop(enemy: EnemyState) {
  return GROUND_Y - enemy.h;
}

function burrowerTargetLeft(enemy: EnemyState) {
  const facing = enemy.burrowerFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const targetCenter = playerCenterX() - facing * enemy.w * BURROWER_CONFIG.targetBodyOffsetScale;
  return clamp(
    targetCenter - enemy.w / HALF_DIVISOR,
    -BURROWER_CONFIG.targetClampMargin,
    WIDTH + BURROWER_CONFIG.targetClampMargin - enemy.w,
  );
}

function burrowerActiveCount() {
  let count = 0;
  for (const enemy of state.enemies) {
    if (isBurrower(enemy)) count += 1;
  }
  return count;
}

function burrowerSheetForPhase(phase: BurrowerPhase) {
  return BURROWER_SHEETS[phase] || BURROWER_SHEETS.move;
}

function enterBurrowerPhase(enemy: EnemyState, phase: BurrowerPhase) {
  enemy.burrowerPhase = phase;
  enemy.burrowerEmergeHit = false;

  if (phase === "sink") {
    enemy.burrowerTimer = randomFrameCount(
      burrowerSinkMinFrames(enemy),
      BURROWER_CONFIG.sinkFrameJitter,
    );
    enemy.burrowerPhaseDuration = enemy.burrowerTimer;
    enemy.burrowerTargetX = burrowerTargetLeft(enemy);
    playSfx("enemyBurrow");
    return;
  }

  if (phase === "burrow") {
    enemy.burrowerTimer = randomFrameCount(
      burrowerBurrowMinFrames(enemy),
      BURROWER_CONFIG.burrowFrameJitter,
    );
    enemy.burrowerPhaseDuration = enemy.burrowerTimer;
    enemy.burrowerBurrowStartX = enemy.x;
    enemy.burrowerTargetX ??= burrowerTargetLeft(enemy);
    return;
  }

  if (phase === "emerge") {
    enemy.burrowerTimer = burrowerEmergeFrames(enemy);
    enemy.burrowerPhaseDuration = burrowerEmergeFrames(enemy);
    enemy.x = enemy.burrowerTargetX ?? enemy.x;
    enemy.y = burrowerGroundTop(enemy);
    playSfx("enemyEmerge");
    return;
  }

  if (phase === "recover") {
    enemy.burrowerTimer = randomFrameCount(
      burrowerRecoverMinFrames(enemy),
      BURROWER_CONFIG.recoverFrameJitter,
    );
    enemy.burrowerPhaseDuration = enemy.burrowerTimer;
    return;
  }

  enemy.burrowerTimer = 0;
  enemy.burrowerPhaseDuration = 0;
  enemy.burrowerTargetX = undefined;
  enemy.burrowerBurrowStartX = undefined;
}

function burrowerPhaseFrame(enemy: EnemyState, phase: BurrowerPhase) {
  if (phase === "move") {
    return frameIndex(BURROWER_SHEETS.move.count, BURROWER_CONFIG.moveAnimSpeed, state.elapsed, enemy.animSeed);
  }

  if (phase === "burrow") {
    return frameIndex(
      BURROWER_SHEETS.burrow.count,
      BURROWER_CONFIG.burrowAnimSpeed,
      state.elapsed,
      enemy.animSeed,
    );
  }

  const sheet = burrowerSheetForPhase(phase);
  const duration = Math.max(1, enemy.burrowerPhaseDuration ?? 1);
  const elapsed = Math.max(0, duration - (enemy.burrowerTimer ?? 0));
  return Math.min(sheet.count - 1, Math.floor(elapsed * sheet.count / duration));
}

function burrowerEmergeBox(enemy: EnemyState) {
  const facing = enemy.burrowerFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const w = Math.round(enemy.w * EMERGE_BOX_WIDTH_SCALE + EMERGE_BOX_WIDTH_PAD);
  const h = Math.round(enemy.h * EMERGE_BOX_HEIGHT_SCALE);
  const centerX = enemyCenterX(enemy) + facing * enemy.w * EMERGE_BOX_FORWARD_OFFSET_SCALE;
  return {
    x: centerX - w / HALF_DIVISOR,
    y: enemyFeetY(enemy) - h,
    w,
    h,
  };
}

function triggerBurrowerEmergeHit(enemy: EnemyState) {
  enemy.burrowerEmergeHit = true;
  if (!hitbox(burrowerEmergeBox(enemy), state.player)) return;
  const facing = enemy.burrowerFacing ?? (enemy.vx >= 0 ? 1 : -1);
  hurtPlayer(
    enemy.damage * BURROWER_CONFIG.impactDamageMultiplier + BURROWER_CONFIG.impactDamageBonus,
    -facing,
  );
}

function drawBurrowMarker(centerX: number, y: number, alpha: number) {
  if (!ctx) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(124, 74, 38, 1)";
  ctx.fillStyle = "rgba(86, 47, 28, 1)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(centerX, y, BURROW_MARKER_RADIUS_X, BURROW_MARKER_RADIUS_Y, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillRect(
    centerX - BURROW_MARKER_CRACK_GAP - BURROW_MARKER_CRACK_W,
    y - 1,
    BURROW_MARKER_CRACK_W,
    BURROW_MARKER_CRACK_H,
  );
  ctx.fillRect(centerX + BURROW_MARKER_CRACK_GAP, y - 2, BURROW_MARKER_CRACK_W, BURROW_MARKER_CRACK_H);
  ctx.restore();
}

function drawBurrowerGroundCue(enemy: EnemyState, phase: BurrowerPhase) {
  if (!ctx || enemy.burrowerTargetX === undefined) return;
  if (phase !== "sink" && phase !== "burrow" && phase !== "emerge") return;

  const targetCenterX = enemy.burrowerTargetX + enemy.w / HALF_DIVISOR;
  const groundY = GROUND_Y - BURROW_TRAIL_Y_OFFSET;
  const duration = Math.max(1, enemy.burrowerPhaseDuration ?? 1);
  const progress = 1 - Math.max(0, enemy.burrowerTimer ?? 0) / duration;

  if (phase === "burrow") {
    const currentCenterX = enemyCenterX(enemy);
    const left = Math.min(currentCenterX, targetCenterX);
    const width = Math.abs(currentCenterX - targetCenterX);
    ctx.fillStyle = `rgba(126, 78, 42, ${BURROW_TRAIL_ALPHA})`;
    ctx.fillRect(left, groundY, width, BURROW_TRAIL_HEIGHT);
    drawBurrowMarker(targetCenterX, groundY, BURROW_TRAIL_ALPHA);
    return;
  }

  const alpha = phase === "sink"
    ? BURROW_SINK_ALPHA_BASE + progress * BURROW_SINK_ALPHA_SCALE
    : BURROW_EMERGE_ALPHA;
  drawBurrowMarker(targetCenterX, groundY, alpha);
}

function initBurrower(enemy: EnemyState, context: EnemySpawnContext) {
  enemy.burrowerPhase = "move";
  enemy.burrowerTimer = 0;
  enemy.burrowerPhaseDuration = 0;
  enemy.burrowerFacing = -context.side;
  enemy.burrowerBaseSpeed = Math.max(
    BURROWER_CONFIG.moveBaseSpeed,
    context.speed - state.elapsed * BURROWER_CONFIG.moveSpeedScaleByElapsed,
  );
  enemy.burrowerEmergeHit = false;
}

function updateBurrower(enemy: EnemyState) {
  enemy.burrowerPhase ??= "move";
  enemy.burrowerTimer ??= 0;
  enemy.burrowerPhaseDuration ??= 0;
  enemy.burrowerFacing ??= enemy.vx >= 0 ? 1 : -1;
  enemy.burrowerBaseSpeed ??= BURROWER_CONFIG.moveBaseSpeed;
  enemy.burrowerEmergeHit ??= false;

  const phase = enemy.burrowerPhase;
  const toward = playerCenterX() - enemyCenterX(enemy);
  const facing = burrowerFacing(enemy, toward);

  if (phase === "move") {
    enemy.burrowerFacing = facing;
    enemy.y = burrowerGroundTop(enemy);
    enemy.vx = facing * (
      (enemy.burrowerBaseSpeed ?? BURROWER_CONFIG.moveBaseSpeed)
      + state.elapsed * BURROWER_CONFIG.moveSpeedScaleByElapsed
    );

    if (Math.abs(toward) <= burrowerTriggerDistance(enemy)) {
      enemy.vx = 0;
      enterBurrowerPhase(enemy, "sink");
    } else {
      enemy.x += enemy.vx;
    }
    return;
  }

  if (phase === "sink") {
    enemy.vx = 0;
    enemy.y = burrowerGroundTop(enemy);
    enemy.burrowerTimer -= 1;
    if (enemy.burrowerTimer <= 0) {
      enterBurrowerPhase(enemy, "burrow");
    }
    return;
  }

  if (phase === "burrow") {
    const duration = Math.max(1, enemy.burrowerPhaseDuration ?? 1);
    const elapsed = duration - enemy.burrowerTimer;
    const startX = enemy.burrowerBurrowStartX ?? enemy.x;
    const targetX = enemy.burrowerTargetX ?? enemy.x;
    const previousX = enemy.x;
    enemy.x = lerp(startX, targetX, clamp(elapsed / duration, 0, 1));
    enemy.vx = enemy.x - previousX;
    enemy.y = burrowerGroundTop(enemy);
    enemy.burrowerTimer -= 1;
    if (enemy.burrowerTimer <= 0) {
      enterBurrowerPhase(enemy, "emerge");
    }
    return;
  }

  if (phase === "emerge") {
    const duration = Math.max(1, enemy.burrowerPhaseDuration ?? burrowerEmergeFrames(enemy));
    const elapsed = duration - enemy.burrowerTimer;
    enemy.vx = 0;
    enemy.x = enemy.burrowerTargetX ?? enemy.x;
    enemy.y = burrowerGroundTop(enemy);
    if (!enemy.burrowerEmergeHit && elapsed >= burrowerEmergeImpactElapsedFrames(enemy)) {
      triggerBurrowerEmergeHit(enemy);
    }
    enemy.burrowerTimer -= 1;
    if (enemy.burrowerTimer <= 0) {
      enterBurrowerPhase(enemy, "recover");
    }
    return;
  }

  enemy.vx = 0;
  enemy.y = burrowerGroundTop(enemy);
  enemy.burrowerTimer -= 1;
  if (enemy.burrowerTimer <= 0) {
    enterBurrowerPhase(enemy, "move");
  }
}

function drawBurrower(enemy: EnemyState) {
  const phase = enemy.burrowerPhase ?? "move";
  const sheet = burrowerSheetForPhase(phase);
  const facing = enemy.burrowerFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const drawScale = enemyDrawScale(BURROWER_ARCHETYPE);
  drawBurrowerGroundCue(enemy, phase);

  if (phase === "move") {
    drawEnemyFrame(enemy, sheet, drawScale, BURROWER_CONFIG.moveAnimSpeed, state.elapsed, facing);
    return;
  }

  const frame = burrowerPhaseFrame(enemy, phase);
  const drawW = Math.round(sheet.frameW * drawScale);
  const drawH = Math.round(sheet.frameH * drawScale);
  const centerX = enemyCenterX(enemy);
  const feetY = enemyFeetY(enemy);
  drawEnemySheetFrame(enemy, sheet, frame, centerX - drawW / HALF_DIVISOR, feetY - drawH, drawW, drawH, facing);
}

export const BURROWER_ARCHETYPE: EnemyArchetype = {
  speed: burrowerMoveSpeed,
  hpMultiplier: BURROWER_CONFIG.hpMultiplier,
  drawScale: BURROWER_CONFIG.drawScale,
  collisionScaleX: BURROWER_CONFIG.collisionScaleX,
  collisionScaleY: BURROWER_CONFIG.collisionScaleY,
  init: initBurrower,
  update: updateBurrower,
  draw: drawBurrower,
  contactDamageDisabled: (enemy) => (enemy.burrowerPhase ?? "move") !== "move",
};

export function isBurrowerSheet(sheetIndex: number) {
  return sheetIndex === BURROWER_SHEET_INDEX && Boolean(ENEMY_SHEETS[BURROWER_SHEET_INDEX]);
}

export function canSpawnBurrower() {
  return burrowerActiveCount() < BURROWER_CONFIG.maxActiveBurrowers;
}
