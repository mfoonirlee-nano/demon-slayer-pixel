import { state } from "../state";
import { ctx } from "../context";
import {
  WIDTH,
  GROUND_Y,
  PLATFORM_CONFIG,
  PLATFORM_STYLE_LIST,
  PLATFORM_VISUAL,
  CRYSTAL_CONFIG,
  CRYSTAL_TYPES_BY_KIND,
  CRYSTAL_VISUAL,
  PLAYER_LIMITS,
} from "../constants";
import type { CrystalType, PlatformState, PlatformStyle } from "../types/game-state";
import { hitbox } from "../utils";
import { playTone } from "../audio";
import { emitHitBurst } from "./particle";
import { healPlayer } from "./player";

const FULL_CIRCLE_RADIANS = Math.PI * 2;

function drawPlatformBase(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string) {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
}

export function spawnCrystalOnPlatform(platform: PlatformState) {
  const type: CrystalType = Math.random() < CRYSTAL_CONFIG.attackTypeChance ? CRYSTAL_TYPES_BY_KIND.attack : CRYSTAL_TYPES_BY_KIND.health;
  state.crystals.push({
    platform,
    offsetX:
      CRYSTAL_CONFIG.offsetBase +
      Math.random() * Math.max(CRYSTAL_CONFIG.minTravelWidth, platform.w - CRYSTAL_CONFIG.offsetPadding),
    type,
    size: CRYSTAL_CONFIG.size,
    phase: Math.random() * FULL_CIRCLE_RADIANS,
  });
}

export function spawnPlatform() {
  const width = PLATFORM_CONFIG.widthBase + Math.random() * PLATFORM_CONFIG.widthVariance;
  const y = GROUND_Y - (PLATFORM_CONFIG.minYOffset + Math.random() * PLATFORM_CONFIG.yVariance);
  const style = PLATFORM_STYLE_LIST[Math.floor(Math.random() * PLATFORM_STYLE_LIST.length)] as PlatformStyle;
  const platform: PlatformState = {
    x: WIDTH + PLATFORM_CONFIG.spawnOffsetX,
    y,
    w: width,
    h: PLATFORM_CONFIG.height,
    vx: -(PLATFORM_CONFIG.baseSpeed + Math.random() * PLATFORM_CONFIG.randomSpeed + state.elapsed * PLATFORM_CONFIG.speedScaleByElapsed),
    phase: Math.random() * Math.PI * 2,
    style,
    trim: PLATFORM_CONFIG.trimBase + Math.floor(Math.random() * PLATFORM_CONFIG.trimVariants),
    notch: Math.random() < PLATFORM_CONFIG.notchChance ? 0 : PLATFORM_CONFIG.notchBase + Math.floor(Math.random() * PLATFORM_CONFIG.notchVariants),
  };
  state.platforms.push(platform);
  if (y <= GROUND_Y - PLATFORM_CONFIG.crystalEligibleHeight && Math.random() < PLATFORM_CONFIG.crystalSpawnChance) {
    spawnCrystalOnPlatform(platform);
  }
}

export function updatePlatforms(dt: number) {
  for (let i = state.platforms.length - 1; i >= 0; i -= 1) {
    const p = state.platforms[i];
    p.x += p.vx;
    p.phase += dt * PLATFORM_CONFIG.phaseSpeed;
    if (p.x + p.w < -PLATFORM_CONFIG.despawnMargin) state.platforms.splice(i, 1);
  }
}

export function updateCrystals(dt: number) {
  for (let i = state.crystals.length - 1; i >= 0; i -= 1) {
    const c = state.crystals[i];
    if (!state.platforms.includes(c.platform)) {
      state.crystals.splice(i, 1);
      continue;
    }

    c.phase += dt * CRYSTAL_CONFIG.phaseSpeed;
    const x = c.platform.x + c.offsetX;
    const y = c.platform.y - CRYSTAL_CONFIG.floatYOffset + Math.sin(c.phase) * CRYSTAL_CONFIG.floatAmplitude;
    const box = { x: x - c.size / 2, y: y - c.size / 2, w: c.size, h: c.size };

    if (hitbox(state.player, box)) {
      if (c.type === CRYSTAL_TYPES_BY_KIND.attack) {
        state.player.attackBonus = Math.min(PLAYER_LIMITS.attackBonusCap, state.player.attackBonus + CRYSTAL_CONFIG.attackBonusGain);
        emitHitBurst(x, y, CRYSTAL_VISUAL.pickupBurstColors.attack, CRYSTAL_CONFIG.hitBurstPower.attack);
        playTone(
          CRYSTAL_CONFIG.tones.attack.frequency,
          CRYSTAL_CONFIG.tones.attack.duration,
          "triangle",
          CRYSTAL_CONFIG.tones.attack.volume,
        );
      } else {
        healPlayer(CRYSTAL_CONFIG.healAmount);
        emitHitBurst(x, y, CRYSTAL_VISUAL.pickupBurstColors.health, CRYSTAL_CONFIG.hitBurstPower.health);
        playTone(
          CRYSTAL_CONFIG.tones.health.frequency,
          CRYSTAL_CONFIG.tones.health.duration,
          "triangle",
          CRYSTAL_CONFIG.tones.health.volume,
        );
      }
      state.crystals.splice(i, 1);
    }
  }
}

