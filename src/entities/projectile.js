import { state } from "../state.js";
import { ctx } from "../context.js";
import { WIDTH } from "../constants.js";
import { hitbox } from "../utils.js";
import { hurtPlayer } from "./player.js";

export function updateProjectiles() {
  for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
    const p = state.projectiles[i];
    p.x += p.vx;
    p.life -= 1;
    if (hitbox(state.player, p)) {
      hurtPlayer(p.damage, p.vx);
      state.projectiles.splice(i, 1);
      continue;
    }
    if (p.life <= 0 || p.x < -24 || p.x > WIDTH + 24) {
      state.projectiles.splice(i, 1);
    }
  }
}

export function drawProjectiles() {
  for (const p of state.projectiles) {
    ctx.fillStyle = "#ff6e93";
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = "#ffe2ef";
    ctx.fillRect(p.x + 2, p.y + 2, 3, 3);
  }
}
