import { PLAYER_COMBAT } from "../constants";
import type { SkillId } from "../types/assets";
import type {
  EquipmentItemId,
  EquipmentSlot,
  GameState,
} from "../types/game-state";
import {
  BURST_BLADE_AWAKENED_SLASH_ATTACK_SCALE,
  BURST_BLADE_BOSS_DAMAGE_MULTIPLIER,
  BURST_BLADE_BOSS_HP_RATIO,
  BURST_BLADE_EXECUTE_ATTACK_MULTIPLIER,
  BURST_GARB_INVINCIBLE_FRAMES,
  BURST_GARB_SPEED_MULTIPLIER,
  BURST_GARB_SPEED_TIMER_FRAMES,
  BURST_TALISMAN_COOLDOWN,
  BURST_TALISMAN_RETAIN_RATIO,
  BURST_TALISMAN_ULTIMATE_GAIN,
  FLOW_BLADE_HITS_REQUIRED,
  FLOW_BLADE_SKILL_DAMAGE_MULTIPLIER,
  FLOW_BLADE_SURGE_SKILL_FRAMES,
  FLOW_GARB_DAMAGE_MULTIPLIER,
  FLOW_GARB_SPEED_MULTIPLIER,
  FLOW_GARB_TIMER_FRAMES,
  HUNT_BLADE_DAMAGE_MULTIPLIER,
  HUNT_BLADE_KILLS_REQUIRED,
  HUNT_BLADE_REACH_BONUS,
  HUNT_BLADE_WATER_TIMER_FRAMES,
  HUNT_GARB_GUARD_DAMAGE_MULTIPLIER,
  HUNT_GARB_SPEED_MULTIPLIER,
  HUNT_GARB_TIMER_FRAMES,
  HUNT_KILL_WINDOW,
  HUNT_TALISMAN_COOLDOWN,
  HUNT_TALISMAN_KILLS_REQUIRED,
  HUNT_TALISMAN_SKILL_GAIN,
  HUNT_TALISMAN_ULTIMATE_GAIN,
  LOW_HP_RATIO,
  RISK_BLADE_AWAKENED_SKILL_MULTIPLIER,
  RISK_BLADE_BASIC_DAMAGE_MULTIPLIER,
  RISK_BLADE_SKILL_DAMAGE_MULTIPLIER,
  RISK_GARB_AWAKENED_INVINCIBLE_FRAMES,
  RISK_GARB_DAMAGE_MULTIPLIER,
  RISK_GARB_FINE_INVINCIBLE_BONUS_FRAMES,
  RISK_TALISMAN_SKILL_GAIN,
  RISK_TALISMAN_ULTIMATE_GAIN,
  SHADOWSTEP_BLADE_DAMAGE_MULTIPLIER,
  SHADOWSTEP_BLADE_QUICK_TIMER_FRAMES,
  SHADOWSTEP_BLADE_REACH_BONUS,
  SHADOWSTEP_BLADE_ULTIMATE_GAIN,
  SHADOWSTEP_DISTANCE_DECAY,
  SHADOWSTEP_DISTANCE_REQUIRED,
  SHADOWSTEP_GARB_DAMAGE_MULTIPLIER,
  SHADOWSTEP_GARB_HURT_SPEED_MULTIPLIER,
  SHADOWSTEP_GARB_HURT_SPEED_TIMER_FRAMES,
  SHADOWSTEP_GARB_KNOCKBACK_MULTIPLIER,
  SHADOWSTEP_GARB_MOVING_FRAMES,
  SHADOWSTEP_QUICK_DISTANCE_REQUIRED,
  TEMPO_BLADE_ATTACK_FRAME_MULTIPLIER,
  TEMPO_BLADE_DAMAGE_MULTIPLIER,
  TEMPO_BLADE_HITS_FOR_NO_PENALTY,
  TEMPO_GARB_KNOCKBACK_MULTIPLIER,
  TEMPO_GARB_RECOVERY_TIMER_FRAMES,
  TEMPO_GARB_SKILL_GAIN,
  TEMPO_GARB_SPEED_MULTIPLIER,
  TEMPO_TALISMAN_AWAKENED_REFUND,
} from "./equipmentTuning";
import { resetSlotRuntimeState } from "./equipmentRuntimeState";
import { applyShadowstepTalismanMovementReward } from "./equipmentMovementRewards";
import {
  applyFamilyResonanceReward,
  cooldownWithFamilyResonance,
  tickFlowResonanceRegeneration,
  triggerCountWithFamilyResonance,
} from "./equipmentResonance";
import {
  equipmentSkillEnergyCost,
  grantSkillEnergy,
  grantUltimateEnergy,
  syncSkillChargesForEquipment,
} from "./equipmentResources";
import {
  addEquipmentToInventory,
  equipmentInventoryTier,
  equipmentItem,
  equippedTier,
  hasEquipment,
  tierAtLeast,
} from "./equipmentState";
import { applyEquipmentStatChange } from "./equipmentStats";

