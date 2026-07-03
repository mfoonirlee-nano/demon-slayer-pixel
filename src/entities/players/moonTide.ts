import { state } from "../../game/state";
import { BASIC_ATTACK, PLAYER_COMBAT } from "../../constants";
import { moonTideUltimateConfig } from "../../systems/progression";
import { emitHitBurst } from "../particle";
import type { UltimateLevel, UltimatePlayerGhostAction, UltimatePlayerGhostSnapshot } from "../../types/game-state";

type MoonTideGhostLevel = 1 | 2 | 3;

const FULL_CIRCLE = Math.PI * 2;
const MAX_MOON_TIDE_GHOST_LEVEL = 3;
const GHOST_STRENGTH_BASE = 0.82;
const GHOST_STRENGTH_PER_LEVEL = 0.09;
const TRAIL_BACK_OFFSET_X = 16;
const TRAIL_Y_OFFSET = 14;
const TRAIL_BASE_WIDTH = 34;
const TRAIL_MAX_SPEED_WIDTH_BONUS = 26;
const TRAIL_SPEED_WIDTH_SCALE = 5;
const TRAIL_HEIGHT = 7;
const AFTERIMAGE_MIN_SLASH_W = 48;
const AFTERIMAGE_MAX_SLASH_W = 92;
const AFTERIMAGE_SLASH_W_SCALE = 0.95;
const AFTERIMAGE_MIN_SLASH_H = 18;
const AFTERIMAGE_MAX_SLASH_H = 34;
const AFTERIMAGE_SLASH_H_SCALE = 0.35;
const AFTERIMAGE_FORWARD_OFFSET = 10;
const AFTERIMAGE_FORWARD_STAGGER = 12;
const AFTERIMAGE_Y_OFFSET = 8;
const AFTERIMAGE_Y_JITTER = 10;
const MAX_MOON_TIDE_TRAILS = Math.ceil(
  PLAYER_COMBAT.ultimateTrailLife / PLAYER_COMBAT.ultimateTrailSpawnInterval,
) + 2;
const MAX_MOON_TIDE_AFTERIMAGE_SLASHES = 24;
const MOON_TIDE_PLAYER_GHOST = {
  lifeByAction: {
    idle: 22,
    move: 14,
    attack: 12,
    skill: 14,
    fallAttack: 12,
  },
  levelThreeLifeBonus: 2,
  hurtPauseFrames: 12,
  maxCountByLevel: {
    1: 3,
    2: 4,
    3: 5,
  },
  intervalByAction: {
    idle: 18,
    move: 6,
    attack: 3,
    skill: 6,
    fallAttack: 4,
  },
  strengthByAction: {
    idle: 0.42,
    move: 0.68,
    attack: 1,
    skill: 0.58,
    fallAttack: 0.78,
  },
} as const satisfies {
  lifeByAction: Record<UltimatePlayerGhostAction, number>;
  levelThreeLifeBonus: number;
  hurtPauseFrames: number;
  maxCountByLevel: Record<MoonTideGhostLevel, number>;
  intervalByAction: Record<UltimatePlayerGhostAction, number>;
  strengthByAction: Record<UltimatePlayerGhostAction, number>;
};

function trimOldest<T>(collection: T[], maxCount: number) {
  if (collection.length > maxCount) {
    collection.splice(0, collection.length - maxCount);
  }
}

export function moonTideActive() {
  return state.player.ultimateTimer > 0;
}

export function currentMoonTideConfig() {
  return moonTideUltimateConfig(state.player.ultimateLevel);
}

export function moonTideMoveSpeedMultiplier() {
  return moonTideActive() ? currentMoonTideConfig().moveSpeedMultiplier : 1;
}

export function moonTideJumpMultiplier() {
  return moonTideActive() ? currentMoonTideConfig().jumpMultiplier : 1;
}

export function moonTideAttackFrames() {
  if (!moonTideActive()) return BASIC_ATTACK.frames;
  return Math.max(1, Math.round(BASIC_ATTACK.frames * currentMoonTideConfig().attackFrameMultiplier));
}

export function moonTideBasicDamageMultiplier() {
  return moonTideActive() ? currentMoonTideConfig().damageMultiplier : 1;
}

export function moonTidePlayerAnimationFrameSpeed(action: UltimatePlayerGhostAction, baseFrameSpeed: number) {
  if (!moonTideActive()) return baseFrameSpeed;
  if (action !== "move" && action !== "idle") return baseFrameSpeed;

  const speedMultiplier = action === "move"
    ? currentMoonTideConfig().moveSpeedMultiplier
    : Math.sqrt(currentMoonTideConfig().moveSpeedMultiplier);
  return Math.max(1, baseFrameSpeed / speedMultiplier);
}

function currentMoonTideLevel(): MoonTideGhostLevel {
  const level = state.player.ultimateLevel;
  if (level === 2 || level === MAX_MOON_TIDE_GHOST_LEVEL) return level;
  return 1;
}

