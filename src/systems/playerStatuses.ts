import {
  BINDER_TALISMAN_DEBUFF_FRAMES,
  BINDER_TALISMAN_STUN_FRAMES,
  SPIDER_STRING_CAGE_CONFIG,
} from "../constants";
import { activeLanternAshZoneForPlayer } from "../entities/players/lanternAshZone";
import type { GameState, PlayerStatusSnapshot } from "../types/game-state";
import { isPlayerLowHp } from "./equipment";
import { triggerCountWithFamilyResonance } from "./equipmentResonance";
import { equippedTier, tierAtLeast } from "./equipmentState";
import {
  BURST_BLADE_BOSS_HP_RATIO,
  BURST_GARB_SPEED_TIMER_FRAMES,
  FLOW_BLADE_HITS_REQUIRED,
  FLOW_BLADE_SURGE_SKILL_FRAMES,
  FLOW_GARB_TIMER_FRAMES,
  HUNT_BLADE_KILLS_REQUIRED,
  HUNT_BLADE_WATER_TIMER_FRAMES,
  HUNT_GARB_TIMER_FRAMES,
  HUNT_KILL_WINDOW,
  HUNT_TALISMAN_KILLS_REQUIRED,
  SHADOWSTEP_BLADE_QUICK_TIMER_FRAMES,
  SHADOWSTEP_DISTANCE_REQUIRED,
  SHADOWSTEP_GARB_HURT_SPEED_TIMER_FRAMES,
  SHADOWSTEP_GARB_MOVING_FRAMES,
  SHADOWSTEP_QUICK_DISTANCE_REQUIRED,
  TEMPO_BLADE_HITS_FOR_NO_PENALTY,
  TEMPO_GARB_RECOVERY_TIMER_FRAMES,
} from "./equipmentTuning";
import {
  armorBreakShieldPenetration,
  hasCloseArcBasicCrescentPassive,
  hasGuardCounterDamageReductionPassive,
  hasLineProjectileKnockbackPassive,
} from "./playerSkillPassives";
import { moonTideUltimateConfig } from "./progression";

type StatusDetails = Pick<PlayerStatusSnapshot, "stacks" | "maxStacks" | "progress">;

function persistentStatus(
  id: PlayerStatusSnapshot["id"],
  details: Partial<StatusDetails> = {},
): PlayerStatusSnapshot {
  return { id, remainingFrames: null, durationFrames: null, ...details };
}

function timedStatus(
  id: PlayerStatusSnapshot["id"],
  remainingFrames: number,
  durationFrames: number,
  details: Partial<StatusDetails> = {},
): PlayerStatusSnapshot {
  return { id, remainingFrames, durationFrames, ...details };
}

function pushSkillStatuses(state: GameState, statuses: PlayerStatusSnapshot[]) {
  if (hasLineProjectileKnockbackPassive(state)) {
    statuses.push(persistentStatus("line_projectile_knockback"));
  }
  if (hasCloseArcBasicCrescentPassive(state)) {
    statuses.push(persistentStatus("close_arc_basic_crescent"));
  }
  if (hasGuardCounterDamageReductionPassive(state)) {
    statuses.push(persistentStatus("guard_counter_damage_reduction"));
  }
  if (armorBreakShieldPenetration(state) > 0) {
    statuses.push(persistentStatus("armor_break_shield_penetration"));
  }

  const guardCounter = state.guardCounterEffect;
  if (guardCounter && guardCounter.hitsRemaining > 0) {
    const activeWindowRemaining = Math.max(0, guardCounter.activeFrames - guardCounter.elapsed);
    const remainingFrames = Math.max(activeWindowRemaining, guardCounter.barrierFlash);
    if (remainingFrames > 0) {
      statuses.push(timedStatus(
        "guard_counter",
        remainingFrames,
        Math.max(guardCounter.activeFrames, guardCounter.elapsed + guardCounter.barrierFlash),
        { stacks: guardCounter.hitsRemaining, maxStacks: guardCounter.maxHits },
      ));
    }
  }

  if (state.player.ultimateTimer > 0) {
    const ultimateDuration = state.player.ultimateDuration > 0
      ? state.player.ultimateDuration
      : moonTideUltimateConfig(state.player.ultimateLevel).durationFrames;
    statuses.push(timedStatus(
      "moon_tide",
      state.player.ultimateTimer,
      Math.max(state.player.ultimateTimer, ultimateDuration),
    ));
  }
}