export {
  EQUIPMENT_CHOICE_IDS,
  EQUIPMENT_FAMILY_LABELS,
  EQUIPMENT_ITEMS,
  EQUIPMENT_TIER_LABELS,
} from "./equipmentCatalog";
export {
  addEquipmentToInventory,
  createBossEquipmentChoices,
  equipmentItem,
  equipmentTierForActBand,
  equipmentTierForState,
  hasEquipment,
  queueBossEquipmentChoices,
} from "./equipmentState";
export {
  equipmentSkillEnergyCost,
  grantSkillEnergy,
  grantUltimateEnergy,
  skillEnergyCostForTalisman,
  syncSkillChargesForEquipment,
} from "./equipmentResources";
export { applySkillHitEquipmentRefund } from "./equipmentSkillHit";

type BossLike = {
  hp: number;
  hpMax: number;
};

export function equipEquipment(state: GameState, slot: EquipmentSlot, itemId: EquipmentItemId | null) {
  if (itemId === null) {
    state.equippedEquipment[slot] = null;
    resetSlotRuntimeState(state, slot);
    applyEquipmentStatChange(state);
    return true;
  }

  const item = equipmentItem(itemId, equipmentInventoryTier(state, itemId) ?? "common");
  if (!item || item.slot !== slot || !hasEquipment(state, itemId)) return false;
  if (state.equippedEquipment[slot] !== itemId) resetSlotRuntimeState(state, slot);
  state.equippedEquipment[slot] = itemId;
  applyEquipmentStatChange(state);
  return true;
}

export function chooseBossEquipment(state: GameState, index: number) {
  const choice = state.pendingEquipmentChoices[index];
  if (!choice) return false;

  addEquipmentToInventory(state, choice.id, choice.tier);
  resetSlotRuntimeState(state, choice.slot);
  state.equippedEquipment[choice.slot] = choice.id;
  state.pendingEquipmentChoices = [];
  applyEquipmentStatChange(state);

  if (state.pendingVictoryAfterEquipment) {
    state.pendingVictoryAfterEquipment = false;
    state.pendingUpgradeChoices = [];
    state.gameOver = true;
    state.runCleared = true;
  }
  return true;
}

export function beginBasicAttackEquipmentEffects(state: GameState) {
  const player = state.player;
  const shadowstepTier = equippedTier(state, "blade", "shadowstep_blade");
  const huntTier = equippedTier(state, "blade", "hunt_blade");
  player.shadowstepBladeStrike = shadowstepTier !== null && player.shadowstepBladeReady;
  player.huntBladeStrike = huntTier !== null && (player.huntBladeReady || (
    tierAtLeast(huntTier, "awakened") && player.huntBladeWaterTimer > 0
  ));
  if (player.shadowstepBladeStrike) {
    player.shadowstepBladeReady = false;
    player.shadowstepDistance = 0;
  }
  if (player.huntBladeReady) player.huntBladeReady = false;
}

