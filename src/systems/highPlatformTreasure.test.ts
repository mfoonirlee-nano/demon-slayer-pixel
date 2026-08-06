import { describe, expect, it } from "vitest";
import { HIGH_PLATFORM_TREASURE_CONFIG, WIDTH } from "../constants";
import { createBossEncounter } from "../entities/bosses/encounter";
import { createInitialState } from "../game/state";
import type { GameState, PlatformState } from "../types/game-state";
import { endRun } from "./runLifecycle";
import {
  observeTreasureMapSegment,
  updateHighPlatformTreasure,
  updateTreasureReveal,
} from "./highPlatformTreasure";

const PLATFORM_SPAWN_INSET = 300;
const HIGH_LAYER_Y = 182;
const HOST_WIDTH = 160;
const PLATFORM_HEIGHT = 12;
const ARMED_ELAPSED = 30;
const LOW_LAYER_Y = 360;
const NARROW_PLATFORM_WIDTH = 72;
const TEST_TIME_STEP = 0.01;
const MISSED_UPDATE_SECONDS = 0.1;

function platform(overrides: Partial<PlatformState> = {}): PlatformState {
  return {
    x: WIDTH - PLATFORM_SPAWN_INSET,
    y: HIGH_LAYER_Y,
    baseY: HIGH_LAYER_Y,
    w: HOST_WIDTH,
    h: PLATFORM_HEIGHT,
    vx: -1,
    phase: 0,
    style: "stone",
    kind: "normal",
    spriteIndex: 0,
    spriteAct: null,
    trim: 0,
    notch: 0,
    hoverAmplitude: 0,
    ...overrides,
  };
}

function armOpportunity(state: GameState) {
  state.enemyDirector.elapsedInAct = ARMED_ELAPSED;
  updateHighPlatformTreasure(state, 0);
  expect(state.treasureOpportunity.status).toBe("armed");
}

function attachTreasure(state: GameState) {
  armOpportunity(state);
  const host = platform();
  state.platforms.push(host);
  observeTreasureMapSegment(state, {
    kind: "stairUp",
    platforms: [host],
  });
  expect(state.treasureOpportunity.status).toBe("attached");
  return host;
}

