import { ctx } from "../../context";
import { state } from "../../state";
import { playSfx } from "../../audio";
import { hasDebugInfiniteHealth } from "../../debug";
import {
  BINDER_SHEET_INDEX,
  BINDER_SHEETS,
  BINDER_ZONE_BACK_SHEET,
  BINDER_ZONE_FRONT_SHEET,
  BINDER_ZONE_SHEET,
  ENEMY_SHEETS,
  GROUND_Y,
} from "../../constants";
import { drawSheetFrame } from "../../graphics";
import type { BinderAiPhase, BinderPhase, EnemyState } from "../../types/game-state";
import { frameIndex } from "../../utils";
import type { EnemyArchetype, EnemySpawnContext } from "./common";
import { drawEnemyFrame, enemyCenterX, enemyDrawScale, enemyFeetY } from "./common";
import { endRun } from "../../systems/runLifecycle";

export const BINDER_UNLOCK_SECONDS = 90;

const BINDER_CONFIG = {
  minRange: 185,
  maxRange: 275,
  preferredRange: 230,
  rangeSlack: 16,
  seekBaseSpeed: 0.42,
  seekRandomSpeed: 0.22,
  seekSpeedScale: 0.025,
  seekSpeedMaxBonus: 0.18,
  repositionScale: 0.4,
  retreatScale: 1.2,
  windupFrames: 48,
  castFrames: 24,
  recoverFrames: 42,
  castSpawnFrame: 10,
  seekCooldownMinFrames: 68,
  seekCooldownJitterFrames: 34,
  blockedRetryFrames: 18,
  maxActiveBinders: 1,
  maxActiveZones: 1,
  zoneLifeFrames: 150,
  zoneRadius: 76,
  zoneVerticalRadiusScale: 0.58,
  zoneMoveScale: 0.45,
  zoneDamageFirstFrame: 24,
  zoneDamageIntervalFrames: 36,
  zoneDamageInvincibleFrames: 10,
  zoneDamageBase: 2,
  zoneDamagePerMinute: 1.25,
  zoneDamageMax: 7,
  zoneFrameDuration: 10,
  zoneLoopStartFrame: 1,
  zoneFadeFrames: 16,
  zoneAlpha: 0.88,
  zoneFrontAlphaScale: 0.8,
  zoneDrawWidthScale: 2.52,
  drawScale: 1,
  hpMultiplier: 1.5,
  collisionScaleX: 0.92,
  moveAnimSpeed: 9,
  windupFrameDuration: 12,
  castFrameDuration: 6,
  recoverFrameDuration: 14,
} as const;

const SECONDS_PER_MINUTE = 60;
const HALF_DIVISOR = 2;

function difficultyK() {
  return state.elapsed / SECONDS_PER_MINUTE;
}

function randomFrameCount(min: number, jitter: number) {
  return min + Math.floor(Math.random() * jitter);
}

function playerCenterX() {
  return state.player.x + state.player.w / HALF_DIVISOR;
}

function binderFacing(enemy: EnemyState, toward: number) {
  if (toward === 0) return enemy.binderFacing ?? 1;
  return Math.sign(toward);
}

function binderSeekSpeed() {
  return BINDER_CONFIG.seekBaseSpeed
    + Math.min(BINDER_CONFIG.seekSpeedMaxBonus, difficultyK() * BINDER_CONFIG.seekSpeedScale)
    + Math.random() * BINDER_CONFIG.seekRandomSpeed;
}

function isBinder(enemy: Pick<EnemyState, "sheetIndex">) {
  return enemy.sheetIndex === BINDER_SHEET_INDEX;
}

function bindingZoneCount() {
  return state.bindingZones.length;
}

function bindingZoneDamage() {
  return Math.min(
    BINDER_CONFIG.zoneDamageMax,
    BINDER_CONFIG.zoneDamageBase + difficultyK() * BINDER_CONFIG.zoneDamagePerMinute,
  );
}

function isPlayerInBindingZone(zone: { x: number; y: number; radius: number }) {
  const player = state.player;
  const footX = player.x + player.w / HALF_DIVISOR;
  const footY = player.y + player.h;
  const radiusY = zone.radius * BINDER_CONFIG.zoneVerticalRadiusScale;
  const dx = (footX - zone.x) / zone.radius;
  const dy = (footY - zone.y) / radiusY;
  return dx * dx + dy * dy <= 1;
}

function applyBindingZoneDamage() {
  if (hasDebugInfiniteHealth()) return;

  const player = state.player;
  if (player.invincible > 0) return;

  player.hp = Math.max(0, player.hp - bindingZoneDamage());
  player.invincible = BINDER_CONFIG.zoneDamageInvincibleFrames;
  playSfx("enemyImpact", 0.82);
  if (player.hp <= 0) {
    playSfx("playerDeath");
    endRun(state);
  } else {
    playSfx("playerHurt", 0.9);
  }
}

