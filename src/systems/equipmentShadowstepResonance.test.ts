import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetState, state } from "../game/state";
import type { EnemyState, EquipmentItemId } from "../types/game-state";
import { hurtPlayer } from "../entities/player";
import { equipmentItem, recordEquipmentMovement } from "./equipment";

const TEST_DAMAGE = 40;
const SUCCESSFUL_DODGE_ROLL = 0.149;
const DODGE_CHANCE_BOUNDARY = 0.15;
const MOVEMENT_REWARD_DISTANCE = 12;
const SHADOWSTEP_COMMON_BASE_ENERGY = 3;
const SHADOWSTEP_COMMON_TRIGGER_ENERGY = 13;
const SHADOWSTEP_TALISMAN_COOLDOWN_FRAMES = 80;

function addAndEquip(itemId: EquipmentItemId) {
  const item = equipmentItem(itemId);
  if (!item) throw new Error(`Unknown equipment ${itemId}`);
  state.equipmentInventory.push({ id: itemId, tier: "common" });
  state.equippedEquipment[item.slot] = itemId;
}

function nearbyEnemy(): EnemyState {
  return {
    id: "crawler",
    spawnSource: "regular",
    spawnCost: 1,
    aiState: "move",
    aiTimer: 0,
    x: state.player.x,
    y: state.player.y,
    w: 40,
    h: 40,
    vx: 0,
    hp: 10,
    damage: 10,
    hitCd: 0,
    animSeed: 0,
    sheetIndex: 0,
  };
}

describe("shadowstep equipment resonance", () => {
  beforeEach(() => {
    resetState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("evades an incoming hit when a two-piece shadowstep roll is below fifteen percent", () => {
    addAndEquip("shadowstep_blade");
    addAndEquip("shadowstep_garb");
    const hpBefore = state.player.hp;
    vi.spyOn(Math, "random").mockReturnValue(SUCCESSFUL_DODGE_ROLL);

    hurtPlayer(TEST_DAMAGE, 1);

    expect(state.player.hp).toBe(hpBefore);
    expect(state.player.invincible).toBe(0);
    expect(state.player.vx).toBe(0);
    expect(state.player.vy).toBe(0);
  });

  it.each([
    {
      scenario: "only one shadowstep piece is equipped",
      items: ["shadowstep_blade"] as const,
      roll: 0,
    },
    {
      scenario: "the roll equals fifteen percent",
      items: ["shadowstep_blade", "shadowstep_garb"] as const,
      roll: DODGE_CHANCE_BOUNDARY,
    },
  ])("takes the hit when $scenario", ({ items, roll }) => {
    for (const itemId of items) addAndEquip(itemId);
    const hpBefore = state.player.hp;
    vi.spyOn(Math, "random").mockReturnValue(roll);

    hurtPlayer(TEST_DAMAGE, 1);

    expect(state.player.hp).toBe(hpBefore - TEST_DAMAGE);
  });

  it("does not grant the full-set energy bonus with only two shadowstep pieces", () => {
    addAndEquip("shadowstep_blade");
    addAndEquip("shadowstep_talisman");
    state.enemies = [nearbyEnemy()];

    recordEquipmentMovement(state, MOVEMENT_REWARD_DISTANCE);

    expect(state.player.skillEnergy).toBe(SHADOWSTEP_COMMON_BASE_ENERGY);
  });

  it("grants ten extra skill energy when a full shadowstep set triggers shadowstep", () => {
    addAndEquip("shadowstep_blade");
    addAndEquip("shadowstep_garb");
    addAndEquip("shadowstep_talisman");
    state.enemies = [nearbyEnemy()];

    recordEquipmentMovement(state, MOVEMENT_REWARD_DISTANCE);

    expect(state.player.skillEnergy).toBe(SHADOWSTEP_COMMON_TRIGGER_ENERGY);
    expect(state.player.shadowstepTalismanCooldown).toBe(SHADOWSTEP_TALISMAN_COOLDOWN_FRAMES);
  });
});
