import {
  WIDTH,
  GROUND_Y,
  ENEMY_SHEETS,
  ENEMY_DRAW_SCALE,
  ENEMY_CONFIG,
  BRUTE_SHEET_INDEX,
} from "../../constants";
import type { SpriteSheet } from "../../types/assets";
import type { ActBand, EnemyId, EnemySpawnSource, EnemyState } from "../../types/game-state";
import { frameIndex } from "../../game/utils";
import { drawSheetFrame } from "../../rendering/graphics";
import { ctx } from "../../rendering/context";
import { playSfx } from "../../game/audio";
import { state } from "../../game/state";

const HALF_DIVISOR = 2;
const ELITE_BRUTE_PROTECTION_RANGE = 190;
const ELITE_BRUTE_PROTECTION_DAMAGE_SCALE = 0.86;
const MARKER_LINE_WIDTH = 2;
const MARKER_INSET = 4;
const MARKER_RING_HEIGHT = 8;
const MARKER_RING_Y_OFFSET = 2;
const MARKER_RING_WIDTH_SCALE = 0.38;
const STAGE_MARKER_COLOR: Record<ActBand, string> = {
  intro: "rgba(0, 0, 0, 0)",
  awakened: "rgba(148, 72, 190, 0.42)",
  final: "rgba(190, 42, 58, 0.52)",
};
const ELITE_MARKER_COLOR = "rgba(235, 64, 70, 0.72)";
const ELITE_MARKER_FILL = "rgba(235, 64, 70, 0.18)";

export type EnemySpawnContext = {
  enemyId: EnemyId;
  spawnSource: EnemySpawnSource;
  spawnCost: number;
  growthStage?: ActBand;
  elite?: boolean;
  side: number;
  sheetIndex: number;
  speed: number;
  damage: number;
  baseHp: number;
};

export type EnemyArchetype = {
  speed: () => number;
  hpMultiplier?: number;
  drawScale?: number;
  collisionScaleX?: number;
  collisionScaleY?: number;
  init?: (enemy: EnemyState, context: EnemySpawnContext) => void;
  update: (enemy: EnemyState) => void;
  draw: (enemy: EnemyState) => void;
  onDefeated?: (enemy: EnemyState, context: EnemyDefeatContext) => boolean;
  contactDamageDisabled?: (enemy: EnemyState) => boolean;
  shouldRemove?: (enemy: EnemyState) => boolean;
};

export type EnemyDamageKind = "normal" | "ultimate" | "armorBreak";
export type EnemyDefeatRewardKind = "none" | "enemy" | "enemyNoCover" | "attack";
export const BRUTE_SHIELD_BREAK_FRAMES = 34;

export type EnemyDefeatContext = {
  index: number;
  reward: EnemyDefeatRewardKind;
  applyReward: () => void;
  remove: () => void;
};

function breakBruteShield(enemy: EnemyState) {
  if (enemy.bruteShieldBroken) return;
  playSfx("enemyShieldBreak");
  enemy.bruteShieldHp = 0;
  enemy.bruteShieldBroken = true;
  enemy.brutePhase = "shieldBreak";
  enemy.bruteTimer = BRUTE_SHIELD_BREAK_FRAMES;
  enemy.bruteAttackHit = false;
  enemy.vx = 0;
}

export function enemyGrowthStage(enemy: EnemyState): ActBand {
  return enemy.growthStage ?? "intro";
}

export function hasAwakenedGrowth(enemy: EnemyState) {
  return enemyGrowthStage(enemy) !== "intro";
}

export function isEliteEnemy(enemy: EnemyState) {
  return enemy.elite === true;
}

function eliteBruteProtectionScale(enemy: EnemyState) {
  for (const protector of state.enemies) {
    if (
      protector === enemy
      || protector.id !== "brute"
      || !isEliteEnemy(protector)
      || protector.bruteShieldBroken
      || (protector.bruteShieldHp ?? 0) <= 0
    ) {
      continue;
    }

    if (Math.abs(enemyCenterX(protector) - enemyCenterX(enemy)) <= ELITE_BRUTE_PROTECTION_RANGE) {
      return ELITE_BRUTE_PROTECTION_DAMAGE_SCALE;
    }
  }

  return 1;
}

function damageBrute(enemy: EnemyState, damage: number, kind: EnemyDamageKind) {
  if (enemy.bruteShieldBroken || (enemy.bruteShieldHp ?? 0) <= 0) {
    enemy.hp -= damage;
    return damage;
  }

  if (kind === "armorBreak") {
    const shieldHp = enemy.bruteShieldHp ?? 0;
    breakBruteShield(enemy);
    return shieldHp;
  }

  const shieldHp = enemy.bruteShieldHp ?? 0;
  const shieldDamage = Math.min(damage, shieldHp);
  const bodyDamage = Math.max(0, damage - shieldHp);
  enemy.bruteShieldHp = shieldHp - shieldDamage;
  if (enemy.bruteShieldHp <= 0) breakBruteShield(enemy);
  enemy.hp -= bodyDamage;
  return shieldDamage + bodyDamage;
}

export function damageEnemy(
  enemy: EnemyState,
  damage: number,
  hitCooldown?: number,
  kind: EnemyDamageKind = "normal",
) {
  const scaledDamage = (enemy.armorBreakTimer ?? 0) > 0
    ? damage * (enemy.armorBreakMultiplier ?? 1)
    : damage;
  const protectedDamage = kind === "armorBreak"
    ? scaledDamage
    : scaledDamage * eliteBruteProtectionScale(enemy);
  const appliedDamage = enemy.sheetIndex === BRUTE_SHEET_INDEX
    ? damageBrute(enemy, protectedDamage, kind)
    : protectedDamage;
  if (enemy.sheetIndex !== BRUTE_SHEET_INDEX) enemy.hp -= appliedDamage;
  if (hitCooldown !== undefined) enemy.hitCd = hitCooldown;
  return appliedDamage;
}

