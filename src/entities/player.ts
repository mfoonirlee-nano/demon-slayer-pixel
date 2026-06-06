import { state } from "../state";
import {
  GRAVITY,
  GROUND_Y,
  WIDTH,
  BASIC_ATTACK,
  FALL_ATTACK,
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
  SKILL3_EFFECT_CONFIG,
  ULTIMATE_SKILL_SHEET,
  SKILL_FLASH,
  LANTERN_EMBER_CONFIG,
} from "../constants";
import { onGround, hitbox, frameIndex, nearestRectHitPoint, overlapHitPoint } from "../utils";
import { drawSheetFrame, drawSkillFrame } from "../graphics";
import { playTone } from "../audio";
import { ctx } from "../context";
import { recordEnemyCoverKill } from "../coverProgress";
import { emitSlash, emitHitBurst } from "./particle";
import { damageEnemy } from "./enemies/common";
import { bindingZonePlayerMoveScale } from "./enemies/binder";
import { defeatBoss } from "./bosses/defeat";
import { keys } from "../input";

const HALF_RATIO = 0.5;
const FULL_CIRCLE = Math.PI * 2;

const PLAYER_BINDING_SLOW_EFFECT = {
  filter: "sepia(0.38) saturate(1.55) hue-rotate(282deg) brightness(0.86)",
  pulseSpeed: 12,
  pulseBaseAlpha: 0.28,
  pulseAlphaScale: 0.18,
  ringColor: "#9b214f",
  strandColor: "#b8325a",
  accentColor: "#d7a857",
  ringYOffset: 10,
  ringWidthScale: 0.92,
  ringHeight: 7,
  strandTopRatio: 0.42,
  strandMidRatio: 0.64,
  strandBottomRatio: 0.82,
  strandInset: 5,
  strandSag: 8,
  controlLeadRatio: 0.24,
  controlTrailRatio: 0.76,
  lineWidth: 2,
  accentLineWidth: 1,
} as const;

function lanternAshZonePlayerMoveScale() {
  for (const zone of state.lanternEmberAshZones) {
    const footX = state.player.x + state.player.w / 2;
    const footY = state.player.y + state.player.h;
    const radiusY = zone.radius * LANTERN_EMBER_CONFIG.ashZoneVerticalRadiusScale;
    const dx = (footX - zone.x) / zone.radius;
    const dy = (footY - zone.y) / radiusY;
    if (dx * dx + dy * dy <= 1) return LANTERN_EMBER_CONFIG.ashZoneMoveScale;
  }

  return 1;
}

export function triggerAttack() {
  const p = state.player;
  if (
    p.attackTimer > 0
    || p.fallAttackTimer > 0
    || p.fallAttackRecoveryTimer > 0
    || p.skillTimer > 0
    || p.ultimateTimer > 0
  ) return;

  if (!onGround(p, p.onPlatform)) {
    p.fallAttackTimer = 1;
    p.vy = Math.max(p.vy, FALL_ATTACK.startVelocity);
    p.onPlatform = null;
    playTone(220, 0.08, "triangle", 0.055);
    return;
  }

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
  p.skillEnergy = Math.min(p.skillEnergyMax, p.skillEnergy + amount);
  syncSkillCharges();
}

export function gainUltimateEnergy(amount: number) {
  const p = state.player;
  p.ultimateEnergy = Math.min(p.ultimateEnergyMax, p.ultimateEnergy + amount);
}

function gainKillEnergy(skillAmount: number, ultimateAmount: number) {
  gainSkillEnergy(skillAmount);
  gainUltimateEnergy(ultimateAmount);
}

