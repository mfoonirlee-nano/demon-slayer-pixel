import { state } from "../../game/state";
import { ctx } from "../../rendering/context";
import { HIT_BURST_CONFIG, HIT_BURST_VISUAL, PARTICLE_CONFIG, SKILL_BURST_VISUAL } from "../../constants";
import type { HitBurstState, ParticleState, SkillBurstState, SparkState } from "../../types/game-state";
import { skillById } from "../../systems/loadout";

const FULL_CIRCLE_RADIANS = Math.PI * 2;
const DEFAULT_HIT_BURST_COLOR = "#9feaff";
const SLASH_VERTICAL_SPREAD_SCALE = 0.6;
const ROCK_OUTLINE_COLOR = "#2a1b1b";
const ROCK_INSET = 1;
let nextParticleReplacementIndex = 0;
let nextHitBurstReplacementIndex = 0;
const recycledParticles: ParticleState[] = [];
const recycledHitBursts: HitBurstState[] = [];
const activeSparkCounts = new WeakMap<HitBurstState, number>();

function writableParticle() {
  if (state.particles.length < PARTICLE_CONFIG.maxActive) {
    if (state.particles.length === 0) nextParticleReplacementIndex = 0;
    const particle = recycledParticles.pop()
      ?? { x: 0, y: 0, vx: 0, vy: 0, life: 0, color: "" };
    state.particles.push(particle);
    return particle;
  }

  const index = nextParticleReplacementIndex % state.particles.length;
  nextParticleReplacementIndex = (index + 1) % PARTICLE_CONFIG.maxActive;
  return state.particles[index];
}

function resetParticle(particle: ParticleState, next: ParticleState) {
  particle.kind = next.kind;
  particle.x = next.x;
  particle.y = next.y;
  particle.vx = next.vx;
  particle.vy = next.vy;
  particle.life = next.life;
  particle.color = next.color;
  particle.size = next.size;
  particle.fade = next.fade;
  particle.gravity = next.gravity;
  particle.rotation = next.rotation;
  particle.angularVelocity = next.angularVelocity;
}

function recycleParticleAt(index: number) {
  const particle = state.particles[index] as ParticleState;
  const last = state.particles.pop();
  if (index < state.particles.length && last) state.particles[index] = last;
  if (recycledParticles.length < PARTICLE_CONFIG.maxActive) recycledParticles.push(particle);
  nextParticleReplacementIndex = state.particles.length === 0
    ? 0
    : nextParticleReplacementIndex % state.particles.length;
}

function resetSlashParticle(particle: ParticleState, x: number, y: number, color: string, spread: number) {
  particle.kind = undefined;
  particle.x = x + (Math.random() - 0.5) * spread;
  particle.y = y + (Math.random() - 0.5) * spread * SLASH_VERTICAL_SPREAD_SCALE;
  particle.vx = (Math.random() - 0.5) * PARTICLE_CONFIG.slashVelocity;
  particle.vy = (Math.random() - 0.5) * PARTICLE_CONFIG.slashVelocity;
  particle.life = PARTICLE_CONFIG.slashLifeBase + Math.random() * PARTICLE_CONFIG.slashLifeVariance;
  particle.color = color;
  particle.size = undefined;
  particle.fade = undefined;
  particle.gravity = undefined;
  particle.rotation = undefined;
  particle.angularVelocity = undefined;
}

function writableHitBurst() {
  if (state.hitBursts.length < HIT_BURST_CONFIG.maxActive) {
    if (state.hitBursts.length === 0) nextHitBurstReplacementIndex = 0;
    const burst = recycledHitBursts.pop() ?? {
      x: 0,
      y: 0,
      life: 0,
      maxLife: 0,
      radius: 0,
      grow: 0,
      color: "",
      sparks: [],
    };
    state.hitBursts.push(burst);
    return burst;
  }

  const index = nextHitBurstReplacementIndex % state.hitBursts.length;
  nextHitBurstReplacementIndex = (index + 1) % HIT_BURST_CONFIG.maxActive;
  return state.hitBursts[index];
}

function recycleHitBurstAt(index: number) {
  const burst = state.hitBursts[index] as HitBurstState;
  const last = state.hitBursts.pop();
  if (index < state.hitBursts.length && last) state.hitBursts[index] = last;
  if (recycledHitBursts.length < HIT_BURST_CONFIG.maxActive) recycledHitBursts.push(burst);
  nextHitBurstReplacementIndex = state.hitBursts.length === 0
    ? 0
    : nextHitBurstReplacementIndex % state.hitBursts.length;
}

function resetSpark(spark: SparkState, index: number, count: number, power: number) {
  spark.ang = (FULL_CIRCLE_RADIANS * index) / count
    + (Math.random() - 0.5) * HIT_BURST_CONFIG.sparkAngleJitter;
  spark.dist = HIT_BURST_CONFIG.sparkDistBase + Math.random() * HIT_BURST_CONFIG.sparkDistVariance;
  spark.speed = HIT_BURST_CONFIG.sparkSpeedBase
    + Math.random() * HIT_BURST_CONFIG.sparkSpeedVariance
    + power * HIT_BURST_CONFIG.sparkSpeedPowerScale;
  spark.size = HIT_BURST_CONFIG.sparkSizeBase + Math.random() * HIT_BURST_CONFIG.sparkSizeVariance;
}

