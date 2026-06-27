import { state } from "../game/state";
import { ctx } from "../rendering/context";
import { WIDTH, HEIGHT, PROJECTILE_CONFIG, CASTER_WISP_SHEET } from "../constants";
import type { ProjectileState } from "../types/game-state";
import { hitbox } from "../game/utils";
import { drawSheetFrame } from "../rendering/graphics";
import { hurtPlayer } from "./player";

const CASTER_WISP_DRAW = {
  w: 38,
  h: 38,
  frameDuration: 6,
} as const;

const FULL_CIRCLE = Math.PI * 2;
const PROJECTILE_VERTICAL_DESPAWN_MARGIN = 80;

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

function casterWispOutOfBounds(projectile: ProjectileState) {
  const drawX = projectile.x + projectile.w / 2 - CASTER_WISP_DRAW.w / 2;
  const drawY = projectile.y + projectile.h / 2 - CASTER_WISP_DRAW.h / 2;
  return drawX + CASTER_WISP_DRAW.w < 0
    || drawX > WIDTH
    || drawY + CASTER_WISP_DRAW.h < 0
    || drawY > HEIGHT;
}

function projectileOutOfBounds(projectile: ProjectileState) {
  if (projectile.kind === "casterWisp") return casterWispOutOfBounds(projectile);
  return projectile.x < -PROJECTILE_CONFIG.despawnMargin
    || projectile.x > WIDTH + PROJECTILE_CONFIG.despawnMargin
    || projectile.y < -PROJECTILE_VERTICAL_DESPAWN_MARGIN
    || projectile.y > HEIGHT + PROJECTILE_VERTICAL_DESPAWN_MARGIN;
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
        p.vx >= 0 ? -1 : 1,
      );
      continue;
    }

    const primaryColor = p.kind === "bossBone" ? "#d7d2c2" : PROJECTILE_CONFIG.primaryColor;
    const highlightColor = p.kind === "bossBone" ? "#f4f0de" : PROJECTILE_CONFIG.highlightColor;
    const outlineColor = p.kind === "bossBone" ? "#4e5966" : PROJECTILE_CONFIG.primaryColor;
    ctx.fillStyle = outlineColor;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = primaryColor;
    ctx.fillRect(p.x + 1, p.y + 1, Math.max(1, p.w - 2), Math.max(1, p.h - 2));
    ctx.fillStyle = highlightColor;
    ctx.fillRect(p.x + PROJECTILE_CONFIG.highlightOffset, p.y + PROJECTILE_CONFIG.highlightOffset, PROJECTILE_CONFIG.highlightSize, PROJECTILE_CONFIG.highlightSize);
  }
}
