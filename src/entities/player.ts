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
import { playSfx } from "../audio";
import { ctx } from "../context";
import {
  emitSlash,
  emitHitBurst,
  damageDashRepositionTravel,
  finishDashRepositionSkill,
  spawnPlayerSkillEffect,
} from "./particle";
import { damageEnemy } from "./enemies/common";
import { resolveEnemyDefeat } from "./enemies/defeat";
import { damageBoss } from "./bosses/common";
import { bindingZonePlayerMoveScale } from "./enemies/binder";
import { defeatBoss } from "./bosses/defeat";
import { keys } from "../input";
import { hasDebugInfiniteSkillCharge } from "../debug";
import {
  applySkillCastEquipmentEffects,
  applySkillHitEquipmentRefund,
  consumeSkillCastEquipmentDamageMultiplier,
  equipmentMoveSpeedMultiplier,
  recordBasicAttackHit,
  tickEquipmentEffects,
} from "../systems/equipment";
import { selectedSkill, selectSkillSlot } from "../systems/loadout";
import { moonTideUltimateConfig, skillDamageMultiplier } from "../systems/progression";
import { isGenericPlayerSkillId } from "../systems/playerSkills";

const HALF_RATIO = 0.5;
const FULL_CIRCLE = Math.PI * 2;
const DASH_REPOSITION_INVINCIBLE_REFRESH_FRAMES = 2;

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

function moonTideActive() {
  return state.player.ultimateTimer > 0;
}

function currentMoonTideConfig() {
  return moonTideUltimateConfig(state.player.ultimateLevel);
}

function moonTideMoveSpeedMultiplier() {
  return moonTideActive() ? currentMoonTideConfig().moveSpeedMultiplier : 1;
}

function moonTideJumpMultiplier() {
  return moonTideActive() ? currentMoonTideConfig().jumpMultiplier : 1;
}

function moonTideAttackFrames() {
  if (!moonTideActive()) return BASIC_ATTACK.frames;
  return Math.max(1, Math.round(BASIC_ATTACK.frames * currentMoonTideConfig().attackFrameMultiplier));
}

function moonTideBasicDamageMultiplier() {
  return moonTideActive() ? currentMoonTideConfig().damageMultiplier : 1;
}

function spawnMoonTideTrail() {
  const p = state.player;
  if (!moonTideActive()) return;
  if (Math.abs(p.vx) <= PLAYER_COMBAT.movementIdleThreshold) return;
  if (p.ultimateTimer % PLAYER_COMBAT.ultimateTrailSpawnInterval !== 0) return;

  const life = PLAYER_COMBAT.ultimateTrailLife;
  state.ultimateTrails.push({
    x: p.x + p.w / 2 - Math.sign(p.vx || p.facing) * 16,
    y: p.y + p.h - 14,
    facing: Math.sign(p.vx || p.facing),
    life,
    maxLife: life,
    width: 34 + Math.min(26, Math.abs(p.vx) * 5),
    height: 7,
    phase: Math.random() * FULL_CIRCLE,
  });
}

function triggerMoonTideAfterimageHit(
  hitX: number,
  hitY: number,
  targetSpread: number,
  applyDamage: (damage: number) => void,
) {
  if (!moonTideActive()) return false;

  const config = currentMoonTideConfig();
  if (Math.random() > config.afterimageChance) return false;

  const p = state.player;
  const damage = getPlayerAttackDamage() * config.afterimageDamageMultiplier;
  applyDamage(damage);

  const life = PLAYER_COMBAT.ultimateAfterimageLife;
  const slashW = Math.max(48, Math.min(92, targetSpread * 0.95));
  const slashH = Math.max(18, Math.min(34, targetSpread * 0.35));
  for (let i = 0; i < config.afterimageCount; i += 1) {
    state.ultimateAfterimageSlashes.push({
      x: hitX + p.facing * (10 + i * 12),
      y: hitY - 8 + (Math.random() - 0.5) * 10,
      w: slashW,
      h: slashH,
      facing: p.facing,
      life,
      maxLife: life,
      power: config.afterimageBurstPower,
    });
  }

  emitHitBurst(hitX, hitY, PLAYER_COMBAT.effects.attackEnemyBurstColor, config.afterimageBurstPower);
  return true;
}

