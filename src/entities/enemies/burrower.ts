import { state } from "../../game/state";
import { playSfx } from "../../game/audio";
import {
  BURROWER_SHEET_INDEX,
  BURROWER_SHEETS,
  ENEMY_SHEETS,
  GROUND_Y,
  WIDTH,
} from "../../constants";
import { drawSheetFrame } from "../../rendering/graphics";
import type { BurrowerPhase, EnemyState } from "../../types/game-state";
import { clamp, frameIndex, hitbox, lerp } from "../../game/utils";
import { hurtPlayer } from "../player";
import type { EnemyArchetype, EnemySpawnContext } from "./common";
import { drawEnemyFrame, enemyCenterX, enemyDrawScale, enemyFeetY } from "./common";

const BURROWER_CONFIG = {
  triggerDistance: 168,
  moveBaseSpeed: 0.58,
  moveRandomSpeed: 0.45,
  moveSpeedScaleByElapsed: 0.004,
  sinkMinFrames: 13,
  sinkFrameJitter: 3,
  burrowMinFrames: 7,
  burrowFrameJitter: 3,
  emergeFrames: 18,
  emergeImpactElapsedFrames: 8,
  recoverMinFrames: 24,
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
      BURROWER_CONFIG.sinkMinFrames,
      BURROWER_CONFIG.sinkFrameJitter,
    );
    enemy.burrowerPhaseDuration = enemy.burrowerTimer;
    enemy.burrowerTargetX = burrowerTargetLeft(enemy);
    playSfx("enemyBurrow");
    return;
  }

  if (phase === "burrow") {
    enemy.burrowerTimer = randomFrameCount(
      BURROWER_CONFIG.burrowMinFrames,
      BURROWER_CONFIG.burrowFrameJitter,
    );
    enemy.burrowerPhaseDuration = enemy.burrowerTimer;
    enemy.burrowerBurrowStartX = enemy.x;
    enemy.burrowerTargetX ??= burrowerTargetLeft(enemy);
    return;
  }

  if (phase === "emerge") {
    enemy.burrowerTimer = BURROWER_CONFIG.emergeFrames;
    enemy.burrowerPhaseDuration = BURROWER_CONFIG.emergeFrames;
    enemy.x = enemy.burrowerTargetX ?? enemy.x;
    enemy.y = burrowerGroundTop(enemy);
    playSfx("enemyEmerge");
    return;
  }

  if (phase === "recover") {
    enemy.burrowerTimer = randomFrameCount(
      BURROWER_CONFIG.recoverMinFrames,
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

    if (Math.abs(toward) <= BURROWER_CONFIG.triggerDistance) {
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
    const duration = Math.max(1, enemy.burrowerPhaseDuration ?? BURROWER_CONFIG.emergeFrames);
    const elapsed = duration - enemy.burrowerTimer;
    enemy.vx = 0;
    enemy.x = enemy.burrowerTargetX ?? enemy.x;
    enemy.y = burrowerGroundTop(enemy);
    if (!enemy.burrowerEmergeHit && elapsed >= BURROWER_CONFIG.emergeImpactElapsedFrames) {
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

  if (phase === "move") {
    drawEnemyFrame(enemy, sheet, drawScale, BURROWER_CONFIG.moveAnimSpeed, state.elapsed, facing);
    return;
  }

  const frame = burrowerPhaseFrame(enemy, phase);
  const drawW = Math.round(sheet.frameW * drawScale);
  const drawH = Math.round(sheet.frameH * drawScale);
  const centerX = enemyCenterX(enemy);
  const feetY = enemyFeetY(enemy);
  drawSheetFrame(sheet, frame, centerX - drawW / HALF_DIVISOR, feetY - drawH, drawW, drawH, facing);
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
