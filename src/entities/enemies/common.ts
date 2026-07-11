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
import { drawSheetFrame, type SpriteFrameEffect } from "../../rendering/graphics";
import { ctx } from "../../rendering/context";
import { playSfx } from "../../game/audio";
import { state } from "../../game/state";

const HALF_DIVISOR = 2;
const ELITE_BRUTE_PROTECTION_RANGE = 190;
const ELITE_BRUTE_PROTECTION_DAMAGE_SCALE = 0.86;
const MARKER_RING_HEIGHT = 8;
const MARKER_RING_Y_OFFSET = 2;
const MARKER_RING_WIDTH_SCALE = 0.38;
const ENEMY_HURT_SFX_PITCH = {
  chaser: 1.06,
  crawler: 0.94,
  runner: 1.12,
  duelist: 1.02,
  caster: 1.08,
  leaper: 0.9,
  glider: 1.14,
  splitter: 1.04,
  brute: 0.72,
  burrower: 0.82,
  binder: 0.96,
  warden: 0.84,
} satisfies Record<EnemyId, number>;
const STAGE_FRAME_EFFECT: Record<Exclude<ActBand, "intro">, SpriteFrameEffect> = {
  awakened: {
    filter: "brightness(0.94) saturate(1.12) contrast(1.08)",
    tint: {
      color: "rgb(142, 28, 92)",
      alpha: 0.28,
    },
  },
  final: {
    filter: "brightness(0.82) saturate(1.22) contrast(1.12)",
    tint: {
      color: "rgb(126, 16, 34)",
      alpha: 0.38,
    },
  },
};
const ELITE_MARKER_COLOR = "rgba(235, 64, 70, 0.72)";
const ELITE_MARKER_FILL = "rgba(235, 64, 70, 0.18)";
const eliteBruteProtectorCache: {
  elapsed: number;
  enemyCount: number;
  firstEnemy: EnemyState | undefined;
  lastEnemy: EnemyState | undefined;
  protectors: EnemyState[];
} = {
  elapsed: Number.NaN,
  enemyCount: -1,
  firstEnemy: undefined,
  lastEnemy: undefined,
  protectors: [],
};

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
  const enemies = state.enemies;
  const firstEnemy = enemies[0];
  const lastEnemy = enemies[enemies.length - 1];
  // Enemy id/elite are fixed after spawn; elapsed plus roster edges invalidate the per-frame index.
  if (
    eliteBruteProtectorCache.elapsed !== state.elapsed
    || eliteBruteProtectorCache.enemyCount !== enemies.length
    || eliteBruteProtectorCache.firstEnemy !== firstEnemy
    || eliteBruteProtectorCache.lastEnemy !== lastEnemy
  ) {
    eliteBruteProtectorCache.elapsed = state.elapsed;
    eliteBruteProtectorCache.enemyCount = enemies.length;
    eliteBruteProtectorCache.firstEnemy = firstEnemy;
    eliteBruteProtectorCache.lastEnemy = lastEnemy;
    eliteBruteProtectorCache.protectors = enemies.filter((candidate) => (
      candidate.id === "brute" && isEliteEnemy(candidate)
    ));
  }

  for (const protector of eliteBruteProtectorCache.protectors) {
    if (
      protector === enemy
      || !isEliteEnemy(protector)
      || protector.hp <= 0
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

function bruteShieldFacesDamage(enemy: EnemyState, sourceX?: number) {
  if (sourceX === undefined) return true;
  const facing = enemy.bruteFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const sourceDirection = Math.sign(sourceX - enemyCenterX(enemy));
  return sourceDirection === 0 || sourceDirection === facing;
}

function damageBrute(
  enemy: EnemyState,
  damage: number,
  kind: EnemyDamageKind,
  sourceX?: number,
  reflectToPlayer = false,
) {
  if (enemy.bruteShieldBroken || (enemy.bruteShieldHp ?? 0) <= 0) {
    enemy.hp -= damage;
    return damage;
  }

  if (!bruteShieldFacesDamage(enemy, sourceX)) {
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
  enemy.bruteShieldHp = shieldHp - shieldDamage;
  if (enemy.bruteShieldHp <= 0) {
    breakBruteShield(enemy);
  } else if (shieldDamage > 0) {
    playSfx("enemyShieldGuard");
  }
  if (
    reflectToPlayer
    && enemyGrowthStage(enemy) === "final"
    && enemy.brutePhase === "guard"
    && shieldDamage > 0
  ) {
    state.bruteGuardReflections.push({
      absorbedDamage: shieldDamage,
      facing: enemy.bruteFacing ?? (enemy.vx >= 0 ? 1 : -1),
    });
  }
  return shieldDamage;
}

export function damageEnemy(
  enemy: EnemyState,
  damage: number,
  hitCooldown?: number,
  kind: EnemyDamageKind = "normal",
  sourceX?: number,
  reflectToPlayer = false,
) {
  if (enemy.wardenDamageImmune) return 0;

  const hpBeforeDamage = enemy.hp;
  const scaledDamage = (enemy.armorBreakTimer ?? 0) > 0
    ? damage * (enemy.armorBreakMultiplier ?? 1)
    : damage;
  const protectedDamage = kind === "armorBreak"
    ? scaledDamage
    : scaledDamage * eliteBruteProtectionScale(enemy);
  const appliedDamage = enemy.sheetIndex === BRUTE_SHEET_INDEX
    ? damageBrute(enemy, protectedDamage, kind, sourceX, reflectToPlayer)
    : protectedDamage;
  if (enemy.sheetIndex !== BRUTE_SHEET_INDEX) enemy.hp -= appliedDamage;
  if (hitCooldown !== undefined) enemy.hitCd = hitCooldown;
  if (enemy.hp < hpBeforeDamage && enemy.hp > 0) {
    playSfx("enemyHurt", ENEMY_HURT_SFX_PITCH[enemy.id]);
  }
  return appliedDamage;
}

export function enemyAttackDamage(enemy: EnemyState, damage: number) {
  return damage * (enemy.wardenAttackDamageScale ?? 1);
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
    vy: 0,
    onPlatform: null,
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

function enemyGrowthFrameEffect(enemy: EnemyState): SpriteFrameEffect | undefined {
  const stage = enemyGrowthStage(enemy);
  if (stage === "intro") return undefined;
  return STAGE_FRAME_EFFECT[stage];
}

function mergeFrameEffects(
  baseEffect: SpriteFrameEffect | undefined,
  extraEffect: SpriteFrameEffect | undefined,
): SpriteFrameEffect | undefined {
  if (!baseEffect) return extraEffect;
  if (!extraEffect) return baseEffect;
  const filter = [baseEffect.filter, extraEffect.filter].filter(Boolean).join(" ");
  return {
    filter: filter || undefined,
    tint: extraEffect.tint ?? baseEffect.tint,
  };
}

export function drawEnemySheetFrame(
  enemy: EnemyState,
  sheet: SpriteSheet,
  frame: number,
  x: number,
  y: number,
  w: number,
  h: number,
  facing = 1,
  effect?: SpriteFrameEffect,
) {
  drawSheetFrame(
    sheet,
    frame,
    x,
    y,
    w,
    h,
    facing,
    mergeFrameEffects(enemyGrowthFrameEffect(enemy), effect),
  );
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
  drawEnemySheetFrame(enemy, sheet, frame, centerX - drawW / HALF_DIVISOR, feetY - drawH, drawW, drawH, facing);
}

export function drawEnemyEliteMarker(enemy: EnemyState, archetype: EnemyArchetype) {
  if (!ctx) return;
  const elite = isEliteEnemy(enemy);
  if (!elite) return;

  const sheet = ENEMY_SHEETS[enemy.sheetIndex % ENEMY_SHEETS.length] || ENEMY_SHEETS[0];
  const drawScale = enemyDrawScale(archetype);
  const drawW = Math.round(sheet.frameW * drawScale);
  const centerX = enemyCenterX(enemy);
  const feetY = enemyFeetY(enemy);

  ctx.save();
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
  ctx.strokeStyle = ELITE_MARKER_COLOR;
  ctx.stroke();
  ctx.restore();
}
