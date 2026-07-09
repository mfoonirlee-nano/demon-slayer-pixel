import { state } from "../../game/state";
import { playSfx } from "../../game/audio";
import { DUELIST_SHEET_INDEX, DUELIST_SHEETS, ENEMY_SHEETS, GROUND_Y } from "../../constants";
import type { DuelistPhase, EnemyState } from "../../types/game-state";
import { clamp, hitbox, lerp } from "../../game/utils";
import { hurtPlayer } from "../player";
import type { EnemyArchetype, EnemySpawnContext } from "./common";
import {
  drawEnemyFrame,
  drawEnemySheetFrame,
  enemyCenterX,
  enemyDrawScale,
  enemyFeetY,
  enemyGrowthStage,
  hasAwakenedGrowth,
  isEliteEnemy,
} from "./common";

const DUELIST_CONFIG = {
  triggerDistance: 148,
  approachBaseSpeed: 0.86,
  approachRandomSpeed: 0.34,
  approachSpeedScaleByElapsed: 0.006,
  windupFrames: 22,
  slashFrames: 16,
  slashActiveStartFrame: 5,
  slashActiveEndFrame: 10,
  slashSlideSpeed: 1.1,
  slashDamageMultiplier: 1.9,
  slashDamageBonus: 2,
  spinFrames: 24,
  spinActiveStartFrame: 4,
  spinActiveEndFrame: 19,
  spinArcHeight: 44,
  spinDamageMultiplier: 2.15,
  spinDamageBonus: 3,
  spinMinDistance: 88,
  finalSpinReachBonus: 74,
  finalSpinHeightBonus: 16,
  recoverMinFrames: 18,
  recoverFrameJitter: 9,
  awakenedRecoverMinFrames: 14,
  eliteRecoverMinFrames: 12,
  eliteWindupBonusFrames: 4,
  eliteSlashReachBonus: 24,
  blockedRetryMinFrames: 4,
  blockedRetryFrameJitter: 6,
  hpMultiplier: 1.35,
  maxActiveDuelists: 3,
  maxActiveThreats: 1,
  drawScale: 1.14,
  approachAnimSpeed: 7,
} as const;

const HALF_DIVISOR = 2;
const SLASH_BOX_WIDTH_SCALE = 1.45;
const SLASH_BOX_HEIGHT_SCALE = 0.94;
const SLASH_BOX_REACH = 48;
const SLASH_BOX_FORWARD_RATIO = 0.52;
const SLASH_BOX_BACK_RATIO = 0.48;
const SPIN_BOX_WIDTH_SCALE = 2.2;
const SPIN_BOX_HEIGHT_SCALE = 1.16;
const SPIN_BOX_REACH = 68;
const SPIN_BOX_LIFT = 10;
const SLASH_WARNING_SFX_PITCH = 1.16;
const SLASH_START_SFX_PITCH = 1.08;

function isDuelist(enemy: Pick<EnemyState, "sheetIndex">) {
  return enemy.sheetIndex === DUELIST_SHEET_INDEX;
}

function randomFrameCount(min: number, jitter: number) {
  return min + Math.floor(Math.random() * jitter);
}

function playerCenterX() {
  return state.player.x + state.player.w / HALF_DIVISOR;
}

function duelistFacing(enemy: EnemyState, toward: number) {
  if (toward === 0) return enemy.duelistFacing ?? 1;
  return Math.sign(toward);
}

function duelistApproachSpeed() {
  return DUELIST_CONFIG.approachBaseSpeed
    + state.elapsed * DUELIST_CONFIG.approachSpeedScaleByElapsed
    + Math.random() * DUELIST_CONFIG.approachRandomSpeed;
}

function duelistThreatCount() {
  let count = 0;
  for (const enemy of state.enemies) {
    if (
      isDuelist(enemy)
      && (
        enemy.duelistPhase === "windup"
        || enemy.duelistPhase === "slash"
        || enemy.duelistPhase === "spin"
      )
    ) {
      count += 1;
    }
  }
  return count;
}

export function duelistActiveCount() {
  let count = 0;
  for (const enemy of state.enemies) {
    if (isDuelist(enemy)) count += 1;
  }
  return count;
}

