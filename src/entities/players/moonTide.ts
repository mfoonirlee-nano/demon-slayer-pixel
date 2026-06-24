import { state } from "../../game/state";
import { BASIC_ATTACK, PLAYER_COMBAT } from "../../constants";
import { moonTideUltimateConfig } from "../../systems/progression";
import { emitHitBurst } from "../particle";
import type { UltimateLevel, UltimatePlayerGhostAction, UltimatePlayerGhostSnapshot } from "../../types/game-state";

const FULL_CIRCLE = Math.PI * 2;
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
  maxCountByLevel: Record<1 | 2 | 3, number>;
  intervalByAction: Record<UltimatePlayerGhostAction, number>;
  strengthByAction: Record<UltimatePlayerGhostAction, number>;
};

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

function currentMoonTideLevel(): 1 | 2 | 3 {
  const level = state.player.ultimateLevel;
  if (level === 2 || level === 3) return level;
  return 1;
}

export function moonTidePlayerGhostMaxCount(level: UltimateLevel = state.player.ultimateLevel) {
  const activeLevel = (level === 2 || level === 3 ? level : 1) as 1 | 2 | 3;
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
    + (level === 3 ? MOON_TIDE_PLAYER_GHOST.levelThreeLifeBonus : 0);
  const baseStrength = MOON_TIDE_PLAYER_GHOST.strengthByAction[snapshot.action];
  const levelStrength = baseStrength * (0.82 + level * 0.09);
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
    x: p.x + p.w / 2 - Math.sign(p.vx || p.facing) * 16,
    y: p.y + p.h - 14,
    facing: Math.sign(p.vx || p.facing),
    life,
    maxLife: life,
    width: 34 + Math.min(26, Math.abs(p.vx) * 5),
    height: 7,
    phase: Math.random() * FULL_CIRCLE,
  });
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
  const slashW = Math.max(48, Math.min(92, targetSpread * 0.95));
  const slashH = Math.max(18, Math.min(34, targetSpread * 0.35));
  for (let i = 0; i < config.afterimageCount; i += 1) {
    state.ultimateAfterimageSlashes.push({
      x: hitX + p.facing * (10 + i * 12),
      y: hitY - 8 + (Math.random() - 0.5) * 10,
      w: slashW,
      h: slashH,
      facing: p.facing,
      life,
      maxLife: life,
      power: config.afterimageBurstPower,
    });
  }

  emitHitBurst(hitX, hitY, PLAYER_COMBAT.effects.attackEnemyBurstColor, config.afterimageBurstPower);
  return true;
}
