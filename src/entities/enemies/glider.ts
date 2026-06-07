import { state } from "../../state";
import { ENEMY_SHEETS, GLIDER_SHEET_INDEX, GLIDER_SHEETS, GROUND_Y } from "../../constants";
import { drawSheetFrame } from "../../graphics";
import type { EnemyState, GliderPhase } from "../../types/game-state";
import { clamp, frameIndex } from "../../utils";
import type { EnemyArchetype, EnemySpawnContext } from "./common";
import { drawEnemyFrame, enemyCenterX, enemyDrawScale, enemyFeetY } from "./common";

export const GLIDER_UNLOCK_SECONDS = 70;

const GLIDER_CONFIG = {
  preferredDistance: 170,
  rangeSlack: 30,
  triggerDistance: 235,
  hoverBaseSpeed: 0.76,
  hoverRandomSpeed: 0.32,
  hoverSpeedScaleByElapsed: 0.005,
  hoverMaxSpeed: 1.75,
  retreatScale: 0.58,
  driftScale: 0.18,
  hoverYOffsetFromPlayer: 42,
  hoverBobAmplitude: 11,
  hoverBobHz: 0.65,
  hoverYSteer: 0.06,
  windupYSteer: 0.035,
  recoverYSteer: 0.075,
  minTopY: 62,
  minGroundClearance: 70,
  diveGroundClearance: 12,
  hoverMinFrames: 54,
  hoverFrameJitter: 36,
  windupFrames: 34,
  diveFrames: 20,
  passFrames: 18,
  recoverFrames: 34,
  blockedRetryFrames: 16,
  diveBaseSpeed: 4.15,
  diveSpeedScaleByElapsed: 0.006,
  diveMaxSpeed: 5.45,
  diveTargetPlayerYRatio: 0.24,
  diveMaxAbsVy: 3.2,
  passSpeedScale: 0.82,
  passLiftPerFrame: 0.25,
  recoverSpeedScale: 0.32,
  maxActiveGliders: 2,
  maxActivePressure: 1,
  hpMultiplier: 0.92,
  drawScale: 1,
  collisionScaleX: 1.25,
  collisionScaleY: 0.62,
  hoverAnimSpeed: 7,
} as const;

const HALF_DIVISOR = 2;

function randomFrameCount(min: number, jitter: number) {
  return min + Math.floor(Math.random() * jitter);
}

function isGlider(enemy: Pick<EnemyState, "sheetIndex">) {
  return enemy.sheetIndex === GLIDER_SHEET_INDEX;
}

function playerCenterX() {
  return state.player.x + state.player.w / HALF_DIVISOR;
}

function gliderFacing(enemy: EnemyState, toward: number) {
  if (toward === 0) return enemy.gliderFacing ?? 1;
  return Math.sign(toward);
}

function gliderHoverSpeed() {
  return Math.min(
    GLIDER_CONFIG.hoverMaxSpeed,
    GLIDER_CONFIG.hoverBaseSpeed
      + state.elapsed * GLIDER_CONFIG.hoverSpeedScaleByElapsed
      + Math.random() * GLIDER_CONFIG.hoverRandomSpeed,
  );
}

function gliderDiveSpeed() {
  return Math.min(
    GLIDER_CONFIG.diveMaxSpeed,
    GLIDER_CONFIG.diveBaseSpeed + state.elapsed * GLIDER_CONFIG.diveSpeedScaleByElapsed,
  );
}

function gliderMaxHoverTopY(enemy: EnemyState) {
  return GROUND_Y - enemy.h - GLIDER_CONFIG.minGroundClearance;
}

function gliderMaxDiveTopY(enemy: EnemyState) {
  return GROUND_Y - enemy.h - GLIDER_CONFIG.diveGroundClearance;
}

function gliderHoverTopY(enemy: EnemyState) {
  const bob = Math.sin(state.elapsed * Math.PI * 2 * GLIDER_CONFIG.hoverBobHz + enemy.animSeed) * GLIDER_CONFIG.hoverBobAmplitude;
  return clamp(
    state.player.y - GLIDER_CONFIG.hoverYOffsetFromPlayer + bob,
    GLIDER_CONFIG.minTopY,
    gliderMaxHoverTopY(enemy),
  );
}

function moveTowardHoverY(enemy: EnemyState, steer: number) {
  enemy.y += (gliderHoverTopY(enemy) - enemy.y) * steer;
}

