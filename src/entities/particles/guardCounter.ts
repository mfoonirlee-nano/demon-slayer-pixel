import { state } from "../../game/state";
import { ctx } from "../../rendering/context";
import { SKILL_IDS } from "../../constants";
import { CORE_PLAYER_SKILL_EFFECT_CONFIGS, CORE_PLAYER_SKILL_EFFECT_SHEETS } from "../../systems/skillCatalog";

const FULL_CIRCLE_RADIANS = Math.PI * 2;
const GUARD_COUNTER_EFFECT_SHEET = CORE_PLAYER_SKILL_EFFECT_SHEETS[SKILL_IDS.guardCounter];
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

  if (eff.barrierFlash > 0) {
    const flashElapsed = GUARD_COUNTER_EFFECT_CONFIG.barrierFlashFrames - eff.barrierFlash;
    eff.frame = Math.min(
      GUARD_COUNTER_EFFECT_SHEET.count - 1,
      Math.floor(flashElapsed / GUARD_COUNTER_EFFECT_CONFIG.barrierFrameDuration),
    );
    return;
  }

  const rawFrame = Math.floor(eff.elapsed / GUARD_COUNTER_EFFECT_CONFIG.frameDuration);
  eff.frame = eff.elapsed < GUARD_COUNTER_EFFECT_CONFIG.startupFrames
    ? Math.min(GUARD_COUNTER_EFFECT_SHEET.count - 1, rawFrame)
    : rawFrame % GUARD_COUNTER_EFFECT_SHEET.count;
}

export function drawGuardCounterEffect() {
  if (!ctx) return;
  const eff = state.guardCounterEffect;
  if (!eff) return;
  const sheet = GUARD_COUNTER_EFFECT_SHEET;
  const p = state.player;
  const cx = p.x + p.w / 2;
  const feetY = p.y + p.h;
  const remainingRatio = Math.max(0, eff.hitsRemaining / Math.max(1, eff.maxHits));
  const showStartupBarrier = eff.elapsed < GUARD_COUNTER_EFFECT_CONFIG.startupFrames;
  const showHitBarrier = eff.barrierFlash > 0;

  if (sheet.image && (showStartupBarrier || showHitBarrier)) {
    const scale = showHitBarrier ? GUARD_COUNTER_EFFECT_CONFIG.barrierDrawScale : GUARD_COUNTER_EFFECT_CONFIG.drawScale;
    const centerYOffset = showHitBarrier ? GUARD_COUNTER_EFFECT_CONFIG.barrierCenterYOffset : GUARD_COUNTER_EFFECT_CONFIG.centerYOffset;
    const drawW = sheet.frameW * scale;
    const drawH = sheet.frameH * scale;
    const cy = feetY - centerYOffset;
    const sx = eff.frame * sheet.frameW;
    const barrierRatio = showHitBarrier
      ? eff.barrierFlash / GUARD_COUNTER_EFFECT_CONFIG.barrierFlashFrames
      : 1 - eff.elapsed / GUARD_COUNTER_EFFECT_CONFIG.startupFrames;
    ctx.save();
    ctx.globalAlpha = Math.min(
      GUARD_COUNTER_EFFECT_CONFIG.barrierAlphaMax,
      GUARD_COUNTER_EFFECT_CONFIG.barrierAlphaMin
        + barrierRatio * (GUARD_COUNTER_EFFECT_CONFIG.barrierAlphaMax - GUARD_COUNTER_EFFECT_CONFIG.barrierAlphaMin),
    );
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(sheet.image, sx, 0, sheet.frameW, sheet.frameH, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
    ctx.restore();
  }

  const pulse = (Math.sin(eff.elapsed * GUARD_COUNTER_EFFECT_CONFIG.ripplePulseSpeed) + 1) / 2;
  const rippleAlpha = GUARD_COUNTER_EFFECT_CONFIG.rippleAlphaMin + remainingRatio * GUARD_COUNTER_EFFECT_CONFIG.rippleAlphaRange;
  const rippleW = GUARD_COUNTER_EFFECT_CONFIG.rippleWidth + pulse * GUARD_COUNTER_EFFECT_CONFIG.ripplePulseWidth;
  const rippleH = GUARD_COUNTER_EFFECT_CONFIG.rippleHeight + pulse * GUARD_COUNTER_EFFECT_CONFIG.ripplePulseHeight;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(155,230,255,${rippleAlpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, feetY - GUARD_COUNTER_EFFECT_CONFIG.rippleYOffset, rippleW / 2, rippleH / 2, 0, 0, FULL_CIRCLE_RADIANS);
  ctx.stroke();
  ctx.strokeStyle = `rgba(210,248,255,${rippleAlpha * GUARD_COUNTER_EFFECT_CONFIG.rippleInnerAlphaScale})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(
    cx,
    feetY - GUARD_COUNTER_EFFECT_CONFIG.rippleYOffset,
    rippleW * GUARD_COUNTER_EFFECT_CONFIG.rippleInnerWidthScale,
    rippleH * GUARD_COUNTER_EFFECT_CONFIG.rippleInnerHeightScale,
    0,
    0,
    FULL_CIRCLE_RADIANS,
  );
  ctx.stroke();
  ctx.restore();
}