function pushFlowStatuses(state: GameState, statuses: PlayerStatusSnapshot[]) {
  const player = state.player;
  const bladeTier = equippedTier(state, "blade", "flow_blade");
  if (bladeTier) {
    const hitsRequired = triggerCountWithFamilyResonance(
      state,
      "flow",
      FLOW_BLADE_HITS_REQUIRED[bladeTier],
    );
    if (player.flowBladeHits > 0 || player.flowBladeSurgeReady) {
      statuses.push(persistentStatus("flow_blade_charge", {
        stacks: player.flowBladeSurgeReady
          ? hitsRequired
          : Math.min(player.flowBladeHits, Math.max(0, hitsRequired - 1)),
        maxStacks: hitsRequired,
      }));
    }
    if (player.flowBladeSurgeSkillTimer > 0) {
      statuses.push(timedStatus(
        "flow_blade_surge_hit_window",
        player.flowBladeSurgeSkillTimer,
        FLOW_BLADE_SURGE_SKILL_FRAMES,
      ));
    }
  }

  if (equippedTier(state, "garb", "flow_garb") && player.flowGarbTimer > 0) {
    statuses.push(timedStatus(
      "flow_garb",
      player.flowGarbTimer,
      Math.max(FLOW_GARB_TIMER_FRAMES, player.flowGarbDuration, player.flowGarbTimer),
    ));
  }
}

function pushBurstStatuses(state: GameState, statuses: PlayerStatusSnapshot[]) {
  const player = state.player;
  const bladeTier = equippedTier(state, "blade", "burst_blade");
  const bossInExecuteZone = state.boss !== null
    && state.boss.hp / Math.max(1, state.boss.hpMax) <= BURST_BLADE_BOSS_HP_RATIO;
  if (bladeTier && bossInExecuteZone) {
    statuses.push(persistentStatus("burst_blade_execute_zone"));
  }
  if (bladeTier && tierAtLeast(bladeTier, "fine") && player.burstBladeExecuteReady) {
    statuses.push(persistentStatus("burst_blade_execute_ready"));
  }

  const garbTier = equippedTier(state, "garb", "burst_garb");
  if (garbTier && state.boss && !player.burstGarbProtectionUsed) {
    statuses.push(persistentStatus("burst_garb_guard_ready"));
  }
  if (garbTier && tierAtLeast(garbTier, "fine") && player.burstGarbSpeedTimer > 0) {
    statuses.push(timedStatus(
      "burst_garb_escape_haste",
      player.burstGarbSpeedTimer,
      BURST_GARB_SPEED_TIMER_FRAMES,
    ));
  }
}

function pushShadowstepStatuses(state: GameState, statuses: PlayerStatusSnapshot[]) {
  const player = state.player;
  const bladeTier = equippedTier(state, "blade", "shadowstep_blade");
  if (bladeTier) {
    const quickChargeActive = tierAtLeast(bladeTier, "awakened")
      && player.shadowstepBladeQuickTimer > 0;
    const requiredDistance = quickChargeActive
      ? SHADOWSTEP_QUICK_DISTANCE_REQUIRED
      : SHADOWSTEP_DISTANCE_REQUIRED;
    if (!player.shadowstepBladeReady && player.shadowstepDistance > 0) {
      statuses.push(persistentStatus("shadowstep_blade_charge", {
        progress: Math.min(1, player.shadowstepDistance / requiredDistance),
      }));
    }
    if (player.shadowstepBladeReady || player.shadowstepBladeStrike) {
      statuses.push(persistentStatus("shadowstep_blade_ready"));
    }
    if (quickChargeActive) {
      statuses.push(timedStatus(
        "shadowstep_blade_quick_charge",
        player.shadowstepBladeQuickTimer,
        SHADOWSTEP_BLADE_QUICK_TIMER_FRAMES,
      ));
    }
  }

  const garbTier = equippedTier(state, "garb", "shadowstep_garb");
  if (garbTier && player.shadowstepGarbMovingTimer > 0) {
    statuses.push(timedStatus(
      "shadowstep_garb_moving_guard",
      player.shadowstepGarbMovingTimer,
      SHADOWSTEP_GARB_MOVING_FRAMES,
    ));
  }
  if (
    garbTier
    && tierAtLeast(garbTier, "awakened")
    && player.shadowstepGarbHurtSpeedTimer > 0
  ) {
    statuses.push(timedStatus(
      "shadowstep_garb_hurt_haste",
      player.shadowstepGarbHurtSpeedTimer,
      SHADOWSTEP_GARB_HURT_SPEED_TIMER_FRAMES,
    ));
  }
}

