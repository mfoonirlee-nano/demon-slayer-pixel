import { state } from "../../game/state";
import { playSfx } from "../../game/audio";
import { BRUTE_SHEET_INDEX, BRUTE_SHEETS, ENEMY_SHEETS } from "../../constants";
import type { BrutePhase, EnemyState } from "../../types/game-state";
import { hitbox } from "../../game/utils";
import { hurtPlayer } from "../player";
import type { SpriteFrameEffect } from "../../rendering/graphics";
import type { EnemyArchetype, EnemySpawnContext } from "./common";
import {
  BRUTE_SHIELD_BREAK_FRAMES,
  drawEnemyFrame,
  drawEnemySheetFrame,
  enemyAttackDamage,
  enemyCenterX,
  enemyDrawScale,
  enemyFeetY,
  hasAwakenedGrowth,
  isEliteEnemy,
} from "./common";

const BRUTE_CONFIG = {
  triggerDistance: 150,
  advanceBaseSpeed: 0.42,
  advanceRandomSpeed: 0.22,
  advanceSpeedScaleByElapsed: 0.006,
  brokenAdvanceSpeedScale: 0.92,
  shieldBashSpeed: 1.65,
  shieldBashDamageMultiplier: 2.2,
  shieldBashDamageBonus: 3,
  cleaveSlideSpeed: 0.62,
  cleaveDamageMultiplier: 1.85,
  cleaveDamageBonus: 2,
  guardMinFrames: 26,
  guardFrameJitter: 9,
  shieldBashMinFrames: 16,
  shieldBashFrameJitter: 5,
  recoverMinFrames: 24,
  recoverFrameJitter: 11,
  brokenRecoverMinFrames: 20,
  brokenRecoverFrameJitter: 9,
  awakenedBrokenRecoverMinFrames: 16,
  eliteBrokenRecoverMinFrames: 14,
  cleaveMinFrames: 24,
  cleaveFrameJitter: 6,
  shieldBashImpactRemainingFrames: 9,
  cleaveImpactRemainingFrames: 12,
  hpMultiplier: 3.25,
  shieldHpScale: 2,
  awakenedShieldHpScale: 2.35,
  eliteShieldHpScale: 2.65,
  maxActiveBrutes: 2,
  maxActiveAttacks: 1,
  drawScale: 1.0,
  collisionScaleX: 1.35,
  collisionScaleY: 0.94,
  advanceAnimSpeed: 9,
  brokenAdvanceAnimSpeed: 9,
} as const;

const BRUTE_PHASE_DRAW_SCALE = {
  advance: 1,
  guard: 0.9,
  shieldBash: 1.2,
  recover: 1.1,
  shieldBreak: 1.15,
  brokenAdvance: 1.1,
  cleave: 1.25,
  brokenRecover: 1.45,
} as const satisfies Record<BrutePhase, number>;

const BRUTE_GUARD_FRAME_EFFECT: SpriteFrameEffect = {
  filter: "brightness(0.9) saturate(1.45) hue-rotate(336deg) contrast(1.14)",
  tint: {
    color: "rgb(204, 35, 38)",
    alpha: 0.34,
  },
};

const HALF_DIVISOR = 2;
const BASH_BOX_REACH = 52;
const BASH_BOX_HEIGHT_PAD = 20;
const BASH_BOX_WIDTH_SCALE = 1.35;
const BASH_BOX_HEIGHT_SCALE = 1.2;
const CLEAVE_BOX_REACH = 68;
const CLEAVE_BOX_WIDTH_SCALE = 1.65;
const CLEAVE_BOX_HEIGHT_SCALE = 1.08;
const ATTACK_BOX_FORWARD_RATIO = 0.55;
const ATTACK_BOX_BACK_RATIO = 0.45;

function isBrute(enemy: Pick<EnemyState, "sheetIndex">) {
  return enemy.sheetIndex === BRUTE_SHEET_INDEX;
}

function randomFrameCount(min: number, jitter: number) {
  return min + Math.floor(Math.random() * jitter);
}

function playerCenterX() {
  return state.player.x + state.player.w / HALF_DIVISOR;
}

