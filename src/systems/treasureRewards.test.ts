import { describe, expect, it } from "vitest";
import { createInitialState } from "../game/state";
import {
  applyTreasureChoice,
  createTreasureChoices,
  previewTreasureRewards,
} from "./treasureRewards";
import { createInitialTreasurePity } from "./treasureState";
import {
  createTreasureEquipmentChoices,
  EQUIPMENT_CHOICE_IDS,
} from "./equipment";
import { xpToNextLevel } from "./progression";
import {
  HIGH_PLATFORM_TREASURE_CONFIG,
  RESIDUAL_SPIRIT_CONFIG,
} from "../constants";

const SKILL_REWARD_AMOUNT = 50;
const FIRST_ACT_NON_BOSS_LEVEL_CAP = 2;
const BASE_XP_WEIGHT = 0.75;

describe("high-platform treasure rewards", () => {
  it("scales effective healing with both the act and the player's visible health deficit", () => {
    const earlyState = createInitialState();
    earlyState.player.hp = 10;
    const lateState = createInitialState();
    lateState.player.hp = 10;

    const earlyHealing = previewTreasureRewards(earlyState, {
      act: 1,
      isPastActMidpoint: false,
    }).find((candidate) => candidate.choice.kind === "health");
    const lateHealing = previewTreasureRewards(lateState, {
      act: 13,
      isPastActMidpoint: false,
    }).find((candidate) => candidate.choice.kind === "health");

    expect(earlyHealing?.choice).toMatchObject({
      amount: 15,
      before: 10,
      after: 25,
    });
    expect(lateHealing?.choice).toMatchObject({
      amount: 22,
      before: 10,
      after: 32,
    });
  });

  it("derives every resource amount from its live capacity and current run state", () => {
    const state = createInitialState();
    state.player.hp = 20;
    state.player.skillEnergy = 0;
    state.player.ultimateLevel = 1;
    state.player.ultimateEnergy = 0;
    state.player.residualSpirit = 0;

    const amounts = Object.fromEntries(
      previewTreasureRewards(state, {
        act: 1,
        isPastActMidpoint: false,
      }).map((candidate) => [candidate.choice.kind, candidate.choice.amount]),
    );

    expect(amounts).toMatchObject({
      health: 14,
      skillEnergy: 30,
      ultimateEnergy: 15,
      residualSpirit: 20,
      runXp: 24,
    });
  });

  it("creates a stable recovery-growth-free three-choice snapshot for a run seed", () => {
    const state = createInitialState();
    state.player.hp = 20;
    state.player.skillEnergy = 0;
    state.player.ultimateLevel = 1;
    state.player.residualSpirit = 0;
    const context = {
      act: 4,
      isPastActMidpoint: true,
      runSeed: 12_345,
      serial: 2,
      pity: createInitialTreasurePity(),
    };

    const first = createTreasureChoices(state, context);
    const replay = createTreasureChoices(state, context);

    expect(replay.choices).toEqual(first.choices);
    expect(first.choices).toHaveLength(HIGH_PLATFORM_TREASURE_CONFIG.selection.choiceCount);
    expect(new Set(first.choices.map((choice) => choice.id)).size).toBe(
      HIGH_PLATFORM_TREASURE_CONFIG.selection.choiceCount,
    );
    expect(first.choices.some((choice) => (
      choice.kind === "health"
      || choice.kind === "skillEnergy"
      || choice.kind === "ultimateEnergy"
      || choice.kind === "residualSpirit"
    ))).toBe(true);
    expect(first.choices.some((choice) => (
      choice.kind === "runXp" || choice.kind === "equipment"
    ))).toBe(true);
  });

  it("keeps XP at full weight until the non-Boss headroom actually truncates it", () => {
    const state = createInitialState();
    const context = {
      act: 1,
      isPastActMidpoint: false,
      runSeed: 12_345,
      serial: 1,
      pity: createInitialTreasurePity(),
    };

    const preview = previewTreasureRewards(state, context)
      .find((candidate) => candidate.choice.kind === "runXp");
    const candidate = createTreasureChoices(state, context).candidates
      .find((entry) => entry.kind === "runXp");

    expect(preview?.headroomRatio).toBe(1);
    expect(candidate?.weight).toBe(BASE_XP_WEIGHT);
  });

  it("continuously lowers XP weight near the non-Boss cap", () => {
    const state = createInitialState();
    state.player.runLevel = FIRST_ACT_NON_BOSS_LEVEL_CAP;
    const requirement = xpToNextLevel(state.player.runLevel);
    const nominalAmount = Math.ceil(
      requirement * HIGH_PLATFORM_TREASURE_CONFIG.amount.runXp.earlyRequirementRatio,
    );
    state.player.runXp = requirement - Math.ceil(nominalAmount / 2);

    const preview = previewTreasureRewards(state, {
      act: 1,
      isPastActMidpoint: false,
    }).find((candidate) => candidate.choice.kind === "runXp");

    expect(preview?.headroomRatio).toBeGreaterThan(
      HIGH_PLATFORM_TREASURE_CONFIG.amount.minimumEffectiveRatio,
    );
    expect(preview?.headroomRatio).toBeLessThan(1);
  });

  it("filters full resources, unlearned ultimate, capped XP, and owned equipment", () => {
    const state = createInitialState();
    state.player.hp = state.player.maxHp;
    state.player.skillEnergy = state.player.skillEnergyMax;
    state.player.ultimateLevel = 0;
    state.player.residualSpirit = RESIDUAL_SPIRIT_CONFIG.maxStored;
    state.player.runLevel = FIRST_ACT_NON_BOSS_LEVEL_CAP;
    state.player.runXp = xpToNextLevel(FIRST_ACT_NON_BOSS_LEVEL_CAP) - 1;
    state.equipmentInventory = EQUIPMENT_CHOICE_IDS.map((id) => ({
      id,
      tier: "common",
    }));

    expect(previewTreasureRewards(state, {
      act: 1,
      isPastActMidpoint: false,
    })).toEqual([]);
    expect(createTreasureEquipmentChoices(state)).toEqual([]);
  });

  it("uses different equipment slots when relics must fill all three cards", () => {
    const state = createInitialState();
    state.player.hp = state.player.maxHp;
    state.player.skillEnergy = state.player.skillEnergyMax;
    state.player.residualSpirit = RESIDUAL_SPIRIT_CONFIG.maxStored;
    state.player.runLevel = FIRST_ACT_NON_BOSS_LEVEL_CAP;
    state.player.runXp = xpToNextLevel(FIRST_ACT_NON_BOSS_LEVEL_CAP) - 1;

    const generation = createTreasureChoices(state, {
      act: 1,
      isPastActMidpoint: false,
      runSeed: 12_345,
      serial: 1,
      pity: createInitialTreasurePity(),
    });

    expect(generation.choices.every((choice) => choice.kind === "equipment")).toBe(true);
    expect(new Set(generation.choices.map((choice) => (
      choice.kind === "equipment" ? choice.equipment.slot : null
    ))).size).toBe(HIGH_PLATFORM_TREASURE_CONFIG.selection.choiceCount);
  });

  it("settles a resource choice once and keeps skill charges synchronized", () => {
    const state = createInitialState();
    state.pendingTreasureChoices = [{
      id: "skill-choice",
      kind: "skillEnergy",
      amount: SKILL_REWARD_AMOUNT,
      before: 0,
      after: SKILL_REWARD_AMOUNT,
    }];

    expect(applyTreasureChoice(state, 0)).toBe(true);
    expect(state.player.skillEnergy).toBe(SKILL_REWARD_AMOUNT);
    expect(state.player.skillCharges).toBe(1);
    expect(state.pendingTreasureChoices).toEqual([]);
    expect(applyTreasureChoice(state, 0)).toBe(false);
    expect(state.player.skillEnergy).toBe(SKILL_REWARD_AMOUNT);
  });

  it("clears the treasure queue before XP naturally opens an upgrade choice", () => {
    const state = createInitialState();
    const amount = xpToNextLevel(state.player.runLevel);
    state.pendingTreasureChoices = [{
      id: "xp-choice",
      kind: "runXp",
      amount,
      before: 0,
      after: amount,
    }];

    expect(applyTreasureChoice(state, 0)).toBe(true);
    expect(state.pendingTreasureChoices).toEqual([]);
    expect(state.pendingUpgradeChoices).toHaveLength(
      HIGH_PLATFORM_TREASURE_CONFIG.selection.choiceCount,
    );
  });

  it("adds and auto-equips a concrete treasure equipment choice", () => {
    const state = createInitialState();
    const equipment = createTreasureEquipmentChoices(state)[0];
    expect(equipment).toBeDefined();
    state.pendingTreasureChoices = [{
      id: "equipment-choice",
      kind: "equipment",
      equipment,
      replacedEquippedId: null,
    }];

    expect(applyTreasureChoice(state, 0)).toBe(true);
    expect(state.equipmentInventory).toContainEqual({
      id: equipment.id,
      tier: equipment.tier,
    });
    expect(state.equippedEquipment[equipment.slot]).toBe(equipment.id);
    expect(state.pendingTreasureChoices).toEqual([]);
  });
});
