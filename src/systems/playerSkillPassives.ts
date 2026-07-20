import { LINE_PROJECTILE_EFFECT_CONFIG, SKILL_IDS } from "../constants";
import type { EnemyState, GameState } from "../types/game-state";

export type PlayerHitKnockbackOverride = "disabled" | { direction: number };

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
      (player.skillLevels[SKILL_IDS.lineProjectile] ?? 0)
        < LINE_PROJECTILE_EFFECT_CONFIG.knockbackRequiredLevel
      || !player.equippedSkillIds.includes(SKILL_IDS.lineProjectile)
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
