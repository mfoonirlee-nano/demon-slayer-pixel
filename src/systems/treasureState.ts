import type {
  GameState,
  TreasureOpportunityState,
  TreasurePityState,
} from "../types/game-state";

export function isTreasureRevealAnimating(
  state: Pick<GameState, "treasureReveal">,
) {
  return state.treasureReveal !== null && !state.treasureReveal.queued;
}

export function createInitialTreasureOpportunity(): TreasureOpportunityState {
  return {
    act: 0,
    status: "idle",
    armAt: 0,
    armedElapsed: 0,
    observedSegments: 0,
    forceRouteRequested: false,
    serial: 0,
  };
}

export function createInitialTreasurePity(): TreasurePityState {
  return {
    health: 0,
    skillEnergy: 0,
    ultimateEnergy: 0,
    residualSpirit: 0,
    runXp: 0,
    equipment: 0,
  };
}
