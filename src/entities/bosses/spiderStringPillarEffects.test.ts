import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BOSS_CONFIG, GROUND_Y, WIDTH } from "../../constants";
import {
  SPIDER_STRING_PILLAR_CONFIG,
  SPIDER_STRING_PILLAR_EFFECT_SHEET,
} from "../../constants/assets";
import * as collisionDebug from "../../game/collisionDebug";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import type { PlatformState, SpiderStringPillarState } from "../../types/game-state";
import { createBossEncounter } from "./encounter";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import {
  drawSpiderStringPillarEffects,
  spawnSpiderStringPillars,
  updateSpiderStringPillarEffects,
} from "./spiderStringPillarEffects";

type TestContext = CanvasRenderingContext2D & {
  drawImage: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
};

const originalPillarImage = SPIDER_STRING_PILLAR_EFFECT_SHEET.image;
const PHASE_THREE = 3;
const PLATFORM_RISE = 120;

describe("spider string pillar effects", () => {
  beforeEach(() => {
    resetState();
    vi.spyOn(collisionDebug, "recordCollisionDebugRect").mockImplementation(() => {});
  });

  afterEach(() => {
    setCanvas(null);
    SPIDER_STRING_PILLAR_EFFECT_SHEET.image = originalPillarImage;
    vi.restoreAllMocks();
  });

  it("locks an onscreen, center-out formation to the player's cast-time surface", () => {
    const platform = {
      x: WIDTH / 2,
      y: GROUND_Y - PLATFORM_RISE,
      w: WIDTH / 2,
      h: 20,
      vx: 0,
    } as PlatformState;
    state.player.x = WIDTH - state.player.w;
    state.player.onPlatform = platform;

    spawnSpiderStringPillars(createPhaseThreeBoss());

    const pillars = state.spiderStringPillars;
    const centerIndex = (SPIDER_STRING_PILLAR_CONFIG.count - 1) / 2;
    const expectedDelays = Array.from(
      { length: SPIDER_STRING_PILLAR_CONFIG.count },
      (_, index) => Math.abs(index - centerIndex) * SPIDER_STRING_PILLAR_CONFIG.delayStep,
    );
    const lastPillar = pillars[pillars.length - 1];
    expect(pillars).toHaveLength(SPIDER_STRING_PILLAR_CONFIG.count);
    expect(pillars.map((pillar) => pillar.delay)).toEqual(expectedDelays);
    expect(pillars.every((pillar) => pillar.y + pillar.h === platform.y)).toBe(true);
    expect(pillars[0].x).toBeGreaterThanOrEqual(0);
    expect(lastPillar.x + lastPillar.w).toBeLessThanOrEqual(WIDTH);
    expect(
      pillars[0].x + pillars[0].w / 2 - SPIDER_STRING_PILLAR_CONFIG.drawW / 2,
    ).toBeGreaterThanOrEqual(0);
    expect(
      lastPillar.x
        + lastPillar.w / 2
        + SPIDER_STRING_PILLAR_CONFIG.drawW / 2,
    ).toBeLessThanOrEqual(WIDTH);
    expect(pillars.slice(1).map(
      (pillar, index) => pillar.x - pillars[index].x,
    )).toEqual(Array(pillars.length - 1).fill(SPIDER_STRING_PILLAR_CONFIG.spacing));
    expect(new Set(pillars.map((pillar) => pillar.x)).size).toBe(pillars.length);

    const lockedPositions = pillars.map(({ x, y }) => ({ x, y }));
    state.player.x = 0;
    state.player.onPlatform = null;
    expect(pillars.map(({ x, y }) => ({ x, y }))).toEqual(lockedPositions);
  });

  it("damages once only on the two full-height frames and keeps recording their AABB", () => {
    const boss = createPhaseThreeBoss();
    state.player.x = WIDTH / 2 - state.player.w / 2;
    state.player.y = GROUND_Y - state.player.h;
    spawnSpiderStringPillars(boss);
    keepCenterPillar();
    const pillar = state.spiderStringPillars[0];
    state.player.x = pillar.x;
    state.player.y = pillar.y;
    const hpBefore = state.player.hp;

    advanceFrames(SPIDER_STRING_PILLAR_CONFIG.warningFrames);

    expect(state.player.hp).toBe(hpBefore);
    expect(collisionDebug.recordCollisionDebugRect).not.toHaveBeenCalled();

    const harmlessRiseFrames = (
      SPIDER_STRING_PILLAR_CONFIG.hitStartEffectFrame
        - SPIDER_STRING_PILLAR_CONFIG.warningSpriteFrames
    ) * SPIDER_STRING_PILLAR_CONFIG.frameDuration;
    advanceFrames(harmlessRiseFrames);

    expect(pillar.frame).toBe(SPIDER_STRING_PILLAR_CONFIG.hitStartEffectFrame - 1);
    expect(state.player.hp).toBe(hpBefore);
    expect(collisionDebug.recordCollisionDebugRect).not.toHaveBeenCalled();

    updateSpiderStringPillarEffects();

    expect(pillar.frame).toBe(SPIDER_STRING_PILLAR_CONFIG.hitStartEffectFrame);
    expect(state.player.hp).toBe(
      hpBefore - (
        SPIDER_STRING_PILLAR_CONFIG.damageBase
        + PHASE_THREE * SPIDER_STRING_PILLAR_CONFIG.damagePhase
      ) * BOSS_CONFIG.attackDamageMultiplier,
    );
    expect(pillar.hitPlayer).toBe(true);
    expect(collisionDebug.recordCollisionDebugRect).toHaveBeenCalledWith(
      pillar,
      "enemyAttack",
    );

    const hpAfterHit = state.player.hp;
    state.player.invincible = 0;
    vi.mocked(collisionDebug.recordCollisionDebugRect).mockClear();
    updateSpiderStringPillarEffects();
    expect(state.player.hp).toBe(hpAfterHit);
    expect(collisionDebug.recordCollisionDebugRect).toHaveBeenCalledTimes(1);
    expect(collisionDebug.recordCollisionDebugRect).toHaveBeenCalledWith(
      pillar,
      "enemyAttack",
    );
  });

  it("maps warning and active stages across all eight frames before reverse-safe cleanup", () => {
    state.player.x = 0;
    state.player.y = GROUND_Y - state.player.h;
    state.spiderStringPillars.push(
      createPillar({ x: WIDTH / 2 }),
      createPillar({ x: WIDTH / 2 + SPIDER_STRING_PILLAR_CONFIG.spacing }),
    );

    const warningFrames = advanceAndCollectFrames(
      SPIDER_STRING_PILLAR_CONFIG.warningFrames,
    );
    const activeFrames = advanceAndCollectFrames(SPIDER_STRING_PILLAR_CONFIG.life);

    expect(state.spiderStringPillars).toHaveLength(2);
    expect(uniqueSorted(warningFrames)).toEqual(
      frameRange(0, SPIDER_STRING_PILLAR_CONFIG.warningSpriteFrames - 1),
    );
    expect(uniqueSorted(activeFrames)).toEqual(
      frameRange(
        SPIDER_STRING_PILLAR_CONFIG.warningSpriteFrames,
        SPIDER_STRING_PILLAR_EFFECT_SHEET.count - 1,
      ),
    );
    expect(state.spiderStringPillars.every(
      (pillar) => pillar.frame === SPIDER_STRING_PILLAR_EFFECT_SHEET.count - 1,
    )).toBe(true);

    updateSpiderStringPillarEffects();

    expect(state.spiderStringPillars).toEqual([]);
  });

  it("draws warning and active sheet frames bottom-centered on the damage box", () => {
    const context = createContext();
    const image = {} as HTMLImageElement;
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    SPIDER_STRING_PILLAR_EFFECT_SHEET.image = image;
    const pillar = createPillar({
      x: 220,
      y: GROUND_Y - SPIDER_STRING_PILLAR_CONFIG.hitH,
      elapsed: SPIDER_STRING_PILLAR_CONFIG.warningFrames,
      frame: SPIDER_STRING_PILLAR_CONFIG.warningSpriteFrames - 1,
    });
    state.spiderStringPillars.push(pillar);

    drawSpiderStringPillarEffects();

    const centerX = pillar.x + pillar.w / 2;
    const bottomY = pillar.y + pillar.h;
    expect(context.translate).toHaveBeenLastCalledWith(
      centerX,
      bottomY
        - SPIDER_STRING_PILLAR_CONFIG.drawH / 2
        + SPIDER_STRING_PILLAR_CONFIG.effectBottomPadding,
    );
    expect(context.scale).toHaveBeenLastCalledWith(1, 1);
    expect(context.drawImage).toHaveBeenLastCalledWith(
      image,
      pillar.frame * SPIDER_STRING_PILLAR_EFFECT_SHEET.frameW,
      0,
      SPIDER_STRING_PILLAR_EFFECT_SHEET.frameW,
      SPIDER_STRING_PILLAR_EFFECT_SHEET.frameH,
      -SPIDER_STRING_PILLAR_CONFIG.drawW / 2,
      -SPIDER_STRING_PILLAR_CONFIG.drawH / 2,
      SPIDER_STRING_PILLAR_CONFIG.drawW,
      SPIDER_STRING_PILLAR_CONFIG.drawH,
    );

    context.drawImage.mockClear();
    pillar.elapsed = SPIDER_STRING_PILLAR_CONFIG.warningFrames + 1;
    pillar.frame = SPIDER_STRING_PILLAR_EFFECT_SHEET.count - 1;
    drawSpiderStringPillarEffects();

    expect(context.drawImage).toHaveBeenCalledWith(
      image,
      pillar.frame * SPIDER_STRING_PILLAR_EFFECT_SHEET.frameW,
      0,
      SPIDER_STRING_PILLAR_EFFECT_SHEET.frameW,
      SPIDER_STRING_PILLAR_EFFECT_SHEET.frameH,
      -SPIDER_STRING_PILLAR_CONFIG.drawW / 2,
      -SPIDER_STRING_PILLAR_CONFIG.drawH / 2,
      SPIDER_STRING_PILLAR_CONFIG.drawW,
      SPIDER_STRING_PILLAR_CONFIG.drawH,
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

function keepCenterPillar() {
  const centerIndex = Math.floor(state.spiderStringPillars.length / 2);
  const centerPillar = state.spiderStringPillars[centerIndex];
  state.spiderStringPillars.splice(0, state.spiderStringPillars.length, centerPillar);
}

function advanceFrames(frames: number) {
  for (let frame = 0; frame < frames; frame += 1) {
    updateSpiderStringPillarEffects();
  }
}

function advanceAndCollectFrames(frames: number) {
  const result: number[] = [];
  for (let frame = 0; frame < frames; frame += 1) {
    updateSpiderStringPillarEffects();
    result.push(state.spiderStringPillars[0].frame);
  }
  return result;
}

function uniqueSorted(frames: number[]) {
  return [...new Set(frames)].sort((a, b) => a - b);
}

function frameRange(first: number, last: number) {
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

function createPillar(
  overrides: Partial<SpiderStringPillarState> = {},
): SpiderStringPillarState {
  return {
    x: WIDTH / 2 - SPIDER_STRING_PILLAR_CONFIG.hitW / 2,
    y: GROUND_Y - SPIDER_STRING_PILLAR_CONFIG.hitH,
    w: SPIDER_STRING_PILLAR_CONFIG.hitW,
    h: SPIDER_STRING_PILLAR_CONFIG.hitH,
    delay: 0,
    warningFrames: SPIDER_STRING_PILLAR_CONFIG.warningFrames,
    elapsed: 0,
    frame: 0,
    life: SPIDER_STRING_PILLAR_CONFIG.life,
    damage: 0,
    hitPlayer: false,
    ...overrides,
  };
}

function createContext(): TestContext {
  return {
    beginPath: vi.fn(),
    drawImage: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
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
