import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MOON_TIDE_PLAYER_SHEETS,
  PLAYER_ANIMATION_STATES,
  PLAYER_COMBAT,
  PLAYER_SHEETS,
} from "../../constants";
import { keys } from "../../game/input";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import type { UltimatePlayerGhostAction, UltimatePlayerGhostSnapshot } from "../../types/game-state";
import { updatePlayer } from "../player";
import { drawUltimateAfterimageSlashes, drawUltimatePlayerGhosts, updateUltimatePlayerGhosts } from "../particle";
import { drawPlayer } from "./render";
import {
  moonTidePlayerAnimationFrameSpeed,
  moonTidePlayerGhostMaxCount,
  recordMoonTidePlayerGhost,
  spawnMoonTideTrail,
  triggerMoonTideAfterimageHit,
} from "./moonTide";

const audioMock = vi.hoisted(() => ({
  playSfx: vi.fn(),
}));

vi.mock("../../game/audio", () => audioMock);

const LEVEL_ONE_GHOST_CAP = 3;
const LEVEL_THREE_GHOST_CAP = 5;
const EXPECTED_TRAIL_CAP = Math.ceil(
  PLAYER_COMBAT.ultimateTrailLife / PLAYER_COMBAT.ultimateTrailSpawnInterval,
) + 2;
const EXPECTED_AFTERIMAGE_SLASH_CAP = 24;
const TRAIL_STRESS_FRAMES = 90;
const TRAIL_START_TIMER = 300;
const AFTERIMAGE_STRESS_HITS = 20;
const AFTERIMAGE_HIT_X = 160;
const AFTERIMAGE_HIT_Y = 180;
const AFTERIMAGE_TARGET_SPREAD = 80;
const IDLE_GHOST_VISIBLE_FRAMES = 18;
const HURT_INVINCIBILITY_GHOST_RESUME_OFFSET = 12;
const MOON_TIDE_LEVEL_THREE_MOVE_MULTIPLIER = 1.25;

type MockCanvasContext = CanvasRenderingContext2D & {
  drawImage: ReturnType<typeof vi.fn>;
  filterValues: string[];
  strokeStyleValues: string[];
};

function ghostSnapshot(action: UltimatePlayerGhostAction): UltimatePlayerGhostSnapshot {
  return {
    source: "player",
    animationState: action === "fallAttack"
      ? PLAYER_ANIMATION_STATES.fallAttack
      : PLAYER_ANIMATION_STATES.attack,
    action,
    frame: 0,
    x: 120,
    y: 220,
    w: 96,
    h: 120,
    facing: 1,
  };
}

function createMockContext(): MockCanvasContext {
  const context = {
    drawImage: vi.fn(),
    filterValues: [],
    strokeStyleValues: [],
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
  } as unknown as MockCanvasContext;

  Object.defineProperty(context, "filter", {
    get: () => context.filterValues[context.filterValues.length - 1] ?? "none",
    set: (value: string) => {
      context.filterValues.push(value);
    },
  });
  Object.defineProperty(context, "strokeStyle", {
    get: () => context.strokeStyleValues[context.strokeStyleValues.length - 1] ?? "#000",
    set: (value: string | CanvasGradient | CanvasPattern) => {
      context.strokeStyleValues.push(String(value));
    },
  });

  return context;
}

function installMockContext(context: CanvasRenderingContext2D) {
  setCanvas({
    getContext: () => context,
  } as unknown as HTMLCanvasElement);
}

