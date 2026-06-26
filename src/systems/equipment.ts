import { PLAYER_COMBAT } from "../constants";
import type {
  EquipmentItemId,
  EquipmentItemState,
  EquipmentSlot,
  GameState,
} from "../types/game-state";
import {
  EQUIPMENT_CHOICE_IDS,
  EQUIPMENT_IDS_BY_SLOT,
  EQUIPMENT_ITEMS,
} from "./equipmentCatalog";

export {
  EQUIPMENT_CHOICE_IDS,
  EQUIPMENT_FAMILY_LABELS,
  EQUIPMENT_ITEMS,
} from "./equipmentCatalog";

type BossLike = {
  hp: number;
  hpMax: number;
};

const EQUIPMENT_SLOTS: EquipmentSlot[] = ["blade", "garb", "talisman"];
const BOSS_EQUIPMENT_CHOICE_COUNT = 3;
const LOW_HP_RATIO = 0.35;
const FLOW_BLADE_HITS_REQUIRED = 4;
const FLOW_BLADE_SKILL_DAMAGE_MULTIPLIER = 1.25;
const FLOW_GARB_TIMER_FRAMES = 180;
const FLOW_GARB_SPEED_MULTIPLIER = 1.18;
const FLOW_TALISMAN_REFUND = 8;
const FLOW_TALISMAN_HIT_THRESHOLD = 2;
const BURST_BLADE_BOSS_HP_RATIO = 0.35;
const BURST_BLADE_BOSS_DAMAGE_MULTIPLIER = 1.22;
const BURST_GARB_INVINCIBLE_FRAMES = 90;
const BURST_TALISMAN_COOLDOWN = 90;
const BURST_TALISMAN_ULTIMATE_GAIN = 3;
const SHADOWSTEP_DISTANCE_REQUIRED = 220;
const SHADOWSTEP_BLADE_REACH_BONUS = 36;
const SHADOWSTEP_BLADE_DAMAGE_MULTIPLIER = 1.12;
const SHADOWSTEP_GARB_MOVING_FRAMES = 8;
const SHADOWSTEP_DISTANCE_DECAY = 4;
const SHADOWSTEP_GARB_DAMAGE_MULTIPLIER = 0.88;
const SHADOWSTEP_GARB_KNOCKBACK_MULTIPLIER = 0.82;
const SHADOWSTEP_TALISMAN_RADIUS = 120;
const SHADOWSTEP_TALISMAN_BOSS_RADIUS_MULTIPLIER = 1.4;
const SHADOWSTEP_TALISMAN_COOLDOWN = 80;
const SHADOWSTEP_TALISMAN_SKILL_GAIN = 3;
const HUNT_KILL_WINDOW = 240;
const HUNT_BLADE_KILLS_REQUIRED = 2;
const HUNT_BLADE_REACH_BONUS = 40;
const HUNT_BLADE_DAMAGE_MULTIPLIER = 1.1;
const HUNT_GARB_TIMER_FRAMES = 180;
const HUNT_GARB_SPEED_MULTIPLIER = 1.14;
const HUNT_TALISMAN_KILLS_REQUIRED = 3;
const HUNT_TALISMAN_COOLDOWN = 240;
const HUNT_TALISMAN_SKILL_GAIN = 14;
const RISK_BLADE_BASIC_DAMAGE_MULTIPLIER = 1.2;
const RISK_GARB_DAMAGE_MULTIPLIER = 0.82;
const RISK_TALISMAN_SKILL_GAIN = 22;
const TEMPO_BLADE_ATTACK_FRAME_MULTIPLIER = 0.82;
const TEMPO_BLADE_DAMAGE_MULTIPLIER = 0.9;
const TEMPO_GARB_KNOCKBACK_MULTIPLIER = 0.72;
const TEMPO_TALISMAN_SKILL_COST = 24;
const TEMPO_TALISMAN_ULTIMATE_GAIN_MULTIPLIER = 0.9;

