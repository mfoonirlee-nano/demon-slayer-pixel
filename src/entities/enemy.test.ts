import { describe, expect, it } from "vitest";
import { GROUND_Y } from "../constants";
import { resetState, state } from "../game/state";
import { spawnEnemyById, updateEnemies } from "./enemy";

const TEST_LEAPER_DAMAGE = 10;
const EXPECTED_CONTACT_HP = 90;
const LEAPER_IMPACT_PHASE_DURATION = 28;
const LEAPER_TEST_LANDING_X = 120;
const LEAPER_TEST_PLAYER_X_OFFSET = 10;
const EXPECTED_IMPACT_HP = 81;

describe("leaper damage", () => {
  it("applies contact damage when the leaper body overlaps the player", () => {
    resetState();
    expect(spawnEnemyById("leaper", "debug", "left")).toBe(true);
    const leaper = state.enemies[0];
    leaper.damage = TEST_LEAPER_DAMAGE;
    leaper.leaperPhase = "recover";
    leaper.leaperTimer = 10;
    leaper.x = state.player.x + state.player.w / 2 - leaper.w / 2;
    leaper.y = GROUND_Y - leaper.h;

    updateEnemies();

    expect(state.player.hp).toBe(EXPECTED_CONTACT_HP);
  });

  it("applies impact damage on the frame the leaper lands", () => {
    resetState();
    expect(spawnEnemyById("leaper", "debug", "left")).toBe(true);
    const leaper = state.enemies[0];
    leaper.damage = TEST_LEAPER_DAMAGE;
    leaper.leaperPhase = "leap";
    leaper.leaperTimer = 1;
    leaper.leaperPhaseDuration = LEAPER_IMPACT_PHASE_DURATION;
    leaper.leaperLandingX = LEAPER_TEST_LANDING_X;
    leaper.leaperLeapStartX = LEAPER_TEST_LANDING_X;
    leaper.leaperLeapStartY = GROUND_Y - leaper.h;
    leaper.x = LEAPER_TEST_LANDING_X;
    leaper.y = GROUND_Y - leaper.h;
    state.player.x = leaper.leaperLandingX + leaper.w + LEAPER_TEST_PLAYER_X_OFFSET;
    state.player.y = GROUND_Y - state.player.h;

    updateEnemies();

    expect(state.player.hp).toBe(EXPECTED_IMPACT_HP);
  });
});
