import { MOON_TIDE_AURA, MOON_TIDE_FRAME_EFFECTS } from "../../constants/moonTideVisual";
import { state } from "../../game/state";
import { ctx } from "../../rendering/context";
import { MOON_TIDE_PLAYER_SHEETS, PLAYER_COMBAT } from "../../constants";
import { drawSheetFrame, drawSkillFrame, type SpriteFrameEffect } from "../../rendering/graphics";
import type {
  UltimateAfterimageSlashState,
  UltimatePlayerGhostState,
  UltimateTrailState,
} from "../../types/game-state";
import { playerSkillById, ultimateAfterimageSheetForLevel, ultimateEffectSheetForLevel } from "../../systems/skillCatalog";

const FULL_CIRCLE_RADIANS = Math.PI * 2;

const PLAYER_GHOST_ALPHA_BASE = 0.1;
const PLAYER_GHOST_ALPHA_SCALE = 0.34;
const PLAYER_GHOST_ALPHA_MAX = 0.44;
const PLAYER_GHOST_OFFSET_X: Record<UltimatePlayerGhostState["action"], number> = {
  idle: 16,
  move: 18,
  attack: 22,
  skill: 18,
  fallAttack: 22,
};
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
const AFTERIMAGE_DRAW_WIDTH_SCALE = 1.2;
const AFTERIMAGE_ALPHA_MAX = 0.66;

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
  for (let i = state.ultimateEffects.length - 1; i >= 0; i -= 1) {
    const eff = state.ultimateEffects[i];
    const sheet = ultimateEffectSheetForLevel(eff.effectLevel);
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
  ctx.globalCompositeOperation = "source-over";
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
  if (!ctx || state.gameOver || state.player.hp <= 0) return;
  const p = state.player;
  if (p.ultimateCastTimer <= 0 && p.ultimateTimer <= 0) return;
  const cx = p.x + p.w / 2;
  const footY = p.y + p.h + MOON_TIDE_AURA.footYOffset;
  for (const eff of state.ultimateEffects) {
    const sheet = ultimateEffectSheetForLevel(eff.effectLevel);
    const opening = ultimateEffectSheetForLevel(eff.effectLevel, true);
    const openingFrame = Math.floor(eff.elapsed / MOON_TIDE_AURA.openingFrameDuration);
    const fade = Math.min(1, eff.life / MOON_TIDE_AURA.fadeOutFrames);
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.translate(cx, footY);
    // Floor perspective remains fixed when the character turns.
    if (sheet.image) {
      const w = sheet.frameW * MOON_TIDE_AURA.drawScale;
      const h = sheet.frameH * MOON_TIDE_AURA.drawScale;
      ctx.globalAlpha = MOON_TIDE_AURA.alpha * fade;
      ctx.drawImage(sheet.image, eff.frame * sheet.frameW, 0, sheet.frameW, sheet.frameH, -w / 2, -h / 2, w, h);
    }
    // The opening is a one-shot, independent of the sustained water loop.
    if (opening.image && openingFrame < opening.count) {
      const w = opening.frameW * MOON_TIDE_AURA.openingDrawScale;
      const h = opening.frameH * MOON_TIDE_AURA.openingDrawScale;
      ctx.globalAlpha = MOON_TIDE_AURA.openingAlpha * (1 - openingFrame / opening.count);
      ctx.drawImage(opening.image, openingFrame * opening.frameW, 0, opening.frameW, opening.frameH,
        -w / 2, -MOON_TIDE_AURA.openingAnchorY * MOON_TIDE_AURA.openingDrawScale, w, h);
    }
    ctx.restore();
  }
}

export function drawUltimateAfterimageSlashes() {
  if (!ctx || state.gameOver || state.player.hp <= 0) return;
  for (const slash of state.ultimateAfterimageSlashes) {
    const sheet = ultimateAfterimageSheetForLevel(slash.effectLevel);
    if (!sheet.image) continue;
    const progress = 1 - slash.life / slash.maxLife;
    const frame = Math.min(sheet.count - 1, Math.floor(progress * sheet.count));
    const w = slash.w * AFTERIMAGE_DRAW_WIDTH_SCALE;
    const h = w * sheet.frameH / sheet.frameW;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = AFTERIMAGE_ALPHA_MAX * (1 - progress);
    ctx.translate(slash.x, slash.y);
    ctx.scale(slash.facing, 1);
    ctx.drawImage(sheet.image, frame * sheet.frameW, 0, sheet.frameW, sheet.frameH, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

export function drawUltimatePlayerGhosts() {
  if (!ctx) return;
  if (state.ultimatePlayerGhosts.length === 0) return;

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  const canCacheGhostFrames = typeof document !== "undefined";
  if (!canCacheGhostFrames) ctx.filter = MOON_TIDE_FRAME_EFFECTS.ghost.filter ?? "none";
  for (const ghost of state.ultimatePlayerGhosts) {
    const lifeRatio = ghost.life / ghost.maxLife;
    const alpha = Math.min(
      PLAYER_GHOST_ALPHA_MAX,
      (PLAYER_GHOST_ALPHA_BASE + lifeRatio * PLAYER_GHOST_ALPHA_SCALE) * ghost.strength,
    );

    ctx.globalAlpha = alpha;
    drawUltimatePlayerGhost(ghost, canCacheGhostFrames ? MOON_TIDE_FRAME_EFFECTS.ghost : undefined);
  }
  ctx.restore();
}

function drawUltimatePlayerGhost(ghost: UltimatePlayerGhostState, effect?: SpriteFrameEffect) {
  const drawX = ghost.x - ghost.facing * PLAYER_GHOST_OFFSET_X[ghost.action];
  if (ghost.source === "player" && ghost.animationState) {
    drawSheetFrame(
      MOON_TIDE_PLAYER_SHEETS[ghost.animationState],
      ghost.frame,
      drawX,
      ghost.y,
      ghost.w,
      ghost.h,
      ghost.facing,
      effect,
    );
    return;
  }

  if (ghost.source !== "skill" || !ghost.skillId) return;
  const skill = playerSkillById(ghost.skillId);
  if (!skill) return;
  drawSkillFrame(skill, ghost.frame, drawX, ghost.y, ghost.w, ghost.h, ghost.facing, effect);
}
