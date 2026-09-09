import { RETURNING_BLADE_CONFIG as CONFIG, SKILL_IDS, WIDTH } from "../../constants";
import { state } from "../../game/state";
import { playSfx } from "../../game/audio";
import { clamp, type RectLike } from "../../game/utils";
import { recordCollisionDebugRect } from "../../game/collisionDebug";
import type { PlayerSkillEffectState, SkillLevel } from "../../types/game-state";
import { resolveBossHit, resolveEnemyHit } from "../../systems/combatResolution";
import { makeGenericEffect, refundSkillGroup } from "./playerSkillShared";

export function activeReturningBlade() {
  return state.playerSkillEffects.find((effect) => effect.kind === "returningBlade" && effect.life > 0);
}

export function spawnReturningBlade(level: SkillLevel, multiplier: number, refundGroupId: number) {
  if (activeReturningBlade()) return false;
  const player = state.player;
  const x = player.x + player.w / 2;
  const y = player.y + player.h / 2;
  const effect = makeGenericEffect(SKILL_IDS.returningBlade, level, multiplier, x, y, {
    phase: "out", refundGroupId, returnHitEnemies: [],
    returningBlade: {
      level, markedEnemies: [],
      hoverRemaining: CONFIG.hoverFrames[level],
      recallRemaining: 0,
      targetX: clamp(x + player.facing * CONFIG.distance, 0, WIDTH),
      targetY: y,
    },
  });
  // Keep the entire collision body inside the arena, including edge casts.
  effect.x = clamp(x, effect.w / 2, WIDTH - effect.w / 2);
  effect.returningBlade!.targetX = clamp(effect.returningBlade!.targetX, effect.w / 2, WIDTH - effect.w / 2);
  state.playerSkillEffects.push(effect);
  return true;
}

export function recallReturningBlade() {
  const effect = activeReturningBlade();
  if (!effect?.returningBlade || (effect.phase !== "hover" && effect.phase !== "out")) return false;
  lockReturnRoute(effect);
  return true;
}

function lockReturnRoute(effect: PlayerSkillEffectState) {
  const route = effect.returningBlade!;
  route.targetX = state.player.x + state.player.w / 2;
  route.targetY = state.player.y + state.player.h / 2;
  route.recallRemaining = CONFIG.recallFrames;
  effect.phase = "recall";
  effect.vx = 0;
  effect.vy = 0;
  // Return lifetime derives from the locked route, never from where the player moves next.
  effect.life = CONFIG.recallFrames + Math.ceil(Math.hypot(route.targetX - effect.x, route.targetY - effect.y) / CONFIG.returnSpeed) + 1;
  effect.maxLife = effect.life;
  playSfx("playerSkillReturningBladeTurn");
}

// Slab intersection against an expanded target sweeps the blade's rectangular body
// without damaging the empty corners of a large diagonal bounding rectangle.
function sweptHit(effect: PlayerSkillEffectState, x: number, y: number, target: RectLike) {
  let enter = 0;
  let leave = 1;
  const axes = [
    [x, effect.x - x, target.x - effect.w / 2, target.x + target.w + effect.w / 2],
    [y, effect.y - y, target.y - effect.h / 2, target.y + target.h + effect.h / 2],
  ];
  for (const [start, delta, min, max] of axes) {
    if (delta === 0) {
      if (start < min || start > max) return false;
    } else {
      const first = (min - start) / delta;
      const last = (max - start) / delta;
      enter = Math.max(enter, Math.min(first, last));
      leave = Math.min(leave, Math.max(first, last));
      if (enter > leave) return false;
    }
  }
  return true;
}

function spawnCross(effect: PlayerSkillEffectState, target: RectLike) {
  const life = CONFIG.loopFrameCount * CONFIG.frameDuration;
  state.playerSkillEffects.push(makeGenericEffect(SKILL_IDS.returningBlade, CONFIG.requiredLevel, 1,
    target.x + target.w / 2, target.y + target.h / 2, {
      kind: "returningBladeCross", visualOnly: true, damage: 0, bossDamage: 0,
      life, maxLife: life,
    }));
}

