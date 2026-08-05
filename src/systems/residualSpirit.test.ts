import { beforeEach, describe, expect, it } from "vitest";
import { RESIDUAL_SPIRIT_CONFIG } from "../constants";
import { resetState, state } from "../game/state";
import {
  beginResidualSpiritHealing,
  residualSpiritDropAmount,
  storeResidualSpirit,
  updateResidualSpiritHealing,
} from "./residualSpirit";

const TIER_ONE_DROP = RESIDUAL_SPIRIT_CONFIG.dropByTier[1];
const TIER_TWO_DROP = RESIDUAL_SPIRIT_CONFIG.dropByTier[2];
const TIER_THREE_DROP = RESIDUAL_SPIRIT_CONFIG.dropByTier[3];
const TIER_FOUR_DROP = RESIDUAL_SPIRIT_CONFIG.dropByTier[4];
const TEST_PICKUP_AMOUNT = TIER_ONE_DROP;
const DAMAGED_HP = 50;
const PARTIAL_CHANNEL_SECONDS = 0.3;
const COMPLETING_CHANNEL_SECONDS = 0.31;

describe("residual-spirit rewards", () => {
  it("maps splitlings, enemy tiers, and elites to their configured amounts", () => {
    expect(residualSpiritDropAmount({ id: "splitter", splitterVariant: "child" })).toBe(1);
    expect(residualSpiritDropAmount({ id: "chaser" })).toBe(TIER_ONE_DROP);
    expect(residualSpiritDropAmount({ id: "duelist" })).toBe(TIER_TWO_DROP);
    expect(residualSpiritDropAmount({ id: "brute" })).toBe(TIER_THREE_DROP);
    expect(residualSpiritDropAmount({ id: "binder" })).toBe(TIER_FOUR_DROP);
    expect(residualSpiritDropAmount({ id: "chaser", elite: true })).toBe(
      RESIDUAL_SPIRIT_CONFIG.eliteDrop,
    );
  });

  it("stores only the amount that fits under the cap", () => {
    resetState();
    state.player.residualSpirit = RESIDUAL_SPIRIT_CONFIG.maxStored - 1;

    expect(storeResidualSpirit(state.player, TEST_PICKUP_AMOUNT)).toBe(1);
    expect(state.player.residualSpirit).toBe(RESIDUAL_SPIRIT_CONFIG.maxStored);
    expect(storeResidualSpirit(state.player, TEST_PICKUP_AMOUNT)).toBe(0);
  });
});

describe("residual-spirit healing", () => {
  beforeEach(() => {
    resetState();
    state.player.hp = DAMAGED_HP;
    state.player.residualSpirit = RESIDUAL_SPIRIT_CONFIG.healCost;
  });

  it("channels before spending spirit and restoring fifteen percent max health", () => {
    expect(beginResidualSpiritHealing(state)).toBe(true);
    expect(state.player.residualSpirit).toBe(RESIDUAL_SPIRIT_CONFIG.healCost);
    expect(state.player.hp).toBe(DAMAGED_HP);

    expect(updateResidualSpiritHealing(state, PARTIAL_CHANNEL_SECONDS)).toBe(false);
    expect(state.player.residualSpirit).toBe(RESIDUAL_SPIRIT_CONFIG.healCost);
    expect(state.player.hp).toBe(DAMAGED_HP);

    expect(updateResidualSpiritHealing(state, COMPLETING_CHANNEL_SECONDS)).toBe(true);
    expect(state.player.residualSpirit).toBe(0);
    expect(state.player.hp).toBe(
      DAMAGED_HP + state.player.maxHp * RESIDUAL_SPIRIT_CONFIG.healRatio,
    );
  });

  it("does not start at full health, without enough spirit, or while dead", () => {
    state.player.hp = state.player.maxHp;
    expect(beginResidualSpiritHealing(state)).toBe(false);

    state.player.hp = DAMAGED_HP;
    state.player.residualSpirit = RESIDUAL_SPIRIT_CONFIG.healCost - 1;
    expect(beginResidualSpiritHealing(state)).toBe(false);

    state.player.hp = 0;
    state.player.residualSpirit = RESIDUAL_SPIRIT_CONFIG.healCost;
    expect(beginResidualSpiritHealing(state)).toBe(false);
  });

  it("does not spend spirit if health becomes full during the channel", () => {
    expect(beginResidualSpiritHealing(state)).toBe(true);
    state.player.hp = state.player.maxHp;

    expect(updateResidualSpiritHealing(state, RESIDUAL_SPIRIT_CONFIG.healChannelSeconds)).toBe(false);
    expect(state.player.residualSpirit).toBe(RESIDUAL_SPIRIT_CONFIG.healCost);
  });
});
