import type { BossArchetypeId } from "../types/game-state";
import type { Language } from "./language";

type PhaseTitle = (phase: number) => string;

type BossPresentationCopy = {
  name: string;
  phaseTitle: PhaseTitle;
  awakenedPhaseTitle?: PhaseTitle;
};

const BOSS_COPY: Record<Language, Record<BossArchetypeId, BossPresentationCopy>> = {
  "zh-CN": {
    "spider-string": chineseBossCopy("蛛弦"),
    "mist-bone": chineseBossCopy("雾骨"),
    "mirror-dream": chineseBossCopy("镜魇"),
    "fang-gale": chineseBossCopy("牙岚"),
    "lantern-ember": chineseBossCopy("灯烬"),
    "dead-bell": chineseBossCopy("枯铃"),
    "blood-moon-many-faces": {
      name: "万相血月",
      phaseTitle: (phase) => `终幕夜相 · 万相血月 · 第 ${phase} 相`,
    },
  },
  en: {
    "spider-string": englishBossCopy("Spider String"),
    "mist-bone": englishBossCopy("Mist Bone"),
    "mirror-dream": englishBossCopy("Mirror Dream"),
    "fang-gale": englishBossCopy("Fang Gale"),
    "lantern-ember": englishBossCopy("Lantern Ember"),
    "dead-bell": englishBossCopy("Dead Bell"),
    "blood-moon-many-faces": {
      name: "Many-Faced Blood Moon",
      phaseTitle: (phase) => `Final Night · Many-Faced Blood Moon · Aspect ${phase}`,
    },
  },
};

function chineseBossCopy(name: string): BossPresentationCopy {
  return {
    name,
    phaseTitle: chinesePhaseTitle(name),
    awakenedPhaseTitle: chineseAwakenedPhaseTitle(name),
  };
}

function englishBossCopy(name: string): BossPresentationCopy {
  return {
    name,
    phaseTitle: englishPhaseTitle(name),
    awakenedPhaseTitle: englishAwakenedPhaseTitle(name),
  };
}

export function bossName(language: Language, bossId: BossArchetypeId) {
  return BOSS_COPY[language][bossId].name;
}

export function bossPhaseTitle(
  language: Language,
  bossId: BossArchetypeId,
  phase: number,
  awakened: boolean,
) {
  const copy = BOSS_COPY[language][bossId];
  const title = awakened ? copy.awakenedPhaseTitle ?? copy.phaseTitle : copy.phaseTitle;
  return title(phase);
}

function chinesePhaseTitle(name: string): PhaseTitle {
  return (phase) => `血月眷属 · ${name} · 阶段 ${phase}`;
}

function chineseAwakenedPhaseTitle(name: string): PhaseTitle {
  return (phase) => `血月眷属 · ${name}·蚀醒 · 阶段 ${phase}`;
}

function englishPhaseTitle(name: string): PhaseTitle {
  return (phase) => `Blood Moon Kin · ${name} · Phase ${phase}`;
}

function englishAwakenedPhaseTitle(name: string): PhaseTitle {
  return (phase) => `Blood Moon Kin · Awakened ${name} · Phase ${phase}`;
}
