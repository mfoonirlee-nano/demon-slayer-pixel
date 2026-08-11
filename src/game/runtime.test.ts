import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BOSS_DEFEAT_SPLIT_VISUAL,
  BOSS_SHEET,
  ENEMY_SHEETS,
  PLATFORM_SPRITES,
  PLAYER_ANIMATION_STATES,
  PLAYER_COMBAT,
  PLAYER_SHEETS,
  RESIDUAL_SPIRIT_CONFIG,
  RUNTIME_CONFIG,
  WARDEN_BLOOD_MOON_BUFF_SHEET,
} from "../constants";
import {
  spawnBossDefeatSplitEffect,
} from "../entities/bosses/bossDefeatSplitEffect";
import { createBossEncounter } from "../entities/bosses/encounter";
import { BOSS_ARCHETYPE_IDS } from "../entities/bosses/registry";
import { spawnEnemyBySheetIndex } from "../entities/enemy";
import { drawBackground } from "../rendering/background";
import { setCanvas } from "../rendering/context";
import { drawFallingLeaves } from "../rendering/fallingLeaves";
import { drawNearForeground } from "../rendering/nearForeground";
import { createBossEquipmentChoices } from "../systems/equipment";
import { addRunXp, xpToNextLevel } from "../systems/progression";
import {
  gameStore,
  isCollisionDebugEnabledAtom,
  type GameSnapshot,
} from "./gameStore";
import { setupInput } from "./input";
import { resetState, state } from "./state";
import {
  chooseTreasureReward,
  startGame,
  stopGame,
  updateUltimateCastFreezeFrame,
} from "./runtime";

vi.mock("../rendering/background", () => ({
  drawBackground: vi.fn(),
  drawGroundTileBase: vi.fn(),
  drawGroundTileOcclusion: vi.fn(),
}));

vi.mock("../rendering/nearForeground", () => ({
  drawNearForeground: vi.fn(),
}));

vi.mock("../rendering/fallingLeaves", () => ({
  drawFallingLeaves: vi.fn(),
}));

vi.mock("./input", () => ({
  setupInput: vi.fn(),
  teardownInput: vi.fn(),
}));

type MockCanvasContext = CanvasRenderingContext2D & {
  drawImage: ReturnType<typeof vi.fn>;
};

const PLAYER_IMAGE = {} as HTMLImageElement;
const PLATFORM_IMAGE = {} as HTMLImageElement;
const ENEMY_IMAGE = {} as HTMLImageElement;
const FOREGROUND_IMAGE = {} as HTMLImageElement;
const ENEMY_BUFF_IMAGE = {} as HTMLImageElement;
const BOSS_IMAGE = {} as HTMLImageElement;
const TEST_FRAME_TIME = 16;
const TEST_FRAME_SECONDS = TEST_FRAME_TIME / RUNTIME_CONFIG.msPerSecond;
const ULTIMATE_FREEZE_SKILL_TIMER = 7;
const ULTIMATE_FREEZE_VELOCITY_X = 4;
const ULTIMATE_FREEZE_VELOCITY_Y = 5;
const ULTIMATE_FREEZE_ELAPSED = 42;
const ULTIMATE_FREEZE_PLATFORM_SPAWN_TIMER = 3;
const SPAWN_OCCLUDER_TEST_PADDING = 200;
const SPAWN_OCCLUDER_TEST_SIZE = 400;
const TREASURE_HEALTH_AFTER = 50;
const UPGRADE_CHOICE_COUNT = 3;

function createMockContext(): MockCanvasContext {
  return {
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    clip: vi.fn(),
    fillRect: vi.fn(),
    filter: "none",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    imageSmoothingEnabled: true,
    restore: vi.fn(),
    rect: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    translate: vi.fn(),
  } as unknown as MockCanvasContext;
}