function syncSkillCharges() {
  const p = state.player;
  p.skillCharges = Math.min(
    p.maxSkillCharges,
    Math.floor(p.skillEnergy / PLAYER_COMBAT.skillCastEnergyCost),
  );
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
  if (p.ultimateTimer > 0) return;
  if (p.fallAttackTimer > 0 || p.fallAttackRecoveryTimer > 0) return;
  if (p.skillEnergy < PLAYER_COMBAT.skillCastEnergyCost) return;
  const skill = SKILLS[p.skillIndex] || SKILLS[0];
  p.skillEnergy = Math.max(0, p.skillEnergy - PLAYER_COMBAT.skillCastEnergyCost);
  syncSkillCharges();
  p.skillFlash = 0;
  p.skillTimer = Math.ceil(skill.frameCount * 60 / PLAYER_DRAW.skillAnimFps);
  p.skillEffectSpawned = skill.id !== SKILL_IDS.skill1 && skill.id !== SKILL_IDS.skill2;

  if (skill.id === SKILL_IDS.skill3) {
    state.skill3Effect = {
      elapsed: 0,
      frame: 0,
      hitsRemaining: SKILL3_EFFECT_CONFIG.maxHits,
      alpha: 1,
    };
  }

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
    damageEnemy(e, damage, PLAYER_COMBAT.enemyHitCooldown);
    const { x: skillHitX, y: skillHitY } = nearestRectHitPoint(e, cx, cy);
    emitSlash(skillHitX, skillHitY, skill.color, e.w);
    emitHitBurst(skillHitX, skillHitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, PLAYER_COMBAT.skillEnemyBurstPower);
    if (e.hp <= 0) {
      p.score += PLAYER_COMBAT.enemyKillScore;
      recordEnemyCoverKill();
      gainKillEnergy(PLAYER_COMBAT.enemyEnergyGain, PLAYER_COMBAT.enemyUltimateEnergyGain);
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
        const { x: bossHitX, y: bossHitY } = nearestRectHitPoint(boss, cx, cy);
        emitSlash(bossHitX, bossHitY, PLAYER_COMBAT.effects.skillBossSlashColor);
        emitHitBurst(bossHitX, bossHitY, PLAYER_COMBAT.effects.skillBossBurstColor, PLAYER_COMBAT.skillBossBurstPower);
        defeatBoss();
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

export function castUltimateSkill() {
  const p = state.player;
  if (
    p.ultimateTimer > 0
    || p.skillTimer > 0
    || p.attackTimer > 0
    || p.fallAttackTimer > 0
    || p.fallAttackRecoveryTimer > 0
  ) return;
  if (p.ultimateEnergy < p.ultimateEnergyMax) return;

  p.ultimateEnergy = 0;
  p.ultimateEffectSpawned = false;
  p.ultimateTimer = ULTIMATE_SKILL_SHEET.count * PLAYER_COMBAT.ultimateCastFrameDuration;
  p.skillFlash = SKILL_FLASH.maxFrames;

  playTone(220, 0.16, "sawtooth", 0.07);
  playTone(880, 0.14, "triangle", 0.06);
}

function triggerUltimateImpact() {
  const p = state.player;
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h - PLAYER_COMBAT.ultimateEffectYOffset;
  const radius = PLAYER_COMBAT.ultimateRadius;

  state.ultimateEffects.push({
    x: cx,
    y: cy,
    facing: p.facing,
    elapsed: 0,
    frame: 0,
    life: PLAYER_COMBAT.ultimateEffectLife,
    maxLife: PLAYER_COMBAT.ultimateEffectLife,
  });

  const damage = (p.baseAttack + p.attackBonus) * PLAYER_COMBAT.ultimateDamageMultiplier;

  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const e = state.enemies[i];
    const ex = e.x + e.w / 2;
    const ey = e.y + e.h / 2;
    if (Math.hypot(ex - cx, ey - cy) > radius) continue;
    damageEnemy(e, damage, PLAYER_COMBAT.enemyHitCooldown, "ultimate");
    emitSlash(ex, ey, PLAYER_COMBAT.effects.skillEnemyBurstColor, e.w * 1.5);
    emitHitBurst(ex, ey, PLAYER_COMBAT.effects.skillEnemyBurstColor, PLAYER_COMBAT.skillEnemyBurstPower + 1.2);
    if (e.hp <= 0) {
      p.score += PLAYER_COMBAT.enemyKillScore;
      recordEnemyCoverKill();
      gainKillEnergy(PLAYER_COMBAT.enemyEnergyGain, PLAYER_COMBAT.enemyUltimateEnergyGain);
      state.enemies.splice(i, 1);
    }
  }

  if (state.boss) {
    const boss = state.boss;
    const bx = boss.x + boss.w / 2;
    const by = boss.y + boss.h / 2;
    if (Math.hypot(bx - cx, by - cy) <= radius + PLAYER_COMBAT.bossRadiusPadding) {
      boss.hp -= damage;
      boss.hitCd = PLAYER_COMBAT.bossHitCooldown;
      emitSlash(bx, by, PLAYER_COMBAT.effects.bossKillSlashColor, boss.w);
      emitHitBurst(bx, by, PLAYER_COMBAT.effects.skillBossBurstColor, PLAYER_COMBAT.skillBossBurstPower + 1.4);
      defeatBoss();
    }
  }
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

function fallAttackBox() {
  const p = state.player;
  return {
    x: p.x + p.w / 2 - FALL_ATTACK.radius,
    y: p.y + p.h - FALL_ATTACK.height,
    w: FALL_ATTACK.radius * 2,
    h: FALL_ATTACK.height,
    damage: getPlayerAttackDamage() * FALL_ATTACK.damageMultiplier,
    color: FALL_ATTACK.color,
  };
}

function triggerFallAttackImpact() {
  const p = state.player;
  const box = fallAttackBox();
  const cx = p.x + p.w / 2;
  const impactY = p.y + p.h;

  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const e = state.enemies[i];
    if (!hitbox(box, e) || e.hitCd > 0) continue;
    const { x: hitX, y: hitY } = overlapHitPoint(box, e);
    damageEnemy(e, box.damage, FALL_ATTACK.enemyHitCooldown);
    emitSlash(hitX, hitY, box.color, e.w * 1.25);
    emitHitBurst(hitX, hitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, FALL_ATTACK.impactBurstPower);
    if (e.hp <= 0) {
      p.score += PLAYER_COMBAT.attackKillScore;
      recordEnemyCoverKill();
      gainKillEnergy(PLAYER_COMBAT.enemyEnergyGain, PLAYER_COMBAT.enemyUltimateEnergyGain);
      state.enemies.splice(i, 1);
    }
  }

  if (state.boss && hitbox(box, state.boss) && state.boss.hitCd <= 0) {
    const boss = state.boss;
    const { x: bossHitX, y: bossHitY } = overlapHitPoint(box, boss);
    boss.hp -= getPlayerAttackDamage() * FALL_ATTACK.bossDamageMultiplier;
    boss.hitCd = FALL_ATTACK.bossHitCooldown;
    emitSlash(bossHitX, bossHitY, box.color, boss.w * 0.9);
    emitHitBurst(bossHitX, bossHitY, PLAYER_COMBAT.effects.skillBossBurstColor, FALL_ATTACK.impactBurstPower + 0.6);
    if (boss.hp <= 0) {
      emitSlash(boss.x + boss.w / 2, boss.y + PLAYER_COMBAT.bossHitY, PLAYER_COMBAT.effects.bossKillSlashColor);
      defeatBoss();
    }
  }

  emitSlash(cx, impactY - 8, box.color, FALL_ATTACK.radius * 0.8);
  emitHitBurst(cx, impactY - 6, box.color, FALL_ATTACK.impactBurstPower + 0.4);
  p.invincible = Math.max(p.invincible, FALL_ATTACK.landingInvincibleFrames);
  playTone(150, 0.08, "sawtooth", 0.06);
  playTone(520, 0.06, "triangle", 0.045);
}

export function hurtPlayer(damage: number, sourceVx: number) {
  const p = state.player;
  if (p.invincible > 0) return;

  if (state.skill3Effect) {
    state.skill3Effect.hitsRemaining -= 1;
    state.skill3Effect.alpha = state.skill3Effect.hitsRemaining / SKILL3_EFFECT_CONFIG.maxHits;
    p.invincible = PLAYER_COMBAT.hurtInvincibleFrames;

    const counterDamage = (p.baseAttack + p.attackBonus) * SKILL3_EFFECT_CONFIG.damageMultiplier;
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const e = state.enemies[i];
      if (!hitbox(p, e)) continue;
      damageEnemy(e, counterDamage);
      emitSlash(e.x + e.w / 2, e.y + e.h / 2, SKILLS[2].color, e.w);
      emitHitBurst(e.x + e.w / 2, e.y + e.h / 2, SKILLS[2].color, 1.5);
      if (e.hp <= 0) {
        p.score += PLAYER_COMBAT.enemyKillScore;
        recordEnemyCoverKill();
        gainKillEnergy(PLAYER_COMBAT.enemyEnergyGain, PLAYER_COMBAT.enemyUltimateEnergyGain);
        state.enemies.splice(i, 1);
      }
    }
    if (state.boss && hitbox(p, state.boss)) {
      state.boss.hp -= counterDamage;
      emitSlash(state.boss.x + state.boss.w / 2, state.boss.y + state.boss.h * 0.4, SKILLS[2].color);
      emitHitBurst(state.boss.x + state.boss.w / 2, state.boss.y + state.boss.h * 0.4, SKILLS[2].color, 2);
      defeatBoss();
    }

    playTone(440, 0.08, "triangle", 0.15);
    if (state.skill3Effect.hitsRemaining <= 0) {
      state.skill3Effect = null;
    }
    return;
  }

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
  const moveScale = Math.min(bindingZonePlayerMoveScale(), lanternAshZonePlayerMoveScale());
  if (keys.has("a")) {
    p.vx = -p.speed * moveScale;
    if (p.skillTimer <= 0 && p.ultimateTimer <= 0) p.facing = -1;
  } else if (keys.has("d")) {
    p.vx = p.speed * moveScale;
    if (p.skillTimer <= 0 && p.ultimateTimer <= 0) p.facing = 1;
  } else {
    p.vx *= PLAYER_COMBAT.groundDrag;
  }

  p.vy += GRAVITY;
  if (p.fallAttackTimer > 0) {
    p.fallAttackTimer += 1;
    p.vx *= FALL_ATTACK.horizontalDrag;
    p.vy = Math.min(Math.max(p.vy, FALL_ATTACK.diveVelocity), FALL_ATTACK.maxVelocity);
  }
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
    landed = true;
  }

  if (landed && p.fallAttackTimer > 0) {
    triggerFallAttackImpact();
    p.fallAttackTimer = 0;
    p.fallAttackRecoveryTimer = FALL_ATTACK.recoveryFrames;
  }

  if (p.fallAttackRecoveryTimer > 0) {
    p.fallAttackRecoveryTimer -= 1;
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

  if (p.ultimateTimer > 0) {
    p.ultimateTimer -= 1;
    const total = ULTIMATE_SKILL_SHEET.count * PLAYER_COMBAT.ultimateCastFrameDuration;
    const impactFrame = Math.floor(total * PLAYER_COMBAT.ultimateEffectSpawnRatio);
    if (!p.ultimateEffectSpawned && total - p.ultimateTimer >= impactFrame) {
      p.ultimateEffectSpawned = true;
      triggerUltimateImpact();
    }
  }

  if (p.attackTimer > 0) {
    p.attackTimer -= 1;
    const box = attackBox();

    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const e = state.enemies[i];
      if (hitbox(box, e) && e.hitCd <= 0) {
        const { x: atkHitX, y: atkHitY } = overlapHitPoint(box, e);
        damageEnemy(e, box.damage, PLAYER_COMBAT.attackEnemyHitCooldown);
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
          recordEnemyCoverKill();
          gainKillEnergy(PLAYER_COMBAT.enemyEnergyGain, PLAYER_COMBAT.enemyUltimateEnergyGain);
          emitSlash(e.x + Math.random() * e.w, e.y + Math.random() * e.h, PLAYER_COMBAT.effects.attackKillSlashColor, e.w);
          state.enemies.splice(i, 1);
        }
      }
    }

    if (state.boss && hitbox(box, state.boss) && state.boss.hitCd <= 0) {
      const boss = state.boss;
      boss.hp -= box.damage;
      boss.hitCd = PLAYER_COMBAT.attackBossHitCooldown;
      const { x: bossHitX, y: bossHitY } = overlapHitPoint(box, boss);
      emitSlash(bossHitX, bossHitY, box.color);
      emitHitBurst(
        bossHitX,
        bossHitY,
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
        emitSlash(boss.x + boss.w / 2, boss.y + PLAYER_COMBAT.bossHitY, PLAYER_COMBAT.effects.bossKillSlashColor);
        defeatBoss();
      }
    }
  }

  if (p.invincible > 0) p.invincible -= 1;
}

