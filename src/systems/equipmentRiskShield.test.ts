import { beforeEach, describe, expect, it } from "vitest";
import {
  applyBinderTalismanDebuffs,
  updateBindingZones,
} from "../entities/enemies/binder";
import { hurtPlayer } from "../entities/player";
import { resetState, state } from "../game/state";
import type { EquipmentItemId } from "../types/game-state";
import {
  equipEquipment,
  equipmentItem,
  tickEquipmentEffects,
} from "./equipment";

const TEST_DAMAGE = 20;
const RISK_SHIELD_COOLDOWN_FRAMES = 300;
const BINDER_DAMAGE_FIRST_TICK_FRAMES = 24;
const LOW_HP_RATIO = 0.35;
const ABOVE_LOW_HP_RATIO = 0.4;

function addAndEquip(itemId: EquipmentItemId) {
  const item = equipmentItem(itemId);
  if (!item) throw new Error(`Unknown equipment ${itemId}`);
  state.equipmentInventory.push({ id: itemId, tier: "common" });
  state.equippedEquipment[item.slot] = itemId;
}

describe("risk full-set shield", () => {
  beforeEach(() => {
    resetState();
    addAndEquip("risk_blade");
    addAndEquip("risk_garb");
    addAndEquip("risk_talisman");
    state.player.hp = state.player.maxHp * LOW_HP_RATIO;
  });

  it("blocks one hit at low health and starts its five-second cooldown", () => {
    const hpBefore = state.player.hp;

    hurtPlayer(TEST_DAMAGE, 1);

    expect(state.player.hp).toBe(hpBefore);
    expect(state.player.riskShieldCooldown).toBe(RISK_SHIELD_COOLDOWN_FRAMES);
  });

  it("blocks binder talisman damage through the same shield", () => {
    const hpBefore = state.player.hp;
    applyBinderTalismanDebuffs(["damage"]);

    for (let frame = 0; frame < BINDER_DAMAGE_FIRST_TICK_FRAMES; frame += 1) {
      updateBindingZones();
    }

    expect(state.player.hp).toBe(hpBefore);
    expect(state.player.riskShieldCooldown).toBe(RISK_SHIELD_COOLDOWN_FRAMES);
  });

  it("recharges after exactly five seconds of active gameplay", () => {
    hurtPlayer(TEST_DAMAGE, 1);

    for (let frame = 0; frame < RISK_SHIELD_COOLDOWN_FRAMES - 1; frame += 1) {
      tickEquipmentEffects(state);
    }

    const hpBeforeCooldownHit = state.player.hp;
    hurtPlayer(TEST_DAMAGE, 1);
    expect(state.player.hp).toBeLessThan(hpBeforeCooldownHit);

    tickEquipmentEffects(state);
    state.player.invincible = 0;
    const hpBeforeRechargedHit = state.player.hp;
    hurtPlayer(TEST_DAMAGE, 1);

    expect(state.player.hp).toBe(hpBeforeRechargedHit);
    expect(state.player.riskShieldCooldown).toBe(RISK_SHIELD_COOLDOWN_FRAMES);
  });

  it("does not block damage above the low-health threshold", () => {
    state.player.hp = state.player.maxHp;

    hurtPlayer(TEST_DAMAGE, 1);

    expect(state.player.hp).toBeLessThan(state.player.maxHp);
    expect(state.player.riskShieldCooldown).toBe(0);
  });

  it("requires all three risk pieces", () => {
    resetState();
    addAndEquip("risk_blade");
    addAndEquip("risk_garb");
    state.player.hp = state.player.maxHp * LOW_HP_RATIO;
    const hpBefore = state.player.hp;

    hurtPlayer(TEST_DAMAGE, 1);

    expect(state.player.hp).toBeLessThan(hpBefore);
    expect(state.player.riskShieldCooldown).toBe(0);
  });

  it("becomes available for the hit after entering low health", () => {
    state.player.hp = state.player.maxHp * ABOVE_LOW_HP_RATIO;

    hurtPlayer(TEST_DAMAGE, 1);
    expect(state.player.riskShieldCooldown).toBe(0);

    state.player.invincible = 0;
    const lowHp = state.player.hp;
    hurtPlayer(TEST_DAMAGE, 1);

    expect(state.player.hp).toBe(lowHp);
    expect(state.player.riskShieldCooldown).toBe(RISK_SHIELD_COOLDOWN_FRAMES);
  });

  it("does not reset the cooldown when the full set is removed and re-equipped", () => {
    hurtPlayer(TEST_DAMAGE, 1);
    state.equipmentInventory.push({ id: "tempo_talisman", tier: "common" });

    expect(equipEquipment(state, "talisman", "tempo_talisman")).toBe(true);
    expect(equipEquipment(state, "talisman", "risk_talisman")).toBe(true);

    expect(state.player.riskShieldCooldown).toBe(RISK_SHIELD_COOLDOWN_FRAMES);
  });
});
