import { state } from "../../game/state";
import { ctx } from "../../rendering/context";
import { PLAYER_COMBAT } from "../../constants";
import type { UltimateAfterimageSlashState, UltimateTrailState } from "../../types/game-state";
import { ULTIMATE_SKILL_ASSETS } from "../../systems/skillCatalog";

const FULL_CIRCLE_RADIANS = Math.PI * 2;
const ULTIMATE_SKILL_EFFECT_SHEET = ULTIMATE_SKILL_ASSETS.effect;

export function updateUltimateTrails() {
  for (let i = state.ultimateTrails.length - 1; i >= 0; i -= 1) {
    const trail = state.ultimateTrails[i] as UltimateTrailState;
    trail.life -= 1;
    if (trail.life <= 0) state.ultimateTrails.splice(i, 1);
  }
}

export function updateUltimateAfterimageSlashes() {
  for (let i = state.ultimateAfterimageSlashes.length - 1; i >= 0; i -= 1) {
    const slash = state.ultimateAfterimageSlashes[i] as UltimateAfterimageSlashState;
    slash.life -= 1;
    if (slash.life <= 0) state.ultimateAfterimageSlashes.splice(i, 1);
  }
}

export function updateUltimateEffects() {
  const sheet = ULTIMATE_SKILL_EFFECT_SHEET;
  for (let i = state.ultimateEffects.length - 1; i >= 0; i -= 1) {
    const eff = state.ultimateEffects[i];
    eff.elapsed += 1;
    eff.life -= 1;
    eff.frame = Math.floor(eff.elapsed / PLAYER_COMBAT.ultimateEffectFrameDuration) % sheet.count;
    if (eff.life <= 0) state.ultimateEffects.splice(i, 1);
  }
}

export function drawUltimateTrails() {
  if (!ctx) return;
  for (const trail of state.ultimateTrails) {
    const t = trail.life / trail.maxLife;
    const ripple = Math.sin(trail.phase + trail.life * 0.5) * 2;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.08 + t * 0.2;
    ctx.strokeStyle = "rgba(126, 226, 255, 0.72)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(
      trail.x,
      trail.y + ripple,
      trail.width * (0.65 + (1 - t) * 0.35),
      trail.height * (0.8 + (1 - t) * 0.5),
      0,
      0,
      FULL_CIRCLE_RADIANS,
    );
    ctx.stroke();
    ctx.globalAlpha = 0.06 + t * 0.12;
    ctx.fillStyle = "rgba(156, 242, 255, 0.5)";
    ctx.translate(trail.x, trail.y);
    ctx.scale(trail.facing, 1);
    ctx.fillRect(-trail.width * 0.45, -1, trail.width * 0.5, 2);
    ctx.restore();
  }
}

export function drawUltimateEffects() {
  if (!ctx) return;
  const sheet = ULTIMATE_SKILL_EFFECT_SHEET;
  if (!sheet.image) return;
  const drawW = sheet.frameW * PLAYER_COMBAT.ultimateEffectDrawScale;
  const drawH = sheet.frameH * PLAYER_COMBAT.ultimateEffectDrawScale;
  const p = state.player;
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h - PLAYER_COMBAT.ultimateEffectYOffset;
  for (const eff of state.ultimateEffects) {
    const sx = eff.frame * sheet.frameW;
    const openingFrames = sheet.count * PLAYER_COMBAT.ultimateEffectFrameDuration;
    const lifeRatio = eff.life / eff.maxLife;
    const alpha = eff.elapsed <= openingFrames
      ? 0.42
      : Math.max(0.12, Math.min(0.28, lifeRatio * 0.32));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(cx, cy);
    ctx.scale(eff.facing, 1);
    ctx.drawImage(sheet.image, sx, 0, sheet.frameW, sheet.frameH, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }
}

export function drawUltimateAfterimageSlashes() {
  if (!ctx) return;
  for (const slash of state.ultimateAfterimageSlashes) {
    const t = slash.life / slash.maxLife;
    const alpha = Math.min(0.52, (0.16 + t * 0.42) * slash.power);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha;
    ctx.translate(slash.x, slash.y);
    ctx.scale(slash.facing, 1);
    ctx.strokeStyle = "rgba(186, 246, 255, 0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-slash.w / 2, slash.h * 0.25);
    ctx.quadraticCurveTo(-slash.w * 0.08, -slash.h * 0.68, slash.w / 2, -slash.h * 0.2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(93, 196, 255, 0.62)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-slash.w * 0.36, slash.h * 0.46);
    ctx.quadraticCurveTo(0, -slash.h * 0.08, slash.w * 0.42, slash.h * 0.1);
    ctx.stroke();
    ctx.restore();
  }
}
