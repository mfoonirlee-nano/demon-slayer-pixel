import { ctx } from "../../rendering/context";
import { state } from "../../game/state";
import { playSfx } from "../../game/audio";
import { CRAWLER_SHEET_INDEX, CRAWLER_SHEETS, ENEMY_SHEETS, GRAVITY, GROUND_Y, WIDTH } from "../../constants";
import type { CrawlerPhase, EnemyState } from "../../types/game-state";
import { clamp, hitbox, lerp } from "../../game/utils";
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

const CRAWLER_CONFIG = {
  triggerDistance: 104,
  awakenedTriggerDistanceBonus: 48,
  finalTriggerDistanceBonus: 66,
  moveBaseSpeed: 1.22,
  moveRandomSpeed: 0.58,
  moveSpeedScaleByElapsed: 0.006,
  lungeBaseSpeed: 2.65,
  lungeSpeedScaleByElapsed: 0.006,
  lungeMaxSpeed: 3.35,
  awakenedLungeSpeedScale: 1.08,
  lungeDamageMultiplier: 1.45,
  lungeDamageBonus: 1,
  leapFrames: 32,
  finalLeapFrames: 28,
  leapArcHeight: 74,
  finalLeapArcHeight: 92,
  leapWindupTargetStep: 12,
  leapAirTargetStep: 2.4,
  finalLeapAirTargetStep: 3.2,
  leapMaxAirCorrection: 46,
  finalLeapMaxAirCorrection: 64,
  leapLandingClampMargin: 30,
  leapDamageMultiplier: 1.65,
  leapDamageBonus: 2,
  windupFrames: 14,
  lungeFrames: 28,
  awakenedLungeFrames: 18,
  recoverFrames: 22,
  awakenedRecoverFrames: 17,
  blockedRetryFrames: 2,
  hpMultiplier: 0.65,
  maxActiveLunges: 2,
  drawScale: 1,
  collisionScaleX: 1.45,
  collisionScaleY: 1.15,
  moveAnimSpeed: 6,
  leapSpinRotations: 2.35,
} as const;

const HALF_DIVISOR = 2;
const FULL_CIRCLE = Math.PI * 2;
const LUNGE_BOX_WIDTH_SCALE = 1.15;
const LUNGE_BOX_HEIGHT_SCALE = 1.08;
const LUNGE_BOX_REACH = 28;
const LUNGE_BOX_FORWARD_RATIO = 0.45;
const LUNGE_BOX_BACK_RATIO = 0.55;
const LUNGE_WARNING_SFX_PITCH = 0.92;
const LUNGE_START_SFX_PITCH = 0.88;
const LEAP_START_SFX_PITCH = 0.98;
const LEAP_HIT_ACTIVE_START = 0.12;
const LEAP_BOX_WIDTH_SCALE = 1.35;
const LEAP_BOX_HEIGHT_SCALE = 1.22;
const LEAP_BOX_WIDTH_PAD = 34;
const LANDING_WARNING_RADIUS_X = 52;
const LANDING_WARNING_RADIUS_Y = 7;
const LANDING_WARNING_Y_OFFSET = 3;
const LANDING_WARNING_WINDUP_ALPHA_BASE = 0.2;
const LANDING_WARNING_WINDUP_ALPHA_SCALE = 0.32;
const LANDING_WARNING_LEAP_ALPHA_BASE = 0.48;
const LANDING_WARNING_LEAP_ALPHA_SCALE = 0.16;
const LANDING_CRACK_LEFT_X = -34;
const LANDING_CRACK_RIGHT_X = 12;
const LANDING_CRACK_CENTER_X = -7;
const LANDING_CRACK_CENTER_Y = 3;
const LANDING_CRACK_W = 24;
const LANDING_CRACK_SHORT_W = 15;
const LANDING_CRACK_H = 2;
const SPIN_CUE_ALPHA = 0.32;
const SPIN_CUE_OUTER_RADIUS_X_SCALE = 0.24;
const SPIN_CUE_OUTER_RADIUS_Y_SCALE = 0.18;
const SPIN_CUE_INNER_RADIUS_X_SCALE = 0.18;
const SPIN_CUE_INNER_RADIUS_Y_SCALE = 0.12;
const SPIN_CUE_CENTER_Y_RATIO = 0.48;

