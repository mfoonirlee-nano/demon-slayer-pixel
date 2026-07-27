import { describe, expect, it } from "vitest";
import { createInitialState } from "../game/state";
import type { EquipmentItemId, GameState } from "../types/game-state";
import {
  equipEquipment,
  equipmentItem,
  tickEquipmentEffects,
} from "./equipment";

const FLOW_ITEM_IDS = [
  "flow_blade",
  "flow_garb",
  "flow_talisman",
] as const satisfies EquipmentItemId[];
const FLOW_PAIR_SKILL_ENERGY_PER_SECOND = 2;
const FLOW_FULL_HEALTH_PER_SECOND = 1;
const DAMAGED_HEALTH_GAP = 10;
const SPLIT_TIME_STEP_COUNT = 4;
const SPLIT_TIME_STEP_SECONDS = 0.25;
const FULL_FLOW_PIECE_COUNT = 3;
const SKILL_ENERGY_BEFORE_FIRST_CHARGE = 29;
const SKILL_ENERGY_AFTER_ONE_SECOND = 31;
const HEALTH_BELOW_CAP = 0.5;
const PAIR_CONTINUATION_START_ENERGY = 10;

function equipFlowPieces(state: GameState, count: number) {
  for (const itemId of FLOW_ITEM_IDS.slice(0, count)) {
    const item = equipmentItem(itemId);
    if (!item) throw new Error(`Unknown equipment ${itemId}`);
    state.equipmentInventory.push({ id: itemId, tier: "common" });
    if (!equipEquipment(state, item.slot, itemId)) {
      throw new Error(`Could not equip ${itemId}`);
    }
  }
}

describe("flow family regeneration", () => {
  it("does not regenerate resources with only one flow piece", () => {
    const state = createInitialState();
    equipFlowPieces(state, 1);
    state.player.hp = state.player.maxHp - DAMAGED_HEALTH_GAP;

    tickEquipmentEffects(state, 1);

    expect(state.player.skillEnergy).toBe(0);
    expect(state.player.hp).toBe(state.player.maxHp - DAMAGED_HEALTH_GAP);
  });

  it("regenerates skill energy at two pieces and adds health at three pieces", () => {
    const pairState = createInitialState();
    equipFlowPieces(pairState, 2);
    pairState.player.hp = pairState.player.maxHp - DAMAGED_HEALTH_GAP;

    for (let step = 0; step < SPLIT_TIME_STEP_COUNT; step += 1) {
      tickEquipmentEffects(pairState, SPLIT_TIME_STEP_SECONDS);
    }

    expect(pairState.player.skillEnergy).toBeCloseTo(FLOW_PAIR_SKILL_ENERGY_PER_SECOND);
    expect(pairState.player.hp).toBe(pairState.player.maxHp - DAMAGED_HEALTH_GAP);

    const fullState = createInitialState();
    equipFlowPieces(fullState, FULL_FLOW_PIECE_COUNT);
    fullState.player.hp = fullState.player.maxHp - DAMAGED_HEALTH_GAP;

    tickEquipmentEffects(fullState, 1);

    expect(fullState.player.skillEnergy).toBeCloseTo(FLOW_PAIR_SKILL_ENERGY_PER_SECOND);
    expect(fullState.player.hp).toBeCloseTo(
      fullState.player.maxHp - DAMAGED_HEALTH_GAP + FLOW_FULL_HEALTH_PER_SECOND,
    );
  });

  it("clamps regeneration, syncs charges, and stops each bonus when its threshold is lost", () => {
    const state = createInitialState();
    equipFlowPieces(state, FULL_FLOW_PIECE_COUNT);
    state.player.skillEnergy = SKILL_ENERGY_BEFORE_FIRST_CHARGE;
    state.player.skillCharges = 0;
    state.player.hp = state.player.maxHp - HEALTH_BELOW_CAP;

    tickEquipmentEffects(state, 1);

    expect(state.player.skillEnergy).toBe(SKILL_ENERGY_AFTER_ONE_SECOND);
    expect(state.player.skillCharges).toBe(1);
    expect(state.player.hp).toBe(state.player.maxHp);

    state.player.skillEnergy = state.player.skillEnergyMax - 1;
    tickEquipmentEffects(state, 1);
    expect(state.player.skillEnergy).toBe(state.player.skillEnergyMax);

    expect(equipEquipment(state, "talisman", null)).toBe(true);
    state.player.skillEnergy = PAIR_CONTINUATION_START_ENERGY;
    const pairEnergy = state.player.skillEnergy;
    const pairHealth = state.player.hp - DAMAGED_HEALTH_GAP;
    state.player.hp = pairHealth;
    tickEquipmentEffects(state, 1);
    expect(state.player.skillEnergy).toBeCloseTo(
      pairEnergy + FLOW_PAIR_SKILL_ENERGY_PER_SECOND,
    );
    expect(state.player.hp).toBe(pairHealth);

    expect(equipEquipment(state, "garb", null)).toBe(true);
    const singleEnergy = state.player.skillEnergy;
    tickEquipmentEffects(state, 1);
    expect(state.player.skillEnergy).toBe(singleEnergy);
    expect(state.player.hp).toBe(pairHealth);
  });
});
