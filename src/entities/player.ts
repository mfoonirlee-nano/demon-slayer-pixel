import { state } from "../state";
import {
  GRAVITY,
  GROUND_Y,
  WIDTH,
  BASIC_ATTACK,
  SKILLS,
  SKILL_IDS,
  PLAYER_SHEETS,
  PLAYER_ANIMATION_STATES,
  PLAYER_COMBAT,
  PLAYER_DRAW,
  SKILL1_EFFECT_SHEET,
  SKILL1_EFFECT_CONFIG,
  SKILL2_EFFECT_SHEET,
  SKILL2_EFFECT_CONFIG,
} from "../constants";
import { onGround, hitbox, frameIndex } from "../utils";
import { drawSheetFrame, drawSkillFrame } from "../graphics";
import { playTone } from "../audio";
import { emitSlash, emitHitBurst } from "./particle";
import { keys } from "../input";

export function triggerAttack() {
  if (state.player.attackTimer > 0 || state.player.skillTimer > 0) return;
  state.player.attackTimer = BASIC_ATTACK.frames;
  playTone(
    PLAYER_COMBAT.tones.attackStart.frequency,
    PLAYER_COMBAT.tones.attackStart.duration,
    "triangle",
    PLAYER_COMBAT.tones.attackStart.volume,
  );
}

export function getPlayerAttackDamage() {
  return state.player.baseAttack + state.player.attackBonus;
}

export function gainSkillEnergy(amount: number) {
  const p = state.player;
  if (p.skillCharges >= p.maxSkillCharges) {
    p.skillEnergy = p.skillEnergyMax;
    return;
  }
  p.skillEnergy += amount;
  while (p.skillEnergy >= p.skillEnergyMax && p.skillCharges < p.maxSkillCharges) {
    p.skillEnergy -= p.skillEnergyMax;
    p.skillCharges += 1;
  }
  if (p.skillCharges >= p.maxSkillCharges) {
    p.skillCharges = p.maxSkillCharges;
    p.skillEnergy = p.skillEnergyMax;
  }
}

export function healPlayer(amount: number) {
  const p = state.player;
  p.hp = Math.min(p.maxHp, p.hp + amount);
}

export function selectSkill(index: number) {
  state.player.skillIndex = Math.max(0, Math.min(SKILLS.length - 1, index));
}

