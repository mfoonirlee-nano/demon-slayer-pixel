import {
  BRUTE_FIREBALL_EXPLOSION_SHEET,
  BRUTE_FIREBALL_LAUNCH_SHEET,
  BRUTE_FIREBALL_ROLL_SHEET,
  GROUND_Y,
} from "../../constants";
import { playSfx } from "../../game/audio";
import { recordCollisionDebugEllipse } from "../../game/collisionDebug";
import { state } from "../../game/state";
import { drawSheetFrame } from "../../rendering/graphics";
import type { SpriteSheet } from "../../types/assets";
import type { BruteFireballState, EnemyState } from "../../types/game-state";
import { hurtPlayer } from "../player";
import { enemyAttackDamage, enemyCenterX, enemyFeetY, enemyGrowthStage } from "./common";

export const BRUTE_FIREBALL_CONFIG = {
  hitboxSize: 28,
  launchOriginYOffset: 56,
  launchSpeedX: 4,
  finalNearLaunchSpeedX: 3.4,
  finalFarLaunchSpeedX: 4.6,
  launchSpeedY: -2.8,
  launchGravity: 0.32,
  awakenedRollSpeed: 3.4,
  finalNearRollSpeed: 2.8,
  finalFarRollSpeed: 4.2,
  launchFrameDuration: 3,
  rollFrameDuration: 3,
  explosionFrameDuration: 4,
  explosionDamageFrame: 2,
  launchDrawSize: 78,
  rollDrawSize: 72,
  rollBottomPadding: 9,
  explosionDrawSize: 160,
  explosionBottomPadding: 8,
  explosionVerticalRadiusScale: 0.72,
  awakenedDistance: 230,
  finalNearDistance: 150,
  finalFarDistance: 340,
  awakenedDamageMultiplier: 1.45,
  awakenedDamageBonus: 4,
  finalDamageMultiplier: 1.75,
  finalDamageBonus: 7,
  awakenedExplosionRadius: 64,
  finalExplosionRadius: 78,
  maxActive: 4,
  awakenedReleasePitch: 0.82,
  finalReleasePitch: 0.72,
  explosionPitch: 0.76,
} as const;

const HALF_DIVISOR = 2;

function fireballCenterX(effect: BruteFireballState) {
  return effect.x + effect.w / HALF_DIVISOR;
}

function fireballCenterY(effect: BruteFireballState) {
  return effect.y + effect.h / HALF_DIVISOR;
}

function stageShots(enemy: EnemyState) {
  return enemyGrowthStage(enemy) === "final"
    ? [
        {
          distance: BRUTE_FIREBALL_CONFIG.finalNearDistance,
          launchSpeedX: BRUTE_FIREBALL_CONFIG.finalNearLaunchSpeedX,
          rollSpeed: BRUTE_FIREBALL_CONFIG.finalNearRollSpeed,
        },
        {
          distance: BRUTE_FIREBALL_CONFIG.finalFarDistance,
          launchSpeedX: BRUTE_FIREBALL_CONFIG.finalFarLaunchSpeedX,
          rollSpeed: BRUTE_FIREBALL_CONFIG.finalFarRollSpeed,
        },
      ]
    : [{
        distance: BRUTE_FIREBALL_CONFIG.awakenedDistance,
        launchSpeedX: BRUTE_FIREBALL_CONFIG.launchSpeedX,
        rollSpeed: BRUTE_FIREBALL_CONFIG.awakenedRollSpeed,
      }];
}

function fireballDamage(enemy: EnemyState) {
  const final = enemyGrowthStage(enemy) === "final";
  const multiplier = final
    ? BRUTE_FIREBALL_CONFIG.finalDamageMultiplier
    : BRUTE_FIREBALL_CONFIG.awakenedDamageMultiplier;
  const bonus = final
    ? BRUTE_FIREBALL_CONFIG.finalDamageBonus
    : BRUTE_FIREBALL_CONFIG.awakenedDamageBonus;
  return enemyAttackDamage(enemy, enemy.damage * multiplier + bonus);
}

function fireballExplosionRadius(enemy: EnemyState) {
  return enemyGrowthStage(enemy) === "final"
    ? BRUTE_FIREBALL_CONFIG.finalExplosionRadius
    : BRUTE_FIREBALL_CONFIG.awakenedExplosionRadius;
}

