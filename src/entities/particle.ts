import { state } from "../state";
import { ctx } from "../context";
import {
  PARTICLE_CONFIG,
  HIT_BURST_CONFIG,
  SKILL_BURST_VISUAL,
  HIT_BURST_VISUAL,
  SKILL1_EFFECT_SHEET,
  SKILL1_EFFECT_CONFIG,
  SKILL2_EFFECT_SHEET,
  SKILL2_EFFECT_CONFIG,
  SKILL3_EFFECT_SHEET,
  SKILL3_EFFECT_CONFIG,
  PLAYER_SKILL_EFFECT_SHEETS,
  ULTIMATE_SKILL_EFFECT_SHEET,
  PLAYER_COMBAT,
  GROUND_Y,
  SKILL_IDS,
  WIDTH,
} from "../constants";
import type {
  EnemyState,
  HitBurstState,
  ParticleState,
  PlayerSkillEffectState,
  Skill1EffectState,
  Skill2EffectState,
  SkillBurstState,
  SkillLevel,
  UltimateAfterimageSlashState,
  UltimateTrailState,
} from "../types/game-state";
import type { SkillId } from "../types/assets";
import { clamp, hitbox, nearestRectHitPoint, overlapHitPoint } from "../utils";
import { damageEnemy } from "./enemies/common";
import { resolveEnemyDefeat } from "./enemies/defeat";
import { defeatBoss } from "./bosses/defeat";
import { damageBoss } from "./bosses/common";
import { applySkillHitEquipmentRefund } from "../systems/equipment";
import { skillById } from "../systems/loadout";
import {
  GENERIC_PLAYER_SKILL_TUNING,
  isGenericPlayerSkillId,
  rectFromCenter,
  valueForSkillLevel,
  type GenericPlayerSkillId,
} from "../systems/playerSkills";

const FULL_CIRCLE_RADIANS = Math.PI * 2;
const DEFAULT_HIT_BURST_COLOR = "#9feaff";
const RETURNING_BLADE_SPEED = 8;
const RAIN_LINE_FALL_SPEED = 4.8;
const RAIN_LINE_DRIFT_X = -2.1;
const VORTEX_VERTICAL_RADIUS_SCALE = 0.58;
const VORTEX_ENEMY_SLOW = 0.82;
const ARMOR_BREAK_FALLBACK_Y_RATIO = 0.54;
const GENERIC_SKILL_DAMAGE_ATTACK_BONUS_SCALE = 0.025;

let nextPlayerSkillRefundGroupId = 1;