export function castSelectedSkill() {
  const p = state.player;
  if (p.skillCharges <= 0) return;
  const skill = SKILLS[p.skillIndex] || SKILLS[0];
  p.skillCharges -= 1;
  if (p.skillCharges < p.maxSkillCharges) {
    p.skillEnergy = Math.min(p.skillEnergy, PLAYER_COMBAT.skillEnergySpendClamp);
  }
  p.skillFlash = 0;
  p.skillTimer = Math.ceil(skill.frameCount * 60 / PLAYER_DRAW.skillAnimFps);
  p.skillEffectSpawned = skill.id !== SKILL_IDS.skill1 && skill.id !== SKILL_IDS.skill2;

  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  const radius = skill.radius;
  const frameCount = Math.max(1, skill.frameCount);

  state.skillBursts.push({
    x: cx,
    y: cy + PLAYER_COMBAT.skillBurstYOffset,
    life: PLAYER_COMBAT.skillBurstLife,
    maxLife: PLAYER_COMBAT.skillBurstLife,
    frame: 0,
    frameCount,
    skillIndex: p.skillIndex,
    scaleIn: PLAYER_COMBAT.skillScaleIn,
    scaleOut: PLAYER_COMBAT.skillScaleOut,
    color: skill.color,
  });

  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const e = state.enemies[i];
    const ex = e.x + e.w / 2;
    const ey = e.y + e.h / 2;
    if ((ex - cx) * p.facing < 0) continue;
    const dist = Math.hypot(ex - cx, ey - cy);
    if (dist > radius) continue;
    const ratio = 1 - dist / radius;
    const damage = (skill.enemyBase + ratio * skill.enemyScale) * (1 + p.attackBonus * PLAYER_COMBAT.attackBonusScale);
    e.hp -= damage;
    e.hitCd = PLAYER_COMBAT.enemyHitCooldown;
    const skillHitX = e.x + Math.random() * e.w;
    const skillHitY = e.y + Math.random() * e.h;
    emitSlash(skillHitX, skillHitY, skill.color, e.w);
    emitHitBurst(skillHitX, skillHitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, PLAYER_COMBAT.skillEnemyBurstPower);
    if (e.hp <= 0) {
      p.score += PLAYER_COMBAT.enemyKillScore;
      gainSkillEnergy(PLAYER_COMBAT.enemyEnergyGain);
      state.enemies.splice(i, 1);
    }
  }

  if (state.boss) {
    const boss = state.boss;
    const bx = boss.x + boss.w / 2;
    const by = boss.y + boss.h / 2;
    if ((bx - cx) * p.facing >= 0) {
      const dist = Math.hypot(bx - cx, by - cy);
      if (dist <= radius + PLAYER_COMBAT.bossRadiusPadding) {
        const ratio = Math.max(PLAYER_COMBAT.bossMinDamageRatio, 1 - dist / (radius + PLAYER_COMBAT.bossRadiusPadding));
        boss.hp -= skill.bossBase * ratio;
        boss.hitCd = PLAYER_COMBAT.bossHitCooldown;
        emitSlash(bx, by, PLAYER_COMBAT.effects.skillBossSlashColor);
        emitHitBurst(bx, by, PLAYER_COMBAT.effects.skillBossBurstColor, PLAYER_COMBAT.skillBossBurstPower);
        if (boss.hp <= 0) {
          p.score += PLAYER_COMBAT.bossKillScore;
          gainSkillEnergy(PLAYER_COMBAT.bossEnergyGain);
          state.boss = null;
          state.bossSpawnTimer = PLAYER_COMBAT.skillChargeResetDelay;
        }
      }
    }
  }

  playTone(
    PLAYER_COMBAT.tones.skillCastPrimary.frequency,
    PLAYER_COMBAT.tones.skillCastPrimary.duration,
    "triangle",
    PLAYER_COMBAT.tones.skillCastPrimary.volume,
  );
  playTone(
    PLAYER_COMBAT.tones.skillCastSecondary.frequency,
    PLAYER_COMBAT.tones.skillCastSecondary.duration,
    "sawtooth",
    PLAYER_COMBAT.tones.skillCastSecondary.volume,
  );
}

export function attackBox() {
  const p = state.player;
  const reach = BASIC_ATTACK.reach;
  return {
    x: p.facing === 1 ? p.x + p.w : p.x - reach,
    y: p.y + BASIC_ATTACK.yOffset,
    w: reach,
    h: BASIC_ATTACK.height,
    damage: getPlayerAttackDamage(),
    color: BASIC_ATTACK.color,
  };
}

export function hurtPlayer(damage: number, sourceVx: number) {
  const p = state.player;
  if (p.invincible > 0) return;
  p.hp = Math.max(0, p.hp - damage);
  p.invincible = PLAYER_COMBAT.hurtInvincibleFrames;
  p.vx = -Math.sign(sourceVx || 1) * PLAYER_COMBAT.hurtKnockbackX;
  p.vy = PLAYER_COMBAT.hurtKnockbackY;
  emitSlash(p.x + p.w / 2, p.y + PLAYER_COMBAT.attackKillY, PLAYER_COMBAT.effects.hurtSlashColor);
  playTone(
    PLAYER_COMBAT.tones.hurt.frequency,
    PLAYER_COMBAT.tones.hurt.duration,
    "square",
    PLAYER_COMBAT.tones.hurt.volume,
  );
  if (p.hp <= 0) {
    state.gameOver = true;
  }
}

export function tryJump() {
  const p = state.player;
  if (onGround(p, p.onPlatform)) {
    p.vy = -p.jump;
    playTone(
      PLAYER_COMBAT.tones.jump.frequency,
      PLAYER_COMBAT.tones.jump.duration,
      "triangle",
      PLAYER_COMBAT.tones.jump.volume,
    );
  }
}