function isCrawler(enemy: Pick<EnemyState, "sheetIndex">) {
  return enemy.sheetIndex === CRAWLER_SHEET_INDEX;
}

function playerCenterX() {
  return state.player.x + state.player.w / HALF_DIVISOR;
}

function crawlerFacing(enemy: EnemyState, toward: number) {
  if (toward === 0) return enemy.crawlerFacing ?? 1;
  return Math.sign(toward);
}

function crawlerMoveSpeed() {
  return CRAWLER_CONFIG.moveBaseSpeed
    + state.elapsed * CRAWLER_CONFIG.moveSpeedScaleByElapsed
    + Math.random() * CRAWLER_CONFIG.moveRandomSpeed;
}

function hasFinalGrowth(enemy: EnemyState) {
  return enemy.growthStage === "final";
}

function crawlerUsesLeap(enemy: EnemyState) {
  return hasAwakenedGrowth(enemy);
}

function crawlerTriggerDistance(enemy: EnemyState) {
  const growthBonus = hasFinalGrowth(enemy)
    ? CRAWLER_CONFIG.finalTriggerDistanceBonus
    : hasAwakenedGrowth(enemy)
      ? CRAWLER_CONFIG.awakenedTriggerDistanceBonus
      : 0;
  return CRAWLER_CONFIG.triggerDistance
    + growthBonus;
}

function crawlerLungeSpeed(enemy: EnemyState) {
  const speed = Math.min(
    CRAWLER_CONFIG.lungeMaxSpeed,
    CRAWLER_CONFIG.lungeBaseSpeed + state.elapsed * CRAWLER_CONFIG.lungeSpeedScaleByElapsed,
  );
  return hasAwakenedGrowth(enemy) ? speed * CRAWLER_CONFIG.awakenedLungeSpeedScale : speed;
}

function crawlerActiveLungeCount() {
  let count = 0;
  for (const enemy of state.enemies) {
    if (isCrawler(enemy) && (enemy.crawlerPhase === "lunge" || enemy.crawlerPhase === "leap")) count += 1;
  }
  return count;
}

function crawlerSheetForPhase(phase: CrawlerPhase) {
  return CRAWLER_SHEETS[phase] || CRAWLER_SHEETS.move;
}

function crawlerLungeFrames(enemy: EnemyState) {
  return hasAwakenedGrowth(enemy) ? CRAWLER_CONFIG.awakenedLungeFrames : CRAWLER_CONFIG.lungeFrames;
}

function crawlerLeapFrames(enemy: EnemyState) {
  return hasFinalGrowth(enemy) ? CRAWLER_CONFIG.finalLeapFrames : CRAWLER_CONFIG.leapFrames;
}

function crawlerLeapArcHeight(enemy: EnemyState) {
  return hasFinalGrowth(enemy) ? CRAWLER_CONFIG.finalLeapArcHeight : CRAWLER_CONFIG.leapArcHeight;
}

function crawlerLeapAirTargetStep(enemy: EnemyState) {
  return hasFinalGrowth(enemy) ? CRAWLER_CONFIG.finalLeapAirTargetStep : CRAWLER_CONFIG.leapAirTargetStep;
}

function crawlerLeapMaxAirCorrection(enemy: EnemyState) {
  return hasFinalGrowth(enemy) ? CRAWLER_CONFIG.finalLeapMaxAirCorrection : CRAWLER_CONFIG.leapMaxAirCorrection;
}

function crawlerRecoverFrames(enemy: EnemyState) {
  return hasAwakenedGrowth(enemy) ? CRAWLER_CONFIG.awakenedRecoverFrames : CRAWLER_CONFIG.recoverFrames;
}

function crawlerPhaseDuration(enemy: EnemyState, phase: CrawlerPhase) {
  if (phase === "windup") return CRAWLER_CONFIG.windupFrames;
  if (phase === "lunge") return crawlerLungeFrames(enemy);
  if (phase === "leap") return crawlerLeapFrames(enemy);
  if (phase === "recover") return crawlerRecoverFrames(enemy);
  return 1;
}