export function commonEnemySpeed() {
  return ENEMY_CONFIG.baseSpeed + Math.random() * ENEMY_CONFIG.randomSpeed;
}

export function enemyDamage(elapsed: number) {
  return Math.min(ENEMY_CONFIG.maxDamage, ENEMY_CONFIG.baseDamage + elapsed * ENEMY_CONFIG.damageScaleByElapsed);
}

export function enemyBaseHp(elapsed: number) {
  return ENEMY_CONFIG.baseHp + elapsed * ENEMY_CONFIG.hpScaleByElapsed;
}

export function enemyDrawScale(archetype: EnemyArchetype) {
  return ENEMY_DRAW_SCALE * (archetype.drawScale ?? 1);
}

export function enemyCollisionSize(sheetIndex: number, archetype: EnemyArchetype) {
  const sheet = ENEMY_SHEETS[sheetIndex % ENEMY_SHEETS.length] || ENEMY_SHEETS[0];
  const drawScale = enemyDrawScale(archetype);
  const drawW = Math.round(sheet.frameW * drawScale);
  const drawH = Math.round(sheet.frameH * drawScale);
  return {
    w: Math.round(drawW * ENEMY_CONFIG.collisionScaleX * (archetype.collisionScaleX ?? 1)),
    h: Math.round(drawH * ENEMY_CONFIG.collisionScaleY * (archetype.collisionScaleY ?? 1)),
  };
}

export function createEnemyState(context: EnemySpawnContext, archetype: EnemyArchetype): EnemyState {
  const size = enemyCollisionSize(context.sheetIndex, archetype);
  return {
    id: context.enemyId,
    spawnSource: context.spawnSource,
    spawnCost: context.spawnCost,
    growthStage: context.growthStage ?? "intro",
    elite: context.elite ?? false,
    aiState: "spawn",
    aiTimer: 0,
    x: context.side === 1 ? WIDTH + ENEMY_CONFIG.spawnOffsetRight : ENEMY_CONFIG.spawnOffsetLeft,
    y: GROUND_Y - size.h,
    w: size.w,
    h: size.h,
    vx: -context.side * context.speed,
    hp: context.baseHp * (archetype.hpMultiplier ?? 1),
    damage: context.damage,
    hitCd: 0,
    animSeed: Math.floor(Math.random() * ENEMY_CONFIG.animSeedMax),
    sheetIndex: context.sheetIndex,
  };
}

export function enemyCenterX(enemy: EnemyState) {
  return enemy.x + enemy.w / HALF_DIVISOR;
}

export function enemyFeetY(enemy: EnemyState) {
  return enemy.y + enemy.h;
}

export function steerEnemyTowardX(enemy: EnemyState, targetX: number) {
  const toward = targetX - enemyCenterX(enemy);
  enemy.vx += Math.sign(toward) * ENEMY_CONFIG.steeringForce;
  enemy.vx = Math.max(-ENEMY_CONFIG.maxAbsVelocity, Math.min(ENEMY_CONFIG.maxAbsVelocity, enemy.vx));
}

export function drawEnemyFrame(
  enemy: EnemyState,
  sheet: SpriteSheet,
  drawScale: number,
  animSpeed: number,
  elapsed: number,
  facing: number,
) {
  const frame = frameIndex(sheet.count, animSpeed, elapsed, enemy.animSeed);
  const drawW = Math.round(sheet.frameW * drawScale);
  const drawH = Math.round(sheet.frameH * drawScale);
  const centerX = enemyCenterX(enemy);
  const feetY = enemyFeetY(enemy);
  drawSheetFrame(sheet, frame, centerX - drawW / HALF_DIVISOR, feetY - drawH, drawW, drawH, facing);
}

export function drawEnemyGrowthMarker(enemy: EnemyState, archetype: EnemyArchetype) {
  if (!ctx) return;
  const elite = isEliteEnemy(enemy);
  const stage = enemyGrowthStage(enemy);
  if (!elite && stage === "intro") return;

  const sheet = ENEMY_SHEETS[enemy.sheetIndex % ENEMY_SHEETS.length] || ENEMY_SHEETS[0];
  const drawScale = enemyDrawScale(archetype);
  const drawW = Math.round(sheet.frameW * drawScale);
  const drawH = Math.round(sheet.frameH * drawScale);
  const centerX = enemyCenterX(enemy);
  const feetY = enemyFeetY(enemy);
  const markerColor = elite ? ELITE_MARKER_COLOR : STAGE_MARKER_COLOR[stage];

  ctx.save();
  if (elite) {
    ctx.fillStyle = ELITE_MARKER_FILL;
    ctx.beginPath();
    ctx.ellipse(
      centerX,
      feetY - MARKER_RING_Y_OFFSET,
      drawW * MARKER_RING_WIDTH_SCALE,
      MARKER_RING_HEIGHT,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.strokeStyle = markerColor;
  ctx.lineWidth = MARKER_LINE_WIDTH;
  ctx.strokeRect(
    centerX - drawW / HALF_DIVISOR + MARKER_INSET,
    feetY - drawH + MARKER_INSET,
    Math.max(1, drawW - MARKER_INSET * 2),
    Math.max(1, drawH - MARKER_INSET * 2),
  );
  ctx.restore();
}
