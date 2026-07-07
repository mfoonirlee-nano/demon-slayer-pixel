import { state } from "../game/state";
import {
  BASIC_ATTACK,
  CLOSE_ARC_BASIC_CRESCENT_CONFIG,
  FALL_ATTACK,
  GRAVITY,
  GROUND_Y,
  PLAYER_COMBAT,
  SKILL_IDS,
  WIDTH,
} from "../constants";
import { onGround, hitbox, overlapHitPoint } from "../game/utils";
import { playSfx } from "../game/audio";
import { emitSlash, emitHitBurst, damageDashRepositionTravel, finishDashRepositionSkill } from "./particle";
import {
  bindingZonePlayerMoveScale,
  isBinderTalismanKeyScrambled,
  isBinderTalismanStunned,
} from "./enemies/binder";
import { keys } from "../game/input";
import { hasDebugInfiniteHealth } from "../game/debug";
import {
  applyFatalDamageEquipmentProtection,
  applyLowHealthEquipmentTriggers,
  beginBasicAttackEquipmentEffects,
  equipmentBasicAttackDamageMultiplier,
  equipmentBasicAttackFrameMultiplier,
  equipmentBasicAttackReachBonus,
  equipmentIncomingDamageMultiplier,
  equipmentKnockbackMultiplier,
  equipmentMoveSpeedMultiplier,
  grantSkillEnergy,
  grantUltimateEnergy,
  recordBasicAttackHit,
  recordEquipmentMovement,
  recordEquipmentHurt,
  tickEquipmentEffects,
} from "../systems/equipment";
import { applyBossDamage, applyEnemyDamage, resolveBossHit, resolveEnemyHit } from "../systems/combatResolution";
import { endRun } from "../systems/runLifecycle";
import { selectSkillSlot } from "../systems/loadout";
import { CORE_PLAYER_SKILL_EFFECT_CONFIGS, playerSkillColor } from "../systems/skillCatalog";
import {
  moonTideAttackFrames,
  moonTideBasicDamageMultiplier,
  moonTideJumpMultiplier,
  moonTideMoveSpeedMultiplier,
  spawnMoonTideTrail,
  triggerMoonTideAfterimageHit,
} from "./players/moonTide";
import { lanternAshZonePlayerMoveScale, spiderSilkSlowPlayerMoveScale } from "./players/movementModifiers";
import { updateSkillCastRelease, updateUltimateCastAndTimer } from "./players/skillCasting";

export { castSelectedSkill, castUltimateSkill } from "./players/skillCasting";
export { drawPlayer } from "./players/render";

const DASH_REPOSITION_INVINCIBLE_REFRESH_FRAMES = 2;
const FALL_ATTACK_ENEMY_SLASH_SCALE = 1.25;
const FALL_ATTACK_BOSS_SLASH_SCALE = 0.9;
const FALL_ATTACK_BOSS_BURST_BONUS = 0.6;
const FALL_ATTACK_GROUND_SLASH_Y_OFFSET = 8;
const FALL_ATTACK_GROUND_BURST_Y_OFFSET = 6;
const FALL_ATTACK_GROUND_SLASH_SCALE = 0.8;
const FALL_ATTACK_GROUND_BURST_BONUS = 0.4;
const GUARD_COUNTER_ENEMY_BURST_POWER = 1.5;
const GUARD_COUNTER_BOSS_HIT_Y_RATIO = 0.4;
const GUARD_COUNTER_EFFECT_CONFIG = CORE_PLAYER_SKILL_EFFECT_CONFIGS[SKILL_IDS.guardCounter];
const GUARD_COUNTER_HIT_COLOR = playerSkillColor(SKILL_IDS.guardCounter);
const PLAYER_RUN_STEP_DISTANCE = 34;
const PLAYER_LAND_MIN_VELOCITY = 4.5;
const PLAYER_LAND_PITCH_BASE = 0.86;
const PLAYER_LAND_PITCH_SCALE = 0.035;
const PLAYER_LAND_MAX_PITCH = 1.18;
const PLAYER_RUN_STEP_RIGHT_PITCH = 1.02;
const PLAYER_RUN_STEP_LEFT_PITCH = 0.98;