function bruteFacing(enemy: EnemyState, toward: number) {
  if (toward === 0) return enemy.bruteFacing ?? 1;
  return Math.sign(toward);
}

function bruteAdvanceSpeed() {
  return BRUTE_CONFIG.advanceBaseSpeed
    + state.elapsed * BRUTE_CONFIG.advanceSpeedScaleByElapsed
    + Math.random() * BRUTE_CONFIG.advanceRandomSpeed;
}

function isBruteAttackPhase(phase?: BrutePhase) {
  return phase === "guard" || phase === "shieldBash" || phase === "cleave";
}

export function bruteActiveCount() {
  let count = 0;
  for (const enemy of state.enemies) {
    if (isBrute(enemy)) count += 1;
  }
  return count;
}

function bruteActiveAttackCount() {
  let count = 0;
  for (const enemy of state.enemies) {
    if (isBrute(enemy) && isBruteAttackPhase(enemy.brutePhase)) count += 1;
  }
  return count;
}

function bruteSheetForPhase(phase: BrutePhase) {
  return BRUTE_SHEETS[phase] || BRUTE_SHEETS.advance;
}

function bruteShieldHpScale(enemy: EnemyState) {
  if (isEliteEnemy(enemy)) return BRUTE_CONFIG.eliteShieldHpScale;
  if (hasAwakenedGrowth(enemy)) return BRUTE_CONFIG.awakenedShieldHpScale;
  return BRUTE_CONFIG.shieldHpScale;
}

function bruteBrokenRecoverMinFrames(enemy: EnemyState) {
  if (isEliteEnemy(enemy)) return BRUTE_CONFIG.eliteBrokenRecoverMinFrames;
  if (hasAwakenedGrowth(enemy)) return BRUTE_CONFIG.awakenedBrokenRecoverMinFrames;
  return BRUTE_CONFIG.brokenRecoverMinFrames;
}

function brutePhaseDuration(enemy: EnemyState, phase: BrutePhase) {
  if (phase === "guard") return BRUTE_CONFIG.guardMinFrames;
  if (phase === "shieldBash") return BRUTE_CONFIG.shieldBashMinFrames;
  if (phase === "recover") return BRUTE_CONFIG.recoverMinFrames;
  if (phase === "shieldBreak") return BRUTE_SHIELD_BREAK_FRAMES;
  if (phase === "cleave") return BRUTE_CONFIG.cleaveMinFrames;
  if (phase === "brokenRecover") return bruteBrokenRecoverMinFrames(enemy);
  return 1;
}

function brutePhaseFrame(enemy: EnemyState, phase: BrutePhase) {
  const sheet = bruteSheetForPhase(phase);
  const duration = brutePhaseDuration(enemy, phase);
  const elapsed = Math.max(0, duration - (enemy.bruteTimer ?? 0));
  return Math.min(sheet.count - 1, Math.floor(elapsed * sheet.count / duration));
}

function bruteLoopAnimSpeed(phase: BrutePhase) {
  return phase === "brokenAdvance"
    ? BRUTE_CONFIG.brokenAdvanceAnimSpeed
    : BRUTE_CONFIG.advanceAnimSpeed;
}

function bruteDrawScale(phase: BrutePhase) {
  return enemyDrawScale(BRUTE_ARCHETYPE) * BRUTE_PHASE_DRAW_SCALE[phase];
}

function enterBrutePhase(enemy: EnemyState, phase: BrutePhase) {
  enemy.brutePhase = phase;
  enemy.bruteAttackHit = false;
  if (phase === "guard") {
    enemy.bruteTimer = randomFrameCount(BRUTE_CONFIG.guardMinFrames, BRUTE_CONFIG.guardFrameJitter);
    playSfx("enemyShieldGuard");
  } else if (phase === "shieldBash") {
    enemy.bruteTimer = randomFrameCount(BRUTE_CONFIG.shieldBashMinFrames, BRUTE_CONFIG.shieldBashFrameJitter);
    playSfx("enemyShieldBash");
  } else if (phase === "recover") {
    enemy.bruteTimer = randomFrameCount(BRUTE_CONFIG.recoverMinFrames, BRUTE_CONFIG.recoverFrameJitter);
  } else if (phase === "shieldBreak") {
    enemy.bruteTimer = BRUTE_SHIELD_BREAK_FRAMES;
  } else if (phase === "brokenRecover") {
    enemy.bruteTimer = randomFrameCount(
      bruteBrokenRecoverMinFrames(enemy),
      BRUTE_CONFIG.brokenRecoverFrameJitter,
    );
  } else if (phase === "cleave") {
    enemy.bruteTimer = randomFrameCount(BRUTE_CONFIG.cleaveMinFrames, BRUTE_CONFIG.cleaveFrameJitter);
    playSfx("enemyCleave");
  } else {
    enemy.bruteTimer = 0;
  }
}

