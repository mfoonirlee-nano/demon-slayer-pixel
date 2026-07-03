import { state } from "../../game/state";
import { ctx } from "../../rendering/context";
import { PLAYER_COMBAT, PLAYER_SHEETS } from "../../constants";
import { drawSheetFrame, drawSkillFrame } from "../../rendering/graphics";
import type {
  UltimateAfterimageSlashState,
  UltimatePlayerGhostState,
  UltimateTrailState,
} from "../../types/game-state";
import { playerSkillById, ULTIMATE_SKILL_ASSETS } from "../../systems/skillCatalog";

const FULL_CIRCLE_RADIANS = Math.PI * 2;
const ULTIMATE_SKILL_EFFECT_SHEET = ULTIMATE_SKILL_ASSETS.effect;

const PLAYER_GHOST_FILTER = "brightness(0) saturate(100%) invert(60%) sepia(92%) saturate(1600%) hue-rotate(172deg) brightness(103%) contrast(102%) drop-shadow(0 0 3px rgba(42, 178, 255, 0.72))";
const PLAYER_GHOST_ALPHA_BASE = 0.18;
const PLAYER_GHOST_ALPHA_SCALE = 0.44;
const PLAYER_GHOST_ALPHA_MAX = 0.6;
const PLAYER_GHOST_OFFSET_X: Record<UltimatePlayerGhostState["action"], number> = {
  idle: 16,
  move: 18,
  attack: 22,
  skill: 18,
  fallAttack: 22,
};
const ULTIMATE_FOOT_EFFECT = {
  drawScale: 0.38,
  footYOffset: 6,
  anchorY: 0.94,
} as const;
const TRAIL_RIPPLE_PHASE_SCALE = 0.5;
const TRAIL_RIPPLE_AMPLITUDE = 2;
const TRAIL_STROKE_ALPHA_BASE = 0.08;
const TRAIL_STROKE_ALPHA_SCALE = 0.2;
const TRAIL_WIDTH_BASE = 0.65;
const TRAIL_WIDTH_FADE_SCALE = 0.35;
const TRAIL_HEIGHT_BASE = 0.8;
const TRAIL_HEIGHT_FADE_SCALE = 0.5;
const TRAIL_FILL_ALPHA_BASE = 0.06;
const TRAIL_FILL_ALPHA_SCALE = 0.12;
const TRAIL_FILL_X_OFFSET_SCALE = 0.45;
const FOOT_EFFECT_OPENING_ALPHA = 0.42;
const FOOT_EFFECT_MIN_ALPHA = 0.12;
const FOOT_EFFECT_MAX_ALPHA = 0.28;
const FOOT_EFFECT_LIFE_ALPHA_SCALE = 0.32;
const SLASH_ALPHA_MAX = 0.52;
const SLASH_ALPHA_BASE = 0.16;
const SLASH_ALPHA_SCALE = 0.42;
const OUTER_SLASH_LINE_WIDTH = 3;
const OUTER_SLASH_START_Y_SCALE = 0.25;
const OUTER_SLASH_CONTROL_X_SCALE = 0.08;
const OUTER_SLASH_CONTROL_Y_SCALE = 0.68;
const OUTER_SLASH_END_Y_SCALE = 0.2;
const INNER_SLASH_LINE_WIDTH = 1.5;
const INNER_SLASH_START_X_SCALE = 0.36;
const INNER_SLASH_START_Y_SCALE = 0.46;
const INNER_SLASH_CONTROL_Y_SCALE = 0.08;
const INNER_SLASH_END_X_SCALE = 0.42;
const INNER_SLASH_END_Y_SCALE = 0.1;

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