function playerMovementKeyDown(key: "a" | "d") {
  if (!isBinderTalismanKeyScrambled()) return keys.has(key);
  return keys.has(key === "a" ? "d" : "a");
}

function playerFallAttackKeyDown() {
  return keys.has("s") || keys.has("arrowdown");
}

export function triggerAttack() {
  if (isBinderTalismanStunned()) return;

  const p = state.player;
  if (
    p.attackTimer > 0
    || p.fallAttackTimer > 0
    || p.fallAttackRecoveryTimer > 0
    || p.skillTimer > 0
    || p.ultimateCastTimer > 0
  ) return;

  if (!onGround(p, p.onPlatform) && playerFallAttackKeyDown()) {
    p.fallAttackTimer = 1;
    p.vy = Math.max(p.vy, FALL_ATTACK.startVelocity);
    p.onPlatform = null;
    playSfx("playerFallAttackStart");
    return;
  }

  const frames = Math.max(1, Math.round(moonTideAttackFrames() * equipmentBasicAttackFrameMultiplier(state)));
  beginBasicAttackEquipmentEffects(state);
  state.player.attackDuration = frames;
  state.player.attackTimer = frames;
  spawnCloseArcBasicCrescent();
  playSfx("playerAttackStart");
}

export function getPlayerAttackDamage() {
  return state.player.baseAttack + state.player.attackBonus;
}

export function gainSkillEnergy(amount: number) {
  grantSkillEnergy(state, amount);
}

export function gainUltimateEnergy(amount: number) {
  grantUltimateEnergy(state, amount);
}

export function healPlayer(amount: number) {
  const p = state.player;
  p.hp = Math.min(p.maxHp, p.hp + amount);
}

export function selectSkill(index: number) {
  selectSkillSlot(state, index);
}

export function attackBox() {
  const p = state.player;
  const reach = BASIC_ATTACK.reach + equipmentBasicAttackReachBonus(state);
  return {
    x: p.facing === 1 ? p.x + p.w : p.x - reach,
    y: p.y + BASIC_ATTACK.yOffset,
    w: reach,
    h: BASIC_ATTACK.height,
    damage: getPlayerAttackDamage() * moonTideBasicDamageMultiplier() * equipmentBasicAttackDamageMultiplier(state),
    color: BASIC_ATTACK.color,
  };
}

