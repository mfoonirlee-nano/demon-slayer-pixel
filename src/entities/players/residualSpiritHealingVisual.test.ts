import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PLAYER_DRAW,
  RESIDUAL_SPIRIT_CONFIG,
  RESIDUAL_SPIRIT_HEAL_EFFECT_SHEET,
} from "../../constants";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import { drawResidualSpiritHealingEffect } from "./residualSpiritHealingVisual";

type MockCanvasContext = CanvasRenderingContext2D & {
  drawImage: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
};

const TEST_IMAGE = {} as HTMLImageElement;
const NEAR_END_TIMER_RATIO = 0.01;

function createMockContext(): MockCanvasContext {
  return {
    drawImage: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    filter: "none",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
  } as unknown as MockCanvasContext;
}

function installMockContext(context: CanvasRenderingContext2D) {
  setCanvas({
    getContext: () => context,
  } as unknown as HTMLCanvasElement);
}

function drawnSourceX(context: MockCanvasContext) {
  return context.drawImage.mock.calls[0]?.[1];
}

describe("residual-spirit healing visual", () => {
  beforeEach(() => {
    resetState();
    RESIDUAL_SPIRIT_HEAL_EFFECT_SHEET.image = TEST_IMAGE;
  });

  afterEach(() => {
    RESIDUAL_SPIRIT_HEAL_EFFECT_SHEET.image = null;
    setCanvas(null);
  });

  it.each([
    {
      label: "channel start",
      channelTimer: RESIDUAL_SPIRIT_CONFIG.healChannelSeconds,
      completionTimer: 0,
      expectedFrame: 0,
    },
    {
      label: "channel midpoint",
      channelTimer: RESIDUAL_SPIRIT_CONFIG.healChannelSeconds / 2,
      completionTimer: 0,
      expectedFrame: 2,
    },
    {
      label: "channel end",
      channelTimer: RESIDUAL_SPIRIT_CONFIG.healChannelSeconds * NEAR_END_TIMER_RATIO,
      completionTimer: 0,
      expectedFrame: 4,
    },
    {
      label: "completion peak",
      channelTimer: 0,
      completionTimer: RESIDUAL_SPIRIT_CONFIG.healCompletionVisualSeconds,
      expectedFrame: 5,
    },
    {
      label: "completion decay",
      channelTimer: 0,
      completionTimer: RESIDUAL_SPIRIT_CONFIG.healCompletionVisualSeconds / 2,
      expectedFrame: 6,
    },
    {
      label: "completion end",
      channelTimer: 0,
      completionTimer:
        RESIDUAL_SPIRIT_CONFIG.healCompletionVisualSeconds * NEAR_END_TIMER_RATIO,
      expectedFrame: 7,
    },
  ])("draws the non-looping $label frame", ({
    channelTimer,
    completionTimer,
    expectedFrame,
  }) => {
    const context = createMockContext();
    installMockContext(context);
    state.player.residualSpiritHealTimer = channelTimer;
    state.player.residualSpiritHealCompletionTimer = completionTimer;

    drawResidualSpiritHealingEffect();

    expect(drawnSourceX(context)).toBe(
      expectedFrame * RESIDUAL_SPIRIT_HEAL_EFFECT_SHEET.frameW,
    );
  });

  it("anchors the effect to the player center and feet without facing mirroring", () => {
    const context = createMockContext();
    installMockContext(context);
    state.player.facing = -1;
    state.player.residualSpiritHealTimer = RESIDUAL_SPIRIT_CONFIG.healChannelSeconds;

    drawResidualSpiritHealingEffect();

    const sheet = RESIDUAL_SPIRIT_HEAL_EFFECT_SHEET;
    const refX = state.player.x + state.player.w / 2;
    const refY = state.player.y + state.player.h - PLAYER_DRAW.yOffset;
    expect(context.translate).toHaveBeenCalledWith(
      refX,
      refY - sheet.drawH * sheet.anchorY + sheet.drawH / 2,
    );
    expect(context.scale).toHaveBeenCalledWith(1, 1);
  });

  it("does not draw while inactive or after the player dies", () => {
    const context = createMockContext();
    installMockContext(context);

    drawResidualSpiritHealingEffect();
    expect(context.drawImage).not.toHaveBeenCalled();

    state.player.hp = 0;
    state.player.residualSpiritHealTimer = RESIDUAL_SPIRIT_CONFIG.healChannelSeconds;
    drawResidualSpiritHealingEffect();
    expect(context.drawImage).not.toHaveBeenCalled();
  });
});
