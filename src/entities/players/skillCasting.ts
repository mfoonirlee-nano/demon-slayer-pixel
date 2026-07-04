import { state } from "../../game/state";
import { PLAYER_COMBAT, PLAYER_DRAW, SKILL_FLASH, SKILL_IDS } from "../../constants";
import type { Skill, SkillId } from "../../types/assets";
import { playSfx } from "../../game/audio";
import { hasDebugInfiniteSkillCharge } from "../../game/debug";
import {
  applySkillCastEquipmentEffects,
  consumeSkillCastEquipmentDamageMultiplier,
  equipmentSkillEnergyCost,
  syncSkillChargesForEquipment,
} from "../../systems/equipment";
import { selectedSkill } from "../../systems/loadout";
import { hasLearnedUltimate, skillDamageMultiplier } from "../../systems/progression";
import { corePlayerSkillGrowth, isGenericPlayerSkillId } from "../../systems/playerSkills";
import {
  CORE_PLAYER_SKILL_EFFECT_CONFIGS,
  CORE_PLAYER_SKILL_EFFECT_SHEETS,
  lineProjectileEffectSheetForLevel,
} from "../../systems/skillCatalog";
import { spawnPlayerSkillEffect } from "../particle";
import { currentMoonTideConfig } from "./moonTide";

const SKILL_ANIMATION_BASE_FPS = 60;
const ANTI_AIR_MULTI_SKILL_ANIM_FPS = 8;
const PLAYER_SKILL_RELEASE_FRAMES: Record<SkillId, number> = {
  [SKILL_IDS.closeArc]: 8,
  [SKILL_IDS.dashReposition]: 6,
  [SKILL_IDS.lineProjectile]: 12,
  [SKILL_IDS.guardCounter]: 11,
  [SKILL_IDS.verticalWave]: 12,
  [SKILL_IDS.vortexControl]: 18,
  [SKILL_IDS.armorBreak]: 18,
  [SKILL_IDS.returningBlade]: 18,
  [SKILL_IDS.antiAirMulti]: 24,
};
const LINE_PROJECTILE_EFFECT_CONFIG = CORE_PLAYER_SKILL_EFFECT_CONFIGS[SKILL_IDS.lineProjectile];
const CLOSE_ARC_EFFECT_SHEET = CORE_PLAYER_SKILL_EFFECT_SHEETS[SKILL_IDS.closeArc];
const CLOSE_ARC_EFFECT_CONFIG = CORE_PLAYER_SKILL_EFFECT_CONFIGS[SKILL_IDS.closeArc];
const GUARD_COUNTER_EFFECT_CONFIG = CORE_PLAYER_SKILL_EFFECT_CONFIGS[SKILL_IDS.guardCounter];
const LINE_PROJECTILE_RELEASE_SFX_PITCH = 0.96;
const CLOSE_ARC_RELEASE_SFX_PITCH = 1.08;
const GUARD_COUNTER_RELEASE_SFX_PITCH = 0.98;
const GENERIC_SKILL_RELEASE_SFX_PITCH = 1.02;

export function playerSkillCastAnimFps(skill: Skill) {
  return skill.id === SKILL_IDS.antiAirMulti ? ANTI_AIR_MULTI_SKILL_ANIM_FPS : PLAYER_DRAW.skillAnimFps;
}

export function playerSkillCastFrames(skill: Skill) {
  return Math.ceil(skill.frameCount * SKILL_ANIMATION_BASE_FPS / playerSkillCastAnimFps(skill));
}

export function playerSkillReleaseFrame(skill: Skill) {
  return Math.min(playerSkillCastFrames(skill), PLAYER_SKILL_RELEASE_FRAMES[skill.id]);
}

export function playerSkillCastFrame(skill: Skill, remainingFrames: number) {
  const elapsedGameFrames = playerSkillCastFrames(skill) - remainingFrames;
  return Math.min(
    skill.frameCount - 1,
    Math.floor(elapsedGameFrames * playerSkillCastAnimFps(skill) / SKILL_ANIMATION_BASE_FPS),
  );
}

export function syncSkillCharges() {
  syncSkillChargesForEquipment(state);
}

