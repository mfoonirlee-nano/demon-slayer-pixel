import {
  BOSS_CONFIG,
  BOSS_SKILL1_CONFIG,
  BOSS_SHEET,
  BOSS_SKILL1_EFFECT_SHEET,
  BOSS_SKILL1_SHEET,
  BLOOD_MOON_CONFIG,
  BLOOD_MOON_SHEET,
  BLOOD_MOON_SPIDER_MIST_CAST_SHEET,
  BLOOD_MOON_SPIDER_MIST_EFFECT_SHEET,
  DEAD_BELL_CAST_SHEET,
  DEAD_BELL_CONFIG,
  DEAD_BELL_SHEET,
  DEAD_BELL_WAVE_SHEET,
  LANTERN_EMBER_CONFIG,
  LANTERN_EMBER_LURE_EFFECT_SHEET,
  LANTERN_EMBER_SHEET,
  LANTERN_EMBER_SUMMON_SHEET,
  MIRROR_DREAM_CAST_SHEET,
  MIRROR_DREAM_CONFIG,
  MIRROR_DREAM_SHEET,
  MIRROR_SHARD_SHEET,
} from "../../constants";
import type { SpriteSheet } from "../../types/assets";
import type { BossArchetypeId, BossSkillMode } from "../../types/game-state";

export type BossArchetype = {
  id: BossArchetypeId;
  displayName: string;
  phaseTitle: (phase: number) => string;
  awakenedPhaseTitle?: (phase: number) => string;
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
  mirrorDream: "mirror-dream",
  lanternEmber: "lantern-ember",
  deadBell: "dead-bell",
  bloodMoon: "blood-moon-many-faces",
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
  "mirror-dream": {
    id: BOSS_ARCHETYPE_IDS.mirrorDream,
    displayName: "镜魇",
    phaseTitle: (phase) => `下弦之鬼 · 镜魇 · 阶段 ${phase}`,
    unlockAct: 4,
    awakenedUnlockAct: 9,
    hpBase: 500,
    hpPerKill: 54,
    hpScaleByElapsed: 1.7,
    collisionW: BOSS_CONFIG.w,
    collisionH: BOSS_CONFIG.h,
    yOffsetFromGround: BOSS_CONFIG.yOffsetFromGround,
    phaseThresholds: [BOSS_CONFIG.phaseTwoThreshold, BOSS_CONFIG.phaseThreeThreshold],
    contactDamageBase: 10,
    contactDamagePhase: 2,
    aiBaseCooldown: 108,
    aiPhaseReduction: 10,
    skillInitialCooldown: MIRROR_DREAM_CONFIG.initialCooldown,
    skillMode: "mirrorShard",
    drawW: MIRROR_DREAM_CONFIG.drawW,
    drawH: MIRROR_DREAM_CONFIG.drawH,
    castDrawW: MIRROR_DREAM_CONFIG.castDrawW,
    castDrawH: MIRROR_DREAM_CONFIG.castDrawH,
    castBottomPadding: MIRROR_DREAM_CONFIG.castBottomPadding,
    sheets: {
      move: MIRROR_DREAM_SHEET,
      cast: MIRROR_DREAM_CAST_SHEET,
      effect: MIRROR_SHARD_SHEET,
    },
  },
  "lantern-ember": {
    id: BOSS_ARCHETYPE_IDS.lanternEmber,
    displayName: "灯烬",
    phaseTitle: (phase) => `下弦之鬼 · 灯烬 · 阶段 ${phase}`,
    awakenedPhaseTitle: (phase) => `下弦之鬼 · 灯烬·觉醒 · 阶段 ${phase}`,
    unlockAct: 5,
    awakenedUnlockAct: 11,
    hpBase: 540,
    hpPerKill: 58,
    hpScaleByElapsed: 1.35,
    collisionW: BOSS_CONFIG.w,
    collisionH: BOSS_CONFIG.h,
    yOffsetFromGround: BOSS_CONFIG.yOffsetFromGround,
    phaseThresholds: [BOSS_CONFIG.phaseTwoThreshold, BOSS_CONFIG.phaseThreeThreshold],
    contactDamageBase: 9,
    contactDamagePhase: 2,
    aiBaseCooldown: 116,
    aiPhaseReduction: 10,
    skillInitialCooldown: LANTERN_EMBER_CONFIG.initialCooldown,
    skillMode: "lanternLure",
    drawW: LANTERN_EMBER_CONFIG.drawW,
    drawH: LANTERN_EMBER_CONFIG.drawH,
    castDrawW: LANTERN_EMBER_CONFIG.castDrawW,
    castDrawH: LANTERN_EMBER_CONFIG.castDrawH,
    castBottomPadding: LANTERN_EMBER_CONFIG.castBottomPadding,
    sheets: {
      move: LANTERN_EMBER_SHEET,
      cast: LANTERN_EMBER_SUMMON_SHEET,
      effect: LANTERN_EMBER_LURE_EFFECT_SHEET,
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
  "blood-moon-many-faces": {
    id: BOSS_ARCHETYPE_IDS.bloodMoon,
    displayName: "万相血月",
    phaseTitle: (phase) => `终幕之鬼 · 万相血月 · 第 ${phase} 相`,
    unlockAct: 13,
    awakenedUnlockAct: 13,
    hpBase: 1050,
    hpPerKill: 95,
    hpScaleByElapsed: 1.9,
    collisionW: BOSS_CONFIG.w,
    collisionH: BOSS_CONFIG.h,
    yOffsetFromGround: BOSS_CONFIG.yOffsetFromGround,
    phaseThresholds: [0.8, 0.6, 0.4, 0.2],
    contactDamageBase: 11,
    contactDamagePhase: 2,
    aiBaseCooldown: 104,
    aiPhaseReduction: 8,
    skillInitialCooldown: BLOOD_MOON_CONFIG.initialCooldown,
    skillMode: "bloodMoonSpiderMist",
    drawW: BLOOD_MOON_CONFIG.drawW,
    drawH: BLOOD_MOON_CONFIG.drawH,
    castDrawW: BLOOD_MOON_CONFIG.castDrawW,
    castDrawH: BLOOD_MOON_CONFIG.castDrawH,
    castBottomPadding: BLOOD_MOON_CONFIG.castBottomPadding,
    sheets: {
      move: BLOOD_MOON_SHEET,
      cast: BLOOD_MOON_SPIDER_MIST_CAST_SHEET,
      effect: BLOOD_MOON_SPIDER_MIST_EFFECT_SHEET,
    },
  },
};

export const BOSS_V1_SEQUENCE: BossArchetypeId[] = [
  BOSS_ARCHETYPE_IDS.spiderString,
  BOSS_ARCHETYPE_IDS.mirrorDream,
  BOSS_ARCHETYPE_IDS.lanternEmber,
  BOSS_ARCHETYPE_IDS.deadBell,
];

export const FINAL_BOSS_KILL_COUNT = 12;

export function bossArchetypeForId(id: BossArchetypeId) {
  return BOSS_ARCHETYPES[id as RegisteredBossArchetypeId] ?? BOSS_ARCHETYPES[BOSS_ARCHETYPE_IDS.spiderString];
}

export function bossArchetypeForKillCount(bossKills: number) {
  if (bossKills >= FINAL_BOSS_KILL_COUNT) return bossArchetypeForId(BOSS_ARCHETYPE_IDS.bloodMoon);
  return bossArchetypeForId(BOSS_V1_SEQUENCE[bossKills % BOSS_V1_SEQUENCE.length]);
}
