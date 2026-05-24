import { state } from "../state";
import { ctx } from "../context";
import { WIDTH, HEIGHT, PROJECTILE_CONFIG, CASTER_WISP_SHEET } from "../constants";
import type { ProjectileState } from "../types/game-state";
import { hitbox } from "../utils";
import { drawSheetFrame } from "../graphics";
import { hurtPlayer } from "./player";

const CASTER_WISP_DRAW = {
  w: 38,
  h: 38,
  frameDuration: 6,
  despawnMarginY: 80,
} as const;

const FULL_CIRCLE = Math.PI * 2;

function playerCenterX() {
  return state.player.x + state.player.w / 2;
}

function playerCenterY() {
  return state.player.y + state.player.h / 2;
}

function normalizeAngle(angle: number) {
  let normalized = angle;
  while (normalized > Math.PI) normalized -= FULL_CIRCLE;
  while (normalized < -Math.PI) normalized += FULL_CIRCLE;
  return normalized;
}

function casterOwnerAlive(projectile: ProjectileState) {
  if (projectile.ownerId === undefined) return false;
  return state.enemies.some((enemy) => enemy.casterId === projectile.ownerId);
}

function updateCasterWisp(projectile: ProjectileState) {
  if (!casterOwnerAlive(projectile)) return false;

  const centerX = projectile.x + projectile.w / 2;
  const centerY = projectile.y + projectile.h / 2;
  const currentVy = projectile.vy ?? 0;
  const speed = projectile.speed ?? Math.max(1, Math.hypot(projectile.vx, currentVy));
  const turnRate = projectile.turnRate ?? 0;
  const currentAngle = Math.atan2(currentVy, projectile.vx);
  const targetAngle = Math.atan2(playerCenterY() - centerY, playerCenterX() - centerX);
  const angleDelta = normalizeAngle(targetAngle - currentAngle);
  const nextAngle = currentAngle + Math.max(-turnRate, Math.min(turnRate, angleDelta));

  projectile.vx = Math.cos(nextAngle) * speed;
  projectile.vy = Math.sin(nextAngle) * speed;
  projectile.x += projectile.vx;
  projectile.y += projectile.vy;
  projectile.elapsed = (projectile.elapsed ?? 0) + 1;
  projectile.frame = Math.floor(projectile.elapsed / CASTER_WISP_DRAW.frameDuration) % CASTER_WISP_SHEET.count;
  return true;
}

function updateBossProjectile(projectile: ProjectileState) {
  projectile.x += projectile.vx;
}

function projectileOutOfBounds(projectile: ProjectileState) {
  return projectile.x < -PROJECTILE_CONFIG.despawnMargin
    || projectile.x > WIDTH + PROJECTILE_CONFIG.despawnMargin
    || projectile.y < -CASTER_WISP_DRAW.despawnMarginY
    || projectile.y > HEIGHT + CASTER_WISP_DRAW.despawnMarginY;
}

export function updateProjectiles() {
  for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
    const p = state.projectiles[i] as ProjectileState;
    if (p.kind === "casterWisp") {
      if (!updateCasterWisp(p)) {
        state.projectiles.splice(i, 1);
        continue;
      }
    } else {
      updateBossProjectile(p);
    }
    p.life -= 1;
    if (hitbox(state.player, p)) {
      hurtPlayer(p.damage, p.vx);
      state.projectiles.splice(i, 1);
      continue;
    }
    if (p.life <= 0 || projectileOutOfBounds(p)) {
      state.projectiles.splice(i, 1);
    }
  }
}

export function drawProjectiles() {
  if (!ctx) return;
  for (const p of state.projectiles) {
    if (p.kind === "casterWisp") {
      const drawX = p.x + p.w / 2 - CASTER_WISP_DRAW.w / 2;
      const drawY = p.y + p.h / 2 - CASTER_WISP_DRAW.h / 2;
      drawSheetFrame(
        CASTER_WISP_SHEET,
        p.frame ?? 0,
        drawX,
        drawY,
        CASTER_WISP_DRAW.w,
        CASTER_WISP_DRAW.h,
        p.vx >= 0 ? 1 : -1,
      );
      continue;
    }

    ctx.fillStyle = PROJECTILE_CONFIG.primaryColor;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = PROJECTILE_CONFIG.highlightColor;
    ctx.fillRect(p.x + PROJECTILE_CONFIG.highlightOffset, p.y + PROJECTILE_CONFIG.highlightOffset, PROJECTILE_CONFIG.highlightSize, PROJECTILE_CONFIG.highlightSize);
  }
}
