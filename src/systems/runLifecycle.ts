import type { GameState } from "../types/game-state";
import { applyEquipmentStatChange } from "./equipmentStats";

export function markSpritesReady(state: GameState) {
  state.spritesReady = true;
}

export function endRun(state: GameState) {
  state.gameOver = true;
  state.runCleared = false;
  state.pendingEquipmentChoices = [];
  state.pendingUpgradeChoices = [];
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
  state.pendingVictoryAfterEquipment = false;
}