describe("game runtime", () => {
  beforeEach(() => {
    resetState();
    gameStore.set(isCollisionDebugEnabledAtom, false);
    vi.clearAllMocks();
    vi.mocked(drawNearForeground).mockReset();
    vi.mocked(drawFallingLeaves).mockReset();
  });

  afterEach(() => {
    stopGame();
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.idle].image = null;
    PLATFORM_SPRITES.image = null;
    ENEMY_SHEETS[0].image = null;
    WARDEN_BLOOD_MOON_BUFF_SHEET.image = null;
    BOSS_SHEET.image = null;
    setCanvas(null);
    vi.unstubAllGlobals();
  });

  it("continues aging visual-only effects instead of locking a crowded frame", () => {
    state.player.ultimateCastTimer = 20;
    state.particles.push({ x: 0, y: 0, vx: 0, vy: 0, life: 1, color: "#fff" });
    state.hitBursts.push({
      x: 0,
      y: 0,
      life: 1,
      maxLife: 1,
      radius: 1,
      grow: 1,
      color: "#fff",
      sparks: [],
    });
    state.ultimateTrails.push({
      x: 0,
      y: 0,
      facing: 1,
      life: 1,
      maxLife: 1,
      width: 10,
      height: 4,
      phase: 0,
    });
    state.ultimateAfterimageSlashes.push({
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      facing: 1,
      life: 1,
      maxLife: 1,
      power: 1,
    });
    state.ultimatePlayerGhosts.push({
      source: "player",
      action: "idle",
      animationState: PLAYER_ANIMATION_STATES.idle,
      frame: 0,
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      facing: 1,
      life: 1,
      maxLife: 1,
      strength: 1,
    });

    updateUltimateCastFreezeFrame(TEST_FRAME_SECONDS);

    expect(state.particles).toHaveLength(0);
    expect(state.hitBursts).toHaveLength(0);
    expect(state.ultimateTrails).toHaveLength(0);
    expect(state.ultimateAfterimageSlashes).toHaveLength(0);
    expect(state.ultimatePlayerGhosts).toHaveLength(0);
  });

  it("routes the collision-box shortcut through the shared debug state", () => {
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    setCanvas({ getContext: () => createMockContext() } as unknown as HTMLCanvasElement);
    state.spritesReady = true;

    startGame();
    vi.mocked(setupInput).mock.calls[0][0].onToggleCollisionDebug?.();

    expect(gameStore.get(isCollisionDebugEnabledAtom)).toBe(true);
  });

  it("advances completed healing visuals during the ultimate freeze without advancing gameplay", () => {
    state.player.ultimateCastTimer = PLAYER_COMBAT.ultimateCastFrames;
    state.player.skillTimer = ULTIMATE_FREEZE_SKILL_TIMER;
    state.player.residualSpiritHealTimer = RESIDUAL_SPIRIT_CONFIG.healChannelSeconds;
    state.player.residualSpiritHealCompletionTimer =
      RESIDUAL_SPIRIT_CONFIG.healCompletionVisualSeconds;
    state.player.vx = ULTIMATE_FREEZE_VELOCITY_X;
    state.player.vy = ULTIMATE_FREEZE_VELOCITY_Y;
    state.elapsed = ULTIMATE_FREEZE_ELAPSED;
    state.platformSpawnTimer = ULTIMATE_FREEZE_PLATFORM_SPAWN_TIMER;
    const startX = state.player.x;
    const startY = state.player.y;

    updateUltimateCastFreezeFrame(TEST_FRAME_SECONDS);

    expect(state.player.ultimateCastTimer).toBe(PLAYER_COMBAT.ultimateCastFrames - 1);
    expect(state.player.skillTimer).toBe(ULTIMATE_FREEZE_SKILL_TIMER);
    expect(state.player.residualSpiritHealTimer).toBe(
      RESIDUAL_SPIRIT_CONFIG.healChannelSeconds,
    );
    expect(state.player.residualSpiritHealCompletionTimer).toBeCloseTo(
      RESIDUAL_SPIRIT_CONFIG.healCompletionVisualSeconds - TEST_FRAME_SECONDS,
    );
    expect(state.player.x).toBe(startX);
    expect(state.player.y).toBe(startY);
    expect(state.player.vx).toBe(ULTIMATE_FREEZE_VELOCITY_X);
    expect(state.player.vy).toBe(ULTIMATE_FREEZE_VELOCITY_Y);
    expect(state.elapsed).toBe(ULTIMATE_FREEZE_ELAPSED);
    expect(state.platformSpawnTimer).toBe(ULTIMATE_FREEZE_PLATFORM_SPAWN_TIMER);
  });

  it("freezes gameplay while the treasure choice overlay is unresolved", () => {
    const frameQueue: { callback?: FrameRequestCallback } = {};
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      frameQueue.callback = callback;
      return 1;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    setCanvas({ getContext: () => createMockContext() } as unknown as HTMLCanvasElement);
    state.spritesReady = true;
    startGame();
    state.elapsed = ULTIMATE_FREEZE_ELAPSED;
    state.pendingTreasureChoices = [{
      id: "treasure-freeze",
      kind: "health",
      amount: 10,
      before: 40,
      after: 50,
    }];
    state.player.vx = ULTIMATE_FREEZE_VELOCITY_X;
    const startX = state.player.x;

    frameQueue.callback?.(TEST_FRAME_TIME);

    expect(state.elapsed).toBe(ULTIMATE_FREEZE_ELAPSED);
    expect(state.player.x).toBe(startX);
    expect(state.player.vx).toBe(ULTIMATE_FREEZE_VELOCITY_X);
  });

  it("finishes a same-frame treasure reveal before an already queued level upgrade", () => {
    const frameQueue: { callback?: FrameRequestCallback } = {};
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      frameQueue.callback = callback;
      return 1;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const snapshots: GameSnapshot[] = [];
    setCanvas({ getContext: () => createMockContext() } as unknown as HTMLCanvasElement);
    state.spritesReady = true;
    startGame({ onStateChange: (snapshot) => snapshots.push(snapshot) });
    addRunXp(state, xpToNextLevel(state.player.runLevel));
    state.treasureReveal = {
      choices: [{
        id: "treasure-after-upgrade",
        kind: "health",
        amount: 10,
        before: 40,
        after: 50,
      }],
      duration: 0.01,
      elapsed: 0,
      queued: false,
      x: 400,
      y: 180,
    };

    frameQueue.callback?.(TEST_FRAME_TIME);
    expect(snapshots[snapshots.length - 1]?.activeOverlay).toBe("none");
    frameQueue.callback?.(TEST_FRAME_TIME * 2);

    expect(state.pendingUpgradeChoices).toHaveLength(UPGRADE_CHOICE_COUNT);
    expect(state.pendingTreasureChoices).toHaveLength(1);
    expect(snapshots[snapshots.length - 1]?.activeOverlay).toBe("treasure");
  });

  it("settles a treasure overlay callback only once", () => {
    state.player.hp = 40;
    state.pendingTreasureChoices = [{
      id: "treasure-health",
      kind: "health",
      amount: 10,
      before: 40,
      after: 50,
    }];

    chooseTreasureReward(0);
    chooseTreasureReward(0);

    expect(state.player.hp).toBe(TREASURE_HEALTH_AFTER);
    expect(state.pendingTreasureChoices).toEqual([]);
  });

  it("allows restart only after the run ends, not through an unresolved treasure choice", () => {
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    setCanvas({ getContext: () => createMockContext() } as unknown as HTMLCanvasElement);
    state.spritesReady = true;
    startGame();
    state.elapsed = ULTIMATE_FREEZE_ELAPSED;
    state.pendingTreasureChoices = [{
      id: "treasure-restart-guard",
      kind: "health",
      amount: 10,
      before: 40,
      after: 50,
    }];

    vi.mocked(setupInput).mock.calls[0][0].onRestart?.();

    expect(state.elapsed).toBe(ULTIMATE_FREEZE_ELAPSED);
    expect(state.pendingTreasureChoices).toHaveLength(1);

    state.gameOver = true;
    vi.mocked(setupInput).mock.calls[0][0].onRestart?.();

    expect(state.elapsed).toBe(0);
    expect(state.pendingTreasureChoices).toEqual([]);
  });

  it("plays the boss split before showing rewards while gameplay stays frozen", () => {
    const frameQueue: { callback?: FrameRequestCallback } = {};
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      frameQueue.callback = callback;
      return 1;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const context = createMockContext();
    const snapshots: GameSnapshot[] = [];
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.idle].image = PLAYER_IMAGE;
    BOSS_SHEET.image = BOSS_IMAGE;
    state.spritesReady = true;

    startGame({ onStateChange: (snapshot) => snapshots.push(snapshot) });
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.spiderString,
      bossKills: 0,
      elapsedSeconds: state.elapsed,
      animSeed: 0,
    });
    boss.entering = false;
    spawnBossDefeatSplitEffect(boss, state.elapsed, () => 0);
    state.pendingEquipmentChoices = createBossEquipmentChoices(state);
    state.player.skillTimer = ULTIMATE_FREEZE_SKILL_TIMER;
    state.player.vx = ULTIMATE_FREEZE_VELOCITY_X;
    const startX = state.player.x;
    const startElapsed = state.elapsed;

    for (let frame = 0; frame < BOSS_DEFEAT_SPLIT_VISUAL.durationFrames; frame += 1) {
      frameQueue.callback?.((frame + 1) * TEST_FRAME_TIME);
    }

    expect(context.clip).toHaveBeenCalled();
    expect(state.bossDefeatSplitEffect).toBeNull();
    expect(state.player.skillTimer).toBe(ULTIMATE_FREEZE_SKILL_TIMER);
    expect(state.player.x).toBe(startX);
    expect(state.player.vx).toBe(ULTIMATE_FREEZE_VELOCITY_X);
    expect(state.elapsed).toBe(startElapsed);
    expect(snapshots[snapshots.length - 1]?.activeOverlay).toBe("bossEquipment");
  });

  it("does not let manual pause stall a split without a queued reward", () => {
    const frameQueue: { callback?: FrameRequestCallback } = {};
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      frameQueue.callback = callback;
      return 1;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const snapshots: GameSnapshot[] = [];
    setCanvas({ getContext: () => createMockContext() } as unknown as HTMLCanvasElement);
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.idle].image = PLAYER_IMAGE;
    BOSS_SHEET.image = BOSS_IMAGE;
    state.spritesReady = true;

    startGame({ onStateChange: (snapshot) => snapshots.push(snapshot) });
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.spiderString,
      bossKills: 0,
      elapsedSeconds: state.elapsed,
      animSeed: 0,
    });
    spawnBossDefeatSplitEffect(boss, state.elapsed, () => 0);

    vi.mocked(setupInput).mock.calls[0][0].onPause?.();
    frameQueue.callback?.(TEST_FRAME_TIME);

    expect(state.bossDefeatSplitEffect?.life).toBe(
      BOSS_DEFEAT_SPLIT_VISUAL.durationFrames - 1,
    );
    expect(snapshots[snapshots.length - 1]?.manualPaused).toBe(false);
  });

  it("moves the platform in front of the player only after landing", () => {
    const frameQueue: { callback?: FrameRequestCallback } = {};
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      frameQueue.callback = callback;
      return 1;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const context = createMockContext();
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.idle].image = PLAYER_IMAGE;
    PLATFORM_SPRITES.image = PLATFORM_IMAGE;
    state.spritesReady = true;

    startGame();
    const sprite = PLATFORM_SPRITES.regions[0];
    const platform = {
      x: state.player.x,
      y: state.player.y + state.player.h,
      baseY: state.player.y + state.player.h,
      w: Math.round(sprite.sw * PLATFORM_SPRITES.drawScale),
      h: 12,
      vx: 0,
      phase: 0,
      style: "stone",
      kind: "normal",
      spriteIndex: 0,
      spriteAct: null,
      trim: 0,
      notch: 0,
      hoverAmplitude: 0,
    } as const;
    state.platforms = [platform];
    state.gameOver = true;

    expect(frameQueue.callback).toBeDefined();

    const drawFrame = () => {
      context.drawImage.mockClear();
      frameQueue.callback?.(TEST_FRAME_TIME);
      const playerDrawIndex = context.drawImage.mock.calls.findIndex(
        ([image]) => image === PLAYER_IMAGE,
      );
      const platformDraws = context.drawImage.mock.calls
        .map((call, index) => ({ call, index }))
        .filter(({ call }) => call[0] === PLATFORM_IMAGE);
      expect(platformDraws).toHaveLength(1);
      const [, sourceX, sourceY, sourceWidth, sourceHeight] = platformDraws[0].call;
      expect([sourceX, sourceY, sourceWidth, sourceHeight]).toEqual([
        sprite.sx,
        sprite.sy,
        sprite.sw,
        sprite.sh,
      ]);
      return { platformDrawIndex: platformDraws[0].index, playerDrawIndex };
    };

    const beforeLanding = drawFrame();
    expect(beforeLanding.platformDrawIndex).toBeLessThan(beforeLanding.playerDrawIndex);

    state.player.onPlatform = platform;
    const afterLanding = drawFrame();
    expect(afterLanding.platformDrawIndex).toBeGreaterThan(afterLanding.playerDrawIndex);
  });

  it("layers falling leaves around the foreground scenery but below the player", () => {
    const frameQueue: { callback?: FrameRequestCallback } = {};
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      frameQueue.callback = callback;
      return 1;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const drawOrder: string[] = [];
    const context = createMockContext();
    context.drawImage.mockImplementation((image: CanvasImageSource) => {
      if (image === PLAYER_IMAGE) drawOrder.push("player");
    });
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    vi.mocked(drawBackground).mockImplementationOnce(() => {
      drawOrder.push("background");
    });
    vi.mocked(drawNearForeground).mockImplementation(() => {
      drawOrder.push("foreground");
    });
    vi.mocked(drawFallingLeaves).mockImplementation(({ layer }) => {
      drawOrder.push(`${layer}Leaves`);
    });
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.idle].image = PLAYER_IMAGE;
    state.spritesReady = true;

    startGame();
    state.gameOver = true;
    frameQueue.callback?.(TEST_FRAME_TIME);

    expect(drawOrder).toEqual([
      "background",
      "farLeaves",
      "foreground",
      "nearLeaves",
      "player",
    ]);
    expect(vi.mocked(drawFallingLeaves).mock.calls.map(([options]) => options.layer)).toEqual([
      "far",
      "near",
    ]);
  });

  it("draws a covered enemy behind the near foreground until it emerges", () => {
    const frameQueue: { callback?: FrameRequestCallback } = {};
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      frameQueue.callback = callback;
      return 1;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const context = createMockContext();
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    vi.mocked(drawNearForeground).mockImplementation(() => {
      context.drawImage(FOREGROUND_IMAGE, 0, 0);
    });
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.idle].image = PLAYER_IMAGE;
    ENEMY_SHEETS[0].image = ENEMY_IMAGE;
    WARDEN_BLOOD_MOON_BUFF_SHEET.image = ENEMY_BUFF_IMAGE;
    state.spritesReady = true;

    startGame();
    state.gameOver = true;
    spawnEnemyBySheetIndex(0);

    const coveredEnemy = state.enemies[0];
    coveredEnemy.spawnOccluder = {
      source: "actProp",
      variantIndex: 0,
      x: coveredEnemy.x - SPAWN_OCCLUDER_TEST_PADDING,
      y: coveredEnemy.y - SPAWN_OCCLUDER_TEST_PADDING,
      drawW: SPAWN_OCCLUDER_TEST_SIZE,
      drawH: SPAWN_OCCLUDER_TEST_SIZE,
      alpha: 1,
    };
    coveredEnemy.spawnOccluderStartedAt = state.elapsed;
    coveredEnemy.spawnOccluderDirection = 1;
    coveredEnemy.wardenBuffedFrames = 1;

    const drawFrame = () => {
      context.drawImage.mockClear();
      frameQueue.callback?.(TEST_FRAME_TIME);
      const enemyDraws = context.drawImage.mock.calls.filter(([image]) => image === ENEMY_IMAGE);
      const buffDraws = context.drawImage.mock.calls.filter(([image]) => image === ENEMY_BUFF_IMAGE);
      const foregroundDraws = context.drawImage.mock.calls.filter(([image]) => image === FOREGROUND_IMAGE);
      expect(enemyDraws).toHaveLength(1);
      expect(buffDraws).toHaveLength(1);
      expect(foregroundDraws).toHaveLength(1);
      return {
        enemyDrawIndex: context.drawImage.mock.calls.findIndex(([image]) => image === ENEMY_IMAGE),
        buffDrawIndex: context.drawImage.mock.calls.findIndex(([image]) => image === ENEMY_BUFF_IMAGE),
        foregroundDrawIndex: context.drawImage.mock.calls.findIndex(([image]) => image === FOREGROUND_IMAGE),
      };
    };

    const coveredFrame = drawFrame();
    expect(coveredFrame.enemyDrawIndex).toBeLessThan(coveredFrame.foregroundDrawIndex);
    expect(coveredFrame.buffDrawIndex).toBeLessThan(coveredFrame.foregroundDrawIndex);

    coveredEnemy.x = coveredEnemy.spawnOccluder.x
      + coveredEnemy.spawnOccluder.drawW
      + SPAWN_OCCLUDER_TEST_PADDING;
    const emergedFrame = drawFrame();
    expect(state.enemies[0]).toBe(coveredEnemy);
    expect(emergedFrame.enemyDrawIndex).toBeGreaterThan(emergedFrame.foregroundDrawIndex);
    expect(emergedFrame.buffDrawIndex).toBeGreaterThan(emergedFrame.foregroundDrawIndex);
  });
});
