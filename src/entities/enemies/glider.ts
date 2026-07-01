import { state } from "../../game/state";
import { playSfx } from "../../game/audio";
import { ENEMY_SHEETS, GLIDER_SHEET_INDEX, GLIDER_SHEETS, GROUND_Y } from "../../constants";
import { ctx } from "../../rendering/context";
import type { EnemyState, GliderPhase } from "../../types/game-state";
import { clamp, frameIndex } from "../../game/utils";
import type { EnemyArchetype, EnemySpawnContext } from "./common";
import {
  drawEnemyFrame,
  drawEnemySheetFrame,
  enemyCenterX,
  enemyDrawScale,
  enemyFeetY,
  hasAwakenedGrowth,
} from "./common";

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
  awakenedHoverMinFrames: 40,
  hoverFrameJitter: 36,
  windupFrames: 34,
  awakenedWindupFrames: 26,
  diveFrames: 20,
  awakenedDiveFrames: 18,
  passFrames: 18,
  recoverFrames: 34,
  awakenedRecoverFrames: 26,
  blockedRetryFrames: 16,
  diveBaseSpeed: 4.15,
  diveSpeedScaleByElapsed: 0.006,
  diveMaxSpeed: 5.45,
  awakenedDiveSpeedScale: 1.08,
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
  windupSfxPitch: 1.28,
} as const;

const HALF_DIVISOR = 2;
const DIVE_CUE_LENGTH = 168;
const DIVE_CUE_HEIGHT = 6;
const DIVE_CUE_Y_OFFSET = 18;
const DIVE_CUE_WINDUP_ALPHA = 0.34;
const DIVE_CUE_ACTIVE_ALPHA = 0.44;
const DIVE_CUE_HIGHLIGHT_ALPHA_CAP = 0.75;
const DIVE_CUE_HIGHLIGHT_ALPHA_BOOST = 0.18;
const DIVE_CUE_MARKER_WIDTH = 18;
const RECOVER_CUE_WIDTH = 44;
const RECOVER_CUE_HEIGHT = 5;
const RECOVER_CUE_Y_OFFSET = 20;

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

