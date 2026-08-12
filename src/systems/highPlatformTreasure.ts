import { HIGH_PLATFORM_TREASURE_CONFIG, WIDTH } from "../constants";
import { seededRandom } from "../game/utils";
import type { GameState, PlatformState, SegmentKind } from "../types/game-state";
import { yToLayer } from "../entities/platforms/helpers";
import { createTreasureChoices } from "./treasureRewards";
import {
  isPastActMidpoint,
  isTreasureAttachWindowOpen,
  isTreasureClaimWindowOpen,
} from "./runProgression";

const TREASURE_SEGMENT_KINDS = new Set<SegmentKind>([
  "stairUp",
  "zigzag",
  "gapJump",
]);

export type TreasureMapSegmentResult = {
  kind: SegmentKind;
  platforms: PlatformState[];
  treasureHost?: PlatformState;
};

export type TreasureUpdateEvents = {
  telegraph: boolean;
  claimed: boolean;
  missed: boolean;
};

export function createTreasureRouteRandom(state: GameState) {
  const opportunity = state.treasureOpportunity;
  return seededRandom(
    state.enemyDirector.runSeed
      + opportunity.act * HIGH_PLATFORM_TREASURE_CONFIG.opportunity.routeSeedSalt
      + opportunity.serial,
  );
}

function blankEvents(): TreasureUpdateEvents {
  return { telegraph: false, claimed: false, missed: false };
}

function opportunityArmAt(state: GameState, act: number) {
  const config = HIGH_PLATFORM_TREASURE_CONFIG.opportunity;
  const rng = seededRandom(
    state.enemyDirector.runSeed + act * config.seedSalt,
  );
  return config.earliestSeconds + rng() * config.jitterSeconds;
}

function releaseTreasureHost(state: GameState) {
  if (state.highPlatformTreasure) {
    state.highPlatformTreasure.host.reservedForTreasure = false;
  }
  state.highPlatformTreasure = null;
}

function syncOpportunityAct(state: GameState) {
  const act = state.enemyDirector.act;
  if (state.treasureOpportunity.act === act) return;

  releaseTreasureHost(state);
  state.treasureOpportunity = {
    act,
    status: "idle",
    armAt: opportunityArmAt(state, act),
    armedElapsed: 0,
    observedSegments: 0,
    forceRouteRequested: false,
    serial: state.treasureOpportunity.serial + 1,
  };
}

function isEligibleTreasureHost(platform: PlatformState) {
  const layer = yToLayer(platform.baseY);
  return (layer === "high" || layer === "top")
    && platform.kind === "normal"
    && platform.hoverAmplitude === 0
    && platform.w >= HIGH_PLATFORM_TREASURE_CONFIG.host.minimumWidth;
}

function choiceContext(state: GameState) {
  return {
    act: state.enemyDirector.act,
    isPastActMidpoint: isPastActMidpoint(state.enemyDirector),
    runSeed: state.enemyDirector.runSeed,
    serial: state.treasureOpportunity.serial,
    pity: state.treasurePity,
  };
}

function canOfferTreasureChoices(state: GameState) {
  return createTreasureChoices(state, choiceContext(state)).choices.length
    >= HIGH_PLATFORM_TREASURE_CONFIG.selection.choiceCount;
}

function markMissed(state: GameState) {
  const treasure = state.highPlatformTreasure;
  if (treasure) {
    const layer = yToLayer(treasure.host.baseY);
    if (layer === "high" || layer === "top") {
      state.treasureDebug = {
        act: state.enemyDirector.act,
        elapsedInAct: state.enemyDirector.elapsedInAct,
        serial: state.treasureOpportunity.serial,
        seed: state.enemyDirector.runSeed,
        hostLayer: layer,
        segmentKind: treasure.segmentKind,
        forced: treasure.forced,
        seen: treasure.seen,
        climbStarted: treasure.climbStarted,
        outcome: "missed",
        candidates: [],
        choices: [],
        selectedChoiceId: null,
      };
    }
  }
  if (treasure) {
    treasure.host.reservedForTreasure = false;
    treasure.dismissElapsed = 0;
    treasure.claimHoldElapsed = 0;
  }
  state.treasureOpportunity.status = "missed";
  state.treasureOpportunity.forceRouteRequested = false;
}

