import { playSfx } from "../../game/audio";
import { PLAYER_COMBAT } from "../../constants";
import { recordBossCoverKill } from "../../game/coverProgress";
import { state } from "../../game/state";
import { createBossEquipmentChoices } from "../../systems/equipment";
import { addRunXp, bossXp } from "../../systems/progression";
import { bossRespawnTimerAfterDefeat } from "../../systems/runProgression";

function gainBossKillEnergy() {
  const p = state.player;
  p.skillEnergy = Math.min(p.skillEnergyMax, p.skillEnergy + PLAYER_COMBAT.bossEnergyGain);
  p.skillCharges = Math.min(
    p.maxSkillCharges,
    Math.floor(p.skillEnergy / PLAYER_COMBAT.skillCastEnergyCost),
  );
  if (p.ultimateTimer <= 0 && p.ultimateCastTimer <= 0) {
    p.ultimateEnergy = Math.min(p.ultimateEnergyMax, p.ultimateEnergy + PLAYER_COMBAT.bossUltimateEnergyGain);
  }
}

export function defeatBoss() {
  if (!state.boss || state.boss.hp > 0) return false;

  const defeatedBossId = state.boss.id;
  state.player.score += PLAYER_COMBAT.bossKillScore;
  recordBossCoverKill();
  gainBossKillEnergy();
  addRunXp(state, bossXp(state.bossKills));
  state.pendingEquipmentChoices = createBossEquipmentChoices();
  playSfx("bossKill");
  state.bossKills += 1;
  state.boss = null;
  state.bossSpawnTimer = bossRespawnTimerAfterDefeat(defeatedBossId);
  return true;
}
