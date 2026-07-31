import { state } from "../../game/state";
import { ctx } from "../../rendering/context";
import {
  FALL_ATTACK,
  BINDER_TALISMAN_SHEET,
  BINDER_TALISMAN_KEY_SCRAMBLE_EFFECT_SHEET,
  BINDER_TALISMAN_STUN_EFFECT_SHEET,
  MOON_TIDE_PLAYER_SHEETS,
  PLAYER_ANIMATION_STATES,
  PLAYER_COMBAT,
  PLAYER_DRAW,
  PLAYER_SHEETS,
  SKILL_IDS,
} from "../../constants";
import { frameIndex, onGround } from "../../game/utils";
import { drawSheetFrame, drawSkillFrame, type SpriteFrameEffect } from "../../rendering/graphics";
import { selectedSkill } from "../../systems/loadout";
import { playerSkillById, ULTIMATE_SKILL_ASSETS } from "../../systems/skillCatalog";
import type { Skill } from "../../types/assets";
import type {
  UltimatePlayerGhostAction,
  UltimatePlayerGhostSnapshot,
} from "../../types/game-state";
import {
  activeBinderTalismanDebuffs,
  binderTalismanAttachedTimer,
  bindingZonePlayerMoveScale,
} from "../enemies/binder";
import { binderTalismanFrameEffect } from "../enemies/binderTalismanVisuals";
import { lanternAshZonePlayerMoveScale, spiderSilkSlowPlayerMoveScale } from "./movementModifiers";
import { moonTideActive, moonTidePlayerAnimationFrameSpeed, recordMoonTidePlayerGhost } from "./moonTide";
import { playerSkillCastFrame } from "./skillCasting";

const HALF_RATIO = 0.5;
const FULL_CIRCLE = Math.PI * 2;
const ULTIMATE_SKILL_SHEET = ULTIMATE_SKILL_ASSETS.skill;
const MOON_TIDE_OUTLINE_MAX_LEVEL = 3;
const MOON_TIDE_OUTLINE_ALPHA_BASE = 0.14;
const MOON_TIDE_OUTLINE_ALPHA_PER_LEVEL = 0.04;
const ULTIMATE_SKILL_CAST_ANCHOR_Y = 0.83;
const MOON_TIDE_OUTLINE_EFFECT = {
  filter: "brightness(0) saturate(100%) invert(64%) sepia(88%) saturate(1320%) hue-rotate(166deg) brightness(103%) contrast(103%) drop-shadow(0 0 7px rgba(52, 196, 255, 0.82))",
} as const satisfies SpriteFrameEffect;
const PLAYER_BINDER_TALISMAN_ATTACHMENT = {
  w: 24,
  h: 32,
  backOffsetRatio: 0.24,
  centerYRatio: 0.55,
  frameDuration: 10,
} as const;

const PLAYER_BINDER_TALISMAN_STATUS_EFFECT = {
  w: 80,
  h: 80,
  frameDuration: 6,
  keyScrambleHoverYOffset: 18,
} as const;

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

function activePlayerSheet(stateName: keyof typeof PLAYER_SHEETS) {
  const sheets = moonTideActive() ? MOON_TIDE_PLAYER_SHEETS : PLAYER_SHEETS;
  return sheets[stateName];
}

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

type BinderTalismanAttachmentTarget = {
  x: number;
  y: number;
  w: number;
  h: number;
  facing: number;
};