function crawlerPhaseProgress(enemy: EnemyState, phase: CrawlerPhase) {
  const duration = crawlerPhaseDuration(enemy, phase);
  return clamp((duration - (enemy.crawlerTimer ?? 0)) / duration, 0, 1);
}

function crawlerPhaseFrame(enemy: EnemyState, phase: CrawlerPhase) {
  const sheet = crawlerSheetForPhase(phase);
  const duration = crawlerPhaseDuration(enemy, phase);
  const elapsed = Math.max(0, duration - (enemy.crawlerTimer ?? 0));
  return Math.min(sheet.count - 1, Math.floor(elapsed * sheet.count / duration));
}

function clearCrawlerLeapState(enemy: EnemyState) {
  enemy.crawlerLeapStartX = undefined;
  enemy.crawlerLeapStartY = undefined;
  enemy.crawlerLeapTargetX = undefined;
  enemy.crawlerLeapTargetY = undefined;
  enemy.crawlerLeapBaseTargetX = undefined;
}

function crawlerLandingLeft(enemy: EnemyState) {
  return clamp(
    playerCenterX() - enemy.w / HALF_DIVISOR,
    -CRAWLER_CONFIG.leapLandingClampMargin,
    WIDTH + CRAWLER_CONFIG.leapLandingClampMargin - enemy.w,
  );
}

function crawlerLandingTop(enemy: EnemyState) {
  return (enemy.onPlatform?.y ?? GROUND_Y) - enemy.h;
}

function seedCrawlerLeapTarget(enemy: EnemyState) {
  enemy.crawlerLeapTargetX ??= crawlerLandingLeft(enemy);
  enemy.crawlerLeapTargetY ??= crawlerLandingTop(enemy);
}

function updateCrawlerLeapTarget(enemy: EnemyState, step: number, maxCorrection = Number.POSITIVE_INFINITY) {
  seedCrawlerLeapTarget(enemy);
  const current = enemy.crawlerLeapTargetX ?? crawlerLandingLeft(enemy);
  const desired = crawlerLandingLeft(enemy);
  const base = enemy.crawlerLeapBaseTargetX ?? current;
  const stepped = current + clamp(desired - current, -step, step);
  const corrected = Number.isFinite(maxCorrection)
    ? clamp(stepped, base - maxCorrection, base + maxCorrection)
    : stepped;
  enemy.crawlerLeapTargetX = clamp(
    corrected,
    -CRAWLER_CONFIG.leapLandingClampMargin,
    WIDTH + CRAWLER_CONFIG.leapLandingClampMargin - enemy.w,
  );
}

function enterCrawlerPhase(enemy: EnemyState, phase: CrawlerPhase) {
  enemy.crawlerPhase = phase;
  enemy.crawlerLungeHit = false;
  if (phase === "windup") {
    enemy.crawlerTimer = CRAWLER_CONFIG.windupFrames;
    if (crawlerUsesLeap(enemy)) {
      seedCrawlerLeapTarget(enemy);
    } else {
      clearCrawlerLeapState(enemy);
    }
    playSfx("enemyWarning", LUNGE_WARNING_SFX_PITCH);
  } else if (phase === "lunge") {
    enemy.crawlerTimer = crawlerLungeFrames(enemy);
    clearCrawlerLeapState(enemy);
    playSfx("enemyLunge", LUNGE_START_SFX_PITCH);
  } else if (phase === "leap") {
    seedCrawlerLeapTarget(enemy);
    enemy.crawlerTimer = crawlerLeapFrames(enemy);
    enemy.crawlerLeapStartX = enemy.x;
    enemy.crawlerLeapStartY = enemy.y;
    enemy.crawlerLeapBaseTargetX = enemy.crawlerLeapTargetX;
    enemy.vy = -GRAVITY;
    enemy.onPlatform = null;
    playSfx("enemyLeap", LEAP_START_SFX_PITCH);
  } else if (phase === "recover") {
    enemy.crawlerTimer = crawlerRecoverFrames(enemy);
    clearCrawlerLeapState(enemy);
  } else {
    enemy.crawlerTimer = 0;
    clearCrawlerLeapState(enemy);
  }
}

