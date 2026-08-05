import type { SegmentKind } from "../entities/platform";
import type { DebugEnemyKind } from "../game/debug";
import type { ActBand } from "../types/game-state";
import type { Language } from "./language";

const DEBUG_ENEMY_LABELS: Record<Language, Record<DebugEnemyKind, string>> = {
  "zh-CN": {
    chaser: "追猎者",
    crawler: "爬行者",
    runner: "奔袭者",
    caster: "咒术师",
    duelist: "决斗者",
    brute: "重甲者",
    binder: "符缚者",
    glider: "翔妖",
    leaper: "跃袭者",
    splitter: "分裂体",
    warden: "守卫",
    burrower: "遁地者",
  },
  en: {
    chaser: "Chaser",
    crawler: "Crawler",
    runner: "Runner",
    caster: "Caster",
    duelist: "Duelist",
    brute: "Brute",
    binder: "Binder",
    glider: "Glider",
    leaper: "Leaper",
    splitter: "Splitter",
    warden: "Warden",
    burrower: "Burrower",
  },
};

const DEBUG_GROWTH_LABELS: Record<Language, Record<ActBand, string>> = {
  "zh-CN": { intro: "初始", awakened: "觉醒", final: "终幕" },
  en: { intro: "Intro", awakened: "Awakened", final: "Final" },
};

const DEBUG_PLATFORM_LABELS: Record<Language, Record<SegmentKind, string>> = {
  "zh-CN": {
    safeBridge: "常规桥",
    breather: "喘息段",
    stairUp: "上行阶梯",
    stairDown: "下行阶梯",
    zigzag: "折线路",
    gapJump: "间隙跳台",
    hoverPair: "浮台组",
    riskFork: "风险岔路",
  },
  en: {
    safeBridge: "Safe Bridge",
    breather: "Breather",
    stairUp: "Stairs Up",
    stairDown: "Stairs Down",
    zigzag: "Zigzag",
    gapJump: "Gap Jump",
    hoverPair: "Hover Pair",
    riskFork: "Risk Fork",
  },
};

export function debugEnemyLabel(language: Language, enemy: DebugEnemyKind) {
  return DEBUG_ENEMY_LABELS[language][enemy];
}

export function debugGrowthLabel(language: Language, growth: ActBand) {
  return DEBUG_GROWTH_LABELS[language][growth];
}

export function debugPlatformLabel(language: Language, platform: SegmentKind) {
  return DEBUG_PLATFORM_LABELS[language][platform];
}
