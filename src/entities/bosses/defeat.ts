import { playSfx } from "../../game/audio";
import { PLAYER_COMBAT } from "../../constants";
import { recordBossCoverKill } from "../../game/coverProgress";
import { state } from "../../game/state";
import {
  createBossEquipmentChoices,
  grantSkillEnergy,
  grantUltimateEnergy,
  recordBossDefeatEquipmentEffects,
} from "../../systems/equipment";
import { addRunXp, bossXp } from "../../systems/progression";
import { bossRespawnTimerAfterDefeat } from "../../systems/runProgression";

function gainBossKillEnergy() {
  grantSkillEnergy(state, PLAYER_COMBAT.bossEnergyGain);
  grantUltimateEnergy(state, PLAYER_COMBAT.bossUltimateEnergyGain);
}

export function defeatBoss() {
  if (!state.boss || state.boss.hp > 0) return false;

  const defeatedBossId = state.boss.id;
  state.player.score += PLAYER_COMBAT.bossKillScore;
  recordBossCoverKill();
  gainBossKillEnergy();
  addRunXp(state, bossXp(state.bossKills));
  recordBossDefeatEquipmentEffects(state);
  state.pendingEquipmentChoices = createBossEquipmentChoices(state);
  playSfx("bossKill");
  state.bossKills += 1;
  state.boss = null;
  state.bossSpawnTimer = bossRespawnTimerAfterDefeat(defeatedBossId);
  return true;
}