export function triggerAttack() {
  const p = state.player;
  if (
    p.attackTimer > 0
    || p.fallAttackTimer > 0
    || p.fallAttackRecoveryTimer > 0
    || p.skillTimer > 0
    || p.ultimateCastTimer > 0
  ) return;

  if (!onGround(p, p.onPlatform)) {
    p.fallAttackTimer = 1;
    p.vy = Math.max(p.vy, FALL_ATTACK.startVelocity);
    p.onPlatform = null;
    playSfx("playerFallAttackStart");
    return;
  }

  const frames = moonTideAttackFrames();
  state.player.attackDuration = frames;
  state.player.attackTimer = frames;
  playSfx("playerAttackStart");
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
  if (p.ultimateTimer > 0 || p.ultimateCastTimer > 0) return;
  p.ultimateEnergy = Math.min(p.ultimateEnergyMax, p.ultimateEnergy + amount);
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
  selectSkillSlot(state, index);
}

export function castSelectedSkill() {
  const p = state.player;
  if (p.ultimateCastTimer > 0) return;
  if (p.skillTimer > 0) return;
  if (p.fallAttackTimer > 0 || p.fallAttackRecoveryTimer > 0) return;
  const skill = selectedSkill(state);
  if (!skill) return;
  const energyCost = skill.energyCost ?? PLAYER_COMBAT.skillCastEnergyCost;
  const infiniteSkillCharge = hasDebugInfiniteSkillCharge();
  if (infiniteSkillCharge) {
    p.skillEnergy = p.skillEnergyMax;
    syncSkillCharges();
  } else if (p.skillEnergy < energyCost) {
    return;
  }
  const castDamageMultiplier = skillDamageMultiplier(state, skill.id)
    * consumeSkillCastEquipmentDamageMultiplier(state);
  if (!infiniteSkillCharge) {
    p.skillEnergy = Math.max(0, p.skillEnergy - energyCost);
    syncSkillCharges();
  }
  p.skillFlash = 0;
  p.skillTimer = Math.ceil(skill.frameCount * 60 / PLAYER_DRAW.skillAnimFps);
  p.skillEffectSpawned = !(
    skill.id === SKILL_IDS.skill1
    || skill.id === SKILL_IDS.skill2
    || isGenericPlayerSkillId(skill.id)
  );
  p.skillCastDamageMultiplier = castDamageMultiplier;
  applySkillCastEquipmentEffects(state);

  if (skill.id === SKILL_IDS.skill3) {
    state.skill3Effect = {
      elapsed: 0,
      frame: 0,
      hitsRemaining: SKILL3_EFFECT_CONFIG.maxHits,
      damageMultiplier: castDamageMultiplier,
      barrierFlash: 0,
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
    skillId: skill.id,
    scaleIn: PLAYER_COMBAT.skillScaleIn,
    scaleOut: PLAYER_COMBAT.skillScaleOut,
    color: skill.color,
  });

  if (!isGenericPlayerSkillId(skill.id)) {
    let hitTargets = 0;
    let bossHit = false;
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const e = state.enemies[i];
      const ex = e.x + e.w / 2;
      const ey = e.y + e.h / 2;
      if ((ex - cx) * p.facing < 0) continue;
      const dist = Math.hypot(ex - cx, ey - cy);
      if (dist > radius) continue;
      const ratio = 1 - dist / radius;
      const damage = (skill.enemyBase + ratio * skill.enemyScale)
        * (1 + p.attackBonus * PLAYER_COMBAT.attackBonusScale)
        * castDamageMultiplier;
      damageEnemy(e, damage, PLAYER_COMBAT.enemyHitCooldown);
      hitTargets += 1;
      const { x: skillHitX, y: skillHitY } = nearestRectHitPoint(e, cx, cy);
      emitSlash(skillHitX, skillHitY, skill.color, e.w);
      emitHitBurst(skillHitX, skillHitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, PLAYER_COMBAT.skillEnemyBurstPower);
      resolveEnemyDefeat(e, i, "enemy");
    }

    if (state.boss) {
      const boss = state.boss;
      const bx = boss.x + boss.w / 2;
      const by = boss.y + boss.h / 2;
      if ((bx - cx) * p.facing >= 0) {
        const dist = Math.hypot(bx - cx, by - cy);
        if (dist <= radius + PLAYER_COMBAT.bossRadiusPadding) {
          const ratio = Math.max(PLAYER_COMBAT.bossMinDamageRatio, 1 - dist / (radius + PLAYER_COMBAT.bossRadiusPadding));
          damageBoss(boss, skill.bossBase * ratio * castDamageMultiplier, PLAYER_COMBAT.bossHitCooldown);
          bossHit = true;
          const { x: bossHitX, y: bossHitY } = nearestRectHitPoint(boss, cx, cy);
          emitSlash(bossHitX, bossHitY, PLAYER_COMBAT.effects.skillBossSlashColor);
          emitHitBurst(bossHitX, bossHitY, PLAYER_COMBAT.effects.skillBossBurstColor, PLAYER_COMBAT.skillBossBurstPower);
          defeatBoss();
        }
      }
    }

    applySkillHitEquipmentRefund(state, hitTargets, bossHit);
  }

  playSfx("playerSkillCast");
}

