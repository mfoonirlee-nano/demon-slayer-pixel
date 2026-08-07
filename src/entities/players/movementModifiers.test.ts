import { describe, expect, it } from "vitest";
import { GROUND_Y, MIST_BONE_CONFIG } from "../../constants";
import { createInitialState, resetState, state } from "../../game/state";
import { activeLanternAshZoneForPlayer } from "./lanternAshZone";
import { playerMoveScale } from "./movementModifiers";

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

describe("Mist Bone fog movement", () => {
  it("slows the player only while their feet are inside a thin fog field", () => {
    resetState();
    state.player.x = 200;
    state.player.y = GROUND_Y - state.player.h;
    state.mistBoneFogs.push({
      kind: "thin",
      x: state.player.x + state.player.w / 2,
      y: GROUND_Y,
      radiusX: MIST_BONE_CONFIG.thinFogRadiusX,
      radiusY: MIST_BONE_CONFIG.thinFogRadiusY,
      life: MIST_BONE_CONFIG.thinFogLife,
      maxLife: MIST_BONE_CONFIG.thinFogLife,
      elapsed: 0,
    });

    expect(playerMoveScale()).toBe(MIST_BONE_CONFIG.thinFogMoveScale);

    state.player.x = 0;

    expect(playerMoveScale()).toBe(1);
  });

  it("keeps burial fog visual-only and includes the thin-fog ellipse boundary", () => {
    resetState();
    state.player.y = GROUND_Y - state.player.h;
    state.player.x = 200;
    const centerX = state.player.x + state.player.w / 2;
    state.mistBoneFogs.push({
      kind: "burial",
      x: centerX,
      y: GROUND_Y,
      radiusX: MIST_BONE_CONFIG.burialFogRadiusX,
      radiusY: MIST_BONE_CONFIG.burialFogRadiusY,
      life: MIST_BONE_CONFIG.burialFogLife,
      maxLife: MIST_BONE_CONFIG.burialFogLife,
      elapsed: 0,
    });

    expect(playerMoveScale()).toBe(1);

    state.mistBoneFogs.push({
      kind: "thin",
      x: centerX,
      y: GROUND_Y,
      radiusX: MIST_BONE_CONFIG.thinFogRadiusX,
      radiusY: MIST_BONE_CONFIG.thinFogRadiusY,
      life: MIST_BONE_CONFIG.thinFogLife,
      maxLife: MIST_BONE_CONFIG.thinFogLife,
      elapsed: 0,
    });
    state.player.x = centerX + MIST_BONE_CONFIG.thinFogRadiusX - state.player.w / 2;

    expect(playerMoveScale()).toBe(MIST_BONE_CONFIG.thinFogMoveScale);

    state.player.x += 1;

    expect(playerMoveScale()).toBe(1);
  });
});