function duelistSheetForPhase(phase: DuelistPhase) {
  return DUELIST_SHEETS[phase] || DUELIST_SHEETS.approach;
}

function duelistWindupFrames(enemy: EnemyState) {
  return DUELIST_CONFIG.windupFrames + (isEliteEnemy(enemy) ? DUELIST_CONFIG.eliteWindupBonusFrames : 0);
}

function duelistRecoverMinFrames(enemy: EnemyState) {
  if (isEliteEnemy(enemy)) return DUELIST_CONFIG.eliteRecoverMinFrames;
  if (hasAwakenedGrowth(enemy)) return DUELIST_CONFIG.awakenedRecoverMinFrames;
  return DUELIST_CONFIG.recoverMinFrames;
}

function duelistAttackPhase(enemy: EnemyState, targetDistance: number): DuelistPhase {
  if (!hasAwakenedGrowth(enemy)) return "slash";
  return targetDistance >= DUELIST_CONFIG.spinMinDistance ? "spin" : "slash";
}

function duelistPhaseDuration(enemy: EnemyState, phase: DuelistPhase) {
  if (phase === "windup") return duelistWindupFrames(enemy);
  if (phase === "slash") return DUELIST_CONFIG.slashFrames;
  if (phase === "spin") return DUELIST_CONFIG.spinFrames;
  if (phase === "recover") return duelistRecoverMinFrames(enemy);
  return 1;
}

function duelistPhaseFrame(enemy: EnemyState, phase: DuelistPhase) {
  const sheet = duelistSheetForPhase(phase);
  const duration = duelistPhaseDuration(enemy, phase);
  const elapsed = Math.max(0, duration - (enemy.duelistTimer ?? 0));
  return Math.min(sheet.count - 1, Math.floor(elapsed * sheet.count / duration));
}

function duelistGroundTop(enemy: EnemyState) {
  return (enemy.onPlatform?.y ?? GROUND_Y) - enemy.h;
}

function clearDuelistSpinState(enemy: EnemyState) {
  enemy.duelistSpinStartX = undefined;
  enemy.duelistSpinStartY = undefined;
  enemy.duelistSpinTargetX = undefined;
  enemy.duelistSpinGroundY = undefined;
}

function duelistSpinTargetLeft(enemy: EnemyState) {
  return playerCenterX() - enemy.w / HALF_DIVISOR;
}

function enterDuelistPhase(enemy: EnemyState, phase: DuelistPhase) {
  enemy.duelistPhase = phase;
  enemy.duelistSlashHit = false;
  if (phase === "windup") {
    clearDuelistSpinState(enemy);
    enemy.duelistTimer = duelistWindupFrames(enemy);
    playSfx("enemyWarning", SLASH_WARNING_SFX_PITCH);
  } else if (phase === "slash") {
    clearDuelistSpinState(enemy);
    enemy.duelistTimer = DUELIST_CONFIG.slashFrames;
    playSfx("enemySlash", SLASH_START_SFX_PITCH);
  } else if (phase === "spin") {
    enemy.duelistTimer = DUELIST_CONFIG.spinFrames;
    enemy.duelistSpinStartX = enemy.x;
    enemy.duelistSpinStartY = enemy.y;
    enemy.duelistSpinTargetX = duelistSpinTargetLeft(enemy);
    enemy.duelistSpinGroundY = duelistGroundTop(enemy);
    enemy.vy = 0;
    enemy.onPlatform = null;
    playSfx("enemySlash", SLASH_START_SFX_PITCH);
  } else if (phase === "recover") {
    if (enemy.duelistSpinTargetX !== undefined) enemy.x = enemy.duelistSpinTargetX;
    if (enemy.duelistSpinGroundY !== undefined) enemy.y = enemy.duelistSpinGroundY;
    clearDuelistSpinState(enemy);
    enemy.duelistTimer = randomFrameCount(
      duelistRecoverMinFrames(enemy),
      DUELIST_CONFIG.recoverFrameJitter,
    );
  } else {
    clearDuelistSpinState(enemy);
    enemy.duelistTimer = 0;
  }
}

