import { playTone } from "../../audio";
import { PLAYER_COMBAT } from "../../constants";
import { recordBossCoverKill } from "../../coverProgress";
import { state } from "../../state";

function gainBossKillEnergy() {
  const p = state.player;
  p.skillEnergy = Math.min(p.skillEnergyMax, p.skillEnergy + PLAYER_COMBAT.bossEnergyGain);
  p.skillCharges = Math.min(
    p.maxSkillCharges,
    Math.floor(p.skillEnergy / PLAYER_COMBAT.skillCastEnergyCost),
  );
  p.ultimateEnergy = Math.min(p.ultimateEnergyMax, p.ultimateEnergy + PLAYER_COMBAT.bossUltimateEnergyGain);
}

export function defeatBoss() {
  if (!state.boss || state.boss.hp > 0) return false;

  state.player.score += PLAYER_COMBAT.bossKillScore;
  recordBossCoverKill();
  gainBossKillEnergy();
  playTone(
    PLAYER_COMBAT.tones.bossKill.frequency,
    PLAYER_COMBAT.tones.bossKill.duration,
    "triangle",
    PLAYER_COMBAT.tones.bossKill.volume,
  );
  state.bossKills += 1;
  state.boss = null;
  state.bossSpawnTimer = PLAYER_COMBAT.skillChargeResetDelay;
  return true;
}
