import { state } from "../../game/state";
import { GROUND_Y, PLAYER_COMBAT, SKILL_IDS, WIDTH } from "../../constants";
import type { BossState, EnemyState, PlayerSkillEffectState, SkillLevel } from "../../types/game-state";
import { clamp, hitbox, type RectLike } from "../../game/utils";
import { applySkillHitEquipmentRefund } from "../../systems/equipment";
import {
  GENERIC_PLAYER_SKILL_TUNING,
  isGenericPlayerSkillId,
  rectFromCenter,
  valueForSkillLevel,
  type GenericPlayerSkillId,
} from "../../systems/playerSkills";
import { playerSkillEffectSheet } from "../../systems/skillCatalog";

export const DEFAULT_HIT_BURST_COLOR = "#9feaff";
export const RETURNING_BLADE_SPEED = 8;
export const RAIN_LINE_EFFECT_Y_OFFSET = 44;
export const RAIN_LINE_TARGET_LEAD_FRAMES = 6;
export const RAIN_LINE_TARGET_MAX_FORWARD_DISTANCE = 380;
export const RAIN_LINE_FALLBACK_FORWARD_DISTANCE = 300;
export const RAIN_LINE_FALLBACK_SPREAD = 70;
export const RAIN_LINE_FALLBACK_SPACING = 28;
export const RAIN_LINE_TARGET_SIDE_OFFSET = 28;
export const RAIN_LINE_TARGET_X_SCATTER = 8;
export const RAIN_LINE_TARGET_Y_SCATTER = 7;
export const RAIN_LINE_ANIM_STAGGER_FRAMES = 2;
export const RAIN_LINE_ANIM_STAGGER_CYCLE = 8;
export const RAIN_LINE_MAX_PREDICT_X = 36;
export const RAIN_LINE_TARGET_Y_BIAS = 0.15;
export const RAIN_LINE_EFFECT_BOTTOM_TRANSPARENT_PX = 18;
export const VORTEX_CAST_FORWARD_OFFSET = 86;
export const VORTEX_GROUND_Y_OFFSET = 16;
export const VORTEX_VERTICAL_RADIUS_SCALE = 0.58;
export const VORTEX_MIN_PULL_SCALE = 0.72;
export const VORTEX_CORE_PULL_SCALE = 0.38;
export const VORTEX_MIN_PULL_DELTA = 0.1;
export const ARMOR_BREAK_FALLBACK_Y_RATIO = 0.54;
export const GENERIC_SKILL_DAMAGE_ATTACK_BONUS_SCALE = 0.025;
export const ARMOR_BREAK_PROJECTILE_SPEED = 8.5;
export const ARMOR_BREAK_SPAWN_FORWARD_OFFSET = 28;
export const ARMOR_BREAK_IMPACT_FRAME_START = 1;
export const DASH_REPOSITION_DURATION_FRAMES = 8;
export const DASH_REPOSITION_TRAIL_EXTRA_LIFE = 6;
export const DASH_REPOSITION_SLASH_Y_RATIO = 0.56;
export const DASH_REPOSITION_SLASH_EDGE_INSET = 10;
export const DASH_REPOSITION_BACK_HIT_TOLERANCE = 8;

export function genericSkillLevel(skillId: GenericPlayerSkillId): SkillLevel {
  return state.player.skillLevels[skillId] ?? 1;
}

