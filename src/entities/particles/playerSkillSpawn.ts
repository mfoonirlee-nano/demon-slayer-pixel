import { state } from "../../game/state";
import {
  ANTI_AIR_MULTI_BONUS_DROP_CONFIG,
  GROUND_Y,
  PLAYER_COMBAT,
  RETURNING_BLADE_WATER_RING_CONFIG,
  SKILL_IDS,
  VERTICAL_WAVE_PILLAR_CONFIG,
  WIDTH,
} from "../../constants";
import type { EnemyState, SkillLevel } from "../../types/game-state";
import type { SkillId } from "../../types/assets";
import { clamp, hitbox } from "../../game/utils";
import { recordCollisionDebugRect } from "../../game/collisionDebug";
import { resolveBossHit, resolveEnemyHit } from "../../systems/combatResolution";
import {
  GENERIC_PLAYER_SKILL_TUNING,
  isGenericPlayerSkillId,
  valueForSkillLevel,
} from "../../systems/playerSkills";
import { playerSkillEffectSheet } from "../../systems/skillCatalog";
import { emitHitBurst, emitSlash } from "./bursts";
import {
  ARMOR_BREAK_FALLBACK_Y_RATIO,
  ARMOR_BREAK_PROJECTILE_SPEED,
  ARMOR_BREAK_SPAWN_FORWARD_OFFSET,
  DASH_REPOSITION_BACK_HIT_TOLERANCE,
  DASH_REPOSITION_DURATION_FRAMES,
  DASH_REPOSITION_SLASH_EDGE_INSET,
  DASH_REPOSITION_SLASH_Y_RATIO,
  DASH_REPOSITION_TRAIL_EXTRA_LIFE,
  RAIN_LINE_EFFECT_BOTTOM_TRANSPARENT_PX,
  RAIN_LINE_EFFECT_Y_OFFSET,
  RETURNING_BLADE_SPAWN_FORWARD_OFFSET,
  RETURNING_BLADE_SPEED,
  VORTEX_CAST_FORWARD_OFFSET,
  VORTEX_GROUND_Y_OFFSET,
  VORTEX_VERTICAL_RADIUS_SCALE,
  dashDestination,
  enemyCenter,
  genericSkillDamage,
  genericSkillLevel,
  makeGenericEffect,
  rainLineTargets,
  refundSkillGroupById,
  returningBladeLife,
  returningBladeOutboundDistance,
} from "./playerSkillShared";

const VERTICAL_WAVE_FORWARD_OFFSET = 34;

