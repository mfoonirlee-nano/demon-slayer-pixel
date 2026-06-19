import type { GameState } from "../types/game-state";

export function markSpritesReady(state: GameState) {
  state.spritesReady = true;
}

export function endRun(state: GameState) {
  state.gameOver = true;
  state.pendingEquipmentChoices = [];
  state.pendingUpgradeChoices = [];
}
