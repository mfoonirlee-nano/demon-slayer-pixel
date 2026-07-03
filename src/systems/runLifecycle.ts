import type { GameState } from "../types/game-state";

export function markSpritesReady(state: GameState) {
  state.spritesReady = true;
}

export function endRun(state: GameState) {
  state.gameOver = true;
  state.runCleared = false;
  state.pendingEquipmentChoices = [];
  state.pendingUpgradeChoices = [];
  state.equipmentInventory = [];
  state.equippedEquipment = {
    blade: null,
    garb: null,
    talisman: null,
  };
  state.pendingVictoryAfterEquipment = false;
}

export function clearRun(state: GameState) {
  state.gameOver = true;
  state.runCleared = true;
  state.pendingEquipmentChoices = [];
  state.pendingUpgradeChoices = [];
  state.pendingVictoryAfterEquipment = false;
}