let nextPlayerSkillRefundGroupId = 1;

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
  recordCollisionDebugRect(box, "playerAttack");
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
    const hit = resolveEnemyHit({
      enemy,
      enemyIndex: i,
      hitRect: box,
      damage,
      hitCooldown: tuning.hitCooldown,
      reward: "enemyNoCover",
    });
    hitTargets += 1;
    emitSlash(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, enemy.w);
    emitHitBurst(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, PLAYER_COMBAT.skillEnemyBurstPower);
  }

  if (state.boss && !dash.bossHit) {
    const bossCenterX = state.boss.x + state.boss.w / 2;
    if ((bossCenterX - startCenterX) * dash.facing >= -DASH_REPOSITION_BACK_HIT_TOLERANCE && hitbox(box, state.boss)) {
      dash.bossHit = true;
      bossHit = true;
      const hit = resolveBossHit({
        boss: state.boss,
        hitRect: box,
        damage: bossDamage,
        hitCooldown: tuning.bossHitCooldown,
      });
      emitSlash(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.skillBossSlashColor);
      emitHitBurst(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.skillBossBurstColor, PLAYER_COMBAT.skillBossBurstPower);
    }
  }

  if (hitTargets > 0 || bossHit) {
    refundSkillGroupById(dash.refundGroupId, dash.hitEnemies.length, dash.bossHit);
  }
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
    const hasBonusDrop = level >= ANTI_AIR_MULTI_BONUS_DROP_CONFIG.requiredLevel
      && Math.random() < ANTI_AIR_MULTI_BONUS_DROP_CONFIG.chance;
    const targets = rainLineTargets(count);
    if (hasBonusDrop) {
      const bonusTarget = rainLineTargets(count + 1)[count];
      if (bonusTarget) targets.push(bonusTarget);
    }
    const effectLife = valueForSkillLevel(tuning.life, level);
    const sheet = playerSkillEffectSheet(skillId);
    const visualY = sheet
      ? GROUND_Y - sheet.frameH * tuning.drawScale / 2 + RAIN_LINE_EFFECT_BOTTOM_TRANSPARENT_PX * tuning.drawScale
      : undefined;
    for (const [index, target] of targets.entries()) {
      const damageMultiplier = index < count
        ? castDamageMultiplier
        : castDamageMultiplier * ANTI_AIR_MULTI_BONUS_DROP_CONFIG.damageMultiplier;
      const frame = Math.min((sheet?.count ?? 1) - 1, Math.floor(target.elapsed / tuning.frameDuration));
      state.playerSkillEffects.push(makeGenericEffect(skillId, level, damageMultiplier, target.x, target.y - RAIN_LINE_EFFECT_Y_OFFSET, {
        visualY,
        elapsed: target.elapsed,
        frame,
        life: effectLife - target.elapsed,
        maxLife: effectLife,
        refundGroupId,
      }));
    }
    return true;
  }

  if (skillId === SKILL_IDS.returningBlade) {
    const minDistance = valueForSkillLevel(tuning.distance ?? tuning.width, level);
    const startX = playerCenterX + player.facing * RETURNING_BLADE_SPAWN_FORWARD_OFFSET;
    const maxDistance = returningBladeOutboundDistance(startX, player.facing, minDistance);
    const life = returningBladeLife(maxDistance);
    const route = {
      vx: player.facing * RETURNING_BLADE_SPEED,
      phase: "out" as const,
      originX: playerCenterX,
      originY: playerCenterY,
      traveled: 0,
      maxDistance,
      life,
      maxLife: life,
      maxHits: valueForSkillLevel(tuning.maxHits ?? tuning.life, level),
      refundGroupId,
    };

    state.playerSkillEffects.push(makeGenericEffect(skillId, level, castDamageMultiplier, startX, playerCenterY, {
      ...route,
      returnHitEnemies: [],
    }));
    const hasWaterRing = level >= RETURNING_BLADE_WATER_RING_CONFIG.requiredLevel
      && Math.random() < RETURNING_BLADE_WATER_RING_CONFIG.chance;
    if (hasWaterRing) {
      state.playerSkillEffects.push(makeGenericEffect(
        skillId,
        level,
        castDamageMultiplier * RETURNING_BLADE_WATER_RING_CONFIG.damageMultiplier,
        startX,
        playerCenterY,
        {
          ...route,
          kind: "returningBladeWaterRing",
          returnHitEnemies: [],
          startDelay: RETURNING_BLADE_WATER_RING_CONFIG.startDelay,
          frameDuration: RETURNING_BLADE_WATER_RING_CONFIG.frameDuration,
          drawScale: RETURNING_BLADE_WATER_RING_CONFIG.drawScale,
        },
      ));
    }
    return true;
  }

  if (skillId === SKILL_IDS.verticalWave) {
    const waveW = valueForSkillLevel(tuning.width, level);
    const waveH = valueForSkillLevel(tuning.height, level);
    const baseWave = makeGenericEffect(
      skillId,
      level,
      castDamageMultiplier,
      clamp(playerCenterX + player.facing * VERTICAL_WAVE_FORWARD_OFFSET, waveW / 2, WIDTH - waveW / 2),
      feetY - waveH / 2,
      {
        w: waveW,
        h: waveH,
        lift: valueForSkillLevel(tuning.lift ?? tuning.height, level),
        refundGroupId,
      },
    );
    state.playerSkillEffects.push(baseWave);

    const hasPillarChain = level >= VERTICAL_WAVE_PILLAR_CONFIG.requiredLevel
      && Math.random() < VERTICAL_WAVE_PILLAR_CONFIG.chance;
    if (hasPillarChain) {
      for (let index = 0; index < VERTICAL_WAVE_PILLAR_CONFIG.count; index += 1) {
        const forwardOffset = VERTICAL_WAVE_PILLAR_CONFIG.firstForwardOffset
          + index * VERTICAL_WAVE_PILLAR_CONFIG.spacing;
        // Preserve the forward sequence at screen edges; clipping is preferable
        // to clamping multiple pillars onto one point or behind the player.
        const pillarX = playerCenterX + player.facing * forwardOffset;
        state.playerSkillEffects.push(makeGenericEffect(
          skillId,
          level,
          castDamageMultiplier * VERTICAL_WAVE_PILLAR_CONFIG.damageMultiplier,
          pillarX,
          feetY - waveH / 2,
          {
            kind: "verticalWavePillar",
            startDelay: index * VERTICAL_WAVE_PILLAR_CONFIG.staggerFrames,
            frameDuration: VERTICAL_WAVE_PILLAR_CONFIG.frameDuration,
            life: VERTICAL_WAVE_PILLAR_CONFIG.activeLifeFrames,
            refundGroupId,
          },
        ));
      }
    }
    return true;
  }

  return false;
}
