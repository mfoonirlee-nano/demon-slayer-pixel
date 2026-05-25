import { state } from "../../state";
import { CASTER_SHEET_INDEX, CASTER_SHEETS, ENEMY_SHEETS } from "../../constants";
import { drawSheetFrame } from "../../graphics";
import type { CasterAiPhase, CasterPhase, EnemyState } from "../../types/game-state";
import { frameIndex } from "../../utils";
import type { EnemyArchetype, EnemySpawnContext } from "./common";
import { drawEnemyFrame, enemyCenterX, enemyDrawScale, enemyFeetY } from "./common";

const CASTER_CONFIG = {
  minRange: 220,
  maxRange: 280,
  preferredRange: 250,
  rangeSlack: 16,
  seekBaseSpeed: 0.48,
  seekRandomSpeed: 0.32,
  seekSpeedScale: 0.03,
  repositionScale: 0.42,
  retreatScale: 1.25,
  windupFrames: 36,
  castFrames: 28,
  recoverFrames: 34,
  castSpawnFrame: 14,
  seekCooldownMinFrames: 44,
  seekCooldownJitterFrames: 28,
  blockedRetryFrames: 12,
  maxActiveWisps: 2,
  drawScale: 1,
  moveAnimSpeed: 9,
  windupFrameDuration: 9,
  castFrameDuration: 7,
  recoverFrameDuration: 11,
  wispCollisionW: 24,
  wispCollisionH: 22,
  wispLifeFrames: 210,
  wispBaseSpeed: 1.85,
  wispSpeedScale: 0.09,
  wispMaxSpeed: 2.85,
  wispBaseTurnRate: 0.014,
  wispTurnRateScale: 0.006,
  wispMaxTurnRate: 0.052,
  wispSpreadRadians: 0.16,
} as const;

const SECONDS_PER_MINUTE = 60;
const HALF_DIVISOR = 2;

let nextCasterId = 1;

function difficultyK() {
  return state.elapsed / SECONDS_PER_MINUTE;
}

function randomFrameCount(min: number, jitter: number) {
  return min + Math.floor(Math.random() * jitter);
}

function playerCenterX() {
  return state.player.x + state.player.w / HALF_DIVISOR;
}

function playerCenterY() {
  return state.player.y + state.player.h / HALF_DIVISOR;
}

function casterFacing(enemy: EnemyState, toward: number) {
  if (toward === 0) return enemy.casterFacing ?? 1;
  return Math.sign(toward);
}

function casterSeekSpeed() {
  return CASTER_CONFIG.seekBaseSpeed
    + Math.min(0.2, difficultyK() * CASTER_CONFIG.seekSpeedScale)
    + Math.random() * CASTER_CONFIG.seekRandomSpeed;
}

function casterWispDamage() {
  return Math.min(14, 4 + difficultyK() * 0.45);
}

function casterWispSpeed() {
  return Math.min(
    CASTER_CONFIG.wispMaxSpeed,
    CASTER_CONFIG.wispBaseSpeed + difficultyK() * CASTER_CONFIG.wispSpeedScale,
  );
}

function casterWispTurnRate() {
  return Math.min(
    CASTER_CONFIG.wispMaxTurnRate,
    CASTER_CONFIG.wispBaseTurnRate + difficultyK() * CASTER_CONFIG.wispTurnRateScale,
  );
}

function casterWispCount(enemy: EnemyState) {
  if (enemy.casterId === undefined) return 0;
  let count = 0;
  for (const projectile of state.projectiles) {
    if (projectile.kind === "casterWisp" && projectile.ownerId === enemy.casterId) count += 1;
  }
  return count;
}

function enterCasterPhase(enemy: EnemyState, phase: CasterAiPhase) {
  enemy.casterPhase = phase;
  enemy.casterCastSpawned = false;
  if (phase === "windup") {
    enemy.casterTimer = CASTER_CONFIG.windupFrames;
  } else if (phase === "cast") {
    enemy.casterTimer = CASTER_CONFIG.castFrames;
  } else if (phase === "recover") {
    enemy.casterTimer = CASTER_CONFIG.recoverFrames;
  } else {
    enemy.casterTimer = randomFrameCount(
      CASTER_CONFIG.seekCooldownMinFrames,
      CASTER_CONFIG.seekCooldownJitterFrames,
    );
  }
}

