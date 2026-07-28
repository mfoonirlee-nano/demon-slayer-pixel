export const PLAYER_STAT_GROWTH = {
  attackLinear: 0.6,
  attackCurve: 1.13,
  hpLinear: 5,
  hpCurve: 5.66,
  skillEnergyLinear: 5,
} as const;

export const RUN_LEVEL_PACING = {
  initialLevel: 1,
  levelsPerAct: 2,
  enemyLevelsPerAct: 1,
} as const;

export const RUN_LEVEL_REWARD = {
  minHeal: 5,
  healRatio: 0.8,
} as const;

export const RUN_XP_CURVE = {
  firstLevel: 300,
  base: 550,
  linear: 10,
  curve: 0.2,
  exponent: 1.6,
} as const;