export function drawCrystals() {
  if (!ctx) return;

  for (const c of state.crystals) {
    if (!state.platforms.includes(c.platform)) continue;
    const x = c.platform.x + c.offsetX;
    const y = c.platform.y - CRYSTAL_CONFIG.floatYOffset + Math.sin(c.phase) * CRYSTAL_CONFIG.floatAmplitude;
    const glow = CRYSTAL_CONFIG.glowBase + CRYSTAL_CONFIG.glowAmplitude * Math.sin(c.phase * CRYSTAL_CONFIG.glowPhaseMultiplier);
    if (c.type === CRYSTAL_TYPES_BY_KIND.attack) {
      ctx.fillStyle = `rgba(${CRYSTAL_VISUAL.attackGlowColorRgb},${glow})`;
      ctx.fillRect(
        x - CRYSTAL_CONFIG.draw.outerOffset,
        y - CRYSTAL_CONFIG.draw.outerOffset,
        CRYSTAL_CONFIG.draw.outerSize,
        CRYSTAL_CONFIG.draw.outerSize,
      );
      ctx.fillStyle = CRYSTAL_VISUAL.attackCoreColor;
      ctx.fillRect(
        x - CRYSTAL_CONFIG.draw.attackCoreOffset.x,
        y - CRYSTAL_CONFIG.draw.attackCoreOffset.y,
        CRYSTAL_CONFIG.draw.attackCoreSize.w,
        CRYSTAL_CONFIG.draw.attackCoreSize.h,
      );
      ctx.fillRect(
        x - CRYSTAL_CONFIG.draw.attackCrossOffset.x,
        y - CRYSTAL_CONFIG.draw.attackCrossOffset.y,
        CRYSTAL_CONFIG.draw.attackCrossSize.w,
        CRYSTAL_CONFIG.draw.attackCrossSize.h,
      );
    } else {
      ctx.fillStyle = `rgba(${CRYSTAL_VISUAL.healthGlowColorRgb},${glow})`;
      ctx.fillRect(
        x - CRYSTAL_CONFIG.draw.outerOffset,
        y - CRYSTAL_CONFIG.draw.outerOffset,
        CRYSTAL_CONFIG.draw.outerSize,
        CRYSTAL_CONFIG.draw.outerSize,
      );
      ctx.fillStyle = CRYSTAL_VISUAL.healthCoreColor;
      ctx.fillRect(
        x - CRYSTAL_CONFIG.draw.healthCoreOffset.x,
        y - CRYSTAL_CONFIG.draw.healthCoreOffset.y,
        CRYSTAL_CONFIG.draw.healthCoreSize.w,
        CRYSTAL_CONFIG.draw.healthCoreSize.h,
      );
      ctx.fillRect(
        x - CRYSTAL_CONFIG.draw.healthCrossOffset.x,
        y - CRYSTAL_CONFIG.draw.healthCrossOffset.y,
        CRYSTAL_CONFIG.draw.healthCrossSize.w,
        CRYSTAL_CONFIG.draw.healthCrossSize.h,
      );
    }
  }
}

