import { state } from "../../game/state";
import { playSfx } from "../../game/audio";
import { ENEMY_SHEETS, RUNNER_SHEET_INDEX, RUNNER_SHEETS } from "../../constants";
import type { EnemyState, RunnerPhase } from "../../types/game-state";
import type { EnemyArchetype, EnemySpawnContext } from "./common";
import {
  drawEnemyFrame,
  enemyDrawScale,
  enemyCenterX,
  hasAwakenedGrowth,
  isEliteEnemy,
} from "./common";

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
  dashMinFrames: 42,
  dashFrameJitter: 11,
  awakenedDashFrameBonus: 5,
  eliteDashFrameBonus: 9,
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
  windupAnimSpeed: 5,
  defaultAnimSpeed: 7,
} as const;

const RUNNER_WARNING_SFX_PITCH = 1.08;
const RUNNER_DASH_SFX_PITCH = 1.08;

function isRunner(enemy: Pick<EnemyState, "sheetIndex">) {
  return enemy.sheetIndex === RUNNER_SHEET_INDEX;
}

function randomFrameCount(min: number, jitter: number) {
  return min + Math.floor(Math.random() * jitter);
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

function runnerDashFrames(enemy: EnemyState) {
  const bonus = isEliteEnemy(enemy)
    ? RUNNER_CONFIG.eliteDashFrameBonus
    : hasAwakenedGrowth(enemy)
      ? RUNNER_CONFIG.awakenedDashFrameBonus
      : 0;
  return randomFrameCount(RUNNER_CONFIG.dashMinFrames + bonus, RUNNER_CONFIG.dashFrameJitter);
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
        enemy.runnerFacing = lockedFacing;
        enemy.vx = lockedFacing * runnerDashSpeed(enemy);
        playSfx("enemyDash", RUNNER_DASH_SFX_PITCH);
      }
    }
  } else if (enemy.runnerPhase === "dash") {
    enemy.runnerTimer -= 1;
    enemy.vx = enemy.runnerFacing * runnerDashSpeed(enemy);
    if (enemy.runnerTimer <= 0) {
      enemy.runnerPhase = "recover";
      enemy.runnerTimer = runnerRecoverFrames(enemy);
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
