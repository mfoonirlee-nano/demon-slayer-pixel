import { describe, expect, it } from "vitest";
import { createInitialState } from "../game/state";
import type {
  EquipmentItemId,
  EquipmentTier,
  GameState,
} from "../types/game-state";
import {
  applySkillHitEquipmentRefund,
  equipmentBossDamageMultiplier,
  equipmentItem,
  recordBossDamageEquipmentEffects,
  tickEquipmentEffects,
} from "./equipment";

const BOSS_DAMAGE_EVENT_AMOUNT = 10;
const BOSS_MAX_HP = 100;
const BURST_BASE_EXECUTE_THRESHOLD_HP = 35;
const BURST_PAIR_EXECUTE_THRESHOLD_HP = 50;
const BURST_ABOVE_PAIR_EXECUTE_THRESHOLD_HP = 51;
const BURST_BASE_TALISMAN_COOLDOWN_FRAMES = 90;
const BURST_PAIR_TALISMAN_COOLDOWN_FRAMES = 60;
const BURST_TALISMAN_COMMON_ULTIMATE_GAIN = 3;
const BURST_FULL_TRIGGER_ULTIMATE_GAIN = 6;
const BURST_FULL_TRIGGER_SKILL_GAIN = 4;

function addAndEquip(
  state: GameState,
  itemId: EquipmentItemId,
  tier: EquipmentTier,
) {
  const item = equipmentItem(itemId, tier);
  if (!item) throw new Error(`Unknown equipment ${itemId}`);
  state.equipmentInventory.push({ id: itemId, tier });
  state.equippedEquipment[item.slot] = itemId;
}

describe("burst equipment resonance", () => {
  it("keeps the blade threshold at 35% without pair resonance", () => {
    const state = createInitialState();
    addAndEquip(state, "burst_blade", "common");

    expect(equipmentBossDamageMultiplier(state, {
      hp: BURST_BASE_EXECUTE_THRESHOLD_HP,
      hpMax: BOSS_MAX_HP,
    })).toBeGreaterThan(1);
    expect(equipmentBossDamageMultiplier(state, {
      hp: BURST_BASE_EXECUTE_THRESHOLD_HP + 1,
      hpMax: BOSS_MAX_HP,
    })).toBe(1);
  });

  it("raises the blade threshold to 50% with pair resonance", () => {
    const state = createInitialState();
    addAndEquip(state, "burst_blade", "common");
    addAndEquip(state, "burst_garb", "common");

    expect(equipmentBossDamageMultiplier(state, {
      hp: BURST_PAIR_EXECUTE_THRESHOLD_HP,
      hpMax: BOSS_MAX_HP,
    })).toBeGreaterThan(1);
    expect(equipmentBossDamageMultiplier(state, {
      hp: BURST_ABOVE_PAIR_EXECUTE_THRESHOLD_HP,
      hpMax: BOSS_MAX_HP,
    })).toBe(1);
  });

  it("keeps the talisman cooldown at 90 frames without pair resonance", () => {
    const state = createInitialState();
    state.player.ultimateLevel = 1;
    addAndEquip(state, "burst_talisman", "common");

    recordBossDamageEquipmentEffects(state, BOSS_DAMAGE_EVENT_AMOUNT);

    expect(state.player.burstTalismanCooldown).toBe(BURST_BASE_TALISMAN_COOLDOWN_FRAMES);
  });

  it("reduces the talisman cooldown to one second with pair resonance", () => {
    const state = createInitialState();
    state.player.ultimateLevel = 1;
    addAndEquip(state, "burst_garb", "common");
    addAndEquip(state, "burst_talisman", "common");

    recordBossDamageEquipmentEffects(state, BOSS_DAMAGE_EVENT_AMOUNT);
    expect(state.player.ultimateEnergy).toBe(BURST_TALISMAN_COMMON_ULTIMATE_GAIN);

    for (let frame = 1; frame < BURST_PAIR_TALISMAN_COOLDOWN_FRAMES; frame += 1) {
      tickEquipmentEffects(state);
    }
    recordBossDamageEquipmentEffects(state, BOSS_DAMAGE_EVENT_AMOUNT);
    expect(state.player.ultimateEnergy).toBe(BURST_TALISMAN_COMMON_ULTIMATE_GAIN);

    tickEquipmentEffects(state);
    recordBossDamageEquipmentEffects(state, BOSS_DAMAGE_EVENT_AMOUNT);
    expect(state.player.ultimateEnergy).toBe(BURST_TALISMAN_COMMON_ULTIMATE_GAIN * 2);
  });

  it.each(["fine", "awakened"] as const)(
    "grants skill energy for both %s full-resonance talisman triggers",
    (tier) => {
      const state = createInitialState();
      state.player.ultimateLevel = 1;
      addAndEquip(state, "burst_blade", tier);
      addAndEquip(state, "burst_garb", tier);
      addAndEquip(state, "burst_talisman", tier);

      recordBossDamageEquipmentEffects(state, BOSS_DAMAGE_EVENT_AMOUNT);
      applySkillHitEquipmentRefund(state, 0, true);

      expect(state.player.ultimateEnergy).toBe(BURST_FULL_TRIGGER_ULTIMATE_GAIN);
      expect(state.player.skillEnergy).toBe(BURST_FULL_TRIGGER_SKILL_GAIN);
    },
  );
});