export function castUltimateSkill() {
  const p = state.player;
  if (
    state.gameOver
    || p.ultimateCastTimer > 0
    || p.ultimateTimer > 0
    || p.skillTimer > 0
    || p.fallAttackTimer > 0
    || p.fallAttackRecoveryTimer > 0
  ) return;
  if (p.ultimateEnergy < p.ultimateEnergyMax) return;

  p.ultimateEnergy = 0;
  p.attackTimer = 0;
  p.ultimateEffectSpawned = false;
  p.ultimateCastTimer = PLAYER_COMBAT.ultimateCastFrames;
  p.skillFlash = SKILL_FLASH.maxFrames;
  p.invincible = Math.max(p.invincible, PLAYER_COMBAT.ultimateStartupInvincibleFrames);

  playSfx("playerUltimateCast");
}

function triggerUltimateOpeningEffect() {
  const p = state.player;
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h - PLAYER_COMBAT.ultimateEffectYOffset;
  const life = Math.max(PLAYER_COMBAT.ultimateEffectLife, currentMoonTideConfig().durationFrames);

  playSfx("playerUltimateImpact");

  state.ultimateEffects.push({
    x: cx,
    y: cy,
    facing: p.facing,
    elapsed: 0,
    frame: 0,
    life,
    maxLife: life,
  });
}