export function equipmentItem(itemId: EquipmentItemId | null | undefined) {
  return itemId ? EQUIPMENT_ITEMS[itemId] : null;
}

export function createBossEquipmentChoices(state?: GameState): EquipmentItemState[] {
  const seed = (state?.bossKills ?? 0) + (state?.equipmentInventory.length ?? 0);
  const equippedIds = new Set(Object.values(state?.equippedEquipment ?? {}).filter((id) => id !== null));
  const ownedIds = new Set([...(state?.equipmentInventory ?? []), ...equippedIds]);
  const choices: EquipmentItemId[] = [];

  for (const slot of prioritizedSlots(state, seed)) {
    const strictChoice = pickChoiceForSlot(slot, seed + choices.length, choices, ownedIds);
    const fallbackChoice = strictChoice ?? pickChoiceForSlot(slot, seed + choices.length, choices, equippedIds);
    if (fallbackChoice) choices.push(fallbackChoice);
    if (choices.length >= BOSS_EQUIPMENT_CHOICE_COUNT) break;
  }

  for (const itemId of rotated(EQUIPMENT_CHOICE_IDS, seed)) {
    if (choices.length >= BOSS_EQUIPMENT_CHOICE_COUNT) break;
    if (choices.includes(itemId) || equippedIds.has(itemId)) continue;
    choices.push(itemId);
  }

  return choices.map((itemId) => EQUIPMENT_ITEMS[itemId]);
}

export function hasEquipment(state: GameState, itemId: EquipmentItemId) {
  return state.equipmentInventory.includes(itemId);
}

export function addEquipmentToInventory(state: GameState, itemId: EquipmentItemId) {
  if (!hasEquipment(state, itemId)) {
    state.equipmentInventory.push(itemId);
  }
}

export function equipEquipment(state: GameState, slot: EquipmentSlot, itemId: EquipmentItemId | null) {
  if (itemId === null) {
    state.equippedEquipment[slot] = null;
    resetSlotRuntimeState(state, slot);
    syncSkillChargesForEquipment(state);
    return true;
  }

  const item = equipmentItem(itemId);
  if (!item || item.slot !== slot || !hasEquipment(state, itemId)) return false;
  if (state.equippedEquipment[slot] !== itemId) resetSlotRuntimeState(state, slot);
  state.equippedEquipment[slot] = itemId;
  syncSkillChargesForEquipment(state);
  return true;
}

export function chooseBossEquipment(state: GameState, index: number) {
  const choice = state.pendingEquipmentChoices[index];
  if (!choice) return false;

  addEquipmentToInventory(state, choice.id);
  resetSlotRuntimeState(state, choice.slot);
  state.equippedEquipment[choice.slot] = choice.id;
  state.pendingEquipmentChoices = [];
  syncSkillChargesForEquipment(state);
  return true;
}

export function beginBasicAttackEquipmentEffects(state: GameState) {
  const player = state.player;
  player.shadowstepBladeStrike = state.equippedEquipment.blade === "shadowstep_blade" && player.shadowstepBladeReady;
  player.huntBladeStrike = state.equippedEquipment.blade === "hunt_blade" && player.huntBladeReady;
  if (player.shadowstepBladeStrike) {
    player.shadowstepBladeReady = false;
    player.shadowstepDistance = 0;
  }
  if (player.huntBladeStrike) player.huntBladeReady = false;
}

export function recordBasicAttackHit(state: GameState, target: "enemy" | "boss") {
  const player = state.player;
  if (state.equippedEquipment.blade === "flow_blade") {
    player.flowBladeHits = Math.min(FLOW_BLADE_HITS_REQUIRED, player.flowBladeHits + 1);
    if (player.flowBladeHits >= FLOW_BLADE_HITS_REQUIRED) {
      player.flowBladeSurgeReady = true;
    }
  }
  if (target === "boss" && player.shadowstepBladeStrike) {
    grantUltimateEnergy(state, 2);
  }
}