function gliderPressureCount() {
  let count = 0;
  for (const enemy of state.enemies) {
    if (
      isGlider(enemy)
      && (
        enemy.gliderPhase === "windup"
        || enemy.gliderPhase === "dive"
        || enemy.gliderPhase === "pass"
      )
    ) {
      count += 1;
    }
  }
  return count;
}

export function gliderActiveCount() {
  let count = 0;
  for (const enemy of state.enemies) {
    if (isGlider(enemy)) count += 1;
  }
  return count;
}

function gliderSheetForPhase(phase: GliderPhase) {
  return GLIDER_SHEETS[phase] || GLIDER_SHEETS.hover;
}

function gliderPhaseDuration(phase: GliderPhase) {
  if (phase === "windup") return GLIDER_CONFIG.windupFrames;
  if (phase === "dive") return GLIDER_CONFIG.diveFrames;
  if (phase === "pass") return GLIDER_CONFIG.passFrames;
  if (phase === "recover") return GLIDER_CONFIG.recoverFrames;
  return 1;
}

function gliderPhaseFrame(enemy: EnemyState, phase: GliderPhase) {
  if (phase === "hover") {
    return frameIndex(GLIDER_SHEETS.hover.count, GLIDER_CONFIG.hoverAnimSpeed, state.elapsed, enemy.animSeed);
  }
  if (phase === "pass") {
    return GLIDER_SHEETS.pass.count - 1;
  }

  const sheet = gliderSheetForPhase(phase);
  const duration = gliderPhaseDuration(phase);
  const elapsed = Math.max(0, duration - (enemy.gliderTimer ?? 0));
  return Math.min(sheet.count - 1, Math.floor(elapsed * sheet.count / duration));
}

function enterGliderPhase(enemy: EnemyState, phase: GliderPhase) {
  enemy.gliderPhase = phase;
  if (phase === "windup") {
    enemy.gliderTimer = GLIDER_CONFIG.windupFrames;
    enemy.gliderDiveVy = 0;
  } else if (phase === "dive") {
    enemy.gliderTimer = GLIDER_CONFIG.diveFrames;
    const targetY = clamp(
      state.player.y + state.player.h * GLIDER_CONFIG.diveTargetPlayerYRatio - enemy.h / HALF_DIVISOR,
      GLIDER_CONFIG.minTopY,
      gliderMaxDiveTopY(enemy),
    );
    enemy.gliderDiveVy = clamp(
      (targetY - enemy.y) / GLIDER_CONFIG.diveFrames,
      -GLIDER_CONFIG.diveMaxAbsVy,
      GLIDER_CONFIG.diveMaxAbsVy,
    );
  } else if (phase === "pass") {
    enemy.gliderTimer = GLIDER_CONFIG.passFrames;
  } else if (phase === "recover") {
    enemy.gliderTimer = GLIDER_CONFIG.recoverFrames;
    enemy.gliderDiveVy = 0;
  } else {
    enemy.gliderTimer = randomFrameCount(GLIDER_CONFIG.hoverMinFrames, GLIDER_CONFIG.hoverFrameJitter);
    enemy.gliderDiveVy = 0;
  }
}

function initGlider(enemy: EnemyState, context: EnemySpawnContext) {
  enemy.gliderPhase = "hover";
  enemy.gliderTimer = randomFrameCount(GLIDER_CONFIG.hoverMinFrames, GLIDER_CONFIG.hoverFrameJitter);
  enemy.gliderFacing = -context.side;
  enemy.gliderBaseSpeed = context.speed;
  enemy.gliderDiveVy = 0;
  enemy.y = gliderHoverTopY(enemy);
}

function updateGliderHover(enemy: EnemyState, facing: number, distance: number) {
  const speed = enemy.gliderBaseSpeed ?? GLIDER_CONFIG.hoverBaseSpeed;
  enemy.gliderTimer = Math.max(0, (enemy.gliderTimer ?? 0) - 1);
  enemy.gliderFacing = facing;
  moveTowardHoverY(enemy, GLIDER_CONFIG.hoverYSteer);

  if (distance > GLIDER_CONFIG.preferredDistance + GLIDER_CONFIG.rangeSlack) {
    enemy.vx = facing * speed;
  } else if (distance < GLIDER_CONFIG.preferredDistance - GLIDER_CONFIG.rangeSlack) {
    enemy.vx = -facing * speed * GLIDER_CONFIG.retreatScale;
  } else {
    enemy.vx = facing * speed * GLIDER_CONFIG.driftScale;
  }

  if (distance <= GLIDER_CONFIG.triggerDistance && enemy.gliderTimer <= 0) {
    if (gliderPressureCount() < GLIDER_CONFIG.maxActivePressure) {
      enterGliderPhase(enemy, "windup");
      enemy.vx = 0;
    } else {
      enemy.gliderTimer = GLIDER_CONFIG.blockedRetryFrames;
    }
  }
}