function crawlerLungeBox(enemy: EnemyState) {
  const facing = enemy.crawlerFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const w = Math.round(enemy.w * LUNGE_BOX_WIDTH_SCALE + LUNGE_BOX_REACH);
  const h = Math.round(enemy.h * LUNGE_BOX_HEIGHT_SCALE);
  return {
    x: facing === 1
      ? enemy.x + enemy.w * LUNGE_BOX_FORWARD_RATIO
      : enemy.x + enemy.w * LUNGE_BOX_BACK_RATIO - w,
    y: enemyFeetY(enemy) - h,
    w,
    h,
  };
}

function triggerCrawlerLungeHit(enemy: EnemyState) {
  const box = crawlerLungeBox(enemy);
  if (!hitbox(box, state.player)) return;
  enemy.crawlerLungeHit = true;
  const facing = enemy.crawlerFacing ?? (enemy.vx >= 0 ? 1 : -1);
  hurtPlayer(enemy.damage * CRAWLER_CONFIG.lungeDamageMultiplier + CRAWLER_CONFIG.lungeDamageBonus, facing);
}

function crawlerLeapBox(enemy: EnemyState) {
  const w = Math.round(enemy.w * LEAP_BOX_WIDTH_SCALE + LEAP_BOX_WIDTH_PAD);
  const h = Math.round(enemy.h * LEAP_BOX_HEIGHT_SCALE);
  return {
    x: enemyCenterX(enemy) - w / HALF_DIVISOR,
    y: enemyFeetY(enemy) - h,
    w,
    h,
  };
}

function triggerCrawlerLeapHit(enemy: EnemyState) {
  const box = crawlerLeapBox(enemy);
  if (!hitbox(box, state.player)) return;
  enemy.crawlerLungeHit = true;
  const facing = enemy.crawlerFacing ?? (enemy.vx >= 0 ? 1 : -1);
  hurtPlayer(enemy.damage * CRAWLER_CONFIG.leapDamageMultiplier + CRAWLER_CONFIG.leapDamageBonus, facing);
}

function initCrawler(enemy: EnemyState, context: EnemySpawnContext) {
  enemy.crawlerPhase = "move";
  enemy.crawlerTimer = 0;
  enemy.crawlerFacing = -context.side;
  enemy.crawlerBaseSpeed = Math.max(
    CRAWLER_CONFIG.moveBaseSpeed,
    context.speed - state.elapsed * CRAWLER_CONFIG.moveSpeedScaleByElapsed,
  );
  enemy.crawlerLungeHit = false;
  clearCrawlerLeapState(enemy);
}

