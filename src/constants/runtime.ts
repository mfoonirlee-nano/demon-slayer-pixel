export const RUNTIME_CONFIG = {
  maxFrameDeltaMs: 32,
  msPerSecond: 1000,
  moonBloodLerpSpeed: 2.4,
  moonCoverProgressLerpSpeed: 2.1,
  platformSpawnBaseInterval: 2.2,
  platformSpawnRandomInterval: 1.5,
} as const;

export const UI_COPY = {
  loadingSprites: "加载像素贴图中...",
  canvasContextMissing: "Canvas context is not ready.",
} as const;