function damageRoute(effect: PlayerSkillEffectState, previousX: number, previousY: number) {
  const route = effect.returningBlade!;
  const returning = effect.phase === "return";
  const hits = returning ? effect.returnHitEnemies! : effect.hitEnemies;
  const ratio = returning ? CONFIG.returnDamageRatio : CONFIG.outboundDamageRatio;
  const box = { x: effect.x - effect.w / 2, y: effect.y - effect.h / 2, w: effect.w, h: effect.h };
  recordCollisionDebugRect(box, "playerAttack");
  let hitTargets = 0;
  let bossHit = false;
  for (let index = state.enemies.length - 1; index >= 0; index -= 1) {
    const enemy = state.enemies[index];
    if (hits.includes(enemy) || !sweptHit(effect, previousX, previousY, enemy)) continue;
    hits.push(enemy);
    const cross = returning && route.level >= CONFIG.requiredLevel && route.markedEnemies.includes(enemy);
    const dx = effect.x - previousX;
    const hit = resolveEnemyHit({
      enemy, enemyIndex: index, hitRect: box,
      damage: effect.damage * (ratio + (cross ? CONFIG.crossDamageRatio : 0)),
      hitCooldown: effect.hitCooldown, reward: "enemyNoCover",
      // Shield facing follows the incoming blade, not the player's distant position.
      sourceX: dx > 0 ? enemy.x - 1 : dx < 0 ? enemy.x + enemy.w + 1 : previousX,
      knockbackOverride: "disabled",
    });
    if (hit.appliedDamage > 0) {
      hitTargets += 1;
      if (!returning) route.markedEnemies.push(enemy);
      if (cross) {
        spawnCross(effect, enemy);
        if (!hit.defeated && enemy.id !== "brute" && !enemy.elite) {
          enemy.returningBladeStaggerTimer = CONFIG.staggerFrames;
        }
      }
    }
  }
  const boss = state.boss;
  const previousBoss = returning ? route.returnBoss : route.outboundBoss;
  if (boss && previousBoss !== boss && sweptHit(effect, previousX, previousY, boss)) {
    const cross = returning && route.level >= CONFIG.requiredLevel && route.markedBoss === boss;
    if (returning) route.returnBoss = boss;
    else route.outboundBoss = boss;
    const hit = resolveBossHit({
      boss, hitRect: box,
      damage: effect.bossDamage * (ratio + (cross ? CONFIG.crossDamageRatio : 0)),
      hitCooldown: effect.bossHitCooldown,
    });
    bossHit = hit.appliedDamage > 0;
    if (!returning && bossHit) route.markedBoss = boss;
    if (cross && bossHit) spawnCross(effect, boss);
  }
  if (hitTargets > 0 || bossHit) refundSkillGroup(effect, hitTargets, bossHit);
}

export function updateReturningBladeEffect(effect: PlayerSkillEffectState) {
  const route = effect.returningBlade;
  if (!route) return;
  if (state.gameOver || state.player.hp <= 0) {
    effect.life = 0;
    return;
  }
  if (effect.phase === "hover") {
    route.hoverRemaining -= 1;
    if (route.hoverRemaining === CONFIG.expiryWarningFrames) playSfx("playerSkillReturningBladeCatch");
    if (route.hoverRemaining <= 0) lockReturnRoute(effect);
    return;
  }
  if (effect.phase === "recall") {
    route.recallRemaining -= 1;
    if (route.recallRemaining <= 0) effect.phase = "return";
    return;
  }
  const previousX = effect.x;
  const previousY = effect.y;
  const dx = route.targetX - previousX;
  const dy = route.targetY - previousY;
  const distance = Math.hypot(dx, dy);
  const speed = effect.phase === "out" ? CONFIG.outboundSpeed : CONFIG.returnSpeed;
  const step = distance > 0 ? Math.min(1, speed / distance) : 0;
  effect.vx = dx * step;
  effect.vy = dy * step;
  effect.x += effect.vx;
  effect.y += effect.vy;
  if (effect.vx !== 0) effect.facing = Math.sign(effect.vx);
  damageRoute(effect, previousX, previousY);
  if (distance <= speed) {
    if (effect.phase === "out") {
      effect.phase = "hover";
      effect.vx = 0;
      effect.vy = 0;
      effect.life = route.hoverRemaining + 1;
      effect.maxLife = effect.life;
    } else {
      effect.life = 0;
      playSfx("playerSkillReturningBladeCatch");
    }
  }
}