function enterBinderPhase(enemy: EnemyState, phase: BinderAiPhase) {
  enemy.binderPhase = phase;
  enemy.binderCastSpawned = false;
  if (phase === "windup") {
    enemy.binderTimer = BINDER_CONFIG.windupFrames;
    playSfx("enemyCastStart", 0.86);
  } else if (phase === "cast") {
    enemy.binderTimer = BINDER_CONFIG.castFrames;
  } else if (phase === "recover") {
    enemy.binderTimer = BINDER_CONFIG.recoverFrames;
  } else {
    enemy.binderTimer = randomFrameCount(
      BINDER_CONFIG.seekCooldownMinFrames,
      BINDER_CONFIG.seekCooldownJitterFrames,
    );
  }
}

function initBinder(enemy: EnemyState, context: EnemySpawnContext) {
  enemy.binderPhase = "seekRange";
  enemy.binderTimer = randomFrameCount(
    BINDER_CONFIG.seekCooldownMinFrames,
    BINDER_CONFIG.seekCooldownJitterFrames,
  );
  enemy.binderFacing = -context.side;
  enemy.binderBaseSpeed = context.speed;
  enemy.binderCastSpawned = false;
}

function spawnBindingZone() {
  if (bindingZoneCount() >= BINDER_CONFIG.maxActiveZones) return;
  state.bindingZones.push({
    x: playerCenterX(),
    y: state.player.onPlatform?.y ?? GROUND_Y,
    radius: BINDER_CONFIG.zoneRadius,
    life: BINDER_CONFIG.zoneLifeFrames,
    maxLife: BINDER_CONFIG.zoneLifeFrames,
    elapsed: 0,
    frame: 0,
  });
  playSfx("enemyCastRelease", 0.82);
}

function updateBinderSeek(enemy: EnemyState, facing: number, distance: number) {
  enemy.binderTimer = (enemy.binderTimer ?? 0) - 1;
  const speed = enemy.binderBaseSpeed ?? BINDER_CONFIG.seekBaseSpeed;
  if (distance < BINDER_CONFIG.minRange) {
    enemy.vx = -facing * speed * BINDER_CONFIG.retreatScale;
  } else if (distance > BINDER_CONFIG.maxRange) {
    enemy.vx = facing * speed;
  } else {
    const rangeOffset = distance - BINDER_CONFIG.preferredRange;
    enemy.vx = Math.abs(rangeOffset) > BINDER_CONFIG.rangeSlack
      ? Math.sign(rangeOffset) * facing * speed * BINDER_CONFIG.repositionScale
      : 0;
  }

  if (
    distance >= BINDER_CONFIG.minRange
    && distance <= BINDER_CONFIG.maxRange
    && enemy.binderTimer <= 0
  ) {
    if (bindingZoneCount() < BINDER_CONFIG.maxActiveZones) {
      enterBinderPhase(enemy, "windup");
      enemy.vx = 0;
    } else {
      enemy.binderTimer = BINDER_CONFIG.blockedRetryFrames;
    }
  }
}

function updateBinder(enemy: EnemyState) {
  enemy.binderPhase ??= "seekRange";
  enemy.binderTimer ??= 0;
  enemy.binderFacing ??= enemy.vx >= 0 ? 1 : -1;
  enemy.binderBaseSpeed ??= binderSeekSpeed();
  enemy.binderCastSpawned ??= false;

  const toward = playerCenterX() - enemyCenterX(enemy);
  const facing = binderFacing(enemy, toward);
  enemy.binderFacing = facing;

  if (enemy.binderPhase === "seekRange") {
    updateBinderSeek(enemy, facing, Math.abs(toward));
  } else if (enemy.binderPhase === "windup") {
    enemy.vx = 0;
    enemy.binderTimer -= 1;
    if (enemy.binderTimer <= 0) enterBinderPhase(enemy, "cast");
  } else if (enemy.binderPhase === "cast") {
    enemy.vx = 0;
    const framesSinceCastStart = BINDER_CONFIG.castFrames - enemy.binderTimer;
    if (!enemy.binderCastSpawned && framesSinceCastStart >= BINDER_CONFIG.castSpawnFrame) {
      enemy.binderCastSpawned = true;
      spawnBindingZone();
    }
    enemy.binderTimer -= 1;
    if (enemy.binderTimer <= 0) enterBinderPhase(enemy, "recover");
  } else {
    enemy.vx = 0;
    enemy.binderTimer -= 1;
    if (enemy.binderTimer <= 0) enterBinderPhase(enemy, "seekRange");
  }

  enemy.x += enemy.vx;
}

function binderSheetPhase(phase: BinderAiPhase): BinderPhase {
  if (phase === "seekRange") return "move";
  return phase;
}

function binderPhaseFrame(enemy: EnemyState, phase: BinderAiPhase) {
  if (phase === "seekRange") {
    return frameIndex(BINDER_SHEETS.move.count, BINDER_CONFIG.moveAnimSpeed, state.elapsed, enemy.animSeed);
  }

  const sheet = BINDER_SHEETS[binderSheetPhase(phase)];
  const frameDuration = phase === "windup"
    ? BINDER_CONFIG.windupFrameDuration
    : phase === "cast"
      ? BINDER_CONFIG.castFrameDuration
      : BINDER_CONFIG.recoverFrameDuration;
  const phaseDuration = phase === "windup"
    ? BINDER_CONFIG.windupFrames
    : phase === "cast"
      ? BINDER_CONFIG.castFrames
      : BINDER_CONFIG.recoverFrames;
  const elapsed = Math.max(0, phaseDuration - (enemy.binderTimer ?? 0));
  return Math.min(sheet.count - 1, Math.floor(elapsed / frameDuration));
}