function bruteAttackBox(enemy: EnemyState, reach: number, widthScale: number, heightScale: number, heightPad = 0) {
  const facing = enemy.bruteFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const w = Math.round(enemy.w * widthScale + reach);
  const h = Math.round(enemy.h * heightScale + heightPad);
  return {
    x: facing === 1 ? enemy.x + enemy.w * ATTACK_BOX_FORWARD_RATIO : enemy.x + enemy.w * ATTACK_BOX_BACK_RATIO - w,
    y: enemyFeetY(enemy) - h,
    w,
    h,
  };
}

function triggerBruteAttackHit(
  enemy: EnemyState,
  reach: number,
  widthScale: number,
  heightScale: number,
  damageMultiplier: number,
  damageBonus: number,
  heightPad = 0,
) {
  enemy.bruteAttackHit = true;
  const box = bruteAttackBox(enemy, reach, widthScale, heightScale, heightPad);
  const facing = enemy.bruteFacing ?? (enemy.vx >= 0 ? 1 : -1);
  if (!hitbox(box, state.player)) return;
  hurtPlayer(enemyAttackDamage(enemy, enemy.damage * damageMultiplier + damageBonus), -facing);
}

function initBrute(enemy: EnemyState, context: EnemySpawnContext) {
  enemy.brutePhase = "advance";
  enemy.bruteTimer = 0;
  enemy.bruteFacing = -context.side;
  enemy.bruteBaseSpeed = context.speed;
  enemy.bruteShieldHp = enemy.hp * bruteShieldHpScale(enemy);
  enemy.bruteShieldBroken = false;
  enemy.bruteAttackHit = false;
}