export function attackBox() {
  const p = state.player;
  const reach = BASIC_ATTACK.reach;
  return {
    x: p.facing === 1 ? p.x + p.w : p.x - reach,
    y: p.y + BASIC_ATTACK.yOffset,
    w: reach,
    h: BASIC_ATTACK.height,
    damage: getPlayerAttackDamage() * moonTideBasicDamageMultiplier(),
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
    resolveEnemyDefeat(e, i, "attack");
  }

  if (state.boss && hitbox(box, state.boss) && state.boss.hitCd <= 0) {
    const boss = state.boss;
    const { x: bossHitX, y: bossHitY } = overlapHitPoint(box, boss);
    damageBoss(boss, getPlayerAttackDamage() * FALL_ATTACK.bossDamageMultiplier, FALL_ATTACK.bossHitCooldown);
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
  playSfx("playerFallAttackImpact");
}

export function hurtPlayer(damage: number, sourceVx: number) {
  const p = state.player;
  if (p.invincible > 0) return;

  if (state.skill3Effect && state.skill3Effect.hitsRemaining > 0) {
    state.skill3Effect.hitsRemaining -= 1;
    state.skill3Effect.barrierFlash = SKILL3_EFFECT_CONFIG.barrierFlashFrames;
    p.invincible = PLAYER_COMBAT.hurtInvincibleFrames;

    const counterDamage = (p.baseAttack + p.attackBonus)
      * SKILL3_EFFECT_CONFIG.damageMultiplier
      * state.skill3Effect.damageMultiplier;
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const e = state.enemies[i];
      if (!hitbox(p, e)) continue;
      damageEnemy(e, counterDamage);
      emitSlash(e.x + e.w / 2, e.y + e.h / 2, SKILLS[2].color, e.w);
      emitHitBurst(e.x + e.w / 2, e.y + e.h / 2, SKILLS[2].color, 1.5);
      resolveEnemyDefeat(e, i, "enemy");
    }
    if (state.boss && hitbox(p, state.boss)) {
      damageBoss(state.boss, counterDamage);
      emitSlash(state.boss.x + state.boss.w / 2, state.boss.y + state.boss.h * 0.4, SKILLS[2].color);
      emitHitBurst(state.boss.x + state.boss.w / 2, state.boss.y + state.boss.h * 0.4, SKILLS[2].color, 2);
      defeatBoss();
    }

    playSfx("playerCounter");
    return;
  }

  p.hp = Math.max(0, p.hp - damage);
  p.invincible = PLAYER_COMBAT.hurtInvincibleFrames;
  p.vx = -Math.sign(sourceVx || 1) * PLAYER_COMBAT.hurtKnockbackX;
  p.vy = PLAYER_COMBAT.hurtKnockbackY;
  emitSlash(p.x + p.w / 2, p.y + PLAYER_COMBAT.attackKillY, PLAYER_COMBAT.effects.hurtSlashColor);
  if (p.hp <= 0) {
    playSfx("playerDeath");
    state.gameOver = true;
    state.pendingEquipmentChoices = [];
    state.pendingUpgradeChoices = [];
  } else {
    playSfx("playerHurt");
  }
}

export function tryJump() {
  const p = state.player;
  if (onGround(p, p.onPlatform)) {
    p.vy = -p.jump * moonTideJumpMultiplier();
    playSfx("playerJump");
  }
}