export function emitSlash(x: number, y: number, color: string, spread: number = PARTICLE_CONFIG.slashDefaultSpread) {
  for (let i = 0; i < PARTICLE_CONFIG.slashCount; i += 1) {
    state.particles.push({
      x: x + (Math.random() - 0.5) * spread,
      y: y + (Math.random() - 0.5) * spread * 0.6,
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

function genericSkillLevel(skillId: GenericPlayerSkillId): SkillLevel {
  return state.player.skillLevels[skillId] ?? 1;
}

function genericSkillDamage(skillId: GenericPlayerSkillId, level: SkillLevel, castDamageMultiplier: number, boss = false) {
  const tuning = GENERIC_PLAYER_SKILL_TUNING[skillId];
  const multiplier = boss
    ? valueForSkillLevel(tuning.bossDamageMultiplier, level)
    : valueForSkillLevel(tuning.damageMultiplier, level);
  const attack = state.player.baseAttack + state.player.attackBonus;
  return attack
    * (1 + state.player.attackBonus * GENERIC_SKILL_DAMAGE_ATTACK_BONUS_SCALE)
    * multiplier
    * castDamageMultiplier;
}

function effectBox(effect: PlayerSkillEffectState) {
  return rectFromCenter(effect.x, effect.y, effect.w, effect.h);
}

function enemyCenter(enemy: EnemyState) {
  return {
    x: enemy.x + enemy.w / 2,
    y: enemy.y + enemy.h / 2,
  };
}

function playerSkillSheetFrame(skillId: SkillId, elapsed: number) {
  const sheet = PLAYER_SKILL_EFFECT_SHEETS[skillId];
  const tuning = isGenericPlayerSkillId(skillId) ? GENERIC_PLAYER_SKILL_TUNING[skillId] : null;
  if (!sheet || !tuning) return 0;
  return Math.min(sheet.count - 1, Math.floor(elapsed / tuning.frameDuration));
}

function refundSkillGroup(effect: PlayerSkillEffectState, hitTargets: number, bossHit: boolean) {
  if (!effect.refundGroupId) return;
  const groupAlreadyRefunded = state.playerSkillEffects.some((candidate) => (
    candidate.refundGroupId === effect.refundGroupId && candidate.refundedSkillEnergy
  ));
  if (groupAlreadyRefunded) return;
  if (!applySkillHitEquipmentRefund(state, hitTargets, bossHit)) return;

  for (const candidate of state.playerSkillEffects) {
    if (candidate.refundGroupId === effect.refundGroupId) {
      candidate.refundedSkillEnergy = true;
    }
  }
}

function applyArmorBreakToEnemy(enemy: EnemyState, duration: number, multiplier: number) {
  enemy.armorBreakTimer = duration;
  enemy.armorBreakMultiplier = multiplier;
}

function applyArmorBreakToBoss(duration: number, multiplier: number) {
  if (!state.boss) return;
  state.boss.armorBreakTimer = duration;
  state.boss.armorBreakMultiplier = multiplier;
}

function makeGenericEffect(
  skillId: GenericPlayerSkillId,
  level: SkillLevel,
  castDamageMultiplier: number,
  x: number,
  y: number,
  overrides: Partial<PlayerSkillEffectState> = {},
): PlayerSkillEffectState {
  const tuning = GENERIC_PLAYER_SKILL_TUNING[skillId];
  const life = overrides.life ?? valueForSkillLevel(tuning.life, level);
  return {
    skillId,
    kind: tuning.kind,
    x,
    y,
    w: overrides.w ?? valueForSkillLevel(tuning.width, level),
    h: overrides.h ?? valueForSkillLevel(tuning.height, level),
    vx: overrides.vx ?? 0,
    vy: overrides.vy ?? 0,
    facing: overrides.facing ?? state.player.facing,
    elapsed: 0,
    frame: 0,
    life,
    maxLife: overrides.maxLife ?? life,
    damage: overrides.damage ?? genericSkillDamage(skillId, level, castDamageMultiplier),
    bossDamage: overrides.bossDamage ?? genericSkillDamage(skillId, level, castDamageMultiplier, true),
    hitCooldown: tuning.hitCooldown,
    bossHitCooldown: tuning.bossHitCooldown,
    damageMultiplier: castDamageMultiplier,
    hitEnemies: [],
    ...overrides,
  };
}

function dashDestination(distance: number) {
  const player = state.player;
  let minX = 0;
  let maxX = WIDTH - player.w;
  if (player.onPlatform && state.platforms.includes(player.onPlatform)) {
    minX = player.onPlatform.x + PLAYER_COMBAT.platformEdgePadding;
    maxX = player.onPlatform.x + player.onPlatform.w - player.w - PLAYER_COMBAT.platformEdgePadding;
  }
  return clamp(player.x + player.facing * distance, minX, maxX);
}

function findArmorBreakTarget(range: number) {
  const player = state.player;
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h * ARMOR_BREAK_FALLBACK_Y_RATIO;
  let bestEnemy: EnemyState | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const enemy of state.enemies) {
    const center = enemyCenter(enemy);
    if ((center.x - cx) * player.facing < 0) continue;
    const dist = Math.hypot(center.x - cx, center.y - cy);
    if (dist > range || dist >= bestDistance) continue;
    bestEnemy = enemy;
    bestDistance = dist;
  }

  if (state.boss) {
    const bossCenterX = state.boss.x + state.boss.w / 2;
    const bossCenterY = state.boss.y + state.boss.h / 2;
    const bossDistance = Math.hypot(bossCenterX - cx, bossCenterY - cy);
    if ((bossCenterX - cx) * player.facing >= 0 && bossDistance <= range && bossDistance < bestDistance) {
      return { enemy: null, boss: state.boss, x: bossCenterX, y: bossCenterY };
    }
  }

  if (!bestEnemy) return null;
  const center = enemyCenter(bestEnemy);
  return { enemy: bestEnemy, boss: null, x: center.x, y: center.y };
}

function rainLineTargets(count: number) {
  const player = state.player;
  const playerCenterX = player.x + player.w / 2;
  const candidates = state.enemies
    .map((enemy) => {
      const center = enemyCenter(enemy);
      const airborne = enemy.y + enemy.h < GROUND_Y - 24 ? 90 : 0;
      const caster = enemy.casterPhase === "windup" || enemy.casterPhase === "cast" ? 55 : 0;
      const lowHp = enemy.hp <= (state.player.baseAttack + state.player.attackBonus) * 1.4 ? 35 : 0;
      const forward = (center.x - playerCenterX) * player.facing >= -40 ? 15 : 0;
      const distancePenalty = Math.abs(center.x - playerCenterX) * 0.05;
      return { x: center.x, y: center.y, score: airborne + caster + lowHp + forward - distancePenalty };
    })
    .sort((a, b) => b.score - a.score);

  const targets = candidates.slice(0, count).map((target) => ({ x: target.x, y: target.y }));
  while (targets.length < count) {
    const offset = (targets.length - (count - 1) / 2) * 42;
    targets.push({
      x: clamp(playerCenterX + player.facing * (90 + Math.abs(offset)) + offset, 30, WIDTH - 30),
      y: state.player.y + 28,
    });
  }
  return targets;
}

export function spawnPlayerSkillEffect(skillId: SkillId, castDamageMultiplier = 1) {
  if (!isGenericPlayerSkillId(skillId)) return false;

  const level = genericSkillLevel(skillId);
  const tuning = GENERIC_PLAYER_SKILL_TUNING[skillId];
  const player = state.player;
  const playerCenterX = player.x + player.w / 2;
  const playerCenterY = player.y + player.h / 2;
  const feetY = player.y + player.h;
  const refundGroupId = nextPlayerSkillRefundGroupId;
  nextPlayerSkillRefundGroupId += 1;

  if (skillId === SKILL_IDS.dashReposition) {
    const distance = valueForSkillLevel(tuning.distance ?? tuning.width, level);
    player.x = dashDestination(distance);
    player.vx = 0;
    const slashW = valueForSkillLevel(tuning.width, level);
    const slashH = valueForSkillLevel(tuning.height, level);
    const slashX = player.facing === 1
      ? player.x + player.w + slashW / 2 - 10
      : player.x - slashW / 2 + 10;
    state.playerSkillEffects.push(makeGenericEffect(skillId, level, castDamageMultiplier, slashX, player.y + player.h * 0.56, {
      w: slashW,
      h: slashH,
      refundGroupId,
    }));
    return true;
  }

  if (skillId === SKILL_IDS.vortexControl) {
    const radius = valueForSkillLevel(tuning.radius ?? tuning.width, level);
    state.playerSkillEffects.push(makeGenericEffect(skillId, level, castDamageMultiplier, clamp(playerCenterX + player.facing * 86, radius, WIDTH - radius), feetY - 16, {
      w: radius * 2,
      h: radius * 2 * VORTEX_VERTICAL_RADIUS_SCALE,
      refundGroupId,
    }));
    return true;
  }

  if (skillId === SKILL_IDS.armorBreak) {
    const range = valueForSkillLevel(tuning.distance ?? tuning.width, level);
    const target = findArmorBreakTarget(range);
    const effectX = target?.x ?? playerCenterX + player.facing * Math.min(range, 96);
    const effectY = target?.y ?? playerCenterY;
    const effect = makeGenericEffect(skillId, level, castDamageMultiplier, effectX, effectY, {
      refundGroupId,
      armorBreakDuration: valueForSkillLevel(tuning.armorBreakDuration ?? tuning.life, level),
      armorBreakMultiplier: valueForSkillLevel(tuning.armorBreakMultiplier ?? tuning.damageMultiplier, level),
      armorBreakBossMultiplier: valueForSkillLevel(tuning.armorBreakBossMultiplier ?? tuning.bossDamageMultiplier, level),
    });

    let hitTargets = 0;
    let bossHit = false;
    if (target?.enemy) {
      damageEnemy(target.enemy, effect.damage, effect.hitCooldown);
      applyArmorBreakToEnemy(target.enemy, effect.armorBreakDuration ?? 0, effect.armorBreakMultiplier ?? 1);
      effect.hitEnemies.push(target.enemy);
      hitTargets = 1;
      emitSlash(effectX, effectY, DEFAULT_HIT_BURST_COLOR, target.enemy.w);
      emitHitBurst(effectX, effectY, PLAYER_COMBAT.effects.skillEnemyBurstColor, PLAYER_COMBAT.skillEnemyBurstPower);
      const enemyIndex = state.enemies.indexOf(target.enemy);
      if (enemyIndex >= 0) resolveEnemyDefeat(target.enemy, enemyIndex, "enemyNoCover");
    } else if (target?.boss) {
      damageBoss(target.boss, effect.bossDamage, effect.bossHitCooldown);
      applyArmorBreakToBoss(effect.armorBreakDuration ?? 0, effect.armorBreakBossMultiplier ?? 1);
      bossHit = true;
      emitSlash(effectX, effectY, PLAYER_COMBAT.effects.skillBossSlashColor);
      emitHitBurst(effectX, effectY, PLAYER_COMBAT.effects.skillBossBurstColor, PLAYER_COMBAT.skillBossBurstPower);
      defeatBoss();
    }
    state.playerSkillEffects.push(effect);
    refundSkillGroup(effect, hitTargets, bossHit);
    return true;
  }

  if (skillId === SKILL_IDS.antiAirMulti) {
    const count = valueForSkillLevel(tuning.count ?? tuning.life, level);
    for (const [index, target] of rainLineTargets(count).entries()) {
      state.playerSkillEffects.push(makeGenericEffect(skillId, level, castDamageMultiplier, target.x - 32 + index * 6, target.y - 44, {
        vx: player.facing * RAIN_LINE_DRIFT_X,
        vy: RAIN_LINE_FALL_SPEED,
        refundGroupId,
      }));
    }
    return true;
  }

  if (skillId === SKILL_IDS.returningBlade) {
    state.playerSkillEffects.push(makeGenericEffect(skillId, level, castDamageMultiplier, playerCenterX + player.facing * 28, playerCenterY, {
      vx: player.facing * RETURNING_BLADE_SPEED,
      phase: "out",
      originX: playerCenterX,
      originY: playerCenterY,
      traveled: 0,
      maxDistance: valueForSkillLevel(tuning.distance ?? tuning.width, level),
      maxHits: valueForSkillLevel(tuning.maxHits ?? tuning.life, level),
      returnHitEnemies: [],
      refundGroupId,
    }));
    return true;
  }

  if (skillId === SKILL_IDS.verticalWave) {
    const waveW = valueForSkillLevel(tuning.width, level);
    const waveH = valueForSkillLevel(tuning.height, level);
    state.playerSkillEffects.push(makeGenericEffect(skillId, level, castDamageMultiplier, clamp(playerCenterX + player.facing * 34, waveW / 2, WIDTH - waveW / 2), feetY - waveH / 2, {
      w: waveW,
      h: waveH,
      lift: valueForSkillLevel(tuning.lift ?? tuning.height, level),
      refundGroupId,
    }));
    return true;
  }

  return false;
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
  const baseDamage = (p.baseAttack + p.attackBonus) * SKILL1_EFFECT_CONFIG.damageMultiplier;

  for (let i = state.skill1Effects.length - 1; i >= 0; i -= 1) {
    const eff = state.skill1Effects[i] as Skill1EffectState;
    const damage = baseDamage * eff.damageMultiplier;
    let hitTargets = 0;
    let bossHit = false;
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
      const { x: hitX, y: hitY } = overlapHitPoint(
        { x: effLeft, y: effTop, w: drawW, h: drawH },
        enemy,
      );
      damageEnemy(enemy, damage, SKILL1_EFFECT_CONFIG.hitCooldown);
      hitTargets += 1;
      emitSlash(hitX, hitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, enemy.w);
      emitHitBurst(hitX, hitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, PLAYER_COMBAT.skillEnemyBurstPower);
      resolveEnemyDefeat(enemy, j, "enemyNoCover");
    }

    // damage boss
    if (state.boss && state.boss.hitCd <= 0) {
      const boss = state.boss;
      const overlapX = effRight > boss.x && effLeft < boss.x + boss.w;
      const overlapY = effBottom > boss.y && effTop < boss.y + boss.h;
      if (overlapX && overlapY) {
        damageBoss(boss, damage, SKILL1_EFFECT_CONFIG.hitCooldown);
        bossHit = true;
        const { x: bossHitX, y: bossHitY } = overlapHitPoint(
          { x: effLeft, y: effTop, w: drawW, h: drawH },
          boss,
        );
        emitSlash(bossHitX, bossHitY, PLAYER_COMBAT.effects.skillBossSlashColor);
        emitHitBurst(bossHitX, bossHitY, PLAYER_COMBAT.effects.skillBossBurstColor, PLAYER_COMBAT.skillBossBurstPower);
        defeatBoss();
      }
    }

    if (!eff.refundedSkillEnergy && applySkillHitEquipmentRefund(state, hitTargets, bossHit)) {
      eff.refundedSkillEnergy = true;
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
  const baseDamage = (p.baseAttack + p.attackBonus) * SKILL2_EFFECT_CONFIG.damageMultiplier;

  for (let i = state.skill2Effects.length - 1; i >= 0; i -= 1) {
    const eff = state.skill2Effects[i] as Skill2EffectState;
    const damage = baseDamage * eff.damageMultiplier;
    let hitTargets = 0;
    let bossHit = false;
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
      const { x: hitX, y: hitY } = overlapHitPoint(
        { x: effLeft, y: effTop, w: drawW, h: drawH },
        enemy,
      );
      damageEnemy(enemy, damage, SKILL2_EFFECT_CONFIG.hitCooldown);
      hitTargets += 1;
      emitSlash(hitX, hitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, enemy.w);
      emitHitBurst(hitX, hitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, PLAYER_COMBAT.skillEnemyBurstPower);
      resolveEnemyDefeat(enemy, j, "enemyNoCover");
    }

    if (state.boss && state.boss.hitCd <= 0) {
      const boss = state.boss;
      const overlapX = effRight > boss.x && effLeft < boss.x + boss.w;
      const overlapY = effBottom > boss.y && effTop < boss.y + boss.h;
      if (overlapX && overlapY) {
        damageBoss(boss, damage, SKILL2_EFFECT_CONFIG.hitCooldown);
        bossHit = true;
        const { x: bossHitX, y: bossHitY } = overlapHitPoint(
          { x: effLeft, y: effTop, w: drawW, h: drawH },
          boss,
        );
        emitSlash(bossHitX, bossHitY, PLAYER_COMBAT.effects.skillBossSlashColor);
        emitHitBurst(bossHitX, bossHitY, PLAYER_COMBAT.effects.skillBossBurstColor, PLAYER_COMBAT.skillBossBurstPower);
        defeatBoss();
      }
    }

    if (!eff.refundedSkillEnergy && applySkillHitEquipmentRefund(state, hitTargets, bossHit)) {
      eff.refundedSkillEnergy = true;
    }

    if (eff.traveled >= SKILL2_EFFECT_CONFIG.maxTravel) state.skill2Effects.splice(i, 1);
  }
}

function tickEffectCooldowns(effect: PlayerSkillEffectState) {
  if (effect.bossCooldown !== undefined) {
    effect.bossCooldown = Math.max(0, effect.bossCooldown - 1);
  }
  if (!effect.enemyCooldowns) return;
  for (let i = effect.enemyCooldowns.length - 1; i >= 0; i -= 1) {
    const cooldown = effect.enemyCooldowns[i];
    cooldown.frames -= 1;
    if (cooldown.frames <= 0 || !state.enemies.includes(cooldown.enemy)) {
      effect.enemyCooldowns.splice(i, 1);
    }
  }
}

function hasLocalEnemyCooldown(effect: PlayerSkillEffectState, enemy: EnemyState) {
  return Boolean(effect.enemyCooldowns?.some((cooldown) => cooldown.enemy === enemy && cooldown.frames > 0));
}

function setLocalEnemyCooldown(effect: PlayerSkillEffectState, enemy: EnemyState) {
  effect.enemyCooldowns ??= [];
  const existing = effect.enemyCooldowns.find((cooldown) => cooldown.enemy === enemy);
  if (existing) {
    existing.frames = effect.hitCooldown;
  } else {
    effect.enemyCooldowns.push({ enemy, frames: effect.hitCooldown });
  }
}

function applyEffectDamageToEnemy(effect: PlayerSkillEffectState, enemy: EnemyState, enemyIndex: number) {
  const box = effectBox(effect);
  const { x: hitX, y: hitY } = overlapHitPoint(box, enemy);
  damageEnemy(enemy, effect.damage, effect.hitCooldown);
  emitSlash(hitX, hitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, enemy.w);
  emitHitBurst(hitX, hitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, PLAYER_COMBAT.skillEnemyBurstPower);
  resolveEnemyDefeat(enemy, enemyIndex, "enemyNoCover");
}

function applyEffectDamageToBoss(effect: PlayerSkillEffectState) {
  if (!state.boss) return false;
  const box = effectBox(effect);
  const { x: hitX, y: hitY } = overlapHitPoint(box, state.boss);
  damageBoss(state.boss, effect.bossDamage, effect.bossHitCooldown);
  emitSlash(hitX, hitY, PLAYER_COMBAT.effects.skillBossSlashColor);
  emitHitBurst(hitX, hitY, PLAYER_COMBAT.effects.skillBossBurstColor, PLAYER_COMBAT.skillBossBurstPower);
  defeatBoss();
  return true;
}

function updateOneShotBoxEffect(effect: PlayerSkillEffectState) {
  const box = effectBox(effect);
  let hitTargets = 0;
  let bossHit = false;

  for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
    const enemy = state.enemies[j];
    if (effect.hitEnemies.includes(enemy)) continue;
    if (!hitbox(box, enemy)) continue;
    effect.hitEnemies.push(enemy);
    if (effect.kind === "verticalWave") {
      enemy.x += effect.facing * 4;
      enemy.y = Math.max(0, enemy.y - (effect.lift ?? 0));
      enemy.vx *= 0.45;
    }
    applyEffectDamageToEnemy(effect, enemy, j);
    hitTargets += 1;
  }

  if (state.boss && effect.bossCooldown === undefined && hitbox(box, state.boss)) {
    bossHit = applyEffectDamageToBoss(effect);
    effect.bossCooldown = effect.bossHitCooldown;
  }

  refundSkillGroup(effect, hitTargets, bossHit);
}

function updateVortexEffect(effect: PlayerSkillEffectState) {
  const radiusX = effect.w / 2;
  const radiusY = effect.h / 2;
  const tuning = isGenericPlayerSkillId(effect.skillId)
    ? GENERIC_PLAYER_SKILL_TUNING[effect.skillId]
    : null;
  const level = isGenericPlayerSkillId(effect.skillId) ? genericSkillLevel(effect.skillId) : 1;
  const pull = tuning ? valueForSkillLevel(tuning.pull ?? tuning.width, level) : 0;
  let hitTargets = 0;
  let bossHit = false;

  for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
    const enemy = state.enemies[j];
    const center = enemyCenter(enemy);
    const dx = (center.x - effect.x) / radiusX;
    const dy = (center.y - effect.y) / Math.max(1, radiusY);
    if (dx * dx + dy * dy > 1) continue;

    enemy.x += clamp(effect.x - center.x, -pull, pull);
    enemy.vx *= VORTEX_ENEMY_SLOW;
    if (hasLocalEnemyCooldown(effect, enemy)) continue;

    setLocalEnemyCooldown(effect, enemy);
    applyEffectDamageToEnemy(effect, enemy, j);
    hitTargets += 1;
  }

  if (state.boss) {
    const bossCenterX = state.boss.x + state.boss.w / 2;
    const bossCenterY = state.boss.y + state.boss.h / 2;
    const dx = (bossCenterX - effect.x) / radiusX;
    const dy = (bossCenterY - effect.y) / Math.max(1, radiusY);
    if (dx * dx + dy * dy <= 1 && !effect.bossCooldown) {
      bossHit = applyEffectDamageToBoss(effect);
      effect.bossCooldown = effect.bossHitCooldown;
    }
  }

  refundSkillGroup(effect, hitTargets, bossHit);
}

function updateReturningBladeEffect(effect: PlayerSkillEffectState) {
  const previousX = effect.x;
  const previousY = effect.y;

  if (effect.phase === "return") {
    const targetX = state.player.x + state.player.w / 2;
    const targetY = state.player.y + state.player.h / 2;
    const dx = targetX - effect.x;
    const dy = targetY - effect.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= RETURNING_BLADE_SPEED) {
      effect.life = 0;
      return;
    }
    effect.vx = dx / distance * RETURNING_BLADE_SPEED;
    effect.vy = dy / distance * RETURNING_BLADE_SPEED;
    effect.facing = effect.vx >= 0 ? 1 : -1;
  }

  effect.x += effect.vx;
  effect.y += effect.vy;
  effect.traveled = (effect.traveled ?? 0) + Math.hypot(effect.x - previousX, effect.y - previousY);

  const activeHits = effect.phase === "return"
    ? effect.returnHitEnemies ?? effect.hitEnemies
    : effect.hitEnemies;
  const box = effectBox(effect);
  let hitTargets = 0;
  let bossHit = false;

  for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
    const enemy = state.enemies[j];
    if (activeHits.includes(enemy)) continue;
    if (!hitbox(box, enemy)) continue;
    activeHits.push(enemy);
    applyEffectDamageToEnemy(effect, enemy, j);
    hitTargets += 1;
  }

  if (state.boss && !effect.bossCooldown && hitbox(box, state.boss)) {
    bossHit = applyEffectDamageToBoss(effect);
    effect.bossCooldown = effect.bossHitCooldown;
  }

  refundSkillGroup(effect, hitTargets, bossHit);

  if (effect.phase !== "return") {
    const maxHitsReached = effect.hitEnemies.length >= (effect.maxHits ?? Number.POSITIVE_INFINITY);
    const distanceReached = (effect.traveled ?? 0) >= (effect.maxDistance ?? 0);
    if (maxHitsReached || distanceReached) {
      effect.phase = "return";
      effect.returnHitEnemies ??= [];
      effect.bossCooldown = undefined;
    }
  }
}