describe("high-platform treasure opportunity", () => {
  it("derives one stable 18-26 second opportunity from the run seed and act", () => {
    const first = createInitialState();
    const replay = createInitialState();
    first.enemyDirector.runSeed = 12_345;
    replay.enemyDirector.runSeed = 12_345;

    updateHighPlatformTreasure(first, 0);
    updateHighPlatformTreasure(replay, 0);

    expect(first.treasureOpportunity.armAt).toBeGreaterThanOrEqual(
      HIGH_PLATFORM_TREASURE_CONFIG.opportunity.earliestSeconds,
    );
    expect(first.treasureOpportunity.armAt).toBeLessThanOrEqual(
      HIGH_PLATFORM_TREASURE_CONFIG.opportunity.earliestSeconds
        + HIGH_PLATFORM_TREASURE_CONFIG.opportunity.jitterSeconds,
    );
    expect(replay.treasureOpportunity).toEqual(first.treasureOpportunity);
  });

  it("requests a forced safe treasure route after two unsuitable new segments", () => {
    const state = createInitialState();
    armOpportunity(state);

    observeTreasureMapSegment(state, {
      kind: "breather",
      platforms: [platform({ y: LOW_LAYER_Y, baseY: LOW_LAYER_Y })],
    });
    observeTreasureMapSegment(state, {
      kind: "gapJump",
      platforms: [platform({ w: NARROW_PLATFORM_WIDTH, kind: "chain" })],
    });

    expect(state.treasureOpportunity.status).toBe("armed");
    expect(state.treasureOpportunity.observedSegments).toBe(
      HIGH_PLATFORM_TREASURE_CONFIG.opportunity.maxObservedSegments,
    );
    expect(state.treasureOpportunity.forceRouteRequested).toBe(true);
  });

  it("attaches only to a static wide high platform and reserves it from enemies", () => {
    const state = createInitialState();
    const host = attachTreasure(state);

    expect(state.highPlatformTreasure?.host).toBe(host);
    expect(host.reservedForTreasure).toBe(true);
  });

  it("never turns the normal risk-fork safe route into a treasure host", () => {
    const state = createInitialState();
    armOpportunity(state);
    const safeRoute = platform();
    const riskyRoute = platform({ kind: "chain", w: NARROW_PLATFORM_WIDTH });

    observeTreasureMapSegment(state, {
      kind: "riskFork",
      platforms: [safeRoute, riskyRoute],
    });

    expect(state.treasureOpportunity.status).toBe("armed");
    expect(state.highPlatformTreasure).toBeNull();
    expect(safeRoute.reservedForTreasure).not.toBe(true);
  });

  it("requires the host to unlock and a deliberate 0.2 second proximity hold", () => {
    const state = createInitialState();
    const host = attachTreasure(state);
    state.player.onPlatform = host;
    state.player.x = host.x + host.w / 2 - state.player.w / 2;
    state.player.y = host.y - state.player.h;

    updateHighPlatformTreasure(
      state,
      HIGH_PLATFORM_TREASURE_CONFIG.host.unlockDelaySeconds,
    );
    updateHighPlatformTreasure(
      state,
      HIGH_PLATFORM_TREASURE_CONFIG.host.claimHoldSeconds - TEST_TIME_STEP,
    );
    expect(state.treasureOpportunity.status).toBe("attached");

    updateHighPlatformTreasure(state, TEST_TIME_STEP);

    expect(state.treasureOpportunity.status).toBe("claimed");
    expect(state.highPlatformTreasure).toBeNull();
    expect(state.treasureReveal?.choices).toHaveLength(
      HIGH_PLATFORM_TREASURE_CONFIG.selection.choiceCount,
    );
    expect(host.reservedForTreasure).toBe(false);
  });

  it("keeps the hold claimable after an unlocked host starts leaving the screen", () => {
    const state = createInitialState();
    const host = attachTreasure(state);
    state.player.onPlatform = host;
    state.player.x = host.x + host.w / 2 - state.player.w / 2;
    state.player.y = host.y - state.player.h;
    updateHighPlatformTreasure(
      state,
      HIGH_PLATFORM_TREASURE_CONFIG.host.unlockDelaySeconds,
    );
    host.x = -1;
    state.player.x = host.x + host.w / 2 - state.player.w / 2;

    updateHighPlatformTreasure(
      state,
      HIGH_PLATFORM_TREASURE_CONFIG.host.claimHoldSeconds,
    );

    expect(state.treasureOpportunity.status).toBe("claimed");
  });

  it("turns an offscreen opportunity into a miss without respawning", () => {
    const state = createInitialState();
    const host = attachTreasure(state);
    state.platforms = state.platforms.filter((candidate) => candidate !== host);

    updateHighPlatformTreasure(state, MISSED_UPDATE_SECONDS);

    expect(state.treasureOpportunity.status).toBe("missed");
    expect(state.highPlatformTreasure?.dismissElapsed).toBe(0);
    expect(host.reservedForTreasure).toBe(false);
    updateHighPlatformTreasure(
      state,
      HIGH_PLATFORM_TREASURE_CONFIG.dismiss.durationSeconds,
    );
    expect(state.highPlatformTreasure).toBeNull();
    updateHighPlatformTreasure(state, ARMED_ELAPSED);
    expect(state.treasureOpportunity.status).toBe("missed");
  });

  it("does not count a never-attached opportunity as a player miss when the Boss starts", () => {
    const state = createInitialState();
    armOpportunity(state);
    state.boss = createBossEncounter({
      bossKills: state.bossKills,
      elapsedSeconds: state.elapsed,
      animSeed: 0,
    });

    updateHighPlatformTreasure(state, MISSED_UPDATE_SECONDS);

    expect(state.treasureOpportunity.status).toBe("armed");
    expect(state.highPlatformTreasure).toBeNull();
    expect(state.treasureDebug).toBeNull();
  });

  it("keeps the most recent outcome in the in-memory debug snapshot", () => {
    const state = createInitialState();
    const firstHost = attachTreasure(state);
    state.player.onPlatform = firstHost;
    state.player.x = firstHost.x + firstHost.w / 2 - state.player.w / 2;
    updateHighPlatformTreasure(
      state,
      HIGH_PLATFORM_TREASURE_CONFIG.host.unlockDelaySeconds
        + HIGH_PLATFORM_TREASURE_CONFIG.host.claimHoldSeconds,
    );
    expect(state.treasureDebug?.outcome).toBe("claimed");

    state.treasureReveal = null;
    state.pendingTreasureChoices = [];
    state.enemyDirector.act += 1;
    state.enemyDirector.elapsedInAct = ARMED_ELAPSED;
    updateHighPlatformTreasure(state, 0);
    const secondHost = platform();
    state.platforms.push(secondHost);
    observeTreasureMapSegment(state, {
      kind: "stairUp",
      platforms: [secondHost],
    });
    state.platforms = state.platforms.filter((candidate) => candidate !== secondHost);

    updateHighPlatformTreasure(state, MISSED_UPDATE_SECONDS);

    expect(state.treasureDebug).toMatchObject({
      outcome: "missed",
      serial: 2,
    });
  });

  it("withdraws an attached treasure when the Boss encounter starts", () => {
    const state = createInitialState();
    const host = attachTreasure(state);
    state.boss = createBossEncounter({
      bossKills: state.bossKills,
      elapsedSeconds: state.elapsed,
      animSeed: 0,
    });

    updateHighPlatformTreasure(state, MISSED_UPDATE_SECONDS);

    expect(state.treasureOpportunity.status).toBe("missed");
    expect(state.highPlatformTreasure?.dismissElapsed).toBe(0);
    expect(host.reservedForTreasure).toBe(false);
    updateHighPlatformTreasure(
      state,
      HIGH_PLATFORM_TREASURE_CONFIG.dismiss.durationSeconds,
    );
    expect(state.highPlatformTreasure).toBeNull();
  });

  it("does not recreate an opportunity after death clears the run", () => {
    const state = createInitialState();
    state.enemyDirector.elapsedInAct = ARMED_ELAPSED;
    endRun(state);

    updateHighPlatformTreasure(state, MISSED_UPDATE_SECONDS);

    expect(state.treasureOpportunity).toMatchObject({ act: 0, status: "idle" });
    expect(state.highPlatformTreasure).toBeNull();
    expect(state.pendingTreasureChoices).toEqual([]);
  });

  it("finishes the opening reveal before publishing the immutable reward queue", () => {
    const state = createInitialState();
    const host = attachTreasure(state);
    state.player.onPlatform = host;
    state.player.x = host.x + host.w / 2 - state.player.w / 2;
    state.player.y = host.y - state.player.h;
    updateHighPlatformTreasure(
      state,
      HIGH_PLATFORM_TREASURE_CONFIG.host.unlockDelaySeconds
        + HIGH_PLATFORM_TREASURE_CONFIG.host.claimHoldSeconds,
    );

    expect(state.pendingTreasureChoices).toEqual([]);
    const choices = state.treasureReveal?.choices ?? [];
    updateTreasureReveal(
      state,
      HIGH_PLATFORM_TREASURE_CONFIG.reveal.durationSeconds - TEST_TIME_STEP,
    );
    expect(state.pendingTreasureChoices).toEqual([]);
    updateTreasureReveal(state, TEST_TIME_STEP);

    expect(state.treasureReveal?.queued).toBe(true);
    expect(state.pendingTreasureChoices).toEqual(choices);
    updateTreasureReveal(state, 1);
    expect(state.pendingTreasureChoices).toEqual(choices);
  });
});
