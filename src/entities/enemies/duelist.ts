import { state } from "../../game/state";
import { playSfx } from "../../game/audio";
import { DUELIST_SHEET_INDEX, DUELIST_SHEETS, ENEMY_SHEETS } from "../../constants";
import { ctx } from "../../rendering/context";
import type { DuelistPhase, EnemyState } from "../../types/game-state";
import { hitbox } from "../../game/utils";
import { hurtPlayer } from "../player";
import type { EnemyArchetype, EnemySpawnContext } from "./common";
import {
  drawEnemyFrame,
  drawEnemySheetFrame,
  enemyCenterX,
  enemyDrawScale,
  enemyFeetY,
  hasAwakenedGrowth,
  isEliteEnemy,
} from "./common";

const DUELIST_CONFIG = {
  triggerDistance: 124,
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
  recoverMinFrames: 18,
  recoverFrameJitter: 9,
  awakenedRecoverMinFrames: 14,
  eliteRecoverMinFrames: 12,
  eliteWindupBonusFrames: 4,
  eliteSlashReachBonus: 24,
  blockedRetryMinFrames: 6,
  blockedRetryFrameJitter: 8,
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
const SLASH_WARNING_SFX_PITCH = 1.16;
const SLASH_START_SFX_PITCH = 1.08;
const SLASH_CUE_HEIGHT = 7;
const SLASH_CUE_Y_RATIO = 0.44;
const SLASH_CUE_MARKER_WIDTH = 4;
const SLASH_CUE_MARKER_HEIGHT_RATIO = 0.48;
const SLASH_CUE_WINDUP_ALPHA_BASE = 0.22;
const SLASH_CUE_WINDUP_ALPHA_SCALE = 0.34;
const SLASH_CUE_ACTIVE_ALPHA = 0.42;
const SLASH_CUE_HIGHLIGHT_ALPHA_CAP = 0.78;
const SLASH_CUE_HIGHLIGHT_ALPHA_BOOST = 0.2;

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
      && (enemy.duelistPhase === "windup" || enemy.duelistPhase === "slash")
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

function duelistPhaseDuration(enemy: EnemyState, phase: DuelistPhase) {
  if (phase === "windup") return duelistWindupFrames(enemy);
  if (phase === "slash") return DUELIST_CONFIG.slashFrames;
  if (phase === "recover") return duelistRecoverMinFrames(enemy);
  return 1;
}

function duelistPhaseFrame(enemy: EnemyState, phase: DuelistPhase) {
  const sheet = duelistSheetForPhase(phase);
  const duration = duelistPhaseDuration(enemy, phase);
  const elapsed = Math.max(0, duration - (enemy.duelistTimer ?? 0));
  return Math.min(sheet.count - 1, Math.floor(elapsed * sheet.count / duration));
}

function enterDuelistPhase(enemy: EnemyState, phase: DuelistPhase) {
  enemy.duelistPhase = phase;
  enemy.duelistSlashHit = false;
  if (phase === "windup") {
    enemy.duelistTimer = duelistWindupFrames(enemy);
    playSfx("enemyWarning", SLASH_WARNING_SFX_PITCH);
  } else if (phase === "slash") {
    enemy.duelistTimer = DUELIST_CONFIG.slashFrames;
    playSfx("enemySlash", SLASH_START_SFX_PITCH);
  } else if (phase === "recover") {
    enemy.duelistTimer = randomFrameCount(
      duelistRecoverMinFrames(enemy),
      DUELIST_CONFIG.recoverFrameJitter,
    );
  } else {
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

function triggerDuelistSlashHit(enemy: EnemyState) {
  const box = duelistSlashBox(enemy);
  if (!hitbox(box, state.player)) return;
  enemy.duelistSlashHit = true;
  const facing = enemy.duelistFacing ?? (enemy.vx >= 0 ? 1 : -1);
  hurtPlayer(enemy.damage * DUELIST_CONFIG.slashDamageMultiplier + DUELIST_CONFIG.slashDamageBonus, -facing);
}

function drawDuelistSlashCue(enemy: EnemyState, phase: DuelistPhase, facing: number) {
  if (!ctx || (phase !== "windup" && phase !== "slash")) return;

  const box = duelistSlashBox(enemy);
  const duration = Math.max(1, duelistPhaseDuration(enemy, phase));
  const progress = phase === "windup"
    ? 1 - Math.max(0, enemy.duelistTimer ?? 0) / duration
    : 1;
  const alpha = phase === "windup"
    ? SLASH_CUE_WINDUP_ALPHA_BASE + progress * SLASH_CUE_WINDUP_ALPHA_SCALE
    : SLASH_CUE_ACTIVE_ALPHA;
  const cueY = box.y + box.h * SLASH_CUE_Y_RATIO;
  const markerX = facing === 1 ? box.x + box.w - SLASH_CUE_MARKER_WIDTH : box.x;
  const markerHeight = box.h * SLASH_CUE_MARKER_HEIGHT_RATIO;

  ctx.save();
  ctx.fillStyle = `rgba(180, 58, 64, ${alpha})`;
  ctx.fillRect(box.x, cueY, box.w, SLASH_CUE_HEIGHT);
  ctx.fillStyle = `rgba(246, 196, 170, ${Math.min(
    SLASH_CUE_HIGHLIGHT_ALPHA_CAP,
    alpha + SLASH_CUE_HIGHLIGHT_ALPHA_BOOST,
  )})`;
  ctx.fillRect(markerX, cueY - markerHeight / HALF_DIVISOR, SLASH_CUE_MARKER_WIDTH, markerHeight);
  ctx.restore();
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
      enterDuelistPhase(enemy, "slash");
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
      triggerDuelistSlashHit(enemy);
    }
    if (enemy.duelistTimer <= 0) {
      enterDuelistPhase(enemy, "recover");
      enemy.vx = 0;
    }
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
  drawDuelistSlashCue(enemy, phase, facing);

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
