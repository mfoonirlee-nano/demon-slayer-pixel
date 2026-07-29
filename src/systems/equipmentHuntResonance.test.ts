import { describe, expect, it } from "vitest";
import { createInitialState } from "../game/state";
import type {
  EquipmentItemId,
  EquipmentTier,
  GameState,
} from "../types/game-state";
import {
  beginBasicAttackEquipmentEffects,
  equipmentBasicAttackReachBonus,
  equipmentIncomingDamageMultiplier,
  equipmentItem,
  recordBossDefeatEquipmentEffects,
  recordEnemyDefeatEquipmentEffects,
  tickEquipmentEffects,
} from "./equipment";

const HUNT_TALISMAN_BASE_COOLDOWN_FRAMES = 240;
const HUNT_TALISMAN_PAIR_COOLDOWN_FRAMES = 180;
const HUNT_TALISMAN_FULL_COOLDOWN_FRAMES = 120;
const COMMON_HUNT_TALISMAN_GAIN = 10;

function addAndEquip(state: GameState, itemId: EquipmentItemId, tier: EquipmentTier) {
  const item = equipmentItem(itemId, tier);
  if (!item) throw new Error(`Unknown equipment ${itemId}`);
  state.equipmentInventory.push({ id: itemId, tier });
  state.equippedEquipment[item.slot] = itemId;
}

describe("hunt equipment resonance", () => {
  it("applies the awakened blade water window after its base two-kill chain", () => {
    const state = createInitialState();
    addAndEquip(state, "hunt_blade", "awakened");

    recordEnemyDefeatEquipmentEffects(state);
    recordEnemyDefeatEquipmentEffects(state);
    beginBasicAttackEquipmentEffects(state);

    expect(state.player.huntBladeWaterTimer).toBeGreaterThan(0);
    expect(state.player.huntBladeStrike).toBe(true);
    expect(equipmentBasicAttackReachBonus(state)).toBeGreaterThan(0);
  });

  it("applies the awakened garb next-hit guard after its base three-kill chain", () => {
    const state = createInitialState();
    addAndEquip(state, "hunt_garb", "awakened");

    recordEnemyDefeatEquipmentEffects(state);
    recordEnemyDefeatEquipmentEffects(state);
    recordEnemyDefeatEquipmentEffects(state);

    expect(state.player.huntGarbGuardReady).toBe(true);
    expect(equipmentIncomingDamageMultiplier(state)).toBeLessThan(1);
    expect(state.player.huntGarbGuardReady).toBe(false);
  });

  it.each([
    { tier: "common", expectedGain: 10 },
    { tier: "fine", expectedGain: 20 },
    { tier: "awakened", expectedGain: 30 },
  ] as const)(
    "restores tier-scaled resources on a kill and enforces the four-second talisman cooldown at $tier",
    ({ tier, expectedGain }) => {
      const state = createInitialState();
      state.player.ultimateLevel = 1;
      addAndEquip(state, "hunt_talisman", tier);

      recordEnemyDefeatEquipmentEffects(state);

      expect(state.player.skillEnergy).toBe(expectedGain);
      expect(state.player.ultimateEnergy).toBe(expectedGain);
      expect(state.player.huntKillCount).toBe(0);
      expect(state.player.huntKillTimer).toBe(0);

      recordEnemyDefeatEquipmentEffects(state);

      expect(state.player.skillEnergy).toBe(expectedGain);
      expect(state.player.ultimateEnergy).toBe(expectedGain);

      for (
        let frame = 0;
        frame < HUNT_TALISMAN_BASE_COOLDOWN_FRAMES;
        frame += 1
      ) {
        tickEquipmentEffects(state);
      }
      recordEnemyDefeatEquipmentEffects(state);

      expect(state.player.skillEnergy).toBe(expectedGain * 2);
      expect(state.player.ultimateEnergy).toBe(expectedGain * 2);
    },
  );

  it("keeps the awakened talisman cooldown after a boss defeat", () => {
    const state = createInitialState();
    state.player.ultimateLevel = 1;
    addAndEquip(state, "hunt_talisman", "awakened");

    recordEnemyDefeatEquipmentEffects(state);
    recordBossDefeatEquipmentEffects(state);

    expect(state.player.huntTalismanCooldown).toBe(HUNT_TALISMAN_BASE_COOLDOWN_FRAMES);
  });

  it("applies the two-piece blade, garb, and talisman breakpoints", () => {
    const bladeAndGarb = createInitialState();
    addAndEquip(bladeAndGarb, "hunt_blade", "common");
    addAndEquip(bladeAndGarb, "hunt_garb", "common");

    recordEnemyDefeatEquipmentEffects(bladeAndGarb);

    expect(bladeAndGarb.player.huntBladeReady).toBe(true);
    expect(bladeAndGarb.player.huntGarbTimer).toBe(0);

    recordEnemyDefeatEquipmentEffects(bladeAndGarb);

    expect(bladeAndGarb.player.huntGarbTimer).toBeGreaterThan(0);

    const garbAndTalisman = createInitialState();
    addAndEquip(garbAndTalisman, "hunt_garb", "common");
    addAndEquip(garbAndTalisman, "hunt_talisman", "common");

    recordEnemyDefeatEquipmentEffects(garbAndTalisman);

    expect(garbAndTalisman.player.huntTalismanCooldown).toBe(
      HUNT_TALISMAN_PAIR_COOLDOWN_FRAMES,
    );
  });

  it("applies the three-piece permanent blade, one-kill garb, and two-second cooldown", () => {
    const state = createInitialState();
    state.player.ultimateLevel = 1;
    addAndEquip(state, "hunt_blade", "common");
    addAndEquip(state, "hunt_garb", "common");
    addAndEquip(state, "hunt_talisman", "common");

    beginBasicAttackEquipmentEffects(state);

    expect(state.player.huntBladeStrike).toBe(true);
    expect(equipmentBasicAttackReachBonus(state)).toBeGreaterThan(0);

    recordEnemyDefeatEquipmentEffects(state);

    expect(state.player.huntGarbTimer).toBeGreaterThan(0);
    expect(state.player.skillEnergy).toBe(COMMON_HUNT_TALISMAN_GAIN);
    expect(state.player.ultimateEnergy).toBe(COMMON_HUNT_TALISMAN_GAIN);
    expect(state.player.huntTalismanCooldown).toBe(HUNT_TALISMAN_FULL_COOLDOWN_FRAMES);
  });
});