export function recordBasicAttackHit(state: GameState, target: "enemy" | "boss") {
  const player = state.player;
  const flowTier = equippedTier(state, "blade", "flow_blade");
  if (flowTier) {
    const hitsRequired = triggerCountWithFamilyResonance(state, "flow", FLOW_BLADE_HITS_REQUIRED[flowTier]);
    player.flowBladeHits = Math.min(hitsRequired, player.flowBladeHits + 1);
    if (player.flowBladeHits >= hitsRequired) {
      player.flowBladeSurgeReady = true;
    }
  }

  const shadowstepTier = equippedTier(state, "blade", "shadowstep_blade");
  if (player.shadowstepBladeStrike && shadowstepTier) {
    if (tierAtLeast(shadowstepTier, "awakened")) {
      player.shadowstepBladeQuickTimer = SHADOWSTEP_BLADE_QUICK_TIMER_FRAMES;
      if (target === "boss") grantUltimateEnergy(state, SHADOWSTEP_BLADE_ULTIMATE_GAIN);
    }
  }

  if (equippedTier(state, "blade", "burst_blade") && player.burstBladeExecuteReady) {
    player.burstBladeExecuteReady = false;
  }

  const tempoTier = equippedTier(state, "blade", "tempo_blade");
  if (tempoTier && tierAtLeast(tempoTier, "awakened")) {
    if (player.tempoBladeNoPenaltyReady) {
      player.tempoBladeNoPenaltyReady = false;
      player.tempoBladeHitCount = 0;
    } else {
      player.tempoBladeHitCount += 1;
      if (player.tempoBladeHitCount >= TEMPO_BLADE_HITS_FOR_NO_PENALTY) {
        player.tempoBladeNoPenaltyReady = true;
      }
    }
  }
}

export function consumeSkillCastEquipmentDamageMultiplier(state: GameState) {
  const player = state.player;
  let multiplier = 1;
  const flowTier = equippedTier(state, "blade", "flow_blade");
  if (flowTier && player.flowBladeSurgeReady) {
    multiplier *= FLOW_BLADE_SKILL_DAMAGE_MULTIPLIER[flowTier];
    player.flowBladeHits = 0;
    player.flowBladeSurgeReady = false;
    player.flowBladeSurgeSkillTimer = FLOW_BLADE_SURGE_SKILL_FRAMES;
  }

  const riskTier = equippedTier(state, "blade", "risk_blade");
  if (riskTier && isPlayerLowHp(state)) {
    if (tierAtLeast(riskTier, "fine")) multiplier *= RISK_BLADE_SKILL_DAMAGE_MULTIPLIER;
    if (tierAtLeast(riskTier, "awakened") && player.riskBladeLowHpSkillReady) {
      multiplier *= RISK_BLADE_AWAKENED_SKILL_MULTIPLIER;
      player.riskBladeLowHpSkillReady = false;
    }
  }

  return multiplier;
}

export function applySkillCastEquipmentEffects(state: GameState, skillId?: SkillId) {
  if (state.equippedEquipment.garb === "flow_garb") {
    state.player.flowGarbTimer = FLOW_GARB_TIMER_FRAMES;
    state.player.flowGarbDuration = FLOW_GARB_TIMER_FRAMES;
  }

  const tempoTier = equippedTier(state, "talisman", "tempo_talisman");
  if (!tempoTier || !skillId) return;

  if (
    tierAtLeast(tempoTier, "awakened")
    && state.player.tempoTalismanLastSkillId !== null
    && state.player.tempoTalismanLastSkillId !== skillId
  ) {
    grantSkillEnergy(state, TEMPO_TALISMAN_AWAKENED_REFUND);
  }
  state.player.tempoTalismanLastSkillId = skillId;
}

export function tickEquipmentEffects(state: GameState, deltaSeconds = 0) {
  const player = state.player;
  tickFlowResonanceRegeneration(state, deltaSeconds);
  decrementTimer(player, "flowBladeSurgeSkillTimer");
  decrementTimer(player, "flowGarbTimer");
  decrementTimer(player, "burstGarbSpeedTimer");
  decrementTimer(player, "burstTalismanCooldown");
  decrementTimer(player, "shadowstepBladeQuickTimer");
  decrementTimer(player, "shadowstepGarbMovingTimer");
  decrementTimer(player, "shadowstepGarbHurtSpeedTimer");
  decrementTimer(player, "shadowstepTalismanCooldown");
  decrementTimer(player, "huntKillTimer");
  decrementTimer(player, "huntBladeWaterTimer");
  decrementTimer(player, "huntGarbTimer");
  decrementTimer(player, "huntTalismanCooldown");
  tickTempoGarbRecovery(state);
  if (player.huntKillTimer <= 0) player.huntKillCount = 0;
  if (player.attackTimer <= 0) {
    player.shadowstepBladeStrike = false;
    player.huntBladeStrike = false;
  }
}

