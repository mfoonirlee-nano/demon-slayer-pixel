import { state } from "../../game/state";
import { playSfx } from "../../game/audio";
import {
  ENEMY_SHEETS,
  GROUND_Y,
  LEAPER_SHEET_INDEX,
  LEAPER_SHEETS,
  WIDTH,
} from "../../constants";
import type { EnemyState, LeaperPhase, PlatformState } from "../../types/game-state";
import { clamp, frameIndex, hitbox, lerp } from "../../game/utils";
import { hurtPlayer } from "../player";
import type { EnemyArchetype, EnemySpawnContext } from "./common";
import {
  drawEnemyFrame,
  drawEnemySheetFrame,
  enemyAttackDamage,
  enemyCenterX,
  enemyDrawScale,
  enemyFeetY,
  hasAwakenedGrowth,
} from "./common";
import {
  drawLeaperAttackWarnings,
  emitFinalLeaperImpactRocks,
  releaseAwakenedLeaperSpikes,
} from "./leaperSpecialEffects";

const LEAPER_CONFIG = {
  triggerDistance: 235,
  stalkBaseSpeed: 0.62,
  stalkRandomSpeed: 0.26,
  stalkSpeedScaleByElapsed: 0.005,
  windupMinFrames: 18,
  awakenedWindupMinFrames: 14,
  windupFrameJitter: 7,
  leapFrames: 28,
  awakenedLeapFrames: 24,
  leapArcHeight: 86,
  impactFrames: 12,
  recoverMinFrames: 20,
  awakenedRecoverMinFrames: 16,
  recoverFrameJitter: 11,
  blockedRetryFrames: 8,
  landingClampMargin: 26,
  impactDamageMultiplier: 1.7,
  impactDamageBonus: 2,
  finalImpactDamageMultiplier: 3.2,
  finalImpactDamageBonus: 6,
  awakenedSpikeReleaseProgress: 0.3,
  finalSkyRiseFrames: 24,
  finalSkyWaitFrames: 42,
  finalSkyFallFrames: 18,
  finalSkyTopMargin: 20,
  hpMultiplier: 1.05,
  maxActiveLeapers: 2,
  maxLockedLandings: 1,
  drawScale: 1.04,
  collisionScaleX: 1.22,
  collisionScaleY: 0.96,
  stalkAnimSpeed: 7,
} as const;

const HALF_DIVISOR = 2;
const IMPACT_BOX_WIDTH_SCALE = 2.35;
const IMPACT_BOX_WIDTH_PAD = 34;
const AWAKENED_IMPACT_BOX_WIDTH_PAD = 52;
const IMPACT_BOX_HEIGHT_SCALE = 1.18;
const FINAL_IMPACT_BOX_WIDTH_PAD = 112;
const FINAL_IMPACT_BOX_HEIGHT_SCALE = 1.36;
const WINDUP_WARNING_SFX_PITCH = 0.78;
const LEAP_SFX_PITCH = 0.92;
const SKY_FALL_SFX_PITCH = 0.84;

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

function leaperWindupMinFrames(enemy: EnemyState) {
  return hasAwakenedGrowth(enemy)
    ? LEAPER_CONFIG.awakenedWindupMinFrames
    : LEAPER_CONFIG.windupMinFrames;
}

function leaperLeapFrames(enemy: EnemyState) {
  return hasAwakenedGrowth(enemy) ? LEAPER_CONFIG.awakenedLeapFrames : LEAPER_CONFIG.leapFrames;
}

function leaperRecoverMinFrames(enemy: EnemyState) {
  return hasAwakenedGrowth(enemy)
    ? LEAPER_CONFIG.awakenedRecoverMinFrames
    : LEAPER_CONFIG.recoverMinFrames;
}

function hasFinalGrowth(enemy: EnemyState) {
  return enemy.growthStage === "final";
}

function isLeaperSkyPhase(phase: LeaperPhase | undefined) {
  return phase === "skyRise" || phase === "skyWait" || phase === "skyFall";
}

