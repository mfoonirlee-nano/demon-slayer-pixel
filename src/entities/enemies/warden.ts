import { ctx } from "../../rendering/context";
import { recordCollisionDebugEllipse } from "../../game/collisionDebug";
import { state } from "../../game/state";
import { playSfx } from "../../game/audio";
import {
  ENEMY_SHEETS,
  WARDEN_AURA_EFFECT_SHEET,
  WARDEN_BLOOD_MOON_BUFF_SHEET,
  WARDEN_SHEET_INDEX,
  WARDEN_SHEETS,
} from "../../constants";
import { drawSheetFrame } from "../../rendering/graphics";
import type { EnemyState, WardenPhase } from "../../types/game-state";
import { frameIndex } from "../../game/utils";
import type { EnemyArchetype, EnemySpawnContext } from "./common";
import {
  drawEnemyFrame,
  drawEnemySheetFrame,
  enemyCenterX,
  enemyDrawScale,
  enemyFeetY,
  enemyGrowthStage,
  hasAwakenedGrowth,
} from "./common";

const HALF_DIVISOR = 2;
const FRAMES_PER_SECOND = 60;
const AURA_RING_PULSE_BASE = 0.55;
const AURA_RING_PULSE_SCALE = 0.12;
const AURA_RING_PULSE_SPEED = 5.8;
const AURA_RING_FEET_OFFSET = 6;
const WARDEN_BUFF_EFFECT_CRESCENT_FRAME = 3;
const WARDEN_BUFF_EFFECT_PEAK_FRAME = 4;
const WARDEN_BUFF_EFFECT_FRAME_ORDER = [
  0,
  1,
  2,
  WARDEN_BUFF_EFFECT_CRESCENT_FRAME,
  WARDEN_BUFF_EFFECT_PEAK_FRAME,
  WARDEN_BUFF_EFFECT_CRESCENT_FRAME,
  2,
  1,
] as const;

const WARDEN_CONFIG = {
  minRange: 220,
  maxRange: 330,
  preferredRange: 272,
  rangeSlack: 18,
  moveBaseSpeed: 0.46,
  moveRandomSpeed: 0.16,
  moveSpeedScaleByElapsed: 0.003,
  moveSpeedMaxBonus: 0.18,
  driftScale: 0.3,
  retreatScale: 1.05,
  auraMinFrames: 60,
  awakenedAuraMinFrames: 72,
  auraFrameJitter: 20,
  moveCooldownMinFrames: 18,
  moveCooldownJitterFrames: 18,
  hitFrames: 14,
  blockedRetryFrames: 12,
  auraRadius: 300,
  awakenedAuraRadius: 600,
  auraVerticalRadiusScale: 0.72,
  auraSpeedScale: 1.15,
  awakenedAuraSpeedScale: 1.3,
  finalAuraSpeedScale: 1.5,
  auraAttackDamageScale: 1.15,
  awakenedAuraAttackDamageScale: 1.3,
  finalAuraAttackDamageScale: 1.5,
  maxActiveWardens: 1,
  hpMultiplier: 1.6,
  damageScale: 0.8,
  drawScale: 1.16,
  collisionScaleX: 0.82,
  collisionScaleY: 0.82,
  moveAnimSpeed: 8,
  auraAnimSpeed: 10,
  auraEffectFrameDuration: 7,
  auraEffectDrawW: 198,
  finalAuraEffectDrawW: 720,
  auraEffectAlpha: 0.82,
  buffEffectFrameDuration: 10,
  buffEffectDrawW: 38,
  buffEffectYOffset: 4,
  buffEffectAlpha: 0.88,
} as const;

function randomFrameCount(min: number, jitter: number) {
  return min + Math.floor(Math.random() * jitter);
}

function isWarden(enemy: Pick<EnemyState, "sheetIndex">) {
  return enemy.sheetIndex === WARDEN_SHEET_INDEX;
}

function playerCenterX() {
  return state.player.x + state.player.w / HALF_DIVISOR;
}

function wardenFacing(enemy: EnemyState, toward: number) {
  if (toward === 0) return enemy.wardenFacing ?? 1;
  return Math.sign(toward);
}

function wardenMoveSpeed() {
  return Math.min(
    WARDEN_CONFIG.moveBaseSpeed + WARDEN_CONFIG.moveSpeedMaxBonus,
    WARDEN_CONFIG.moveBaseSpeed
      + state.elapsed * WARDEN_CONFIG.moveSpeedScaleByElapsed
      + Math.random() * WARDEN_CONFIG.moveRandomSpeed,
  );
}

function wardenAuraMinFrames(enemy: EnemyState) {
  return hasAwakenedGrowth(enemy) ? WARDEN_CONFIG.awakenedAuraMinFrames : WARDEN_CONFIG.auraMinFrames;
}

