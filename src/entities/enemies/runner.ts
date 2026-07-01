import { state } from "../../game/state";
import { playSfx } from "../../game/audio";
import { ENEMY_SHEETS, GROUND_Y, RUNNER_SHEET_INDEX, RUNNER_SHEETS } from "../../constants";
import type { EnemyState, RunnerPhase } from "../../types/game-state";
import type { EnemyArchetype, EnemySpawnContext } from "./common";
import {
  drawEnemyFrame,
  drawEnemySheetFrame,
  enemyDrawScale,
  enemyCenterX,
  enemyFeetY,
  hasAwakenedGrowth,
  isEliteEnemy,
} from "./common";

const HALF_DIVISOR = 2;

const RUNNER_CONFIG = {
  triggerDistance: 250,
  approachBaseSpeed: 1.1,
  approachRandomSpeed: 0.35,
  approachSpeedScaleByElapsed: 0.006,
  dashBaseSpeed: 4.1,
  dashSpeedScaleByElapsed: 0.008,
  dashMaxSpeed: 5.2,
  windupMinFrames: 14,
  windupFrameJitter: 5,
  dashNormalMinBodyWidths: 3,
  dashNormalMaxBodyWidths: 4,
  dashAwakenedMinBodyWidths: 6,
  dashAwakenedMaxBodyWidths: 7,
  eliteDashSpeedScale: 1.12,
  recoverFrames: 24,
  awakenedRecoverFrames: 18,
  eliteRecoverFrames: 16,
  awakenedRecoverChaseScale: 0.28,
  eliteRecoverChaseScale: 0.42,
  hpMultiplier: 0.75,
  maxActiveDashes: 1,
  drawScale: 1.2,
  dashDrawScaleMultiplier: 1.12,
  dashAnimSpeed: 3,
  dashHoldFrame: 3,
  dashLandingFrame: 4,
  dashLandingFrames: 3,
  windupAnimSpeed: 5,
  defaultAnimSpeed: 7,
} as const;

const RUNNER_WARNING_SFX_PITCH = 1.08;
const RUNNER_DASH_SFX_PITCH = 1.08;
const RUNNER_GROUND_CONTACT_EPSILON = 0.1;

function isRunner(enemy: Pick<EnemyState, "sheetIndex">) {
  return enemy.sheetIndex === RUNNER_SHEET_INDEX;
}

function randomFrameCount(min: number, jitter: number) {
  return min + Math.floor(Math.random() * jitter);
}

