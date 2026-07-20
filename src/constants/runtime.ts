export const RUNTIME_CONFIG = {
  maxFrameDeltaMs: 32,
  msPerSecond: 1000,
  moonBloodLerpSpeed: 2.4,
  moonCoverProgressLerpSpeed: 2.1,
  platformSpawnBaseInterval: 2.2,
  platformSpawnRandomInterval: 1.5,
} as const;

export const ENEMY_BACKGROUND_SPAWN = {
  standardStartAct: 4,
  standardChancePerAct: 0.045,
  earlyChancePerAct: 0.015,
  maxChance: 0.45,
  emergeMinSpeed: 2.4,
} as const;

export const UI_COPY = {
  canvasContextMissing: "Canvas context is not ready.",
} as const;
