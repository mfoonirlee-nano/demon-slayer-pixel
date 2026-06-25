import type { GameState } from "../types/game-state";

export function markSpritesReady(state: GameState) {
  state.spritesReady = true;
}

export function endRun(state: GameState) {
  state.gameOver = true;
  state.runCleared = false;
  state.actPrompt = null;
  state.pendingEquipmentChoices = [];
  state.pendingUpgradeChoices = [];
}

export function clearRun(state: GameState) {
  state.gameOver = true;
  state.runCleared = true;
  state.actPrompt = null;
  state.pendingEquipmentChoices = [];
  state.pendingUpgradeChoices = [];
}
