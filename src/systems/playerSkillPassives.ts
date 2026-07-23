import {
  ARMOR_BREAK_PASSIVE_CONFIG,
  CLOSE_ARC_BASIC_CRESCENT_CONFIG,
  DASH_REPOSITION_PASSIVE_CONFIG,
  GUARD_COUNTER_EFFECT_CONFIG,
  LINE_PROJECTILE_EFFECT_CONFIG,
  SKILL_IDS,
} from "../constants";
import type { EnemyState, GameState } from "../types/game-state";

export type PlayerHitKnockbackOverride = "disabled" | { direction: number };

export function hasLineProjectileKnockbackPassive(state: GameState) {
  const player = state.player;
  return (player.skillLevels[SKILL_IDS.lineProjectile] ?? 0)
      >= LINE_PROJECTILE_EFFECT_CONFIG.knockbackRequiredLevel
    && player.equippedSkillIds.includes(SKILL_IDS.lineProjectile);
}

export function hasCloseArcBasicCrescentPassive(state: GameState) {
  const player = state.player;
  return (player.skillLevels[SKILL_IDS.closeArc] ?? 0)
      >= CLOSE_ARC_BASIC_CRESCENT_CONFIG.requiredSkillLevel
    && player.equippedSkillIds[player.skillIndex] === SKILL_IDS.closeArc;
}

export function hasGuardCounterDamageReductionPassive(state: GameState) {
  const player = state.player;
  return (player.skillLevels[SKILL_IDS.guardCounter] ?? 0)
      >= GUARD_COUNTER_EFFECT_CONFIG.damageReductionRequiredLevel
    && player.equippedSkillIds.includes(SKILL_IDS.guardCounter);
}

export function armorBreakShieldPenetration(state: GameState) {
  const player = state.player;
  const hasPassive = (player.skillLevels[SKILL_IDS.armorBreak] ?? 0)
      >= ARMOR_BREAK_PASSIVE_CONFIG.requiredLevel
    && player.equippedSkillIds.includes(SKILL_IDS.armorBreak);
  return hasPassive ? ARMOR_BREAK_PASSIVE_CONFIG.shieldPenetration : 0;
}

export function dashRepositionMoveSpeedMultiplier(state: GameState) {
  const player = state.player;
  const hasPassive = (player.skillLevels[SKILL_IDS.dashReposition] ?? 0)
      >= DASH_REPOSITION_PASSIVE_CONFIG.requiredLevel
    && player.equippedSkillIds.includes(SKILL_IDS.dashReposition);
  return hasPassive ? DASH_REPOSITION_PASSIVE_CONFIG.moveSpeedMultiplier : 1;
}

export function guardCounterIncomingDamageMultiplier(state: GameState) {
  if (!hasGuardCounterDamageReductionPassive(state)) return 1;

  const config = GUARD_COUNTER_EFFECT_CONFIG;
  const playerLevel = Math.max(1, Math.min(
    state.player.runLevel,
    config.damageReductionMaxPlayerLevel,
  ));
  const levelProgress = (playerLevel - 1) / (config.damageReductionMaxPlayerLevel - 1);
  const damageReduction = config.damageReductionMin
    + (config.damageReductionMax - config.damageReductionMin) * levelProgress;
  return 1 - damageReduction;
}

export function applyPlayerHitKnockback(
  state: GameState,
  enemy: EnemyState,
  override?: PlayerHitKnockbackOverride,
) {
  if (override === "disabled") return false;

  const player = state.player;
  let direction = override?.direction;
  if (direction === undefined) {
    if (
      !hasLineProjectileKnockbackPassive(state)
      || Math.random() >= LINE_PROJECTILE_EFFECT_CONFIG.passiveKnockbackChance
    ) {
      return false;
    }

    const enemyCenterX = enemy.x + enemy.w / 2;
    const playerCenterX = player.x + player.w / 2;
    direction = Math.sign(enemyCenterX - playerCenterX) || player.facing;
  }

  enemy.x += (Math.sign(direction) || player.facing) * enemy.w
    * LINE_PROJECTILE_EFFECT_CONFIG.knockbackDistanceTargetWidths;
  return true;
}