export function drawPlatforms() {
  if (!ctx) return;

  for (const p of state.platforms) {
    if (p.style === PLATFORM_STYLE_LIST[2]) {
      drawPlatformBase(ctx,p.x, p.y, p.w, p.h, PLATFORM_VISUAL.shrine.baseColor);
      ctx.fillStyle = PLATFORM_VISUAL.shrine.topColor;
      ctx.fillRect(
        p.x + PLATFORM_VISUAL.shrine.topInsetX,
        p.y + PLATFORM_VISUAL.shrine.topInsetY,
        p.w - PLATFORM_VISUAL.shrine.topInsetWidth,
        PLATFORM_VISUAL.shrine.topHeight,
      );
      for (let i = PLATFORM_VISUAL.shrine.pillarStartX; i < p.w - PLATFORM_VISUAL.shrine.undersideInset; i += PLATFORM_VISUAL.shrine.pillarStep) {
        ctx.fillStyle = PLATFORM_VISUAL.shrine.pillarColor;
        ctx.fillRect(p.x + i, p.y + PLATFORM_VISUAL.shrine.topInsetY, PLATFORM_VISUAL.shrine.pillarWidth, p.h - PLATFORM_VISUAL.shrine.topInsetY);
      }
      ctx.fillStyle = PLATFORM_VISUAL.shrine.undersideColor;
      ctx.fillRect(
        p.x + PLATFORM_VISUAL.shrine.undersideInset,
        p.y + p.h,
        p.w - PLATFORM_VISUAL.shrine.undersideInset * 2,
        PLATFORM_VISUAL.shrine.undersideHeight,
      );
    } else if (p.style === PLATFORM_STYLE_LIST[3]) {
      drawPlatformBase(ctx,p.x, p.y, p.w, p.h, PLATFORM_VISUAL.ruin.baseColor);
      ctx.fillStyle = PLATFORM_VISUAL.ruin.topColor;
      ctx.fillRect(
        p.x + PLATFORM_VISUAL.ruin.topInset,
        p.y + PLATFORM_VISUAL.ruin.topInset,
        p.w - PLATFORM_VISUAL.ruin.topInset * 2,
        PLATFORM_VISUAL.ruin.topHeight,
      );
      for (let i = 0; i < p.notch; i += 1) {
        const notchX = p.x + p.w * (PLATFORM_VISUAL.ruin.notchStartRatio + i * PLATFORM_VISUAL.ruin.notchStepRatio);
        ctx.clearRect(notchX, p.y, PLATFORM_VISUAL.ruin.notchWidth, PLATFORM_VISUAL.ruin.notchHeight);
      }
      ctx.fillStyle = PLATFORM_VISUAL.ruin.undersideColor;
      ctx.fillRect(
        p.x + PLATFORM_VISUAL.ruin.undersideInset,
        p.y + p.h,
        p.w - PLATFORM_VISUAL.ruin.undersideInset * 2,
        PLATFORM_VISUAL.ruin.undersideHeight,
      );
    } else if (p.style === PLATFORM_STYLE_LIST[1]) {
      drawPlatformBase(ctx,p.x, p.y, p.w, p.h, PLATFORM_VISUAL.moss.baseColor);
      ctx.fillStyle = PLATFORM_VISUAL.moss.topColor;
      ctx.fillRect(
        p.x + PLATFORM_VISUAL.moss.topInsetX,
        p.y + PLATFORM_VISUAL.moss.topInsetY,
        p.w - PLATFORM_VISUAL.moss.topInsetWidth,
        PLATFORM_VISUAL.moss.topHeight,
      );
      ctx.fillStyle = PLATFORM_VISUAL.moss.undersideColor;
      ctx.fillRect(
        p.x + PLATFORM_VISUAL.moss.undersideInset,
        p.y + p.h,
        p.w - PLATFORM_VISUAL.moss.undersideInset * 2,
        PLATFORM_VISUAL.moss.undersideHeight,
      );
      for (let i = 0; i < p.w; i += PLATFORM_VISUAL.moss.grassStep) {
        const sway = Math.sin(p.phase + i * PLATFORM_VISUAL.moss.grassPhaseScale) * PLATFORM_VISUAL.moss.grassSwayAmplitude;
        ctx.fillStyle = PLATFORM_VISUAL.moss.grassColor;
        ctx.fillRect(
          p.x + i + PLATFORM_VISUAL.moss.grassOffsetX,
          p.y - PLATFORM_VISUAL.moss.grassOffsetY + sway,
          PLATFORM_VISUAL.moss.grassWidth,
          PLATFORM_VISUAL.moss.grassHeight,
        );
      }
    } else {
      drawPlatformBase(ctx,p.x, p.y, p.w, p.h, PLATFORM_VISUAL.stone.baseColor);
      ctx.fillStyle = PLATFORM_VISUAL.stone.topColor;
      ctx.fillRect(
        p.x + p.trim,
        p.y + PLATFORM_VISUAL.stone.topInsetY,
        p.w - p.trim * 2,
        PLATFORM_VISUAL.stone.topHeight,
      );
      ctx.fillStyle = PLATFORM_VISUAL.stone.undersideColor;
      ctx.fillRect(
        p.x + PLATFORM_VISUAL.stone.undersideInset,
        p.y + p.h,
        p.w - PLATFORM_VISUAL.stone.undersideInset * 2,
        PLATFORM_VISUAL.stone.undersideHeight,
      );
      for (let i = PLATFORM_VISUAL.stone.detailStartX; i < p.w - 4; i += PLATFORM_VISUAL.stone.detailStep) {
        ctx.fillStyle = PLATFORM_VISUAL.stone.detailColor;
        ctx.fillRect(
          p.x + i,
          p.y + PLATFORM_VISUAL.stone.detailOffsetY,
          PLATFORM_VISUAL.stone.detailWidth,
          PLATFORM_VISUAL.stone.detailHeight,
        );
      }
    }
  }
}
