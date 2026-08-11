import {
  PLAYER_DRAW,
  RESIDUAL_SPIRIT_CONFIG,
  RESIDUAL_SPIRIT_HEAL_EFFECT_SHEET,
} from "../../constants";
import { state } from "../../game/state";
import { drawSheetFrame } from "../../rendering/graphics";

function clampedProgress(remaining: number, duration: number) {
  return Math.min(1, Math.max(0, 1 - remaining / duration));
}

function residualSpiritHealingFrame() {
  const player = state.player;
  const sheet = RESIDUAL_SPIRIT_HEAL_EFFECT_SHEET;

  if (player.residualSpiritHealTimer > 0) {
    const progress = clampedProgress(
      player.residualSpiritHealTimer,
      RESIDUAL_SPIRIT_CONFIG.healChannelSeconds,
    );
    return Math.min(
      sheet.channelFrameCount - 1,
      Math.floor(progress * sheet.channelFrameCount),
    );
  }

  if (player.residualSpiritHealCompletionTimer <= 0) return null;

  const completionFrameCount = sheet.count - sheet.channelFrameCount;
  const progress = clampedProgress(
    player.residualSpiritHealCompletionTimer,
    RESIDUAL_SPIRIT_CONFIG.healCompletionVisualSeconds,
  );
  return sheet.channelFrameCount + Math.min(
    completionFrameCount - 1,
    Math.floor(progress * completionFrameCount),
  );
}

export function drawResidualSpiritHealingEffect() {
  const player = state.player;
  const sheet = RESIDUAL_SPIRIT_HEAL_EFFECT_SHEET;
  if (!sheet.image || state.gameOver || player.hp <= 0) return;

  const frame = residualSpiritHealingFrame();
  if (frame === null) return;

  const refX = player.x + player.w / 2;
  const refY = player.y + player.h - PLAYER_DRAW.yOffset;
  drawSheetFrame(
    sheet,
    frame,
    refX - sheet.drawW * sheet.anchorX,
    refY - sheet.drawH * sheet.anchorY,
    sheet.drawW,
    sheet.drawH,
  );
}