export function consumeSkillCastEquipmentDamageMultiplier(state: GameState) {
  const player = state.player;
  if (state.equippedEquipment.blade !== "flow_blade" || !player.flowBladeSurgeReady) {
    return 1;
  }

  player.flowBladeHits = 0;
  player.flowBladeSurgeReady = false;
  return FLOW_BLADE_SKILL_DAMAGE_MULTIPLIER;
}

export function applySkillCastEquipmentEffects(state: GameState) {
  if (state.equippedEquipment.garb === "flow_garb") {
    state.player.flowGarbTimer = FLOW_GARB_TIMER_FRAMES;
  }
}

export function tickEquipmentEffects(state: GameState) {
  const player = state.player;
  decrementTimer(player, "flowGarbTimer");
  decrementTimer(player, "burstTalismanCooldown");
  decrementTimer(player, "shadowstepGarbMovingTimer");
  decrementTimer(player, "shadowstepTalismanCooldown");
  decrementTimer(player, "huntKillTimer");
  decrementTimer(player, "huntGarbTimer");
  decrementTimer(player, "huntTalismanCooldown");
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
    if (state.equippedEquipment.blade === "shadowstep_blade" && !player.shadowstepBladeReady) {
      player.shadowstepDistance += distance;
      if (player.shadowstepDistance >= SHADOWSTEP_DISTANCE_REQUIRED) {
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
  if (state.equippedEquipment.garb === "hunt_garb" && state.player.huntGarbTimer > 0) {
    multiplier *= HUNT_GARB_SPEED_MULTIPLIER;
  }
  return multiplier;
}

export function equipmentBasicAttackFrameMultiplier(state: GameState) {
  return state.equippedEquipment.blade === "tempo_blade" ? TEMPO_BLADE_ATTACK_FRAME_MULTIPLIER : 1;
}

export function equipmentBasicAttackReachBonus(state: GameState) {
  let reachBonus = 0;
  if (state.player.shadowstepBladeStrike) reachBonus += SHADOWSTEP_BLADE_REACH_BONUS;
  if (state.player.huntBladeStrike) reachBonus += HUNT_BLADE_REACH_BONUS;
  return reachBonus;
}

export function equipmentBasicAttackDamageMultiplier(state: GameState) {
  let multiplier = state.equippedEquipment.blade === "tempo_blade" ? TEMPO_BLADE_DAMAGE_MULTIPLIER : 1;
  if (state.equippedEquipment.blade === "risk_blade" && isPlayerLowHp(state)) {
    multiplier *= RISK_BLADE_BASIC_DAMAGE_MULTIPLIER;
  }
  if (state.player.shadowstepBladeStrike) multiplier *= SHADOWSTEP_BLADE_DAMAGE_MULTIPLIER;
  if (state.player.huntBladeStrike) multiplier *= HUNT_BLADE_DAMAGE_MULTIPLIER;
  return multiplier;
}

export function equipmentBossDamageMultiplier(state: GameState, boss: BossLike) {
  if (
    state.equippedEquipment.blade === "burst_blade"
    && boss.hp / Math.max(1, boss.hpMax) <= BURST_BLADE_BOSS_HP_RATIO
  ) {
    return BURST_BLADE_BOSS_DAMAGE_MULTIPLIER;
  }
  return 1;
}

export function equipmentIncomingDamageMultiplier(state: GameState) {
  let multiplier = 1;
  if (state.equippedEquipment.garb === "shadowstep_garb" && state.player.shadowstepGarbMovingTimer > 0) {
    multiplier *= SHADOWSTEP_GARB_DAMAGE_MULTIPLIER;
  }
  if (state.equippedEquipment.garb === "risk_garb" && isPlayerLowHp(state)) {
    multiplier *= RISK_GARB_DAMAGE_MULTIPLIER;
  }
  return multiplier;
}

export function equipmentKnockbackMultiplier(state: GameState) {
  let multiplier = 1;
  if (state.equippedEquipment.garb === "shadowstep_garb" && state.player.shadowstepGarbMovingTimer > 0) {
    multiplier *= SHADOWSTEP_GARB_KNOCKBACK_MULTIPLIER;
  }
  if (state.equippedEquipment.garb === "tempo_garb") multiplier *= TEMPO_GARB_KNOCKBACK_MULTIPLIER;
  return multiplier;
}

export function applyFatalDamageEquipmentProtection(state: GameState) {
  const player = state.player;
  if (
    state.equippedEquipment.garb !== "burst_garb"
    || !state.boss
    || player.burstGarbProtectionUsed
  ) return false;

  player.burstGarbProtectionUsed = true;
  player.hp = 1;
  player.invincible = Math.max(player.invincible, BURST_GARB_INVINCIBLE_FRAMES);
  return true;
}

export function applyLowHealthEquipmentTriggers(state: GameState) {
  const player = state.player;
  if (
    state.equippedEquipment.talisman === "risk_talisman"
    && !player.riskTalismanTriggered
    && isPlayerLowHp(state)
  ) {
    player.riskTalismanTriggered = true;
    grantSkillEnergy(state, RISK_TALISMAN_SKILL_GAIN);
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

  if (state.equippedEquipment.blade === "hunt_blade" && player.huntKillCount >= HUNT_BLADE_KILLS_REQUIRED) {
    player.huntBladeReady = true;
  }
  if (state.equippedEquipment.garb === "hunt_garb") {
    player.huntGarbTimer = HUNT_GARB_TIMER_FRAMES;
  }
  if (
    state.equippedEquipment.talisman === "hunt_talisman"
    && player.huntKillCount >= HUNT_TALISMAN_KILLS_REQUIRED
    && player.huntTalismanCooldown <= 0
  ) {
    grantSkillEnergy(state, HUNT_TALISMAN_SKILL_GAIN);
    player.huntTalismanCooldown = HUNT_TALISMAN_COOLDOWN;
  }
}

export function recordBossDamageEquipmentEffects(state: GameState, appliedDamage: number) {
  if (
    appliedDamage <= 0
    || state.equippedEquipment.talisman !== "burst_talisman"
    || state.player.burstTalismanCooldown > 0
  ) return;

  grantUltimateEnergy(state, BURST_TALISMAN_ULTIMATE_GAIN);
  state.player.burstTalismanCooldown = BURST_TALISMAN_COOLDOWN;
}

export function recordBossDefeatEquipmentEffects(state: GameState) {
  state.player.burstGarbProtectionUsed = false;
  state.player.riskTalismanTriggered = false;
}

export function applySkillHitEquipmentRefund(
  state: GameState,
  hitCount: number,
  bossHit: boolean,
) {
  if (state.equippedEquipment.talisman !== "flow_talisman") return false;
  if (hitCount < FLOW_TALISMAN_HIT_THRESHOLD && !bossHit) return false;

  grantSkillEnergy(state, FLOW_TALISMAN_REFUND);
  return true;
}

export function equipmentSkillEnergyCost(state: GameState) {
  return state.equippedEquipment.talisman === "tempo_talisman"
    ? TEMPO_TALISMAN_SKILL_COST
    : PLAYER_COMBAT.skillCastEnergyCost;
}

export function syncSkillChargesForEquipment(state: GameState) {
  const player = state.player;
  player.skillCharges = Math.min(
    player.maxSkillCharges,
    Math.floor(player.skillEnergy / equipmentSkillEnergyCost(state)),
  );
}

export function grantSkillEnergy(state: GameState, amount: number) {
  const player = state.player;
  player.skillEnergy = Math.min(player.skillEnergyMax, player.skillEnergy + amount);
  syncSkillChargesForEquipment(state);
}

export function grantUltimateEnergy(state: GameState, amount: number) {
  const player = state.player;
  if (player.ultimateLevel <= 0) return;
  if (player.ultimateTimer > 0 || player.ultimateCastTimer > 0) return;
  const multiplier = state.equippedEquipment.talisman === "tempo_talisman"
    ? TEMPO_TALISMAN_ULTIMATE_GAIN_MULTIPLIER
    : 1;
  player.ultimateEnergy = Math.min(player.ultimateEnergyMax, player.ultimateEnergy + amount * multiplier);
}

function prioritizedSlots(state: GameState | undefined, seed: number) {
  if (!state) return rotated(EQUIPMENT_SLOTS, seed);
  const emptySlots = EQUIPMENT_SLOTS.filter((slot) => state.equippedEquipment[slot] === null);
  const filledSlots = EQUIPMENT_SLOTS.filter((slot) => state.equippedEquipment[slot] !== null);
  return [...rotated(emptySlots, seed), ...rotated(filledSlots, seed)];
}

function pickChoiceForSlot(
  slot: EquipmentSlot,
  seed: number,
  choices: EquipmentItemId[],
  excluded: Set<EquipmentItemId | null>,
) {
  return rotated(EQUIPMENT_IDS_BY_SLOT[slot], seed).find((itemId) => (
    !choices.includes(itemId) && !excluded.has(itemId)
  ));
}

function rotated<T>(items: T[], seed: number) {
  if (items.length === 0) return [];
  const offset = positiveModulo(seed, items.length);
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function decrementTimer<T extends Record<K, number>, K extends keyof T>(target: T, key: K) {
  if (target[key] > 0) target[key] = Math.max(0, target[key] - 1) as T[K];
}

function isPlayerLowHp(state: GameState) {
  return state.player.hp / Math.max(1, state.player.maxHp) <= LOW_HP_RATIO;
}

function applyShadowstepTalismanMovementReward(state: GameState) {
  const player = state.player;
  if (
    state.equippedEquipment.talisman !== "shadowstep_talisman"
    || player.shadowstepTalismanCooldown > 0
  ) return;

  const playerCenterX = player.x + player.w / 2;
  const playerCenterY = player.y + player.h / 2;
  const nearEnemyCount = state.enemies.filter((enemy) => (
    Math.abs(enemy.x + enemy.w / 2 - playerCenterX) <= SHADOWSTEP_TALISMAN_RADIUS
    && Math.abs(enemy.y + enemy.h / 2 - playerCenterY) <= SHADOWSTEP_TALISMAN_RADIUS
  )).length;
  const bossNearbyRadius = SHADOWSTEP_TALISMAN_RADIUS * SHADOWSTEP_TALISMAN_BOSS_RADIUS_MULTIPLIER;
  const bossNearby = state.boss
    ? Math.abs(state.boss.x + state.boss.w / 2 - playerCenterX) <= bossNearbyRadius
      && Math.abs(state.boss.y + state.boss.h / 2 - playerCenterY) <= bossNearbyRadius
    : false;

  if (nearEnemyCount <= 0 && !bossNearby) return;
  grantSkillEnergy(state, SHADOWSTEP_TALISMAN_SKILL_GAIN + Math.min(nearEnemyCount, 2));
  player.shadowstepTalismanCooldown = SHADOWSTEP_TALISMAN_COOLDOWN;
}

function resetSlotRuntimeState(state: GameState, slot: EquipmentSlot) {
  const player = state.player;
  if (slot === "blade") {
    player.flowBladeHits = 0;
    player.flowBladeSurgeReady = false;
    player.shadowstepDistance = 0;
    player.shadowstepBladeReady = false;
    player.shadowstepBladeStrike = false;
    player.huntBladeReady = false;
    player.huntBladeStrike = false;
  }
  if (slot === "garb") {
    player.flowGarbTimer = 0;
    player.burstGarbProtectionUsed = false;
    player.shadowstepGarbMovingTimer = 0;
    player.huntGarbTimer = 0;
  }
  if (slot === "talisman") {
    player.burstTalismanCooldown = 0;
    player.shadowstepTalismanCooldown = 0;
    player.huntTalismanCooldown = 0;
    player.riskTalismanTriggered = false;
  }
}