function drawBinderTalismanAttachment(target: BinderTalismanAttachmentTarget) {
  if (!ctx || !BINDER_TALISMAN_SHEET.image || binderTalismanAttachedTimer() <= 0) return;

  const frame = frameIndex(BINDER_TALISMAN_SHEET.count, PLAYER_BINDER_TALISMAN_ATTACHMENT.frameDuration, state.elapsed);
  const debuffs = activeBinderTalismanDebuffs();
  const drawX = target.x
    + target.w / 2
    - target.facing * target.w * PLAYER_BINDER_TALISMAN_ATTACHMENT.backOffsetRatio
    - PLAYER_BINDER_TALISMAN_ATTACHMENT.w / 2;
  const drawY = target.y
    + target.h * PLAYER_BINDER_TALISMAN_ATTACHMENT.centerYRatio
    - PLAYER_BINDER_TALISMAN_ATTACHMENT.h / 2;
  const centerX = drawX + PLAYER_BINDER_TALISMAN_ATTACHMENT.w / 2;
  const centerY = drawY + PLAYER_BINDER_TALISMAN_ATTACHMENT.h / 2;
  drawSheetFrame(
    BINDER_TALISMAN_SHEET,
    frame,
    drawX,
    drawY,
    PLAYER_BINDER_TALISMAN_ATTACHMENT.w,
    PLAYER_BINDER_TALISMAN_ATTACHMENT.h,
    target.facing,
    binderTalismanFrameEffect(debuffs),
  );

  if (debuffs.includes("keyScramble")) {
    drawBinderTalismanStatusEffect(
      BINDER_TALISMAN_KEY_SCRAMBLE_EFFECT_SHEET,
      target.x + target.w / 2,
      target.y - PLAYER_BINDER_TALISMAN_STATUS_EFFECT.keyScrambleHoverYOffset,
      1,
    );
  }
  if (debuffs.includes("stun")) {
    drawBinderTalismanStatusEffect(BINDER_TALISMAN_STUN_EFFECT_SHEET, centerX, centerY, target.facing);
  }
}

function drawBinderTalismanStatusEffect(
  sheet: typeof BINDER_TALISMAN_KEY_SCRAMBLE_EFFECT_SHEET,
  centerX: number,
  centerY: number,
  facing: number,
) {
  if (!sheet.image) return;
  const frame = frameIndex(sheet.count, PLAYER_BINDER_TALISMAN_STATUS_EFFECT.frameDuration, state.elapsed);
  drawSheetFrame(
    sheet,
    frame,
    centerX - PLAYER_BINDER_TALISMAN_STATUS_EFFECT.w / 2,
    centerY - PLAYER_BINDER_TALISMAN_STATUS_EFFECT.h / 2,
    PLAYER_BINDER_TALISMAN_STATUS_EFFECT.w,
    PLAYER_BINDER_TALISMAN_STATUS_EFFECT.h,
    facing,
  );
}

function drawRenderSnapshot(
  snapshot: UltimatePlayerGhostSnapshot,
  currentSkill: Skill | null = null,
  effect?: SpriteFrameEffect,
) {
  if (snapshot.source === "player" && snapshot.animationState) {
    drawSheetFrame(
      activePlayerSheet(snapshot.animationState),
      snapshot.frame,
      snapshot.x,
      snapshot.y,
      snapshot.w,
      snapshot.h,
      snapshot.facing,
      effect,
    );
    return;
  }

  if (snapshot.source !== "skill" || !snapshot.skillId) return;
  const skill = currentSkill ?? playerSkillById(snapshot.skillId);
  if (!skill) return;
  drawSkillFrame(skill, snapshot.frame, snapshot.x, snapshot.y, snapshot.w, snapshot.h, snapshot.facing, effect);
}

function drawMoonTideOutline(snapshot: UltimatePlayerGhostSnapshot, currentSkill: Skill | null = null) {
  if (!ctx || !moonTideActive()) return;

  const level = state.player.ultimateLevel === 2 || state.player.ultimateLevel === MOON_TIDE_OUTLINE_MAX_LEVEL
    ? state.player.ultimateLevel
    : 1;
  const expand = 2 + level;
  const outline: UltimatePlayerGhostSnapshot = {
    ...snapshot,
    x: snapshot.x - expand,
    y: snapshot.y - expand,
    w: snapshot.w + expand * 2,
    h: snapshot.h + expand * 2,
  };

  ctx.save();
  ctx.globalAlpha = MOON_TIDE_OUTLINE_ALPHA_BASE + level * MOON_TIDE_OUTLINE_ALPHA_PER_LEVEL;
  ctx.globalCompositeOperation = "lighter";
  drawRenderSnapshot(outline, currentSkill, MOON_TIDE_OUTLINE_EFFECT);
  ctx.restore();
}

function playerGhostAction(stateName: keyof typeof PLAYER_SHEETS): UltimatePlayerGhostAction {
  if (
    stateName === PLAYER_ANIMATION_STATES.attack
    || stateName === PLAYER_ANIMATION_STATES.movingAttack
  ) return "attack";
  if (stateName === PLAYER_ANIMATION_STATES.fallAttack) return "fallAttack";
  if (stateName === PLAYER_ANIMATION_STATES.run || stateName === PLAYER_ANIMATION_STATES.jump) return "move";
  return "idle";
}