function drawWithBindingSlowFilter(isSlowed: boolean, draw: () => void) {
  if (!isSlowed || !ctx) {
    draw();
    return;
  }

  ctx.save();
  ctx.filter = PLAYER_BINDING_SLOW_EFFECT.filter;
  draw();
  ctx.restore();
}

function drawBindingSlowEffect() {
  if (!ctx) return;

  const p = state.player;
  const pulseWave = Math.sin(state.elapsed * PLAYER_BINDING_SLOW_EFFECT.pulseSpeed) * HALF_RATIO + HALF_RATIO;
  const alpha = PLAYER_BINDING_SLOW_EFFECT.pulseBaseAlpha
    + pulseWave * PLAYER_BINDING_SLOW_EFFECT.pulseAlphaScale;
  const centerX = p.x + p.w * HALF_RATIO;
  const footY = p.y + p.h - PLAYER_BINDING_SLOW_EFFECT.ringYOffset;
  const leftX = p.x + PLAYER_BINDING_SLOW_EFFECT.strandInset;
  const rightX = p.x + p.w - PLAYER_BINDING_SLOW_EFFECT.strandInset;
  const leadX = p.x + p.w * PLAYER_BINDING_SLOW_EFFECT.controlLeadRatio;
  const trailX = p.x + p.w * PLAYER_BINDING_SLOW_EFFECT.controlTrailRatio;
  const topY = p.y + p.h * PLAYER_BINDING_SLOW_EFFECT.strandTopRatio;
  const midY = p.y + p.h * PLAYER_BINDING_SLOW_EFFECT.strandMidRatio;
  const bottomY = p.y + p.h * PLAYER_BINDING_SLOW_EFFECT.strandBottomRatio;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = PLAYER_BINDING_SLOW_EFFECT.ringColor;
  ctx.lineWidth = PLAYER_BINDING_SLOW_EFFECT.lineWidth;
  ctx.beginPath();
  ctx.ellipse(
    centerX,
    footY,
    p.w * PLAYER_BINDING_SLOW_EFFECT.ringWidthScale,
    PLAYER_BINDING_SLOW_EFFECT.ringHeight,
    0,
    0,
    FULL_CIRCLE,
  );
  ctx.stroke();

  ctx.strokeStyle = PLAYER_BINDING_SLOW_EFFECT.strandColor;
  ctx.beginPath();
  ctx.moveTo(leftX, topY);
  ctx.bezierCurveTo(
    leadX,
    topY + PLAYER_BINDING_SLOW_EFFECT.strandSag,
    trailX,
    midY - PLAYER_BINDING_SLOW_EFFECT.strandSag,
    rightX,
    midY,
  );
  ctx.moveTo(rightX, midY);
  ctx.bezierCurveTo(
    trailX,
    midY + PLAYER_BINDING_SLOW_EFFECT.strandSag,
    leadX,
    bottomY - PLAYER_BINDING_SLOW_EFFECT.strandSag,
    leftX,
    bottomY,
  );
  ctx.stroke();

  ctx.globalAlpha = alpha * PLAYER_BINDING_SLOW_EFFECT.pulseAlphaScale;
  ctx.strokeStyle = PLAYER_BINDING_SLOW_EFFECT.accentColor;
  ctx.lineWidth = PLAYER_BINDING_SLOW_EFFECT.accentLineWidth;
  ctx.beginPath();
  ctx.moveTo(centerX, topY);
  ctx.lineTo(centerX, bottomY);
  ctx.stroke();
  ctx.restore();
}

