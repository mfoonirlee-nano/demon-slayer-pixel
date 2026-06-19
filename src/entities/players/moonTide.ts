import { state } from "../../game/state";
import { BASIC_ATTACK, PLAYER_COMBAT } from "../../constants";
import { moonTideUltimateConfig } from "../../systems/progression";
import { emitHitBurst } from "../particle";

const FULL_CIRCLE = Math.PI * 2;

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
