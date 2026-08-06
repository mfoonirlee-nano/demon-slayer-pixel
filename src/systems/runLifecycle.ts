import type { GameState } from "../types/game-state";
import { applyEquipmentStatChange } from "./equipmentStats";
import {
  createInitialTreasureOpportunity,
  createInitialTreasurePity,
} from "./treasureState";

export function markSpritesReady(state: GameState) {
  state.spritesReady = true;
}

export function clearTreasureState(state: GameState) {
  if (state.highPlatformTreasure) {
    state.highPlatformTreasure.host.reservedForTreasure = false;
  }
  state.pendingTreasureChoices = [];
  state.highPlatformTreasure = null;
  state.treasureReveal = null;
  state.treasureOpportunity = createInitialTreasureOpportunity();
  state.treasurePity = createInitialTreasurePity();
  state.treasureDebug = null;
}

export function endRun(state: GameState) {
  state.gameOver = true;
  state.runCleared = false;
  state.pendingEquipmentChoices = [];
  state.pendingUpgradeChoices = [];
  clearTreasureState(state);
  state.equipmentInventory = [];
  state.bossDefeatSplitEffect = null;
  state.equippedEquipment = {
    blade: null,
    garb: null,
    talisman: null,
  };
  applyEquipmentStatChange(state);
  state.pendingVictoryAfterEquipment = false;
}

export function clearRun(state: GameState) {
  state.gameOver = true;
  state.runCleared = true;
  state.pendingEquipmentChoices = [];
  state.pendingUpgradeChoices = [];
  clearTreasureState(state);
  state.pendingVictoryAfterEquipment = false;
}