describe("moon tide player ghosts", () => {
  beforeEach(() => {
    resetState();
    keys.clear();
    audioMock.playSfx.mockClear();
  });

  afterEach(() => {
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.idle].image = null;
    MOON_TIDE_PLAYER_SHEETS[PLAYER_ANIMATION_STATES.idle].image = null;
    setCanvas(null);
  });

  it("caps concurrent ghosts by ultimate level", () => {
    state.player.ultimateLevel = 1;
    for (let timer = 60; timer > 0; timer -= 1) {
      state.player.ultimateTimer = timer;
      recordMoonTidePlayerGhost(ghostSnapshot("attack"));
    }

    expect(moonTidePlayerGhostMaxCount()).toBe(LEVEL_ONE_GHOST_CAP);
    expect(state.ultimatePlayerGhosts).toHaveLength(LEVEL_ONE_GHOST_CAP);

    resetState();
    state.player.ultimateLevel = 3;
    for (let timer = 60; timer > 0; timer -= 1) {
      state.player.ultimateTimer = timer;
      recordMoonTidePlayerGhost(ghostSnapshot("attack"));
    }

    expect(moonTidePlayerGhostMaxCount()).toBe(LEVEL_THREE_GHOST_CAP);
    expect(state.ultimatePlayerGhosts).toHaveLength(LEVEL_THREE_GHOST_CAP);
  });

  it("keeps idle ghosts sparse even while moon tide is active", () => {
    state.player.ultimateLevel = 3;
    state.player.ultimateTimer = 36;

    expect(recordMoonTidePlayerGhost(ghostSnapshot("idle"))).toBe(true);

    state.player.ultimateTimer = 18;

    expect(recordMoonTidePlayerGhost(ghostSnapshot("idle"))).toBe(false);
    expect(state.ultimatePlayerGhosts).toHaveLength(1);
  });

  it("keeps idle ghosts alive long enough to be visible while standing still", () => {
    state.player.ultimateLevel = 1;
    state.player.ultimateTimer = 36;

    expect(recordMoonTidePlayerGhost(ghostSnapshot("idle"))).toBe(true);

    for (let frame = 0; frame < IDLE_GHOST_VISIBLE_FRAMES; frame += 1) {
      updateUltimatePlayerGhosts();
    }

    expect(state.ultimatePlayerGhosts).toHaveLength(1);
  });

  it("keeps motion ghosts shorter than idle ghosts so old action frames do not dominate", () => {
    state.player.ultimateLevel = 1;
    state.player.ultimateTimer = 36;

    expect(recordMoonTidePlayerGhost(ghostSnapshot("idle"))).toBe(true);
    const idleLife = state.ultimatePlayerGhosts[0].maxLife;

    resetState();
    state.player.ultimateLevel = 1;
    state.player.ultimateTimer = 30;

    expect(recordMoonTidePlayerGhost(ghostSnapshot("move"))).toBe(true);
    const moveLife = state.ultimatePlayerGhosts[0].maxLife;

    expect(moveLife).toBeLessThan(idleLife);
  });

  it("samples ghosts through the real player draw path during moon tide", () => {
    state.player.ultimateLevel = 1;
    state.player.ultimateTimer = 36;

    drawPlayer();

    expect(state.ultimatePlayerGhosts).toHaveLength(1);
    expect(state.ultimatePlayerGhosts[0]).toMatchObject({
      source: "player",
      action: "idle",
    });
  });

  it("stops spawning after moon tide ends and lets existing ghosts fade out", () => {
    state.player.ultimateLevel = 3;
    state.player.ultimateTimer = 30;

    expect(recordMoonTidePlayerGhost(ghostSnapshot("attack"))).toBe(true);

    const life = state.ultimatePlayerGhosts[0].maxLife;
    state.player.ultimateTimer = 0;

    expect(recordMoonTidePlayerGhost(ghostSnapshot("attack"))).toBe(false);
    expect(state.ultimatePlayerGhosts).toHaveLength(1);

    for (let frame = 0; frame < life; frame += 1) {
      updateUltimatePlayerGhosts();
    }

    expect(state.ultimatePlayerGhosts).toHaveLength(0);
  });

  it("pauses new ghosts during the early hurt invincibility window", () => {
    state.player.ultimateLevel = 3;
    state.player.ultimateTimer = 30;
    state.player.invincible = PLAYER_COMBAT.hurtInvincibleFrames;

    expect(recordMoonTidePlayerGhost(ghostSnapshot("attack"))).toBe(false);

    state.player.invincible = PLAYER_COMBAT.hurtInvincibleFrames - HURT_INVINCIBILITY_GHOST_RESUME_OFFSET;

    expect(recordMoonTidePlayerGhost(ghostSnapshot("attack"))).toBe(true);
  });

  it("clears ghosts on state reset", () => {
    state.player.ultimateLevel = 3;
    state.player.ultimateTimer = 30;

    expect(recordMoonTidePlayerGhost(ghostSnapshot("attack"))).toBe(true);

    resetState();

    expect(state.ultimatePlayerGhosts).toHaveLength(0);
  });

  it("draws active player ghosts with one batched filter setup", () => {
    const context = createMockContext();
    const idleSheet = MOON_TIDE_PLAYER_SHEETS[PLAYER_ANIMATION_STATES.idle];
    idleSheet.image = {} as HTMLImageElement;
    installMockContext(context);

    state.ultimatePlayerGhosts.push({
      ...ghostSnapshot("idle"),
      animationState: PLAYER_ANIMATION_STATES.idle,
      life: 10,
      maxLife: 10,
      strength: 1,
    });
    state.ultimatePlayerGhosts.push({
      ...ghostSnapshot("idle"),
      animationState: PLAYER_ANIMATION_STATES.idle,
      frame: 1,
      x: 96,
      life: 8,
      maxLife: 10,
      strength: 0.8,
    });

    drawUltimatePlayerGhosts();

    expect(context.drawImage).toHaveBeenCalledTimes(2);
    expect(context.drawImage.mock.calls[0]?.[0]).toBe(idleSheet.image);
    expect(context.filterValues).toHaveLength(1);
    expect(context.filterValues[0]).toContain("drop-shadow");
    expect(context.filterValues[0]).toContain("invert(60%)");
    expect(context.filterValues[0]).toContain("hue-rotate(172deg)");
    expect(context.filterValues[0]).toContain("rgba(42, 178, 255");
  });

  it("draws afterimage slashes with water-blue strokes", () => {
    const context = createMockContext();
    installMockContext(context);

    state.ultimateAfterimageSlashes.push({
      x: 140,
      y: 180,
      w: 76,
      h: 24,
      facing: 1,
      life: 10,
      maxLife: 10,
      power: 1,
    });

    drawUltimateAfterimageSlashes();

    expect(context.strokeStyleValues).toEqual([
      "rgba(78, 210, 255, 0.9)",
      "rgba(34, 142, 255, 0.64)",
    ]);
  });

  it("caps moon tide trail visuals to the visible lifetime window", () => {
    state.player.ultimateLevel = 3;
    state.player.vx = state.player.speed;

    for (let frame = 0; frame < TRAIL_STRESS_FRAMES; frame += 1) {
      state.player.ultimateTimer = TRAIL_START_TIMER - frame;
      spawnMoonTideTrail();
    }

    expect(state.ultimateTrails).toHaveLength(EXPECTED_TRAIL_CAP);
  });

  it("caps afterimage slash visuals without dropping the extra hit damage", () => {
    const applyDamage = vi.fn();
    state.player.ultimateLevel = 3;
    state.player.ultimateTimer = 120;

    for (let hit = 0; hit < AFTERIMAGE_STRESS_HITS; hit += 1) {
      expect(triggerMoonTideAfterimageHit(
        AFTERIMAGE_HIT_X,
        AFTERIMAGE_HIT_Y,
        AFTERIMAGE_TARGET_SPREAD,
        applyDamage,
      )).toBe(true);
    }

    expect(applyDamage).toHaveBeenCalledTimes(AFTERIMAGE_STRESS_HITS);
    expect(state.ultimateAfterimageSlashes).toHaveLength(EXPECTED_AFTERIMAGE_SLASH_CAP);
  });

  it("plays the afterimage cue when moon tide adds a hit", () => {
    state.player.ultimateLevel = 3;
    state.player.ultimateTimer = 120;

    expect(triggerMoonTideAfterimageHit(
      AFTERIMAGE_HIT_X,
      AFTERIMAGE_HIT_Y,
      AFTERIMAGE_TARGET_SPREAD,
      vi.fn(),
    )).toBe(true);

    expect(audioMock.playSfx).toHaveBeenCalledWith("playerUltimateAfterimage");
  });

  it("applies the moon tide movement multiplier during the active buff", () => {
    keys.add("d");

    const normalStartX = state.player.x;
    updatePlayer();
    const normalDistance = state.player.x - normalStartX;

    resetState();
    keys.clear();
    keys.add("d");
    state.player.ultimateLevel = 3;
    state.player.ultimateTimer = 30;

    const moonTideStartX = state.player.x;
    updatePlayer();
    const moonTideDistance = state.player.x - moonTideStartX;

    expect(moonTideDistance).toBeGreaterThan(normalDistance);
    expect(moonTideDistance).toBeCloseTo(state.player.speed * MOON_TIDE_LEVEL_THREE_MOVE_MULTIPLIER);
  });

  it("speeds up movement animation cadence during the active buff", () => {
    const baseRunFrameSpeed = 4;

    expect(moonTidePlayerAnimationFrameSpeed("move", baseRunFrameSpeed)).toBe(baseRunFrameSpeed);

    state.player.ultimateLevel = 3;
    state.player.ultimateTimer = 30;

    expect(moonTidePlayerAnimationFrameSpeed("move", baseRunFrameSpeed))
      .toBeCloseTo(baseRunFrameSpeed / MOON_TIDE_LEVEL_THREE_MOVE_MULTIPLIER);
    expect(moonTidePlayerAnimationFrameSpeed("attack", baseRunFrameSpeed)).toBe(baseRunFrameSpeed);
  });
});