export function updatePlayer() {
  const p = state.player;

  if (p.onPlatform && state.platforms.includes(p.onPlatform)) {
    p.x += p.onPlatform.vx;
  }
  if (keys.has("a")) {
    p.vx = -p.speed;
    if (p.skillTimer <= 0) p.facing = -1;
  } else if (keys.has("d")) {
    p.vx = p.speed;
    if (p.skillTimer <= 0) p.facing = 1;
  } else {
    p.vx *= PLAYER_COMBAT.groundDrag;
  }

  p.vy += GRAVITY;
  const prevBottom = p.y + p.h;
  p.x += p.vx;
  p.y += p.vy;
  p.x = Math.max(0, Math.min(WIDTH - p.w, p.x));
  p.onPlatform = null;

  let landed = false;
  if (p.vy >= 0) {
    for (const plt of state.platforms) {
      const overlapX = p.x + p.w > plt.x + PLAYER_COMBAT.platformEdgePadding
        && p.x < plt.x + plt.w - PLAYER_COMBAT.platformEdgePadding;
      if (!overlapX) continue;
      const nowBottom = p.y + p.h;
      if (prevBottom <= plt.y + PLAYER_COMBAT.platformLandingTolerance && nowBottom >= plt.y) {
        p.y = plt.y - p.h;
        p.vy = 0;
        p.onPlatform = plt;
        landed = true;
        break;
      }
    }
  }

  if (!landed && p.y + p.h >= GROUND_Y) {
    p.y = GROUND_Y - p.h;
    p.vy = 0;
  }

  if (p.skillTimer > 0) {
    p.skillTimer -= 1;
    const skill = SKILLS[p.skillIndex] || SKILLS[0];
    if (!p.skillEffectSpawned) {
      const total = Math.ceil(skill.frameCount * 60 / PLAYER_DRAW.skillAnimFps);
      const halfway = Math.floor(total / 2);
      if (p.skillTimer <= halfway) {
        p.skillEffectSpawned = true;
        const cx = p.x + p.w / 2;
        const feetY = p.y + p.h;
        if (skill.id === SKILL_IDS.skill1) {
          const effectH = SKILL1_EFFECT_SHEET.frameH * SKILL1_EFFECT_CONFIG.drawScale;
          const skillDrawH = skill.frameH * skill.drawScale;
          state.skill1Effects.push({
            x: cx,
            y: feetY - skillDrawH / 2 - effectH / 2,
            vx: p.facing * SKILL1_EFFECT_CONFIG.speed,
            facing: p.facing,
            frame: 0,
            elapsed: 0,
          });
        } else if (skill.id === SKILL_IDS.skill2) {
          const effectH = SKILL2_EFFECT_SHEET.frameH * SKILL2_EFFECT_CONFIG.drawScale;
          const skillDrawH = skill.frameH * skill.drawScale;
          state.skill2Effects.push({
            x: cx,
            y: feetY - skillDrawH / 2 - effectH / 2,
            vx: p.facing * SKILL2_EFFECT_CONFIG.speed,
            facing: p.facing,
            frame: 0,
            elapsed: 0,
            traveled: 0,
          });
        }
      }
    }
  }

  if (p.attackTimer > 0) {
    p.attackTimer -= 1;
    const box = attackBox();

    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const e = state.enemies[i];
      if (hitbox(box, e) && e.hitCd <= 0) {
        const atkHitX = e.x + Math.random() * e.w;
        const atkHitY = e.y + e.h * 0.2 + Math.random() * e.h * 0.6;
        e.hp -= box.damage;
        e.hitCd = PLAYER_COMBAT.attackEnemyHitCooldown;
        emitSlash(atkHitX, atkHitY, box.color, e.w);
        emitHitBurst(atkHitX, atkHitY, PLAYER_COMBAT.effects.attackEnemyBurstColor, PLAYER_COMBAT.attackEnemyBurstPower);
        playTone(
          PLAYER_COMBAT.tones.attackHit.baseFrequency + Math.random() * PLAYER_COMBAT.tones.attackHit.randomVariance,
          PLAYER_COMBAT.tones.attackHit.duration,
          "triangle",
          PLAYER_COMBAT.tones.attackHit.volume,
        );
        if (e.hp <= 0) {
          p.score += PLAYER_COMBAT.attackKillScore;
          gainSkillEnergy(PLAYER_COMBAT.enemyEnergyGain);
          emitSlash(e.x + Math.random() * e.w, e.y + Math.random() * e.h, PLAYER_COMBAT.effects.attackKillSlashColor, e.w);
          state.enemies.splice(i, 1);
        }
      }
    }

    if (state.boss && hitbox(box, state.boss) && state.boss.hitCd <= 0) {
      const boss = state.boss;
      boss.hp -= box.damage;
      boss.hitCd = PLAYER_COMBAT.attackBossHitCooldown;
      emitSlash(boss.x + boss.w * PLAYER_COMBAT.bossHitXRatio, boss.y + PLAYER_COMBAT.bossHitY, box.color);
      emitHitBurst(
        boss.x + boss.w * PLAYER_COMBAT.bossHitXRatio,
        boss.y + PLAYER_COMBAT.bossHitY,
        PLAYER_COMBAT.effects.attackBossBurstColor,
        PLAYER_COMBAT.attackBossBurstPower,
      );
      playTone(
        PLAYER_COMBAT.tones.bossHit.frequency,
        PLAYER_COMBAT.tones.bossHit.duration,
        "sawtooth",
        PLAYER_COMBAT.tones.bossHit.volume,
      );
      if (boss.hp <= 0) {
        p.score += PLAYER_COMBAT.bossKillScore;
        gainSkillEnergy(PLAYER_COMBAT.bossEnergyGain);
        emitSlash(boss.x + boss.w / 2, boss.y + PLAYER_COMBAT.bossHitY, PLAYER_COMBAT.effects.bossKillSlashColor);
        playTone(
          PLAYER_COMBAT.tones.bossKill.frequency,
          PLAYER_COMBAT.tones.bossKill.duration,
          "triangle",
          PLAYER_COMBAT.tones.bossKill.volume,
        );
        state.boss = null;
        state.bossSpawnTimer = PLAYER_COMBAT.skillChargeResetDelay;
      }
    }
  }

  if (p.invincible > 0) p.invincible -= 1;
}

