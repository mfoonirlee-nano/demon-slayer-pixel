import { TIDE_WEAVE_SURGE_SHEET, TIDE_WEAVE_SWEEP_SHEET, TIDE_WEAVE_VISUAL } from "../../constants";
import { EQUIPMENT_REACTIONS } from "../../constants/equipmentReactions";
import { state } from "../../game/state";
import { ctx } from "../../rendering/context";
import type { EquipmentReactionEffect } from "../../types/game/equipmentReactions";

const VISUAL = {
  cyan: "#8aefff",
  cyanDark: "#3e92bb",
  amber: "#ffcf79",
  violet: "#bca0ef",
  lineWidth: 1.5,
  telegraphAlpha: 0.65,
  innerScale: 0.55,
  ringCycleFrames: 24,
  chargeCorner: 6,
  peakFrame: 2,
  peakBounds: {
    sweep: { centerX: 128, bottom: 227, w: 174, h: 158 },
    surge: { centerX: 126, bottom: 227, w: 204, h: 121 },
  },
  mark: { frame: 2, source: { x: 41, y: 69, w: 174, h: 158 }, width: 16, yOffset: 8 },
  control: { width: 12, yOffset: 4, rise: 3 },
  ready: { width: 10, rise: 5, xOffset: 13, yOffset: 3 },
} as const;

function drawRing(x: number, y: number, width: number, height: number): void {
  if (!ctx) return;
  ctx.beginPath();
  ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawArea(effect: EquipmentReactionEffect): void {
  if (!ctx || effect.kind === "sweep") return;
  const config = EQUIPMENT_REACTIONS[effect.kind];
  const isRupture = effect.kind === "rupture";
  const isCharging = effect.elapsed < config.impactFrame;
  if (effect.kind !== "eye" && !isCharging) return;
  ctx.save();
  ctx.globalAlpha = VISUAL.telegraphAlpha;
  ctx.lineWidth = VISUAL.lineWidth;
  ctx.strokeStyle = isRupture ? VISUAL.amber : VISUAL.cyanDark;
  drawRing(effect.x, effect.y, effect.w, effect.h);
  ctx.strokeStyle = isRupture ? VISUAL.violet : VISUAL.cyan;
  if (isRupture) {
    // A fixed charge diamond describes a delayed blast, without implying inward pull.
    const radius = VISUAL.chargeCorner * (1 + effect.elapsed / config.impactFrame);
    ctx.beginPath();
    ctx.moveTo(effect.x, effect.y - radius);
    ctx.lineTo(effect.x + radius, effect.y);
    ctx.lineTo(effect.x, effect.y + radius);
    ctx.lineTo(effect.x - radius, effect.y);
    ctx.closePath();
    ctx.stroke();
  } else {
    const phase = effect.elapsed % VISUAL.ringCycleFrames / VISUAL.ringCycleFrames;
    const scale = 1 - phase * (1 - VISUAL.innerScale);
    drawRing(effect.x, effect.y, effect.w * scale, effect.h * scale);
  }
  ctx.restore();
}

function drawEffectSprite(effect: EquipmentReactionEffect): void {
  if (!ctx || effect.kind === "eye") return;
  const config = EQUIPMENT_REACTIONS[effect.kind];
  if (effect.kind === "rupture" && effect.elapsed < config.impactFrame) return;
  const isSweep = effect.kind === "sweep";
  const sheet = isSweep ? TIDE_WEAVE_SWEEP_SHEET : TIDE_WEAVE_SURGE_SHEET;
  if (!sheet.image) return;
  const progress = Math.min(1, effect.elapsed / effect.maxLife);
  // The shared wave's peak always coincides with impact, including longer delayed ruptures.
  const spriteProgress = isSweep ? progress * sheet.count
    : effect.elapsed < config.impactFrame
      ? effect.elapsed / config.impactFrame * VISUAL.peakFrame
      : VISUAL.peakFrame + (effect.elapsed - config.impactFrame)
        / (effect.maxLife - config.impactFrame) * (sheet.count - VISUAL.peakFrame);
  const frame = Math.min(sheet.count - 1, Math.floor(spriteProgress));
  const bounds = isSweep ? VISUAL.peakBounds.sweep : VISUAL.peakBounds.surge;
  const drawW = effect.w * sheet.frameW / bounds.w;
  const drawH = effect.h * sheet.frameH / bounds.h;
  ctx.save();
  ctx.translate(effect.x, effect.y + effect.h / 2);
  ctx.scale(isSweep ? effect.facing : 1, 1);
  ctx.globalAlpha = progress <= TIDE_WEAVE_VISUAL.fadeStart
    ? 1 : (1 - progress) / (1 - TIDE_WEAVE_VISUAL.fadeStart);
  if (effect.kind === "rupture") ctx.filter = "hue-rotate(145deg)";
  ctx.drawImage(sheet.image, frame * sheet.frameW, 0, sheet.frameW, sheet.frameH,
    -drawW * bounds.centerX / sheet.frameW, -drawH * bounds.bottom / sheet.frameH, drawW, drawH);
  ctx.restore();
}

function drawTargetCues(): void {
  if (!ctx) return;
  const sheet = TIDE_WEAVE_SWEEP_SHEET;
  const { mark, control } = VISUAL;
  ctx.save();
  for (const entry of state.equipmentReactions.marks) {
    const { target } = entry;
    if (!sheet.image || entry.remaining <= 0 || target.hp <= 0) continue;
    const height = mark.width * mark.source.h / mark.source.w;
    ctx.drawImage(sheet.image, mark.frame * sheet.frameW + mark.source.x,
      mark.source.y, mark.source.w, mark.source.h,
      target.x + (target.w - mark.width) / 2, target.y - height - mark.yOffset, mark.width, height);
  }
  ctx.strokeStyle = VISUAL.violet;
  ctx.lineWidth = VISUAL.lineWidth;
  for (const entry of state.equipmentReactions.controls) {
    const { target } = entry;
    if (entry.remaining <= 0 || target.hp <= 0) continue;
    const x = target.x + target.w / 2;
    const y = target.y + target.h + control.yOffset;
    ctx.beginPath();
    ctx.moveTo(x - control.width, y - control.rise);
    ctx.lineTo(x, y);
    ctx.lineTo(x + control.width, y - control.rise);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMovementReady(): void {
  if (!ctx || state.equippedEquipment.garb !== "shadowstep_garb"
    || state.equipmentReactions.movementDistance < EQUIPMENT_REACTIONS.movementDistance) return;
  const { ready } = VISUAL;
  const player = state.player;
  const x = player.x + player.w / 2;
  const y = player.y + player.h + ready.yOffset;
  ctx.save();
  ctx.strokeStyle = VISUAL.cyan;
  ctx.lineWidth = VISUAL.lineWidth;
  for (const direction of [-1, 1]) {
    const sideX = x + direction * ready.xOffset;
    ctx.beginPath();
    ctx.moveTo(sideX + direction * ready.width, y - ready.rise);
    ctx.lineTo(sideX, y);
    ctx.lineTo(sideX + direction * ready.width, y + ready.rise);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawEquipmentReactionEffects(): void {
  if (!ctx || state.gameOver || state.player.hp <= 0) return;
  for (const effect of state.equipmentReactions.effects) {
    if (effect.life <= 0) continue;
    drawArea(effect);
    drawEffectSprite(effect);
  }
}

// Status cues sit above actors and ground occlusion so they remain readable at the feet.
export function drawEquipmentReactionCues(): void {
  if (!ctx || state.gameOver || state.player.hp <= 0) return;
  drawTargetCues();
  drawMovementReady();
}
