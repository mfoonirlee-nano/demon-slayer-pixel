import type { GameState } from "../types/game-state";
import { equippedTier, tierAtLeast } from "./equipmentState";
import { grantSkillEnergy, grantUltimateEnergy } from "./equipmentResources";
import {
  applyFamilyResonanceReward,
  triggerCountWithFamilyResonance,
} from "./equipmentResonance";
import {
  BURST_TALISMAN_SKILL_BOSS_ULTIMATE_GAIN,
  FLOW_BLADE_SKILL_REFUND,
  FLOW_BLADE_ULTIMATE_GAIN,
  FLOW_GARB_EXTEND_FRAMES,
  FLOW_TALISMAN_HIT_THRESHOLD,
  FLOW_TALISMAN_REFUND,
  FLOW_TALISMAN_ULTIMATE_GAIN,
} from "./equipmentTuning";

export function applySkillHitEquipmentRefund(
  state: GameState,
  hitCount: number,
  bossHit: boolean,
) {
  let applied = false;
  let flowApplied = false;
  const flowBladeTier = equippedTier(state, "blade", "flow_blade");
  if (flowBladeTier && state.player.flowBladeSurgeSkillTimer > 0 && (hitCount > 0 || bossHit)) {
    if (tierAtLeast(flowBladeTier, "fine")) grantSkillEnergy(state, FLOW_BLADE_SKILL_REFUND);
    if (tierAtLeast(flowBladeTier, "awakened") && bossHit) grantUltimateEnergy(state, FLOW_BLADE_ULTIMATE_GAIN);
    state.player.flowBladeSurgeSkillTimer = 0;
    flowApplied = true;
    applied = true;
  }

  const flowGarbTier = equippedTier(state, "garb", "flow_garb");
  if (
    flowGarbTier
    && tierAtLeast(flowGarbTier, "awakened")
    && state.player.flowGarbTimer > 0
    && hitCount >= 2
  ) {
    state.player.flowGarbTimer += FLOW_GARB_EXTEND_FRAMES;
    flowApplied = true;
    applied = true;
  }

  const flowTalismanTier = equippedTier(state, "talisman", "flow_talisman");
  if (flowTalismanTier) {
    const hitThreshold = triggerCountWithFamilyResonance(state, "flow", FLOW_TALISMAN_HIT_THRESHOLD[flowTalismanTier]);
    const thresholdMet = hitCount >= hitThreshold
      || (tierAtLeast(flowTalismanTier, "fine") && bossHit);
    if (thresholdMet) {
      grantSkillEnergy(state, FLOW_TALISMAN_REFUND[flowTalismanTier]);
      if (tierAtLeast(flowTalismanTier, "awakened")) grantUltimateEnergy(state, FLOW_TALISMAN_ULTIMATE_GAIN);
      flowApplied = true;
      applied = true;
    }
  }

  const burstTalismanTier = equippedTier(state, "talisman", "burst_talisman");
  if (burstTalismanTier && tierAtLeast(burstTalismanTier, "fine") && bossHit) {
    grantUltimateEnergy(state, BURST_TALISMAN_SKILL_BOSS_ULTIMATE_GAIN);
    applyFamilyResonanceReward(state, "burst");
    applied = true;
  }

  if (flowApplied) applyFamilyResonanceReward(state, "flow");
  return applied;
}