export function drawPlayer() {
  const p = state.player;
  if (p.invincible > 0 && Math.floor(p.invincible / PLAYER_COMBAT.blinkInterval) % 2 === 0) return;

  // Unified reference point: player center X, feet Y minus global sprite padding.
  // All draw positions: drawX = refX - drawW * anchorX, drawY = refY - drawH * anchorY
  const refX = p.x + p.w / 2;
  const refY = p.y + p.h - PLAYER_DRAW.yOffset;

  if (p.skillTimer > 0) {
    const skill = SKILLS[p.skillIndex] || SKILLS[0];
    if (skill.image) {
      const total = Math.ceil(skill.frameCount * 60 / PLAYER_DRAW.skillAnimFps);
      const elapsedGameFrames = total - p.skillTimer;
      const frame = Math.min(skill.frameCount - 1, Math.floor(elapsedGameFrames * PLAYER_DRAW.skillAnimFps / 60));

      const srcH = skill.frameH || skill.image.height;
      const drawH = skill.drawScale ? srcH * skill.drawScale : PLAYER_DRAW.fallbackSkillDrawH;
      const drawW = drawH * (skill.frameW / srcH);

      const anchorX = skill.anchorX ?? 0.5;
      const anchorY = skill.anchorY ?? 1;
      // When facing left, the sprite is mirrored, so the horizontal anchor mirrors too.
      const effectiveAnchorX = p.facing === 1 ? anchorX : (1 - anchorX);
      drawSkillFrame(skill, frame, refX - drawW * effectiveAnchorX, refY - drawH * anchorY, drawW, drawH, p.facing);
      return;
    }
  }

  const isLanded = onGround(p, p.onPlatform);
  const stateName = p.skillTimer > 0 || p.attackTimer > 0
    ? PLAYER_ANIMATION_STATES.attack
    : !isLanded
      ? PLAYER_ANIMATION_STATES.jump
      : Math.abs(p.vx) > PLAYER_COMBAT.movementIdleThreshold
        ? PLAYER_ANIMATION_STATES.run
        : PLAYER_ANIMATION_STATES.idle;

  const sheet = PLAYER_SHEETS[stateName];
  const { drawW, drawH, animSpeed, anchorX = 0.5, anchorY = 1, flipX } = sheet;
  const frame = frameIndex(sheet.count, animSpeed, state.elapsed);
  drawSheetFrame(sheet, frame, refX - drawW * anchorX, refY - drawH * anchorY, drawW, drawH, p.facing * (flipX ? -1 : 1));
}
