import { ctx } from "../../rendering/context";
import { state } from "../../game/state";
import { playSfx } from "../../game/audio";
import { ENEMY_SHEETS, WARDEN_AURA_EFFECT_SHEET, WARDEN_SHEET_INDEX, WARDEN_SHEETS } from "../../constants";
import { drawSheetFrame } from "../../rendering/graphics";
import type { EnemyState, WardenPhase } from "../../types/game-state";
import { frameIndex } from "../../game/utils";
import type { EnemyArchetype, EnemySpawnContext } from "./common";
import {
  drawEnemyFrame,
  drawEnemySheetFrame,
  enemyCenterX,
  enemyDrawScale,
  enemyFeetY,
  hasAwakenedGrowth,
} from "./common";

const HALF_DIVISOR = 2;
const FULL_CIRCLE = Math.PI * 2;
const HIT_REACT_SFX_PITCH = 0.84;
const AURA_RING_PULSE_BASE = 0.55;
const AURA_RING_PULSE_SCALE = 0.12;
const AURA_RING_PULSE_SPEED = 5.8;
const AURA_RING_FEET_OFFSET = 6;
const BUFF_MARK_PULSE_BASE = 0.38;
const BUFF_MARK_PULSE_SCALE = 0.1;
const BUFF_MARK_PULSE_SPEED = 7.2;
const BUFF_MARK_FEET_OFFSET = 4;
const BUFF_MARK_MIN_RADIUS_X = 14;
const BUFF_MARK_RADIUS_X_SCALE = 0.32;
const BUFF_MARK_RADIUS_Y = 5;

const WARDEN_CONFIG = {
  minRange: 220,
  maxRange: 330,
  preferredRange: 272,
  rangeSlack: 18,
  moveBaseSpeed: 0.46,
  moveRandomSpeed: 0.16,
  moveSpeedScaleByElapsed: 0.003,
  moveSpeedMaxBonus: 0.18,
  driftScale: 0.3,
  retreatScale: 1.05,
  auraMinFrames: 60,
  awakenedAuraMinFrames: 72,
  auraFrameJitter: 20,
  moveCooldownMinFrames: 18,
  moveCooldownJitterFrames: 18,
  hitFrames: 14,
  blockedRetryFrames: 12,
  auraRadius: 180,
  awakenedAuraRadius: 218,
  auraVerticalRadiusScale: 0.72,
  auraSpeedScale: 1.12,
  awakenedAuraSpeedScale: 1.18,
  maxActiveWardens: 1,
  hpMultiplier: 1.6,
  damageScale: 0.8,
  drawScale: 1.16,
  collisionScaleX: 0.82,
  collisionScaleY: 0.82,
  moveAnimSpeed: 8,
  auraAnimSpeed: 10,
  auraEffectFrameDuration: 7,
  auraEffectDrawW: 198,
  auraEffectAlpha: 0.82,
  auraMarkColor: "178, 214, 142",
} as const;

function randomFrameCount(min: number, jitter: number) {
  return min + Math.floor(Math.random() * jitter);
}

function isWarden(enemy: Pick<EnemyState, "sheetIndex">) {
  return enemy.sheetIndex === WARDEN_SHEET_INDEX;
}

function playerCenterX() {
  return state.player.x + state.player.w / HALF_DIVISOR;
}

function wardenFacing(enemy: EnemyState, toward: number) {
  if (toward === 0) return enemy.wardenFacing ?? 1;
  return Math.sign(toward);
}

function wardenMoveSpeed() {
  return Math.min(
    WARDEN_CONFIG.moveBaseSpeed + WARDEN_CONFIG.moveSpeedMaxBonus,
    WARDEN_CONFIG.moveBaseSpeed
      + state.elapsed * WARDEN_CONFIG.moveSpeedScaleByElapsed
      + Math.random() * WARDEN_CONFIG.moveRandomSpeed,
  );
}

function wardenAuraMinFrames(enemy: EnemyState) {
  return hasAwakenedGrowth(enemy) ? WARDEN_CONFIG.awakenedAuraMinFrames : WARDEN_CONFIG.auraMinFrames;
}

function wardenAuraRadius(enemy: EnemyState) {
  return hasAwakenedGrowth(enemy) ? WARDEN_CONFIG.awakenedAuraRadius : WARDEN_CONFIG.auraRadius;
}

function wardenAuraSpeedScale(enemy: EnemyState) {
  return hasAwakenedGrowth(enemy) ? WARDEN_CONFIG.awakenedAuraSpeedScale : WARDEN_CONFIG.auraSpeedScale;
}

function wardenSupportTargetCount(warden: EnemyState) {
  let count = 0;
  const centerX = enemyCenterX(warden);
  const centerY = warden.y + warden.h / HALF_DIVISOR;
  const radiusX = wardenAuraRadius(warden);
  const radiusY = radiusX * WARDEN_CONFIG.auraVerticalRadiusScale;

  for (const enemy of state.enemies) {
    if (enemy === warden || isWarden(enemy)) continue;
    const dx = (enemyCenterX(enemy) - centerX) / radiusX;
    const dy = ((enemy.y + enemy.h / HALF_DIVISOR) - centerY) / radiusY;
    if (dx * dx + dy * dy <= 1) count += 1;
  }

  return count;
}

