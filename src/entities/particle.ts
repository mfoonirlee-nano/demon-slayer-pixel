import { state } from "../state";
import { ctx } from "../context";
import {
  SKILLS,
  PARTICLE_CONFIG,
  HIT_BURST_CONFIG,
  SKILL_BURST_VISUAL,
  HIT_BURST_VISUAL,
} from "../constants";
import type { HitBurstState, ParticleState, SkillBurstState } from "../types/game-state";
import { drawVariableSheetFrame } from "../graphics";

const FULL_CIRCLE_RADIANS = Math.PI * 2;
const DEFAULT_HIT_BURST_COLOR = "#9feaff";

export function emitSlash(x: number, y: number, color: string) {
  for (let i = 0; i < PARTICLE_CONFIG.slashCount; i += 1) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * PARTICLE_CONFIG.slashVelocity,
      vy: (Math.random() - 0.5) * PARTICLE_CONFIG.slashVelocity,
      life: PARTICLE_CONFIG.slashLifeBase + Math.random() * PARTICLE_CONFIG.slashLifeVariance,
      color,
    });
  }
}

export function emitHitBurst(x: number, y: number, color = DEFAULT_HIT_BURST_COLOR, power = 1) {
  const life = Math.floor(HIT_BURST_CONFIG.baseLife + HIT_BURST_CONFIG.lifeScale * power);
  const sparkCount = Math.floor(HIT_BURST_CONFIG.baseSparks + HIT_BURST_CONFIG.sparkScale * power);
  state.hitBursts.push({
    x,
    y,
    life,
    maxLife: life,
    radius: HIT_BURST_CONFIG.baseRadius + HIT_BURST_CONFIG.radiusScale * power,
    grow: HIT_BURST_CONFIG.baseGrow + HIT_BURST_CONFIG.growScale * power,
    color,
    sparks: Array.from({ length: sparkCount }, (_, i) => {
      const ang = (FULL_CIRCLE_RADIANS * i) / sparkCount + (Math.random() - 0.5) * HIT_BURST_CONFIG.sparkAngleJitter;
      return {
        ang,
        dist: HIT_BURST_CONFIG.sparkDistBase + Math.random() * HIT_BURST_CONFIG.sparkDistVariance,
        speed:
          HIT_BURST_CONFIG.sparkSpeedBase +
          Math.random() * HIT_BURST_CONFIG.sparkSpeedVariance +
          power * HIT_BURST_CONFIG.sparkSpeedPowerScale,
        size: HIT_BURST_CONFIG.sparkSizeBase + Math.random() * HIT_BURST_CONFIG.sparkSizeVariance,
      };
    }),
  });
}

export function updateParticles() {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i] as ParticleState;
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= p.fade || PARTICLE_CONFIG.velocityFade;
    p.vy *= p.fade || PARTICLE_CONFIG.velocityFade;
    if (p.size) p.size *= PARTICLE_CONFIG.sizeFade;
    p.life -= 1;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

export function updateSkillBursts() {
  for (let i = state.skillBursts.length - 1; i >= 0; i -= 1) {
    const b = state.skillBursts[i] as SkillBurstState;
    b.life -= 1;
    const progress = 1 - b.life / b.maxLife;
    b.frame = Math.min(b.frameCount - 1, Math.floor(progress * b.frameCount));
    if (b.life <= 0) state.skillBursts.splice(i, 1);
  }
}

export function updateHitBursts() {
  for (let i = state.hitBursts.length - 1; i >= 0; i -= 1) {
    const b = state.hitBursts[i] as HitBurstState;
    b.life -= 1;
    b.radius += b.grow;
    for (const s of b.sparks) {
      s.dist += s.speed;
      s.size *= PARTICLE_CONFIG.sizeFade;
    }
    if (b.life <= 0) state.hitBursts.splice(i, 1);
  }
}

export function drawSkillBursts() {
  if (!ctx) return;
  for (const b of state.skillBursts) {
    const t = 1 - b.life / b.maxLife;
    const skill = SKILLS[b.skillIndex] || SKILLS[0];
    const scale = b.scaleIn + (b.scaleOut - b.scaleIn) * t;
    const drawW = b.width * scale;
    const drawH = b.height * scale;
    const drawX = b.x - drawW / 2;
    const drawY = b.y - drawH * SKILL_BURST_VISUAL.drawYOffsetRatio;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = SKILL_BURST_VISUAL.alpha;
    const facing = state.player ? state.player.facing : 1;
    drawVariableSheetFrame(skill, b.frame, drawX, drawY, drawW, drawH, facing);
    ctx.fillStyle = `${b.color}${SKILL_BURST_VISUAL.floorTintSuffix}`;
    ctx.fillRect(
      drawX + SKILL_BURST_VISUAL.floorTintXOffset,
      drawY + drawH * SKILL_BURST_VISUAL.floorTintYRatio,
      Math.max(SKILL_BURST_VISUAL.floorTintMinWidth, drawW - SKILL_BURST_VISUAL.floorTintXPadding),
      SKILL_BURST_VISUAL.floorTintHeight,
    );
    ctx.restore();
  }
}

export function drawHitBursts() {
  if (!ctx) return;
  for (const b of state.hitBursts) {
    const t = b.life / b.maxLife;
    const a = HIT_BURST_VISUAL.baseAlpha + t * HIT_BURST_VISUAL.alphaScale;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(${HIT_BURST_VISUAL.outerStrokeColorRgb},${a})`;
    ctx.lineWidth = HIT_BURST_VISUAL.outerLineWidth;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, FULL_CIRCLE_RADIANS);
    ctx.stroke();
    ctx.strokeStyle = `rgba(${HIT_BURST_VISUAL.innerStrokeColorRgb},${a * HIT_BURST_VISUAL.innerAlphaScale})`;
    ctx.lineWidth = HIT_BURST_VISUAL.innerLineWidth;
    ctx.beginPath();
    ctx.arc(b.x, b.y, Math.max(HIT_BURST_CONFIG.minInnerRadius, b.radius - HIT_BURST_CONFIG.radiusScale), 0, FULL_CIRCLE_RADIANS);
    ctx.stroke();
    for (const s of b.sparks) {
      const px = b.x + Math.cos(s.ang) * s.dist;
      const py = b.y + Math.sin(s.ang) * s.dist;
      ctx.fillStyle = `rgba(${HIT_BURST_VISUAL.sparkColorRgb},${a})`;
      ctx.fillRect(px, py, s.size, s.size);
    }
    ctx.restore();
  }
}

export function drawParticles() {
  if (!ctx) return;
  for (const p of state.particles) {
    ctx.fillStyle = p.color;
    const size = p.size || PARTICLE_CONFIG.defaultSize;
    ctx.fillRect(p.x, p.y, size, size);
  }
}
