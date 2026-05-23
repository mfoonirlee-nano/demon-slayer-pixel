import { state } from "../../state";
import { BRUTE_SHEET_INDEX, BRUTE_SHEETS, ENEMY_SHEETS } from "../../constants";
import type { BrutePhase, EnemyState } from "../../types/game-state";
import { hitbox } from "../../utils";
import { hurtPlayer } from "../player";
import type { EnemyArchetype, EnemySpawnContext } from "./common";
import { drawEnemyFrame, enemyCenterX, enemyDrawScale, enemyFeetY } from "./common";

const BRUTE_CONFIG = {
  triggerDistance: 150,
  advanceBaseSpeed: 0.42,
  advanceRandomSpeed: 0.22,
  advanceSpeedScaleByElapsed: 0.006,
  stompSpeed: 1.9,
  stompDamageMultiplier: 2.35,
  stompDamageBonus: 3,
  braceMinFrames: 26,
  braceFrameJitter: 9,
  stompMinFrames: 14,
  stompFrameJitter: 5,
  recoverMinFrames: 24,
  recoverFrameJitter: 11,
  stompImpactRemainingFrames: 9,
  hpMultiplier: 4.25,
  maxActiveBrutes: 2,
  maxActiveAttacks: 1,
  drawScale: 1.12,
  collisionScaleX: 1.35,
  collisionScaleY: 0.94,
  advanceAnimSpeed: 9,
  braceAnimSpeed: 6,
  stompAnimSpeed: 3,
  recoverAnimSpeed: 8,
} as const;

const FRONT_STOMP_REACH = 52;
const STOMP_BOX_HEIGHT_PAD = 20;
const STOMP_BOX_WIDTH_SCALE = 1.35;
const STOMP_BOX_HEIGHT_SCALE = 1.2;
const STOMP_BOX_FORWARD_RATIO = 0.55;
const STOMP_BOX_BACK_RATIO = 0.45;

function isBrute(enemy: Pick<EnemyState, "sheetIndex">) {
  return enemy.sheetIndex === BRUTE_SHEET_INDEX;
}

function randomFrameCount(min: number, jitter: number) {
  return min + Math.floor(Math.random() * jitter);
}

function playerCenterX() {
  return state.player.x + state.player.w / 2;
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
  return phase === "brace" || phase === "stomp";
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

function bruteAnimSpeed(phase: BrutePhase) {
  if (phase === "brace") return BRUTE_CONFIG.braceAnimSpeed;
  if (phase === "stomp") return BRUTE_CONFIG.stompAnimSpeed;
  if (phase === "recover") return BRUTE_CONFIG.recoverAnimSpeed;
  return BRUTE_CONFIG.advanceAnimSpeed;
}

function enterBrutePhase(enemy: EnemyState, phase: BrutePhase) {
  enemy.brutePhase = phase;
  enemy.bruteStompHit = false;
  if (phase === "brace") {
    enemy.bruteTimer = randomFrameCount(BRUTE_CONFIG.braceMinFrames, BRUTE_CONFIG.braceFrameJitter);
  } else if (phase === "stomp") {
    enemy.bruteTimer = randomFrameCount(BRUTE_CONFIG.stompMinFrames, BRUTE_CONFIG.stompFrameJitter);
  } else if (phase === "recover") {
    enemy.bruteTimer = randomFrameCount(BRUTE_CONFIG.recoverMinFrames, BRUTE_CONFIG.recoverFrameJitter);
  } else {
    enemy.bruteTimer = 0;
  }
}

function bruteStompBox(enemy: EnemyState) {
  const facing = enemy.bruteFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const w = Math.round(enemy.w * STOMP_BOX_WIDTH_SCALE + FRONT_STOMP_REACH);
  const h = Math.round(enemy.h * STOMP_BOX_HEIGHT_SCALE + STOMP_BOX_HEIGHT_PAD);
  return {
    x: facing === 1 ? enemy.x + enemy.w * STOMP_BOX_FORWARD_RATIO : enemy.x + enemy.w * STOMP_BOX_BACK_RATIO - w,
    y: enemyFeetY(enemy) - h,
    w,
    h,
  };
}

function triggerBruteStompHit(enemy: EnemyState) {
  enemy.bruteStompHit = true;
  const box = bruteStompBox(enemy);
  const facing = enemy.bruteFacing ?? (enemy.vx >= 0 ? 1 : -1);
  if (!hitbox(box, state.player)) return;
  hurtPlayer(enemy.damage * BRUTE_CONFIG.stompDamageMultiplier + BRUTE_CONFIG.stompDamageBonus, -facing);
}

function initBrute(enemy: EnemyState, context: EnemySpawnContext) {
  enemy.brutePhase = "advance";
  enemy.bruteTimer = 0;
  enemy.bruteFacing = -context.side;
  enemy.bruteBaseSpeed = context.speed;
  enemy.bruteStompHit = false;
}

function updateBrute(enemy: EnemyState) {
  enemy.brutePhase ??= "advance";
  enemy.bruteTimer ??= 0;
  enemy.bruteFacing ??= enemy.vx >= 0 ? 1 : -1;
  enemy.bruteBaseSpeed ??= bruteAdvanceSpeed();
  enemy.bruteStompHit ??= false;

  const toward = playerCenterX() - enemyCenterX(enemy);
  const facing = bruteFacing(enemy, toward);
  const phase = enemy.brutePhase;

  if (phase === "advance") {
    enemy.bruteFacing = facing;
    if (Math.abs(toward) <= BRUTE_CONFIG.triggerDistance) {
      if (bruteActiveAttackCount() < BRUTE_CONFIG.maxActiveAttacks) {
        enterBrutePhase(enemy, "brace");
      }
      enemy.vx = 0;
    } else {
      enemy.vx = facing * enemy.bruteBaseSpeed;
    }
  } else if (phase === "brace") {
    enemy.bruteFacing = facing;
    enemy.bruteTimer -= 1;
    enemy.vx = 0;
    if (enemy.bruteTimer <= 0) {
      enterBrutePhase(enemy, "stomp");
      enemy.vx = (enemy.bruteFacing ?? facing) * BRUTE_CONFIG.stompSpeed;
    }
  } else if (phase === "stomp") {
    enemy.bruteTimer -= 1;
    enemy.vx = (enemy.bruteFacing ?? facing) * BRUTE_CONFIG.stompSpeed;
    if (!enemy.bruteStompHit && enemy.bruteTimer <= BRUTE_CONFIG.stompImpactRemainingFrames) {
      triggerBruteStompHit(enemy);
    }
    if (enemy.bruteTimer <= 0) {
      enterBrutePhase(enemy, "recover");
      enemy.vx = 0;
    }
  } else {
    enemy.bruteTimer -= 1;
    enemy.vx = 0;
    if (enemy.bruteTimer <= 0) {
      enterBrutePhase(enemy, "advance");
    }
  }

  enemy.x += enemy.vx;
}

function drawBrute(enemy: EnemyState) {
  const phase = enemy.brutePhase ?? "advance";
  const sheet = bruteSheetForPhase(phase);
  const facing = enemy.bruteFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const drawScale = enemyDrawScale(BRUTE_ARCHETYPE);
  drawEnemyFrame(enemy, sheet, drawScale, bruteAnimSpeed(phase), state.elapsed, facing);
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