export function drawPlayer() {
  const p = state.player;
  const isDashRepositionSkillAnimation = p.skillTimer > 0 && selectedSkill(state)?.id === SKILL_IDS.dashReposition;
  if (
    p.invincible > 0
    && !isDashRepositionSkillAnimation
    && Math.floor(p.invincible / PLAYER_COMBAT.blinkInterval) % 2 === 0
  ) return;
  const isBindingSlowed = Math.min(
    bindingZonePlayerMoveScale(),
    lanternAshZonePlayerMoveScale(),
    spiderSilkSlowPlayerMoveScale(),
  ) < 1;

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
    const target = {
      x: refX - drawW / 2,
      y: refY - drawH * ULTIMATE_SKILL_CAST_ANCHOR_Y,
      w: drawW,
      h: drawH,
      facing: p.facing,
    };
    drawWithBindingSlowFilter(isBindingSlowed, () => {
      drawSheetFrame(
        ULTIMATE_SKILL_SHEET,
        frame,
        target.x,
        target.y,
        target.w,
        target.h,
        p.facing,
      );
    });
    drawBinderTalismanAttachment(target);
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
      const snapshot: UltimatePlayerGhostSnapshot = {
        source: "skill",
        skillId: skill.id,
        action: "skill",
        frame,
        x: refX - drawW * effectiveAnchorX,
        y: refY - drawH * anchorY,
        w: drawW,
        h: drawH,
        facing: p.facing,
      };
      recordMoonTidePlayerGhost(snapshot);
      drawMoonTideOutline(snapshot, skill);
      drawWithBindingSlowFilter(isBindingSlowed, () => {
        drawRenderSnapshot(snapshot, skill);
      });
      drawBinderTalismanAttachment({ ...snapshot, facing: p.facing });
      if (isBindingSlowed) drawBindingSlowEffect();
      return;
    }
  }

  const isLanded = onGround(p, p.onPlatform);
  const stateName = p.fallAttackTimer > 0 || p.fallAttackRecoveryTimer > 0
    ? PLAYER_ANIMATION_STATES.fallAttack
    : p.skillTimer > 0
    ? PLAYER_ANIMATION_STATES.attack
    : p.attackTimer > 0
      ? p.attackFromRun
        ? PLAYER_ANIMATION_STATES.movingAttack
        : PLAYER_ANIMATION_STATES.attack
    : !isLanded
      ? PLAYER_ANIMATION_STATES.jump
      : Math.abs(p.vx) > PLAYER_COMBAT.movementIdleThreshold
        ? PLAYER_ANIMATION_STATES.run
        : PLAYER_ANIMATION_STATES.idle;

  const sheet = activePlayerSheet(stateName);
  const { drawW, drawH, animSpeed, anchorX = 0.5, anchorY = 1, flipX } = sheet;
  const action = playerGhostAction(stateName);
  let frame = frameIndex(sheet.count, moonTidePlayerAnimationFrameSpeed(action, animSpeed), state.elapsed);
  if (stateName === PLAYER_ANIMATION_STATES.run) {
    frame = Math.min(
      sheet.count - 1,
      Math.floor(p.runStepDistance * sheet.count / PLAYER_COMBAT.runAnimationCycleDistance),
    );
  } else if (stateName === PLAYER_ANIMATION_STATES.fallAttack) {
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
  } else if (
    (stateName === PLAYER_ANIMATION_STATES.attack || stateName === PLAYER_ANIMATION_STATES.movingAttack)
    && p.attackTimer > 0
  ) {
    const attackDuration = Math.max(1, p.attackDuration);
    const elapsedAttack = attackDuration - p.attackTimer;
    frame = Math.min(
      sheet.count - 1,
      Math.floor(Math.max(0, elapsedAttack) * sheet.count / attackDuration),
    );
  }
  const snapshot: UltimatePlayerGhostSnapshot = {
    source: "player",
    animationState: stateName,
    action,
    frame,
    x: refX - drawW * anchorX,
    y: refY - drawH * anchorY,
    w: drawW,
    h: drawH,
    facing: p.facing * (flipX ? -1 : 1),
  };
  drawWithBindingSlowFilter(isBindingSlowed, () => {
    recordMoonTidePlayerGhost(snapshot);
    drawMoonTideOutline(snapshot);
    drawRenderSnapshot(snapshot);
  });
  drawBinderTalismanAttachment({ ...snapshot, facing: p.facing });
  if (isBindingSlowed) drawBindingSlowEffect();
}