export function recordEquipmentMovement(state: GameState, movedDistance: number) {
  const distance = Math.abs(movedDistance);
  const player = state.player;

  if (distance > PLAYER_COMBAT.movementIdleThreshold) {
    const shadowstepTier = equippedTier(state, "blade", "shadowstep_blade");
    if (shadowstepTier && !player.shadowstepBladeReady) {
      player.shadowstepDistance += distance;
      const requiredDistance = tierAtLeast(shadowstepTier, "awakened") && player.shadowstepBladeQuickTimer > 0
        ? SHADOWSTEP_QUICK_DISTANCE_REQUIRED
        : SHADOWSTEP_DISTANCE_REQUIRED;
      if (player.shadowstepDistance >= requiredDistance) {
        player.shadowstepBladeReady = true;
      }
    }
    if (state.equippedEquipment.garb === "shadowstep_garb") {
      player.shadowstepGarbMovingTimer = SHADOWSTEP_GARB_MOVING_FRAMES;
    }
    applyShadowstepTalismanMovementReward(state);
  } else if (!player.shadowstepBladeReady) {
    player.shadowstepDistance = Math.max(0, player.shadowstepDistance - SHADOWSTEP_DISTANCE_DECAY);
  }
}

export function equipmentMoveSpeedMultiplier(state: GameState) {
  let multiplier = 1;
  if (state.equippedEquipment.garb === "flow_garb" && state.player.flowGarbTimer > 0) {
    multiplier *= FLOW_GARB_SPEED_MULTIPLIER;
  }
  const huntGarbTier = equippedTier(state, "garb", "hunt_garb");
  if (huntGarbTier && state.player.huntGarbTimer > 0) {
    multiplier *= HUNT_GARB_SPEED_MULTIPLIER[huntGarbTier];
  }
  if (state.player.burstGarbSpeedTimer > 0) multiplier *= BURST_GARB_SPEED_MULTIPLIER;
  if (state.player.shadowstepGarbHurtSpeedTimer > 0) multiplier *= SHADOWSTEP_GARB_HURT_SPEED_MULTIPLIER;
  if (state.player.tempoGarbRecoveryTimer > 0) multiplier *= TEMPO_GARB_SPEED_MULTIPLIER;
  return multiplier;
}

export function equipmentBasicAttackFrameMultiplier(state: GameState) {
  const tempoTier = equippedTier(state, "blade", "tempo_blade");
  return tempoTier ? TEMPO_BLADE_ATTACK_FRAME_MULTIPLIER[tempoTier] : 1;
}

export function equipmentBasicAttackReachBonus(state: GameState) {
  let reachBonus = 0;
  const shadowstepTier = equippedTier(state, "blade", "shadowstep_blade");
  const huntTier = equippedTier(state, "blade", "hunt_blade");
  if (state.player.shadowstepBladeStrike && shadowstepTier) {
    reachBonus += SHADOWSTEP_BLADE_REACH_BONUS[shadowstepTier];
  }
  if (state.player.huntBladeStrike && huntTier) {
    reachBonus += HUNT_BLADE_REACH_BONUS[huntTier];
  }
  return reachBonus;
}

export function equipmentBasicAttackDamageMultiplier(state: GameState) {
  let multiplier = 1;
  const tempoTier = equippedTier(state, "blade", "tempo_blade");
  if (tempoTier && !state.player.tempoBladeNoPenaltyReady) {
    multiplier *= TEMPO_BLADE_DAMAGE_MULTIPLIER[tempoTier];
  }
  const riskTier = equippedTier(state, "blade", "risk_blade");
  if (riskTier && isPlayerLowHp(state)) {
    multiplier *= RISK_BLADE_BASIC_DAMAGE_MULTIPLIER[riskTier];
  }
  const burstTier = equippedTier(state, "blade", "burst_blade");
  if (burstTier && tierAtLeast(burstTier, "fine") && state.player.burstBladeExecuteReady) {
    multiplier *= BURST_BLADE_EXECUTE_ATTACK_MULTIPLIER;
  }
  const shadowstepTier = equippedTier(state, "blade", "shadowstep_blade");
  if (state.player.shadowstepBladeStrike && shadowstepTier) {
    multiplier *= SHADOWSTEP_BLADE_DAMAGE_MULTIPLIER[shadowstepTier];
  }
  const huntTier = equippedTier(state, "blade", "hunt_blade");
  if (state.player.huntBladeStrike && huntTier) {
    multiplier *= HUNT_BLADE_DAMAGE_MULTIPLIER[huntTier];
  }
  return multiplier;
}