function duelistSlashBox(enemy: EnemyState) {
  const facing = enemy.duelistFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const reach = SLASH_BOX_REACH + (isEliteEnemy(enemy) ? DUELIST_CONFIG.eliteSlashReachBonus : 0);
  const w = Math.round(enemy.w * SLASH_BOX_WIDTH_SCALE + reach);
  const h = Math.round(enemy.h * SLASH_BOX_HEIGHT_SCALE);
  return {
    x: facing === 1
      ? enemy.x + enemy.w * SLASH_BOX_FORWARD_RATIO
      : enemy.x + enemy.w * SLASH_BOX_BACK_RATIO - w,
    y: enemyFeetY(enemy) - h,
    w,
    h,
  };
}

function duelistSpinBox(enemy: EnemyState) {
  const final = enemyGrowthStage(enemy) === "final";
  const w = Math.round(
    enemy.w * SPIN_BOX_WIDTH_SCALE
    + SPIN_BOX_REACH
    + (final ? DUELIST_CONFIG.finalSpinReachBonus : 0),
  );
  const h = Math.round(
    enemy.h * SPIN_BOX_HEIGHT_SCALE
    + (final ? DUELIST_CONFIG.finalSpinHeightBonus : 0),
  );

  return {
    x: enemyCenterX(enemy) - w / HALF_DIVISOR,
    y: enemyFeetY(enemy) - h - SPIN_BOX_LIFT,
    w,
    h,
  };
}

function triggerDuelistAttackHit(enemy: EnemyState, phase: "slash" | "spin") {
  const box = phase === "spin" ? duelistSpinBox(enemy) : duelistSlashBox(enemy);
  if (!hitbox(box, state.player)) return;
  enemy.duelistSlashHit = true;
  const facing = enemy.duelistFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const damageMultiplier = phase === "spin"
    ? DUELIST_CONFIG.spinDamageMultiplier
    : DUELIST_CONFIG.slashDamageMultiplier;
  const damageBonus = phase === "spin" ? DUELIST_CONFIG.spinDamageBonus : DUELIST_CONFIG.slashDamageBonus;
  hurtPlayer(enemy.damage * damageMultiplier + damageBonus, -facing);
}

function initDuelist(enemy: EnemyState, context: EnemySpawnContext) {
  enemy.duelistPhase = "approach";
  enemy.duelistTimer = randomFrameCount(
    DUELIST_CONFIG.blockedRetryMinFrames,
    DUELIST_CONFIG.blockedRetryFrameJitter,
  );
  enemy.duelistFacing = -context.side;
  enemy.duelistBaseSpeed = context.speed;
  enemy.duelistSlashHit = false;
}

