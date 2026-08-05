import { RESIDUAL_SPIRIT_CONFIG } from "../constants";
import { enemyArchetypeById } from "./enemyDirector";
import type { EnemyState, GameState, PlayerState } from "../types/game-state";

export function residualSpiritDropAmount(
  enemy: Pick<EnemyState, "id" | "elite" | "splitterVariant">,
) {
  if (enemy.splitterVariant === "child") {
    return RESIDUAL_SPIRIT_CONFIG.splitlingDrop;
  }
  if (enemy.elite) {
    return RESIDUAL_SPIRIT_CONFIG.eliteDrop;
  }

  const tier = enemyArchetypeById(enemy.id).complexityTier;
  return RESIDUAL_SPIRIT_CONFIG.dropByTier[tier];
}

export function storeResidualSpirit(player: PlayerState, amount: number) {
  const availableCapacity = Math.max(
    0,
    RESIDUAL_SPIRIT_CONFIG.maxStored - player.residualSpirit,
  );
  const storedAmount = Math.min(Math.max(0, amount), availableCapacity);
  player.residualSpirit += storedAmount;
  return storedAmount;
}

export function beginResidualSpiritHealing(gameState: GameState) {
  const player = gameState.player;
  if (
    gameState.gameOver
    || player.hp <= 0
    || player.hp >= player.maxHp
    || player.residualSpirit < RESIDUAL_SPIRIT_CONFIG.healCost
    || player.residualSpiritHealTimer > 0
  ) {
    return false;
  }

  player.residualSpiritHealTimer = RESIDUAL_SPIRIT_CONFIG.healChannelSeconds;
  return true;
}

export function updateResidualSpiritHealing(gameState: GameState, dt: number) {
  const player = gameState.player;
  if (player.residualSpiritHealTimer <= 0) return false;

  player.residualSpiritHealTimer = Math.max(0, player.residualSpiritHealTimer - dt);
  if (player.residualSpiritHealTimer > 0) return false;
  if (
    gameState.gameOver
    || player.hp <= 0
    || player.hp >= player.maxHp
    || player.residualSpirit < RESIDUAL_SPIRIT_CONFIG.healCost
  ) {
    return false;
  }

  player.residualSpirit -= RESIDUAL_SPIRIT_CONFIG.healCost;
  player.hp = Math.min(
    player.maxHp,
    player.hp + player.maxHp * RESIDUAL_SPIRIT_CONFIG.healRatio,
  );
  return true;
}
