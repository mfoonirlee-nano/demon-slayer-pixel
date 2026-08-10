import { playSfx } from "../../game/audio";
import { PLAYER_COMBAT } from "../../constants";
import { recordBossCoverKill } from "../../game/coverProgress";
import { state } from "../../game/state";
import {
  grantSkillEnergy,
  grantUltimateEnergy,
  queueBossEquipmentChoices,
  recordBossDefeatEquipmentEffects,
} from "../../systems/equipment";
import {
  addRunXp,
  bossXpForLevelUp,
  settleRunXpWithoutUpgradeChoices,
} from "../../systems/progression";
import { advanceEnemyDirectorToAct } from "../../systems/enemyDirector";
import { clearRun } from "../../systems/runLifecycle";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import { spawnBossDefeatSplitEffect } from "./bossDefeatSplitEffect";

function gainBossKillEnergy() {
  grantSkillEnergy(state, PLAYER_COMBAT.bossEnergyGain);
  grantUltimateEnergy(state, PLAYER_COMBAT.bossUltimateEnergyGain);
}

function clearBossSummons() {
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    if (state.enemies[i].spawnSource === "boss") {
      state.enemies.splice(i, 1);
    }
  }
}

export function defeatBoss() {
  if (!state.boss || state.boss.hp > 0) return false;

  spawnBossDefeatSplitEffect(state.boss);
  const defeatedBossId = state.boss.id;
  const clearsRun = defeatedBossId === BOSS_ARCHETYPE_IDS.bloodMoon;
  if (defeatedBossId === BOSS_ARCHETYPE_IDS.mistBone) {
    state.mistBoneFogs.length = 0;
    state.mistBoneSpikes.length = 0;
  } else if (defeatedBossId === BOSS_ARCHETYPE_IDS.deadBell) {
    state.deadBellWaves.length = 0;
    state.deadBellBlades.length = 0;
  }
  state.player.score += PLAYER_COMBAT.bossKillScore;
  recordBossCoverKill();
  gainBossKillEnergy();
  addRunXp(state, bossXpForLevelUp(state.player.runLevel, state.player.runXp));
  recordBossDefeatEquipmentEffects(state);
  if (clearsRun) {
    settleRunXpWithoutUpgradeChoices(state);
    const hasFinalEquipmentChoices = queueBossEquipmentChoices(state, { placeholderReward: false });
    state.pendingVictoryAfterEquipment = hasFinalEquipmentChoices;
  } else {
    queueBossEquipmentChoices(state);
  }
  playSfx(
    defeatedBossId === BOSS_ARCHETYPE_IDS.mistBone
      ? "bossMistBoneDeath"
      : defeatedBossId === BOSS_ARCHETYPE_IDS.deadBell
        ? "bossDeadBellDeath"
        : "bossKill",
  );
  state.bossKills += 1;
  state.boss = null;
  clearBossSummons();
  advanceEnemyDirectorToAct(state.enemyDirector, state.bossKills, state.elapsed);
  if (clearsRun && !state.pendingVictoryAfterEquipment) clearRun(state);
  return true;
}
