import { state } from "../state";
import { ctx } from "../context";
import { WIDTH, PROJECTILE_CONFIG } from "../constants";
import type { ProjectileState } from "../types/game-state";
import { hitbox } from "../utils";
import { hurtPlayer } from "./player";

export function updateProjectiles() {
  for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
    const p = state.projectiles[i] as ProjectileState;
    p.x += p.vx;
    p.life -= 1;
    if (hitbox(state.player, p)) {
      hurtPlayer(p.damage, p.vx);
      state.projectiles.splice(i, 1);
      continue;
    }
    if (p.life <= 0 || p.x < -PROJECTILE_CONFIG.despawnMargin || p.x > WIDTH + PROJECTILE_CONFIG.despawnMargin) {
      state.projectiles.splice(i, 1);
    }
  }
}

export function drawProjectiles() {
  if (!ctx) return;
  for (const p of state.projectiles) {
    ctx.fillStyle = PROJECTILE_CONFIG.primaryColor;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = PROJECTILE_CONFIG.highlightColor;
    ctx.fillRect(p.x + PROJECTILE_CONFIG.highlightOffset, p.y + PROJECTILE_CONFIG.highlightOffset, PROJECTILE_CONFIG.highlightSize, PROJECTILE_CONFIG.highlightSize);
  }
}