function updateDuelist(enemy: EnemyState) {
  enemy.duelistPhase ??= "approach";
  enemy.duelistTimer ??= 0;
  enemy.duelistFacing ??= enemy.vx >= 0 ? 1 : -1;
  enemy.duelistBaseSpeed ??= DUELIST_CONFIG.approachBaseSpeed;
  enemy.duelistSlashHit ??= false;

  const toward = playerCenterX() - enemyCenterX(enemy);
  const facing = duelistFacing(enemy, toward);
  const phase = enemy.duelistPhase;

  if (phase === "approach") {
    enemy.duelistFacing = facing;
    enemy.duelistTimer = Math.max(0, enemy.duelistTimer - 1);
    if (Math.abs(toward) <= DUELIST_CONFIG.triggerDistance) {
      enemy.vx = 0;
      if (enemy.duelistTimer <= 0) {
        if (duelistThreatCount() < DUELIST_CONFIG.maxActiveThreats) {
          enterDuelistPhase(enemy, "windup");
        } else {
          enemy.duelistTimer = randomFrameCount(
            DUELIST_CONFIG.blockedRetryMinFrames,
            DUELIST_CONFIG.blockedRetryFrameJitter,
          );
        }
      }
    } else {
      enemy.vx = facing * (
        (enemy.duelistBaseSpeed ?? DUELIST_CONFIG.approachBaseSpeed)
        + state.elapsed * DUELIST_CONFIG.approachSpeedScaleByElapsed
      );
    }
  } else if (phase === "windup") {
    enemy.duelistFacing = facing;
    enemy.duelistTimer -= 1;
    enemy.vx = 0;
    if (enemy.duelistTimer <= 0) {
      enterDuelistPhase(enemy, duelistAttackPhase(enemy, Math.abs(toward)));
      enemy.duelistFacing = facing;
    }
  } else if (phase === "slash") {
    const elapsed = DUELIST_CONFIG.slashFrames - enemy.duelistTimer;
    enemy.duelistTimer -= 1;
    enemy.vx = (enemy.duelistFacing ?? facing) * DUELIST_CONFIG.slashSlideSpeed;
    if (
      !enemy.duelistSlashHit
      && elapsed >= DUELIST_CONFIG.slashActiveStartFrame
      && elapsed <= DUELIST_CONFIG.slashActiveEndFrame
    ) {
      triggerDuelistAttackHit(enemy, "slash");
    }
    if (enemy.duelistTimer <= 0) {
      enterDuelistPhase(enemy, "recover");
      enemy.vx = 0;
    }
  } else if (phase === "spin") {
    const elapsed = DUELIST_CONFIG.spinFrames - enemy.duelistTimer;
    const progress = clamp(elapsed / DUELIST_CONFIG.spinFrames, 0, 1);
    const startX = enemy.duelistSpinStartX ?? enemy.x;
    const startY = enemy.duelistSpinStartY ?? enemy.y;
    const targetX = enemy.duelistSpinTargetX ?? duelistSpinTargetLeft(enemy);
    const groundY = enemy.duelistSpinGroundY ?? duelistGroundTop(enemy);

    enemy.duelistFacing = duelistFacing(enemy, targetX + enemy.w / HALF_DIVISOR - enemyCenterX(enemy));
    enemy.vx = (targetX - startX) / DUELIST_CONFIG.spinFrames;
    enemy.x = lerp(startX, targetX, progress);
    enemy.y = lerp(startY, groundY, progress) - Math.sin(progress * Math.PI) * DUELIST_CONFIG.spinArcHeight;
    enemy.duelistTimer -= 1;
    if (
      !enemy.duelistSlashHit
      && elapsed >= DUELIST_CONFIG.spinActiveStartFrame
      && elapsed <= DUELIST_CONFIG.spinActiveEndFrame
    ) {
      triggerDuelistAttackHit(enemy, "spin");
    }
    if (enemy.duelistTimer <= 0) {
      enterDuelistPhase(enemy, "recover");
      enemy.vx = 0;
    }
    return;
  } else {
    enemy.duelistTimer -= 1;
    enemy.vx = 0;
    if (enemy.duelistTimer <= 0) {
      enterDuelistPhase(enemy, "approach");
    }
  }

  enemy.x += enemy.vx;
}

function drawDuelist(enemy: EnemyState) {
  const phase = enemy.duelistPhase ?? "approach";
  const sheet = duelistSheetForPhase(phase);
  const facing = enemy.duelistFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const drawScale = enemyDrawScale(DUELIST_ARCHETYPE);

  if (phase === "approach") {
    drawEnemyFrame(enemy, sheet, drawScale, DUELIST_CONFIG.approachAnimSpeed, state.elapsed, facing);
    return;
  }

  const frame = duelistPhaseFrame(enemy, phase);
  const drawW = Math.round(sheet.frameW * drawScale);
  const drawH = Math.round(sheet.frameH * drawScale);
  const centerX = enemyCenterX(enemy);
  const feetY = enemyFeetY(enemy);
  drawEnemySheetFrame(enemy, sheet, frame, centerX - drawW / HALF_DIVISOR, feetY - drawH, drawW, drawH, facing);
}

export const DUELIST_ARCHETYPE: EnemyArchetype = {
  speed: duelistApproachSpeed,
  hpMultiplier: DUELIST_CONFIG.hpMultiplier,
  drawScale: DUELIST_CONFIG.drawScale,
  init: initDuelist,
  update: updateDuelist,
  draw: drawDuelist,
};

export function isDuelistSheet(sheetIndex: number) {
  return sheetIndex === DUELIST_SHEET_INDEX && Boolean(ENEMY_SHEETS[DUELIST_SHEET_INDEX]);
}

export function canSpawnDuelist() {
  return duelistActiveCount() < DUELIST_CONFIG.maxActiveDuelists;
}
