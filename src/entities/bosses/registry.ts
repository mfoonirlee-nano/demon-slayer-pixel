import {
  BOSS_CONFIG,
  BOSS_SKILL1_CONFIG,
  BOSS_SHEET,
  BOSS_SKILL1_EFFECT_SHEET,
  BOSS_SKILL1_SHEET,
  DEAD_BELL_CAST_SHEET,
  DEAD_BELL_CONFIG,
  DEAD_BELL_SHEET,
  DEAD_BELL_WAVE_SHEET,
} from "../../constants";
import type { SpriteSheet } from "../../types/assets";
import type { BossArchetypeId, BossSkillMode } from "../../types/game-state";

export type BossArchetype = {
  id: BossArchetypeId;
  displayName: string;
  phaseTitle: (phase: number) => string;
  unlockAct: number;
  awakenedUnlockAct: number;
  hpBase: number;
  hpPerKill: number;
  hpScaleByElapsed: number;
  collisionW: number;
  collisionH: number;
  yOffsetFromGround: number;
  phaseThresholds: readonly number[];
  contactDamageBase: number;
  contactDamagePhase: number;
  aiBaseCooldown: number;
  aiPhaseReduction: number;
  skillInitialCooldown: number;
  skillMode: BossSkillMode;
  drawW: number;
  drawH: number;
  castDrawW: number;
  castDrawH: number;
  castBottomPadding: number;
  sheets: {
    move: SpriteSheet;
    cast: SpriteSheet;
    effect: SpriteSheet;
  };
};

export const BOSS_ARCHETYPE_IDS = {
  spiderString: "spider-string",
  deadBell: "dead-bell",
} as const satisfies Record<string, BossArchetypeId>;

type RegisteredBossArchetypeId = (typeof BOSS_ARCHETYPE_IDS)[keyof typeof BOSS_ARCHETYPE_IDS];

export const BOSS_ARCHETYPES: Record<RegisteredBossArchetypeId, BossArchetype> = {
  "spider-string": {
    id: BOSS_ARCHETYPE_IDS.spiderString,
    displayName: "蛛弦",
    phaseTitle: (phase) => `下弦之鬼 · 蛛弦 · 阶段 ${phase}`,
    unlockAct: 1,
    awakenedUnlockAct: 7,
    hpBase: BOSS_CONFIG.baseHp,
    hpPerKill: 0,
    hpScaleByElapsed: BOSS_CONFIG.hpScaleByElapsed,
    collisionW: BOSS_CONFIG.w,
    collisionH: BOSS_CONFIG.h,
    yOffsetFromGround: BOSS_CONFIG.yOffsetFromGround,
    phaseThresholds: [BOSS_CONFIG.phaseTwoThreshold, BOSS_CONFIG.phaseThreeThreshold],
    contactDamageBase: BOSS_CONFIG.touchDamageBase,
    contactDamagePhase: BOSS_CONFIG.touchDamagePhase,
    aiBaseCooldown: BOSS_CONFIG.aiBaseCooldown,
    aiPhaseReduction: BOSS_CONFIG.aiPhaseReduction,
    skillInitialCooldown: BOSS_SKILL1_CONFIG.initialCooldown,
    skillMode: "spiderString",
    drawW: BOSS_CONFIG.drawW,
    drawH: BOSS_CONFIG.drawH,
    castDrawW: 280,
    castDrawH: 280,
    castBottomPadding: 34,
    sheets: {
      move: BOSS_SHEET,
      cast: BOSS_SKILL1_SHEET,
      effect: BOSS_SKILL1_EFFECT_SHEET,
    },
  },
  "dead-bell": {
    id: BOSS_ARCHETYPE_IDS.deadBell,
    displayName: "枯铃",
    phaseTitle: (phase) => `下弦之鬼 · 枯铃 · 阶段 ${phase}`,
    unlockAct: 6,
    awakenedUnlockAct: 12,
    hpBase: 520,
    hpPerKill: 60,
    hpScaleByElapsed: 1.45,
    collisionW: BOSS_CONFIG.w,
    collisionH: BOSS_CONFIG.h,
    yOffsetFromGround: BOSS_CONFIG.yOffsetFromGround,
    phaseThresholds: [BOSS_CONFIG.phaseTwoThreshold, BOSS_CONFIG.phaseThreeThreshold],
    contactDamageBase: 10,
    contactDamagePhase: 2,
    aiBaseCooldown: 112,
    aiPhaseReduction: 12,
    skillInitialCooldown: DEAD_BELL_CONFIG.initialCooldown,
    skillMode: "deadBellSingle",
    drawW: 176,
    drawH: 208,
    castDrawW: 228,
    castDrawH: 228,
    castBottomPadding: 26,
    sheets: {
      move: DEAD_BELL_SHEET,
      cast: DEAD_BELL_CAST_SHEET,
      effect: DEAD_BELL_WAVE_SHEET,
    },
  },
};

export const BOSS_V1_SEQUENCE: BossArchetypeId[] = [
  BOSS_ARCHETYPE_IDS.spiderString,
  BOSS_ARCHETYPE_IDS.deadBell,
];

export function bossArchetypeForId(id: BossArchetypeId) {
  return BOSS_ARCHETYPES[id as RegisteredBossArchetypeId] ?? BOSS_ARCHETYPES[BOSS_ARCHETYPE_IDS.spiderString];
}

export function bossArchetypeForKillCount(bossKills: number) {
  return bossArchetypeForId(BOSS_V1_SEQUENCE[bossKills % BOSS_V1_SEQUENCE.length]);
}
