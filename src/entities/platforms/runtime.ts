import { state } from "../../game/state";
import { ctx } from "../../rendering/context";
import { HOVER_CONFIG, PLATFORM_CONFIG, PLATFORM_SPRITES } from "../../constants";

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

export function drawPlatforms() {
  if (!ctx) return;
  const image = PLATFORM_SPRITES.image;
  if (!image) return;
  ctx.imageSmoothingEnabled = false;

  for (const p of state.platforms) {
    const sprite = PLATFORM_SPRITES.regions[p.spriteIndex] ?? PLATFORM_SPRITES.regions[0];
    const drawW = Math.round(sprite.sw * PLATFORM_SPRITES.drawScale);
    const drawH = Math.round(sprite.sh * PLATFORM_SPRITES.drawScale);
    const drawX = Math.round(p.x);
    const visualSurfaceY = p.y - PLATFORM_CONFIG.collisionSurfaceInsetY;
    const drawY = Math.round(visualSurfaceY - sprite.surfaceY * PLATFORM_SPRITES.drawScale);
    ctx.drawImage(
      image,
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
    if (p.kind === "hover") {
      ctx.fillStyle = "rgba(140,210,255,0.18)";
      ctx.fillRect(p.x + 2, visualSurfaceY, p.w - 4, 2);
    }
  }
}
