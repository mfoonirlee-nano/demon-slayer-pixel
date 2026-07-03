import type { GameState } from "../types/game-state";
import { equippedTier, tierAtLeast } from "./equipmentState";
import { grantSkillEnergy, grantUltimateEnergy } from "./equipmentResources";
import { applyFamilyResonanceReward } from "./equipmentResonance";
import {
  SHADOWSTEP_TALISMAN_BOSS_RADIUS_MULTIPLIER,
  SHADOWSTEP_TALISMAN_COOLDOWN,
  SHADOWSTEP_TALISMAN_RADIUS,
  SHADOWSTEP_TALISMAN_SKILL_GAIN,
  SHADOWSTEP_TALISMAN_ULTIMATE_GAIN,
} from "./equipmentTuning";

const FINE_SHADOWSTEP_TALISMAN_MAX_ENEMY_BONUS = 3;

export function applyShadowstepTalismanMovementReward(state: GameState) {
  const player = state.player;
  const shadowstepTier = equippedTier(state, "talisman", "shadowstep_talisman");
  if (!shadowstepTier || player.shadowstepTalismanCooldown > 0) return;

  const playerCenterX = player.x + player.w / 2;
  const playerCenterY = player.y + player.h / 2;
  const nearEnemyCount = state.enemies.filter((enemy) => (
    Math.abs(enemy.x + enemy.w / 2 - playerCenterX) <= SHADOWSTEP_TALISMAN_RADIUS
    && Math.abs(enemy.y + enemy.h / 2 - playerCenterY) <= SHADOWSTEP_TALISMAN_RADIUS
  )).length;
  const bossNearbyRadius = SHADOWSTEP_TALISMAN_RADIUS * SHADOWSTEP_TALISMAN_BOSS_RADIUS_MULTIPLIER;
  const bossNearby = state.boss
    ? Math.abs(state.boss.x + state.boss.w / 2 - playerCenterX) <= bossNearbyRadius
      && Math.abs(state.boss.y + state.boss.h / 2 - playerCenterY) <= bossNearbyRadius
    : false;

  if (nearEnemyCount <= 0 && !bossNearby) return;

  const enemyBonus = tierAtLeast(shadowstepTier, "fine")
    ? Math.min(nearEnemyCount, FINE_SHADOWSTEP_TALISMAN_MAX_ENEMY_BONUS)
    : 0;
  grantSkillEnergy(state, SHADOWSTEP_TALISMAN_SKILL_GAIN[shadowstepTier] + enemyBonus);
  if (tierAtLeast(shadowstepTier, "awakened") && bossNearby) {
    grantUltimateEnergy(state, SHADOWSTEP_TALISMAN_ULTIMATE_GAIN);
  }
  applyFamilyResonanceReward(state, "shadowstep");
  player.shadowstepTalismanCooldown = SHADOWSTEP_TALISMAN_COOLDOWN;
}