function enterWardenPhase(enemy: EnemyState, phase: WardenPhase) {
  enemy.wardenPhase = phase;
  if (phase === "aura") {
    enemy.wardenTimer = randomFrameCount(wardenAuraMinFrames(enemy), WARDEN_CONFIG.auraFrameJitter);
    playSfx("enemyAura");
  } else if (phase === "hit") {
    enemy.wardenTimer = WARDEN_CONFIG.hitFrames;
    playSfx("enemyHitReact", HIT_REACT_SFX_PITCH);
  } else {
    enemy.wardenTimer = randomFrameCount(
      WARDEN_CONFIG.moveCooldownMinFrames,
      WARDEN_CONFIG.moveCooldownJitterFrames,
    );
  }
}

function initWarden(enemy: EnemyState, context: EnemySpawnContext) {
  enemy.wardenPhase = "move";
  enemy.wardenTimer = randomFrameCount(
    WARDEN_CONFIG.moveCooldownMinFrames,
    WARDEN_CONFIG.moveCooldownJitterFrames,
  );
  enemy.wardenFacing = -context.side;
  enemy.wardenBaseSpeed = context.speed;
  enemy.wardenBuffedFrames = 0;
  enemy.damage *= WARDEN_CONFIG.damageScale;
}

function updateWardenMove(enemy: EnemyState, facing: number, distance: number) {
  enemy.wardenTimer = Math.max(0, (enemy.wardenTimer ?? 0) - 1);
  const speed = enemy.wardenBaseSpeed ?? WARDEN_CONFIG.moveBaseSpeed;

  if (distance < WARDEN_CONFIG.minRange) {
    enemy.vx = -facing * speed * WARDEN_CONFIG.retreatScale;
  } else if (distance > WARDEN_CONFIG.maxRange) {
    enemy.vx = facing * speed;
  } else {
    const rangeOffset = distance - WARDEN_CONFIG.preferredRange;
    enemy.vx = Math.abs(rangeOffset) > WARDEN_CONFIG.rangeSlack
      ? Math.sign(rangeOffset) * facing * speed * WARDEN_CONFIG.driftScale
      : 0;
  }

  if (
    distance >= WARDEN_CONFIG.minRange
    && distance <= WARDEN_CONFIG.maxRange
    && enemy.wardenTimer <= 0
  ) {
    if (wardenSupportTargetCount(enemy) > 0) {
      enterWardenPhase(enemy, "aura");
      enemy.vx = 0;
    } else {
      enemy.wardenTimer = WARDEN_CONFIG.blockedRetryFrames;
    }
  }
}

function updateWarden(enemy: EnemyState) {
  enemy.wardenPhase ??= "move";
  enemy.wardenTimer ??= 0;
  enemy.wardenFacing ??= enemy.vx >= 0 ? 1 : -1;
  enemy.wardenBaseSpeed ??= wardenMoveSpeed();
  enemy.wardenBuffedFrames = 0;

  if (enemy.wardenPhase !== "hit" && enemy.hitCd > 0) {
    enterWardenPhase(enemy, "hit");
  }

  const toward = playerCenterX() - enemyCenterX(enemy);
  const facing = wardenFacing(enemy, toward);
  enemy.wardenFacing = facing;

  if (enemy.wardenPhase === "hit") {
    enemy.vx = 0;
    enemy.wardenTimer -= 1;
    if (enemy.wardenTimer <= 0) enterWardenPhase(enemy, "move");
  } else if (enemy.wardenPhase === "aura") {
    enemy.vx = 0;
    enemy.wardenTimer -= 1;
    const targetCount = wardenSupportTargetCount(enemy);
    if (
      enemy.wardenTimer <= 0
      || targetCount <= 0
      || Math.abs(toward) < WARDEN_CONFIG.minRange - WARDEN_CONFIG.rangeSlack
      || Math.abs(toward) > WARDEN_CONFIG.maxRange + WARDEN_CONFIG.rangeSlack
    ) {
      enterWardenPhase(enemy, "move");
    }
  } else {
    updateWardenMove(enemy, facing, Math.abs(toward));
  }

  enemy.x += enemy.vx;
}

function wardenHitFrame(enemy: EnemyState) {
  const elapsed = Math.max(0, WARDEN_CONFIG.hitFrames - (enemy.wardenTimer ?? 0));
  return Math.min(WARDEN_SHEETS.hit.count - 1, Math.floor(elapsed * WARDEN_SHEETS.hit.count / WARDEN_CONFIG.hitFrames));
}

