import { GROUND_Y, WIDTH } from "../../constants";
import {
  SPIDER_STRING_PILLAR_CONFIG,
  SPIDER_STRING_PILLAR_EFFECT_SHEET,
} from "../../constants/assets";
import { recordCollisionDebugRect } from "../../game/collisionDebug";
import { state } from "../../game/state";
import { clamp, hitbox } from "../../game/utils";
import { ctx } from "../../rendering/context";
import { drawSheetFrame } from "../../rendering/graphics";
import type { BossState, SpiderStringPillarState } from "../../types/game-state";
import { hurtPlayer } from "../player";
import { bossAttackDamage } from "./shared";

const DELAY_WARNING_PROGRESS = 0.25;
const WARNING_STROKE_ALPHA_BASE = 0.28;
const WARNING_STROKE_ALPHA_SCALE = 0.42;
const WARNING_FILL_ALPHA_BASE = 0.14;
const WARNING_FILL_ALPHA_SCALE = 0.3;
const WARNING_DASH_LENGTH = 7;
const WARNING_RADIUS_X_SCALE = 0.72;
const WARNING_RADIUS_Y_BASE = 7;
const WARNING_RADIUS_Y_SCALE = 6;
const FULL_CIRCLE = Math.PI * 2;
const PILLAR_ACTIVE_SPRITE_FRAMES = SPIDER_STRING_PILLAR_EFFECT_SHEET.count
  - SPIDER_STRING_PILLAR_CONFIG.warningSpriteFrames;
const PILLAR_ANIMATION_FRAMES = PILLAR_ACTIVE_SPRITE_FRAMES
  * SPIDER_STRING_PILLAR_CONFIG.frameDuration;

export function spawnSpiderStringPillars(boss: BossState) {
  if (!boss) return;

  const { count, spacing, hitW, hitH, drawW } = SPIDER_STRING_PILLAR_CONFIG;
  const playerCenterX = state.player.x + state.player.w / 2;
  const formationDrawW = drawW + (count - 1) * spacing;
  const formationDrawLeft = clamp(
    playerCenterX - formationDrawW / 2,
    0,
    WIDTH - formationDrawW,
  );
  const firstHitboxLeft = formationDrawLeft + (drawW - hitW) / 2;
  const centerIndex = (count - 1) / 2;
  const bottomY = state.player.onPlatform?.y ?? GROUND_Y;
  const damage = bossAttackDamage(
    SPIDER_STRING_PILLAR_CONFIG.damageBase
      + boss.phase * SPIDER_STRING_PILLAR_CONFIG.damagePhase,
  );

  for (let index = 0; index < count; index += 1) {
    state.spiderStringPillars.push({
      x: firstHitboxLeft + index * spacing,
      y: bottomY - hitH,
      w: hitW,
      h: hitH,
      delay: Math.abs(index - centerIndex) * SPIDER_STRING_PILLAR_CONFIG.delayStep,
      warningFrames: SPIDER_STRING_PILLAR_CONFIG.warningFrames,
      elapsed: 0,
      frame: 0,
      life: SPIDER_STRING_PILLAR_CONFIG.life,
      damage,
      hitPlayer: false,
    });
  }
}

export function updateSpiderStringPillarEffects() {
  for (let index = state.spiderStringPillars.length - 1; index >= 0; index -= 1) {
    const pillar = state.spiderStringPillars[index] as SpiderStringPillarState;
    if (pillar.delay > 0) {
      pillar.delay -= 1;
      continue;
    }

    pillar.elapsed += 1;
    const activeElapsed = pillar.elapsed - pillar.warningFrames - 1;
    const visibleLife = Math.min(pillar.life, PILLAR_ANIMATION_FRAMES);
    if (activeElapsed >= visibleLife) {
      state.spiderStringPillars.splice(index, 1);
      continue;
    }

    pillar.frame = effectFrame(pillar, activeElapsed);

    const isHitFrame = pillar.frame >= SPIDER_STRING_PILLAR_CONFIG.hitStartEffectFrame
      && pillar.frame < SPIDER_STRING_PILLAR_CONFIG.hitEndEffectFrame;
    if (isHitFrame) {
      recordCollisionDebugRect(pillar, "enemyAttack");
      if (!pillar.hitPlayer && hitbox(state.player, pillar)) {
        pillar.hitPlayer = true;
        hurtPlayer(
          pillar.damage,
          state.player.x + state.player.w / 2 - (pillar.x + pillar.w / 2),
        );
      }
    }
  }
}

