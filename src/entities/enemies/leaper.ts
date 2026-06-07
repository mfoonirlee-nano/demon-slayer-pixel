import { ctx } from "../../context";
import { state } from "../../state";
import {
  ENEMY_SHEETS,
  GROUND_Y,
  LEAPER_SHEET_INDEX,
  LEAPER_SHEETS,
  WIDTH,
} from "../../constants";
import { drawSheetFrame } from "../../graphics";
import type { EnemyState, LeaperPhase } from "../../types/game-state";
import { clamp, frameIndex, hitbox, lerp } from "../../utils";
import { hurtPlayer } from "../player";
import type { EnemyArchetype, EnemySpawnContext } from "./common";
import { drawEnemyFrame, enemyCenterX, enemyDrawScale, enemyFeetY } from "./common";

const LEAPER_CONFIG = {
  triggerDistance: 235,
  stalkBaseSpeed: 0.62,
  stalkRandomSpeed: 0.26,
  stalkSpeedScaleByElapsed: 0.005,
  windupMinFrames: 18,
  windupFrameJitter: 7,
  leapFrames: 28,
  leapArcHeight: 86,
  impactFrames: 12,
  recoverMinFrames: 20,
  recoverFrameJitter: 11,
  blockedRetryFrames: 8,
  landingClampMargin: 26,
  impactDamageMultiplier: 1.7,
  impactDamageBonus: 2,
  hpMultiplier: 1.05,
  maxActiveLeapers: 2,
  maxLockedLandings: 1,
  drawScale: 1.04,
  collisionScaleX: 1.22,
  collisionScaleY: 0.96,
  stalkAnimSpeed: 7,
} as const;

const HALF_DIVISOR = 2;
const FULL_CIRCLE = Math.PI * 2;
const IMPACT_BOX_WIDTH_SCALE = 2.35;
const IMPACT_BOX_WIDTH_PAD = 34;
const IMPACT_BOX_HEIGHT_SCALE = 1.18;
const WARNING_RADIUS_X = 44;
const WARNING_RADIUS_Y = 7;
const WARNING_WINDUP_ALPHA_BASE = 0.2;
const WARNING_WINDUP_ALPHA_SCALE = 0.28;
const WARNING_LEAP_ALPHA_BASE = 0.42;
const WARNING_LEAP_ALPHA_SCALE = 0.12;
const WARNING_IMPACT_ALPHA = 0.24;
const WARNING_Y_OFFSET = 3;
const WARNING_CRACK_LEFT_X = -32;
const WARNING_CRACK_LEFT_W = 22;
const WARNING_CRACK_RIGHT_X = 10;
const WARNING_CRACK_RIGHT_W = 25;
const WARNING_CRACK_CENTER_X = -6;
const WARNING_CRACK_CENTER_Y = 3;
const WARNING_CRACK_CENTER_W = 14;
const WARNING_CRACK_H = 2;

function randomFrameCount(min: number, jitter: number) {
  return min + Math.floor(Math.random() * jitter);
}

function isLeaper(enemy: Pick<EnemyState, "sheetIndex">) {
  return enemy.sheetIndex === LEAPER_SHEET_INDEX;
}

function playerCenterX() {
  return state.player.x + state.player.w / HALF_DIVISOR;
}

function leaperFacing(enemy: EnemyState, toward: number) {
  if (toward === 0) return enemy.leaperFacing ?? 1;
  return Math.sign(toward);
}

function leaperStalkSpeed() {
  return LEAPER_CONFIG.stalkBaseSpeed
    + state.elapsed * LEAPER_CONFIG.stalkSpeedScaleByElapsed
    + Math.random() * LEAPER_CONFIG.stalkRandomSpeed;
}

function leaperGroundTop(enemy: EnemyState) {
  return GROUND_Y - enemy.h;
}

