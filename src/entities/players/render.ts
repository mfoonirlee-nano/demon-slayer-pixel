import { state } from "../../game/state";
import { ctx } from "../../rendering/context";
import {
  FALL_ATTACK,
  PLAYER_ANIMATION_STATES,
  PLAYER_COMBAT,
  PLAYER_DRAW,
  PLAYER_SHEETS,
  SKILL_IDS,
} from "../../constants";
import { frameIndex, onGround } from "../../game/utils";
import { drawSheetFrame, drawSkillFrame } from "../../rendering/graphics";
import { selectedSkill } from "../../systems/loadout";
import { ULTIMATE_SKILL_ASSETS } from "../../systems/skillCatalog";
import { bindingZonePlayerMoveScale } from "../enemies/binder";
import { lanternAshZonePlayerMoveScale } from "./movementModifiers";
import { playerSkillCastFrame } from "./skillCasting";

const HALF_RATIO = 0.5;
const FULL_CIRCLE = Math.PI * 2;
const ULTIMATE_SKILL_SHEET = ULTIMATE_SKILL_ASSETS.skill;

const PLAYER_BINDING_SLOW_EFFECT = {
  filter: "sepia(0.38) saturate(1.55) hue-rotate(282deg) brightness(0.86)",
  pulseSpeed: 12,
  pulseBaseAlpha: 0.28,
  pulseAlphaScale: 0.18,
  ringColor: "#9b214f",
  strandColor: "#b8325a",
  accentColor: "#d7a857",
  ringYOffset: 10,
  ringWidthScale: 0.92,
  ringHeight: 7,
  strandTopRatio: 0.42,
  strandMidRatio: 0.64,
  strandBottomRatio: 0.82,
  strandInset: 5,
  strandSag: 8,
  controlLeadRatio: 0.24,
  controlTrailRatio: 0.76,
  lineWidth: 2,
  accentLineWidth: 1,
} as const;

function drawWithBindingSlowFilter(isSlowed: boolean, draw: () => void) {
  if (!isSlowed || !ctx) {
    draw();
    return;
  }

  ctx.save();
  ctx.filter = PLAYER_BINDING_SLOW_EFFECT.filter;
  draw();
  ctx.restore();
}

function drawBindingSlowEffect() {
  if (!ctx) return;

  const p = state.player;
  const pulseWave = Math.sin(state.elapsed * PLAYER_BINDING_SLOW_EFFECT.pulseSpeed) * HALF_RATIO + HALF_RATIO;
  const alpha = PLAYER_BINDING_SLOW_EFFECT.pulseBaseAlpha
    + pulseWave * PLAYER_BINDING_SLOW_EFFECT.pulseAlphaScale;
  const centerX = p.x + p.w * HALF_RATIO;
  const footY = p.y + p.h - PLAYER_BINDING_SLOW_EFFECT.ringYOffset;
  const leftX = p.x + PLAYER_BINDING_SLOW_EFFECT.strandInset;
  const rightX = p.x + p.w - PLAYER_BINDING_SLOW_EFFECT.strandInset;
  const leadX = p.x + p.w * PLAYER_BINDING_SLOW_EFFECT.controlLeadRatio;
  const trailX = p.x + p.w * PLAYER_BINDING_SLOW_EFFECT.controlTrailRatio;
  const topY = p.y + p.h * PLAYER_BINDING_SLOW_EFFECT.strandTopRatio;
  const midY = p.y + p.h * PLAYER_BINDING_SLOW_EFFECT.strandMidRatio;
  const bottomY = p.y + p.h * PLAYER_BINDING_SLOW_EFFECT.strandBottomRatio;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = PLAYER_BINDING_SLOW_EFFECT.ringColor;
  ctx.lineWidth = PLAYER_BINDING_SLOW_EFFECT.lineWidth;
  ctx.beginPath();
  ctx.ellipse(
    centerX,
    footY,
    p.w * PLAYER_BINDING_SLOW_EFFECT.ringWidthScale,
    PLAYER_BINDING_SLOW_EFFECT.ringHeight,
    0,
    0,
    FULL_CIRCLE,
  );
  ctx.stroke();

  ctx.strokeStyle = PLAYER_BINDING_SLOW_EFFECT.strandColor;
  ctx.beginPath();
  ctx.moveTo(leftX, topY);
  ctx.bezierCurveTo(
    leadX,
    topY + PLAYER_BINDING_SLOW_EFFECT.strandSag,
    trailX,
    midY - PLAYER_BINDING_SLOW_EFFECT.strandSag,
    rightX,
    midY,
  );
  ctx.moveTo(rightX, midY);
  ctx.bezierCurveTo(
    trailX,
    midY + PLAYER_BINDING_SLOW_EFFECT.strandSag,
    leadX,
    bottomY - PLAYER_BINDING_SLOW_EFFECT.strandSag,
    leftX,
    bottomY,
  );
  ctx.stroke();

  ctx.globalAlpha = alpha * PLAYER_BINDING_SLOW_EFFECT.pulseAlphaScale;
  ctx.strokeStyle = PLAYER_BINDING_SLOW_EFFECT.accentColor;
  ctx.lineWidth = PLAYER_BINDING_SLOW_EFFECT.accentLineWidth;
  ctx.beginPath();
  ctx.moveTo(centerX, topY);
  ctx.lineTo(centerX, bottomY);
  ctx.stroke();
  ctx.restore();
}