function huntChainMaxStacks(state: GameState) {
  const thresholds: number[] = [];
  const bladeTier = equippedTier(state, "blade", "hunt_blade");
  const garbTier = equippedTier(state, "garb", "hunt_garb");
  const talismanTier = equippedTier(state, "talisman", "hunt_talisman");
  if (bladeTier || (garbTier && tierAtLeast(garbTier, "awakened"))) {
    thresholds.push(triggerCountWithFamilyResonance(state, "hunt", HUNT_BLADE_KILLS_REQUIRED));
  }
  if (talismanTier) {
    thresholds.push(triggerCountWithFamilyResonance(state, "hunt", HUNT_TALISMAN_KILLS_REQUIRED));
  }
  return thresholds.length > 0 ? Math.max(...thresholds) : undefined;
}

function pushHuntStatuses(state: GameState, statuses: PlayerStatusSnapshot[]) {
  const player = state.player;
  const bladeTier = equippedTier(state, "blade", "hunt_blade");
  const garbTier = equippedTier(state, "garb", "hunt_garb");
  const talismanTier = equippedTier(state, "talisman", "hunt_talisman");
  if ((bladeTier || garbTier || talismanTier) && player.huntKillTimer > 0 && player.huntKillCount > 0) {
    const maxStacks = huntChainMaxStacks(state);
    statuses.push(timedStatus("hunt_kill_chain", player.huntKillTimer, HUNT_KILL_WINDOW, {
      stacks: maxStacks === undefined
        ? player.huntKillCount
        : Math.min(player.huntKillCount, maxStacks),
      ...(maxStacks === undefined ? {} : { maxStacks }),
    }));
  }
  if (bladeTier && (player.huntBladeReady || player.huntBladeStrike)) {
    statuses.push(persistentStatus("hunt_blade_ready"));
  }
  if (bladeTier && tierAtLeast(bladeTier, "awakened") && player.huntBladeWaterTimer > 0) {
    statuses.push(timedStatus(
      "hunt_blade_water",
      player.huntBladeWaterTimer,
      HUNT_BLADE_WATER_TIMER_FRAMES,
    ));
  }
  if (garbTier && player.huntGarbTimer > 0) {
    statuses.push(timedStatus("hunt_garb_haste", player.huntGarbTimer, HUNT_GARB_TIMER_FRAMES));
  }
  if (garbTier && tierAtLeast(garbTier, "awakened") && player.huntGarbGuardReady) {
    statuses.push(persistentStatus("hunt_garb_guard_ready"));
  }
}

function pushRiskStatuses(state: GameState, statuses: PlayerStatusSnapshot[]) {
  const player = state.player;
  const lowHp = isPlayerLowHp(state);
  const bladeTier = equippedTier(state, "blade", "risk_blade");
  if (bladeTier && lowHp) statuses.push(persistentStatus("risk_blade_low_hp"));
  if (
    bladeTier
    && tierAtLeast(bladeTier, "awakened")
    && player.riskBladeLowHpSkillReady
  ) {
    statuses.push(persistentStatus("risk_blade_skill_ready"));
  }

  const garbTier = equippedTier(state, "garb", "risk_garb");
  if (garbTier && lowHp) statuses.push(persistentStatus("risk_garb_low_hp"));
  if (
    garbTier
    && tierAtLeast(garbTier, "awakened")
    && state.boss
    && !player.riskGarbBossLowHpProtectionUsed
  ) {
    statuses.push(persistentStatus("risk_garb_lifeline_ready"));
  }

  if (equippedTier(state, "talisman", "risk_talisman") && !player.riskTalismanTriggered) {
    statuses.push(persistentStatus("risk_talisman_ready"));
  }
}

