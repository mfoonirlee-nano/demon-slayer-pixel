import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GROUND_Y,
  SPIDER_STRING_CAGE_CONFIG,
  SPIDER_STRING_ULTIMATE_PILLAR_SHEET,
  WIDTH,
} from "../../constants";
import * as collisionDebug from "../../game/collisionDebug";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import type { SpiderStringCageState } from "../../types/game-state";
import { createBossEncounter } from "./encounter";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import {
  drawSpiderStringCageEffects,
  spawnSpiderStringCageEffect,
  updateSpiderStringCageEffects,
} from "./spiderStringCageEffects";

type TestContext = CanvasRenderingContext2D & {
  drawImage: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
};

const originalPillarImage = SPIDER_STRING_ULTIMATE_PILLAR_SHEET.image;
const DRAW_IMAGE_SOURCE_X_ARGUMENT = 1;
const PHASE_THREE = 3;
const EXPECTED_POST_EFFECT_RECOVERY_FRAMES = 24;

describe("spider string cage effects", () => {
  beforeEach(() => {
    resetState();
    vi.spyOn(collisionDebug, "recordCollisionDebugRect").mockImplementation(() => {});
  });

  afterEach(() => {
    setCanvas(null);
    SPIDER_STRING_ULTIMATE_PILLAR_SHEET.image = originalPillarImage;
    vi.restoreAllMocks();
  });

  it("schedules ground, air, and repeated two-sided pulses with reachable gaps", () => {
    state.player.x = 0;

    spawnSpiderStringCageEffect(createPhaseThreeBoss());

    const pulses = state.spiderStringCages;
    const expectedKinds = [
      ...SPIDER_STRING_CAGE_CONFIG.groundPulseStartFrames.map(() => "ground"),
      ...SPIDER_STRING_CAGE_CONFIG.airPulseStartFrames.map(() => "air"),
      ...SPIDER_STRING_CAGE_CONFIG.sidePulseStartFrames.map(() => "sides"),
    ];
    const expectedDelays = [
      ...SPIDER_STRING_CAGE_CONFIG.groundPulseStartFrames,
      ...SPIDER_STRING_CAGE_CONFIG.airPulseStartFrames,
      ...SPIDER_STRING_CAGE_CONFIG.sidePulseStartFrames,
    ];
    const playerLane = playerLaneIndex();
    const firstPulse = pulses[0];
    const sidePulses = pulses.filter((pulse) => pulse.kind === "sides");
    const safeGapW = laneWidth() * SPIDER_STRING_CAGE_CONFIG.safeLaneCount;

    expect(pulses.map((pulse) => pulse.kind)).toEqual(expectedKinds);
    expect(pulses.map((pulse) => pulse.delay)).toEqual(expectedDelays);
    expect(playerLane).toBeGreaterThanOrEqual(firstPulse.safeLaneStart);
    expect(playerLane).toBeLessThan(
      firstPulse.safeLaneStart + SPIDER_STRING_CAGE_CONFIG.safeLaneCount,
    );
    expect(safeGapW).toBeGreaterThan(state.player.w);
    expect(pulses.slice(1).every((pulse, index) => (
      Math.abs(pulse.safeLaneStart - pulses[index].safeLaneStart) <= 1
    ))).toBe(true);
    expect(sidePulses.every((pulse) => pulse.safeLaneStart > 0)).toBe(true);
    expect(sidePulses.every((pulse) => (
      pulse.safeLaneStart + SPIDER_STRING_CAGE_CONFIG.safeLaneCount
        < SPIDER_STRING_CAGE_CONFIG.laneCount
    ))).toBe(true);
    expect(new Set(sidePulses.map((pulse) => pulse.safeLaneStart)).size).toBe(2);
  });

  it("maps warning, growth, hit, and fade stages across all eight frames", () => {
    const context = createContext();
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    SPIDER_STRING_ULTIMATE_PILLAR_SHEET.image = {} as HTMLImageElement;
    state.spiderStringCages.push(createPulse());

    const warningFrames = advanceAndCollectDrawnFrames(
      context,
      SPIDER_STRING_CAGE_CONFIG.warningFrames,
    );
    const activeFrames = advanceAndCollectDrawnFrames(
      context,
      activeAnimationFrames(),
    );

    expect(uniqueSorted(warningFrames)).toEqual(
      frameRange(0, SPIDER_STRING_CAGE_CONFIG.warningSpriteFrames - 1),
    );
    expect(uniqueSorted(activeFrames)).toEqual(
      frameRange(
        SPIDER_STRING_CAGE_CONFIG.warningSpriteFrames,
        SPIDER_STRING_ULTIMATE_PILLAR_SHEET.count - 1,
      ),
    );
    expect(state.spiderStringCages).toHaveLength(1);

    updateSpiderStringCageEffects();

    expect(state.spiderStringCages).toEqual([]);
  });

  it("keeps future pulses hidden until their scheduled warning begins", () => {
    const context = createContext();
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    SPIDER_STRING_ULTIMATE_PILLAR_SHEET.image = {} as HTMLImageElement;
    const pulse = createPulse({ delay: 1 });
    state.spiderStringCages.push(pulse);

    drawSpiderStringCageEffects();
    expect(context.drawImage).not.toHaveBeenCalled();

    updateSpiderStringCageEffects();
    drawSpiderStringCageEffects();

    expect(pulse.delay).toBe(0);
    expect(context.drawImage).not.toHaveBeenCalled();

    updateSpiderStringCageEffects();
    drawSpiderStringCageEffects();

    expect(pulse.delay).toBe(0);
    expect(context.drawImage).toHaveBeenCalledTimes(dangerLaneCount());
  });

  it("removes the final pulse at frame 288 and leaves the recovery window clear", () => {
    spawnSpiderStringCageEffect(createPhaseThreeBoss());
    const lastEffectEndFrame = Math.max(
      ...SPIDER_STRING_CAGE_CONFIG.sidePulseStartFrames,
    ) + SPIDER_STRING_CAGE_CONFIG.warningFrames + activeAnimationFrames();

    advanceCageEffects(lastEffectEndFrame);
    expect(state.spiderStringCages).not.toEqual([]);

    updateSpiderStringCageEffects();

    expect(state.spiderStringCages).toEqual([]);
    expect(SPIDER_STRING_CAGE_CONFIG.castDuration - lastEffectEndFrame).toBe(
      EXPECTED_POST_EFFECT_RECOVERY_FRAMES,
    );
  });

  it("fits the player's full hitbox inside the first gap at a lane boundary", () => {
    state.player.x = WIDTH / 2 - state.player.w / 2;
    spawnSpiderStringCageEffect(createPhaseThreeBoss());
    const firstPulse = state.spiderStringCages[0];
    firstPulse.elapsed = elapsedBeforeFirstHitFrame();
    const hpBefore = state.player.hp;

    updateSpiderStringCageEffects();

    expect(state.player.hp).toBe(hpBefore);
    expect(firstPulse.hitPlayer).toBe(false);
  });

  it("bottom-anchors ground pillars and vertically flips ceiling pillars", () => {
    const context = createContext();
    const image = {} as HTMLImageElement;
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    SPIDER_STRING_ULTIMATE_PILLAR_SHEET.image = image;
    state.spiderStringCages.push(createPulse({ kind: "ground", elapsed: 1 }));

    drawSpiderStringCageEffects();

    expect(context.drawImage).toHaveBeenCalledTimes(dangerLaneCount());
    expect(context.scale.mock.calls.filter((call) => call[1] === -1)).toEqual([]);
    expect(context.scale.mock.calls.filter((call) => call[1] === 1)).toHaveLength(
      dangerLaneCount(),
    );

    context.drawImage.mockClear();
    context.scale.mockClear();
    context.translate.mockClear();
    state.spiderStringCages[0] = createPulse({ kind: "air", elapsed: 1 });
    drawSpiderStringCageEffects();

    const drawY = GROUND_Y
      - SPIDER_STRING_CAGE_CONFIG.drawH
      + SPIDER_STRING_CAGE_CONFIG.effectOriginPadding;
    expect(context.drawImage).toHaveBeenCalledTimes(dangerLaneCount());
    expect(context.scale.mock.calls.filter((call) => call[1] === -1)).toHaveLength(
      dangerLaneCount(),
    );
    expect(context.translate).toHaveBeenCalledWith(
      0,
      drawY * 2 + SPIDER_STRING_CAGE_CONFIG.drawH,
    );
  });

  it("alternates upward and downward pillars across both sides of the final gap", () => {
    const context = createContext();
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    SPIDER_STRING_ULTIMATE_PILLAR_SHEET.image = {} as HTMLImageElement;
    state.spiderStringCages.push(createPulse({
      pulseIndex: 6,
      kind: "sides",
      safeLaneStart: 3,
      elapsed: 1,
    }));

    drawSpiderStringCageEffects();

    expect(context.drawImage).toHaveBeenCalledTimes(dangerLaneCount());
    expect(context.scale.mock.calls.filter((call) => call[1] === -1)).toHaveLength(
      dangerLaneCount() / 2,
    );
    expect(context.scale.mock.calls.filter((call) => call[1] === 1)).toHaveLength(
      dangerLaneCount(),
    );
  });

  it("leaves the declared gap safe and damages each pulse only once", () => {
    const pulse = createPulse({ elapsed: elapsedBeforeFirstHitFrame(), damage: 10 });
    state.spiderStringCages.push(pulse);
    movePlayerToSafeGap(pulse);
    const hpBeforeSafeGap = state.player.hp;

    updateSpiderStringCageEffects();

    expect(state.player.hp).toBe(hpBeforeSafeGap);
    expect(state.player.spiderSilkSlowTimer).toBe(0);
    expect(collisionDebug.recordCollisionDebugRect).toHaveBeenCalledTimes(
      dangerLaneCount(),
    );

    vi.mocked(collisionDebug.recordCollisionDebugRect).mockClear();
    movePlayerToDangerLane(pulse);
    updateSpiderStringCageEffects();

    expect(state.player.hp).toBe(hpBeforeSafeGap - pulse.damage);
    expect(state.player.spiderSilkSlowTimer).toBe(SPIDER_STRING_CAGE_CONFIG.slowFrames);
    expect(pulse.hitPlayer).toBe(true);

    const hpAfterHit = state.player.hp;
    state.player.invincible = 0;
    updateSpiderStringCageEffects();

    expect(state.player.hp).toBe(hpAfterHit);
    expect(collisionDebug.recordCollisionDebugRect).toHaveBeenCalledTimes(
      dangerLaneCount() * 2,
    );
  });

  it("honors player invincibility and applies no slow when damage is blocked", () => {
    const pulse = createPulse({ elapsed: elapsedBeforeFirstHitFrame(), damage: 10 });
    state.spiderStringCages.push(pulse);
    movePlayerToDangerLane(pulse);
    state.player.invincible = 12;
    const hpBefore = state.player.hp;

    updateSpiderStringCageEffects();

    expect(state.player.hp).toBe(hpBefore);
    expect(state.player.spiderSilkSlowTimer).toBe(0);
    expect(pulse.hitPlayer).toBe(true);
  });

  it("records real pillar hitboxes only during active hit frames", () => {
    const pulse = createPulse({ elapsed: SPIDER_STRING_CAGE_CONFIG.warningFrames - 1 });
    state.spiderStringCages.push(pulse);

    updateSpiderStringCageEffects();
    expect(collisionDebug.recordCollisionDebugRect).not.toHaveBeenCalled();

    pulse.elapsed = elapsedBeforeFirstHitFrame();
    updateSpiderStringCageEffects();

    expect(collisionDebug.recordCollisionDebugRect).toHaveBeenCalledTimes(
      dangerLaneCount(),
    );
  });
});

