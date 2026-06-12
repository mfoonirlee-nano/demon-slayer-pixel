import { PLAYER_COMBAT } from "../constants";
import type {
  EquipmentItemId,
  EquipmentItemState,
  EquipmentSlot,
  GameState,
  PlayerState,
} from "../types/game-state";

const FLOW_BLADE_HITS_REQUIRED = 4;
const FLOW_BLADE_SKILL_DAMAGE_MULTIPLIER = 1.25;
const FLOW_GARB_TIMER_FRAMES = 180;
const FLOW_GARB_SPEED_MULTIPLIER = 1.18;
const FLOW_TALISMAN_REFUND = 8;
const FLOW_TALISMAN_HIT_THRESHOLD = 2;

export const EQUIPMENT_ITEMS: Record<EquipmentItemId, EquipmentItemState> = {
  flow_blade: {
    id: "flow_blade",
    name: "流水刃",
    slot: "blade",
    family: "flow",
    tier: "common",
    summary: "普攻命中 4 次后，下一次技能伤害提高。",
    uiTags: ["刃器", "普通", "普攻蓄势"],
  },
  flow_garb: {
    id: "flow_garb",
    name: "涟波衣",
    slot: "garb",
    family: "flow",
    tier: "common",
    summary: "释放技能后，短时间内移动速度提高。",
    uiTags: ["衣装", "普通", "释放机动"],
  },
  flow_talisman: {
    id: "flow_talisman",
    name: "潮声符",
    slot: "talisman",
    family: "flow",
    tier: "common",
    summary: "技能命中 2 个以上目标时，返还少量技能能量。",
    uiTags: ["饰符", "普通", "命中返能"],
  },
};

export const EQUIPMENT_CHOICE_IDS: EquipmentItemId[] = [
  "flow_blade",
  "flow_garb",
  "flow_talisman",
];

export function equipmentItem(itemId: EquipmentItemId | null | undefined) {
  return itemId ? EQUIPMENT_ITEMS[itemId] : null;
}

export function createBossEquipmentChoices(): EquipmentItemState[] {
  return EQUIPMENT_CHOICE_IDS.map((itemId) => EQUIPMENT_ITEMS[itemId]);
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
    return true;
  }

  const item = equipmentItem(itemId);
  if (!item || item.slot !== slot || !hasEquipment(state, itemId)) return false;
  state.equippedEquipment[slot] = itemId;
  return true;
}

export function chooseBossEquipment(state: GameState, index: number) {
  const choice = state.pendingEquipmentChoices[index];
  if (!choice) return false;

  addEquipmentToInventory(state, choice.id);
  state.equippedEquipment[choice.slot] = choice.id;
  state.pendingEquipmentChoices = [];
  return true;
}

export function recordBasicAttackHit(state: GameState) {
  if (state.equippedEquipment.blade !== "flow_blade") return;
  const player = state.player;
  player.flowBladeHits = Math.min(FLOW_BLADE_HITS_REQUIRED, player.flowBladeHits + 1);
  if (player.flowBladeHits >= FLOW_BLADE_HITS_REQUIRED) {
    player.flowBladeSurgeReady = true;
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

export function tickEquipmentEffects(player: PlayerState) {
  if (player.flowGarbTimer > 0) {
    player.flowGarbTimer -= 1;
  }
}

export function equipmentMoveSpeedMultiplier(state: GameState) {
  return state.equippedEquipment.garb === "flow_garb" && state.player.flowGarbTimer > 0
    ? FLOW_GARB_SPEED_MULTIPLIER
    : 1;
}

export function applySkillHitEquipmentRefund(
  state: GameState,
  hitCount: number,
  bossHit: boolean,
) {
  if (state.equippedEquipment.talisman !== "flow_talisman") return false;
  if (hitCount < FLOW_TALISMAN_HIT_THRESHOLD && !bossHit) return false;

  const player = state.player;
  player.skillEnergy = Math.min(player.skillEnergyMax, player.skillEnergy + FLOW_TALISMAN_REFUND);
  player.skillCharges = Math.min(
    player.maxSkillCharges,
    Math.floor(player.skillEnergy / PLAYER_COMBAT.skillCastEnergyCost),
  );
  return true;
}

function resetSlotRuntimeState(state: GameState, slot: EquipmentSlot) {
  if (slot === "blade") {
    state.player.flowBladeHits = 0;
    state.player.flowBladeSurgeReady = false;
  }
  if (slot === "garb") {
    state.player.flowGarbTimer = 0;
  }
}