function pushTempoStatuses(state: GameState, statuses: PlayerStatusSnapshot[]) {
  const player = state.player;
  const bladeTier = equippedTier(state, "blade", "tempo_blade");
  if (
    bladeTier
    && tierAtLeast(bladeTier, "awakened")
    && (player.tempoBladeHitCount > 0 || player.tempoBladeNoPenaltyReady)
  ) {
    statuses.push(persistentStatus("tempo_blade_chain", {
      stacks: player.tempoBladeNoPenaltyReady
        ? TEMPO_BLADE_HITS_FOR_NO_PENALTY
        : Math.min(player.tempoBladeHitCount, TEMPO_BLADE_HITS_FOR_NO_PENALTY),
      maxStacks: TEMPO_BLADE_HITS_FOR_NO_PENALTY,
    }));
  }

  const garbTier = equippedTier(state, "garb", "tempo_garb");
  if (garbTier && tierAtLeast(garbTier, "fine") && player.tempoGarbRecoveryTimer > 0) {
    statuses.push(timedStatus(
      "tempo_garb_recovery",
      player.tempoGarbRecoveryTimer,
      TEMPO_GARB_RECOVERY_TIMER_FRAMES,
    ));
  }

  const talismanTier = equippedTier(state, "talisman", "tempo_talisman");
  const selectedSkillId = player.equippedSkillIds[player.skillIndex] ?? null;
  if (
    talismanTier
    && tierAtLeast(talismanTier, "awakened")
    && player.tempoTalismanLastSkillId !== null
    && selectedSkillId !== null
    && selectedSkillId !== player.tempoTalismanLastSkillId
  ) {
    statuses.push(persistentStatus("tempo_talisman_swap_ready"));
  }
}

function pushEnemyDebuffs(state: GameState, statuses: PlayerStatusSnapshot[]) {
  const player = state.player;
  if (player.spiderSilkSlowTimer > 0) {
    statuses.push(timedStatus(
      "spider_silk_slow",
      player.spiderSilkSlowTimer,
      SPIDER_STRING_CAGE_CONFIG.slowFrames,
    ));
  }
  if (player.binderTalismanSlowTimer > 0) {
    statuses.push(timedStatus(
      "binder_talisman_slow",
      player.binderTalismanSlowTimer,
      BINDER_TALISMAN_DEBUFF_FRAMES,
    ));
  }
  if (player.binderTalismanDamageTimer > 0) {
    statuses.push(timedStatus(
      "binder_talisman_damage",
      player.binderTalismanDamageTimer,
      BINDER_TALISMAN_DEBUFF_FRAMES,
    ));
  }
  if (player.binderTalismanKeyScrambleTimer > 0) {
    statuses.push(timedStatus(
      "binder_talisman_key_scramble",
      player.binderTalismanKeyScrambleTimer,
      BINDER_TALISMAN_DEBUFF_FRAMES,
    ));
  }
  if (player.binderTalismanStunStatusTimer > 0) {
    statuses.push(timedStatus(
      "binder_talisman_stun",
      player.binderTalismanStunStatusTimer,
      BINDER_TALISMAN_DEBUFF_FRAMES,
    ));
  }
  if (player.binderTalismanStunTimer > 0) {
    statuses.push(timedStatus(
      "binder_talisman_stunned",
      player.binderTalismanStunTimer,
      BINDER_TALISMAN_STUN_FRAMES,
    ));
  }

  const ashZone = activeLanternAshZoneForPlayer(state);
  if (ashZone && ashZone.life > 0) {
    statuses.push(timedStatus("lantern_ash_zone", ashZone.life, ashZone.maxLife));
  }
}

export function activePlayerStatuses(state: GameState): PlayerStatusSnapshot[] {
  const statuses: PlayerStatusSnapshot[] = [];
  pushSkillStatuses(state, statuses);
  pushFlowStatuses(state, statuses);
  pushBurstStatuses(state, statuses);
  pushShadowstepStatuses(state, statuses);
  pushHuntStatuses(state, statuses);
  pushRiskStatuses(state, statuses);
  pushTempoStatuses(state, statuses);
  pushEnemyDebuffs(state, statuses);
  return statuses;
}
