import { playSfx } from "../../audio";
import { PLAYER_COMBAT, RUNTIME_CONFIG } from "../../constants";
import { recordBossCoverKill } from "../../coverProgress";
import { state } from "../../state";
import { BOSS_ARCHETYPE_IDS } from "./registry";

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

  const defeatedBossId = state.boss.id;
  state.player.score += PLAYER_COMBAT.bossKillScore;
  recordBossCoverKill();
  gainBossKillEnergy();
  playSfx("bossKill");
  state.bossKills += 1;
  state.boss = null;
  state.bossSpawnTimer = defeatedBossId === BOSS_ARCHETYPE_IDS.bloodMoon
    ? RUNTIME_CONFIG.disableBossSpawnTimer
    : PLAYER_COMBAT.skillChargeResetDelay;
  return true;
}