function randomFrameCountBetween(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function runnerFacing(enemy: EnemyState, toward: number) {
  if (toward === 0) return enemy.runnerFacing ?? 1;
  return Math.sign(toward);
}

function runnerApproachBaseSpeed() {
  return RUNNER_CONFIG.approachBaseSpeed + Math.random() * RUNNER_CONFIG.approachRandomSpeed;
}

function runnerDashSpeed(enemy: EnemyState) {
  const speed = Math.min(
    RUNNER_CONFIG.dashMaxSpeed,
    RUNNER_CONFIG.dashBaseSpeed + state.elapsed * RUNNER_CONFIG.dashSpeedScaleByElapsed,
  );
  return isEliteEnemy(enemy) ? speed * RUNNER_CONFIG.eliteDashSpeedScale : speed;
}

function runnerWindupFrames(enemy: EnemyState) {
  const extraFrames = isEliteEnemy(enemy) ? RUNNER_CONFIG.windupFrameJitter : 0;
  return randomFrameCount(RUNNER_CONFIG.windupMinFrames + extraFrames, RUNNER_CONFIG.windupFrameJitter);
}

function runnerDashBodyWidthRange(enemy: EnemyState) {
  return hasAwakenedGrowth(enemy)
    ? {
        min: RUNNER_CONFIG.dashAwakenedMinBodyWidths,
        max: RUNNER_CONFIG.dashAwakenedMaxBodyWidths,
      }
    : {
        min: RUNNER_CONFIG.dashNormalMinBodyWidths,
        max: RUNNER_CONFIG.dashNormalMaxBodyWidths,
      };
}

function runnerVisualBodyWidth() {
  return RUNNER_SHEETS.approach.frameW * enemyDrawScale(RUNNER_ARCHETYPE);
}

function runnerDashFrames(enemy: EnemyState) {
  const bodyWidths = runnerDashBodyWidthRange(enemy);
  const speed = runnerDashSpeed(enemy);
  const bodyWidth = runnerVisualBodyWidth();
  const minFrames = Math.ceil(bodyWidth * bodyWidths.min / speed);
  const maxFrames = Math.floor(bodyWidth * bodyWidths.max / speed);
  return randomFrameCountBetween(minFrames, Math.max(minFrames, maxFrames));
}

function runnerRecoverFrames(enemy: EnemyState) {
  if (isEliteEnemy(enemy)) return RUNNER_CONFIG.eliteRecoverFrames;
  if (hasAwakenedGrowth(enemy)) return RUNNER_CONFIG.awakenedRecoverFrames;
  return RUNNER_CONFIG.recoverFrames;
}

function runnerRecoverChaseScale(enemy: EnemyState) {
  if (isEliteEnemy(enemy)) return RUNNER_CONFIG.eliteRecoverChaseScale;
  if (hasAwakenedGrowth(enemy)) return RUNNER_CONFIG.awakenedRecoverChaseScale;
  return 0;
}

function runnerDashCount() {
  let count = 0;
  for (const enemy of state.enemies) {
    if (isRunner(enemy) && enemy.runnerPhase === "dash") count += 1;
  }
  return count;
}

function runnerSheetForPhase(phase: RunnerPhase) {
  return RUNNER_SHEETS[phase] || RUNNER_SHEETS.approach;
}

function runnerGrounded(enemy: EnemyState) {
  return enemy.onPlatform !== null || enemyFeetY(enemy) >= GROUND_Y - RUNNER_GROUND_CONTACT_EPSILON;
}

function holdRunnerDashFrame(enemy: EnemyState) {
  const holdFrameElapsed = RUNNER_CONFIG.dashHoldFrame * RUNNER_CONFIG.dashAnimSpeed;
  enemy.runnerDashElapsed = Math.max(enemy.runnerDashElapsed ?? 0, holdFrameElapsed);
}

function startRunnerDashLanding(enemy: EnemyState) {
  holdRunnerDashFrame(enemy);
  enemy.runnerTimer = 0;
  enemy.runnerDashLandingTimer = RUNNER_CONFIG.dashLandingFrames;
  enemy.vx = 0;
}

function enterRunnerRecover(enemy: EnemyState) {
  enemy.runnerPhase = "recover";
  enemy.runnerTimer = runnerRecoverFrames(enemy);
  enemy.runnerDashElapsed = 0;
  enemy.runnerDashLandingTimer = 0;
  enemy.vx = 0;
}

export function runnerDashAnimationFrame(dashElapsedFrames: number, landingFrameActive = false) {
  if (landingFrameActive) return RUNNER_CONFIG.dashLandingFrame;
  return Math.min(
    RUNNER_CONFIG.dashHoldFrame,
    Math.floor(dashElapsedFrames / RUNNER_CONFIG.dashAnimSpeed),
  );
}

function initRunner(enemy: EnemyState, context: EnemySpawnContext) {
  enemy.runnerPhase = "approach";
  enemy.runnerTimer = 0;
  enemy.runnerFacing = -context.side;
  enemy.runnerApproachSpeed = Math.max(
    RUNNER_CONFIG.approachBaseSpeed,
    context.speed - state.elapsed * RUNNER_CONFIG.approachSpeedScaleByElapsed,
  );
}

function updateRunner(enemy: EnemyState) {
  enemy.runnerPhase ??= "approach";
  enemy.runnerTimer ??= 0;
  enemy.runnerFacing ??= enemy.vx >= 0 ? 1 : -1;

  const toward = state.player.x + state.player.w / 2 - enemyCenterX(enemy);
  const facing = runnerFacing(enemy, toward);

  if (enemy.runnerPhase === "approach") {
    enemy.runnerFacing = facing;
    enemy.vx = facing * (
      (enemy.runnerApproachSpeed ?? RUNNER_CONFIG.approachBaseSpeed)
      + state.elapsed * RUNNER_CONFIG.approachSpeedScaleByElapsed
    );
    if (Math.abs(toward) <= RUNNER_CONFIG.triggerDistance) {
      enemy.runnerPhase = "windup";
      enemy.runnerTimer = runnerWindupFrames(enemy);
      enemy.runnerFacing = facing;
      enemy.vx = 0;
      playSfx("enemyWarning", RUNNER_WARNING_SFX_PITCH);
    }
  } else if (enemy.runnerPhase === "windup") {
    const lockedFacing = enemy.runnerFacing ?? facing;
    enemy.runnerTimer -= 1;
    enemy.vx = 0;
    if (enemy.runnerTimer <= 0) {
      if (runnerDashCount() >= RUNNER_CONFIG.maxActiveDashes) {
        enemy.runnerTimer = 1;
      } else {
        enemy.runnerPhase = "dash";
        enemy.runnerTimer = runnerDashFrames(enemy);
        enemy.runnerDashElapsed = 0;
        enemy.runnerDashLandingTimer = 0;
        enemy.runnerFacing = lockedFacing;
        enemy.vx = lockedFacing * runnerDashSpeed(enemy);
        playSfx("enemyDash", RUNNER_DASH_SFX_PITCH);
      }
    }
  } else if (enemy.runnerPhase === "dash") {
    const landingTimer = enemy.runnerDashLandingTimer ?? 0;

    if (landingTimer > 0) {
      enemy.runnerDashLandingTimer = landingTimer - 1;
      enemy.vx = 0;
      if (enemy.runnerDashLandingTimer <= 0) enterRunnerRecover(enemy);
    } else if (enemy.runnerTimer > 0) {
      enemy.runnerDashElapsed = (enemy.runnerDashElapsed ?? 0) + 1;
      enemy.runnerTimer -= 1;
      enemy.vx = enemy.runnerFacing * runnerDashSpeed(enemy);
      if (enemy.runnerTimer <= 0) {
        if (runnerGrounded(enemy)) {
          startRunnerDashLanding(enemy);
        } else {
          holdRunnerDashFrame(enemy);
          enemy.vx = 0;
        }
      }
    } else if (runnerGrounded(enemy)) {
      startRunnerDashLanding(enemy);
    } else {
      holdRunnerDashFrame(enemy);
      enemy.vx = 0;
    }
  } else {
    enemy.runnerTimer -= 1;
    enemy.vx = (enemy.runnerFacing ?? facing)
      * (enemy.runnerApproachSpeed ?? RUNNER_CONFIG.approachBaseSpeed)
      * runnerRecoverChaseScale(enemy);
    if (enemy.runnerTimer <= 0) {
      enemy.runnerPhase = "approach";
    }
  }

  enemy.x += enemy.vx;
}

function drawRunner(enemy: EnemyState) {
  const phase = enemy.runnerPhase ?? "approach";
  const sheet = runnerSheetForPhase(phase);
  const animSpeed = phase === "dash"
    ? RUNNER_CONFIG.dashAnimSpeed
    : phase === "windup"
      ? RUNNER_CONFIG.windupAnimSpeed
      : RUNNER_CONFIG.defaultAnimSpeed;
  const facing = enemy.runnerFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const drawScale = enemyDrawScale(RUNNER_ARCHETYPE) * (
    phase === "dash" ? RUNNER_CONFIG.dashDrawScaleMultiplier : 1
  );
  if (phase === "dash") {
    const frame = runnerDashAnimationFrame(
      enemy.runnerDashElapsed ?? 0,
      (enemy.runnerDashLandingTimer ?? 0) > 0,
    );
    const drawW = Math.round(sheet.frameW * drawScale);
    const drawH = Math.round(sheet.frameH * drawScale);
    const centerX = enemyCenterX(enemy);
    const feetY = enemyFeetY(enemy);
    drawEnemySheetFrame(
      enemy,
      sheet,
      frame,
      centerX - drawW / HALF_DIVISOR,
      feetY - drawH,
      drawW,
      drawH,
      facing,
    );
    return;
  }

  drawEnemyFrame(enemy, sheet, drawScale, animSpeed, state.elapsed, facing);
}

export const RUNNER_ARCHETYPE: EnemyArchetype = {
  speed: () => runnerApproachBaseSpeed() + state.elapsed * RUNNER_CONFIG.approachSpeedScaleByElapsed,
  hpMultiplier: RUNNER_CONFIG.hpMultiplier,
  drawScale: RUNNER_CONFIG.drawScale,
  init: initRunner,
  update: updateRunner,
  draw: drawRunner,
};

export function isRunnerSheet(sheetIndex: number) {
  return sheetIndex === RUNNER_SHEET_INDEX && Boolean(ENEMY_SHEETS[RUNNER_SHEET_INDEX]);
}