function createPhaseThreeBoss() {
  const boss = createBossEncounter({
    id: BOSS_ARCHETYPE_IDS.spiderString,
    bossKills: 0,
    elapsedSeconds: 0,
    animSeed: 0,
  });
  boss.phase = PHASE_THREE;
  return boss;
}

function createPulse(
  overrides: Partial<SpiderStringCageState> = {},
): SpiderStringCageState {
  return {
    pulseIndex: 0,
    kind: "ground",
    safeLaneStart: 3,
    delay: 0,
    elapsed: 0,
    damage: 0,
    hitPlayer: false,
    ...overrides,
  };
}

function elapsedBeforeFirstHitFrame() {
  return SPIDER_STRING_CAGE_CONFIG.warningFrames
    + (
      SPIDER_STRING_CAGE_CONFIG.hitStartEffectFrame
        - SPIDER_STRING_CAGE_CONFIG.warningSpriteFrames
    ) * SPIDER_STRING_CAGE_CONFIG.effectFrameDuration;
}

function activeAnimationFrames() {
  return (
    SPIDER_STRING_ULTIMATE_PILLAR_SHEET.count
      - SPIDER_STRING_CAGE_CONFIG.warningSpriteFrames
  ) * SPIDER_STRING_CAGE_CONFIG.effectFrameDuration;
}

