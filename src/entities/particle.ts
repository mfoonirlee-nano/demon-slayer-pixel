import { state } from "../state";
import { ctx } from "../context";
import {
  SKILLS,
  PARTICLE_CONFIG,
  HIT_BURST_CONFIG,
  SKILL_BURST_VISUAL,
  HIT_BURST_VISUAL,
  SKILL1_EFFECT_SHEET,
  SKILL1_EFFECT_CONFIG,
  SKILL2_EFFECT_SHEET,
  SKILL2_EFFECT_CONFIG,
  PLAYER_COMBAT,
  WIDTH,
} from "../constants";
import type { HitBurstState, ParticleState, Skill1EffectState, Skill2EffectState, SkillBurstState } from "../types/game-state";

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
    if (b.life <= 0) state.skillBursts.splice(i, 1);
  }
}

export function updateSkill1Effects() {
  const sheet = SKILL1_EFFECT_SHEET;
  const drawW = sheet.frameW * SKILL1_EFFECT_CONFIG.drawScale;
  const drawH = sheet.frameH * SKILL1_EFFECT_CONFIG.drawScale;
  const p = state.player;
  const damage = (p.baseAttack + p.attackBonus) * SKILL1_EFFECT_CONFIG.damageMultiplier;

  for (let i = state.skill1Effects.length - 1; i >= 0; i -= 1) {
    const eff = state.skill1Effects[i] as Skill1EffectState;
    eff.x += eff.vx;
    eff.elapsed += 1;

    // advance frame
    const rawFrame = Math.floor(eff.elapsed / SKILL1_EFFECT_CONFIG.frameDuration);
    if (rawFrame < sheet.count) {
      eff.frame = rawFrame;
    } else {
      const loopLen = sheet.count - SKILL1_EFFECT_CONFIG.loopFromFrame;
      eff.frame = SKILL1_EFFECT_CONFIG.loopFromFrame + ((rawFrame - sheet.count) % loopLen);
    }

    // hitbox of the effect
    const effLeft = eff.x - drawW / 2;
    const effRight = eff.x + drawW / 2;
    const effTop = eff.y;
    const effBottom = eff.y + drawH;

    // damage enemies
    for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
      const enemy = state.enemies[j];
      if (enemy.hitCd > 0) continue;
      const overlapX = effRight > enemy.x && effLeft < enemy.x + enemy.w;
      const overlapY = effBottom > enemy.y && effTop < enemy.y + enemy.h;
      if (!overlapX || !overlapY) continue;
      const hitX = Math.max(enemy.x, Math.min(enemy.x + enemy.w, eff.x));
      const hitY = enemy.y + enemy.h * 0.4;
      enemy.hp -= damage;
      enemy.hitCd = SKILL1_EFFECT_CONFIG.hitCooldown;
      emitSlash(hitX, hitY, PLAYER_COMBAT.effects.skillEnemyBurstColor);
      emitHitBurst(hitX, hitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, PLAYER_COMBAT.skillEnemyBurstPower);
      if (enemy.hp <= 0) {
        p.score += PLAYER_COMBAT.enemyKillScore;
        // inline energy gain to avoid circular import with player.ts
        if (p.skillCharges < p.maxSkillCharges) {
          p.skillEnergy += PLAYER_COMBAT.enemyEnergyGain;
          while (p.skillEnergy >= p.skillEnergyMax && p.skillCharges < p.maxSkillCharges) {
            p.skillEnergy -= p.skillEnergyMax;
            p.skillCharges += 1;
          }
          if (p.skillCharges >= p.maxSkillCharges) {
            p.skillCharges = p.maxSkillCharges;
            p.skillEnergy = p.skillEnergyMax;
          }
        }
        state.enemies.splice(j, 1);
      }
    }

    // damage boss
    if (state.boss && state.boss.hitCd <= 0) {
      const boss = state.boss;
      const overlapX = effRight > boss.x && effLeft < boss.x + boss.w;
      const overlapY = effBottom > boss.y && effTop < boss.y + boss.h;
      if (overlapX && overlapY) {
        boss.hp -= damage;
        boss.hitCd = SKILL1_EFFECT_CONFIG.hitCooldown;
        const bossHitX = Math.max(boss.x, Math.min(boss.x + boss.w, eff.x));
        const bossHitY = boss.y + boss.h * 0.4;
        emitSlash(bossHitX, bossHitY, PLAYER_COMBAT.effects.skillBossSlashColor);
        emitHitBurst(bossHitX, bossHitY, PLAYER_COMBAT.effects.skillBossBurstColor, PLAYER_COMBAT.skillBossBurstPower);
        if (boss.hp <= 0) {
          p.score += PLAYER_COMBAT.bossKillScore;
          if (p.skillCharges < p.maxSkillCharges) {
            p.skillEnergy += PLAYER_COMBAT.bossEnergyGain;
            while (p.skillEnergy >= p.skillEnergyMax && p.skillCharges < p.maxSkillCharges) {
              p.skillEnergy -= p.skillEnergyMax;
              p.skillCharges += 1;
            }
            if (p.skillCharges >= p.maxSkillCharges) {
              p.skillCharges = p.maxSkillCharges;
              p.skillEnergy = p.skillEnergyMax;
            }
          }
          state.boss = null;
          state.bossSpawnTimer = PLAYER_COMBAT.skillChargeResetDelay;
        }
      }
    }

    // despawn when fully offscreen
    const offLeft = eff.facing === -1 && effRight < 0;
    const offRight2 = eff.facing === 1 && effLeft > WIDTH;
    if (offLeft || offRight2) state.skill1Effects.splice(i, 1);
  }
}

