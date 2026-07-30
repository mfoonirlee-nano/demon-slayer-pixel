import { describe, expect, it } from "vitest";
import { createInitialState } from "../game/state";
import type {
  EquipmentItemId,
  EquipmentTier,
  GameState,
} from "../types/game-state";
import {
  applyLowHealthEquipmentTriggers,
  equipmentBasicAttackFrameMultiplier,
  equipmentItem,
  equipmentMoveSpeedMultiplier,
  equipmentSkillEnergyCost,
  tickEquipmentEffects,
} from "./equipment";

const LOW_HP_RATIO = 0.35;
const ABOVE_LOW_HP_RATIO = 0.36;
const RISK_PAIR_SPEED_MULTIPLIER = 1.15;
const RISK_FULL_SPEED_MULTIPLIER = 1.3;
const SPLIT_TIME_STEP_COUNT = 4;
const SPLIT_TIME_STEP_SECONDS = 0.25;
const FINE_REGEN_PER_SECOND = 3;
const AWAKENED_REGEN_PER_SECOND = 4;
const AWAKENED_ULTIMATE_GAIN = 8;

function addAndEquip(state: GameState, itemId: EquipmentItemId, tier: EquipmentTier) {
  const item = equipmentItem(itemId, tier);
  if (!item) throw new Error(`Unknown equipment ${itemId}`);
  state.equipmentInventory.push({ id: itemId, tier });
  state.equippedEquipment[item.slot] = itemId;
}

describe("risk equipment resonance", () => {
  it.each([
    { tier: "common", expectedEnergy: 2 },
    { tier: "fine", expectedEnergy: 3 },
    { tier: "awakened", expectedEnergy: 4 },
  ] as const)(
    "regenerates tier-scaled skill energy each second while low on health at $tier",
    ({ tier, expectedEnergy }) => {
      const state = createInitialState();
      addAndEquip(state, "risk_talisman", tier);
      state.player.hp = state.player.maxHp * LOW_HP_RATIO;

      tickEquipmentEffects(state, 1);

      expect(state.player.skillEnergy).toBe(expectedEnergy);
    },
  );

  it("replaces the common talisman's old one-time low-health refund with regeneration", () => {
    const state = createInitialState();
    addAndEquip(state, "risk_talisman", "common");
    state.player.hp = state.player.maxHp * LOW_HP_RATIO;

    applyLowHealthEquipmentTriggers(state);

    expect(state.player.skillEnergy).toBe(0);
  });

  it("increases attack and movement speed by fifteen percent at low health with two pieces", () => {
    const state = createInitialState();
    addAndEquip(state, "risk_blade", "common");
    addAndEquip(state, "risk_garb", "common");
    state.player.hp = state.player.maxHp * LOW_HP_RATIO;

    expect(equipmentBasicAttackFrameMultiplier(state)).toBeCloseTo(
      1 / RISK_PAIR_SPEED_MULTIPLIER,
    );
    expect(equipmentMoveSpeedMultiplier(state)).toBe(RISK_PAIR_SPEED_MULTIPLIER);
  });

  it("replaces the pair bonus with thirty percent attack and movement speed at three pieces", () => {
    const state = createInitialState();
    addAndEquip(state, "risk_blade", "common");
    addAndEquip(state, "risk_garb", "common");
    addAndEquip(state, "risk_talisman", "common");
    state.player.hp = state.player.maxHp * LOW_HP_RATIO;

    expect(equipmentBasicAttackFrameMultiplier(state)).toBeCloseTo(
      1 / RISK_FULL_SPEED_MULTIPLIER,
    );
    expect(equipmentMoveSpeedMultiplier(state)).toBe(RISK_FULL_SPEED_MULTIPLIER);
  });

  it("stops talisman regeneration immediately outside the low-health state", () => {
    const state = createInitialState();
    addAndEquip(state, "risk_talisman", "common");

    tickEquipmentEffects(state, 1);
    expect(state.player.skillEnergy).toBe(0);

    state.player.hp = state.player.maxHp * LOW_HP_RATIO;
    tickEquipmentEffects(state, 0.5);
    expect(state.player.skillEnergy).toBe(1);

    state.player.hp = state.player.maxHp * ABOVE_LOW_HP_RATIO;
    tickEquipmentEffects(state, 1);
    expect(state.player.skillEnergy).toBe(1);
  });

  it("produces the same regeneration across split time steps", () => {
    const state = createInitialState();
    addAndEquip(state, "risk_talisman", "fine");
    state.player.hp = state.player.maxHp * LOW_HP_RATIO;

    for (let step = 0; step < SPLIT_TIME_STEP_COUNT; step += 1) {
      tickEquipmentEffects(state, SPLIT_TIME_STEP_SECONDS);
    }

    expect(state.player.skillEnergy).toBe(FINE_REGEN_PER_SECOND);
  });

  it("keeps the awakened once-per-act skill floor and ultimate gain", () => {
    const state = createInitialState();
    state.player.ultimateLevel = 1;
    addAndEquip(state, "risk_talisman", "awakened");
    state.player.hp = state.player.maxHp * LOW_HP_RATIO;

    applyLowHealthEquipmentTriggers(state);

    expect(state.player.skillEnergy).toBe(equipmentSkillEnergyCost(state));
    expect(state.player.ultimateEnergy).toBe(AWAKENED_ULTIMATE_GAIN);

    state.player.skillEnergy = 0;
    applyLowHealthEquipmentTriggers(state);
    expect(state.player.skillEnergy).toBe(0);
    expect(state.player.ultimateEnergy).toBe(AWAKENED_ULTIMATE_GAIN);

    tickEquipmentEffects(state, 1);
    expect(state.player.skillEnergy).toBe(AWAKENED_REGEN_PER_SECOND);
  });

  it("does not apply set speed bonuses above the low-health threshold", () => {
    const state = createInitialState();
    addAndEquip(state, "risk_blade", "common");
    addAndEquip(state, "risk_garb", "common");
    addAndEquip(state, "risk_talisman", "common");

    expect(equipmentBasicAttackFrameMultiplier(state)).toBe(1);
    expect(equipmentMoveSpeedMultiplier(state)).toBe(1);
  });
});
