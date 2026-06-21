import { PLAYER_COMBAT } from "../../constants";
import { recordEnemyCoverKill } from "../../game/coverProgress";
import { state } from "../../game/state";
import type { EnemyState } from "../../types/game-state";
import { playSfx } from "../../game/audio";
import type { EnemyDefeatRewardKind } from "./common";
import { enemyArchetypeForSheet } from "./registry";
import { addRunXp, enemyXp } from "../../systems/progression";
import { grantSkillEnergy, grantUltimateEnergy, recordEnemyDefeatEquipmentEffects } from "../../systems/equipment";

const SPLITLING_SKILL_ENERGY_GAIN = 2;
const SPLITLING_ULTIMATE_ENERGY_GAIN = 0.5;

function gainEnergy(skillAmount: number, ultimateAmount: number) {
  grantSkillEnergy(state, skillAmount);
  grantUltimateEnergy(state, ultimateAmount);
}

function applyEnemyDefeatReward(enemy: EnemyState, reward: EnemyDefeatRewardKind) {
  if (reward === "none") return;

  if (enemy.splitterVariant === "child") {
    gainEnergy(SPLITLING_SKILL_ENERGY_GAIN, SPLITLING_ULTIMATE_ENERGY_GAIN);
    addRunXp(state, enemyXp(enemy));
    return;
  }

  state.player.score += reward === "attack"
    ? PLAYER_COMBAT.attackKillScore
    : PLAYER_COMBAT.enemyKillScore;
  if (reward !== "enemyNoCover") {
    recordEnemyCoverKill();
  }
  gainEnergy(PLAYER_COMBAT.enemyEnergyGain, PLAYER_COMBAT.enemyUltimateEnergyGain);
  addRunXp(state, enemyXp(enemy));
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
    if (reward !== "none") recordEnemyDefeatEquipmentEffects(state);
  };
  const remove = () => {
    state.enemies.splice(index, 1);
  };

  const archetype = enemyArchetypeForSheet(enemy.sheetIndex);
  if (archetype.onDefeated?.(enemy, { index, reward, applyReward, remove })) {
    return true;
  }

  playSfx("enemyDefeat", enemy.splitterVariant === "child" ? 1.25 : 1);
  applyReward();
  remove();
  return true;
}