function gliderDiveSpeed(enemy: EnemyState) {
  const speed = Math.min(
    GLIDER_CONFIG.diveMaxSpeed,
    GLIDER_CONFIG.diveBaseSpeed + state.elapsed * GLIDER_CONFIG.diveSpeedScaleByElapsed,
  );
  return hasAwakenedGrowth(enemy) ? speed * GLIDER_CONFIG.awakenedDiveSpeedScale : speed;
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

function gliderHoverFrames(enemy: EnemyState) {
  return randomFrameCount(
    hasAwakenedGrowth(enemy) ? GLIDER_CONFIG.awakenedHoverMinFrames : GLIDER_CONFIG.hoverMinFrames,
    GLIDER_CONFIG.hoverFrameJitter,
  );
}

function gliderWindupFrames(enemy: EnemyState) {
  return hasAwakenedGrowth(enemy) ? GLIDER_CONFIG.awakenedWindupFrames : GLIDER_CONFIG.windupFrames;
}

function gliderDiveFrames(enemy: EnemyState) {
  return hasAwakenedGrowth(enemy) ? GLIDER_CONFIG.awakenedDiveFrames : GLIDER_CONFIG.diveFrames;
}

function gliderRecoverFrames(enemy: EnemyState) {
  return hasAwakenedGrowth(enemy) ? GLIDER_CONFIG.awakenedRecoverFrames : GLIDER_CONFIG.recoverFrames;
}

function gliderPhaseDuration(enemy: EnemyState, phase: GliderPhase) {
  if (phase === "windup") return gliderWindupFrames(enemy);
  if (phase === "dive") return gliderDiveFrames(enemy);
  if (phase === "pass") return GLIDER_CONFIG.passFrames;
  if (phase === "recover") return gliderRecoverFrames(enemy);
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
  const duration = gliderPhaseDuration(enemy, phase);
  const elapsed = Math.max(0, duration - (enemy.gliderTimer ?? 0));
  return Math.min(sheet.count - 1, Math.floor(elapsed * sheet.count / duration));
}

function enterGliderPhase(enemy: EnemyState, phase: GliderPhase) {
  enemy.gliderPhase = phase;
  if (phase === "windup") {
    enemy.gliderTimer = gliderWindupFrames(enemy);
    enemy.gliderDiveVy = 0;
    playSfx("enemyWarning", GLIDER_CONFIG.windupSfxPitch);
  } else if (phase === "dive") {
    enemy.gliderTimer = gliderDiveFrames(enemy);
    const targetY = clamp(
      state.player.y + state.player.h * GLIDER_CONFIG.diveTargetPlayerYRatio - enemy.h / HALF_DIVISOR,
      GLIDER_CONFIG.minTopY,
      gliderMaxDiveTopY(enemy),
    );
    enemy.gliderDiveVy = clamp(
      (targetY - enemy.y) / gliderDiveFrames(enemy),
      -GLIDER_CONFIG.diveMaxAbsVy,
      GLIDER_CONFIG.diveMaxAbsVy,
    );
    playSfx("enemyDive");
  } else if (phase === "pass") {
    enemy.gliderTimer = GLIDER_CONFIG.passFrames;
  } else if (phase === "recover") {
    enemy.gliderTimer = gliderRecoverFrames(enemy);
    enemy.gliderDiveVy = 0;
  } else {
    enemy.gliderTimer = gliderHoverFrames(enemy);
    enemy.gliderDiveVy = 0;
  }
}

function initGlider(enemy: EnemyState, context: EnemySpawnContext) {
  enemy.gliderPhase = "hover";
  enemy.gliderTimer = gliderHoverFrames(enemy);
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
      enemy.vx = facing * gliderDiveSpeed(enemy);
    }
  } else if (phase === "dive") {
    enemy.gliderTimer -= 1;
    enemy.vx = (enemy.gliderFacing ?? facing) * gliderDiveSpeed(enemy);
    enemy.y = clamp(enemy.y + (enemy.gliderDiveVy ?? 0), GLIDER_CONFIG.minTopY, gliderMaxDiveTopY(enemy));
    if (enemy.gliderTimer <= 0) {
      enterGliderPhase(enemy, "pass");
    }
  } else if (phase === "pass") {
    enemy.gliderTimer -= 1;
    enemy.vx = (enemy.gliderFacing ?? facing) * gliderDiveSpeed(enemy) * GLIDER_CONFIG.passSpeedScale;
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

function drawGliderDiveCue(enemy: EnemyState, phase: GliderPhase, facing: number) {
  if (!ctx) return;
  if (phase !== "windup" && phase !== "dive" && phase !== "pass" && phase !== "recover") return;

  const centerX = enemyCenterX(enemy);
  const feetY = enemyFeetY(enemy);
  if (phase === "recover") {
    ctx.fillStyle = "rgba(120, 190, 255, 0.42)";
    ctx.fillRect(
      centerX - RECOVER_CUE_WIDTH / HALF_DIVISOR,
      feetY - RECOVER_CUE_Y_OFFSET,
      RECOVER_CUE_WIDTH,
      RECOVER_CUE_HEIGHT,
    );
    return;
  }

  const speedX = facing * gliderDiveSpeed(enemy);
  const angle = Math.atan2(enemy.gliderDiveVy ?? 0, speedX);
  const alpha = phase === "windup" ? DIVE_CUE_WINDUP_ALPHA : DIVE_CUE_ACTIVE_ALPHA;
  const originX = facing === 1 ? enemy.x + enemy.w : enemy.x;
  const originY = feetY - DIVE_CUE_Y_OFFSET;

  ctx.save();
  ctx.translate(originX, originY);
  ctx.rotate(angle);
  ctx.fillStyle = `rgba(136, 82, 170, ${alpha})`;
  ctx.fillRect(0, -DIVE_CUE_HEIGHT / HALF_DIVISOR, DIVE_CUE_LENGTH, DIVE_CUE_HEIGHT);
  ctx.fillStyle = `rgba(210, 170, 255, ${Math.min(
    DIVE_CUE_HIGHLIGHT_ALPHA_CAP,
    alpha + DIVE_CUE_HIGHLIGHT_ALPHA_BOOST,
  )})`;
  ctx.fillRect(0, -DIVE_CUE_HEIGHT, DIVE_CUE_MARKER_WIDTH, DIVE_CUE_HEIGHT * 2);
  ctx.restore();
}

function drawGlider(enemy: EnemyState) {
  const phase = enemy.gliderPhase ?? "hover";
  const sheet = gliderSheetForPhase(phase);
  const facing = enemy.gliderFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const drawScale = enemyDrawScale(GLIDER_ARCHETYPE);
  drawGliderDiveCue(enemy, phase, facing);

  if (phase === "hover") {
    drawEnemyFrame(enemy, sheet, drawScale, GLIDER_CONFIG.hoverAnimSpeed, state.elapsed, facing);
    return;
  }

  const frame = gliderPhaseFrame(enemy, phase);
  const drawW = Math.round(sheet.frameW * drawScale);
  const drawH = Math.round(sheet.frameH * drawScale);
  const centerX = enemyCenterX(enemy);
  const feetY = enemyFeetY(enemy);
  drawEnemySheetFrame(enemy, sheet, frame, centerX - drawW / HALF_DIVISOR, feetY - drawH, drawW, drawH, facing);
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
