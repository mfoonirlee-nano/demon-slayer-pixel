import { describe, expect, it } from "vitest";
import { createInitialState } from "../game/state";
import type { EquipmentFamily, EquipmentSlot } from "../types/game-state";
import {
  EQUIPMENT_CHOICE_IDS,
  EQUIPMENT_ITEMS,
  chooseBossEquipment,
  createBossEquipmentChoices,
  equipEquipment,
  equipmentSkillEnergyCost,
  grantUltimateEnergy,
} from "./equipment";

const FAMILIES: EquipmentFamily[] = ["flow", "burst", "shadowstep", "hunt", "risk", "tempo"];
const SLOTS: EquipmentSlot[] = ["blade", "garb", "talisman"];
const EXPECTED_EQUIPMENT_CHOICE_COUNT = 18;
const BOSS_REWARD_CHOICE_COUNT = 3;
const TEMPO_TALISMAN_SKILL_COST = 24;
const ULTIMATE_TEST_GAIN = 40;

describe("equipment system", () => {
  it("defines all six families with one item in each slot", () => {
    expect(EQUIPMENT_CHOICE_IDS).toHaveLength(EXPECTED_EQUIPMENT_CHOICE_COUNT);
    expect(new Set(EQUIPMENT_CHOICE_IDS).size).toBe(EXPECTED_EQUIPMENT_CHOICE_COUNT);

    for (const family of FAMILIES) {
      const items = EQUIPMENT_CHOICE_IDS.map((id) => EQUIPMENT_ITEMS[id]).filter((item) => item.family === family);
      expect(items.map((item) => item.slot).sort()).toEqual([...SLOTS].sort());
      expect(items.every((item) => item.summary.length > 0 && item.uiTags.length > 0)).toBe(true);
    }
  });

  it("creates a three-card boss reward across different slots", () => {
    const state = createInitialState();
    const choices = createBossEquipmentChoices(state);

    expect(choices).toHaveLength(BOSS_REWARD_CHOICE_COUNT);
    expect(new Set(choices.map((choice) => choice.id)).size).toBe(BOSS_REWARD_CHOICE_COUNT);
    expect(new Set(choices.map((choice) => choice.slot)).size).toBe(BOSS_REWARD_CHOICE_COUNT);
  });

  it("equips the selected boss reward into its slot", () => {
    const state = createInitialState();
    state.pendingEquipmentChoices = [
      EQUIPMENT_ITEMS.hunt_blade,
      EQUIPMENT_ITEMS.risk_garb,
      EQUIPMENT_ITEMS.tempo_talisman,
    ];

    expect(chooseBossEquipment(state, 2)).toBe(true);

    expect(state.equipmentInventory).toContain("tempo_talisman");
    expect(state.equippedEquipment.talisman).toBe("tempo_talisman");
    expect(state.pendingEquipmentChoices).toEqual([]);
    expect(equipmentSkillEnergyCost(state)).toBe(TEMPO_TALISMAN_SKILL_COST);
  });

  it("only grants ultimate energy after the ultimate is learned", () => {
    const state = createInitialState();

    grantUltimateEnergy(state, ULTIMATE_TEST_GAIN);
    expect(state.player.ultimateEnergy).toBe(0);

    state.player.ultimateLevel = 1;
    grantUltimateEnergy(state, ULTIMATE_TEST_GAIN);
    expect(state.player.ultimateEnergy).toBe(ULTIMATE_TEST_GAIN);
  });

  it("resets old slot runtime state when replacing equipment", () => {
    const state = createInitialState();
    state.equipmentInventory.push("flow_blade", "tempo_blade");
    expect(equipEquipment(state, "blade", "flow_blade")).toBe(true);
    state.player.flowBladeHits = 4;
    state.player.flowBladeSurgeReady = true;

    expect(equipEquipment(state, "blade", "tempo_blade")).toBe(true);

    expect(state.equippedEquipment.blade).toBe("tempo_blade");
    expect(state.player.flowBladeHits).toBe(0);
    expect(state.player.flowBladeSurgeReady).toBe(false);
  });
});
