import { state } from "../state.js";
import { ctx } from "../context.js";
import { drawVariableSheetFrame } from "../graphics.js";
import { SKILLS } from "../constants.js";

export function emitSlash(x, y, color) {
  for (let i = 0; i < 12; i += 1) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.5) * 7,
      life: 20 + Math.random() * 10,
      color,
    });
  }
}

export function emitHitBurst(x, y, color = "#9feaff", power = 1) {
  state.hitBursts.push({
    x,
    y,
    life: Math.floor(10 + 8 * power),
    maxLife: Math.floor(10 + 8 * power),
    radius: 8 + 6 * power,
    grow: 1.8 + 1.2 * power,
    color,
    sparks: Array.from({ length: Math.floor(8 + 8 * power) }, (_, i) => {
      const ang = (Math.PI * 2 * i) / Math.floor(8 + 8 * power) + (Math.random() - 0.5) * 0.25;
      return {
        ang,
        dist: 1 + Math.random() * 5,
        speed: 1.2 + Math.random() * 2.4 + power * 0.5,
        size: 1.4 + Math.random() * 1.8,
      };
    }),
  });
}

export function updateParticles() {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= p.fade || 0.96;
    p.vy *= p.fade || 0.96;
    if (p.size) p.size *= 0.97;
    p.life -= 1;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

export function updateSkillBursts() {
  for (let i = state.skillBursts.length - 1; i >= 0; i -= 1) {
    const b = state.skillBursts[i];
    b.life -= 1;
    const progress = 1 - b.life / b.maxLife;
    b.frame = Math.min(b.frameCount - 1, Math.floor(progress * b.frameCount));
    if (b.life <= 0) state.skillBursts.splice(i, 1);
  }
}

export function updateHitBursts() {
  for (let i = state.hitBursts.length - 1; i >= 0; i -= 1) {
    const b = state.hitBursts[i];
    b.life -= 1;
    b.radius += b.grow;
    for (const s of b.sparks) {
      s.dist += s.speed;
      s.size *= 0.97;
    }
    if (b.life <= 0) state.hitBursts.splice(i, 1);
  }
}

export function drawSkillBursts() {
  for (const b of state.skillBursts) {
    const t = 1 - b.life / b.maxLife;
    const skill = SKILLS[b.skillIndex] || SKILLS[0];
    const scale = b.scaleIn + (b.scaleOut - b.scaleIn) * t;
    const drawW = b.width * scale;
    const drawH = b.height * scale;
    const drawX = b.x - drawW / 2;
    const drawY = b.y - drawH * 0.68;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.96;
    // Use player facing from state, defaulting to 1 if player not ready (though bursts usually imply player exists)
    const facing = state.player ? state.player.facing : 1;
    drawVariableSheetFrame(skill, b.frame, drawX, drawY, drawW, drawH, facing);
    ctx.fillStyle = `${b.color}22`;
    ctx.fillRect(drawX + 12, drawY + drawH * 0.66, Math.max(20, drawW - 24), 10);
    ctx.restore();
  }
}

export function drawHitBursts() {
  for (const b of state.hitBursts) {
    const t = b.life / b.maxLife;
    const a = 0.2 + t * 0.7;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(166,236,255,${a})`;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(225,250,255,${a * 0.7})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(b.x, b.y, Math.max(2, b.radius - 6), 0, Math.PI * 2);
    ctx.stroke();
    for (const s of b.sparks) {
      const px = b.x + Math.cos(s.ang) * s.dist;
      const py = b.y + Math.sin(s.ang) * s.dist;
      ctx.fillStyle = `rgba(203,246,255,${a})`;
      ctx.fillRect(px, py, s.size, s.size);
    }
    ctx.restore();
  }
}

export function drawParticles() {
  for (const p of state.particles) {
    ctx.fillStyle = p.color;
    const size = p.size || 3;
    ctx.fillRect(p.x, p.y, size, size);
  }
}