export function drawPlayer() {
  const p = state.player;
  const isDashRepositionSkillAnimation = p.skillTimer > 0 && selectedSkill(state)?.id === SKILL_IDS.dashReposition;
  if (
    p.invincible > 0
    && !isDashRepositionSkillAnimation
    && Math.floor(p.invincible / PLAYER_COMBAT.blinkInterval) % 2 === 0
  ) return;
  const isBindingSlowed = Math.min(bindingZonePlayerMoveScale(), lanternAshZonePlayerMoveScale()) < 1;

  // Unified reference point: player center X, feet Y minus global sprite padding.
  // All draw positions: drawX = refX - drawW * anchorX, drawY = refY - drawH * anchorY
  const refX = p.x + p.w / 2;
  const refY = p.y + p.h - PLAYER_DRAW.yOffset;

  if (p.ultimateCastTimer > 0 && ULTIMATE_SKILL_SHEET.image) {
    const total = PLAYER_COMBAT.ultimateCastFrames;
    const elapsedGameFrames = total - p.ultimateCastTimer;
    const frame = Math.min(
      ULTIMATE_SKILL_SHEET.count - 1,
      Math.floor(elapsedGameFrames / PLAYER_COMBAT.ultimateCastFrameDuration),
    );
    const drawH = ULTIMATE_SKILL_SHEET.frameH * PLAYER_COMBAT.ultimateDrawScale;
    const drawW = ULTIMATE_SKILL_SHEET.frameW * PLAYER_COMBAT.ultimateDrawScale;
    drawWithBindingSlowFilter(isBindingSlowed, () => {
      drawSheetFrame(
        ULTIMATE_SKILL_SHEET,
        frame,
        refX - drawW / 2,
        refY - drawH * 0.83,
        drawW,
        drawH,
        p.facing,
      );
    });
    if (isBindingSlowed) drawBindingSlowEffect();
    return;
  }

  if (p.skillTimer > 0) {
    const skill = selectedSkill(state);
    if (!skill) return;
    if (skill.image) {
      const frame = playerSkillCastFrame(skill, p.skillTimer);

      const srcH = skill.frameH || skill.image.height;
      const drawH = skill.drawScale ? srcH * skill.drawScale : PLAYER_DRAW.fallbackSkillDrawH;
      const drawW = drawH * (skill.frameW / srcH);

      const anchorX = skill.anchorX ?? 0.5;
      const anchorY = skill.anchorY ?? 1;
      // When facing left, the sprite is mirrored, so the horizontal anchor mirrors too.
      const effectiveAnchorX = p.facing === 1 ? anchorX : (1 - anchorX);
      drawWithBindingSlowFilter(isBindingSlowed, () => {
        drawSkillFrame(skill, frame, refX - drawW * effectiveAnchorX, refY - drawH * anchorY, drawW, drawH, p.facing);
      });
      if (isBindingSlowed) drawBindingSlowEffect();
      return;
    }
  }

  const isLanded = onGround(p, p.onPlatform);
  const stateName = p.fallAttackTimer > 0 || p.fallAttackRecoveryTimer > 0
    ? PLAYER_ANIMATION_STATES.fallAttack
    : p.skillTimer > 0 || p.attackTimer > 0
    ? PLAYER_ANIMATION_STATES.attack
    : !isLanded
      ? PLAYER_ANIMATION_STATES.jump
      : Math.abs(p.vx) > PLAYER_COMBAT.movementIdleThreshold
        ? PLAYER_ANIMATION_STATES.run
        : PLAYER_ANIMATION_STATES.idle;

  const sheet = PLAYER_SHEETS[stateName];
  const { drawW, drawH, animSpeed, anchorX = 0.5, anchorY = 1, flipX } = sheet;
  let frame = frameIndex(sheet.count, animSpeed, state.elapsed);
  if (stateName === PLAYER_ANIMATION_STATES.fallAttack) {
    const airFrameCount = 5;
    const recoveryFrameCount = sheet.count - airFrameCount;
    if (p.fallAttackTimer > 0) {
      frame = Math.min(airFrameCount - 1, Math.floor(Math.max(0, p.fallAttackTimer - 1) / animSpeed));
    } else {
      const elapsedRecovery = FALL_ATTACK.recoveryFrames - p.fallAttackRecoveryTimer;
      frame = airFrameCount + Math.min(
        recoveryFrameCount - 1,
        Math.floor(Math.max(0, elapsedRecovery) * recoveryFrameCount / FALL_ATTACK.recoveryFrames),
      );
    }
  } else if (stateName === PLAYER_ANIMATION_STATES.attack && p.attackTimer > 0) {
    const attackDuration = Math.max(1, p.attackDuration);
    const elapsedAttack = attackDuration - p.attackTimer;
    frame = Math.min(
      sheet.count - 1,
      Math.floor(Math.max(0, elapsedAttack) * sheet.count / attackDuration),
    );
  }
  drawWithBindingSlowFilter(isBindingSlowed, () => {
    drawSheetFrame(sheet, frame, refX - drawW * anchorX, refY - drawH * anchorY, drawW, drawH, p.facing * (flipX ? -1 : 1));
  });
  if (isBindingSlowed) drawBindingSlowEffect();
}
