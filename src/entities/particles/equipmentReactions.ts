import { WIDTH } from "../../constants";
import { EQUIPMENT_REACTIONS } from "../../constants/equipmentReactions";
import { playSfx } from "../../game/audio";
import { recordCollisionDebugEllipse, recordCollisionDebugRect } from "../../game/collisionDebug";
import { state } from "../../game/state";
import { clamp, hitbox, type RectLike } from "../../game/utils";
import { resolveBossHit, resolveEnemyHit } from "../../systems/combatResolution";
import { recordEquipmentReactionControl } from "../../systems/equipmentReactions";
import type { EnemyState } from "../../types/game-state";
import type { EquipmentReactionEffect } from "../../types/game/equipmentReactions";

function canDisplace(enemy: EnemyState): boolean {
  return enemy.hp > 0 && !enemy.wardenDamageImmune && !enemy.elite
    && enemy.id !== "brute" && enemy.id !== "warden";
}

function ellipseOverlaps(effect: EquipmentReactionEffect, target: RectLike): boolean {
  const closestX = clamp(effect.x, target.x, target.x + target.w);
  const closestY = clamp(effect.y, target.y, target.y + target.h);
  const dx = (closestX - effect.x) / (effect.w / 2);
  const dy = (closestY - effect.y) / (effect.h / 2);
  return dx * dx + dy * dy <= 1;
}

function pullTargets(effect: EquipmentReactionEffect): void {
  const distance = EQUIPMENT_REACTIONS[effect.kind].pullPerFrame;
  for (const enemy of state.enemies) {
    if (!canDisplace(enemy) || !ellipseOverlaps(effect, enemy)) continue;
    const previousX = enemy.x;
    const dx = effect.x - (enemy.x + enemy.w / 2);
    enemy.x = clamp(previousX + Math.sign(dx) * Math.min(Math.abs(dx), distance), 0, WIDTH - enemy.w);
    if (enemy.x !== previousX) recordEquipmentReactionControl(state, enemy);
  }
}

function hitTargets(effect: EquipmentReactionEffect, box: RectLike): void {
  const overlaps = (target: RectLike) => effect.kind === "sweep"
    ? hitbox(box, target)
    : ellipseOverlaps(effect, target);
  for (let index = state.enemies.length - 1; index >= 0; index -= 1) {
    const enemy = state.enemies[index];
    if (effect.hitEnemies.includes(enemy) || !overlaps(enemy)) continue;
    effect.hitEnemies.push(enemy);
    // Reactions have no skill source: their damage cannot recursively seed another reaction.
    const hit = resolveEnemyHit({
      enemy, enemyIndex: index, hitRect: box, damage: effect.damage,
      reward: "attack", knockbackOverride: "disabled",
      sourceX: effect.kind === "sweep"
        ? effect.facing > 0 ? enemy.x - 1 : enemy.x + enemy.w + 1
        : effect.x,
    });
    if (state.gameOver || state.player.hp <= 0) return;
    if (effect.kind === "sweep" && hit.appliedDamage > 0 && !hit.defeated && canDisplace(enemy)) {
      enemy.x = clamp(enemy.x + effect.facing * EQUIPMENT_REACTIONS.sweep.pushDistance, 0, WIDTH - enemy.w);
    }
  }
  const boss = state.boss;
  if (boss && boss !== effect.hitBoss && overlaps(boss)) {
    effect.hitBoss = boss;
    resolveBossHit({ boss, hitRect: box, damage: effect.bossDamage });
  }
}

export function updateEquipmentReactionEffects(): void {
  const effects = state.equipmentReactions.effects;
  if (state.gameOver || state.player.hp <= 0) {
    effects.length = 0;
    return;
  }
  for (let index = effects.length - 1; index >= 0; index -= 1) {
    const effect = effects[index];
    const config = EQUIPMENT_REACTIONS[effect.kind];
    const previousX = effect.x;
    effect.x += effect.vx;
    effect.elapsed += 1;
    effect.life -= 1;
    const box = {
      x: Math.min(previousX, effect.x) - effect.w / 2,
      y: effect.y - effect.h / 2,
      w: effect.w + Math.abs(effect.x - previousX),
      h: effect.h,
    };
    if (effect.elapsed === 1 && effect.kind === "sweep") playSfx("playerSkillArc");
    if (effect.kind === "sweep") {
      recordCollisionDebugRect(box, "playerAttack");
      hitTargets(effect, box);
    } else {
      recordCollisionDebugEllipse(effect.x, effect.y, effect.w / 2, effect.h / 2, "playerAttack");
      if (effect.kind === "eye" || (effect.kind === "surge" && effect.elapsed <= config.impactFrame)) {
        pullTargets(effect);
      }
      if (effect.kind !== "eye" && effect.elapsed === config.impactFrame) {
        hitTargets(effect, box);
        playSfx("playerSkillVerticalWave");
      }
    }
    // Defeat callbacks may end the run and clear the same effect collection.
    if (state.gameOver || state.player.hp <= 0) {
      effects.length = 0;
      return;
    }
    if (effect.life <= 0) effects.splice(index, 1);
  }
}
