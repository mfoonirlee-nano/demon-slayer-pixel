import { PLAYER_COMBAT } from "../../constants";
import { recordEnemyCoverKill } from "../../coverProgress";
import { state } from "../../state";
import type { EnemyState } from "../../types/game-state";
import type { EnemyDefeatRewardKind } from "./common";
import { enemyArchetypeForSheet } from "./registry";

const SPLITLING_SKILL_ENERGY_GAIN = 2;
const SPLITLING_ULTIMATE_ENERGY_GAIN = 0.5;

function syncSkillCharges() {
  const player = state.player;
  player.skillCharges = Math.min(
    player.maxSkillCharges,
    Math.floor(player.skillEnergy / PLAYER_COMBAT.skillCastEnergyCost),
  );
}

function gainEnergy(skillAmount: number, ultimateAmount: number) {
  const player = state.player;
  player.skillEnergy = Math.min(player.skillEnergyMax, player.skillEnergy + skillAmount);
  player.ultimateEnergy = Math.min(player.ultimateEnergyMax, player.ultimateEnergy + ultimateAmount);
  syncSkillCharges();
}

function applyEnemyDefeatReward(enemy: EnemyState, reward: EnemyDefeatRewardKind) {
  if (reward === "none") return;

  if (enemy.splitterVariant === "child") {
    gainEnergy(SPLITLING_SKILL_ENERGY_GAIN, SPLITLING_ULTIMATE_ENERGY_GAIN);
    return;
  }

  state.player.score += reward === "attack"
    ? PLAYER_COMBAT.attackKillScore
    : PLAYER_COMBAT.enemyKillScore;
  if (reward !== "enemyNoCover") {
    recordEnemyCoverKill();
  }
  gainEnergy(PLAYER_COMBAT.enemyEnergyGain, PLAYER_COMBAT.enemyUltimateEnergyGain);
}

export function resolveEnemyDefeat(
  enemy: EnemyState,
  index: number,
  reward: EnemyDefeatRewardKind,
) {
  if (enemy.hp > 0) return false;

  let rewardApplied = false;
  const applyReward = () => {
    if (rewardApplied) return;
    rewardApplied = true;
    applyEnemyDefeatReward(enemy, reward);
  };
  const remove = () => {
    state.enemies.splice(index, 1);
  };

  const archetype = enemyArchetypeForSheet(enemy.sheetIndex);
  if (archetype.onDefeated?.(enemy, { index, reward, applyReward, remove })) {
    return true;
  }

  applyReward();
  remove();
  return true;
}