function leaperLandingLeft(enemy: EnemyState) {
  return clamp(
    playerCenterX() - enemy.w / HALF_DIVISOR,
    -LEAPER_CONFIG.landingClampMargin,
    WIDTH + LEAPER_CONFIG.landingClampMargin - enemy.w,
  );
}

function leaperLockedLandingCount() {
  let count = 0;
  for (const enemy of state.enemies) {
    if (
      isLeaper(enemy)
      && (
        enemy.leaperPhase === "windup"
        || enemy.leaperPhase === "leap"
        || enemy.leaperPhase === "impact"
      )
    ) {
      count += 1;
    }
  }
  return count;
}

export function leaperActiveCount() {
  let count = 0;
  for (const enemy of state.enemies) {
    if (isLeaper(enemy)) count += 1;
  }
  return count;
}

function leaperSheetForPhase(phase: LeaperPhase) {
  return LEAPER_SHEETS[phase] || LEAPER_SHEETS.stalk;
}

function enterLeaperPhase(enemy: EnemyState, phase: LeaperPhase) {
  enemy.leaperPhase = phase;
  enemy.leaperImpactHit = false;

  if (phase === "windup") {
    enemy.leaperTimer = randomFrameCount(
      LEAPER_CONFIG.windupMinFrames,
      LEAPER_CONFIG.windupFrameJitter,
    );
    enemy.leaperPhaseDuration = enemy.leaperTimer;
    enemy.leaperLandingX = leaperLandingLeft(enemy);
  } else if (phase === "leap") {
    enemy.leaperTimer = LEAPER_CONFIG.leapFrames;
    enemy.leaperPhaseDuration = LEAPER_CONFIG.leapFrames;
    enemy.leaperLeapStartX = enemy.x;
    enemy.leaperLeapStartY = enemy.y;
  } else if (phase === "impact") {
    enemy.leaperTimer = LEAPER_CONFIG.impactFrames;
    enemy.leaperPhaseDuration = LEAPER_CONFIG.impactFrames;
    enemy.x = enemy.leaperLandingX ?? enemy.x;
    enemy.y = leaperGroundTop(enemy);
  } else if (phase === "recover") {
    enemy.leaperTimer = randomFrameCount(
      LEAPER_CONFIG.recoverMinFrames,
      LEAPER_CONFIG.recoverFrameJitter,
    );
    enemy.leaperPhaseDuration = enemy.leaperTimer;
  } else {
    enemy.leaperTimer = 0;
    enemy.leaperPhaseDuration = 0;
    enemy.leaperLandingX = undefined;
    enemy.leaperLeapStartX = undefined;
    enemy.leaperLeapStartY = undefined;
  }
}

function leaperPhaseFrame(enemy: EnemyState, phase: LeaperPhase) {
  if (phase === "stalk") {
    return frameIndex(LEAPER_SHEETS.stalk.count, LEAPER_CONFIG.stalkAnimSpeed, state.elapsed, enemy.animSeed);
  }

  const sheet = leaperSheetForPhase(phase);
  const duration = Math.max(1, enemy.leaperPhaseDuration ?? 1);
  const elapsed = Math.max(0, duration - (enemy.leaperTimer ?? 0));
  return Math.min(sheet.count - 1, Math.floor(elapsed * sheet.count / duration));
}

function leaperImpactBox(enemy: EnemyState) {
  const w = Math.round(enemy.w * IMPACT_BOX_WIDTH_SCALE + IMPACT_BOX_WIDTH_PAD);
  const h = Math.round(enemy.h * IMPACT_BOX_HEIGHT_SCALE);
  return {
    x: enemyCenterX(enemy) - w / HALF_DIVISOR,
    y: enemyFeetY(enemy) - h,
    w,
    h,
  };
}

function triggerLeaperImpactHit(enemy: EnemyState) {
  enemy.leaperImpactHit = true;
  if (!hitbox(leaperImpactBox(enemy), state.player)) return;
  const facing = enemy.leaperFacing ?? (enemy.vx >= 0 ? 1 : -1);
  hurtPlayer(
    enemy.damage * LEAPER_CONFIG.impactDamageMultiplier + LEAPER_CONFIG.impactDamageBonus,
    -facing,
  );
}