function drawBinder(enemy: EnemyState) {
  const phase = enemy.binderPhase ?? "seekRange";
  const sheetPhase = binderSheetPhase(phase);
  const sheet = BINDER_SHEETS[sheetPhase] || BINDER_SHEETS.move;
  const facing = enemy.binderFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const drawScale = enemyDrawScale(BINDER_ARCHETYPE);

  if (phase === "seekRange") {
    drawEnemyFrame(enemy, sheet, drawScale, BINDER_CONFIG.moveAnimSpeed, state.elapsed, facing);
    return;
  }

  const frame = binderPhaseFrame(enemy, phase);
  const drawW = Math.round(sheet.frameW * drawScale);
  const drawH = Math.round(sheet.frameH * drawScale);
  const centerX = enemyCenterX(enemy);
  const feetY = enemyFeetY(enemy);
  drawSheetFrame(sheet, frame, centerX - drawW / HALF_DIVISOR, feetY - drawH, drawW, drawH, facing);
}

export const BINDER_ARCHETYPE: EnemyArchetype = {
  speed: binderSeekSpeed,
  hpMultiplier: BINDER_CONFIG.hpMultiplier,
  drawScale: BINDER_CONFIG.drawScale,
  collisionScaleX: BINDER_CONFIG.collisionScaleX,
  init: initBinder,
  update: updateBinder,
  draw: drawBinder,
};

export function isBinderSheet(sheetIndex: number) {
  return sheetIndex === BINDER_SHEET_INDEX && Boolean(ENEMY_SHEETS[BINDER_SHEET_INDEX]);
}

export function binderActiveCount() {
  let count = 0;
  for (const enemy of state.enemies) {
    if (isBinder(enemy)) count += 1;
  }
  return count;
}

export function canSpawnBinder() {
  return binderActiveCount() < BINDER_CONFIG.maxActiveBinders;
}

export function updateBindingZones() {
  for (let index = state.bindingZones.length - 1; index >= 0; index -= 1) {
    const zone = state.bindingZones[index];
    zone.life -= 1;
    zone.elapsed += 1;
    if (
      zone.elapsed >= BINDER_CONFIG.zoneDamageFirstFrame
      && (zone.elapsed - BINDER_CONFIG.zoneDamageFirstFrame) % BINDER_CONFIG.zoneDamageIntervalFrames === 0
      && isPlayerInBindingZone(zone)
    ) {
      applyBindingZoneDamage();
    }
    const rawFrame = Math.floor(zone.elapsed / BINDER_CONFIG.zoneFrameDuration);
    if (rawFrame < BINDER_CONFIG.zoneLoopStartFrame) {
      zone.frame = rawFrame;
    } else {
      const loopCount = BINDER_ZONE_SHEET.count - BINDER_CONFIG.zoneLoopStartFrame;
      zone.frame = BINDER_CONFIG.zoneLoopStartFrame
        + (rawFrame - BINDER_CONFIG.zoneLoopStartFrame) % loopCount;
    }
    if (zone.life <= 0) state.bindingZones.splice(index, 1);
  }
}

export function bindingZonePlayerMoveScale() {
  for (const zone of state.bindingZones) {
    if (isPlayerInBindingZone(zone)) return BINDER_CONFIG.zoneMoveScale;
  }

  return 1;
}

function drawBindingZoneLayer(sheet: typeof BINDER_ZONE_SHEET, alphaScale = 1) {
  if (!ctx) return;
  for (const zone of state.bindingZones) {
    const drawW = Math.round(zone.radius * BINDER_CONFIG.zoneDrawWidthScale);
    const drawH = Math.round(drawW * sheet.frameH / sheet.frameW);
    const fade = Math.min(
      1,
      zone.elapsed / BINDER_CONFIG.zoneFadeFrames,
      zone.life / BINDER_CONFIG.zoneFadeFrames,
    );
    ctx.save();
    ctx.globalAlpha = BINDER_CONFIG.zoneAlpha * alphaScale * fade;
    drawSheetFrame(
      sheet,
      zone.frame,
      zone.x - drawW / HALF_DIVISOR,
      zone.y - drawH / HALF_DIVISOR,
      drawW,
      drawH,
    );
    ctx.restore();
  }
}

export function drawBindingZonesBack() {
  drawBindingZoneLayer(BINDER_ZONE_BACK_SHEET);
}

export function drawBindingZonesFront() {
  drawBindingZoneLayer(BINDER_ZONE_FRONT_SHEET, BINDER_CONFIG.zoneFrontAlphaScale);
}

export function drawBindingZones() {
  drawBindingZoneLayer(BINDER_ZONE_SHEET);
}