function claimTreasure(state: GameState) {
  const treasure = state.highPlatformTreasure;
  if (!treasure || state.treasureOpportunity.status !== "attached") return false;

  const generation = createTreasureChoices(state, choiceContext(state));
  if (generation.choices.length === 0) return false;

  const layer = yToLayer(treasure.host.baseY);
  if (layer !== "high" && layer !== "top") return false;
  const context = choiceContext(state);
  const seed = context.runSeed
    + context.act * HIGH_PLATFORM_TREASURE_CONFIG.selection.seed.actSalt
    + context.serial * HIGH_PLATFORM_TREASURE_CONFIG.selection.seed.serialSalt;
  state.treasureOpportunity.status = "claimed";
  state.treasureOpportunity.forceRouteRequested = false;
  state.treasurePity = generation.nextPity;
  state.treasureDebug = {
    act: context.act,
    elapsedInAct: state.enemyDirector.elapsedInAct,
    serial: context.serial,
    seed,
    hostLayer: layer,
    segmentKind: treasure.segmentKind,
    forced: treasure.forced,
    seen: treasure.seen,
    climbStarted: treasure.climbStarted,
    outcome: "claimed",
    candidates: generation.candidates,
    choices: generation.choices,
    selectedChoiceId: null,
  };
  state.treasureReveal = {
    elapsed: 0,
    duration: HIGH_PLATFORM_TREASURE_CONFIG.reveal.durationSeconds,
    queued: false,
    x: treasure.host.x + treasure.host.w / 2,
    y: treasure.host.y,
    choices: generation.choices,
  };
  releaseTreasureHost(state);
  return true;
}

function attachTreasure(
  state: GameState,
  host: PlatformState,
  segmentKind: SegmentKind,
  forced: boolean,
) {
  host.reservedForTreasure = true;
  state.highPlatformTreasure = {
    host,
    segmentKind,
    forced,
    dismissElapsed: null,
    unlockElapsed: 0,
    claimHoldElapsed: 0,
    phase: 0,
    arrivalGlowElapsed: null,
    seen: false,
    climbStarted: false,
  };
  state.treasureOpportunity.status = "attached";
  state.treasureOpportunity.forceRouteRequested = false;
}

export function observeTreasureMapSegment(
  state: GameState,
  segment: TreasureMapSegmentResult,
) {
  if (state.treasureOpportunity.status !== "armed") {
    if (segment.treasureHost) segment.treasureHost.reservedForTreasure = false;
    return false;
  }
  if (!isTreasureAttachWindowOpen(state.enemyDirector, state.boss !== null)) {
    if (segment.treasureHost) segment.treasureHost.reservedForTreasure = false;
    return false;
  }

  state.treasureOpportunity.observedSegments += 1;
  const forcedHost = segment.treasureHost;
  const candidates = forcedHost
    ? [forcedHost]
    : TREASURE_SEGMENT_KINDS.has(segment.kind)
      ? segment.platforms.filter(isEligibleTreasureHost).sort((left, right) => (
        left.baseY - right.baseY || right.w - left.w
      ))
      : [];
  const host = candidates.find(isEligibleTreasureHost);

  if (host && canOfferTreasureChoices(state)) {
    attachTreasure(state, host, segment.kind, forcedHost === host);
    return true;
  }
  if (forcedHost) forcedHost.reservedForTreasure = false;

  if (
    state.treasureOpportunity.observedSegments
      >= HIGH_PLATFORM_TREASURE_CONFIG.opportunity.maxObservedSegments
  ) {
    state.treasureOpportunity.forceRouteRequested = canOfferTreasureChoices(state);
  }
  return false;
}

export function shouldSpawnForcedTreasureRoute(state: GameState) {
  return state.treasureOpportunity.status === "armed"
    && state.treasureOpportunity.forceRouteRequested
    && isTreasureAttachWindowOpen(state.enemyDirector, state.boss !== null);
}