function initLeaper(enemy: EnemyState, context: EnemySpawnContext) {
  enemy.leaperPhase = "stalk";
  enemy.leaperTimer = 0;
  enemy.leaperPhaseDuration = 0;
  enemy.leaperFacing = -context.side;
  enemy.leaperBaseSpeed = context.speed;
  enemy.leaperImpactHit = false;
}

function updateLeaper(enemy: EnemyState) {
  enemy.leaperPhase ??= "stalk";
  enemy.leaperTimer ??= 0;
  enemy.leaperPhaseDuration ??= 0;
  enemy.leaperFacing ??= enemy.vx >= 0 ? 1 : -1;
  enemy.leaperBaseSpeed ??= LEAPER_CONFIG.stalkBaseSpeed;
  enemy.leaperImpactHit ??= false;

  const landingX = enemy.leaperLandingX ?? leaperLandingLeft(enemy);
  const landingToward = landingX + enemy.w / HALF_DIVISOR - enemyCenterX(enemy);
  const playerToward = playerCenterX() - enemyCenterX(enemy);
  const phase = enemy.leaperPhase;

  if (phase === "stalk") {
    const facing = leaperFacing(enemy, playerToward);
    enemy.leaperFacing = facing;
    enemy.y = leaperGroundTop(enemy);
    enemy.leaperTimer = Math.max(0, enemy.leaperTimer - 1);

    if (Math.abs(playerToward) <= LEAPER_CONFIG.triggerDistance && enemy.leaperTimer <= 0) {
      enemy.vx = 0;
      if (leaperLockedLandingCount() < LEAPER_CONFIG.maxLockedLandings) {
        enterLeaperPhase(enemy, "windup");
      } else {
        enemy.leaperTimer = LEAPER_CONFIG.blockedRetryFrames;
      }
    } else {
      enemy.vx = facing * (enemy.leaperBaseSpeed ?? LEAPER_CONFIG.stalkBaseSpeed);
    }

    enemy.x += enemy.vx;
    return;
  }

  if (phase === "windup") {
    enemy.leaperFacing = leaperFacing(enemy, landingToward);
    enemy.vx = 0;
    enemy.y = leaperGroundTop(enemy);
    enemy.leaperTimer -= 1;
    if (enemy.leaperTimer <= 0) {
      enterLeaperPhase(enemy, "leap");
    }
    return;
  }

  if (phase === "leap") {
    const duration = LEAPER_CONFIG.leapFrames;
    const elapsed = duration - enemy.leaperTimer;
    const t = clamp(elapsed / duration, 0, 1);
    const startX = enemy.leaperLeapStartX ?? enemy.x;
    const startY = enemy.leaperLeapStartY ?? leaperGroundTop(enemy);
    const targetX = enemy.leaperLandingX ?? enemy.x;
    const groundTop = leaperGroundTop(enemy);

    enemy.leaperFacing = leaperFacing(enemy, targetX + enemy.w / HALF_DIVISOR - enemyCenterX(enemy));
    enemy.vx = (targetX - startX) / duration;
    enemy.x = lerp(startX, targetX, t);
    enemy.y = lerp(startY, groundTop, t) - Math.sin(t * Math.PI) * LEAPER_CONFIG.leapArcHeight;
    enemy.leaperTimer -= 1;

    if (enemy.leaperTimer <= 0) {
      enterLeaperPhase(enemy, "impact");
    }
    return;
  }

  if (phase === "impact") {
    enemy.vx = 0;
    enemy.x = enemy.leaperLandingX ?? enemy.x;
    enemy.y = leaperGroundTop(enemy);
    if (!enemy.leaperImpactHit) triggerLeaperImpactHit(enemy);
    enemy.leaperTimer -= 1;
    if (enemy.leaperTimer <= 0) {
      enterLeaperPhase(enemy, "recover");
    }
    return;
  }

  enemy.vx = 0;
  enemy.y = leaperGroundTop(enemy);
  enemy.leaperTimer -= 1;
  if (enemy.leaperTimer <= 0) {
    enterLeaperPhase(enemy, "stalk");
  }
}

