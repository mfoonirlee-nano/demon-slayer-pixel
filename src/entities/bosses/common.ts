import type { BossState } from "../../types/game-state";

export type LiveBossState = NonNullable<BossState>;

export function damageBoss(boss: LiveBossState, damage: number, hitCooldown?: number) {
  const multiplier = (boss.armorBreakTimer ?? 0) > 0
    ? boss.armorBreakMultiplier ?? 1
    : 1;
  const appliedDamage = damage * multiplier;
  boss.hp -= appliedDamage;
  if (hitCooldown !== undefined) boss.hitCd = hitCooldown;
  return appliedDamage;
}