export function spawnBruteFireballs(enemy: EnemyState) {
  if (enemyGrowthStage(enemy) === "intro") return;
  const shots = stageShots(enemy);
  const availableSlots = Math.max(
    0,
    BRUTE_FIREBALL_CONFIG.maxActive - state.bruteFireballs.length,
  );
  if (availableSlots < shots.length) return;

  const facing = enemy.bruteFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const size = BRUTE_FIREBALL_CONFIG.hitboxSize;
  const surface = enemy.onPlatform ?? null;
  const groundY = surface?.y ?? enemyFeetY(enemy);
  const originX = enemyCenterX(enemy) + facing * enemy.w / HALF_DIVISOR;
  const originY = groundY - BRUTE_FIREBALL_CONFIG.launchOriginYOffset;
  const damage = fireballDamage(enemy);
  const explosionRadius = fireballExplosionRadius(enemy);

  for (const shot of shots) {
    state.bruteFireballs.push({
      phase: "launch",
      x: originX - size / HALF_DIVISOR,
      y: originY - size / HALF_DIVISOR,
      w: size,
      h: size,
      vx: facing * shot.launchSpeedX,
      vy: BRUTE_FIREBALL_CONFIG.launchSpeedY,
      rollSpeed: shot.rollSpeed,
      facing,
      surface,
      groundY,
      targetX: originX + facing * shot.distance,
      elapsed: 0,
      frame: 0,
      damage,
      explosionRadius,
      damageResolved: false,
    });
  }

  playSfx(
    "enemyCastRelease",
    enemyGrowthStage(enemy) === "final"
      ? BRUTE_FIREBALL_CONFIG.finalReleasePitch
      : BRUTE_FIREBALL_CONFIG.awakenedReleasePitch,
  );
}

function platformSupports(effect: BruteFireballState) {
  const surface = effect.surface;
  if (!surface || !state.platforms.includes(surface)) return false;
  const centerX = fireballCenterX(effect);
  return centerX >= surface.x && centerX <= surface.x + surface.w;
}

function leavePlatform(effect: BruteFireballState) {
  effect.surface = null;
  effect.groundY = GROUND_Y;
}

function isOnSurface(effect: BruteFireballState) {
  return effect.y + effect.h >= effect.groundY;
}

function enterRoll(effect: BruteFireballState) {
  effect.phase = "roll";
  effect.elapsed = 0;
  effect.frame = 0;
  effect.vx = effect.facing * effect.rollSpeed;
  effect.vy = 0;
  if (effect.surface && !platformSupports(effect)) leavePlatform(effect);
  if (isOnSurface(effect)) effect.y = effect.groundY - effect.h;
}

function enterExplosion(effect: BruteFireballState) {
  effect.phase = "explode";
  effect.elapsed = 0;
  effect.frame = 0;
  effect.vx = 0;
  effect.vy = 0;
  playSfx("enemyImpact", BRUTE_FIREBALL_CONFIG.explosionPitch);
}

function reachedTarget(effect: BruteFireballState) {
  return effect.facing > 0
    ? fireballCenterX(effect) >= effect.targetX
    : fireballCenterX(effect) <= effect.targetX;
}

function updateLaunch(effect: BruteFireballState) {
  if (effect.surface && state.platforms.includes(effect.surface)) {
    effect.groundY = effect.surface.y;
  } else if (effect.surface) {
    leavePlatform(effect);
  }
  effect.elapsed += 1;
  effect.frame = Math.min(
    BRUTE_FIREBALL_LAUNCH_SHEET.count - 1,
    Math.floor(effect.elapsed / BRUTE_FIREBALL_CONFIG.launchFrameDuration),
  );
  effect.x += effect.vx;
  effect.vy += BRUTE_FIREBALL_CONFIG.launchGravity;
  effect.y += effect.vy;

  if (effect.y + effect.h >= effect.groundY) enterRoll(effect);
}