export function emitSlash(x: number, y: number, color: string, spread: number = PARTICLE_CONFIG.slashDefaultSpread) {
  for (let i = 0; i < PARTICLE_CONFIG.slashCount; i += 1) {
    resetSlashParticle(writableParticle(), x, y, color, spread);
  }
}

export function emitParticle(particle: ParticleState) {
  if (state.particles.length < PARTICLE_CONFIG.maxActive && recycledParticles.length === 0) {
    state.particles.push(particle);
    return;
  }
  resetParticle(writableParticle(), particle);
}

export function emitHitBurst(x: number, y: number, color = DEFAULT_HIT_BURST_COLOR, power = 1) {
  const life = Math.floor(HIT_BURST_CONFIG.baseLife + HIT_BURST_CONFIG.lifeScale * power);
  const sparkCount = Math.floor(HIT_BURST_CONFIG.baseSparks + HIT_BURST_CONFIG.sparkScale * power);
  const burst = writableHitBurst();
  burst.x = x;
  burst.y = y;
  burst.life = life;
  burst.maxLife = life;
  burst.radius = HIT_BURST_CONFIG.baseRadius + HIT_BURST_CONFIG.radiusScale * power;
  burst.grow = HIT_BURST_CONFIG.baseGrow + HIT_BURST_CONFIG.growScale * power;
  burst.color = color;
  for (let index = 0; index < sparkCount; index += 1) {
    const spark = burst.sparks[index] ?? { ang: 0, dist: 0, speed: 0, size: 0 };
    resetSpark(spark, index, sparkCount, power);
    burst.sparks[index] = spark;
  }
  activeSparkCounts.set(burst, sparkCount);
}

export function updateParticles() {
  while (state.particles.length > PARTICLE_CONFIG.maxActive) recycleParticleAt(0);
  for (let i = 0; i < state.particles.length;) {
    const p = state.particles[i] as ParticleState;
    p.vy += p.gravity ?? 0;
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= p.fade || PARTICLE_CONFIG.velocityFade;
    p.vy *= p.fade || PARTICLE_CONFIG.velocityFade;
    p.rotation = (p.rotation ?? 0) + (p.angularVelocity ?? 0);
    if (p.size) p.size *= PARTICLE_CONFIG.sizeFade;
    p.life -= 1;
    if (p.life <= 0) {
      recycleParticleAt(i);
      continue;
    }
    i += 1;
  }
}

export function updateSkillBursts() {
  for (let i = state.skillBursts.length - 1; i >= 0; i -= 1) {
    const b = state.skillBursts[i] as SkillBurstState;
    b.life -= 1;
    if (b.life <= 0) state.skillBursts.splice(i, 1);
  }
}

export function updateHitBursts() {
  while (state.hitBursts.length > HIT_BURST_CONFIG.maxActive) recycleHitBurstAt(0);
  for (let i = 0; i < state.hitBursts.length;) {
    const b = state.hitBursts[i] as HitBurstState;
    b.life -= 1;
    b.radius += b.grow;
    const sparkCount = activeSparkCounts.get(b) ?? b.sparks.length;
    for (let sparkIndex = 0; sparkIndex < sparkCount; sparkIndex += 1) {
      const s = b.sparks[sparkIndex] as SparkState;
      s.dist += s.speed;
      s.size *= PARTICLE_CONFIG.sizeFade;
    }
    if (b.life <= 0) {
      recycleHitBurstAt(i);
      continue;
    }
    i += 1;
  }
}

export function drawSkillBursts() {
  if (!ctx) return;
  for (const b of state.skillBursts) {
    const t = 1 - b.life / b.maxLife;
    const skill = skillById(b.skillId);
    if (!skill) continue;
    const scale = b.scaleIn + (b.scaleOut - b.scaleIn) * t;
    const baseW = skill.frameW * skill.drawScale;
    const baseH = skill.frameH * skill.drawScale;
    const drawW = baseW * scale;
    const drawH = baseH * scale;
    const drawX = b.x - drawW / 2;
    const drawY = b.y - drawH * SKILL_BURST_VISUAL.drawYOffsetRatio;
    ctx.save();
    ctx.globalAlpha = SKILL_BURST_VISUAL.alpha;
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
    const sparkCount = activeSparkCounts.get(b) ?? b.sparks.length;
    for (let sparkIndex = 0; sparkIndex < sparkCount; sparkIndex += 1) {
      const s = b.sparks[sparkIndex] as SparkState;
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
    const size = p.size || PARTICLE_CONFIG.defaultSize;
    if (p.kind === "leaperRock") {
      ctx.save();
      ctx.translate(p.x + size / 2, p.y + size / 2);
      ctx.rotate(p.rotation ?? 0);
      ctx.fillStyle = ROCK_OUTLINE_COLOR;
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.fillStyle = p.color;
      ctx.fillRect(
        -size / 2 + ROCK_INSET,
        -size / 2 + ROCK_INSET,
        Math.max(1, size - ROCK_INSET * 2),
        Math.max(1, size - ROCK_INSET * 2),
      );
      ctx.restore();
      continue;
    }

    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, size, size);
  }
}
