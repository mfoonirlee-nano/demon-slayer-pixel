import { describe, expect, it } from "vitest";
import { GROUND_Y } from "../constants";
import { resetState, state } from "../game/state";
import { spawnEnemyById, updateEnemies } from "./enemy";

describe("leaper damage", () => {
  it("applies contact damage when the leaper body overlaps the player", () => {
    resetState();
    expect(spawnEnemyById("leaper", "debug", "left")).toBe(true);
    const leaper = state.enemies[0];
    leaper.damage = 10;
    leaper.leaperPhase = "recover";
    leaper.leaperTimer = 10;
    leaper.x = state.player.x + state.player.w / 2 - leaper.w / 2;
    leaper.y = GROUND_Y - leaper.h;

    updateEnemies();

    expect(state.player.hp).toBe(90);
  });

  it("applies impact damage on the frame the leaper lands", () => {
    resetState();
    expect(spawnEnemyById("leaper", "debug", "left")).toBe(true);
    const leaper = state.enemies[0];
    leaper.damage = 10;
    leaper.leaperPhase = "leap";
    leaper.leaperTimer = 1;
    leaper.leaperPhaseDuration = 28;
    leaper.leaperLandingX = 120;
    leaper.leaperLeapStartX = 120;
    leaper.leaperLeapStartY = GROUND_Y - leaper.h;
    leaper.x = 120;
    leaper.y = GROUND_Y - leaper.h;
    state.player.x = leaper.leaperLandingX + leaper.w + 10;
    state.player.y = GROUND_Y - state.player.h;

    updateEnemies();

    expect(state.player.hp).toBe(81);
  });
});