function spawnCloseArcBasicCrescent() {
  const p = state.player;
  if ((p.skillLevels[SKILL_IDS.closeArc] ?? 0) < CLOSE_ARC_BASIC_CRESCENT_CONFIG.requiredSkillLevel) return;

  const box = attackBox();
  const rangeExtension = Math.max(1, p.h * CLOSE_ARC_BASIC_CRESCENT_CONFIG.rangeExtensionPlayerRatio);
  const hitboxH = box.h * CLOSE_ARC_BASIC_CRESCENT_CONFIG.hitboxHeightScale;
  const hitboxX = p.facing === 1
    ? box.x + box.w
    : box.x - rangeExtension;
  state.closeArcBasicCrescents.push({
    x: hitboxX + rangeExtension / 2,
    y: box.y + box.h / 2,
    w: rangeExtension,
    h: hitboxH,
    facing: p.facing,
    frame: 0,
    elapsed: 0,
    life: CLOSE_ARC_BASIC_CRESCENT_CONFIG.life,
    maxLife: CLOSE_ARC_BASIC_CRESCENT_CONFIG.life,
    drawScale: CLOSE_ARC_BASIC_CRESCENT_CONFIG.drawScale,
    damage: box.damage * CLOSE_ARC_BASIC_CRESCENT_CONFIG.damageMultiplier,
    hitEnemies: [],
    bossHit: false,
  });

  while (state.closeArcBasicCrescents.length > CLOSE_ARC_BASIC_CRESCENT_CONFIG.maxInstances) {
    state.closeArcBasicCrescents.shift();
  }
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
    const hitPoint = overlapHitPoint(box, e);
    const hit = resolveEnemyHit({
      enemy: e,
      enemyIndex: i,
      hitRect: box,
      hitPoint,
      damage: box.damage,
      hitCooldown: FALL_ATTACK.enemyHitCooldown,
      reward: "attack",
    });
    emitSlash(hit.hitX, hit.hitY, box.color, e.w * FALL_ATTACK_ENEMY_SLASH_SCALE);
    emitHitBurst(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, FALL_ATTACK.impactBurstPower);
  }

  if (state.boss && hitbox(box, state.boss) && state.boss.hitCd <= 0) {
    const boss = state.boss;
    const bossHitPoint = overlapHitPoint(box, boss);
    const hit = resolveBossHit({
      boss,
      hitRect: box,
      hitPoint: bossHitPoint,
      damage: getPlayerAttackDamage() * FALL_ATTACK.bossDamageMultiplier,
      hitCooldown: FALL_ATTACK.bossHitCooldown,
    });
    emitSlash(hit.hitX, hit.hitY, box.color, boss.w * FALL_ATTACK_BOSS_SLASH_SCALE);
    emitHitBurst(
      hit.hitX,
      hit.hitY,
      PLAYER_COMBAT.effects.skillBossBurstColor,
      FALL_ATTACK.impactBurstPower + FALL_ATTACK_BOSS_BURST_BONUS,
    );
    if (hit.defeated) {
      emitSlash(boss.x + boss.w / 2, boss.y + PLAYER_COMBAT.bossHitY, PLAYER_COMBAT.effects.bossKillSlashColor);
    }
  }

  emitSlash(cx, impactY - FALL_ATTACK_GROUND_SLASH_Y_OFFSET, box.color, FALL_ATTACK.radius * FALL_ATTACK_GROUND_SLASH_SCALE);
  emitHitBurst(
    cx,
    impactY - FALL_ATTACK_GROUND_BURST_Y_OFFSET,
    box.color,
    FALL_ATTACK.impactBurstPower + FALL_ATTACK_GROUND_BURST_BONUS,
  );
  p.invincible = Math.max(p.invincible, FALL_ATTACK.landingInvincibleFrames);
  playSfx("playerFallAttackImpact");
}

type GuardCounterRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

function activeGuardCounterRect(): GuardCounterRect | null {
  const p = state.player;
  const counter = state.guardCounterEffect;
  if (!counter || counter.hitsRemaining <= 0) return null;
  const counterPadding = counter.counterPadding;
  return {
    x: p.x - counterPadding,
    y: p.y - counterPadding,
    w: p.w + counterPadding * 2,
    h: p.h + counterPadding * 2,
  };
}

function resolveGuardCounterResponse(
  counterRect: GuardCounterRect,
  consumeHit: boolean,
  grantInvincibility: boolean,
) {
  const p = state.player;
  const counter = state.guardCounterEffect;
  if (!counter || counter.hitsRemaining <= 0) return false;

  if (consumeHit) counter.hitsRemaining -= 1;
  counter.barrierFlash = GUARD_COUNTER_EFFECT_CONFIG.barrierFlashFrames;
  if (grantInvincibility) {
    p.invincible = PLAYER_COMBAT.hurtInvincibleFrames;
  }

  const counterDamage = (p.baseAttack + p.attackBonus)
    * GUARD_COUNTER_EFFECT_CONFIG.damageMultiplier
    * counter.damageMultiplier;
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const e = state.enemies[i];
    if (!hitbox(counterRect, e)) continue;
    const hitPoint = { x: e.x + e.w / 2, y: e.y + e.h / 2 };
    const hit = resolveEnemyHit({
      enemy: e,
      enemyIndex: i,
      hitRect: counterRect,
      hitPoint,
      damage: counterDamage,
      reward: "enemy",
    });
    emitSlash(hit.hitX, hit.hitY, GUARD_COUNTER_HIT_COLOR, e.w);
    emitHitBurst(hit.hitX, hit.hitY, GUARD_COUNTER_HIT_COLOR, GUARD_COUNTER_ENEMY_BURST_POWER);
  }
  if (state.boss && hitbox(counterRect, state.boss)) {
    const boss = state.boss;
    const hitPoint = { x: boss.x + boss.w / 2, y: boss.y + boss.h * GUARD_COUNTER_BOSS_HIT_Y_RATIO };
    const hit = resolveBossHit({
      boss,
      hitRect: counterRect,
      hitPoint,
      damage: counterDamage,
    });
    emitSlash(hit.hitX, hit.hitY, GUARD_COUNTER_HIT_COLOR);
    emitHitBurst(hit.hitX, hit.hitY, GUARD_COUNTER_HIT_COLOR, 2);
  }

  playSfx("playerCounter");
  return true;
}