function initCaster(enemy: EnemyState, context: EnemySpawnContext) {
  enemy.casterPhase = "seekRange";
  enemy.casterTimer = randomFrameCount(
    CASTER_CONFIG.seekCooldownMinFrames,
    CASTER_CONFIG.seekCooldownJitterFrames,
  );
  enemy.casterFacing = -context.side;
  enemy.casterBaseSpeed = context.speed;
  enemy.casterCastSpawned = false;
  enemy.casterId = nextCasterId;
  nextCasterId += 1;
}

function spawnCasterWisps(enemy: EnemyState) {
  const active = casterWispCount(enemy);
  const available = CASTER_CONFIG.maxActiveWisps - active;
  if (available <= 0) return;

  const shotCount = Math.min(available, difficultyK() >= 3 ? 2 : 1);
  const facing = enemy.casterFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const startX = enemyCenterX(enemy) + facing * enemy.w * 0.58 - CASTER_CONFIG.wispCollisionW / HALF_DIVISOR;
  const startY = enemy.y + enemy.h * 0.38 - CASTER_CONFIG.wispCollisionH / HALF_DIVISOR;
  const targetX = playerCenterX();
  const targetY = playerCenterY();
  const speed = casterWispSpeed();
  const baseAngle = Math.atan2(
    targetY - (startY + CASTER_CONFIG.wispCollisionH / HALF_DIVISOR),
    targetX - (startX + CASTER_CONFIG.wispCollisionW / HALF_DIVISOR),
  );

  for (let index = 0; index < shotCount; index += 1) {
    const spread = shotCount === 1
      ? 0
      : (index === 0 ? -CASTER_CONFIG.wispSpreadRadians : CASTER_CONFIG.wispSpreadRadians);
    const angle = baseAngle + spread;
    state.projectiles.push({
      kind: "casterWisp",
      x: startX,
      y: startY,
      w: CASTER_CONFIG.wispCollisionW,
      h: CASTER_CONFIG.wispCollisionH,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: CASTER_CONFIG.wispLifeFrames,
      damage: casterWispDamage(),
      ownerId: enemy.casterId,
      frame: 0,
      elapsed: 0,
      speed,
      turnRate: casterWispTurnRate(),
    });
  }
}

function updateCasterSeek(enemy: EnemyState, facing: number, distance: number) {
  enemy.casterTimer = (enemy.casterTimer ?? 0) - 1;
  const speed = enemy.casterBaseSpeed ?? CASTER_CONFIG.seekBaseSpeed;
  if (distance < CASTER_CONFIG.minRange) {
    enemy.vx = -facing * speed * CASTER_CONFIG.retreatScale;
  } else if (distance > CASTER_CONFIG.maxRange) {
    enemy.vx = facing * speed;
  } else {
    const rangeOffset = distance - CASTER_CONFIG.preferredRange;
    enemy.vx = Math.abs(rangeOffset) > CASTER_CONFIG.rangeSlack
      ? Math.sign(rangeOffset) * facing * speed * CASTER_CONFIG.repositionScale
      : 0;
  }

  if (
    distance >= CASTER_CONFIG.minRange
    && distance <= CASTER_CONFIG.maxRange
    && enemy.casterTimer <= 0
  ) {
    if (casterWispCount(enemy) < CASTER_CONFIG.maxActiveWisps) {
      enterCasterPhase(enemy, "windup");
      enemy.vx = 0;
    } else {
      enemy.casterTimer = CASTER_CONFIG.blockedRetryFrames;
    }
  }
}