function drawWarden(enemy: EnemyState) {
  const phase = enemy.wardenPhase ?? "move";
  const facing = enemy.wardenFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const drawScale = enemyDrawScale(WARDEN_ARCHETYPE);
  if (phase === "move") {
    drawEnemyFrame(enemy, WARDEN_SHEETS.move, drawScale, WARDEN_CONFIG.moveAnimSpeed, state.elapsed, facing);
    return;
  }
  if (phase === "aura") {
    drawEnemyFrame(enemy, WARDEN_SHEETS.aura, drawScale, WARDEN_CONFIG.auraAnimSpeed, state.elapsed, facing);
    return;
  }

  const sheet = WARDEN_SHEETS.hit;
  const frame = wardenHitFrame(enemy);
  const drawW = Math.round(sheet.frameW * drawScale);
  const drawH = Math.round(sheet.frameH * drawScale);
  drawEnemySheetFrame(
    enemy,
    sheet,
    frame,
    enemyCenterX(enemy) - drawW / HALF_DIVISOR,
    enemyFeetY(enemy) - drawH,
    drawW,
    drawH,
    facing,
  );
}

function activeAuraWardens() {
  return state.enemies.filter((enemy) => isWarden(enemy) && enemy.wardenPhase === "aura");
}

export function applyWardenAuraBuffs() {
  for (const enemy of state.enemies) {
    enemy.wardenBuffedFrames = 0;
  }

  for (const warden of activeAuraWardens()) {
    const centerX = enemyCenterX(warden);
    const centerY = warden.y + warden.h / HALF_DIVISOR;
    const radiusX = wardenAuraRadius(warden);
    const radiusY = radiusX * WARDEN_CONFIG.auraVerticalRadiusScale;

    for (const enemy of state.enemies) {
      if (enemy === warden || isWarden(enemy)) continue;
      const dx = (enemyCenterX(enemy) - centerX) / radiusX;
      const dy = ((enemy.y + enemy.h / HALF_DIVISOR) - centerY) / radiusY;
      if (dx * dx + dy * dy > 1) continue;
      enemy.wardenBuffedFrames = 2;
      enemy.x += enemy.vx * (wardenAuraSpeedScale(warden) - 1);
    }
  }
}

function drawAuraRing(enemy: EnemyState) {
  if (!ctx || enemy.wardenPhase !== "aura") return;
  const pulse = AURA_RING_PULSE_BASE + AURA_RING_PULSE_SCALE * Math.sin(state.elapsed * AURA_RING_PULSE_SPEED + enemy.animSeed);
  const centerX = enemyCenterX(enemy);
  const feetY = enemyFeetY(enemy) - AURA_RING_FEET_OFFSET;
  const sheet = WARDEN_AURA_EFFECT_SHEET;
  const frame = frameIndex(sheet.count, WARDEN_CONFIG.auraEffectFrameDuration, state.elapsed, enemy.animSeed);
  const drawW = Math.round(WARDEN_CONFIG.auraEffectDrawW * wardenAuraRadius(enemy) / WARDEN_CONFIG.auraRadius);
  const drawH = Math.round(drawW * sheet.frameH / sheet.frameW);
  ctx.save();
  ctx.globalAlpha = WARDEN_CONFIG.auraEffectAlpha * pulse;
  drawSheetFrame(sheet, frame, centerX - drawW / HALF_DIVISOR, feetY - drawH, drawW, drawH);
  ctx.restore();
}

function drawBuffMark(enemy: EnemyState) {
  if (!ctx || (enemy.wardenBuffedFrames ?? 0) <= 0) return;
  const pulse = BUFF_MARK_PULSE_BASE + BUFF_MARK_PULSE_SCALE * Math.sin(state.elapsed * BUFF_MARK_PULSE_SPEED + enemy.animSeed);
  const centerX = enemyCenterX(enemy);
  const feetY = enemyFeetY(enemy) - BUFF_MARK_FEET_OFFSET;
  const radiusX = Math.max(BUFF_MARK_MIN_RADIUS_X, enemy.w * BUFF_MARK_RADIUS_X_SCALE);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = `rgba(${WARDEN_CONFIG.auraMarkColor}, 0.95)`;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.ellipse(centerX, feetY, radiusX, BUFF_MARK_RADIUS_Y, 0, 0, FULL_CIRCLE);
  ctx.stroke();
  ctx.restore();
}

export function drawWardenAuraIndicators() {
  for (const enemy of state.enemies) {
    drawAuraRing(enemy);
  }
  for (const enemy of state.enemies) {
    drawBuffMark(enemy);
  }
}

export const WARDEN_ARCHETYPE: EnemyArchetype = {
  speed: wardenMoveSpeed,
  hpMultiplier: WARDEN_CONFIG.hpMultiplier,
  drawScale: WARDEN_CONFIG.drawScale,
  collisionScaleX: WARDEN_CONFIG.collisionScaleX,
  collisionScaleY: WARDEN_CONFIG.collisionScaleY,
  init: initWarden,
  update: updateWarden,
  draw: drawWarden,
};

export function isWardenSheet(sheetIndex: number) {
  return sheetIndex === WARDEN_SHEET_INDEX && Boolean(ENEMY_SHEETS[WARDEN_SHEET_INDEX]);
}

export function wardenActiveCount() {
  let count = 0;
  for (const enemy of state.enemies) {
    if (isWarden(enemy)) count += 1;
  }
  return count;
}

export function canSpawnWarden() {
  return wardenActiveCount() < WARDEN_CONFIG.maxActiveWardens;
}
