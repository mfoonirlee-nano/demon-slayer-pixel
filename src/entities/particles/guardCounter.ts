import { state } from "../../game/state";
import { ctx } from "../../rendering/context";
import { SKILL_IDS } from "../../constants";
import {
  CORE_PLAYER_SKILL_EFFECT_CONFIGS,
  corePlayerSkillEffectSheetForLevel,
  guardCounterHitSheetForLevel,
} from "../../systems/skillCatalog";
import type { GuardCounterEffectState } from "../../types/game-state";

const GUARD_COUNTER_EFFECT_CONFIG = CORE_PLAYER_SKILL_EFFECT_CONFIGS[SKILL_IDS.guardCounter];

export function updateGuardCounterEffect() {
  const eff = state.guardCounterEffect;
  if (!eff) return;
  eff.elapsed += 1;
  if (eff.barrierFlash > 0) eff.barrierFlash -= 1;
  const windowExpired = eff.elapsed >= eff.activeFrames;
  if ((eff.hitsRemaining <= 0 || windowExpired) && eff.barrierFlash <= 0) {
    state.guardCounterEffect = null;
    return;
  }

  eff.frame = guardCounterVisualFrame(eff, eff.barrierFlash > 0);
}

export function guardCounterVisualFrame(effect: GuardCounterEffectState, counter: boolean) {
  const config = GUARD_COUNTER_EFFECT_CONFIG;
  const sheet = counter
    ? guardCounterHitSheetForLevel(effect.effectLevel)
    : corePlayerSkillEffectSheetForLevel(SKILL_IDS.guardCounter, effect.effectLevel);
  if (counter) {
    return Math.min(sheet.count - 1,
      Math.floor((config.barrierFlashFrames - effect.barrierFlash) / config.barrierFrameDuration));
  }
  return Math.floor(effect.elapsed / config.frameDuration) % sheet.count;
}

export function drawGuardCounterEffect() {
  if (!ctx) return;
  const eff = state.guardCounterEffect;
  if (!eff) return;
  const sheet = corePlayerSkillEffectSheetForLevel(SKILL_IDS.guardCounter, eff.effectLevel);
  const p = state.player;
  const cx = p.x + p.w / 2;
  const feetY = p.y + p.h;
  const remainingRatio = Math.max(0, eff.hitsRemaining / Math.max(1, eff.maxHits));
  const showStartupBarrier = eff.elapsed < GUARD_COUNTER_EFFECT_CONFIG.startupFrames;
  const showHitBarrier = eff.barrierFlash > 0;

  const guardActive = eff.hitsRemaining > 0 && eff.elapsed < eff.activeFrames;
  if (sheet.image && guardActive) {
    const scale = GUARD_COUNTER_EFFECT_CONFIG.drawScale;
    const drawW = sheet.frameW * scale;
    const drawH = sheet.frameH * scale;
    const cy = feetY - GUARD_COUNTER_EFFECT_CONFIG.centerYOffset;
    const frame = guardCounterVisualFrame(eff, false);
    const startupRatio = Math.max(0, 1 - eff.elapsed / GUARD_COUNTER_EFFECT_CONFIG.startupFrames);
    ctx.save();
    const sustainAlpha = GUARD_COUNTER_EFFECT_CONFIG.sustainedAlphaMin
      + remainingRatio * GUARD_COUNTER_EFFECT_CONFIG.sustainedAlphaRange;
    ctx.globalAlpha = showStartupBarrier
      ? sustainAlpha + startupRatio * (GUARD_COUNTER_EFFECT_CONFIG.startupAlpha - sustainAlpha)
      : sustainAlpha;
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(sheet.image, frame * sheet.frameW, 0, sheet.frameW, sheet.frameH,
      cx - drawW / 2, cy - drawH / 2, drawW, drawH);
    ctx.restore();
  }

  if (showHitBarrier) {
    const counter = guardCounterHitSheetForLevel(eff.effectLevel);
    if (counter.image) {
      const scale = GUARD_COUNTER_EFFECT_CONFIG.barrierDrawScale;
      const width = counter.frameW * scale;
      const height = counter.frameH * scale;
      const frame = guardCounterVisualFrame(eff, true);
      ctx.save();
      ctx.globalAlpha = GUARD_COUNTER_EFFECT_CONFIG.counterAlphaMax
        * eff.barrierFlash / GUARD_COUNTER_EFFECT_CONFIG.barrierFlashFrames;
      ctx.globalCompositeOperation = "source-over";
      ctx.translate(cx, feetY - GUARD_COUNTER_EFFECT_CONFIG.barrierCenterYOffset);
      ctx.scale(p.facing, 1);
      ctx.drawImage(counter.image, frame * counter.frameW, 0, counter.frameW, counter.frameH,
        -width / 2, -height / 2, width, height);
      ctx.restore();
    }
  }

}