function updateCrawler(enemy: EnemyState) {
  enemy.crawlerPhase ??= "move";
  enemy.crawlerTimer ??= 0;
  enemy.crawlerFacing ??= enemy.vx >= 0 ? 1 : -1;
  enemy.crawlerBaseSpeed ??= CRAWLER_CONFIG.moveBaseSpeed;
  enemy.crawlerLungeHit ??= false;

  const toward = playerCenterX() - enemyCenterX(enemy);
  const facing = crawlerFacing(enemy, toward);
  const phase = enemy.crawlerPhase;
  let moveByVelocity = true;

  if (phase === "move") {
    enemy.crawlerFacing = facing;
    enemy.vx = facing * (
      (enemy.crawlerBaseSpeed ?? CRAWLER_CONFIG.moveBaseSpeed)
      + state.elapsed * CRAWLER_CONFIG.moveSpeedScaleByElapsed
    );
    if (Math.abs(toward) <= crawlerTriggerDistance(enemy)) {
      enterCrawlerPhase(enemy, "windup");
      enemy.vx = 0;
    }
  } else if (phase === "windup") {
    enemy.crawlerTimer -= 1;
    enemy.vx = 0;
    if (crawlerUsesLeap(enemy)) updateCrawlerLeapTarget(enemy, CRAWLER_CONFIG.leapWindupTargetStep);
    if (enemy.crawlerTimer <= 0) {
      if (crawlerActiveLungeCount() >= CRAWLER_CONFIG.maxActiveLunges) {
        enemy.crawlerTimer = CRAWLER_CONFIG.blockedRetryFrames;
      } else if (crawlerUsesLeap(enemy)) {
        enterCrawlerPhase(enemy, "leap");
      } else {
        enterCrawlerPhase(enemy, "lunge");
        enemy.vx = (enemy.crawlerFacing ?? facing) * crawlerLungeSpeed(enemy);
      }
    }
  } else if (phase === "lunge") {
    enemy.crawlerTimer -= 1;
    enemy.vx = (enemy.crawlerFacing ?? facing) * crawlerLungeSpeed(enemy);
    if (!enemy.crawlerLungeHit) triggerCrawlerLungeHit(enemy);
    if (enemy.crawlerTimer <= 0) {
      enterCrawlerPhase(enemy, "recover");
      enemy.vx = 0;
    }
  } else if (phase === "leap") {
    updateCrawlerLeapTarget(
      enemy,
      crawlerLeapAirTargetStep(enemy),
      crawlerLeapMaxAirCorrection(enemy),
    );
    const duration = crawlerLeapFrames(enemy);
    const elapsed = duration - enemy.crawlerTimer;
    const progress = clamp(elapsed / duration, 0, 1);
    const startX = enemy.crawlerLeapStartX ?? enemy.x;
    const startY = enemy.crawlerLeapStartY ?? enemy.y;
    const targetX = enemy.crawlerLeapTargetX ?? enemy.x;
    const targetY = enemy.crawlerLeapTargetY ?? crawlerLandingTop(enemy);
    const targetToward = targetX + enemy.w / HALF_DIVISOR - enemyCenterX(enemy);

    enemy.crawlerFacing = crawlerFacing(enemy, targetToward);
    enemy.vx = (targetX - startX) / duration;
    enemy.x = lerp(startX, targetX, progress);
    enemy.y = lerp(startY, targetY, progress) - Math.sin(progress * Math.PI) * crawlerLeapArcHeight(enemy);
    if (!enemy.crawlerLungeHit && progress >= LEAP_HIT_ACTIVE_START) triggerCrawlerLeapHit(enemy);
    enemy.crawlerTimer -= 1;
    if (enemy.crawlerTimer <= 0) {
      enemy.x = targetX;
      enemy.y = targetY;
      if (!enemy.crawlerLungeHit) triggerCrawlerLeapHit(enemy);
      enterCrawlerPhase(enemy, "recover");
      enemy.vx = 0;
    }
    moveByVelocity = false;
  } else {
    enemy.crawlerTimer -= 1;
    enemy.vx = 0;
    if (enemy.crawlerTimer <= 0) {
      enterCrawlerPhase(enemy, "move");
    }
  }

  if (moveByVelocity) enemy.x += enemy.vx;
}

function drawCrawlerLandingWarning(enemy: EnemyState, phase: CrawlerPhase) {
  if (!ctx || !crawlerUsesLeap(enemy) || enemy.crawlerLeapTargetX === undefined) return;
  if (phase !== "windup" && phase !== "leap") return;

  const progress = crawlerPhaseProgress(enemy, phase);
  const alpha = phase === "windup"
    ? LANDING_WARNING_WINDUP_ALPHA_BASE + progress * LANDING_WARNING_WINDUP_ALPHA_SCALE
    : LANDING_WARNING_LEAP_ALPHA_BASE - progress * LANDING_WARNING_LEAP_ALPHA_SCALE;
  const x = enemy.crawlerLeapTargetX + enemy.w / HALF_DIVISOR;
  const y = (enemy.crawlerLeapTargetY ?? crawlerLandingTop(enemy)) + enemy.h - LANDING_WARNING_Y_OFFSET;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(158, 36, 46, 1)";
  ctx.fillStyle = "rgba(93, 24, 31, 1)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, LANDING_WARNING_RADIUS_X, LANDING_WARNING_RADIUS_Y, 0, 0, FULL_CIRCLE);
  ctx.stroke();
  ctx.fillRect(x + LANDING_CRACK_LEFT_X, y - 1, LANDING_CRACK_W, LANDING_CRACK_H);
  ctx.fillRect(x + LANDING_CRACK_RIGHT_X, y - LANDING_CRACK_H, LANDING_CRACK_W, LANDING_CRACK_H);
  ctx.fillRect(
    x + LANDING_CRACK_CENTER_X,
    y + LANDING_CRACK_CENTER_Y,
    LANDING_CRACK_SHORT_W,
    LANDING_CRACK_H,
  );
  ctx.restore();
}

