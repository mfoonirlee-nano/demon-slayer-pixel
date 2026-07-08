import { state } from "../../game/state";
import { playSfx } from "../../game/audio";
import { CASTER_SHEET_INDEX, CASTER_SHEETS, ENEMY_SHEETS } from "../../constants";
import type { ActBand, CasterAiPhase, CasterPhase, EnemyState } from "../../types/game-state";
import { frameIndex } from "../../game/utils";
import type { EnemyArchetype, EnemySpawnContext } from "./common";
import {
  drawEnemyFrame,
  drawEnemySheetFrame,
  enemyCenterX,
  enemyDrawScale,
  enemyGrowthStage,
  enemyFeetY,
  isEliteEnemy,
} from "./common";

const FRAMES_PER_SECOND = 60;
const WISP_TRACKING_SECONDS = 5;
const NORMAL_FIRE_INTERVAL_FRAMES = 300;
const EMPOWERED_FIRE_INTERVAL_FRAMES = 180;

const CASTER_CONFIG = {
  minRange: 220,
  maxRange: 280,
  preferredRange: 250,
  rangeSlack: 16,
  seekBaseSpeed: 0.48,
  seekRandomSpeed: 0.32,
  seekSpeedScale: 0.03,
  seekDifficultySpeedCap: 0.2,
  repositionScale: 0.42,
  retreatScale: 1.25,
  castStartPitch: 1.05,
  windupFrames: 36,
  castFrames: 28,
  recoverFrames: 34,
  castSpawnFrame: 14,
  blockedRetryFrames: 12,
  drawScale: 1,
  moveAnimSpeed: 9,
  windupFrameDuration: 9,
  castFrameDuration: 7,
  recoverFrameDuration: 11,
  wispCollisionW: 24,
  wispCollisionH: 22,
  wispLifeFrames: 600,
  awakenedWispLifeBonusFrames: 60,
  wispMaxDamage: 14,
  wispBaseDamage: 4,
  wispDamageScale: 0.45,
  awakenedWispDamageMultiplier: 1.2,
  finalWispDamageMultiplier: 1.5,
  wispBaseSpeed: 2.45,
  wispSpeedScale: 0.11,
  wispMaxSpeed: 3.6,
  normalWispSpeedMultiplier: 1.1,
  awakenedWispSpeedFromNormal: 1.3,
  finalWispSpeedFromNormal: 3,
  wispBaseTurnRate: 0.014,
  wispTurnRateScale: 0.006,
  wispMaxTurnRate: 0.052,
  awakenedWispTurnRateBonus: 0.012,
  eliteWispTurnRateBonus: 0.018,
  wispSpreadRadians: 0.16,
  wispFanForwardOffset: 10,
  wispFanVerticalOffset: 22,
  finalWispHexRadius: 42,
  wispTrackingFrames: WISP_TRACKING_SECONDS * FRAMES_PER_SECOND,
  wispStartForwardRatio: 0.58,
  wispStartHeightRatio: 0.38,
  normalShotCount: 1,
  awakenedShotCount: 3,
  finalShotCount: 6,
  normalMaxActiveWisps: 3,
  awakenedMaxActiveWisps: 15,
  finalMaxActiveWisps: 30,
  normalWispFrameDuration: 6,
  finalWispFrameDuration: 3,
  normalFireIntervalFrames: NORMAL_FIRE_INTERVAL_FRAMES,
  awakenedFireIntervalFrames: EMPOWERED_FIRE_INTERVAL_FRAMES,
  multiCastPitch: 1.12,
} as const;

const SECONDS_PER_MINUTE = 60;
const HALF_DIVISOR = 2;
const FULL_CIRCLE_RADIANS = Math.PI * 2;

let nextCasterId = 1;

type CasterWispProfile = {
  stage: ActBand;
  shotCount: number;
  maxActiveWisps: number;
  speedMultiplier: number;
  damageMultiplier: number;
  intervalFrames: number;
  frameDuration: number;
};

function difficultyK() {
  return state.elapsed / SECONDS_PER_MINUTE;
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
    + Math.min(CASTER_CONFIG.seekDifficultySpeedCap, difficultyK() * CASTER_CONFIG.seekSpeedScale)
    + Math.random() * CASTER_CONFIG.seekRandomSpeed;
}

