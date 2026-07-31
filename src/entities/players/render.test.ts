import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BINDER_TALISMAN_SHEET,
  BINDER_TALISMAN_KEY_SCRAMBLE_EFFECT_SHEET,
  BINDER_TALISMAN_STUN_EFFECT_SHEET,
  MOON_TIDE_PLAYER_SHEETS,
  PLAYER_ANIMATION_STATES,
  PLAYER_COMBAT,
  PLAYER_DRAW,
  PLAYER_SHEETS,
  ULTIMATE_SKILL_SHEET,
} from "../../constants";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import { drawPlayer } from "./render";

type MockCanvasContext = CanvasRenderingContext2D & {
  drawImage: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
};

const BINDER_ATTACHMENT_BACK_OFFSET_RATIO = 0.24;
const BINDER_ATTACHMENT_CENTER_Y_RATIO = 0.55;
const BINDER_KEY_SCRAMBLE_HOVER_Y_OFFSET = 18;
const EXPECTED_ULTIMATE_CAST_FRAME_DURATION = 5;
const TEST_IMAGE = {} as HTMLImageElement;
const RUN_IMAGE = {} as HTMLImageElement;
const MOVING_ATTACK_IMAGE = {} as HTMLImageElement;
const MOON_TIDE_IMAGES: Record<keyof typeof MOON_TIDE_PLAYER_SHEETS, HTMLImageElement> = {
  [PLAYER_ANIMATION_STATES.idle]: {} as HTMLImageElement,
  [PLAYER_ANIMATION_STATES.run]: {} as HTMLImageElement,
  [PLAYER_ANIMATION_STATES.jump]: {} as HTMLImageElement,
  [PLAYER_ANIMATION_STATES.attack]: {} as HTMLImageElement,
  [PLAYER_ANIMATION_STATES.movingAttack]: {} as HTMLImageElement,
  [PLAYER_ANIMATION_STATES.fallAttack]: {} as HTMLImageElement,
};

function createMockContext(): MockCanvasContext {
  const context = {
    drawImage: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    globalAlpha: 1,
  } as unknown as MockCanvasContext;

  Object.defineProperty(context, "filter", {
    get: () => "none",
    set: vi.fn(),
  });

  return context;
}

function installMockContext(context: CanvasRenderingContext2D) {
  setCanvas({
    getContext: () => context,
  } as unknown as HTMLCanvasElement);
}