export function blockProjectileWithGuardCounter(projectile: GuardCounterRect) {
  const counterRect = activeGuardCounterRect();
  if (!counterRect || !hitbox(counterRect, projectile)) return false;
  return resolveGuardCounterResponse(counterRect, false, false);
}

export function hurtPlayer(damage: number, sourceVx: number) {
  const p = state.player;
  if (hasDebugInfiniteHealth()) return;
  if (p.invincible > 0) return;

  const counterRect = activeGuardCounterRect();
  if (counterRect && resolveGuardCounterResponse(counterRect, true, true)) {
    return;
  }

  const incomingDamage = damage * equipmentIncomingDamageMultiplier(state);
  if (p.hp - incomingDamage <= 0 && applyFatalDamageEquipmentProtection(state)) {
    playSfx("playerHurt");
    return;
  }

  p.hp = Math.max(0, p.hp - incomingDamage);
  p.invincible = PLAYER_COMBAT.hurtInvincibleFrames;
  const knockbackMultiplier = equipmentKnockbackMultiplier(state);
  p.vx = -Math.sign(sourceVx || 1) * PLAYER_COMBAT.hurtKnockbackX * knockbackMultiplier;
  p.vy = PLAYER_COMBAT.hurtKnockbackY * knockbackMultiplier;
  emitSlash(p.x + p.w / 2, p.y + PLAYER_COMBAT.attackKillY, PLAYER_COMBAT.effects.hurtSlashColor);
  recordEquipmentHurt(state);
  applyLowHealthEquipmentTriggers(state);
  if (p.hp <= 0) {
    playSfx("playerDeath");
    endRun(state);
  } else {
    playSfx("playerHurt");
  }
}

export function tryJump() {
  if (isBinderTalismanStunned()) return;

  const p = state.player;
  if (p.ultimateCastTimer > 0) return;
  if (onGround(p, p.onPlatform)) {
    p.vy = -p.jump * moonTideJumpMultiplier();
    playSfx("playerJump");
  }
}