function casterWispProfile(enemy: EnemyState): CasterWispProfile {
  const stage = enemyGrowthStage(enemy);
  const normalSpeedMultiplier = CASTER_CONFIG.normalWispSpeedMultiplier;
  if (stage === "final") {
    return {
      stage,
      shotCount: CASTER_CONFIG.finalShotCount,
      maxActiveWisps: CASTER_CONFIG.finalMaxActiveWisps,
      speedMultiplier: normalSpeedMultiplier * CASTER_CONFIG.finalWispSpeedFromNormal,
      damageMultiplier: CASTER_CONFIG.finalWispDamageMultiplier,
      intervalFrames: CASTER_CONFIG.awakenedFireIntervalFrames,
      frameDuration: CASTER_CONFIG.finalWispFrameDuration,
    };
  }

  if (stage === "awakened") {
    return {
      stage,
      shotCount: CASTER_CONFIG.awakenedShotCount,
      maxActiveWisps: CASTER_CONFIG.awakenedMaxActiveWisps,
      speedMultiplier: normalSpeedMultiplier * CASTER_CONFIG.awakenedWispSpeedFromNormal,
      damageMultiplier: CASTER_CONFIG.awakenedWispDamageMultiplier,
      intervalFrames: CASTER_CONFIG.awakenedFireIntervalFrames,
      frameDuration: CASTER_CONFIG.normalWispFrameDuration,
    };
  }

  return {
    stage,
    shotCount: CASTER_CONFIG.normalShotCount,
    maxActiveWisps: CASTER_CONFIG.normalMaxActiveWisps,
    speedMultiplier: normalSpeedMultiplier,
    damageMultiplier: 1,
    intervalFrames: CASTER_CONFIG.normalFireIntervalFrames,
    frameDuration: CASTER_CONFIG.normalWispFrameDuration,
  };
}

function casterPostAttackCooldownFrames(enemy: EnemyState) {
  const profile = casterWispProfile(enemy);
  const cooldownFrames = profile.intervalFrames
    - CASTER_CONFIG.windupFrames
    - CASTER_CONFIG.castFrames
    - CASTER_CONFIG.recoverFrames;
  return Math.max(CASTER_CONFIG.blockedRetryFrames, cooldownFrames);
}

function casterInitialCooldownFrames(enemy: EnemyState) {
  const profile = casterWispProfile(enemy);
  const cooldownFrames = profile.intervalFrames
    - CASTER_CONFIG.windupFrames
    - CASTER_CONFIG.castSpawnFrame;
  return Math.max(CASTER_CONFIG.blockedRetryFrames, cooldownFrames);
}

function casterWispDamage(enemy: EnemyState) {
  const baseDamage = Math.min(
    CASTER_CONFIG.wispMaxDamage,
    CASTER_CONFIG.wispBaseDamage + difficultyK() * CASTER_CONFIG.wispDamageScale,
  );
  return baseDamage * casterWispProfile(enemy).damageMultiplier;
}

function casterWispLife(enemy: EnemyState) {
  return CASTER_CONFIG.wispLifeFrames
    + (enemyGrowthStage(enemy) === "intro" ? 0 : CASTER_CONFIG.awakenedWispLifeBonusFrames);
}

function casterWispSpeed(enemy: EnemyState) {
  const speed = Math.min(
    CASTER_CONFIG.wispMaxSpeed,
    CASTER_CONFIG.wispBaseSpeed + difficultyK() * CASTER_CONFIG.wispSpeedScale,
  );
  return speed * casterWispProfile(enemy).speedMultiplier;
}

function casterWispTurnRate(enemy: EnemyState) {
  const bonus = isEliteEnemy(enemy)
    ? CASTER_CONFIG.eliteWispTurnRateBonus
    : enemyGrowthStage(enemy) !== "intro"
      ? CASTER_CONFIG.awakenedWispTurnRateBonus
      : 0;
  return Math.min(
    CASTER_CONFIG.wispMaxTurnRate,
    CASTER_CONFIG.wispBaseTurnRate + difficultyK() * CASTER_CONFIG.wispTurnRateScale + bonus,
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
    playSfx("enemyCastStart", CASTER_CONFIG.castStartPitch);
  } else if (phase === "cast") {
    enemy.casterTimer = CASTER_CONFIG.castFrames;
  } else if (phase === "recover") {
    enemy.casterTimer = CASTER_CONFIG.recoverFrames;
  } else {
    enemy.casterTimer = casterPostAttackCooldownFrames(enemy);
  }
}