export function updatePlayer() {
  const p = state.player;
  tickEquipmentEffects(p);
  const dashReposition = p.dashReposition;

  if (!dashReposition && p.onPlatform && state.platforms.includes(p.onPlatform)) {
    p.x += p.onPlatform.vx;
  }
  const moveScale = Math.min(bindingZonePlayerMoveScale(), lanternAshZonePlayerMoveScale())
    * equipmentMoveSpeedMultiplier(state)
    * moonTideMoveSpeedMultiplier();
  let previousDashX = p.x;
  let previousDashY = p.y;
  if (dashReposition) {
    p.vx = 0;
    p.facing = dashReposition.facing;
  } else if (keys.has("a")) {
    p.vx = -p.speed * moveScale;
    if (p.skillTimer <= 0 && p.ultimateCastTimer <= 0) p.facing = -1;
  } else if (keys.has("d")) {
    p.vx = p.speed * moveScale;
    if (p.skillTimer <= 0 && p.ultimateCastTimer <= 0) p.facing = 1;
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
  if (dashReposition) {
    previousDashX = p.x;
    previousDashY = p.y;
    p.invincible = Math.max(p.invincible, DASH_REPOSITION_INVINCIBLE_REFRESH_FRAMES);
    dashReposition.elapsed = Math.min(dashReposition.duration, dashReposition.elapsed + 1);
    p.x = dashReposition.startX
      + (dashReposition.targetX - dashReposition.startX) * (dashReposition.elapsed / dashReposition.duration);
  } else {
    p.x += p.vx;
  }
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

  if (dashReposition) {
    damageDashRepositionTravel(previousDashX, previousDashY, p.x, p.y);
  }

  if (dashReposition && dashReposition.elapsed >= dashReposition.duration) {
    p.x = dashReposition.targetX;
    p.dashReposition = null;
    finishDashRepositionSkill(
      dashReposition.level,
      dashReposition.damageMultiplier,
      dashReposition.refundGroupId,
      dashReposition.facing,
      dashReposition.hitEnemies,
      dashReposition.bossHit,
    );
  }

  if (p.skillTimer > 0) {
    p.skillTimer -= 1;
    const skill = selectedSkill(state);
    if (!skill) {
      p.skillTimer = 0;
      p.skillEffectSpawned = false;
      return;
    }
    if (!p.skillEffectSpawned) {
      const total = Math.ceil(skill.frameCount * 60 / PLAYER_DRAW.skillAnimFps);
      const halfway = Math.floor(total / 2);
      if (p.skillTimer <= halfway) {
        p.skillEffectSpawned = true;
        const cx = p.x + p.w / 2;
        const feetY = p.y + p.h;
        if (skill.id === SKILL_IDS.skill1) {
          const effectW = SKILL1_EFFECT_SHEET.frameW * SKILL1_EFFECT_CONFIG.drawScale;
          const effectH = SKILL1_EFFECT_SHEET.frameH * SKILL1_EFFECT_CONFIG.drawScale;
          const skillDrawH = skill.frameH * skill.drawScale;
          const frontX = cx + p.facing * p.w / 2;
          state.skill1Effects.push({
            x: frontX + p.facing * effectW / 2,
            y: feetY - skillDrawH / 2 - effectH / 2,
            vx: p.facing * SKILL1_EFFECT_CONFIG.speed,
            facing: p.facing,
            frame: 0,
            elapsed: 0,
            damageMultiplier: p.skillCastDamageMultiplier,
          });
          playSfx("playerSkillRelease", 0.96);
        } else if (skill.id === SKILL_IDS.skill2) {
          const effectW = SKILL2_EFFECT_SHEET.frameW * SKILL2_EFFECT_CONFIG.drawScale;
          const effectBaselineY = SKILL2_EFFECT_CONFIG.groundBaselineY * SKILL2_EFFECT_CONFIG.drawScale;
          const frontX = cx + p.facing * p.w / 2;
          state.skill2Effects.push({
            x: frontX + p.facing * effectW / 2,
            y: feetY - effectBaselineY,
            vx: p.facing * SKILL2_EFFECT_CONFIG.speed,
            facing: p.facing,
            frame: 0,
            elapsed: 0,
            traveled: 0,
            damageMultiplier: p.skillCastDamageMultiplier,
          });
          playSfx("playerSkillRelease", 1.08);
        } else if (isGenericPlayerSkillId(skill.id)) {
          spawnPlayerSkillEffect(skill.id, p.skillCastDamageMultiplier);
          playSfx("playerSkillRelease", 1.02);
        }
      }
    }
  }

  if (p.ultimateCastTimer > 0) {
    p.ultimateCastTimer -= 1;
    const total = PLAYER_COMBAT.ultimateCastFrames;
    const impactFrame = Math.floor(total * PLAYER_COMBAT.ultimateEffectSpawnRatio);
    if (!p.ultimateEffectSpawned && total - p.ultimateCastTimer >= impactFrame) {
      p.ultimateEffectSpawned = true;
      triggerUltimateOpeningEffect();
    }
    if (p.ultimateCastTimer <= 0) {
      if (!p.ultimateEffectSpawned) {
        p.ultimateEffectSpawned = true;
        triggerUltimateOpeningEffect();
      }
      p.ultimateTimer = currentMoonTideConfig().durationFrames;
    }
  } else if (p.ultimateTimer > 0) {
    p.ultimateTimer -= 1;
    if (p.ultimateTimer <= 0) p.ultimateEffectSpawned = false;
  }

  spawnMoonTideTrail();

  if (p.attackTimer > 0) {
    p.attackTimer -= 1;
    const box = attackBox();

    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const e = state.enemies[i];
      if (hitbox(box, e) && e.hitCd <= 0) {
        const { x: atkHitX, y: atkHitY } = overlapHitPoint(box, e);
        damageEnemy(e, box.damage, PLAYER_COMBAT.attackEnemyHitCooldown);
        recordBasicAttackHit(state);
        triggerMoonTideAfterimageHit(atkHitX, atkHitY, e.w, (damage) => {
          damageEnemy(e, damage, PLAYER_COMBAT.attackEnemyHitCooldown);
        });
        emitSlash(atkHitX, atkHitY, box.color, e.w);
        emitHitBurst(atkHitX, atkHitY, PLAYER_COMBAT.effects.attackEnemyBurstColor, PLAYER_COMBAT.attackEnemyBurstPower);
        playSfx("playerAttackHit");
        if (resolveEnemyDefeat(e, i, "attack")) {
          emitSlash(e.x + Math.random() * e.w, e.y + Math.random() * e.h, PLAYER_COMBAT.effects.attackKillSlashColor, e.w);
        }
      }
    }

    if (state.boss && hitbox(box, state.boss) && state.boss.hitCd <= 0) {
      const boss = state.boss;
      damageBoss(boss, box.damage, PLAYER_COMBAT.attackBossHitCooldown);
      recordBasicAttackHit(state);
      const { x: bossHitX, y: bossHitY } = overlapHitPoint(box, boss);
      triggerMoonTideAfterimageHit(bossHitX, bossHitY, boss.w, (damage) => {
        damageBoss(boss, damage, PLAYER_COMBAT.attackBossHitCooldown);
      });
      emitSlash(bossHitX, bossHitY, box.color);
      emitHitBurst(
        bossHitX,
        bossHitY,
        PLAYER_COMBAT.effects.attackBossBurstColor,
        PLAYER_COMBAT.attackBossBurstPower,
      );
      playSfx("playerBossHit");
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
  const isDashRepositionSkillAnimation = p.skillTimer > 0 && selectedSkill(state)?.id === SKILL_IDS.dashReposition;
  if (
    p.invincible > 0
    && !isDashRepositionSkillAnimation
    && Math.floor(p.invincible / PLAYER_COMBAT.blinkInterval) % 2 === 0
  ) return;
  const isBindingSlowed = Math.min(bindingZonePlayerMoveScale(), lanternAshZonePlayerMoveScale()) < 1;

  // Unified reference point: player center X, feet Y minus global sprite padding.
  // All draw positions: drawX = refX - drawW * anchorX, drawY = refY - drawH * anchorY
  const refX = p.x + p.w / 2;
  const refY = p.y + p.h - PLAYER_DRAW.yOffset;

  if (p.ultimateCastTimer > 0 && ULTIMATE_SKILL_SHEET.image) {
    const total = PLAYER_COMBAT.ultimateCastFrames;
    const elapsedGameFrames = total - p.ultimateCastTimer;
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
    const skill = selectedSkill(state);
    if (!skill) return;
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
    const attackDuration = Math.max(1, p.attackDuration);
    const elapsedAttack = attackDuration - p.attackTimer;
    frame = Math.min(
      sheet.count - 1,
      Math.floor(Math.max(0, elapsedAttack) * sheet.count / attackDuration),
    );
  }
  drawWithBindingSlowFilter(isBindingSlowed, () => {
    drawSheetFrame(sheet, frame, refX - drawW * anchorX, refY - drawH * anchorY, drawW, drawH, p.facing * (flipX ? -1 : 1));
  });
  if (isBindingSlowed) drawBindingSlowEffect();
}
