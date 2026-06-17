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
  BossState,
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
import { clamp, hitbox, overlapHitPoint, type RectLike } from "../utils";
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
const RAIN_LINE_PLAYER_CLEARANCE = 16;
const RAIN_LINE_FORWARD_SPACING = 42;
const VORTEX_CAST_FORWARD_OFFSET = 86;
const VORTEX_GROUND_Y_OFFSET = 16;
const VORTEX_VERTICAL_RADIUS_SCALE = 0.58;
const VORTEX_MIN_PULL_SCALE = 0.72;
const VORTEX_CORE_PULL_SCALE = 0.38;
const VORTEX_MIN_PULL_DELTA = 0.1;
const ARMOR_BREAK_FALLBACK_Y_RATIO = 0.54;
const GENERIC_SKILL_DAMAGE_ATTACK_BONUS_SCALE = 0.025;
const ARMOR_BREAK_PROJECTILE_SPEED = 8.5;
const ARMOR_BREAK_SPAWN_FORWARD_OFFSET = 28;
const ARMOR_BREAK_IMPACT_FRAME_START = 1;
const DASH_REPOSITION_DURATION_FRAMES = 8;
const DASH_REPOSITION_TRAIL_EXTRA_LIFE = 6;
const DASH_REPOSITION_SLASH_Y_RATIO = 0.56;
const DASH_REPOSITION_SLASH_EDGE_INSET = 10;
const DASH_REPOSITION_BACK_HIT_TOLERANCE = 8;

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

function rectFeetPoint(rect: { x: number; y: number; w: number; h: number }) {
  return {
    x: rect.x + rect.w / 2,
    y: rect.y + rect.h,
  };
}

function vortexContainment(effect: PlayerSkillEffectState, pointX: number, pointY: number) {
  const radiusX = effect.w / 2;
  const radiusY = Math.max(1, effect.h / 2);
  const dx = (pointX - effect.x) / radiusX;
  const dy = (pointY - effect.y) / radiusY;
  const distanceSq = dx * dx + dy * dy;
  return distanceSq <= 1 ? Math.sqrt(distanceSq) : null;
}

function drawEnemyIntoVortex(effect: PlayerSkillEffectState, enemy: EnemyState, pull: number, slow: number, distanceRatio: number) {
  const center = enemyCenter(enemy);
  const dx = effect.x - center.x;
  if (Math.abs(dx) > VORTEX_MIN_PULL_DELTA) {
    const pullScale = VORTEX_MIN_PULL_SCALE + (1 - distanceRatio) * VORTEX_CORE_PULL_SCALE;
    enemy.x += Math.sign(dx) * Math.min(Math.abs(dx), pull * pullScale);
  }
  enemy.vx *= slow;
}

function playerSkillSheetFrame(effect: PlayerSkillEffectState) {
  const sheet = PLAYER_SKILL_EFFECT_SHEETS[effect.skillId];
  const tuning = isGenericPlayerSkillId(effect.skillId) ? GENERIC_PLAYER_SKILL_TUNING[effect.skillId] : null;
  if (!sheet || !tuning) return 0;
  if (tuning.kind === "vortex") return Math.floor(effect.elapsed / tuning.frameDuration) % sheet.count;
  if (tuning.kind === "armorBreak") {
    if (effect.phase === "impact") {
      return Math.min(
        sheet.count - 1,
        ARMOR_BREAK_IMPACT_FRAME_START + Math.floor(effect.elapsed / tuning.frameDuration),
      );
    }
    return 0;
  }
  return Math.min(sheet.count - 1, Math.floor(effect.elapsed / tuning.frameDuration));
}

function refundSkillGroupById(refundGroupId: number | undefined, hitTargets: number, bossHit: boolean) {
  if (!refundGroupId) return;
  const groupAlreadyRefunded = state.playerSkillEffects.some((candidate) => (
    candidate.refundGroupId === refundGroupId && candidate.refundedSkillEnergy
  ));
  if (groupAlreadyRefunded) return;
  if (!applySkillHitEquipmentRefund(state, hitTargets, bossHit)) return;

  for (const candidate of state.playerSkillEffects) {
    if (candidate.refundGroupId === refundGroupId) {
      candidate.refundedSkillEnergy = true;
    }
  }
}