export function drawPlayer() {
  const p = state.player;
  if (p.invincible > 0 && Math.floor(p.invincible / PLAYER_COMBAT.blinkInterval) % 2 === 0) return;
  const isBindingSlowed = Math.min(bindingZonePlayerMoveScale(), lanternAshZonePlayerMoveScale()) < 1;

  // Unified reference point: player center X, feet Y minus global sprite padding.
  // All draw positions: drawX = refX - drawW * anchorX, drawY = refY - drawH * anchorY
  const refX = p.x + p.w / 2;
  const refY = p.y + p.h - PLAYER_DRAW.yOffset;

  if (p.ultimateTimer > 0 && ULTIMATE_SKILL_SHEET.image) {
    const total = ULTIMATE_SKILL_SHEET.count * PLAYER_COMBAT.ultimateCastFrameDuration;
    const elapsedGameFrames = total - p.ultimateTimer;
    const frame = Math.min(
      ULTIMATE_SKILL_SHEET.count - 1,
      Math.floor(elapsedGameFrames / PLAYER_COMBAT.ultimateCastFrameDuration),
    );
    const drawH = ULTIMATE_SKILL_SHEET.frameH * PLAYER_COMBAT.ultimateDrawScale;
    const drawW = ULTIMATE_SKILL_SHEET.frameW * PLAYER_COMBAT.ultimateDrawScale;
    drawWithBindingSlowFilter(isBindingSlowed, () => {
      drawSheetFrame(
        ULTIMATE_SKILL_SHEET,
        frame,
        refX - drawW / 2,
        refY - drawH * 0.83,
        drawW,
        drawH,
        p.facing,
      );
    });
    if (isBindingSlowed) drawBindingSlowEffect();
    return;
  }

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
      drawWithBindingSlowFilter(isBindingSlowed, () => {
        drawSkillFrame(skill, frame, refX - drawW * effectiveAnchorX, refY - drawH * anchorY, drawW, drawH, p.facing);
      });
      if (isBindingSlowed) drawBindingSlowEffect();
      return;
    }
  }

  const isLanded = onGround(p, p.onPlatform);
  const stateName = p.fallAttackTimer > 0 || p.fallAttackRecoveryTimer > 0
    ? PLAYER_ANIMATION_STATES.fallAttack
    : p.skillTimer > 0 || p.attackTimer > 0
    ? PLAYER_ANIMATION_STATES.attack
    : !isLanded
      ? PLAYER_ANIMATION_STATES.jump
      : Math.abs(p.vx) > PLAYER_COMBAT.movementIdleThreshold
        ? PLAYER_ANIMATION_STATES.run
        : PLAYER_ANIMATION_STATES.idle;

  const sheet = PLAYER_SHEETS[stateName];
  const { drawW, drawH, animSpeed, anchorX = 0.5, anchorY = 1, flipX } = sheet;
  let frame = frameIndex(sheet.count, animSpeed, state.elapsed);
  if (stateName === PLAYER_ANIMATION_STATES.fallAttack) {
    const airFrameCount = 5;
    const recoveryFrameCount = sheet.count - airFrameCount;
    if (p.fallAttackTimer > 0) {
      frame = Math.min(airFrameCount - 1, Math.floor(Math.max(0, p.fallAttackTimer - 1) / animSpeed));
    } else {
      const elapsedRecovery = FALL_ATTACK.recoveryFrames - p.fallAttackRecoveryTimer;
      frame = airFrameCount + Math.min(
        recoveryFrameCount - 1,
        Math.floor(Math.max(0, elapsedRecovery) * recoveryFrameCount / FALL_ATTACK.recoveryFrames),
      );
    }
  } else if (stateName === PLAYER_ANIMATION_STATES.attack && p.attackTimer > 0) {
    const elapsedAttack = BASIC_ATTACK.frames - p.attackTimer;
    frame = Math.min(
      sheet.count - 1,
      Math.floor(Math.max(0, elapsedAttack) * sheet.count / BASIC_ATTACK.frames),
    );
  }
  drawWithBindingSlowFilter(isBindingSlowed, () => {
    drawSheetFrame(sheet, frame, refX - drawW * anchorX, refY - drawH * anchorY, drawW, drawH, p.facing * (flipX ? -1 : 1));
  });
  if (isBindingSlowed) drawBindingSlowEffect();
}