function updateBrute(enemy: EnemyState) {
  enemy.brutePhase ??= "advance";
  enemy.bruteTimer ??= 0;
  enemy.bruteFacing ??= enemy.vx >= 0 ? 1 : -1;
  enemy.bruteBaseSpeed ??= bruteAdvanceSpeed();
  enemy.bruteShieldHp ??= enemy.hp * bruteShieldHpScale(enemy);
  enemy.bruteShieldBroken ??= false;
  enemy.bruteAttackHit ??= false;

  const toward = playerCenterX() - enemyCenterX(enemy);
  const facing = bruteFacing(enemy, toward);
  const phase = enemy.brutePhase;

  if (phase === "advance") {
    enemy.bruteFacing = facing;
    if (Math.abs(toward) <= BRUTE_CONFIG.triggerDistance) {
      if (bruteActiveAttackCount() < BRUTE_CONFIG.maxActiveAttacks) {
        enterBrutePhase(enemy, "guard");
      }
      enemy.vx = 0;
    } else {
      enemy.vx = facing * enemy.bruteBaseSpeed;
    }
  } else if (phase === "guard") {
    enemy.bruteFacing = facing;
    enemy.bruteTimer -= 1;
    enemy.vx = 0;
    if (enemy.bruteTimer <= 0) {
      enterBrutePhase(enemy, "shieldBash");
      enemy.bruteFacing = facing;
      enemy.vx = facing * BRUTE_CONFIG.shieldBashSpeed;
    }
  } else if (phase === "shieldBash") {
    enemy.bruteTimer -= 1;
    enemy.vx = (enemy.bruteFacing ?? facing) * BRUTE_CONFIG.shieldBashSpeed;
    if (!enemy.bruteAttackHit && enemy.bruteTimer <= BRUTE_CONFIG.shieldBashImpactRemainingFrames) {
      triggerBruteAttackHit(
        enemy,
        BASH_BOX_REACH,
        BASH_BOX_WIDTH_SCALE,
        BASH_BOX_HEIGHT_SCALE,
        BRUTE_CONFIG.shieldBashDamageMultiplier,
        BRUTE_CONFIG.shieldBashDamageBonus,
        BASH_BOX_HEIGHT_PAD,
      );
    }
    if (enemy.bruteTimer <= 0) {
      enterBrutePhase(enemy, "recover");
      enemy.vx = 0;
    }
  } else if (phase === "recover") {
    enemy.bruteTimer -= 1;
    enemy.vx = 0;
    if (enemy.bruteTimer <= 0) {
      enterBrutePhase(enemy, enemy.bruteShieldBroken ? "brokenAdvance" : "advance");
    }
  } else if (phase === "shieldBreak") {
    enemy.bruteTimer -= 1;
    enemy.vx = 0;
    if (enemy.bruteTimer <= 0) {
      enterBrutePhase(enemy, "brokenRecover");
    }
  } else if (phase === "brokenAdvance") {
    enemy.bruteFacing = facing;
    if (Math.abs(toward) <= BRUTE_CONFIG.triggerDistance) {
      if (bruteActiveAttackCount() < BRUTE_CONFIG.maxActiveAttacks) {
        enterBrutePhase(enemy, "cleave");
        enemy.bruteFacing = facing;
      }
      enemy.vx = 0;
    } else {
      enemy.vx = facing * enemy.bruteBaseSpeed * BRUTE_CONFIG.brokenAdvanceSpeedScale;
    }
  } else if (phase === "cleave") {
    enemy.bruteTimer -= 1;
    enemy.vx = (enemy.bruteFacing ?? facing) * BRUTE_CONFIG.cleaveSlideSpeed;
    if (!enemy.bruteAttackHit && enemy.bruteTimer <= BRUTE_CONFIG.cleaveImpactRemainingFrames) {
      triggerBruteAttackHit(
        enemy,
        CLEAVE_BOX_REACH,
        CLEAVE_BOX_WIDTH_SCALE,
        CLEAVE_BOX_HEIGHT_SCALE,
        BRUTE_CONFIG.cleaveDamageMultiplier,
        BRUTE_CONFIG.cleaveDamageBonus,
      );
    }
    if (enemy.bruteTimer <= 0) {
      enterBrutePhase(enemy, "brokenRecover");
      enemy.vx = 0;
    }
  } else {
    enemy.bruteTimer -= 1;
    enemy.vx = 0;
    if (enemy.bruteTimer <= 0) {
      enterBrutePhase(enemy, "brokenAdvance");
    }
  }

  enemy.x += enemy.vx;
}

function drawBrute(enemy: EnemyState) {
  const phase = enemy.brutePhase ?? "advance";
  const sheet = bruteSheetForPhase(phase);
  const facing = enemy.bruteFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const drawScale = bruteDrawScale(phase);

  if (phase === "advance" || phase === "brokenAdvance") {
    drawEnemyFrame(enemy, sheet, drawScale, bruteLoopAnimSpeed(phase), state.elapsed, facing);
    return;
  }

  const frame = brutePhaseFrame(enemy, phase);
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
    phase === "guard" ? BRUTE_GUARD_FRAME_EFFECT : undefined,
  );
}

export const BRUTE_ARCHETYPE: EnemyArchetype = {
  speed: bruteAdvanceSpeed,
  hpMultiplier: BRUTE_CONFIG.hpMultiplier,
  drawScale: BRUTE_CONFIG.drawScale,
  collisionScaleX: BRUTE_CONFIG.collisionScaleX,
  collisionScaleY: BRUTE_CONFIG.collisionScaleY,
  init: initBrute,
  update: updateBrute,
  draw: drawBrute,
};

export function isBruteSheet(sheetIndex: number) {
  return sheetIndex === BRUTE_SHEET_INDEX && Boolean(ENEMY_SHEETS[BRUTE_SHEET_INDEX]);
}

export function canSpawnBrute() {
  return bruteActiveCount() < BRUTE_CONFIG.maxActiveBrutes;
}