function wardenAuraRadius(enemy: EnemyState) {
  if (enemyGrowthStage(enemy) === "final") return Number.POSITIVE_INFINITY;
  return hasAwakenedGrowth(enemy) ? WARDEN_CONFIG.awakenedAuraRadius : WARDEN_CONFIG.auraRadius;
}

function wardenAuraProfile(enemy: EnemyState) {
  const stage = enemyGrowthStage(enemy);
  if (stage === "final") {
    return {
      radius: Number.POSITIVE_INFINITY,
      speedScale: WARDEN_CONFIG.finalAuraSpeedScale,
      attackDamageScale: WARDEN_CONFIG.finalAuraAttackDamageScale,
      damageImmune: true,
      global: true,
    };
  }
  if (stage === "awakened") {
    return {
      radius: WARDEN_CONFIG.awakenedAuraRadius,
      speedScale: WARDEN_CONFIG.awakenedAuraSpeedScale,
      attackDamageScale: WARDEN_CONFIG.awakenedAuraAttackDamageScale,
      damageImmune: false,
      global: false,
    };
  }
  return {
    radius: WARDEN_CONFIG.auraRadius,
    speedScale: WARDEN_CONFIG.auraSpeedScale,
    attackDamageScale: WARDEN_CONFIG.auraAttackDamageScale,
    damageImmune: false,
    global: false,
  };
}

function wardenAuraGeometry(enemy: EnemyState) {
  const profile = wardenAuraProfile(enemy);
  const radiusX = profile.radius;
  return {
    centerX: enemyCenterX(enemy),
    centerY: enemy.y + enemy.h / HALF_DIVISOR,
    radiusX,
    radiusY: radiusX * WARDEN_CONFIG.auraVerticalRadiusScale,
    profile,
  };
}

function isEnemyInWardenAura(
  enemy: EnemyState,
  geometry: ReturnType<typeof wardenAuraGeometry>,
) {
  const dx = (enemyCenterX(enemy) - geometry.centerX) / geometry.radiusX;
  const dy = ((enemy.y + enemy.h / HALF_DIVISOR) - geometry.centerY)
    / geometry.radiusY;
  return dx * dx + dy * dy <= 1;
}

function wardenSupportTargetCount(warden: EnemyState) {
  let count = 0;
  const geometry = wardenAuraGeometry(warden);

  for (const enemy of state.enemies) {
    if (enemy === warden || isWarden(enemy)) continue;
    if (geometry.profile.global) {
      count += 1;
      continue;
    }
    if (isEnemyInWardenAura(enemy, geometry)) count += 1;
  }

  return count;
}

function enterWardenPhase(enemy: EnemyState, phase: WardenPhase) {
  enemy.wardenPhase = phase;
  enemy.wardenAuraEndsAt = undefined;
  if (phase === "aura") {
    const auraFrames = randomFrameCount(wardenAuraMinFrames(enemy), WARDEN_CONFIG.auraFrameJitter);
    enemy.wardenTimer = auraFrames;
    enemy.wardenAuraEndsAt = state.elapsed + auraFrames / FRAMES_PER_SECOND;
    playSfx("enemyAura");
  } else if (phase === "hit") {
    enemy.wardenTimer = WARDEN_CONFIG.hitFrames;
  } else {
    enemy.wardenTimer = randomFrameCount(
      WARDEN_CONFIG.moveCooldownMinFrames,
      WARDEN_CONFIG.moveCooldownJitterFrames,
    );
  }
}

function updateWardenAuraTimer(enemy: EnemyState) {
  if (enemy.wardenAuraEndsAt === undefined) {
    enemy.wardenTimer = (enemy.wardenTimer ?? 0) - 1;
    return;
  }
  enemy.wardenTimer = Math.max(
    0,
    Math.ceil((enemy.wardenAuraEndsAt - state.elapsed) * FRAMES_PER_SECOND),
  );
}

function initWarden(enemy: EnemyState, context: EnemySpawnContext) {
  enemy.wardenPhase = "move";
  enemy.wardenTimer = randomFrameCount(
    WARDEN_CONFIG.moveCooldownMinFrames,
    WARDEN_CONFIG.moveCooldownJitterFrames,
  );
  enemy.wardenFacing = -context.side;
  enemy.wardenBaseSpeed = context.speed;
  enemy.wardenBuffedFrames = 0;
  enemy.damage *= WARDEN_CONFIG.damageScale;
}