function drawLeaperLandingWarning(enemy: EnemyState, phase: LeaperPhase) {
  if (!ctx || enemy.leaperLandingX === undefined) return;
  if (phase !== "windup" && phase !== "leap" && phase !== "impact") return;

  const duration = Math.max(1, enemy.leaperPhaseDuration ?? 1);
  const progress = clamp((duration - (enemy.leaperTimer ?? 0)) / duration, 0, 1);
  const alpha = phase === "windup"
    ? WARNING_WINDUP_ALPHA_BASE + progress * WARNING_WINDUP_ALPHA_SCALE
    : phase === "leap"
      ? WARNING_LEAP_ALPHA_BASE - progress * WARNING_LEAP_ALPHA_SCALE
      : WARNING_IMPACT_ALPHA;
  const x = enemy.leaperLandingX + enemy.w / HALF_DIVISOR;
  const y = GROUND_Y - WARNING_Y_OFFSET;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(136, 47, 34, 1)";
  ctx.fillStyle = "rgba(86, 31, 29, 1)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, WARNING_RADIUS_X, WARNING_RADIUS_Y, 0, 0, FULL_CIRCLE);
  ctx.stroke();
  ctx.fillRect(x + WARNING_CRACK_LEFT_X, y - 1, WARNING_CRACK_LEFT_W, WARNING_CRACK_H);
  ctx.fillRect(x + WARNING_CRACK_RIGHT_X, y - WARNING_CRACK_H, WARNING_CRACK_RIGHT_W, WARNING_CRACK_H);
  ctx.fillRect(
    x + WARNING_CRACK_CENTER_X,
    y + WARNING_CRACK_CENTER_Y,
    WARNING_CRACK_CENTER_W,
    WARNING_CRACK_H,
  );
  ctx.restore();
}

function drawLeaper(enemy: EnemyState) {
  const phase = enemy.leaperPhase ?? "stalk";
  const sheet = leaperSheetForPhase(phase);
  const facing = enemy.leaperFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const drawScale = enemyDrawScale(LEAPER_ARCHETYPE);

  drawLeaperLandingWarning(enemy, phase);

  if (phase === "stalk") {
    drawEnemyFrame(enemy, sheet, drawScale, LEAPER_CONFIG.stalkAnimSpeed, state.elapsed, facing);
    return;
  }

  const frame = leaperPhaseFrame(enemy, phase);
  const drawW = Math.round(sheet.frameW * drawScale);
  const drawH = Math.round(sheet.frameH * drawScale);
  const centerX = enemyCenterX(enemy);
  const feetY = enemyFeetY(enemy);
  drawSheetFrame(sheet, frame, centerX - drawW / HALF_DIVISOR, feetY - drawH, drawW, drawH, facing);
}

export const LEAPER_ARCHETYPE: EnemyArchetype = {
  speed: leaperStalkSpeed,
  hpMultiplier: LEAPER_CONFIG.hpMultiplier,
  drawScale: LEAPER_CONFIG.drawScale,
  collisionScaleX: LEAPER_CONFIG.collisionScaleX,
  collisionScaleY: LEAPER_CONFIG.collisionScaleY,
  init: initLeaper,
  update: updateLeaper,
  draw: drawLeaper,
};

export function isLeaperSheet(sheetIndex: number) {
  return sheetIndex === LEAPER_SHEET_INDEX && Boolean(ENEMY_SHEETS[LEAPER_SHEET_INDEX]);
}

export function canSpawnLeaper() {
  return leaperActiveCount() < LEAPER_CONFIG.maxActiveLeapers;
}
