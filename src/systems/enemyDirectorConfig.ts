import {
  BINDER_SHEET_INDEX,
  BRUTE_SHEET_INDEX,
  BURROWER_SHEET_INDEX,
  CASTER_SHEET_INDEX,
  CRAWLER_SHEET_INDEX,
  DUELIST_SHEET_INDEX,
  GLIDER_SHEET_INDEX,
  LEAPER_SHEET_INDEX,
  RUNNER_SHEET_INDEX,
  SPLITTER_SHEET_INDEX,
  WARDEN_SHEET_INDEX,
} from "../constants";
import type { EnemyId, EnemyProfileId, EnemyTag } from "../types/game-state";

const CHASER_SHEET_INDEX = 0;

export type EnemyTier = 1 | 2 | 3 | 4;
export type MaxActive = number | "budget";

export type EnemyArchetypeConfig = {
  id: EnemyId;
  sheetIndex: number;
  tags: EnemyTag[];
  complexityTier: EnemyTier;
  spawnCost: number;
  baseWeight: number;
  maxActive: MaxActive;
  hpBase: number;
  hpPerBossKill: number;
  damageBase: number;
  damagePerBossKill: number;
  damageCap: number;
  speedBase: number;
  speedPerBossKill: number;
  randomSpeed: number;
};

export type EnemyProfileConfig = {
  id: EnemyProfileId;
  requiredTags: EnemyTag[];
  preferredTags: EnemyTag[];
};

export const ENEMY_ARCHETYPES: Record<EnemyId, EnemyArchetypeConfig> = {
  chaser: {
    id: "chaser",
    sheetIndex: CHASER_SHEET_INDEX,
    tags: ["baseline"],
    complexityTier: 1,
    spawnCost: 1,
    baseWeight: 1.4,
    maxActive: "budget",
    hpBase: 16,
    hpPerBossKill: 2,
    damageBase: 3,
    damagePerBossKill: 0.35,
    damageCap: 12,
    speedBase: 2.2,
    speedPerBossKill: 0.12,
    randomSpeed: 0.25,
  },
  crawler: {
    id: "crawler",
    sheetIndex: CRAWLER_SHEET_INDEX,
    tags: ["low", "melee"],
    complexityTier: 1,
    spawnCost: 1,
    baseWeight: 1.2,
    maxActive: 5,
    hpBase: 10,
    hpPerBossKill: 1.4,
    damageBase: 3,
    damagePerBossKill: 0.25,
    damageCap: 10,
    speedBase: 1.05,
    speedPerBossKill: 0.06,
    randomSpeed: 0.95,
  },
  runner: {
    id: "runner",
    sheetIndex: RUNNER_SHEET_INDEX,
    tags: ["fast"],
    complexityTier: 1,
    spawnCost: 1.2,
    baseWeight: 1.1,
    maxActive: 3,
    hpBase: 12,
    hpPerBossKill: 1.5,
    damageBase: 3,
    damagePerBossKill: 0.35,
    damageCap: 12,
    speedBase: 1.25,
    speedPerBossKill: 0.08,
    randomSpeed: 0.85,
  },
  duelist: {
    id: "duelist",
    sheetIndex: DUELIST_SHEET_INDEX,
    tags: ["melee_burst"],
    complexityTier: 2,
    spawnCost: 1.5,
    baseWeight: 1,
    maxActive: 3,
    hpBase: 22,
    hpPerBossKill: 2.6,
    damageBase: 5,
    damagePerBossKill: 0.55,
    damageCap: 16,
    speedBase: 0.84,
    speedPerBossKill: 0.05,
    randomSpeed: 0.72,
  },
  caster: {
    id: "caster",
    sheetIndex: CASTER_SHEET_INDEX,
    tags: ["ranged"],
    complexityTier: 2,
    spawnCost: 1.6,
    baseWeight: 0.9,
    maxActive: 2,
    hpBase: 20,
    hpPerBossKill: 2.2,
    damageBase: 4,
    damagePerBossKill: 0.45,
    damageCap: 14,
    speedBase: 0.48,
    speedPerBossKill: 0.03,
    randomSpeed: 0.42,
  },
  leaper: {
    id: "leaper",
    sheetIndex: LEAPER_SHEET_INDEX,
    tags: ["vertical", "burst"],
    complexityTier: 2,
    spawnCost: 1.6,
    baseWeight: 0.85,
    maxActive: 2,
    hpBase: 18,
    hpPerBossKill: 2.2,
    damageBase: 5,
    damagePerBossKill: 0.45,
    damageCap: 15,
    speedBase: 0.72,
    speedPerBossKill: 0.04,
    randomSpeed: 0.5,
  },
  glider: {
    id: "glider",
    sheetIndex: GLIDER_SHEET_INDEX,
    tags: ["vertical", "aerial"],
    complexityTier: 2,
    spawnCost: 1.7,
    baseWeight: 0.8,
    maxActive: 2,
    hpBase: 16,
    hpPerBossKill: 1.9,
    damageBase: 4,
    damagePerBossKill: 0.4,
    damageCap: 13,
    speedBase: 0.92,
    speedPerBossKill: 0.05,
    randomSpeed: 0.45,
  },
  splitter: {
    id: "splitter",
    sheetIndex: SPLITTER_SHEET_INDEX,
    tags: ["swarm"],
    complexityTier: 3,
    spawnCost: 2,
    baseWeight: 0.75,
    maxActive: 2,
    hpBase: 28,
    hpPerBossKill: 3.2,
    damageBase: 4,
    damagePerBossKill: 0.35,
    damageCap: 13,
    speedBase: 0.62,
    speedPerBossKill: 0.04,
    randomSpeed: 0.5,
  },
  brute: {
    id: "brute",
    sheetIndex: BRUTE_SHEET_INDEX,
    tags: ["heavy"],
    complexityTier: 3,
    spawnCost: 2.2,
    baseWeight: 0.65,
    maxActive: 2,
    hpBase: 46,
    hpPerBossKill: 6.5,
    damageBase: 8,
    damagePerBossKill: 0.8,
    damageCap: 20,
    speedBase: 0.42,
    speedPerBossKill: 0.03,
    randomSpeed: 0.45,
  },
  burrower: {
    id: "burrower",
    sheetIndex: BURROWER_SHEET_INDEX,
    tags: ["ambush"],
    complexityTier: 3,
    spawnCost: 2.2,
    baseWeight: 0.65,
    maxActive: 1,
    hpBase: 16,
    hpPerBossKill: 2,
    damageBase: 6,
    damagePerBossKill: 0.5,
    damageCap: 16,
    speedBase: 0.58,
    speedPerBossKill: 0.04,
    randomSpeed: 0.45,
  },
  binder: {
    id: "binder",
    sheetIndex: BINDER_SHEET_INDEX,
    tags: ["control"],
    complexityTier: 4,
    spawnCost: 2.6,
    baseWeight: 0.5,
    maxActive: 1,
    hpBase: 18,
    hpPerBossKill: 2,
    damageBase: 3,
    damagePerBossKill: 0.25,
    damageCap: 10,
    speedBase: 0.42,
    speedPerBossKill: 0.02,
    randomSpeed: 0.35,
  },
  warden: {
    id: "warden",
    sheetIndex: WARDEN_SHEET_INDEX,
    tags: ["support"],
    complexityTier: 4,
    spawnCost: 2.8,
    baseWeight: 0.45,
    maxActive: 1,
    hpBase: 26,
    hpPerBossKill: 3,
    damageBase: 2,
    damagePerBossKill: 0.2,
    damageCap: 8,
    speedBase: 0.38,
    speedPerBossKill: 0.02,
    randomSpeed: 0.3,
  },
};