export function updatePlayerSkillEffects() {
  for (let i = state.playerSkillEffects.length - 1; i >= 0; i -= 1) {
    const effect = state.playerSkillEffects[i] as PlayerSkillEffectState;
    effect.elapsed += 1;
    effect.life -= 1;
    effect.frame = playerSkillSheetFrame(effect.skillId, effect.elapsed);
    tickEffectCooldowns(effect);

    if (effect.kind === "vortex") {
      updateVortexEffect(effect);
    } else if (effect.kind === "returningBlade") {
      updateReturningBladeEffect(effect);
    } else {
      effect.x += effect.vx;
      effect.y += effect.vy;
      if (effect.kind !== "armorBreak") {
        updateOneShotBoxEffect(effect);
      }
    }

    if (effect.life <= 0) {
      state.playerSkillEffects.splice(i, 1);
    }
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

export function updateUltimateTrails() {
  for (let i = state.ultimateTrails.length - 1; i >= 0; i -= 1) {
    const trail = state.ultimateTrails[i] as UltimateTrailState;
    trail.life -= 1;
    if (trail.life <= 0) state.ultimateTrails.splice(i, 1);
  }
}

export function updateUltimateAfterimageSlashes() {
  for (let i = state.ultimateAfterimageSlashes.length - 1; i >= 0; i -= 1) {
    const slash = state.ultimateAfterimageSlashes[i] as UltimateAfterimageSlashState;
    slash.life -= 1;
    if (slash.life <= 0) state.ultimateAfterimageSlashes.splice(i, 1);
  }
}

export function updateUltimateEffects() {
  const sheet = ULTIMATE_SKILL_EFFECT_SHEET;
  for (let i = state.ultimateEffects.length - 1; i >= 0; i -= 1) {
    const eff = state.ultimateEffects[i];
    eff.elapsed += 1;
    eff.life -= 1;
    eff.frame = Math.floor(eff.elapsed / PLAYER_COMBAT.ultimateEffectFrameDuration) % sheet.count;
    if (eff.life <= 0) state.ultimateEffects.splice(i, 1);
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
    const fadeT = Math.max(0, e.traveled / SKILL2_EFFECT_CONFIG.maxTravel * 2 - 1);
    const alpha = 1 - fadeT * 0.7;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(e.x, e.y + drawH / 2);
    ctx.scale(e.facing, 1);
    ctx.drawImage(sheet.image, sx, 0, sheet.frameW, sheet.frameH, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }
}

export function drawPlayerSkillEffects() {
  if (!ctx) return;

  for (const effect of state.playerSkillEffects) {
    const sheet = PLAYER_SKILL_EFFECT_SHEETS[effect.skillId];
    const tuning = isGenericPlayerSkillId(effect.skillId)
      ? GENERIC_PLAYER_SKILL_TUNING[effect.skillId]
      : null;
    const lifeRatio = effect.life / Math.max(1, effect.maxLife);
    const alpha = effect.kind === "rainLine"
      ? Math.min(0.62, 0.2 + lifeRatio * 0.42)
      : effect.kind === "vortex"
        ? Math.min(0.78, 0.3 + lifeRatio * 0.48)
        : Math.min(0.9, 0.35 + lifeRatio * 0.55);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = "lighter";

    if (sheet?.image && tuning) {
      const sx = effect.frame * sheet.frameW;
      const drawW = sheet.frameW * tuning.drawScale;
      const drawH = sheet.frameH * tuning.drawScale;
      ctx.translate(effect.x, effect.y);
      ctx.scale(effect.facing, 1);
      ctx.drawImage(sheet.image, sx, 0, sheet.frameW, sheet.frameH, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      const box = effectBox(effect);
      ctx.strokeStyle = "rgba(142,232,255,0.72)";
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.w, box.h);
    }

    ctx.restore();
  }
}

export function updateSkill3Effect() {
  const eff = state.skill3Effect;
  if (!eff) return;
  eff.elapsed += 1;
  const rawFrame = Math.floor(eff.elapsed / SKILL3_EFFECT_CONFIG.frameDuration);
  eff.frame = rawFrame % SKILL3_EFFECT_SHEET.count;
}

export function drawSkill3Effect() {
  if (!ctx) return;
  const eff = state.skill3Effect;
  if (!eff) return;
  const sheet = SKILL3_EFFECT_SHEET;
  if (!sheet.image) return;
  const p = state.player;
  const drawW = sheet.frameW * SKILL3_EFFECT_CONFIG.drawScale;
  const drawH = sheet.frameH * SKILL3_EFFECT_CONFIG.drawScale;
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h - SKILL3_EFFECT_CONFIG.centerYOffset;
  const sx = eff.frame * sheet.frameW;
  ctx.save();
  ctx.globalAlpha = eff.alpha;
  ctx.drawImage(sheet.image, sx, 0, sheet.frameW, sheet.frameH, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
  ctx.restore();
}

export function drawUltimateTrails() {
  if (!ctx) return;
  for (const trail of state.ultimateTrails) {
    const t = trail.life / trail.maxLife;
    const ripple = Math.sin(trail.phase + trail.life * 0.5) * 2;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.08 + t * 0.2;
    ctx.strokeStyle = "rgba(126, 226, 255, 0.72)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(
      trail.x,
      trail.y + ripple,
      trail.width * (0.65 + (1 - t) * 0.35),
      trail.height * (0.8 + (1 - t) * 0.5),
      0,
      0,
      FULL_CIRCLE_RADIANS,
    );
    ctx.stroke();
    ctx.globalAlpha = 0.06 + t * 0.12;
    ctx.fillStyle = "rgba(156, 242, 255, 0.5)";
    ctx.translate(trail.x, trail.y);
    ctx.scale(trail.facing, 1);
    ctx.fillRect(-trail.width * 0.45, -1, trail.width * 0.5, 2);
    ctx.restore();
  }
}

export function drawUltimateEffects() {
  if (!ctx) return;
  const sheet = ULTIMATE_SKILL_EFFECT_SHEET;
  if (!sheet.image) return;
  const drawW = sheet.frameW * PLAYER_COMBAT.ultimateEffectDrawScale;
  const drawH = sheet.frameH * PLAYER_COMBAT.ultimateEffectDrawScale;
  const p = state.player;
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h - PLAYER_COMBAT.ultimateEffectYOffset;
  for (const eff of state.ultimateEffects) {
    const sx = eff.frame * sheet.frameW;
    const openingFrames = sheet.count * PLAYER_COMBAT.ultimateEffectFrameDuration;
    const lifeRatio = eff.life / eff.maxLife;
    const alpha = eff.elapsed <= openingFrames
      ? 0.42
      : Math.max(0.12, Math.min(0.28, lifeRatio * 0.32));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(cx, cy);
    ctx.scale(eff.facing, 1);
    ctx.drawImage(sheet.image, sx, 0, sheet.frameW, sheet.frameH, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }
}

export function drawUltimateAfterimageSlashes() {
  if (!ctx) return;
  for (const slash of state.ultimateAfterimageSlashes) {
    const t = slash.life / slash.maxLife;
    const alpha = Math.min(0.52, (0.16 + t * 0.42) * slash.power);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha;
    ctx.translate(slash.x, slash.y);
    ctx.scale(slash.facing, 1);
    ctx.strokeStyle = "rgba(186, 246, 255, 0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-slash.w / 2, slash.h * 0.25);
    ctx.quadraticCurveTo(-slash.w * 0.08, -slash.h * 0.68, slash.w / 2, -slash.h * 0.2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(93, 196, 255, 0.62)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-slash.w * 0.36, slash.h * 0.46);
    ctx.quadraticCurveTo(0, -slash.h * 0.08, slash.w * 0.42, slash.h * 0.1);
    ctx.stroke();
    ctx.restore();
  }
}