export function castSelectedSkill() {
  const p = state.player;
  if (p.ultimateCastTimer > 0) return;
  if (p.skillTimer > 0) return;
  if (p.fallAttackTimer > 0 || p.fallAttackRecoveryTimer > 0) return;
  const skill = selectedSkill(state);
  if (!skill) return;
  const energyCost = skill.energyCost ?? equipmentSkillEnergyCost(state);
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
    || skill.id === SKILL_IDS.guardCounter
    || isGenericPlayerSkillId(skill.id)
  );
  p.skillCastDamageMultiplier = castDamageMultiplier;
  applySkillCastEquipmentEffects(state, skill.id);

  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
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

  playSfx("playerSkillCast");
}

export function castUltimateSkill() {
  const p = state.player;
  if (
    state.gameOver
    || !hasLearnedUltimate(state)
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

  state.ultimateEffects.length = 0;
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
      const elapsed = total - p.skillTimer;
      if (elapsed >= playerSkillReleaseFrame(skill)) {
        p.skillEffectSpawned = true;
        const cx = p.x + p.w / 2;
        const feetY = p.y + p.h;
        if (skill.id === SKILL_IDS.lineProjectile) {
          const effectLevel = state.player.skillLevels[skill.id] ?? 1;
          const effectSheet = lineProjectileEffectSheetForLevel(effectLevel);
          const drawScale = LINE_PROJECTILE_EFFECT_CONFIG.drawScale;
          const effectW = effectSheet.frameW * drawScale;
          const effectH = effectSheet.frameH * drawScale;
          const skillDrawH = skill.frameH * skill.drawScale;
          const frontX = cx + p.facing * p.w / 2;
          state.lineProjectileEffects.push({
            x: frontX + p.facing * (effectW / 2 - LINE_PROJECTILE_EFFECT_CONFIG.spawnOverlap),
            y: feetY - skillDrawH / 2 - effectH / 2,
            vx: p.facing * LINE_PROJECTILE_EFFECT_CONFIG.speed,
            facing: p.facing,
            frame: 0,
            elapsed: 0,
            drawScale,
            effectLevel,
            damageMultiplier: p.skillCastDamageMultiplier,
          });
          playSfx("playerSkillRelease", LINE_PROJECTILE_RELEASE_SFX_PITCH);
        } else if (skill.id === SKILL_IDS.closeArc) {
          const growth = corePlayerSkillGrowth(skill.id, state.player.skillLevels[skill.id]);
          const drawScale = growth?.drawScale ?? CLOSE_ARC_EFFECT_CONFIG.drawScale;
          const effectW = CLOSE_ARC_EFFECT_SHEET.frameW * drawScale;
          const effectBaselineY = CLOSE_ARC_EFFECT_CONFIG.groundBaselineY * drawScale;
          const frontX = cx + p.facing * p.w / 2;
          state.closeArcEffects.push({
            x: frontX + p.facing * effectW / 2,
            y: feetY - effectBaselineY,
            vx: p.facing * CLOSE_ARC_EFFECT_CONFIG.speed,
            facing: p.facing,
            frame: 0,
            elapsed: 0,
            traveled: 0,
            drawScale,
            maxTravel: growth?.maxTravel ?? CLOSE_ARC_EFFECT_CONFIG.maxTravel,
            damageMultiplier: p.skillCastDamageMultiplier,
          });
          playSfx("playerSkillRelease", CLOSE_ARC_RELEASE_SFX_PITCH);
        } else if (skill.id === SKILL_IDS.guardCounter) {
          spawnGuardCounterEffect(p.skillCastDamageMultiplier);
          playSfx("playerSkillRelease", GUARD_COUNTER_RELEASE_SFX_PITCH);
        } else if (isGenericPlayerSkillId(skill.id)) {
          spawnPlayerSkillEffect(skill.id, p.skillCastDamageMultiplier);
          playSfx("playerSkillRelease", GENERIC_SKILL_RELEASE_SFX_PITCH);
        }
      }
    }
  }
  return true;
}

function spawnGuardCounterEffect(damageMultiplier: number) {
  const growth = corePlayerSkillGrowth(SKILL_IDS.guardCounter, state.player.skillLevels[SKILL_IDS.guardCounter]);
  const maxHits = growth?.maxHits ?? GUARD_COUNTER_EFFECT_CONFIG.maxHits;
  state.guardCounterEffect = {
    elapsed: 0,
    frame: 0,
    hitsRemaining: maxHits,
    maxHits,
    activeFrames: growth?.activeFrames ?? GUARD_COUNTER_EFFECT_CONFIG.activeFrames,
    counterPadding: growth?.counterPadding ?? 0,
    damageMultiplier,
    barrierFlash: 0,
  };
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