function refundSkillGroup(effect: PlayerSkillEffectState, hitTargets: number, bossHit: boolean) {
  refundSkillGroupById(effect.refundGroupId, hitTargets, bossHit);
}

function applyArmorBreakToEnemy(enemy: EnemyState, duration: number, multiplier: number) {
  enemy.armorBreakTimer = Math.max(enemy.armorBreakTimer ?? 0, duration);
  enemy.armorBreakMultiplier = Math.max(enemy.armorBreakMultiplier ?? 1, multiplier);
}

function applyArmorBreakToBoss(duration: number, multiplier: number) {
  if (!state.boss) return;
  state.boss.armorBreakTimer = Math.max(state.boss.armorBreakTimer ?? 0, duration);
  state.boss.armorBreakMultiplier = Math.max(state.boss.armorBreakMultiplier ?? 1, multiplier);
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

export function finishDashRepositionSkill(
  level: SkillLevel,
  castDamageMultiplier: number,
  refundGroupId: number,
  facing: number,
  hitEnemies: EnemyState[] = [],
  bossHit = false,
) {
  const player = state.player;
  const tuning = GENERIC_PLAYER_SKILL_TUNING[SKILL_IDS.dashReposition];
  const slashW = valueForSkillLevel(tuning.width, level);
  const slashH = valueForSkillLevel(tuning.height, level);
  const slashX = facing === 1
    ? player.x + player.w + slashW / 2 - DASH_REPOSITION_SLASH_EDGE_INSET
    : player.x - slashW / 2 + DASH_REPOSITION_SLASH_EDGE_INSET;

  state.playerSkillEffects.push(makeGenericEffect(
    SKILL_IDS.dashReposition,
    level,
    castDamageMultiplier,
    slashX,
    player.y + player.h * DASH_REPOSITION_SLASH_Y_RATIO,
    {
      w: slashW,
      h: slashH,
      facing,
      refundGroupId,
      hitEnemies: [...hitEnemies],
      bossCooldown: bossHit ? tuning.bossHitCooldown : undefined,
    },
  ));
}

export function damageDashRepositionTravel(previousX: number, previousY: number, nextX: number, nextY: number) {
  const player = state.player;
  const dash = player.dashReposition;
  if (!dash) return;

  const box = {
    x: Math.min(previousX, nextX),
    y: Math.min(previousY, nextY),
    w: Math.abs(nextX - previousX) + player.w,
    h: Math.abs(nextY - previousY) + player.h,
  };
  const startCenterX = dash.startX + player.w / 2;
  const damage = genericSkillDamage(SKILL_IDS.dashReposition, dash.level, dash.damageMultiplier);
  const bossDamage = genericSkillDamage(SKILL_IDS.dashReposition, dash.level, dash.damageMultiplier, true);
  const tuning = GENERIC_PLAYER_SKILL_TUNING[SKILL_IDS.dashReposition];
  let hitTargets = 0;
  let bossHit = false;

  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];
    if (dash.hitEnemies.includes(enemy)) continue;
    const center = enemyCenter(enemy);
    if ((center.x - startCenterX) * dash.facing < -DASH_REPOSITION_BACK_HIT_TOLERANCE) continue;
    if (!hitbox(box, enemy)) continue;

    dash.hitEnemies.push(enemy);
    const { x: hitX, y: hitY } = overlapHitPoint(box, enemy);
    damageEnemy(enemy, damage, tuning.hitCooldown);
    hitTargets += 1;
    emitSlash(hitX, hitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, enemy.w);
    emitHitBurst(hitX, hitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, PLAYER_COMBAT.skillEnemyBurstPower);
    resolveEnemyDefeat(enemy, i, "enemyNoCover");
  }

  if (state.boss && !dash.bossHit) {
    const bossCenterX = state.boss.x + state.boss.w / 2;
    if ((bossCenterX - startCenterX) * dash.facing >= -DASH_REPOSITION_BACK_HIT_TOLERANCE && hitbox(box, state.boss)) {
      dash.bossHit = true;
      bossHit = true;
      const { x: hitX, y: hitY } = overlapHitPoint(box, state.boss);
      damageBoss(state.boss, bossDamage, tuning.bossHitCooldown);
      emitSlash(hitX, hitY, PLAYER_COMBAT.effects.skillBossSlashColor);
      emitHitBurst(hitX, hitY, PLAYER_COMBAT.effects.skillBossBurstColor, PLAYER_COMBAT.skillBossBurstPower);
      defeatBoss();
    }
  }

  if (hitTargets > 0 || bossHit) {
    refundSkillGroupById(dash.refundGroupId, dash.hitEnemies.length, dash.bossHit);
  }
}