export function drawSpiderStringPillarEffects() {
  if (!ctx) return;

  for (const pillar of state.spiderStringPillars) {
    if (pillar.delay > 0 || pillar.elapsed <= pillar.warningFrames) {
      drawPillar(pillar);
      drawPillarWarning(pillar);
    } else {
      drawPillar(pillar);
    }
  }
}

function effectFrame(pillar: SpiderStringPillarState, activeElapsed: number) {
  if (activeElapsed < 0) {
    const warningFrame = Math.floor(
      Math.max(0, pillar.elapsed - 1)
        * SPIDER_STRING_PILLAR_CONFIG.warningSpriteFrames
        / pillar.warningFrames,
    );
    return Math.min(
      SPIDER_STRING_PILLAR_CONFIG.warningSpriteFrames - 1,
      warningFrame,
    );
  }

  return Math.min(
    SPIDER_STRING_PILLAR_EFFECT_SHEET.count - 1,
    SPIDER_STRING_PILLAR_CONFIG.warningSpriteFrames
      + Math.floor(activeElapsed / SPIDER_STRING_PILLAR_CONFIG.frameDuration),
  );
}

function drawPillarWarning(pillar: SpiderStringPillarState) {
  if (!ctx) return;
  const progress = pillar.delay > 0
    ? DELAY_WARNING_PROGRESS
    : clamp(pillar.elapsed / pillar.warningFrames, 0, 1);
  const centerX = pillar.x + pillar.w / 2;
  const bottomY = pillar.y + pillar.h;

  ctx.save();
  ctx.globalAlpha = WARNING_FILL_ALPHA_BASE + progress * WARNING_FILL_ALPHA_SCALE;
  ctx.fillStyle = "#d7d0e7";
  ctx.beginPath();
  ctx.ellipse(
    centerX,
    bottomY,
    pillar.w * WARNING_RADIUS_X_SCALE,
    WARNING_RADIUS_Y_BASE + progress * WARNING_RADIUS_Y_SCALE,
    0,
    0,
    FULL_CIRCLE,
  );
  ctx.fill();

  ctx.globalAlpha = WARNING_STROKE_ALPHA_BASE + progress * WARNING_STROKE_ALPHA_SCALE;
  ctx.strokeStyle = "#f1ebff";
  ctx.lineWidth = 2;
  ctx.setLineDash([WARNING_DASH_LENGTH, WARNING_DASH_LENGTH]);
  ctx.beginPath();
  ctx.ellipse(
    centerX,
    bottomY,
    pillar.w * WARNING_RADIUS_X_SCALE,
    WARNING_RADIUS_Y_BASE + progress * WARNING_RADIUS_Y_SCALE,
    0,
    0,
    FULL_CIRCLE,
  );
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawPillar(pillar: SpiderStringPillarState) {
  const centerX = pillar.x + pillar.w / 2;
  const bottomY = pillar.y + pillar.h;
  drawSheetFrame(
    SPIDER_STRING_PILLAR_EFFECT_SHEET,
    pillar.frame,
    centerX - SPIDER_STRING_PILLAR_CONFIG.drawW / 2,
    bottomY
      - SPIDER_STRING_PILLAR_CONFIG.drawH
      + SPIDER_STRING_PILLAR_CONFIG.effectBottomPadding,
    SPIDER_STRING_PILLAR_CONFIG.drawW,
    SPIDER_STRING_PILLAR_CONFIG.drawH,
  );
}