function updateGlider(enemy: EnemyState) {
  enemy.gliderPhase ??= "hover";
  enemy.gliderTimer ??= 0;
  enemy.gliderFacing ??= enemy.vx >= 0 ? 1 : -1;
  enemy.gliderBaseSpeed ??= gliderHoverSpeed();
  enemy.gliderDiveVy ??= 0;

  const toward = playerCenterX() - enemyCenterX(enemy);
  const facing = gliderFacing(enemy, toward);
  const distance = Math.abs(toward);
  const phase = enemy.gliderPhase;

  if (phase === "hover") {
    updateGliderHover(enemy, facing, distance);
  } else if (phase === "windup") {
    enemy.gliderFacing = facing;
    enemy.vx = 0;
    moveTowardHoverY(enemy, GLIDER_CONFIG.windupYSteer);
    enemy.gliderTimer -= 1;
    if (enemy.gliderTimer <= 0) {
      enemy.gliderFacing = facing;
      enterGliderPhase(enemy, "dive");
      enemy.vx = facing * gliderDiveSpeed();
    }
  } else if (phase === "dive") {
    enemy.gliderTimer -= 1;
    enemy.vx = (enemy.gliderFacing ?? facing) * gliderDiveSpeed();
    enemy.y = clamp(enemy.y + (enemy.gliderDiveVy ?? 0), GLIDER_CONFIG.minTopY, gliderMaxDiveTopY(enemy));
    if (enemy.gliderTimer <= 0) {
      enterGliderPhase(enemy, "pass");
    }
  } else if (phase === "pass") {
    enemy.gliderTimer -= 1;
    enemy.vx = (enemy.gliderFacing ?? facing) * gliderDiveSpeed() * GLIDER_CONFIG.passSpeedScale;
    enemy.y = clamp(enemy.y - GLIDER_CONFIG.passLiftPerFrame, GLIDER_CONFIG.minTopY, gliderMaxDiveTopY(enemy));
    if (enemy.gliderTimer <= 0) {
      enterGliderPhase(enemy, "recover");
    }
  } else {
    enemy.gliderTimer -= 1;
    enemy.vx = (enemy.gliderFacing ?? facing) * (enemy.gliderBaseSpeed ?? GLIDER_CONFIG.hoverBaseSpeed) * GLIDER_CONFIG.recoverSpeedScale;
    moveTowardHoverY(enemy, GLIDER_CONFIG.recoverYSteer);
    if (enemy.gliderTimer <= 0) {
      enterGliderPhase(enemy, "hover");
    }
  }

  enemy.x += enemy.vx;
}

function drawGlider(enemy: EnemyState) {
  const phase = enemy.gliderPhase ?? "hover";
  const sheet = gliderSheetForPhase(phase);
  const facing = enemy.gliderFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const drawScale = enemyDrawScale(GLIDER_ARCHETYPE);

  if (phase === "hover") {
    drawEnemyFrame(enemy, sheet, drawScale, GLIDER_CONFIG.hoverAnimSpeed, state.elapsed, facing);
    return;
  }

  const frame = gliderPhaseFrame(enemy, phase);
  const drawW = Math.round(sheet.frameW * drawScale);
  const drawH = Math.round(sheet.frameH * drawScale);
  const centerX = enemyCenterX(enemy);
  const feetY = enemyFeetY(enemy);
  drawSheetFrame(sheet, frame, centerX - drawW / HALF_DIVISOR, feetY - drawH, drawW, drawH, facing);
}

export const GLIDER_ARCHETYPE: EnemyArchetype = {
  speed: gliderHoverSpeed,
  hpMultiplier: GLIDER_CONFIG.hpMultiplier,
  drawScale: GLIDER_CONFIG.drawScale,
  collisionScaleX: GLIDER_CONFIG.collisionScaleX,
  collisionScaleY: GLIDER_CONFIG.collisionScaleY,
  init: initGlider,
  update: updateGlider,
  draw: drawGlider,
};

export function isGliderSheet(sheetIndex: number) {
  return sheetIndex === GLIDER_SHEET_INDEX && Boolean(ENEMY_SHEETS[GLIDER_SHEET_INDEX]);
}

export function canSpawnGlider() {
  return gliderActiveCount() < GLIDER_CONFIG.maxActiveGliders;
}
