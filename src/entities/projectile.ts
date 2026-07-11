import { state } from "../game/state";
import { ctx } from "../rendering/context";
import { WIDTH, HEIGHT, PROJECTILE_CONFIG, CASTER_WISP_SHEET, BINDER_TALISMAN_SHEET } from "../constants";
import type { ProjectileState } from "../types/game-state";
import { hitbox } from "../game/utils";
import { drawSheetFrame, type SpriteFrameEffect } from "../rendering/graphics";
import { blockProjectileWithGuardCounter, hurtPlayer } from "./player";
import { applyBinderTalismanDebuffs } from "./enemies/binder";
import { binderTalismanFrameEffect } from "./enemies/binderTalismanVisuals";

const CASTER_WISP_DRAW = {
  w: 38,
  h: 38,
  frameDuration: 6,
} as const;
const CASTER_WISP_FRAME_EFFECT: Record<"awakened" | "final", SpriteFrameEffect> = {
  awakened: {
    filter: "brightness(1.02) saturate(1.35) contrast(1.12)",
    tint: {
      color: "rgb(178, 28, 126)",
      alpha: 0.44,
    },
  },
  final: {
    filter: "brightness(0.82) saturate(1.5) contrast(1.18)",
    tint: {
      color: "rgb(104, 8, 24)",
      alpha: 0.58,
    },
  },
};
const BINDER_TALISMAN_DRAW = {
  w: 34,
  h: 44,
  frameDuration: 5,
} as const;
const LEAPER_SPIKE_DRAW = {
  length: 24,
  width: 8,
  outlineWidth: 2,
  fill: "#cbb99a",
  highlight: "#f0dfbd",
  outline: "#4b3030",
} as const;

const FRAMES_PER_SECOND = 60;
const CASTER_WISP_TRACKING_SECONDS = 5;
const DEFAULT_CASTER_WISP_TRACKING_FRAMES = CASTER_WISP_TRACKING_SECONDS * FRAMES_PER_SECOND;
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

function liveCasterIds() {
  const ids = new Set<number>();
  for (const enemy of state.enemies) {
    if (enemy.casterId !== undefined) ids.add(enemy.casterId);
  }
  return ids;
}

function casterOwnerAlive(projectile: ProjectileState, casterIds: ReadonlySet<number>) {
  if (projectile.ownerId === undefined) return false;
  return casterIds.has(projectile.ownerId);
}

function updateCasterWisp(projectile: ProjectileState, casterIds: ReadonlySet<number>) {
  if (!casterOwnerAlive(projectile, casterIds)) return false;
  updateHomingProjectile(
    projectile,
    projectile.frameDuration ?? CASTER_WISP_DRAW.frameDuration,
    CASTER_WISP_SHEET.count,
  );
  return true;
}

function updateHomingProjectile(projectile: ProjectileState, frameDuration: number, frameCount: number) {
  const centerX = projectile.x + projectile.w / 2;
  const centerY = projectile.y + projectile.h / 2;
  const currentVy = projectile.vy ?? 0;
  const elapsed = projectile.elapsed ?? 0;
  const trackingFrames = projectile.trackingFrames ?? DEFAULT_CASTER_WISP_TRACKING_FRAMES;
  if (elapsed < trackingFrames) {
    const speed = projectile.speed ?? Math.max(1, Math.hypot(projectile.vx, currentVy));
    const turnRate = projectile.turnRate ?? 0;
    const currentAngle = Math.atan2(currentVy, projectile.vx);
    const targetAngle = Math.atan2(playerCenterY() - centerY, playerCenterX() - centerX);
    const angleDelta = normalizeAngle(targetAngle - currentAngle);
    const nextAngle = currentAngle + Math.max(-turnRate, Math.min(turnRate, angleDelta));

    projectile.vx = Math.cos(nextAngle) * speed;
    projectile.vy = Math.sin(nextAngle) * speed;
  }

  projectile.x += projectile.vx;
  projectile.y += projectile.vy ?? 0;
  projectile.elapsed = elapsed + 1;
  projectile.frame = Math.floor(projectile.elapsed / frameDuration) % frameCount;
}

function updateBinderTalisman(projectile: ProjectileState) {
  updateHomingProjectile(projectile, BINDER_TALISMAN_DRAW.frameDuration, BINDER_TALISMAN_SHEET.count);
  return true;
}

function updateLinearProjectile(projectile: ProjectileState) {
  projectile.x += projectile.vx;
  projectile.y += projectile.vy ?? 0;
}

