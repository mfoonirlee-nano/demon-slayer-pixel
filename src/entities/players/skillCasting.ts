import { state } from "../../game/state";
import { PLAYER_COMBAT, PLAYER_DRAW, SKILL_FLASH, SKILL_IDS } from "../../constants";
import type { Skill } from "../../types/assets";
import { nearestRectHitPoint } from "../../game/utils";
import { playSfx } from "../../game/audio";
import { hasDebugInfiniteSkillCharge } from "../../game/debug";
import {
  applySkillCastEquipmentEffects,
  applySkillHitEquipmentRefund,
  consumeSkillCastEquipmentDamageMultiplier,
} from "../../systems/equipment";
import { resolveBossHit, resolveEnemyHit } from "../../systems/combatResolution";
import { selectedSkill } from "../../systems/loadout";
import { skillDamageMultiplier } from "../../systems/progression";
import { isGenericPlayerSkillId } from "../../systems/playerSkills";
import {
  CORE_PLAYER_SKILL_EFFECT_CONFIGS,
  CORE_PLAYER_SKILL_EFFECT_SHEETS,
} from "../../systems/skillCatalog";
import { emitHitBurst, emitSlash, spawnPlayerSkillEffect } from "../particle";
import { currentMoonTideConfig } from "./moonTide";

const SKILL_ANIMATION_BASE_FPS = 60;
const ANTI_AIR_MULTI_SKILL_ANIM_FPS = 8;
const LINE_PROJECTILE_EFFECT_SHEET = CORE_PLAYER_SKILL_EFFECT_SHEETS[SKILL_IDS.lineProjectile];
const LINE_PROJECTILE_EFFECT_CONFIG = CORE_PLAYER_SKILL_EFFECT_CONFIGS[SKILL_IDS.lineProjectile];
const CLOSE_ARC_EFFECT_SHEET = CORE_PLAYER_SKILL_EFFECT_SHEETS[SKILL_IDS.closeArc];
const CLOSE_ARC_EFFECT_CONFIG = CORE_PLAYER_SKILL_EFFECT_CONFIGS[SKILL_IDS.closeArc];
const GUARD_COUNTER_EFFECT_CONFIG = CORE_PLAYER_SKILL_EFFECT_CONFIGS[SKILL_IDS.guardCounter];

export function playerSkillCastAnimFps(skill: Skill) {
  return skill.id === SKILL_IDS.antiAirMulti ? ANTI_AIR_MULTI_SKILL_ANIM_FPS : PLAYER_DRAW.skillAnimFps;
}

export function playerSkillCastFrames(skill: Skill) {
  return Math.ceil(skill.frameCount * SKILL_ANIMATION_BASE_FPS / playerSkillCastAnimFps(skill));
}

export function playerSkillCastFrame(skill: Skill, remainingFrames: number) {
  const elapsedGameFrames = playerSkillCastFrames(skill) - remainingFrames;
  return Math.min(
    skill.frameCount - 1,
    Math.floor(elapsedGameFrames * playerSkillCastAnimFps(skill) / SKILL_ANIMATION_BASE_FPS),
  );
}

