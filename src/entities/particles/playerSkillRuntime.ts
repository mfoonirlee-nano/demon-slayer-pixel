import { state } from "../../game/state";
import { ctx } from "../../rendering/context";
import { PLAYER_COMBAT } from "../../constants";
import type { EnemyState, PlayerSkillEffectState } from "../../types/game-state";
import { hitbox } from "../../game/utils";
import { resolveBossHit, resolveEnemyHit } from "../../systems/combatResolution";
import { GENERIC_PLAYER_SKILL_TUNING, isGenericPlayerSkillId, valueForSkillLevel } from "../../systems/playerSkills";
import { playerSkillEffectSheet } from "../../systems/skillCatalog";
import { emitHitBurst, emitSlash } from "./bursts";
import {
  ARMOR_BREAK_IMPACT_FRAME_START,
  DEFAULT_HIT_BURST_COLOR,
  RETURNING_BLADE_SPEED,
  type ArmorBreakCollision,
  applyArmorBreakToBoss,
  applyArmorBreakToEnemy,
  armorBreakHitPoint,
  armorBreakTravelBox,
  drawEnemyIntoVortex,
  effectBox,
  findArmorBreakCollision,
  genericSkillLevel,
  playerSkillSheetFrame,
  rectFeetPoint,
  refundSkillGroup,
  vortexContainment,
} from "./playerSkillShared";

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
  const hit = resolveEnemyHit({
    enemy,
    enemyIndex,
    hitRect: box,
    damage: effect.damage,
    hitCooldown: effect.hitCooldown,
    reward: "enemyNoCover",
  });
  emitSlash(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, enemy.w);
  emitHitBurst(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, PLAYER_COMBAT.skillEnemyBurstPower);
}

function applyEffectDamageToBoss(effect: PlayerSkillEffectState) {
  if (!state.boss) return false;
  const box = effectBox(effect);
  const hit = resolveBossHit({
    boss: state.boss,
    hitRect: box,
    damage: effect.bossDamage,
    hitCooldown: effect.bossHitCooldown,
  });
  emitSlash(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.skillBossSlashColor);
  emitHitBurst(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.skillBossBurstColor, PLAYER_COMBAT.skillBossBurstPower);
  return true;
}

function armorBreakImpactLife(effect: PlayerSkillEffectState) {
  const sheet = playerSkillEffectSheet(effect.skillId);
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
    const hit = resolveEnemyHit({
      enemy: collision.enemy,
      enemyIndex: collision.enemyIndex,
      hitRect: effectBox(effect),
      hitPoint: { x, y },
      damage: effect.damage,
      hitCooldown: effect.hitCooldown,
      reward: "enemyNoCover",
      damageKind: "armorBreak",
      afterDamage: () => applyArmorBreakToEnemy(
        collision.enemy,
        effect.armorBreakDuration ?? 0,
        effect.armorBreakMultiplier ?? 1,
      ),
    });
    emitSlash(hit.hitX, hit.hitY, DEFAULT_HIT_BURST_COLOR, collision.enemy.w);
    emitHitBurst(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, PLAYER_COMBAT.skillEnemyBurstPower);
    refundSkillGroup(effect, 1, false);
    return;
  }

  const hit = resolveBossHit({
    boss: collision.boss,
    hitRect: effectBox(effect),
    hitPoint: { x, y },
    damage: effect.bossDamage,
    hitCooldown: effect.bossHitCooldown,
    afterDamage: () => applyArmorBreakToBoss(
      effect.armorBreakDuration ?? 0,
      effect.armorBreakBossMultiplier ?? 1,
    ),
  });
  emitSlash(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.skillBossSlashColor);
  emitHitBurst(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.skillBossBurstColor, PLAYER_COMBAT.skillBossBurstPower);
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
  const maxEnemyHits = effect.maxHits ?? Number.POSITIVE_INFINITY;

  if (activeHits.length < maxEnemyHits) {
    for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
      const enemy = state.enemies[j];
      if (activeHits.includes(enemy)) continue;
      if (!hitbox(box, enemy)) continue;
      activeHits.push(enemy);
      applyEffectDamageToEnemy(effect, enemy, j);
      hitTargets += 1;
      if (activeHits.length >= maxEnemyHits) break;
    }
  }

  if (state.boss && !effect.bossCooldown && hitbox(box, state.boss)) {
    bossHit = applyEffectDamageToBoss(effect);
    effect.bossCooldown = effect.bossHitCooldown;
  }

  refundSkillGroup(effect, hitTargets, bossHit);

  if (effect.phase !== "return") {
    const distanceReached = (effect.traveled ?? 0) >= (effect.maxDistance ?? 0);
    if (distanceReached) {
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

export function drawPlayerSkillEffects() {
  if (!ctx) return;

  for (const effect of state.playerSkillEffects) {
    const sheet = playerSkillEffectSheet(effect.skillId);
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
      ctx.translate(effect.x, effect.visualY ?? effect.y);
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