export function moonTidePlayerGhostMaxCount(level: UltimateLevel = state.player.ultimateLevel) {
  const activeLevel = (level === 2 || level === MAX_MOON_TIDE_GHOST_LEVEL ? level : 1) as MoonTideGhostLevel;
  return MOON_TIDE_PLAYER_GHOST.maxCountByLevel[activeLevel];
}

export function recordMoonTidePlayerGhost(snapshot: UltimatePlayerGhostSnapshot) {
  if (state.gameOver) return false;
  if (!moonTideActive()) return false;

  const p = state.player;
  const hurtPauseThreshold = PLAYER_COMBAT.hurtInvincibleFrames - MOON_TIDE_PLAYER_GHOST.hurtPauseFrames;
  if (p.invincible > hurtPauseThreshold) return false;

  const interval = MOON_TIDE_PLAYER_GHOST.intervalByAction[snapshot.action];
  if (p.ultimateTimer % interval !== 0) return false;
  if (snapshot.action === "idle" && state.ultimatePlayerGhosts.some((ghost) => ghost.action === "idle")) {
    return false;
  }

  const level = currentMoonTideLevel();
  const maxLife = MOON_TIDE_PLAYER_GHOST.lifeByAction[snapshot.action]
    + (level === MAX_MOON_TIDE_GHOST_LEVEL ? MOON_TIDE_PLAYER_GHOST.levelThreeLifeBonus : 0);
  const baseStrength = MOON_TIDE_PLAYER_GHOST.strengthByAction[snapshot.action];
  const levelStrength = baseStrength * (GHOST_STRENGTH_BASE + level * GHOST_STRENGTH_PER_LEVEL);
  state.ultimatePlayerGhosts.push({
    ...snapshot,
    life: maxLife,
    maxLife,
    strength: levelStrength,
  });

  const maxCount = moonTidePlayerGhostMaxCount(level);
  while (state.ultimatePlayerGhosts.length > maxCount) {
    state.ultimatePlayerGhosts.shift();
  }

  return true;
}

export function spawnMoonTideTrail() {
  const p = state.player;
  if (!moonTideActive()) return;
  if (Math.abs(p.vx) <= PLAYER_COMBAT.movementIdleThreshold) return;
  if (p.ultimateTimer % PLAYER_COMBAT.ultimateTrailSpawnInterval !== 0) return;

  const life = PLAYER_COMBAT.ultimateTrailLife;
  state.ultimateTrails.push({
    x: p.x + p.w / 2 - Math.sign(p.vx || p.facing) * TRAIL_BACK_OFFSET_X,
    y: p.y + p.h - TRAIL_Y_OFFSET,
    facing: Math.sign(p.vx || p.facing),
    life,
    maxLife: life,
    width: TRAIL_BASE_WIDTH + Math.min(TRAIL_MAX_SPEED_WIDTH_BONUS, Math.abs(p.vx) * TRAIL_SPEED_WIDTH_SCALE),
    height: TRAIL_HEIGHT,
    phase: Math.random() * FULL_CIRCLE,
  });
  trimOldest(state.ultimateTrails, MAX_MOON_TIDE_TRAILS);
}

export function triggerMoonTideAfterimageHit(
  hitX: number,
  hitY: number,
  targetSpread: number,
  applyDamage: (damage: number) => void,
) {
  if (!moonTideActive()) return false;

  const config = currentMoonTideConfig();
  if (Math.random() > config.afterimageChance) return false;

  const p = state.player;
  const damage = (state.player.baseAttack + state.player.attackBonus) * config.afterimageDamageMultiplier;
  applyDamage(damage);

  const life = PLAYER_COMBAT.ultimateAfterimageLife;
  const slashW = Math.max(AFTERIMAGE_MIN_SLASH_W, Math.min(AFTERIMAGE_MAX_SLASH_W, targetSpread * AFTERIMAGE_SLASH_W_SCALE));
  const slashH = Math.max(AFTERIMAGE_MIN_SLASH_H, Math.min(AFTERIMAGE_MAX_SLASH_H, targetSpread * AFTERIMAGE_SLASH_H_SCALE));
  for (let i = 0; i < config.afterimageCount; i += 1) {
    state.ultimateAfterimageSlashes.push({
      x: hitX + p.facing * (AFTERIMAGE_FORWARD_OFFSET + i * AFTERIMAGE_FORWARD_STAGGER),
      y: hitY - AFTERIMAGE_Y_OFFSET + (Math.random() - 0.5) * AFTERIMAGE_Y_JITTER,
      w: slashW,
      h: slashH,
      facing: p.facing,
      life,
      maxLife: life,
      power: config.afterimageBurstPower,
    });
  }
  trimOldest(state.ultimateAfterimageSlashes, MAX_MOON_TIDE_AFTERIMAGE_SLASHES);

  emitHitBurst(hitX, hitY, PLAYER_COMBAT.effects.attackEnemyBurstColor, config.afterimageBurstPower);
  return true;
}