function forwardTargetDistance(target: RectLike, sourceX: number, facing: number) {
  return facing === 1
    ? Math.max(0, target.x - sourceX)
    : Math.max(0, sourceX - (target.x + target.w));
}

function armorBreakHitPoint(target: RectLike, effect: PlayerSkillEffectState) {
  return {
    x: clamp(effect.x, target.x, target.x + target.w),
    y: clamp(effect.y, target.y, target.y + target.h),
  };
}

type ArmorBreakCollision =
  | { type: "enemy"; enemy: EnemyState; enemyIndex: number; distance: number }
  | { type: "boss"; boss: NonNullable<BossState>; distance: number };

function armorBreakTravelBox(effect: PlayerSkillEffectState, previousX: number, previousY: number): RectLike {
  const previous = rectFromCenter(previousX, previousY, effect.w, effect.h);
  const current = effectBox(effect);
  const left = Math.min(previous.x, current.x);
  const top = Math.min(previous.y, current.y);
  const right = Math.max(previous.x + previous.w, current.x + current.w);
  const bottom = Math.max(previous.y + previous.h, current.y + current.h);
  return {
    x: left,
    y: top,
    w: right - left,
    h: bottom - top,
  };
}

function findArmorBreakCollision(effect: PlayerSkillEffectState, travelBox: RectLike): ArmorBreakCollision | null {
  const originX = effect.originX ?? effect.x;
  const maxDistance = effect.maxDistance ?? Number.POSITIVE_INFINITY;
  let best: ArmorBreakCollision | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];
    if (!hitbox(travelBox, enemy)) continue;
    const dist = forwardTargetDistance(enemy, originX, effect.facing);
    if (dist > maxDistance || dist >= bestDistance) continue;
    bestDistance = dist;
    best = { type: "enemy", enemy, enemyIndex: i, distance: dist };
  }

  if (state.boss) {
    const dist = forwardTargetDistance(state.boss, originX, effect.facing);
    if (hitbox(travelBox, state.boss) && dist <= maxDistance && dist < bestDistance) {
      best = { type: "boss", boss: state.boss, distance: dist };
    }
  }

  return best;
}