function updateCaster(enemy: EnemyState) {
  enemy.casterPhase ??= "seekRange";
  enemy.casterTimer ??= 0;
  enemy.casterFacing ??= enemy.vx >= 0 ? 1 : -1;
  enemy.casterBaseSpeed ??= casterSeekSpeed();
  enemy.casterCastSpawned ??= false;
  enemy.casterId ??= nextCasterId;
  if (enemy.casterId === nextCasterId) nextCasterId += 1;

  const toward = playerCenterX() - enemyCenterX(enemy);
  const facing = casterFacing(enemy, toward);
  enemy.casterFacing = facing;

  if (enemy.casterPhase === "seekRange") {
    updateCasterSeek(enemy, facing, Math.abs(toward));
  } else if (enemy.casterPhase === "windup") {
    enemy.vx = 0;
    enemy.casterTimer -= 1;
    if (enemy.casterTimer <= 0) enterCasterPhase(enemy, "cast");
  } else if (enemy.casterPhase === "cast") {
    enemy.vx = 0;
    const framesSinceCastStart = CASTER_CONFIG.castFrames - enemy.casterTimer;
    if (!enemy.casterCastSpawned && framesSinceCastStart >= CASTER_CONFIG.castSpawnFrame) {
      enemy.casterCastSpawned = true;
      spawnCasterWisps(enemy);
    }
    enemy.casterTimer -= 1;
    if (enemy.casterTimer <= 0) enterCasterPhase(enemy, "recover");
  } else {
    enemy.vx = 0;
    enemy.casterTimer -= 1;
    if (enemy.casterTimer <= 0) enterCasterPhase(enemy, "seekRange");
  }

  enemy.x += enemy.vx;
}

function casterSheetPhase(phase: CasterAiPhase): CasterPhase {
  if (phase === "seekRange") return "move";
  return phase;
}

function casterPhaseFrame(enemy: EnemyState, phase: CasterAiPhase) {
  if (phase === "seekRange") {
    return frameIndex(CASTER_SHEETS.move.count, CASTER_CONFIG.moveAnimSpeed, state.elapsed, enemy.animSeed);
  }

  const sheet = CASTER_SHEETS[casterSheetPhase(phase)];
  const frameDuration = phase === "windup"
    ? CASTER_CONFIG.windupFrameDuration
    : phase === "cast"
      ? CASTER_CONFIG.castFrameDuration
      : CASTER_CONFIG.recoverFrameDuration;
  const phaseDuration = phase === "windup"
    ? CASTER_CONFIG.windupFrames
    : phase === "cast"
      ? CASTER_CONFIG.castFrames
      : CASTER_CONFIG.recoverFrames;
  const elapsed = Math.max(0, phaseDuration - (enemy.casterTimer ?? 0));
  return Math.min(sheet.count - 1, Math.floor(elapsed / frameDuration));
}

function drawCaster(enemy: EnemyState) {
  const phase = enemy.casterPhase ?? "seekRange";
  const sheetPhase = casterSheetPhase(phase);
  const sheet = CASTER_SHEETS[sheetPhase] || CASTER_SHEETS.move;
  const facing = enemy.casterFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const drawScale = enemyDrawScale(CASTER_ARCHETYPE);

  if (phase === "seekRange") {
    drawEnemyFrame(enemy, sheet, drawScale, CASTER_CONFIG.moveAnimSpeed, state.elapsed, facing);
    return;
  }

  const frame = casterPhaseFrame(enemy, phase);
  const drawW = Math.round(sheet.frameW * drawScale);
  const drawH = Math.round(sheet.frameH * drawScale);
  const centerX = enemyCenterX(enemy);
  const feetY = enemyFeetY(enemy);
  drawSheetFrame(sheet, frame, centerX - drawW / HALF_DIVISOR, feetY - drawH, drawW, drawH, facing);
}

export const CASTER_ARCHETYPE: EnemyArchetype = {
  speed: casterSeekSpeed,
  drawScale: CASTER_CONFIG.drawScale,
  init: initCaster,
  update: updateCaster,
  draw: drawCaster,
};

export function isCasterSheet(sheetIndex: number) {
  return sheetIndex === CASTER_SHEET_INDEX && Boolean(ENEMY_SHEETS[CASTER_SHEET_INDEX]);
}