function casterWispOutOfBounds(projectile: ProjectileState) {
  const drawX = projectile.x + projectile.w / 2 - CASTER_WISP_DRAW.w / 2;
  const drawY = projectile.y + projectile.h / 2 - CASTER_WISP_DRAW.h / 2;
  return drawX + CASTER_WISP_DRAW.w < 0
    || drawX > WIDTH
    || drawY + CASTER_WISP_DRAW.h < 0
    || drawY > HEIGHT;
}

function binderTalismanOutOfBounds(projectile: ProjectileState) {
  const drawX = projectile.x + projectile.w / 2 - BINDER_TALISMAN_DRAW.w / 2;
  const drawY = projectile.y + projectile.h / 2 - BINDER_TALISMAN_DRAW.h / 2;
  return drawX + BINDER_TALISMAN_DRAW.w < 0
    || drawX > WIDTH
    || drawY + BINDER_TALISMAN_DRAW.h < 0
    || drawY > HEIGHT;
}

function projectileOutOfBounds(projectile: ProjectileState) {
  if (projectile.kind === "casterWisp") return casterWispOutOfBounds(projectile);
  if (projectile.kind === "binderTalisman") return binderTalismanOutOfBounds(projectile);
  return projectile.x < -PROJECTILE_CONFIG.despawnMargin
    || projectile.x > WIDTH + PROJECTILE_CONFIG.despawnMargin
    || projectile.y < -PROJECTILE_VERTICAL_DESPAWN_MARGIN
    || projectile.y > HEIGHT + PROJECTILE_VERTICAL_DESPAWN_MARGIN;
}

function casterWispFrameEffect(projectile: ProjectileState) {
  if (projectile.wispStage === "awakened") return CASTER_WISP_FRAME_EFFECT.awakened;
  if (projectile.wispStage === "final") return CASTER_WISP_FRAME_EFFECT.final;
  return undefined;
}

export function updateProjectiles() {
  let casterIds: ReadonlySet<number> | null = null;
  for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
    const p = state.projectiles[i] as ProjectileState;
    if (p.kind === "casterWisp") {
      casterIds ??= liveCasterIds();
      if (!updateCasterWisp(p, casterIds)) {
        state.projectiles.splice(i, 1);
        continue;
      }
    } else if (p.kind === "binderTalisman") {
      updateBinderTalisman(p);
    } else {
      updateLinearProjectile(p);
    }
    p.life -= 1;
    if (p.kind === "binderTalisman" && blockProjectileWithGuardCounter(p)) {
      state.projectiles.splice(i, 1);
      continue;
    }
    if (hitbox(state.player, p)) {
      if (p.kind === "binderTalisman") {
        applyBinderTalismanDebuffs(p.debuffs ?? ["slow", "damage"]);
        state.projectiles.splice(i, 1);
        continue;
      }
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
        casterWispFrameEffect(p),
      );
      continue;
    }

    if (p.kind === "binderTalisman") {
      const drawX = p.x + p.w / 2 - BINDER_TALISMAN_DRAW.w / 2;
      const drawY = p.y + p.h / 2 - BINDER_TALISMAN_DRAW.h / 2;
      drawSheetFrame(
        BINDER_TALISMAN_SHEET,
        p.frame ?? 0,
        drawX,
        drawY,
        BINDER_TALISMAN_DRAW.w,
        BINDER_TALISMAN_DRAW.h,
        p.vx >= 0 ? 1 : -1,
        binderTalismanFrameEffect(p.debuffs),
      );
      continue;
    }

    if (p.kind === "leaperSpike") {
      const centerX = p.x + p.w / 2;
      const centerY = p.y + p.h / 2;
      const angle = Math.atan2(p.vy ?? 0, p.vx);
      const halfLength = LEAPER_SPIKE_DRAW.length / 2;
      const halfWidth = LEAPER_SPIKE_DRAW.width / 2;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);
      ctx.fillStyle = LEAPER_SPIKE_DRAW.fill;
      ctx.strokeStyle = LEAPER_SPIKE_DRAW.outline;
      ctx.lineWidth = LEAPER_SPIKE_DRAW.outlineWidth;
      ctx.beginPath();
      ctx.moveTo(-halfLength, -halfWidth);
      ctx.lineTo(halfLength, 0);
      ctx.lineTo(-halfLength, halfWidth);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = LEAPER_SPIKE_DRAW.highlight;
      ctx.fillRect(-halfLength / 2, -1, halfLength, 2);
      ctx.restore();
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