export function equipmentBossDamageMultiplier(state: GameState, boss: BossLike) {
  const burstTier = equippedTier(state, "blade", "burst_blade");
  if (burstTier && boss.hp / Math.max(1, boss.hpMax) <= BURST_BLADE_BOSS_HP_RATIO) {
    if (tierAtLeast(burstTier, "fine") && !state.player.burstBladeExecuteUsed) {
      state.player.burstBladeExecuteReady = true;
      state.player.burstBladeExecuteUsed = true;
    }
    return BURST_BLADE_BOSS_DAMAGE_MULTIPLIER[burstTier];
  }
  return 1;
}

export function equipmentIncomingDamageMultiplier(state: GameState) {
  let multiplier = 1;
  const flowTier = equippedTier(state, "garb", "flow_garb");
  if (flowTier && tierAtLeast(flowTier, "fine") && state.player.flowGarbTimer > 0) {
    multiplier *= FLOW_GARB_DAMAGE_MULTIPLIER;
  }
  const shadowstepTier = equippedTier(state, "garb", "shadowstep_garb");
  if (shadowstepTier && state.player.shadowstepGarbMovingTimer > 0) {
    multiplier *= SHADOWSTEP_GARB_DAMAGE_MULTIPLIER[shadowstepTier];
  }
  const riskTier = equippedTier(state, "garb", "risk_garb");
  if (riskTier && isPlayerLowHp(state)) {
    multiplier *= RISK_GARB_DAMAGE_MULTIPLIER[riskTier];
  }
  const huntTier = equippedTier(state, "garb", "hunt_garb");
  if (huntTier && tierAtLeast(huntTier, "awakened") && state.player.huntGarbGuardReady) {
    multiplier *= HUNT_GARB_GUARD_DAMAGE_MULTIPLIER;
    state.player.huntGarbGuardReady = false;
  }
  return multiplier;
}

export function equipmentKnockbackMultiplier(state: GameState) {
  let multiplier = 1;
  const shadowstepTier = equippedTier(state, "garb", "shadowstep_garb");
  if (
    shadowstepTier
    && tierAtLeast(shadowstepTier, "fine")
    && state.player.shadowstepGarbMovingTimer > 0
  ) {
    multiplier *= SHADOWSTEP_GARB_KNOCKBACK_MULTIPLIER;
  }
  const tempoTier = equippedTier(state, "garb", "tempo_garb");
  if (tempoTier) multiplier *= TEMPO_GARB_KNOCKBACK_MULTIPLIER[tempoTier];
  return multiplier;
}

export function applyFatalDamageEquipmentProtection(state: GameState) {
  const player = state.player;
  const burstTier = equippedTier(state, "garb", "burst_garb");
  if (!burstTier || !state.boss || player.burstGarbProtectionUsed) return false;

  player.burstGarbProtectionUsed = true;
  player.hp = 1;
  player.invincible = Math.max(player.invincible, BURST_GARB_INVINCIBLE_FRAMES);
  if (tierAtLeast(burstTier, "fine")) {
    player.burstGarbSpeedTimer = BURST_GARB_SPEED_TIMER_FRAMES;
  }
  if (tierAtLeast(burstTier, "awakened")) {
    player.vx = 0;
    player.vy = 0;
    grantSkillEnergy(state, equipmentSkillEnergyCost(state));
  }
  return true;
}

