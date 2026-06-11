import { state } from "../../state";
import { playSfx } from "../../audio";
import { ENEMY_SHEETS, RUNNER_SHEET_INDEX, RUNNER_SHEETS } from "../../constants";
import type { EnemyState, RunnerPhase } from "../../types/game-state";
import { ctx } from "../../context";
import type { EnemyArchetype, EnemySpawnContext } from "./common";
import { drawEnemyFrame, enemyDrawScale, enemyCenterX, enemyFeetY } from "./common";

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
  recoverFrames: 24,
  hpMultiplier: 0.75,
  maxActiveDashes: 2,
  drawScale: 1.2,
  dashDrawScaleMultiplier: 1.12,
  dashAnimSpeed: 3,
  windupAnimSpeed: 5,
  defaultAnimSpeed: 7,
} as const;

const RUNNER_DUST_LIFE_WIDTH = 28;
const RUNNER_DASH_DUST_Y_OFFSET = 8;
const RUNNER_DASH_DUST_HEIGHT = 4;
const RUNNER_DASH_DUST_DETAIL_X_OFFSET = 8;
const RUNNER_DASH_DUST_DETAIL_Y_OFFSET = 15;
const RUNNER_DASH_DUST_DETAIL_WIDTH = 12;
const RUNNER_DASH_DUST_DETAIL_HEIGHT = 3;
const RUNNER_RECOVER_DUST_LEAD_OFFSET = 10;
const RUNNER_RECOVER_DUST_BACK_OFFSET = 18;
const RUNNER_RECOVER_DUST_Y_OFFSET = 7;
const RUNNER_RECOVER_DUST_WIDTH = 20;
const RUNNER_RECOVER_DUST_HEIGHT = 3;

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

function runnerDashSpeed() {
  return Math.min(
    RUNNER_CONFIG.dashMaxSpeed,
    RUNNER_CONFIG.dashBaseSpeed + state.elapsed * RUNNER_CONFIG.dashSpeedScaleByElapsed,
  );
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
      enemy.runnerTimer = randomFrameCount(RUNNER_CONFIG.windupMinFrames, RUNNER_CONFIG.windupFrameJitter);
      enemy.vx = 0;
      playSfx("enemyWarning", 1.08);
    }
  } else if (enemy.runnerPhase === "windup") {
    enemy.runnerFacing = facing;
    enemy.runnerTimer -= 1;
    enemy.vx = 0;
    if (enemy.runnerTimer <= 0) {
      if (runnerDashCount() >= RUNNER_CONFIG.maxActiveDashes) {
        enemy.runnerTimer = 1;
      } else {
        enemy.runnerPhase = "dash";
        enemy.runnerTimer = randomFrameCount(RUNNER_CONFIG.dashMinFrames, RUNNER_CONFIG.dashFrameJitter);
        enemy.runnerFacing = facing;
        enemy.vx = facing * runnerDashSpeed();
        playSfx("enemyDash", 1.08);
      }
    }
  } else if (enemy.runnerPhase === "dash") {
    enemy.runnerTimer -= 1;
    enemy.vx = enemy.runnerFacing * runnerDashSpeed();
    if (enemy.runnerTimer <= 0) {
      enemy.runnerPhase = "recover";
      enemy.runnerTimer = RUNNER_CONFIG.recoverFrames;
      enemy.vx = 0;
    }
  } else {
    enemy.runnerTimer -= 1;
    enemy.vx = 0;
    if (enemy.runnerTimer <= 0) {
      enemy.runnerPhase = "approach";
    }
  }

  enemy.x += enemy.vx;
}

function drawRunnerDust(enemy: EnemyState, phase: RunnerPhase, facing: number) {
  if (!ctx) return;
  const feetY = enemyFeetY(enemy);

  if (phase === "dash") {
    const dustX = facing === 1 ? enemy.x - RUNNER_DUST_LIFE_WIDTH : enemy.x + enemy.w;
    ctx.fillStyle = "rgba(190, 122, 74, 0.46)";
    ctx.fillRect(dustX, feetY - RUNNER_DASH_DUST_Y_OFFSET, RUNNER_DUST_LIFE_WIDTH, RUNNER_DASH_DUST_HEIGHT);
    ctx.fillRect(
      dustX + (facing === 1 ? RUNNER_DASH_DUST_DETAIL_X_OFFSET : -RUNNER_DASH_DUST_DETAIL_X_OFFSET),
      feetY - RUNNER_DASH_DUST_DETAIL_Y_OFFSET,
      RUNNER_DASH_DUST_DETAIL_WIDTH,
      RUNNER_DASH_DUST_DETAIL_HEIGHT,
    );
    return;
  }

  if (phase === "recover") {
    const dustX = facing === 1
      ? enemy.x - RUNNER_RECOVER_DUST_LEAD_OFFSET
      : enemy.x + enemy.w - RUNNER_RECOVER_DUST_BACK_OFFSET;
    ctx.fillStyle = "rgba(190, 122, 74, 0.34)";
    ctx.fillRect(dustX, feetY - RUNNER_RECOVER_DUST_Y_OFFSET, RUNNER_RECOVER_DUST_WIDTH, RUNNER_RECOVER_DUST_HEIGHT);
  }
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
  drawRunnerDust(enemy, phase, facing);
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