export function updatePlayer() {
  const p = state.player;
  if (p.ultimateCastTimer > 0) {
    p.runStepDistance = 0;
    updateUltimateCastAndTimer();
    return;
  }

  tickEquipmentEffects(state);
  const movementStartX = p.x;
  const dashReposition = p.dashReposition;
  const wasGrounded = onGround(p, p.onPlatform);

  if (!dashReposition && p.onPlatform && state.platforms.includes(p.onPlatform)) {
    p.x += p.onPlatform.vx;
  }
  const moveScale = Math.min(
    bindingZonePlayerMoveScale(),
    lanternAshZonePlayerMoveScale(),
    spiderSilkSlowPlayerMoveScale(),
  )
    * equipmentMoveSpeedMultiplier(state)
    * moonTideMoveSpeedMultiplier();
  let previousDashX = p.x;
  let previousDashY = p.y;
  const stunned = isBinderTalismanStunned();
  const movingLeft = playerMovementKeyDown("a");
  const movingRight = playerMovementKeyDown("d");
  if (dashReposition) {
    p.vx = 0;
    p.facing = dashReposition.facing;
  } else if (stunned) {
    p.vx = 0;
  } else if (movingLeft) {
    p.vx = -p.speed * moveScale;
    if (p.skillTimer <= 0 && p.ultimateCastTimer <= 0) p.facing = -1;
  } else if (movingRight) {
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
  const landingVelocity = p.vy;
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
  } else if (landed && !wasGrounded && landingVelocity >= PLAYER_LAND_MIN_VELOCITY) {
    playSfx(
      "playerLand",
      Math.min(PLAYER_LAND_MAX_PITCH, PLAYER_LAND_PITCH_BASE + landingVelocity * PLAYER_LAND_PITCH_SCALE),
    );
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

  recordEquipmentMovement(state, p.x - movementStartX);
  const horizontalMoveDistance = Math.abs(p.x - movementStartX);
  const canPlayRunStep = !dashReposition
    && !stunned
    && onGround(p, p.onPlatform)
    && (movingLeft || movingRight)
    && horizontalMoveDistance > PLAYER_COMBAT.movementIdleThreshold
    && p.attackTimer <= 0
    && p.fallAttackTimer <= 0
    && p.fallAttackRecoveryTimer <= 0
    && p.skillTimer <= 0
    && p.ultimateCastTimer <= 0;
  if (canPlayRunStep) {
    p.runStepDistance += horizontalMoveDistance;
    if (p.runStepDistance >= PLAYER_RUN_STEP_DISTANCE) {
      p.runStepDistance %= PLAYER_RUN_STEP_DISTANCE;
      playSfx("playerRunStep", p.facing === 1 ? PLAYER_RUN_STEP_RIGHT_PITCH : PLAYER_RUN_STEP_LEFT_PITCH);
    }
  } else {
    p.runStepDistance = 0;
  }

  if (!updateSkillCastRelease()) return;

  updateUltimateCastAndTimer();

  spawnMoonTideTrail();

  if (p.attackTimer > 0) {
    p.attackTimer -= 1;
    const box = attackBox();

    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const e = state.enemies[i];
      if (hitbox(box, e) && e.hitCd <= 0) {
        const hitPoint = overlapHitPoint(box, e);
        const hit = resolveEnemyHit({
          enemy: e,
          enemyIndex: i,
          hitRect: box,
          hitPoint,
          damage: box.damage,
          hitCooldown: PLAYER_COMBAT.attackEnemyHitCooldown,
          reward: "attack",
          afterDamage: () => {
            recordBasicAttackHit(state, "enemy");
            triggerMoonTideAfterimageHit(hitPoint.x, hitPoint.y, e.w, (damage) => {
              applyEnemyDamage(e, damage, PLAYER_COMBAT.attackEnemyHitCooldown);
            });
          },
        });
        emitSlash(hit.hitX, hit.hitY, box.color, e.w);
        emitHitBurst(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.attackEnemyBurstColor, PLAYER_COMBAT.attackEnemyBurstPower);
        playSfx("playerAttackHit");
        if (hit.defeated) {
          emitSlash(e.x + Math.random() * e.w, e.y + Math.random() * e.h, PLAYER_COMBAT.effects.attackKillSlashColor, e.w);
        }
      }
    }

    if (state.boss && hitbox(box, state.boss) && state.boss.hitCd <= 0) {
      const boss = state.boss;
      const hitPoint = overlapHitPoint(box, boss);
      const hit = resolveBossHit({
        boss,
        hitRect: box,
        hitPoint,
        damage: box.damage,
        hitCooldown: PLAYER_COMBAT.attackBossHitCooldown,
        afterDamage: () => {
          recordBasicAttackHit(state, "boss");
          triggerMoonTideAfterimageHit(hitPoint.x, hitPoint.y, boss.w, (damage) => {
            applyBossDamage(boss, damage, PLAYER_COMBAT.attackBossHitCooldown);
          });
        },
      });
      emitSlash(hit.hitX, hit.hitY, box.color);
      emitHitBurst(
        hit.hitX,
        hit.hitY,
        PLAYER_COMBAT.effects.attackBossBurstColor,
        PLAYER_COMBAT.attackBossBurstPower,
      );
      playSfx("playerBossHit");
      if (hit.defeated) {
        emitSlash(boss.x + boss.w / 2, boss.y + PLAYER_COMBAT.bossHitY, PLAYER_COMBAT.effects.bossKillSlashColor);
      }
    }
  }

  if (p.invincible > 0) p.invincible -= 1;
  if (p.spiderSilkSlowTimer > 0) p.spiderSilkSlowTimer -= 1;
}
