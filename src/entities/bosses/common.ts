import { playSfx } from "../../game/audio";
import type { BossArchetypeId, BossState } from "../../types/game-state";

export type LiveBossState = NonNullable<BossState>;

const BOSS_HURT_SFX_PITCH = {
  "spider-string": 1.04,
  "mist-bone": 0.92,
  "mirror-dream": 1.1,
  "fang-gale": 0.86,
  "lantern-ember": 0.98,
  "dead-bell": 0.8,
  "blood-moon-many-faces": 0.72,
} satisfies Record<BossArchetypeId, number>;

export function damageBoss(boss: LiveBossState, damage: number, hitCooldown?: number) {
  const multiplier = (boss.armorBreakTimer ?? 0) > 0
    ? boss.armorBreakMultiplier ?? 1
    : 1;
  const appliedDamage = damage * multiplier;
  boss.hp -= appliedDamage;
  if (hitCooldown !== undefined) boss.hitCd = hitCooldown;
  if (boss.hp > 0 && appliedDamage > 0) {
    playSfx("bossHurt", BOSS_HURT_SFX_PITCH[boss.id]);
  }
  return appliedDamage;
}