describe("player render", () => {
  beforeEach(() => {
    resetState();
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.idle].image = TEST_IMAGE;
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.run].image = RUN_IMAGE;
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.movingAttack].image = MOVING_ATTACK_IMAGE;
    for (const stateName of Object.values(PLAYER_ANIMATION_STATES)) {
      MOON_TIDE_PLAYER_SHEETS[stateName].image = MOON_TIDE_IMAGES[stateName];
    }
    BINDER_TALISMAN_SHEET.image = TEST_IMAGE;
    BINDER_TALISMAN_KEY_SCRAMBLE_EFFECT_SHEET.image = TEST_IMAGE;
    BINDER_TALISMAN_STUN_EFFECT_SHEET.image = TEST_IMAGE;
    ULTIMATE_SKILL_SHEET.image = TEST_IMAGE;
  });

  afterEach(() => {
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.idle].image = null;
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.run].image = null;
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.movingAttack].image = null;
    for (const sheet of Object.values(MOON_TIDE_PLAYER_SHEETS)) {
      sheet.image = null;
    }
    BINDER_TALISMAN_SHEET.image = null;
    BINDER_TALISMAN_KEY_SCRAMBLE_EFFECT_SHEET.image = null;
    BINDER_TALISMAN_STUN_EFFECT_SHEET.image = null;
    ULTIMATE_SKILL_SHEET.image = null;
    setCanvas(null);
    vi.restoreAllMocks();
  });

  it.each([
    { facing: 1, direction: -1 },
    { facing: -1, direction: 1 },
  ])("draws binder talisman on the visual back and key scramble above the head when facing $facing", ({ facing, direction }) => {
    const context = createMockContext();
    installMockContext(context);
    state.player.facing = facing;
    state.player.binderTalismanKeyScrambleTimer = 30;

    drawPlayer();

    const talismanTranslate = context.translate.mock.calls[1];
    expect(talismanTranslate).toBeDefined();
    const [talismanCenterX, talismanCenterY] = talismanTranslate;
    const idleSheet = PLAYER_SHEETS[PLAYER_ANIMATION_STATES.idle];
    const playerCenterX = state.player.x + state.player.w / 2;
    const playerRefY = state.player.y + state.player.h - PLAYER_DRAW.yOffset;
    const playerSpriteTop = playerRefY - idleSheet.drawH * (idleSheet.anchorY ?? 1);

    expect(talismanCenterX).toBeCloseTo(
      playerCenterX + direction * idleSheet.drawW * BINDER_ATTACHMENT_BACK_OFFSET_RATIO,
    );
    expect(talismanCenterY).toBeCloseTo(
      playerSpriteTop + idleSheet.drawH * BINDER_ATTACHMENT_CENTER_Y_RATIO,
    );

    const keyScrambleTranslate = context.translate.mock.calls[2];
    expect(keyScrambleTranslate).toBeDefined();
    expect(keyScrambleTranslate[0]).toBeCloseTo(playerCenterX);
    expect(keyScrambleTranslate[1]).toBeCloseTo(playerSpriteTop - BINDER_KEY_SCRAMBLE_HOVER_Y_OFFSET);
  });

  it("draws stun attachment effects from the talisman center", () => {
    const context = createMockContext();
    installMockContext(context);
    state.player.binderTalismanStunStatusTimer = 30;

    drawPlayer();

    expect(context.translate.mock.calls[2]).toEqual(context.translate.mock.calls[1]);
  });

  it("holds each ultimate cast sprite for five game frames before advancing", () => {
    const context = createMockContext();
    installMockContext(context);
    expect(PLAYER_COMBAT.ultimateCastFrames).toBe(
      ULTIMATE_SKILL_SHEET.count * EXPECTED_ULTIMATE_CAST_FRAME_DURATION,
    );

    state.player.ultimateCastTimer = PLAYER_COMBAT.ultimateCastFrames
      - EXPECTED_ULTIMATE_CAST_FRAME_DURATION
      + 1;
    drawPlayer();
    expect(context.drawImage.mock.calls[0]?.[1]).toBe(0);

    context.drawImage.mockClear();
    state.player.ultimateCastTimer -= 1;
    drawPlayer();
    expect(context.drawImage.mock.calls[0]?.[1]).toBe(ULTIMATE_SKILL_SHEET.frameW);
  });

  it("renders a running basic attack from the movement-specific sheet", () => {
    const context = createMockContext();
    installMockContext(context);
    state.player.attackFromRun = true;
    state.player.attackTimer = state.player.attackDuration;

    drawPlayer();

    expect(context.drawImage.mock.calls[0]?.[0]).toBe(MOVING_ATTACK_IMAGE);
  });

  it.each([
    {
      stateName: PLAYER_ANIMATION_STATES.idle,
      configure: () => {},
    },
    {
      stateName: PLAYER_ANIMATION_STATES.run,
      configure: () => {
        state.player.vx = state.player.speed;
      },
    },
    {
      stateName: PLAYER_ANIMATION_STATES.jump,
      configure: () => {
        state.player.y -= 100;
      },
    },
    {
      stateName: PLAYER_ANIMATION_STATES.attack,
      configure: () => {
        state.player.attackTimer = state.player.attackDuration;
      },
    },
    {
      stateName: PLAYER_ANIMATION_STATES.movingAttack,
      configure: () => {
        state.player.attackFromRun = true;
        state.player.attackTimer = state.player.attackDuration;
      },
    },
    {
      stateName: PLAYER_ANIMATION_STATES.fallAttack,
      configure: () => {
        state.player.y -= 100;
        state.player.fallAttackTimer = 1;
      },
    },
  ])("renders the $stateName-specific Moon Tide sheet during the active buff", ({ stateName, configure }) => {
    const context = createMockContext();
    installMockContext(context);
    state.player.ultimateLevel = 1;
    state.player.ultimateTimer = 30;
    configure();

    drawPlayer();

    expect(context.drawImage.mock.calls[0]?.[0]).toBe(MOON_TIDE_IMAGES[stateName]);
  });

  it("locks the run frame to traveled distance instead of global elapsed", () => {
    const context = createMockContext();
    installMockContext(context);
    const runSheet = PLAYER_SHEETS[PLAYER_ANIMATION_STATES.run];
    const expectedFrame = 3;
    state.elapsed = 99;
    state.player.vx = state.player.speed;
    state.player.runStepDistance = PLAYER_COMBAT.runAnimationCycleDistance * expectedFrame / runSheet.count;

    drawPlayer();

    expect(context.drawImage.mock.calls[0]?.[0]).toBe(RUN_IMAGE);
    expect(context.drawImage.mock.calls[0]?.[1]).toBe(runSheet.frameW * expectedFrame);
  });
});