export function genericSkillDamage(skillId: GenericPlayerSkillId, level: SkillLevel, castDamageMultiplier: number, boss = false) {
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

export function effectBox(effect: PlayerSkillEffectState) {
  return rectFromCenter(effect.x, effect.y, effect.w, effect.h);
}

export function enemyCenter(enemy: EnemyState) {
  return {
    x: enemy.x + enemy.w / 2,
    y: enemy.y + enemy.h / 2,
  };
}

export function rectFeetPoint(rect: { x: number; y: number; w: number; h: number }) {
  return {
    x: rect.x + rect.w / 2,
    y: rect.y + rect.h,
  };
}

export function vortexContainment(effect: PlayerSkillEffectState, pointX: number, pointY: number) {
  const radiusX = effect.w / 2;
  const radiusY = Math.max(1, effect.h / 2);
  const dx = (pointX - effect.x) / radiusX;
  const dy = (pointY - effect.y) / radiusY;
  const distanceSq = dx * dx + dy * dy;
  return distanceSq <= 1 ? Math.sqrt(distanceSq) : null;
}

export function drawEnemyIntoVortex(effect: PlayerSkillEffectState, enemy: EnemyState, pull: number, slow: number, distanceRatio: number) {
  const center = enemyCenter(enemy);
  const dx = effect.x - center.x;
  if (Math.abs(dx) > VORTEX_MIN_PULL_DELTA) {
    const pullScale = VORTEX_MIN_PULL_SCALE + (1 - distanceRatio) * VORTEX_CORE_PULL_SCALE;
    enemy.x += Math.sign(dx) * Math.min(Math.abs(dx), pull * pullScale);
  }
  enemy.vx *= slow;
}

export function playerSkillSheetFrame(effect: PlayerSkillEffectState) {
  const sheet = playerSkillEffectSheet(effect.skillId);
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

export function refundSkillGroupById(refundGroupId: number | undefined, hitTargets: number, bossHit: boolean) {
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

export function refundSkillGroup(effect: PlayerSkillEffectState, hitTargets: number, bossHit: boolean) {
  refundSkillGroupById(effect.refundGroupId, hitTargets, bossHit);
}

export function applyArmorBreakToEnemy(enemy: EnemyState, duration: number, multiplier: number) {
  enemy.armorBreakTimer = Math.max(enemy.armorBreakTimer ?? 0, duration);
  enemy.armorBreakMultiplier = Math.max(enemy.armorBreakMultiplier ?? 1, multiplier);
}

export function applyArmorBreakToBoss(duration: number, multiplier: number) {
  if (!state.boss) return;
  state.boss.armorBreakTimer = Math.max(state.boss.armorBreakTimer ?? 0, duration);
  state.boss.armorBreakMultiplier = Math.max(state.boss.armorBreakMultiplier ?? 1, multiplier);
}

export function makeGenericEffect(
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

export function dashDestination(distance: number) {
  const player = state.player;
  let minX = 0;
  let maxX = WIDTH - player.w;
  if (player.onPlatform && state.platforms.includes(player.onPlatform)) {
    minX = player.onPlatform.x + PLAYER_COMBAT.platformEdgePadding;
    maxX = player.onPlatform.x + player.onPlatform.w - player.w - PLAYER_COMBAT.platformEdgePadding;
  }
  return clamp(player.x + player.facing * distance, minX, maxX);
}

export function forwardTargetDistance(target: RectLike, sourceX: number, facing: number) {
  return facing === 1
    ? Math.max(0, target.x - sourceX)
    : Math.max(0, sourceX - (target.x + target.w));
}

export function armorBreakHitPoint(target: RectLike, effect: PlayerSkillEffectState) {
  return {
    x: clamp(effect.x, target.x, target.x + target.w),
    y: clamp(effect.y, target.y, target.y + target.h),
  };
}

export type ArmorBreakCollision =
  | { type: "enemy"; enemy: EnemyState; enemyIndex: number; distance: number }
  | { type: "boss"; boss: NonNullable<BossState>; distance: number };

type RainLineCandidate = {
  x: number;
  y: number;
  vx: number;
  score: number;
  forwardDistance: number;
};

type RainLineTarget = {
  x: number;
  y: number;
  elapsed: number;
};

export function armorBreakTravelBox(effect: PlayerSkillEffectState, previousX: number, previousY: number): RectLike {
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

export function findArmorBreakCollision(effect: PlayerSkillEffectState, travelBox: RectLike): ArmorBreakCollision | null {
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

export function rainLineTargets(count: number) {
  const player = state.player;
  const playerCenterX = player.x + player.w / 2;
  const predictX = (vx: number) => clamp(vx * RAIN_LINE_TARGET_LEAD_FRAMES, -RAIN_LINE_MAX_PREDICT_X, RAIN_LINE_MAX_PREDICT_X);
  const lineScatter = (index: number) => ({
    x: player.facing * (index % 2 === 0 ? -RAIN_LINE_TARGET_X_SCATTER : RAIN_LINE_TARGET_X_SCATTER),
    y: (index % 3 - 1) * RAIN_LINE_TARGET_Y_SCATTER,
    elapsed: index * RAIN_LINE_ANIM_STAGGER_FRAMES % RAIN_LINE_ANIM_STAGGER_CYCLE,
  });
  const targetFromCandidate = (candidate: RainLineCandidate, index: number, sideOffset = 0): RainLineTarget => {
    const scatter = lineScatter(index);
    return {
      x: clamp(candidate.x + predictX(candidate.vx) + sideOffset + scatter.x, 30, WIDTH - 30),
      y: candidate.y + scatter.y,
      elapsed: scatter.elapsed,
    };
  };
  const fallbackTarget = (index: number, total: number, lineIndex: number): RainLineTarget => {
    const scatter = lineScatter(lineIndex);
    const spreadX = clamp(
      (index - (total - 1) / 2) * RAIN_LINE_FALLBACK_SPACING,
      -RAIN_LINE_FALLBACK_SPREAD,
      RAIN_LINE_FALLBACK_SPREAD,
    );
    return {
      x: clamp(
        playerCenterX + player.facing * (RAIN_LINE_FALLBACK_FORWARD_DISTANCE + spreadX) + scatter.x,
        30,
        WIDTH - 30,
      ),
      y: state.player.y + 28 + scatter.y,
      elapsed: scatter.elapsed,
    };
  };
  const candidates: RainLineCandidate[] = state.enemies
    .map((enemy) => {
      const center = enemyCenter(enemy);
      const forwardDistance = (center.x - playerCenterX) * player.facing;
      const airborne = enemy.y + enemy.h < GROUND_Y - 24 ? 90 : 0;
      const caster = enemy.casterPhase === "windup" || enemy.casterPhase === "cast" ? 55 : 0;
      const lowHp = enemy.hp <= (state.player.baseAttack + state.player.attackBonus) * 1.4 ? 35 : 0;
      const distancePenalty = forwardDistance * 0.04;
      return {
        x: center.x,
        y: center.y - enemy.h * RAIN_LINE_TARGET_Y_BIAS,
        vx: enemy.vx,
        score: 20 + airborne + caster + lowHp - distancePenalty,
        forwardDistance,
      };
    })
    .filter((target) => target.forwardDistance >= 0 && target.forwardDistance <= RAIN_LINE_TARGET_MAX_FORWARD_DISTANCE);

  if (state.boss) {
    const center = {
      x: state.boss.x + state.boss.w / 2,
      y: state.boss.y + state.boss.h / 2,
    };
    const forwardDistance = (center.x - playerCenterX) * player.facing;
    if (forwardDistance >= 0 && forwardDistance <= RAIN_LINE_TARGET_MAX_FORWARD_DISTANCE) {
      candidates.push({
        x: center.x,
        y: center.y - state.boss.h * RAIN_LINE_TARGET_Y_BIAS,
        vx: state.boss.vx,
        score: 10 - forwardDistance * 0.04,
        forwardDistance,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const targets = candidates.slice(0, count).map((target, index) => targetFromCandidate(target, index));

  for (let index = 0; targets.length < count && index < candidates.length; index += 1) {
    const sideSign = index % 2 === 0 ? 1 : -1;
    targets.push(targetFromCandidate(
      candidates[index],
      targets.length,
      player.facing * sideSign * RAIN_LINE_TARGET_SIDE_OFFSET,
    ));
  }

  const targetedCount = targets.length;
  const fallbackCount = count - targetedCount;
  while (targets.length < count) {
    targets.push(fallbackTarget(targets.length - targetedCount, fallbackCount, targets.length));
  }
  return targets;
}