function updateRoll(effect: BruteFireballState) {
  effect.elapsed += 1;
  effect.frame = Math.floor(
    effect.elapsed / BRUTE_FIREBALL_CONFIG.rollFrameDuration,
  ) % BRUTE_FIREBALL_ROLL_SHEET.count;
  effect.x += effect.vx;
  if (effect.surface && platformSupports(effect)) {
    effect.groundY = effect.surface.y;
    effect.y = effect.groundY - effect.h;
    effect.vy = 0;
  } else {
    if (effect.surface) leavePlatform(effect);
    if (!isOnSurface(effect)) {
      effect.vy += BRUTE_FIREBALL_CONFIG.launchGravity;
      effect.y += effect.vy;
    }
    if (isOnSurface(effect)) {
      effect.y = effect.groundY - effect.h;
      effect.vy = 0;
    }
  }

  if (!reachedTarget(effect)) return;
  effect.x = effect.targetX - effect.w / HALF_DIVISOR;
  if (isOnSurface(effect)) enterExplosion(effect);
  else effect.vx = 0;
}

function playerInsideExplosion(effect: BruteFireballState) {
  const centerX = fireballCenterX(effect);
  const radiusX = effect.explosionRadius;
  const radiusY = radiusX * BRUTE_FIREBALL_CONFIG.explosionVerticalRadiusScale;
  recordCollisionDebugEllipse(
    centerX,
    effect.groundY,
    radiusX,
    radiusY,
    "enemyAttack",
  );
  const playerFootX = state.player.x + state.player.w / HALF_DIVISOR;
  const playerFootY = state.player.y + state.player.h;
  const dx = (playerFootX - centerX) / radiusX;
  const dy = (playerFootY - effect.groundY) / radiusY;
  return dx * dx + dy * dy <= 1;
}

function updateExplosion(effect: BruteFireballState) {
  effect.elapsed += 1;
  effect.frame = Math.min(
    BRUTE_FIREBALL_EXPLOSION_SHEET.count - 1,
    Math.floor(effect.elapsed / BRUTE_FIREBALL_CONFIG.explosionFrameDuration),
  );

  if (
    !effect.damageResolved
    && effect.frame >= BRUTE_FIREBALL_CONFIG.explosionDamageFrame
  ) {
    effect.damageResolved = true;
    if (playerInsideExplosion(effect)) {
      hurtPlayer(effect.damage, -effect.facing);
    }
  }
}

function explosionFinished(effect: BruteFireballState) {
  return effect.phase === "explode"
    && effect.elapsed >= BRUTE_FIREBALL_EXPLOSION_SHEET.count
      * BRUTE_FIREBALL_CONFIG.explosionFrameDuration;
}

export function updateBruteFireballEffects() {
  for (let i = state.bruteFireballs.length - 1; i >= 0; i -= 1) {
    const effect = state.bruteFireballs[i];
    if (effect.phase === "launch") updateLaunch(effect);
    else if (effect.phase === "roll") updateRoll(effect);
    else updateExplosion(effect);

    if (explosionFinished(effect)) state.bruteFireballs.splice(i, 1);
  }
}

function sheetForEffect(effect: BruteFireballState): SpriteSheet {
  if (effect.phase === "launch") return BRUTE_FIREBALL_LAUNCH_SHEET;
  if (effect.phase === "roll") return BRUTE_FIREBALL_ROLL_SHEET;
  return BRUTE_FIREBALL_EXPLOSION_SHEET;
}

function drawSizeForEffect(effect: BruteFireballState) {
  if (effect.phase === "launch") return BRUTE_FIREBALL_CONFIG.launchDrawSize;
  if (effect.phase === "roll") return BRUTE_FIREBALL_CONFIG.rollDrawSize;
  return BRUTE_FIREBALL_CONFIG.explosionDrawSize;
}

export function drawBruteFireballEffects() {
  for (const effect of state.bruteFireballs) {
    const drawSize = drawSizeForEffect(effect);
    const x = fireballCenterX(effect) - drawSize / HALF_DIVISOR;
    const y = effect.phase === "explode"
      ? effect.groundY - drawSize + BRUTE_FIREBALL_CONFIG.explosionBottomPadding
      : effect.phase === "roll" && isOnSurface(effect)
        ? effect.groundY - drawSize + BRUTE_FIREBALL_CONFIG.rollBottomPadding
        : fireballCenterY(effect) - drawSize / HALF_DIVISOR;
    drawSheetFrame(
      sheetForEffect(effect),
      effect.frame,
      x,
      y,
      drawSize,
      drawSize,
      effect.facing,
    );
  }
}