export function updateSkill2Effects() {
  const sheet = SKILL2_EFFECT_SHEET;
  const drawW = sheet.frameW * SKILL2_EFFECT_CONFIG.drawScale;
  const drawH = sheet.frameH * SKILL2_EFFECT_CONFIG.drawScale;
  const p = state.player;
  const damage = (p.baseAttack + p.attackBonus) * SKILL2_EFFECT_CONFIG.damageMultiplier;

  for (let i = state.skill2Effects.length - 1; i >= 0; i -= 1) {
    const eff = state.skill2Effects[i] as Skill2EffectState;
    eff.x += eff.vx;
    eff.traveled += Math.abs(eff.vx);
    eff.elapsed += 1;

    const rawFrame = Math.floor(eff.elapsed / SKILL2_EFFECT_CONFIG.frameDuration);
    eff.frame = Math.min(sheet.count - 1, rawFrame);

    const effLeft = eff.x - drawW / 2;
    const effRight = eff.x + drawW / 2;
    const effTop = eff.y;
    const effBottom = eff.y + drawH;

    for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
      const enemy = state.enemies[j];
      if (enemy.hitCd > 0) continue;
      const overlapX = effRight > enemy.x && effLeft < enemy.x + enemy.w;
      const overlapY = effBottom > enemy.y && effTop < enemy.y + enemy.h;
      if (!overlapX || !overlapY) continue;
      const hitX = Math.max(enemy.x, Math.min(enemy.x + enemy.w, eff.x));
      const hitY = enemy.y + enemy.h * 0.4;
      enemy.hp -= damage;
      enemy.hitCd = SKILL2_EFFECT_CONFIG.hitCooldown;
      emitSlash(hitX, hitY, PLAYER_COMBAT.effects.skillEnemyBurstColor);
      emitHitBurst(hitX, hitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, PLAYER_COMBAT.skillEnemyBurstPower);
      if (enemy.hp <= 0) {
        p.score += PLAYER_COMBAT.enemyKillScore;
        if (p.skillCharges < p.maxSkillCharges) {
          p.skillEnergy += PLAYER_COMBAT.enemyEnergyGain;
          while (p.skillEnergy >= p.skillEnergyMax && p.skillCharges < p.maxSkillCharges) {
            p.skillEnergy -= p.skillEnergyMax;
            p.skillCharges += 1;
          }
          if (p.skillCharges >= p.maxSkillCharges) {
            p.skillCharges = p.maxSkillCharges;
            p.skillEnergy = p.skillEnergyMax;
          }
        }
        state.enemies.splice(j, 1);
      }
    }

    if (state.boss && state.boss.hitCd <= 0) {
      const boss = state.boss;
      const overlapX = effRight > boss.x && effLeft < boss.x + boss.w;
      const overlapY = effBottom > boss.y && effTop < boss.y + boss.h;
      if (overlapX && overlapY) {
        boss.hp -= damage;
        boss.hitCd = SKILL2_EFFECT_CONFIG.hitCooldown;
        const bossHitX = Math.max(boss.x, Math.min(boss.x + boss.w, eff.x));
        const bossHitY = boss.y + boss.h * 0.4;
        emitSlash(bossHitX, bossHitY, PLAYER_COMBAT.effects.skillBossSlashColor);
        emitHitBurst(bossHitX, bossHitY, PLAYER_COMBAT.effects.skillBossBurstColor, PLAYER_COMBAT.skillBossBurstPower);
        if (boss.hp <= 0) {
          p.score += PLAYER_COMBAT.bossKillScore;
          if (p.skillCharges < p.maxSkillCharges) {
            p.skillEnergy += PLAYER_COMBAT.bossEnergyGain;
            while (p.skillEnergy >= p.skillEnergyMax && p.skillCharges < p.maxSkillCharges) {
              p.skillEnergy -= p.skillEnergyMax;
              p.skillCharges += 1;
            }
            if (p.skillCharges >= p.maxSkillCharges) {
              p.skillCharges = p.maxSkillCharges;
              p.skillEnergy = p.skillEnergyMax;
            }
          }
          state.boss = null;
          state.bossSpawnTimer = PLAYER_COMBAT.skillChargeResetDelay;
        }
      }
    }

    if (eff.traveled >= SKILL2_EFFECT_CONFIG.maxTravel) state.skill2Effects.splice(i, 1);
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

export function drawSkill1Effects() {
  if (!ctx) return;
  const sheet = SKILL1_EFFECT_SHEET;
  if (!sheet.image) return;
  const drawH = sheet.frameH * SKILL1_EFFECT_CONFIG.drawScale;
  const drawW = sheet.frameW * SKILL1_EFFECT_CONFIG.drawScale;
  for (const e of state.skill1Effects) {
    const sx = e.frame * sheet.frameW;
    ctx.save();
    ctx.translate(e.x, e.y + drawH / 2);
    ctx.scale(e.facing, 1);
    ctx.drawImage(sheet.image, sx, 0, sheet.frameW, sheet.frameH, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }
}

export function drawSkill2Effects() {
  if (!ctx) return;
  const sheet = SKILL2_EFFECT_SHEET;
  if (!sheet.image) return;
  const drawH = sheet.frameH * SKILL2_EFFECT_CONFIG.drawScale;
  const drawW = sheet.frameW * SKILL2_EFFECT_CONFIG.drawScale;
  for (const e of state.skill2Effects) {
    const sx = e.frame * sheet.frameW;
    ctx.save();
    ctx.translate(e.x, e.y + drawH / 2);
    ctx.scale(e.facing, 1);
    ctx.drawImage(sheet.image, sx, 0, sheet.frameW, sheet.frameH, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }
}
