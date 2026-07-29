import {
  BASIC_ATTACK,
  CLOSE_ARC_BASIC_CRESCENT_ALPHA_BOUNDS,
  CLOSE_ARC_BASIC_CRESCENT_CONFIG,
  CLOSE_ARC_BASIC_CRESCENT_SHEET,
} from "../../constants";
import { state } from "../../game/state";
import { ctx } from "../../rendering/context";
import type { HuntBladeReachEffectState } from "../../types/game-state";

function syncHuntBladeReachEffect(effect: HuntBladeReachEffectState) {
  const player = state.player;
  const baseAttackTipX = player.facing === 1
    ? player.x + player.w + BASIC_ATTACK.reach
    : player.x - BASIC_ATTACK.reach;
  effect.x = baseAttackTipX + player.facing * effect.reachExtension / 2;
  effect.y = player.y + BASIC_ATTACK.yOffset + BASIC_ATTACK.height / 2;
  effect.facing = player.facing;
}

export function spawnHuntBladeReachEffect(reachBonus: number) {
  if (reachBonus <= 0) return;

  const player = state.player;
  const life = Math.max(1, player.attackDuration);
  const effect: HuntBladeReachEffectState = {
    x: 0,
    y: 0,
    facing: player.facing,
    frame: 0,
    elapsed: 0,
    life,
    reachExtension: reachBonus,
  };
  syncHuntBladeReachEffect(effect);
  state.huntBladeReachEffects.push(effect);

  while (
    state.huntBladeReachEffects.length
    > CLOSE_ARC_BASIC_CRESCENT_CONFIG.maxInstances
  ) {
    state.huntBladeReachEffects.shift();
  }
}

export function updateHuntBladeReachEffects() {
  for (let index = state.huntBladeReachEffects.length - 1; index >= 0; index -= 1) {
    const effect = state.huntBladeReachEffects[index];
    if (effect.life <= 0) {
      state.huntBladeReachEffects.splice(index, 1);
      continue;
    }

    syncHuntBladeReachEffect(effect);
    effect.elapsed += 1;
    effect.life -= 1;
    effect.frame = (
      Math.floor(effect.elapsed / CLOSE_ARC_BASIC_CRESCENT_CONFIG.frameDuration)
    ) % CLOSE_ARC_BASIC_CRESCENT_SHEET.count;
  }
}

export function drawHuntBladeReachEffects() {
  const image = CLOSE_ARC_BASIC_CRESCENT_SHEET.image;
  if (!ctx || !image) return;

  for (const effect of state.huntBladeReachEffects) {
    const alphaBounds = CLOSE_ARC_BASIC_CRESCENT_ALPHA_BOUNDS[effect.frame]
      ?? CLOSE_ARC_BASIC_CRESCENT_ALPHA_BOUNDS[0];
    const scale = effect.reachExtension / alphaBounds.width;
    const drawWidth = CLOSE_ARC_BASIC_CRESCENT_SHEET.frameW * scale;
    const drawHeight = CLOSE_ARC_BASIC_CRESCENT_SHEET.frameH * scale;
    const visibleCenterX = alphaBounds.x + alphaBounds.width / 2;
    const visibleCenterY = alphaBounds.y + alphaBounds.height / 2;
    const sourceX = effect.frame * CLOSE_ARC_BASIC_CRESCENT_SHEET.frameW;
    ctx.save();
    ctx.translate(effect.x, effect.y);
    ctx.scale(effect.facing, 1);
    ctx.drawImage(
      image,
      sourceX,
      0,
      CLOSE_ARC_BASIC_CRESCENT_SHEET.frameW,
      CLOSE_ARC_BASIC_CRESCENT_SHEET.frameH,
      -visibleCenterX * scale,
      -visibleCenterY * scale,
      drawWidth,
      drawHeight,
    );
    ctx.restore();
  }
}