function leaperSkyTopY(enemy: EnemyState) {
  return -enemy.h - LEAPER_CONFIG.finalSkyTopMargin;
}

function leaperSupportTop(enemy: EnemyState) {
  if (enemy.onPlatform) return enemy.onPlatform.y - enemy.h;
  return Math.min(enemy.y, GROUND_Y - enemy.h);
}

function leaperLandingPlatform() {
  const platform = state.player.onPlatform;
  return platform && state.platforms.includes(platform) ? platform : null;
}

function leaperLandingLeft(enemy: EnemyState, platform: PlatformState | null = null) {
  let targetCenterX = playerCenterX();
  if (platform) {
    const minCenterX = platform.x + enemy.w / HALF_DIVISOR;
    const maxCenterX = platform.x + platform.w - enemy.w / HALF_DIVISOR;
    targetCenterX = minCenterX > maxCenterX
      ? platform.x + platform.w / HALF_DIVISOR
      : clamp(targetCenterX, minCenterX, maxCenterX);
  }

  return clamp(
    targetCenterX - enemy.w / HALF_DIVISOR,
    -LEAPER_CONFIG.landingClampMargin,
    WIDTH + LEAPER_CONFIG.landingClampMargin - enemy.w,
  );
}

function seedLeaperLanding(enemy: EnemyState) {
  const platform = leaperLandingPlatform();
  const landingX = leaperLandingLeft(enemy, platform);
  enemy.leaperLandingX = landingX;
  enemy.leaperLandingY = (platform?.y ?? GROUND_Y) - enemy.h;
  enemy.leaperLandingPlatform = platform;
  enemy.leaperLandingPlatformOffsetX = platform ? landingX - platform.x : undefined;
}

function syncLeaperLandingPlatform(enemy: EnemyState) {
  const platform = enemy.leaperLandingPlatform;
  if (!platform) return;
  // Keep the locked point platform-relative while it moves; if it despawns mid-attack,
  // preserve the horizontal lock but fall back to ground so the leaper cannot land in midair.
  if (!state.platforms.includes(platform)) {
    enemy.leaperLandingPlatform = null;
    enemy.leaperLandingPlatformOffsetX = undefined;
    enemy.leaperLandingY = GROUND_Y - enemy.h;
    return;
  }

  enemy.leaperLandingX = clamp(
    platform.x + (enemy.leaperLandingPlatformOffsetX ?? 0),
    -LEAPER_CONFIG.landingClampMargin,
    WIDTH + LEAPER_CONFIG.landingClampMargin - enemy.w,
  );
  enemy.leaperLandingY = platform.y - enemy.h;
}

function clearLeaperLanding(enemy: EnemyState) {
  enemy.leaperLandingX = undefined;
  enemy.leaperLandingY = undefined;
  enemy.leaperLandingPlatform = undefined;
  enemy.leaperLandingPlatformOffsetX = undefined;
  enemy.leaperLeapStartX = undefined;
  enemy.leaperLeapStartY = undefined;
}