function initCaster(enemy: EnemyState, context: EnemySpawnContext) {
  enemy.casterPhase = "seekRange";
  enemy.casterTimer = casterInitialCooldownFrames(enemy);
  enemy.casterFacing = -context.side;
  enemy.casterBaseSpeed = context.speed;
  enemy.casterCastSpawned = false;
  enemy.casterId = nextCasterId;
  nextCasterId += 1;
}

function spawnCasterWisps(enemy: EnemyState) {
  const profile = casterWispProfile(enemy);
  const active = casterWispCount(enemy);
  const available = profile.maxActiveWisps - active;
  if (available <= 0) return;

  const shotCount = Math.min(available, profile.shotCount);
  const facing = enemy.casterFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const startX = enemyCenterX(enemy)
    + facing * enemy.w * CASTER_CONFIG.wispStartForwardRatio
    - CASTER_CONFIG.wispCollisionW / HALF_DIVISOR;
  const startY = enemy.y
    + enemy.h * CASTER_CONFIG.wispStartHeightRatio
    - CASTER_CONFIG.wispCollisionH / HALF_DIVISOR;
  const targetX = playerCenterX();
  const targetY = playerCenterY();
  const speed = casterWispSpeed(enemy);
  const fanCenter = (shotCount - 1) / HALF_DIVISOR;
  const hexCenterX = startX + CASTER_CONFIG.wispCollisionW / HALF_DIVISOR;
  const hexCenterY = startY + CASTER_CONFIG.wispCollisionH / HALF_DIVISOR;

  for (let index = 0; index < shotCount; index += 1) {
    const fanIndex = index - fanCenter;
    const fanRatio = fanCenter === 0 ? 0 : fanIndex / fanCenter;
    const hexAngle = -Math.PI / HALF_DIVISOR
      + index * (FULL_CIRCLE_RADIANS / CASTER_CONFIG.finalShotCount);
    const shotStartX = profile.stage === "final"
      ? hexCenterX
        + Math.cos(hexAngle) * CASTER_CONFIG.finalWispHexRadius
        - CASTER_CONFIG.wispCollisionW / HALF_DIVISOR
      : startX + facing * Math.abs(fanRatio) * CASTER_CONFIG.wispFanForwardOffset;
    const shotStartY = profile.stage === "final"
      ? hexCenterY
        + Math.sin(hexAngle) * CASTER_CONFIG.finalWispHexRadius
        - CASTER_CONFIG.wispCollisionH / HALF_DIVISOR
      : startY + fanRatio * CASTER_CONFIG.wispFanVerticalOffset;
    const baseAngle = Math.atan2(
      targetY - (shotStartY + CASTER_CONFIG.wispCollisionH / HALF_DIVISOR),
      targetX - (shotStartX + CASTER_CONFIG.wispCollisionW / HALF_DIVISOR),
    );
    const spread = shotCount === 1 || profile.stage === "final"
      ? 0
      : fanIndex * CASTER_CONFIG.wispSpreadRadians;
    const angle = baseAngle + spread;
    state.projectiles.push({
      kind: "casterWisp",
      x: shotStartX,
      y: shotStartY,
      w: CASTER_CONFIG.wispCollisionW,
      h: CASTER_CONFIG.wispCollisionH,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: casterWispLife(enemy),
      damage: casterWispDamage(enemy),
      ownerId: enemy.casterId,
      frame: 0,
      elapsed: 0,
      speed,
      trackingFrames: CASTER_CONFIG.wispTrackingFrames,
      turnRate: casterWispTurnRate(enemy),
      wispStage: profile.stage,
      frameDuration: profile.frameDuration,
    });
  }
  playSfx("enemyCastRelease", shotCount > 1 ? CASTER_CONFIG.multiCastPitch : 1);
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
    if (casterWispCount(enemy) < casterWispProfile(enemy).maxActiveWisps) {
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
  drawEnemySheetFrame(enemy, sheet, frame, centerX - drawW / HALF_DIVISOR, feetY - drawH, drawW, drawH, facing);
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