export function syncSkillCharges() {
  const p = state.player;
  p.skillCharges = Math.min(
    p.maxSkillCharges,
    Math.floor(p.skillEnergy / PLAYER_COMBAT.skillCastEnergyCost),
  );
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
  p.skillTimer = playerSkillCastFrames(skill);
  p.skillEffectSpawned = !(
    skill.id === SKILL_IDS.lineProjectile
    || skill.id === SKILL_IDS.closeArc
    || isGenericPlayerSkillId(skill.id)
  );
  p.skillCastDamageMultiplier = castDamageMultiplier;
  applySkillCastEquipmentEffects(state);

  if (skill.id === SKILL_IDS.guardCounter) {
    state.guardCounterEffect = {
      elapsed: 0,
      frame: 0,
      hitsRemaining: GUARD_COUNTER_EFFECT_CONFIG.maxHits,
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
      const skillHit = nearestRectHitPoint(e, cx, cy);
      const hit = resolveEnemyHit({
        enemy: e,
        enemyIndex: i,
        hitRect: e,
        hitPoint: skillHit,
        damage,
        hitCooldown: PLAYER_COMBAT.enemyHitCooldown,
        reward: "enemy",
      });
      hitTargets += 1;
      emitSlash(hit.hitX, hit.hitY, skill.color, e.w);
      emitHitBurst(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, PLAYER_COMBAT.skillEnemyBurstPower);
    }

    if (state.boss) {
      const boss = state.boss;
      const bx = boss.x + boss.w / 2;
      const by = boss.y + boss.h / 2;
      if ((bx - cx) * p.facing >= 0) {
        const dist = Math.hypot(bx - cx, by - cy);
        if (dist <= radius + PLAYER_COMBAT.bossRadiusPadding) {
          const ratio = Math.max(PLAYER_COMBAT.bossMinDamageRatio, 1 - dist / (radius + PLAYER_COMBAT.bossRadiusPadding));
          const bossHitPoint = nearestRectHitPoint(boss, cx, cy);
          const hit = resolveBossHit({
            boss,
            hitRect: boss,
            hitPoint: bossHitPoint,
            damage: skill.bossBase * ratio * castDamageMultiplier,
            hitCooldown: PLAYER_COMBAT.bossHitCooldown,
          });
          bossHit = true;
          emitSlash(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.skillBossSlashColor);
          emitHitBurst(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.skillBossBurstColor, PLAYER_COMBAT.skillBossBurstPower);
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

export function triggerUltimateOpeningEffect() {
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

export function updateSkillCastRelease(): boolean {
  const p = state.player;
  if (p.skillTimer > 0) {
    p.skillTimer -= 1;
    const skill = selectedSkill(state);
    if (!skill) {
      p.skillTimer = 0;
      p.skillEffectSpawned = false;
      return false;
    }
    if (!p.skillEffectSpawned) {
      const total = playerSkillCastFrames(skill);
      const halfway = Math.floor(total / 2);
      if (p.skillTimer <= halfway) {
        p.skillEffectSpawned = true;
        const cx = p.x + p.w / 2;
        const feetY = p.y + p.h;
        if (skill.id === SKILL_IDS.lineProjectile) {
          const effectW = LINE_PROJECTILE_EFFECT_SHEET.frameW * LINE_PROJECTILE_EFFECT_CONFIG.drawScale;
          const effectH = LINE_PROJECTILE_EFFECT_SHEET.frameH * LINE_PROJECTILE_EFFECT_CONFIG.drawScale;
          const skillDrawH = skill.frameH * skill.drawScale;
          const frontX = cx + p.facing * p.w / 2;
          state.lineProjectileEffects.push({
            x: frontX + p.facing * (effectW / 2 - LINE_PROJECTILE_EFFECT_CONFIG.spawnOverlap),
            y: feetY - skillDrawH / 2 - effectH / 2,
            vx: p.facing * LINE_PROJECTILE_EFFECT_CONFIG.speed,
            facing: p.facing,
            frame: 0,
            elapsed: 0,
            damageMultiplier: p.skillCastDamageMultiplier,
          });
          playSfx("playerSkillRelease", 0.96);
        } else if (skill.id === SKILL_IDS.closeArc) {
          const effectW = CLOSE_ARC_EFFECT_SHEET.frameW * CLOSE_ARC_EFFECT_CONFIG.drawScale;
          const effectBaselineY = CLOSE_ARC_EFFECT_CONFIG.groundBaselineY * CLOSE_ARC_EFFECT_CONFIG.drawScale;
          const frontX = cx + p.facing * p.w / 2;
          state.closeArcEffects.push({
            x: frontX + p.facing * effectW / 2,
            y: feetY - effectBaselineY,
            vx: p.facing * CLOSE_ARC_EFFECT_CONFIG.speed,
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
  return true;
}

export function updateUltimateCastAndTimer() {
  const p = state.player;
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
}