function dangerLaneCount() {
  return SPIDER_STRING_CAGE_CONFIG.laneCount - SPIDER_STRING_CAGE_CONFIG.safeLaneCount;
}

function laneWidth() {
  return WIDTH / SPIDER_STRING_CAGE_CONFIG.laneCount;
}

function playerLaneIndex() {
  return Math.floor((state.player.x + state.player.w / 2) / laneWidth());
}

function movePlayerToSafeGap(pulse: SpiderStringCageState) {
  const centerLane = pulse.safeLaneStart + SPIDER_STRING_CAGE_CONFIG.safeLaneCount / 2;
  state.player.x = centerLane * laneWidth() - state.player.w / 2;
  state.player.y = GROUND_Y - state.player.h;
}

function movePlayerToDangerLane(pulse: SpiderStringCageState) {
  const lane = pulse.safeLaneStart === 0
    ? SPIDER_STRING_CAGE_CONFIG.laneCount - 1
    : 0;
  state.player.x = (lane + 0.5) * laneWidth() - state.player.w / 2;
  state.player.y = GROUND_Y - state.player.h;
  state.player.invincible = 0;
}

function advanceAndCollectDrawnFrames(context: TestContext, frames: number) {
  const result: number[] = [];
  for (let frame = 0; frame < frames; frame += 1) {
    updateSpiderStringCageEffects();
    context.drawImage.mockClear();
    drawSpiderStringCageEffects();
    const sourceX = context.drawImage.mock.calls[0]?.[DRAW_IMAGE_SOURCE_X_ARGUMENT];
    if (typeof sourceX === "number") {
      result.push(sourceX / SPIDER_STRING_ULTIMATE_PILLAR_SHEET.frameW);
    }
  }
  return result;
}

function advanceCageEffects(frames: number) {
  for (let frame = 0; frame < frames; frame += 1) updateSpiderStringCageEffects();
}

function uniqueSorted(frames: number[]) {
  return [...new Set(frames)].sort((a, b) => a - b);
}

function frameRange(first: number, last: number) {
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

function createContext(): TestContext {
  return {
    beginPath: vi.fn(),
    drawImage: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    setLineDash: vi.fn(),
    setTransform: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    filter: "none",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    imageSmoothingEnabled: false,
  } as unknown as TestContext;
}
