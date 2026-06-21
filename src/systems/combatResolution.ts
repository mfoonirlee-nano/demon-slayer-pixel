import { damageBoss, type LiveBossState } from "../entities/bosses/common";
import { defeatBoss } from "../entities/bosses/defeat";
import {
  damageEnemy,
  type EnemyDamageKind,
  type EnemyDefeatRewardKind,
} from "../entities/enemies/common";
import { resolveEnemyDefeat } from "../entities/enemies/defeat";
import type { EnemyState } from "../types/game-state";
import { overlapHitPoint, type RectLike } from "../game/utils";
import { state } from "../game/state";
import { equipmentBossDamageMultiplier, recordBossDamageEquipmentEffects } from "./equipment";

export type EnemyHitResolution = {
  hitX: number;
  hitY: number;
  defeated: boolean;
  appliedDamage: number;
};

export type BossHitResolution = {
  hitX: number;
  hitY: number;
  defeated: boolean;
  appliedDamage: number;
};

type HitPoint = {
  x: number;
  y: number;
};

export function applyEnemyDamage(
  enemy: EnemyState,
  damage: number,
  hitCooldown?: number,
  damageKind: EnemyDamageKind = "normal",
) {
  return damageEnemy(enemy, damage, hitCooldown, damageKind);
}

export function applyBossDamage(
  boss: LiveBossState,
  damage: number,
  hitCooldown?: number,
) {
  const appliedDamage = damageBoss(
    boss,
    damage * equipmentBossDamageMultiplier(state, boss),
    hitCooldown,
  );
  recordBossDamageEquipmentEffects(state, appliedDamage);
  return appliedDamage;
}

export function resolveEnemyHit({
  enemy,
  enemyIndex,
  hitRect,
  hitPoint,
  damage,
  hitCooldown,
  reward,
  damageKind = "normal",
  afterDamage,
}: {
  enemy: EnemyState;
  enemyIndex: number;
  hitRect: RectLike;
  hitPoint?: HitPoint;
  damage: number;
  hitCooldown?: number;
  reward: EnemyDefeatRewardKind;
  damageKind?: EnemyDamageKind;
  afterDamage?: () => void;
}): EnemyHitResolution {
  const { x: hitX, y: hitY } = hitPoint ?? overlapHitPoint(hitRect, enemy);
  const appliedDamage = applyEnemyDamage(enemy, damage, hitCooldown, damageKind);
  afterDamage?.();
  return {
    hitX,
    hitY,
    defeated: resolveEnemyDefeat(enemy, enemyIndex, reward),
    appliedDamage,
  };
}

export function resolveBossHit({
  boss,
  hitRect,
  hitPoint,
  damage,
  hitCooldown,
  afterDamage,
}: {
  boss: LiveBossState;
  hitRect: RectLike;
  hitPoint?: HitPoint;
  damage: number;
  hitCooldown?: number;
  afterDamage?: () => void;
}): BossHitResolution {
  const { x: hitX, y: hitY } = hitPoint ?? overlapHitPoint(hitRect, boss);
  const appliedDamage = applyBossDamage(boss, damage, hitCooldown);
  afterDamage?.();
  return {
    hitX,
    hitY,
    defeated: defeatBoss(),
    appliedDamage,
  };
}