function updateWardenMove(enemy: EnemyState, facing: number, distance: number) {
  enemy.wardenTimer = Math.max(0, (enemy.wardenTimer ?? 0) - 1);
  const speed = enemy.wardenBaseSpeed ?? WARDEN_CONFIG.moveBaseSpeed;
  const profile = wardenAuraProfile(enemy);

  if (distance < WARDEN_CONFIG.minRange) {
    enemy.vx = -facing * speed * WARDEN_CONFIG.retreatScale;
  } else if (distance > WARDEN_CONFIG.maxRange) {
    enemy.vx = facing * speed;
  } else {
    const rangeOffset = distance - WARDEN_CONFIG.preferredRange;
    enemy.vx = Math.abs(rangeOffset) > WARDEN_CONFIG.rangeSlack
      ? Math.sign(rangeOffset) * facing * speed * WARDEN_CONFIG.driftScale
      : 0;
  }

  if (
    (
      profile.global
      || (
        distance >= WARDEN_CONFIG.minRange
        && distance <= WARDEN_CONFIG.maxRange
      )
    )
    && enemy.wardenTimer <= 0
  ) {
    if (wardenSupportTargetCount(enemy) > 0) {
      enterWardenPhase(enemy, "aura");
      enemy.vx = 0;
    } else {
      enemy.wardenTimer = WARDEN_CONFIG.blockedRetryFrames;
    }
  }
}

function updateWarden(enemy: EnemyState) {
  enemy.wardenPhase ??= "move";
  enemy.wardenTimer ??= 0;
  enemy.wardenFacing ??= enemy.vx >= 0 ? 1 : -1;
  enemy.wardenBaseSpeed ??= wardenMoveSpeed();
  enemy.wardenBuffedFrames = 0;

  if (enemy.wardenPhase !== "hit" && enemy.hitCd > 0) {
    enterWardenPhase(enemy, "hit");
  }

  const toward = playerCenterX() - enemyCenterX(enemy);
  const facing = wardenFacing(enemy, toward);
  enemy.wardenFacing = facing;

  if (enemy.wardenPhase === "hit") {
    enemy.vx = 0;
    enemy.wardenTimer -= 1;
    if (enemy.wardenTimer <= 0) enterWardenPhase(enemy, "move");
  } else if (enemy.wardenPhase === "aura") {
    enemy.vx = 0;
    updateWardenAuraTimer(enemy);
    const targetCount = wardenSupportTargetCount(enemy);
    const profile = wardenAuraProfile(enemy);
    if (
      enemy.wardenTimer <= 0
      || targetCount <= 0
      || (
        !profile.global
        && (
          Math.abs(toward) < WARDEN_CONFIG.minRange - WARDEN_CONFIG.rangeSlack
          || Math.abs(toward) > WARDEN_CONFIG.maxRange + WARDEN_CONFIG.rangeSlack
        )
      )
    ) {
      enterWardenPhase(enemy, "move");
    }
  } else {
    updateWardenMove(enemy, facing, Math.abs(toward));
  }

  enemy.x += enemy.vx;
}

function wardenHitFrame(enemy: EnemyState) {
  const elapsed = Math.max(0, WARDEN_CONFIG.hitFrames - (enemy.wardenTimer ?? 0));
  return Math.min(WARDEN_SHEETS.hit.count - 1, Math.floor(elapsed * WARDEN_SHEETS.hit.count / WARDEN_CONFIG.hitFrames));
}

function drawWarden(enemy: EnemyState) {
  const phase = enemy.wardenPhase ?? "move";
  const facing = enemy.wardenFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const drawScale = enemyDrawScale(WARDEN_ARCHETYPE);
  if (phase === "move") {
    drawEnemyFrame(enemy, WARDEN_SHEETS.move, drawScale, WARDEN_CONFIG.moveAnimSpeed, state.elapsed, facing);
    return;
  }
  if (phase === "aura") {
    drawEnemyFrame(enemy, WARDEN_SHEETS.aura, drawScale, WARDEN_CONFIG.auraAnimSpeed, state.elapsed, facing);
    return;
  }

  const sheet = WARDEN_SHEETS.hit;
  const frame = wardenHitFrame(enemy);
  const drawW = Math.round(sheet.frameW * drawScale);
  const drawH = Math.round(sheet.frameH * drawScale);
  drawEnemySheetFrame(
    enemy,
    sheet,
    frame,
    enemyCenterX(enemy) - drawW / HALF_DIVISOR,
    enemyFeetY(enemy) - drawH,
    drawW,
    drawH,
    facing,
  );
}

function activeAuraWardens() {
  return state.enemies.filter((enemy) => isWarden(enemy) && enemy.wardenPhase === "aura");
}

