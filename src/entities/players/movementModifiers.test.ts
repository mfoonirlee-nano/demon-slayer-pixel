import { describe, expect, it } from "vitest";
import { createInitialState } from "../../game/state";
import { activeLanternAshZoneForPlayer } from "./lanternAshZone";

describe("activeLanternAshZoneForPlayer", () => {
  it("returns the containing ash zone with the most life remaining", () => {
    const gameState = createInitialState();
    gameState.player.x = 100;
    gameState.player.y = 100;
    gameState.player.w = 20;
    gameState.player.h = 40;
    const lowerLifeZone = {
      x: 110,
      y: 140,
      radius: 50,
      life: 12,
      maxLife: 60,
      elapsed: 48,
      frame: 0,
      damage: 1,
    };
    const higherLifeZone = { ...lowerLifeZone, life: 30, elapsed: 30 };
    const outsideZone = { ...lowerLifeZone, x: 400, life: 59, elapsed: 1 };
    gameState.lanternEmberAshZones = [lowerLifeZone, outsideZone, higherLifeZone];

    expect(activeLanternAshZoneForPlayer(gameState)).toBe(higherLifeZone);
  });

  it("returns null when the player foot point is outside every ash zone", () => {
    const gameState = createInitialState();
    gameState.player.x = 100;
    gameState.player.y = 100;
    gameState.player.w = 20;
    gameState.player.h = 40;
    gameState.lanternEmberAshZones = [{
      x: 400,
      y: 400,
      radius: 50,
      life: 30,
      maxLife: 60,
      elapsed: 30,
      frame: 0,
      damage: 1,
    }];

    expect(activeLanternAshZoneForPlayer(gameState)).toBeNull();
  });
});