export function recordEquipmentHurt(state: GameState) {
  const player = state.player;
  const shadowstepTier = equippedTier(state, "garb", "shadowstep_garb");
  if (
    shadowstepTier
    && tierAtLeast(shadowstepTier, "awakened")
    && player.shadowstepGarbMovingTimer > 0
  ) {
    player.shadowstepGarbHurtSpeedTimer = SHADOWSTEP_GARB_HURT_SPEED_TIMER_FRAMES;
  }

  const tempoTier = equippedTier(state, "garb", "tempo_garb");
  if (tempoTier && tierAtLeast(tempoTier, "fine")) {
    player.tempoGarbRecoveryTimer = TEMPO_GARB_RECOVERY_TIMER_FRAMES;
    player.tempoGarbRecoverySkillGranted = false;
  }

  const riskTier = equippedTier(state, "garb", "risk_garb");
  if (riskTier && tierAtLeast(riskTier, "fine") && isPlayerLowHp(state)) {
    player.invincible += RISK_GARB_FINE_INVINCIBLE_BONUS_FRAMES;
  }
}

export function applyLowHealthEquipmentTriggers(state: GameState) {
  const player = state.player;
  const riskBladeTier = equippedTier(state, "blade", "risk_blade");
  if (
    riskBladeTier
    && tierAtLeast(riskBladeTier, "awakened")
    && !player.riskBladeLowHpSkillUsed
    && isPlayerLowHp(state)
  ) {
    player.riskBladeLowHpSkillReady = true;
    player.riskBladeLowHpSkillUsed = true;
  }

  const riskGarbTier = equippedTier(state, "garb", "risk_garb");
  if (
    riskGarbTier
    && tierAtLeast(riskGarbTier, "awakened")
    && state.boss
    && !player.riskGarbBossLowHpProtectionUsed
    && isPlayerLowHp(state)
  ) {
    player.riskGarbBossLowHpProtectionUsed = true;
    player.invincible = Math.max(player.invincible, RISK_GARB_AWAKENED_INVINCIBLE_FRAMES);
    player.vx = 0;
    player.vy = 0;
  }

  const riskTalismanTier = equippedTier(state, "talisman", "risk_talisman");
  if (riskTalismanTier && !player.riskTalismanTriggered && isPlayerLowHp(state)) {
    player.riskTalismanTriggered = true;
    grantSkillEnergy(state, RISK_TALISMAN_SKILL_GAIN[riskTalismanTier]);
    applyFamilyResonanceReward(state, "risk");
    if (tierAtLeast(riskTalismanTier, "awakened")) {
      player.skillEnergy = Math.max(player.skillEnergy, equipmentSkillEnergyCost(state));
      syncSkillChargesForEquipment(state);
      grantUltimateEnergy(state, RISK_TALISMAN_ULTIMATE_GAIN);
    }
  }
}

export function recordEnemyDefeatEquipmentEffects(state: GameState) {
  const player = state.player;
  const hasHuntEquipment = state.equippedEquipment.blade === "hunt_blade"
    || state.equippedEquipment.garb === "hunt_garb"
    || state.equippedEquipment.talisman === "hunt_talisman";
  if (!hasHuntEquipment) return;

  player.huntKillCount = player.huntKillTimer > 0 ? player.huntKillCount + 1 : 1;
  player.huntKillTimer = HUNT_KILL_WINDOW;

  const huntBladeTier = equippedTier(state, "blade", "hunt_blade");
  const huntBladeKillsRequired = triggerCountWithFamilyResonance(state, "hunt", HUNT_BLADE_KILLS_REQUIRED);
  if (huntBladeTier && player.huntKillCount >= huntBladeKillsRequired) {
    player.huntBladeReady = true;
    if (tierAtLeast(huntBladeTier, "awakened")) {
      player.huntBladeWaterTimer = HUNT_BLADE_WATER_TIMER_FRAMES;
    }
  }
  const huntGarbTier = equippedTier(state, "garb", "hunt_garb");
  if (huntGarbTier) {
    player.huntGarbTimer = HUNT_GARB_TIMER_FRAMES;
    if (tierAtLeast(huntGarbTier, "awakened") && player.huntKillCount >= huntBladeKillsRequired) {
      player.huntGarbGuardReady = true;
    }
  }
  const huntTalismanTier = equippedTier(state, "talisman", "hunt_talisman");
  if (
    huntTalismanTier
    && player.huntKillCount >= triggerCountWithFamilyResonance(state, "hunt", HUNT_TALISMAN_KILLS_REQUIRED)
    && player.huntTalismanCooldown <= 0
  ) {
    grantSkillEnergy(state, HUNT_TALISMAN_SKILL_GAIN[huntTalismanTier]);
    grantUltimateEnergy(state, HUNT_TALISMAN_ULTIMATE_GAIN[huntTalismanTier]);
    applyFamilyResonanceReward(state, "hunt");
    player.huntTalismanCooldown = cooldownWithFamilyResonance(state, "hunt", HUNT_TALISMAN_COOLDOWN);
  }
}