export const PROFILE_CONFIGS: Record<EnemyProfileId, EnemyProfileConfig> = {
  basic_intro: { id: "basic_intro", requiredTags: ["baseline", "low", "fast"], preferredTags: [] },
  technique_intro: {
    id: "technique_intro",
    requiredTags: ["melee_burst", "ranged"],
    preferredTags: ["baseline", "fast"],
  },
  vertical_intro: {
    id: "vertical_intro",
    requiredTags: ["vertical"],
    preferredTags: ["ranged", "melee_burst", "fast"],
  },
  heavy_wall: {
    id: "heavy_wall",
    requiredTags: ["heavy"],
    preferredTags: ["baseline", "melee_burst", "ranged"],
  },
  ambush_swarm: {
    id: "ambush_swarm",
    requiredTags: ["ambush", "swarm"],
    preferredTags: ["fast", "vertical"],
  },
  control_support: {
    id: "control_support",
    requiredTags: ["control", "support"],
    preferredTags: ["baseline", "ranged"],
  },
  mixed_pressure: {
    id: "mixed_pressure",
    requiredTags: [],
    preferredTags: ["fast", "vertical", "melee_burst", "ranged"],
  },
  fast_mix: {
    id: "fast_mix",
    requiredTags: ["fast"],
    preferredTags: ["baseline", "melee_burst", "ambush"],
  },
  vertical_pressure: {
    id: "vertical_pressure",
    requiredTags: ["vertical"],
    preferredTags: ["ranged", "fast"],
  },
  chaos_mixed: {
    id: "chaos_mixed",
    requiredTags: [],
    preferredTags: ["vertical", "ambush", "ranged", "heavy", "control"],
  },
  final: {
    id: "final",
    requiredTags: [],
    preferredTags: ["vertical", "ambush", "ranged", "heavy", "control", "support"],
  },
};

export const INTRO_PROFILE_CYCLE: EnemyProfileId[] = ["basic_intro", "technique_intro", "vertical_intro"];
export const MID_PROFILE_CANDIDATES: EnemyProfileId[] = [
  "heavy_wall",
  "ambush_swarm",
  "control_support",
  "mixed_pressure",
];
export const AWAKENED_PROFILE_CANDIDATES: EnemyProfileId[] = [
  "fast_mix",
  "vertical_pressure",
  "heavy_wall",
  "ambush_swarm",
  "control_support",
  "chaos_mixed",
];
export const TIER_ONE_ENEMIES: EnemyId[] = ["chaser", "crawler", "runner"];
export const TIER_TWO_ENEMIES: EnemyId[] = ["duelist", "caster", "leaper", "glider"];
export const TIER_THREE_ENEMIES: EnemyId[] = ["splitter", "brute", "burrower"];
export const TIER_FOUR_ENEMIES: EnemyId[] = ["binder", "warden"];
export const FINAL_WEIGHT_MULTIPLIERS: Partial<Record<EnemyId, number>> = {
  duelist: 1.1,
  caster: 1,
  leaper: 1,
  glider: 1,
  splitter: 0.9,
  brute: 0.85,
  burrower: 0.85,
  binder: 0.65,
  warden: 0.6,
};
