import type { EquipmentSlot, GameState } from "../types/game-state";

export function resetSlotRuntimeState(state: GameState, slot: EquipmentSlot) {
  const player = state.player;
  if (slot === "blade") {
    player.flowBladeHits = 0;
    player.flowBladeSurgeReady = false;
    player.flowBladeSurgeSkillTimer = 0;
    player.burstBladeExecuteReady = false;
    player.burstBladeExecuteUsed = false;
    player.burstBladeAwakenedSlashUsed = false;
    player.shadowstepDistance = 0;
    player.shadowstepBladeQuickTimer = 0;
    player.shadowstepBladeReady = false;
    player.shadowstepBladeStrike = false;
    player.huntBladeReady = false;
    player.huntBladeStrike = false;
    player.huntBladeWaterTimer = 0;
    player.riskBladeLowHpSkillReady = false;
    player.riskBladeLowHpSkillUsed = false;
    player.tempoBladeHitCount = 0;
    player.tempoBladeNoPenaltyReady = false;
  }
  if (slot === "garb") {
    player.flowGarbTimer = 0;
    player.flowGarbDuration = 0;
    player.burstGarbProtectionUsed = false;
    player.burstGarbSpeedTimer = 0;
    player.shadowstepGarbMovingTimer = 0;
    player.shadowstepGarbHurtSpeedTimer = 0;
    player.huntGarbTimer = 0;
    player.huntGarbGuardReady = false;
    player.riskGarbBossLowHpProtectionUsed = false;
    player.tempoGarbRecoveryTimer = 0;
    player.tempoGarbRecoverySkillGranted = false;
  }
  if (slot === "talisman") {
    player.burstTalismanCooldown = 0;
    player.shadowstepTalismanCooldown = 0;
    player.huntTalismanCooldown = 0;
    player.riskTalismanTriggered = false;
    player.tempoTalismanLastSkillId = null;
  }
}
