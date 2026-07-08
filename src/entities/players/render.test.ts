import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BINDER_TALISMAN_SHEET,
  BINDER_TALISMAN_KEY_SCRAMBLE_EFFECT_SHEET,
  BINDER_TALISMAN_STUN_EFFECT_SHEET,
  PLAYER_ANIMATION_STATES,
  PLAYER_DRAW,
  PLAYER_SHEETS,
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
const TEST_IMAGE = {} as HTMLImageElement;

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
    BINDER_TALISMAN_SHEET.image = TEST_IMAGE;
    BINDER_TALISMAN_KEY_SCRAMBLE_EFFECT_SHEET.image = TEST_IMAGE;
    BINDER_TALISMAN_STUN_EFFECT_SHEET.image = TEST_IMAGE;
  });

  afterEach(() => {
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.idle].image = null;
    BINDER_TALISMAN_SHEET.image = null;
    BINDER_TALISMAN_KEY_SCRAMBLE_EFFECT_SHEET.image = null;
    BINDER_TALISMAN_STUN_EFFECT_SHEET.image = null;
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
});
