import { state } from "../../game/state";
import { ctx } from "../../rendering/context";
import {
  ACT_PLATFORM_SPRITES,
  HOVER_CONFIG,
  PLATFORM_CONFIG,
  PLATFORM_SPRITES,
} from "../../constants";
import type { PlatformSpriteSheet } from "../../constants";
import type { PlatformState } from "../../types/game-state";

const HOVER_GLOW_EDGE_INSET = 4;

export function updatePlatforms(dt: number) {
  for (let i = state.platforms.length - 1; i >= 0; i -= 1) {
    const p = state.platforms[i];
    p.x += p.vx;
    p.phase += dt * PLATFORM_CONFIG.phaseSpeed;
    if (p.hoverAmplitude > 0) {
      p.y = p.baseY + Math.sin(p.phase * (HOVER_CONFIG.phaseSpeed / PLATFORM_CONFIG.phaseSpeed)) * p.hoverAmplitude;
    }
    if (p.x + p.w < -PLATFORM_CONFIG.despawnMargin) state.platforms.splice(i, 1);
  }
}

// --- Draw ---

function platformSpriteSheet(platform: PlatformState): PlatformSpriteSheet {
  return platform.spriteAct === null
    ? PLATFORM_SPRITES
    : ACT_PLATFORM_SPRITES[platform.spriteAct] ?? PLATFORM_SPRITES;
}

function platformDrawPlacement(platform: PlatformState) {
  const sheet = platformSpriteSheet(platform);
  const sprite = sheet.regions[platform.spriteIndex] ?? sheet.regions[0];
  const drawW = Math.round(sprite.sw * sheet.drawScale);
  const drawH = Math.round(sprite.sh * sheet.drawScale);
  const drawX = Math.round(platform.x);
  const visualSurfaceY = platform.y - PLATFORM_CONFIG.collisionSurfaceInsetY;
  const drawY = Math.round(visualSurfaceY - sprite.surfaceY * sheet.drawScale);
  return { sheet, sprite, drawW, drawH, drawX, drawY, visualSurfaceY };
}

function drawPlatformSprite(
  context: CanvasRenderingContext2D,
  platform: PlatformState,
) {
  const { sheet, sprite, drawW, drawH, drawX, drawY, visualSurfaceY } = platformDrawPlacement(platform);
  if (!sheet.image) return;
  context.drawImage(
    sheet.image,
    sprite.sx,
    sprite.sy,
    sprite.sw,
    sprite.sh,
    drawX,
    drawY,
    drawW,
    drawH,
  );

  // Hover indicator: faint glow strip on top edge
  if (platform.kind === "hover") {
    context.fillStyle = "rgba(140,210,255,0.18)";
    context.fillRect(
      platform.x + HOVER_GLOW_EDGE_INSET / 2,
      visualSurfaceY,
      platform.w - HOVER_GLOW_EDGE_INSET,
      2,
    );
  }
}

export function drawPlatforms() {
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;

  for (const p of state.platforms) {
    if (p === state.player.onPlatform) continue;
    drawPlatformSprite(ctx, p);
  }
}

export function drawPlatformOcclusion() {
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;

  const platform = state.player.onPlatform;
  if (!platform || !state.platforms.includes(platform)) return;
  drawPlatformSprite(ctx, platform);
}
