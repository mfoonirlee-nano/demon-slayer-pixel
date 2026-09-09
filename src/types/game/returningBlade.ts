import type { SkillLevel } from "./domain";
import type { BossState, EnemyState } from "./entities";

export type ReturningBladeRouteState = {
  markedEnemies: EnemyState[];
  markedBoss?: NonNullable<BossState>;
  level: SkillLevel;
  hoverRemaining: number;
  recallRemaining: number;
  targetX: number;
  targetY: number;
  outboundBoss?: NonNullable<BossState>;
  returnBoss?: NonNullable<BossState>;
};