export function applyWardenAuraBuffs() {
  for (const enemy of state.enemies) {
    enemy.wardenBuffedFrames = 0;
    enemy.wardenAttackDamageScale = 1;
    enemy.wardenDamageImmune = false;
  }

  for (const warden of activeAuraWardens()) {
    const geometry = wardenAuraGeometry(warden);
    const { profile } = geometry;
    if (!profile.global) {
      recordCollisionDebugEllipse(
        geometry.centerX,
        geometry.centerY,
        geometry.radiusX,
        geometry.radiusY,
        "supportRange",
      );
    }

    for (const enemy of state.enemies) {
      if (enemy === warden || isWarden(enemy)) continue;
      if (!profile.global && !isEnemyInWardenAura(enemy, geometry)) continue;
      enemy.wardenBuffedFrames = 2;
      enemy.wardenAttackDamageScale = profile.attackDamageScale;
      enemy.wardenDamageImmune = profile.damageImmune;
      enemy.x += enemy.vx * (profile.speedScale - 1);
    }
  }
}

function drawAuraRing(enemy: EnemyState) {
  if (!ctx || enemy.wardenPhase !== "aura") return;
  const pulse = AURA_RING_PULSE_BASE + AURA_RING_PULSE_SCALE * Math.sin(state.elapsed * AURA_RING_PULSE_SPEED + enemy.animSeed);
  const centerX = enemyCenterX(enemy);
  const feetY = enemyFeetY(enemy) - AURA_RING_FEET_OFFSET;
  const sheet = WARDEN_AURA_EFFECT_SHEET;
  const frame = frameIndex(sheet.count, WARDEN_CONFIG.auraEffectFrameDuration, state.elapsed, enemy.animSeed);
  const radius = wardenAuraRadius(enemy);
  const drawW = Number.isFinite(radius)
    ? Math.round(WARDEN_CONFIG.auraEffectDrawW * radius / WARDEN_CONFIG.auraRadius)
    : WARDEN_CONFIG.finalAuraEffectDrawW;
  const drawH = Math.round(drawW * sheet.frameH / sheet.frameW);
  ctx.save();
  ctx.globalAlpha = WARDEN_CONFIG.auraEffectAlpha * pulse;
  drawSheetFrame(sheet, frame, centerX - drawW / HALF_DIVISOR, feetY - drawH, drawW, drawH);
  ctx.restore();
}

function drawBuffMark(enemy: EnemyState) {
  if (!ctx || (enemy.wardenBuffedFrames ?? 0) <= 0) return;
  const sheet = WARDEN_BLOOD_MOON_BUFF_SHEET;
  const orderIndex = frameIndex(
    WARDEN_BUFF_EFFECT_FRAME_ORDER.length,
    WARDEN_CONFIG.buffEffectFrameDuration,
    state.elapsed,
    enemy.animSeed,
  );
  const frame = WARDEN_BUFF_EFFECT_FRAME_ORDER[orderIndex];
  const centerX = enemyCenterX(enemy);
  const drawW = WARDEN_CONFIG.buffEffectDrawW;
  const drawH = Math.round(drawW * sheet.frameH / sheet.frameW);
  ctx.save();
  ctx.globalAlpha = WARDEN_CONFIG.buffEffectAlpha;
  drawSheetFrame(
    sheet,
    frame,
    centerX - drawW / HALF_DIVISOR,
    enemy.y - drawH - WARDEN_CONFIG.buffEffectYOffset,
    drawW,
    drawH,
  );
  ctx.restore();
}

export function drawWardenAuraIndicators(shouldDraw: (enemy: EnemyState) => boolean) {
  for (const enemy of state.enemies) {
    if (shouldDraw(enemy)) drawAuraRing(enemy);
  }
  for (const enemy of state.enemies) {
    if (shouldDraw(enemy)) drawBuffMark(enemy);
  }
}

export const WARDEN_ARCHETYPE: EnemyArchetype = {
  speed: wardenMoveSpeed,
  hpMultiplier: WARDEN_CONFIG.hpMultiplier,
  drawScale: WARDEN_CONFIG.drawScale,
  collisionScaleX: WARDEN_CONFIG.collisionScaleX,
  collisionScaleY: WARDEN_CONFIG.collisionScaleY,
  init: initWarden,
  update: updateWarden,
  draw: drawWarden,
};

export function isWardenSheet(sheetIndex: number) {
  return sheetIndex === WARDEN_SHEET_INDEX && Boolean(ENEMY_SHEETS[WARDEN_SHEET_INDEX]);
}

export function wardenActiveCount() {
  let count = 0;
  for (const enemy of state.enemies) {
    if (isWarden(enemy)) count += 1;
  }
  return count;
}

export function canSpawnWarden() {
  return wardenActiveCount() < WARDEN_CONFIG.maxActiveWardens;
}