function rainLineTargets(count: number) {
  const player = state.player;
  const playerCenterX = player.x + player.w / 2;
  const sheet = PLAYER_SKILL_EFFECT_SHEETS[SKILL_IDS.antiAirMulti]!;
  const tuning = GENERIC_PLAYER_SKILL_TUNING[SKILL_IDS.antiAirMulti];
  const firstForwardOffset = player.w / 2 + sheet.frameW * tuning.drawScale / 2 + RAIN_LINE_PLAYER_CLEARANCE;
  const lastForwardOffset = firstForwardOffset + RAIN_LINE_FORWARD_SPACING * Math.max(0, count - 1);
  const candidates = state.enemies
    .map((enemy) => {
      const center = enemyCenter(enemy);
      const forwardDistance = (center.x - playerCenterX) * player.facing;
      const airborne = enemy.y + enemy.h < GROUND_Y - 24 ? 90 : 0;
      const caster = enemy.casterPhase === "windup" || enemy.casterPhase === "cast" ? 55 : 0;
      const lowHp = enemy.hp <= (state.player.baseAttack + state.player.attackBonus) * 1.4 ? 35 : 0;
      const distancePenalty = Math.abs(center.x - playerCenterX) * 0.05;
      return { x: center.x, y: center.y, score: airborne + caster + lowHp - distancePenalty, forwardDistance };
    })
    .filter((target) => target.forwardDistance >= firstForwardOffset && target.forwardDistance <= lastForwardOffset)
    .sort((a, b) => b.score - a.score);

  const targets = candidates.slice(0, count).map((target) => ({ x: target.x, y: target.y }));
  while (targets.length < count) {
    const forwardOffset = firstForwardOffset + targets.length * RAIN_LINE_FORWARD_SPACING;
    targets.push({
      x: clamp(playerCenterX + player.facing * forwardOffset, 30, WIDTH - 30),
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
    const targetX = dashDestination(distance);
    player.vx = 0;
    player.dashReposition = {
      startX: player.x,
      targetX,
      elapsed: 0,
      duration: DASH_REPOSITION_DURATION_FRAMES,
      level,
      damageMultiplier: castDamageMultiplier,
      refundGroupId,
      facing: player.facing,
      hitEnemies: [],
      bossHit: false,
    };

    const trailLife = DASH_REPOSITION_DURATION_FRAMES + DASH_REPOSITION_TRAIL_EXTRA_LIFE;
    state.playerSkillEffects.push(makeGenericEffect(
      skillId,
      level,
      castDamageMultiplier,
      (player.x + targetX + player.w) / 2,
      player.y + player.h * DASH_REPOSITION_SLASH_Y_RATIO,
      {
        w: Math.abs(targetX - player.x) + player.w,
        h: valueForSkillLevel(tuning.height, level),
        life: trailLife,
        maxLife: trailLife,
        damage: 0,
        bossDamage: 0,
        refundGroupId,
        visualOnly: true,
      },
    ));
    return true;
  }

  if (skillId === SKILL_IDS.vortexControl) {
    const radius = valueForSkillLevel(tuning.radius ?? tuning.width, level);
    const vortexX = clamp(playerCenterX + player.facing * VORTEX_CAST_FORWARD_OFFSET, radius, WIDTH - radius);
    state.playerSkillEffects.push(makeGenericEffect(skillId, level, castDamageMultiplier, vortexX, feetY - VORTEX_GROUND_Y_OFFSET, {
      w: radius * 2,
      h: radius * 2 * VORTEX_VERTICAL_RADIUS_SCALE,
      refundGroupId,
    }));
    return true;
  }

  if (skillId === SKILL_IDS.armorBreak) {
    const range = valueForSkillLevel(tuning.distance ?? tuning.width, level);
    const startX = clamp(
      playerCenterX + player.facing * ARMOR_BREAK_SPAWN_FORWARD_OFFSET,
      0,
      WIDTH,
    );
    const startY = player.y + player.h * ARMOR_BREAK_FALLBACK_Y_RATIO;
    state.playerSkillEffects.push(makeGenericEffect(skillId, level, castDamageMultiplier, startX, startY, {
      refundGroupId,
      phase: "out",
      vx: player.facing * ARMOR_BREAK_PROJECTILE_SPEED,
      originX: playerCenterX,
      originY: startY,
      maxDistance: range,
      traveled: 0,
      armorBreakDuration: valueForSkillLevel(tuning.armorBreakDuration ?? tuning.life, level),
      armorBreakMultiplier: valueForSkillLevel(tuning.armorBreakMultiplier ?? tuning.damageMultiplier, level),
      armorBreakBossMultiplier: valueForSkillLevel(tuning.armorBreakBossMultiplier ?? tuning.bossDamageMultiplier, level),
    }));
    return true;
  }

  if (skillId === SKILL_IDS.antiAirMulti) {
    const count = valueForSkillLevel(tuning.count ?? tuning.life, level);
    for (const target of rainLineTargets(count)) {
      state.playerSkillEffects.push(makeGenericEffect(skillId, level, castDamageMultiplier, target.x, target.y - 44, {
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

function armorBreakImpactLife(effect: PlayerSkillEffectState) {
  const sheet = PLAYER_SKILL_EFFECT_SHEETS[effect.skillId];
  const tuning = isGenericPlayerSkillId(effect.skillId) ? GENERIC_PLAYER_SKILL_TUNING[effect.skillId] : null;
  const impactFrames = Math.max(1, (sheet?.count ?? 1) - ARMOR_BREAK_IMPACT_FRAME_START);
  return impactFrames * (tuning?.frameDuration ?? 1);
}

function triggerArmorBreakImpact(effect: PlayerSkillEffectState, collision: ArmorBreakCollision) {
  const target = collision.type === "enemy" ? collision.enemy : collision.boss;
  const { x, y } = armorBreakHitPoint(target, effect);
  effect.x = x;
  effect.y = y;
  effect.vx = 0;
  effect.vy = 0;
  effect.phase = "impact";
  effect.elapsed = 0;
  effect.frame = ARMOR_BREAK_IMPACT_FRAME_START;
  effect.life = armorBreakImpactLife(effect);
  effect.maxLife = effect.life;

  if (collision.type === "enemy") {
    effect.hitEnemies.push(collision.enemy);
    damageEnemy(collision.enemy, effect.damage, effect.hitCooldown);
    applyArmorBreakToEnemy(collision.enemy, effect.armorBreakDuration ?? 0, effect.armorBreakMultiplier ?? 1);
    emitSlash(x, y, DEFAULT_HIT_BURST_COLOR, collision.enemy.w);
    emitHitBurst(x, y, PLAYER_COMBAT.effects.skillEnemyBurstColor, PLAYER_COMBAT.skillEnemyBurstPower);
    resolveEnemyDefeat(collision.enemy, collision.enemyIndex, "enemyNoCover");
    refundSkillGroup(effect, 1, false);
    return;
  }

  damageBoss(collision.boss, effect.bossDamage, effect.bossHitCooldown);
  applyArmorBreakToBoss(effect.armorBreakDuration ?? 0, effect.armorBreakBossMultiplier ?? 1);
  emitSlash(x, y, PLAYER_COMBAT.effects.skillBossSlashColor);
  emitHitBurst(x, y, PLAYER_COMBAT.effects.skillBossBurstColor, PLAYER_COMBAT.skillBossBurstPower);
  defeatBoss();
  refundSkillGroup(effect, 0, true);
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
  const tuning = isGenericPlayerSkillId(effect.skillId)
    ? GENERIC_PLAYER_SKILL_TUNING[effect.skillId]
    : null;
  const level = isGenericPlayerSkillId(effect.skillId) ? genericSkillLevel(effect.skillId) : 1;
  const pull = tuning ? valueForSkillLevel(tuning.pull ?? tuning.width, level) : 0;
  const slow = tuning ? valueForSkillLevel(tuning.slow ?? tuning.life, level) : 1;
  let hitTargets = 0;
  let bossHit = false;

  for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
    const enemy = state.enemies[j];
    const foot = rectFeetPoint(enemy);
    const distanceRatio = vortexContainment(effect, foot.x, foot.y);
    if (distanceRatio === null) continue;

    drawEnemyIntoVortex(effect, enemy, pull, slow, distanceRatio);
    if (hasLocalEnemyCooldown(effect, enemy)) continue;

    setLocalEnemyCooldown(effect, enemy);
    applyEffectDamageToEnemy(effect, enemy, j);
    hitTargets += 1;
  }

  if (state.boss) {
    const foot = rectFeetPoint(state.boss);
    if (vortexContainment(effect, foot.x, foot.y) !== null && !effect.bossCooldown) {
      bossHit = applyEffectDamageToBoss(effect);
      effect.bossCooldown = effect.bossHitCooldown;
    }
  }

  refundSkillGroup(effect, hitTargets, bossHit);
}

function updateArmorBreakEffect(effect: PlayerSkillEffectState) {
  if (effect.phase === "impact") return;

  const previousX = effect.x;
  const previousY = effect.y;
  effect.x += effect.vx;
  effect.y += effect.vy;
  effect.traveled = (effect.traveled ?? 0) + Math.hypot(effect.x - previousX, effect.y - previousY);

  const collision = findArmorBreakCollision(effect, armorBreakTravelBox(effect, previousX, previousY));
  if (collision) {
    triggerArmorBreakImpact(effect, collision);
    return;
  }

  if ((effect.traveled ?? 0) >= (effect.maxDistance ?? 0)) {
    effect.life = 0;
  }
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
    effect.frame = playerSkillSheetFrame(effect);
    tickEffectCooldowns(effect);

    if (effect.visualOnly) {
      effect.x += effect.vx;
      effect.y += effect.vy;
    } else if (effect.kind === "vortex") {
      updateVortexEffect(effect);
    } else if (effect.kind === "armorBreak") {
      updateArmorBreakEffect(effect);
    } else if (effect.kind === "returningBlade") {
      updateReturningBladeEffect(effect);
    } else {
      effect.x += effect.vx;
      effect.y += effect.vy;
      updateOneShotBoxEffect(effect);
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
  if (eff.barrierFlash > 0) eff.barrierFlash -= 1;
  if (eff.hitsRemaining <= 0 && eff.barrierFlash <= 0) {
    state.skill3Effect = null;
    return;
  }

  if (eff.barrierFlash > 0) {
    const flashElapsed = SKILL3_EFFECT_CONFIG.barrierFlashFrames - eff.barrierFlash;
    eff.frame = Math.min(
      SKILL3_EFFECT_SHEET.count - 1,
      Math.floor(flashElapsed / SKILL3_EFFECT_CONFIG.barrierFrameDuration),
    );
    return;
  }

  const rawFrame = Math.floor(eff.elapsed / SKILL3_EFFECT_CONFIG.frameDuration);
  eff.frame = eff.elapsed < SKILL3_EFFECT_CONFIG.startupFrames
    ? Math.min(SKILL3_EFFECT_SHEET.count - 1, rawFrame)
    : rawFrame % SKILL3_EFFECT_SHEET.count;
}

export function drawSkill3Effect() {
  if (!ctx) return;
  const eff = state.skill3Effect;
  if (!eff) return;
  const sheet = SKILL3_EFFECT_SHEET;
  const p = state.player;
  const cx = p.x + p.w / 2;
  const feetY = p.y + p.h;
  const remainingRatio = Math.max(0, eff.hitsRemaining / SKILL3_EFFECT_CONFIG.maxHits);
  const showStartupBarrier = eff.elapsed < SKILL3_EFFECT_CONFIG.startupFrames;
  const showHitBarrier = eff.barrierFlash > 0;

  if (sheet.image && (showStartupBarrier || showHitBarrier)) {
    const scale = showHitBarrier ? SKILL3_EFFECT_CONFIG.barrierDrawScale : SKILL3_EFFECT_CONFIG.drawScale;
    const centerYOffset = showHitBarrier ? SKILL3_EFFECT_CONFIG.barrierCenterYOffset : SKILL3_EFFECT_CONFIG.centerYOffset;
    const drawW = sheet.frameW * scale;
    const drawH = sheet.frameH * scale;
    const cy = feetY - centerYOffset;
    const sx = eff.frame * sheet.frameW;
    const barrierRatio = showHitBarrier
      ? eff.barrierFlash / SKILL3_EFFECT_CONFIG.barrierFlashFrames
      : 1 - eff.elapsed / SKILL3_EFFECT_CONFIG.startupFrames;
    ctx.save();
    ctx.globalAlpha = Math.min(
      SKILL3_EFFECT_CONFIG.barrierAlphaMax,
      SKILL3_EFFECT_CONFIG.barrierAlphaMin
        + barrierRatio * (SKILL3_EFFECT_CONFIG.barrierAlphaMax - SKILL3_EFFECT_CONFIG.barrierAlphaMin),
    );
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(sheet.image, sx, 0, sheet.frameW, sheet.frameH, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
    ctx.restore();
  }

  const pulse = (Math.sin(eff.elapsed * SKILL3_EFFECT_CONFIG.ripplePulseSpeed) + 1) / 2;
  const rippleAlpha = SKILL3_EFFECT_CONFIG.rippleAlphaMin + remainingRatio * SKILL3_EFFECT_CONFIG.rippleAlphaRange;
  const rippleW = SKILL3_EFFECT_CONFIG.rippleWidth + pulse * SKILL3_EFFECT_CONFIG.ripplePulseWidth;
  const rippleH = SKILL3_EFFECT_CONFIG.rippleHeight + pulse * SKILL3_EFFECT_CONFIG.ripplePulseHeight;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(155,230,255,${rippleAlpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, feetY - SKILL3_EFFECT_CONFIG.rippleYOffset, rippleW / 2, rippleH / 2, 0, 0, FULL_CIRCLE_RADIANS);
  ctx.stroke();
  ctx.strokeStyle = `rgba(210,248,255,${rippleAlpha * SKILL3_EFFECT_CONFIG.rippleInnerAlphaScale})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(
    cx,
    feetY - SKILL3_EFFECT_CONFIG.rippleYOffset,
    rippleW * SKILL3_EFFECT_CONFIG.rippleInnerWidthScale,
    rippleH * SKILL3_EFFECT_CONFIG.rippleInnerHeightScale,
    0,
    0,
    FULL_CIRCLE_RADIANS,
  );
  ctx.stroke();
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