function leaperLockedLandingCount() {
  let count = 0;
  for (const enemy of state.enemies) {
    if (
      isLeaper(enemy)
      && (
        enemy.leaperPhase === "windup"
        || enemy.leaperPhase === "leap"
        || enemy.leaperPhase === "skyRise"
        || enemy.leaperPhase === "skyWait"
        || enemy.leaperPhase === "skyFall"
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
    enemy.hasReleasedLeaperSpikes = false;
    enemy.leaperTimer = randomFrameCount(
      leaperWindupMinFrames(enemy),
      LEAPER_CONFIG.windupFrameJitter,
    );
    enemy.leaperPhaseDuration = enemy.leaperTimer;
    seedLeaperLanding(enemy);
    playSfx("enemyWarning", WINDUP_WARNING_SFX_PITCH);
  } else if (phase === "leap") {
    if (enemy.leaperLandingX === undefined || enemy.leaperLandingY === undefined) {
      seedLeaperLanding(enemy);
    }
    enemy.leaperTimer = leaperLeapFrames(enemy);
    enemy.leaperPhaseDuration = leaperLeapFrames(enemy);
    enemy.leaperLeapStartX = enemy.x;
    enemy.leaperLeapStartY = enemy.y;
    enemy.hasReleasedLeaperSpikes = false;
    playSfx("enemyLeap", LEAP_SFX_PITCH);
  } else if (phase === "skyRise") {
    if (enemy.leaperLandingX === undefined || enemy.leaperLandingY === undefined) {
      seedLeaperLanding(enemy);
    }
    enemy.leaperTimer = LEAPER_CONFIG.finalSkyRiseFrames;
    enemy.leaperPhaseDuration = LEAPER_CONFIG.finalSkyRiseFrames;
    enemy.leaperLeapStartX = enemy.x;
    enemy.leaperLeapStartY = enemy.y;
    enemy.onPlatform = null;
    playSfx("enemyLeap", LEAP_SFX_PITCH);
  } else if (phase === "skyWait") {
    enemy.leaperTimer = LEAPER_CONFIG.finalSkyWaitFrames;
    enemy.leaperPhaseDuration = LEAPER_CONFIG.finalSkyWaitFrames;
    enemy.x = enemy.leaperLandingX ?? enemy.x;
    enemy.y = leaperSkyTopY(enemy);
    enemy.vx = 0;
  } else if (phase === "skyFall") {
    enemy.leaperTimer = LEAPER_CONFIG.finalSkyFallFrames;
    enemy.leaperPhaseDuration = LEAPER_CONFIG.finalSkyFallFrames;
    enemy.x = enemy.leaperLandingX ?? enemy.x;
    enemy.y = leaperSkyTopY(enemy);
    enemy.vx = 0;
    playSfx("enemyDive", SKY_FALL_SFX_PITCH);
  } else if (phase === "impact") {
    enemy.leaperTimer = LEAPER_CONFIG.impactFrames;
    enemy.leaperPhaseDuration = LEAPER_CONFIG.impactFrames;
    syncLeaperLandingPlatform(enemy);
    enemy.x = enemy.leaperLandingX ?? enemy.x;
    enemy.y = enemy.leaperLandingY ?? GROUND_Y - enemy.h;
    enemy.onPlatform = enemy.leaperLandingPlatform ?? null;
    if (hasFinalGrowth(enemy)) emitFinalLeaperImpactRocks(enemy);
    playSfx("enemyImpact");
  } else if (phase === "recover") {
    enemy.leaperTimer = randomFrameCount(
      leaperRecoverMinFrames(enemy),
      LEAPER_CONFIG.recoverFrameJitter,
    );
    enemy.leaperPhaseDuration = enemy.leaperTimer;
  } else {
    enemy.leaperTimer = 0;
    enemy.leaperPhaseDuration = 0;
    clearLeaperLanding(enemy);
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
  const widthPad = hasFinalGrowth(enemy)
    ? FINAL_IMPACT_BOX_WIDTH_PAD
    : hasAwakenedGrowth(enemy)
      ? AWAKENED_IMPACT_BOX_WIDTH_PAD
      : IMPACT_BOX_WIDTH_PAD;
  const w = Math.round(enemy.w * IMPACT_BOX_WIDTH_SCALE + widthPad);
  const heightScale = hasFinalGrowth(enemy) ? FINAL_IMPACT_BOX_HEIGHT_SCALE : IMPACT_BOX_HEIGHT_SCALE;
  const h = Math.round(enemy.h * heightScale);
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
  const damage = hasFinalGrowth(enemy)
    ? enemy.damage * LEAPER_CONFIG.finalImpactDamageMultiplier + LEAPER_CONFIG.finalImpactDamageBonus
    : enemy.damage * LEAPER_CONFIG.impactDamageMultiplier + LEAPER_CONFIG.impactDamageBonus;
  hurtPlayer(
    enemyAttackDamage(enemy, damage),
    -facing,
  );
}

function initLeaper(enemy: EnemyState, context: EnemySpawnContext) {
  enemy.leaperPhase = "stalk";
  enemy.leaperTimer = 0;
  enemy.leaperPhaseDuration = 0;
  enemy.leaperFacing = -context.side;
  enemy.leaperBaseSpeed = context.speed;
  enemy.hasReleasedLeaperSpikes = false;
  enemy.leaperImpactHit = false;
  clearLeaperLanding(enemy);
}

function updateLeaper(enemy: EnemyState) {
  enemy.leaperPhase ??= "stalk";
  enemy.leaperTimer ??= 0;
  enemy.leaperPhaseDuration ??= 0;
  enemy.leaperFacing ??= enemy.vx >= 0 ? 1 : -1;
  enemy.leaperBaseSpeed ??= LEAPER_CONFIG.stalkBaseSpeed;
  enemy.hasReleasedLeaperSpikes ??= false;
  enemy.leaperImpactHit ??= false;

  syncLeaperLandingPlatform(enemy);
  const landingX = enemy.leaperLandingX ?? leaperLandingLeft(enemy);
  const landingToward = landingX + enemy.w / HALF_DIVISOR - enemyCenterX(enemy);
  const playerToward = playerCenterX() - enemyCenterX(enemy);
  const phase = enemy.leaperPhase;

  if (phase === "stalk") {
    const facing = leaperFacing(enemy, playerToward);
    enemy.leaperFacing = facing;
    enemy.y = leaperSupportTop(enemy);
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
    syncLeaperLandingPlatform(enemy);
    enemy.leaperFacing = leaperFacing(enemy, landingToward);
    enemy.vx = 0;
    enemy.y = leaperSupportTop(enemy);
    enemy.leaperTimer -= 1;
    if (enemy.leaperTimer <= 0) {
      enterLeaperPhase(enemy, hasFinalGrowth(enemy) ? "skyRise" : "leap");
    }
    return;
  }

  if (phase === "leap") {
    syncLeaperLandingPlatform(enemy);
    enemy.onPlatform = null;
    const duration = leaperLeapFrames(enemy);
    const elapsed = duration - enemy.leaperTimer;
    const t = clamp(elapsed / duration, 0, 1);
    const startX = enemy.leaperLeapStartX ?? enemy.x;
    const startY = enemy.leaperLeapStartY ?? leaperSupportTop(enemy);
    const targetX = enemy.leaperLandingX ?? enemy.x;
    const landingY = enemy.leaperLandingY ?? GROUND_Y - enemy.h;

    enemy.leaperFacing = leaperFacing(enemy, targetX + enemy.w / HALF_DIVISOR - enemyCenterX(enemy));
    enemy.vx = (targetX - startX) / duration;
    enemy.x = lerp(startX, targetX, t);
    enemy.y = lerp(startY, landingY, t) - Math.sin(t * Math.PI) * LEAPER_CONFIG.leapArcHeight;
    if (
      enemy.growthStage === "awakened"
      && !enemy.hasReleasedLeaperSpikes
      && t >= LEAPER_CONFIG.awakenedSpikeReleaseProgress
    ) {
      releaseAwakenedLeaperSpikes(enemy);
    }
    enemy.leaperTimer -= 1;

    if (enemy.leaperTimer <= 0) {
      enterLeaperPhase(enemy, "impact");
      triggerLeaperImpactHit(enemy);
    }
    return;
  }

  if (phase === "skyRise") {
    syncLeaperLandingPlatform(enemy);
    enemy.onPlatform = null;
    const duration = LEAPER_CONFIG.finalSkyRiseFrames;
    const elapsed = duration - enemy.leaperTimer;
    const progress = clamp(elapsed / duration, 0, 1);
    const startX = enemy.leaperLeapStartX ?? enemy.x;
    const startY = enemy.leaperLeapStartY ?? enemy.y;
    const targetX = enemy.leaperLandingX ?? enemy.x;

    enemy.leaperFacing = leaperFacing(enemy, targetX + enemy.w / HALF_DIVISOR - enemyCenterX(enemy));
    enemy.vx = (targetX - startX) / duration;
    enemy.x = lerp(startX, targetX, progress);
    enemy.y = lerp(startY, leaperSkyTopY(enemy), progress);
    enemy.leaperTimer -= 1;
    if (enemy.leaperTimer <= 0) enterLeaperPhase(enemy, "skyWait");
    return;
  }

  if (phase === "skyWait") {
    syncLeaperLandingPlatform(enemy);
    enemy.onPlatform = null;
    enemy.x = enemy.leaperLandingX ?? enemy.x;
    enemy.y = leaperSkyTopY(enemy);
    enemy.vx = 0;
    enemy.leaperTimer -= 1;
    if (enemy.leaperTimer <= 0) enterLeaperPhase(enemy, "skyFall");
    return;
  }

  if (phase === "skyFall") {
    syncLeaperLandingPlatform(enemy);
    enemy.onPlatform = null;
    const duration = LEAPER_CONFIG.finalSkyFallFrames;
    const elapsed = duration - enemy.leaperTimer;
    const progress = clamp(elapsed / duration, 0, 1);
    enemy.x = enemy.leaperLandingX ?? enemy.x;
    enemy.y = lerp(
      leaperSkyTopY(enemy),
      enemy.leaperLandingY ?? GROUND_Y - enemy.h,
      progress,
    );
    enemy.vx = 0;
    enemy.leaperTimer -= 1;
    if (enemy.leaperTimer <= 0) {
      enterLeaperPhase(enemy, "impact");
      triggerLeaperImpactHit(enemy);
    }
    return;
  }

  if (phase === "impact") {
    enemy.vx = 0;
    enemy.x = enemy.leaperLandingX ?? enemy.x;
    enemy.y = enemy.leaperLandingY ?? GROUND_Y - enemy.h;
    if (!enemy.leaperImpactHit) triggerLeaperImpactHit(enemy);
    enemy.leaperTimer -= 1;
    if (enemy.leaperTimer <= 0) {
      enterLeaperPhase(enemy, "recover");
    }
    return;
  }

  enemy.vx = 0;
  enemy.y = leaperSupportTop(enemy);
  enemy.leaperTimer -= 1;
  if (enemy.leaperTimer <= 0) {
    enterLeaperPhase(enemy, "stalk");
  }
}

function drawLeaper(enemy: EnemyState) {
  const phase = enemy.leaperPhase ?? "stalk";
  const sheet = leaperSheetForPhase(phase);
  const facing = enemy.leaperFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const drawScale = enemyDrawScale(LEAPER_ARCHETYPE);

  drawLeaperAttackWarnings(enemy, phase, leaperImpactBox(enemy));

  if (phase === "skyWait") return;

  if (phase === "stalk") {
    drawEnemyFrame(enemy, sheet, drawScale, LEAPER_CONFIG.stalkAnimSpeed, state.elapsed, facing);
    return;
  }

  const frame = leaperPhaseFrame(enemy, phase);
  const drawW = Math.round(sheet.frameW * drawScale);
  const drawH = Math.round(sheet.frameH * drawScale);
  const centerX = enemyCenterX(enemy);
  const feetY = enemyFeetY(enemy);
  drawEnemySheetFrame(enemy, sheet, frame, centerX - drawW / HALF_DIVISOR, feetY - drawH, drawW, drawH, facing);
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
  contactDamageDisabled: (enemy) => isLeaperSkyPhase(enemy.leaperPhase),
};

export function isLeaperSheet(sheetIndex: number) {
  return sheetIndex === LEAPER_SHEET_INDEX && Boolean(ENEMY_SHEETS[LEAPER_SHEET_INDEX]);
}

export function canSpawnLeaper() {
  return leaperActiveCount() < LEAPER_CONFIG.maxActiveLeapers;
}