export function recordBossDamageEquipmentEffects(state: GameState, appliedDamage: number) {
  if (appliedDamage <= 0) return;

  const burstTalismanTier = equippedTier(state, "talisman", "burst_talisman");
  if (burstTalismanTier && state.player.burstTalismanCooldown <= 0) {
    grantUltimateEnergy(state, BURST_TALISMAN_ULTIMATE_GAIN[burstTalismanTier]);
    applyFamilyResonanceReward(state, "burst");
    state.player.burstTalismanCooldown = cooldownWithFamilyResonance(state, "burst", BURST_TALISMAN_COOLDOWN);
  }

  const burstBladeTier = equippedTier(state, "blade", "burst_blade");
  if (
    burstBladeTier
    && tierAtLeast(burstBladeTier, "awakened")
    && state.boss
    && !state.player.burstBladeAwakenedSlashUsed
    && state.player.ultimateTimer > 0
    && state.boss.hp / Math.max(1, state.boss.hpMax) <= BURST_BLADE_BOSS_HP_RATIO
  ) {
    state.player.burstBladeAwakenedSlashUsed = true;
    const slashDamage = (state.player.baseAttack + state.player.attackBonus) * BURST_BLADE_AWAKENED_SLASH_ATTACK_SCALE;
    state.boss.hp = Math.max(0, state.boss.hp - slashDamage);
  }
}

export function recordBossDefeatEquipmentEffects(state: GameState) {
  const player = state.player;
  const burstTalismanTier = equippedTier(state, "talisman", "burst_talisman");
  if (burstTalismanTier && tierAtLeast(burstTalismanTier, "awakened") && player.ultimateLevel > 0) {
    player.ultimateEnergy = Math.max(player.ultimateEnergy, player.ultimateEnergyMax * BURST_TALISMAN_RETAIN_RATIO);
  }
  const huntTalismanTier = equippedTier(state, "talisman", "hunt_talisman");
  if (huntTalismanTier && tierAtLeast(huntTalismanTier, "awakened")) {
    player.huntTalismanCooldown = 0;
  }

  player.burstGarbProtectionUsed = false;
  player.burstBladeExecuteReady = false;
  player.burstBladeExecuteUsed = false;
  player.burstBladeAwakenedSlashUsed = false;
  player.riskTalismanTriggered = false;
  player.riskBladeLowHpSkillReady = false;
  player.riskBladeLowHpSkillUsed = false;
  player.riskGarbBossLowHpProtectionUsed = false;
}

function decrementTimer<T extends Record<K, number>, K extends keyof T>(target: T, key: K) {
  if (target[key] > 0) target[key] = Math.max(0, target[key] - 1) as T[K];
}

function tickTempoGarbRecovery(state: GameState) {
  const player = state.player;
  if (player.tempoGarbRecoveryTimer <= 0) return;

  player.tempoGarbRecoveryTimer = Math.max(0, player.tempoGarbRecoveryTimer - 1);
  const tempoTier = equippedTier(state, "garb", "tempo_garb");
  if (
    player.tempoGarbRecoveryTimer === 0
    && tempoTier
    && tierAtLeast(tempoTier, "awakened")
    && !player.tempoGarbRecoverySkillGranted
  ) {
    player.tempoGarbRecoverySkillGranted = true;
    grantSkillEnergy(state, TEMPO_GARB_SKILL_GAIN);
  }
}

export function isPlayerLowHp(state: GameState) {
  return state.player.hp / Math.max(1, state.player.maxHp) <= LOW_HP_RATIO;
}