function updateAttachedTreasure(
  state: GameState,
  dt: number,
  events: TreasureUpdateEvents,
) {
  const treasure = state.highPlatformTreasure;
  if (!treasure) return;

  if (
    !state.platforms.includes(treasure.host)
    || !isTreasureClaimWindowOpen(state.enemyDirector, state.boss !== null)
    || state.gameOver
  ) {
    markMissed(state);
    events.missed = true;
    return;
  }

  treasure.phase += dt;
  if (treasure.host.x <= WIDTH) treasure.seen = true;
  if (
    treasure.arrivalGlowElapsed === null
    && treasure.host.x
      <= WIDTH + HIGH_PLATFORM_TREASURE_CONFIG.telegraph.arrivalLeadDistance
  ) {
    treasure.arrivalGlowElapsed = 0;
    events.telegraph = true;
  }
  if (treasure.arrivalGlowElapsed !== null) {
    treasure.arrivalGlowElapsed = Math.min(
      HIGH_PLATFORM_TREASURE_CONFIG.telegraph.arrivalGlowDurationSeconds,
      treasure.arrivalGlowElapsed + dt,
    );
  }
  if (state.player.onPlatform === treasure.host) treasure.climbStarted = true;

  const fullyVisible = treasure.host.x >= 0
    && treasure.host.x + treasure.host.w <= WIDTH;
  const unlockBefore = treasure.unlockElapsed;
  if (fullyVisible) treasure.unlockElapsed += dt;
  const unlockDelay = HIGH_PLATFORM_TREASURE_CONFIG.host.unlockDelaySeconds;
  const claimableDt = unlockBefore >= unlockDelay
    ? dt
    : Math.max(0, treasure.unlockElapsed - unlockDelay);
  const playerCenter = state.player.x + state.player.w / 2;
  const treasureCenter = treasure.host.x + treasure.host.w / 2;
  const inClaimRange = Math.abs(playerCenter - treasureCenter)
    <= HIGH_PLATFORM_TREASURE_CONFIG.host.claimRadius;

  if (
    treasure.unlockElapsed >= unlockDelay
    && state.player.onPlatform === treasure.host
    && inClaimRange
  ) {
    treasure.claimHoldElapsed += claimableDt;
  } else {
    treasure.claimHoldElapsed = 0;
  }

  if (treasure.claimHoldElapsed + Number.EPSILON >= HIGH_PLATFORM_TREASURE_CONFIG.host.claimHoldSeconds) {
    events.claimed = claimTreasure(state);
  }
}

function updateMissedTreasure(state: GameState, dt: number) {
  const treasure = state.highPlatformTreasure;
  if (!treasure || treasure.dismissElapsed === null) return;

  treasure.phase += dt;
  treasure.dismissElapsed += dt;
  if (
    treasure.dismissElapsed
      >= HIGH_PLATFORM_TREASURE_CONFIG.dismiss.durationSeconds
  ) {
    releaseTreasureHost(state);
  }
}

export function updateHighPlatformTreasure(state: GameState, dt: number) {
  const events = blankEvents();
  if (state.gameOver) return events;
  syncOpportunityAct(state);
  const opportunity = state.treasureOpportunity;
  const attachWindowOpen = isTreasureAttachWindowOpen(
    state.enemyDirector,
    state.boss !== null,
  );

  if (opportunity.status === "attached") {
    updateAttachedTreasure(state, dt, events);
    return events;
  }
  if (opportunity.status === "missed") {
    updateMissedTreasure(state, dt);
    return events;
  }
  if (opportunity.status === "claimed") return events;

  if (!attachWindowOpen) return events;

  if (
    opportunity.status === "idle"
    && state.enemyDirector.elapsedInAct >= opportunity.armAt
    && state.pendingTreasureChoices.length === 0
    && state.treasureReveal === null
  ) {
    opportunity.status = "armed";
  }

  if (opportunity.status === "armed") {
    opportunity.armedElapsed += dt;
    if (opportunity.armedElapsed >= HIGH_PLATFORM_TREASURE_CONFIG.opportunity.maxArmedSeconds) {
      opportunity.forceRouteRequested = canOfferTreasureChoices(state);
    }
  }
  return events;
}

export function updateTreasureReveal(state: GameState, dt: number) {
  const reveal = state.treasureReveal;
  if (!reveal || reveal.queued) return false;

  reveal.elapsed = Math.min(reveal.duration, reveal.elapsed + dt);
  if (reveal.elapsed < reveal.duration) return false;

  state.pendingTreasureChoices = reveal.choices;
  reveal.queued = true;
  return true;
}