function drawCrawlerSpinCue(centerX: number, centerY: number, drawW: number, drawH: number, progress: number) {
  if (!ctx) return;

  ctx.save();
  ctx.globalAlpha = SPIN_CUE_ALPHA;
  ctx.strokeStyle = "rgba(214, 72, 78, 0.9)";
  ctx.lineWidth = 2;
  ctx.translate(centerX, centerY);
  ctx.rotate(progress * FULL_CIRCLE * CRAWLER_CONFIG.leapSpinRotations);
  ctx.beginPath();
  ctx.ellipse(
    0,
    0,
    drawW * SPIN_CUE_OUTER_RADIUS_X_SCALE,
    drawH * SPIN_CUE_OUTER_RADIUS_Y_SCALE,
    0,
    0,
    FULL_CIRCLE,
  );
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(
    0,
    0,
    drawW * SPIN_CUE_INNER_RADIUS_X_SCALE,
    drawH * SPIN_CUE_INNER_RADIUS_Y_SCALE,
    0,
    0,
    FULL_CIRCLE,
  );
  ctx.stroke();
  ctx.restore();
}

function drawCrawler(enemy: EnemyState) {
  const phase = enemy.crawlerPhase ?? "move";
  const sheet = crawlerSheetForPhase(phase);
  const facing = enemy.crawlerFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const drawScale = enemyDrawScale(CRAWLER_ARCHETYPE);

  drawCrawlerLandingWarning(enemy, phase);

  if (phase === "move") {
    drawEnemyFrame(enemy, sheet, drawScale, CRAWLER_CONFIG.moveAnimSpeed, state.elapsed, facing);
    return;
  }

  const frame = crawlerPhaseFrame(enemy, phase);
  const drawW = Math.round(sheet.frameW * drawScale);
  const drawH = Math.round(sheet.frameH * drawScale);
  const centerX = enemyCenterX(enemy);
  const feetY = enemyFeetY(enemy);
  const progress = crawlerPhaseProgress(enemy, phase);
  const rotation = phase === "leap"
    ? progress * FULL_CIRCLE * CRAWLER_CONFIG.leapSpinRotations
    : 0;

  if (phase === "leap") {
    drawCrawlerSpinCue(centerX, enemy.y + enemy.h * SPIN_CUE_CENTER_Y_RATIO, drawW, drawH, progress);
  }
  drawEnemySheetFrame(
    enemy,
    sheet,
    frame,
    centerX - drawW / HALF_DIVISOR,
    feetY - drawH,
    drawW,
    drawH,
    facing,
    rotation,
  );
}

export const CRAWLER_ARCHETYPE: EnemyArchetype = {
  speed: crawlerMoveSpeed,
  hpMultiplier: CRAWLER_CONFIG.hpMultiplier,
  drawScale: CRAWLER_CONFIG.drawScale,
  collisionScaleX: CRAWLER_CONFIG.collisionScaleX,
  collisionScaleY: CRAWLER_CONFIG.collisionScaleY,
  init: initCrawler,
  update: updateCrawler,
  draw: drawCrawler,
  contactDamageDisabled: (enemy) => enemy.crawlerPhase === "leap",
};

export function isCrawlerSheet(sheetIndex: number) {
  return sheetIndex === CRAWLER_SHEET_INDEX && Boolean(ENEMY_SHEETS[CRAWLER_SHEET_INDEX]);
}