export function updateUltimatePlayerGhosts() {
  for (let i = state.ultimatePlayerGhosts.length - 1; i >= 0; i -= 1) {
    const ghost = state.ultimatePlayerGhosts[i] as UltimatePlayerGhostState;
    ghost.life -= 1;
    if (ghost.life <= 0) state.ultimatePlayerGhosts.splice(i, 1);
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
  if (state.ultimateTrails.length === 0) return;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = "rgba(126, 226, 255, 0.72)";
  ctx.lineWidth = 2;
  ctx.fillStyle = "rgba(156, 242, 255, 0.5)";

  for (const trail of state.ultimateTrails) {
    const t = trail.life / trail.maxLife;
    const ripple = Math.sin(trail.phase + trail.life * TRAIL_RIPPLE_PHASE_SCALE) * TRAIL_RIPPLE_AMPLITUDE;
    ctx.globalAlpha = TRAIL_STROKE_ALPHA_BASE + t * TRAIL_STROKE_ALPHA_SCALE;
    ctx.beginPath();
    ctx.ellipse(
      trail.x,
      trail.y + ripple,
      trail.width * (TRAIL_WIDTH_BASE + (1 - t) * TRAIL_WIDTH_FADE_SCALE),
      trail.height * (TRAIL_HEIGHT_BASE + (1 - t) * TRAIL_HEIGHT_FADE_SCALE),
      0,
      0,
      FULL_CIRCLE_RADIANS,
    );
    ctx.stroke();
    ctx.globalAlpha = TRAIL_FILL_ALPHA_BASE + t * TRAIL_FILL_ALPHA_SCALE;
    const fillW = trail.width * 0.5;
    const fillOffset = trail.width * TRAIL_FILL_X_OFFSET_SCALE;
    const fillX = trail.facing === 1
      ? trail.x - fillOffset
      : trail.x + fillOffset - fillW;
    ctx.fillRect(fillX, trail.y - 1, fillW, 2);
  }

  ctx.restore();
}

export function drawUltimateEffects() {
  if (!ctx) return;
  const sheet = ULTIMATE_SKILL_EFFECT_SHEET;
  if (!sheet.image) return;
  if (state.ultimateEffects.length === 0) return;
  const drawW = sheet.frameW * ULTIMATE_FOOT_EFFECT.drawScale;
  const drawH = sheet.frameH * ULTIMATE_FOOT_EFFECT.drawScale;
  const openingFrames = sheet.count * PLAYER_COMBAT.ultimateEffectFrameDuration;
  const p = state.player;
  const cx = p.x + p.w / 2;
  const footY = p.y + p.h + ULTIMATE_FOOT_EFFECT.footYOffset;
  for (const eff of state.ultimateEffects) {
    const sx = eff.frame * sheet.frameW;
    const lifeRatio = eff.life / eff.maxLife;
    const alpha = eff.elapsed <= openingFrames
      ? FOOT_EFFECT_OPENING_ALPHA
      : Math.max(FOOT_EFFECT_MIN_ALPHA, Math.min(FOOT_EFFECT_MAX_ALPHA, lifeRatio * FOOT_EFFECT_LIFE_ALPHA_SCALE));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(cx, footY);
    ctx.scale(eff.facing, 1);
    ctx.drawImage(sheet.image, sx, 0, sheet.frameW, sheet.frameH, -drawW / 2, -drawH * ULTIMATE_FOOT_EFFECT.anchorY, drawW, drawH);
    ctx.restore();
  }
}

export function drawUltimateAfterimageSlashes() {
  if (!ctx) return;
  if (state.ultimateAfterimageSlashes.length === 0) return;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (const slash of state.ultimateAfterimageSlashes) {
    const t = slash.life / slash.maxLife;
    const alpha = Math.min(SLASH_ALPHA_MAX, (SLASH_ALPHA_BASE + t * SLASH_ALPHA_SCALE) * slash.power);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "rgba(78, 210, 255, 0.9)";
    ctx.lineWidth = OUTER_SLASH_LINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(slash.x - slash.facing * slash.w / 2, slash.y + slash.h * OUTER_SLASH_START_Y_SCALE);
    ctx.quadraticCurveTo(
      slash.x - slash.facing * slash.w * OUTER_SLASH_CONTROL_X_SCALE,
      slash.y - slash.h * OUTER_SLASH_CONTROL_Y_SCALE,
      slash.x + slash.facing * slash.w / 2,
      slash.y - slash.h * OUTER_SLASH_END_Y_SCALE,
    );
    ctx.stroke();
    ctx.strokeStyle = "rgba(34, 142, 255, 0.64)";
    ctx.lineWidth = INNER_SLASH_LINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(
      slash.x - slash.facing * slash.w * INNER_SLASH_START_X_SCALE,
      slash.y + slash.h * INNER_SLASH_START_Y_SCALE,
    );
    ctx.quadraticCurveTo(
      slash.x,
      slash.y - slash.h * INNER_SLASH_CONTROL_Y_SCALE,
      slash.x + slash.facing * slash.w * INNER_SLASH_END_X_SCALE,
      slash.y + slash.h * INNER_SLASH_END_Y_SCALE,
    );
    ctx.stroke();
  }

  ctx.restore();
}

export function drawUltimatePlayerGhosts() {
  if (!ctx) return;
  if (state.ultimatePlayerGhosts.length === 0) return;

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.filter = PLAYER_GHOST_FILTER;
  for (const ghost of state.ultimatePlayerGhosts) {
    const lifeRatio = ghost.life / ghost.maxLife;
    const alpha = Math.min(
      PLAYER_GHOST_ALPHA_MAX,
      (PLAYER_GHOST_ALPHA_BASE + lifeRatio * PLAYER_GHOST_ALPHA_SCALE) * ghost.strength,
    );

    ctx.globalAlpha = alpha;
    drawUltimatePlayerGhost(ghost);
  }
  ctx.restore();
}

function drawUltimatePlayerGhost(ghost: UltimatePlayerGhostState) {
  const drawX = ghost.x - ghost.facing * PLAYER_GHOST_OFFSET_X[ghost.action];
  if (ghost.source === "player" && ghost.animationState) {
    drawSheetFrame(
      PLAYER_SHEETS[ghost.animationState],
      ghost.frame,
      drawX,
      ghost.y,
      ghost.w,
      ghost.h,
      ghost.facing,
    );
    return;
  }

  if (ghost.source !== "skill" || !ghost.skillId) return;
  const skill = playerSkillById(ghost.skillId);
  if (!skill) return;
  drawSkillFrame(skill, ghost.frame, drawX, ghost.y, ghost.w, ghost.h, ghost.facing);
}
