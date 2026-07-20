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
    "spider-string": {
      name: "蛛弦",
      phaseTitle: chinesePhaseTitle("蛛弦"),
      awakenedPhaseTitle: chineseAwakenedPhaseTitle("蛛弦"),
    },
    "mist-bone": {
      name: "雾骨",
      phaseTitle: chinesePhaseTitle("雾骨"),
      awakenedPhaseTitle: chineseAwakenedPhaseTitle("雾骨"),
    },
    "mirror-dream": {
      name: "镜魇",
      phaseTitle: chinesePhaseTitle("镜魇"),
      awakenedPhaseTitle: chineseAwakenedPhaseTitle("镜魇"),
    },
    "fang-gale": {
      name: "牙岚",
      phaseTitle: chinesePhaseTitle("牙岚"),
      awakenedPhaseTitle: chineseAwakenedPhaseTitle("牙岚"),
    },
    "lantern-ember": {
      name: "灯烬",
      phaseTitle: chinesePhaseTitle("灯烬"),
      awakenedPhaseTitle: chineseAwakenedPhaseTitle("灯烬"),
    },
    "dead-bell": {
      name: "枯铃",
      phaseTitle: chinesePhaseTitle("枯铃"),
      awakenedPhaseTitle: chineseAwakenedPhaseTitle("枯铃"),
    },
    "blood-moon-many-faces": {
      name: "万相血月",
      phaseTitle: (phase) => `终幕夜相 · 万相血月 · 第 ${phase} 相`,
    },
  },
  en: {
    "spider-string": {
      name: "Spider String",
      phaseTitle: englishPhaseTitle("Spider String"),
      awakenedPhaseTitle: englishAwakenedPhaseTitle("Spider String"),
    },
    "mist-bone": {
      name: "Mist Bone",
      phaseTitle: englishPhaseTitle("Mist Bone"),
      awakenedPhaseTitle: englishAwakenedPhaseTitle("Mist Bone"),
    },
    "mirror-dream": {
      name: "Mirror Dream",
      phaseTitle: englishPhaseTitle("Mirror Dream"),
      awakenedPhaseTitle: englishAwakenedPhaseTitle("Mirror Dream"),
    },
    "fang-gale": {
      name: "Fang Gale",
      phaseTitle: englishPhaseTitle("Fang Gale"),
      awakenedPhaseTitle: englishAwakenedPhaseTitle("Fang Gale"),
    },
    "lantern-ember": {
      name: "Lantern Ember",
      phaseTitle: englishPhaseTitle("Lantern Ember"),
      awakenedPhaseTitle: englishAwakenedPhaseTitle("Lantern Ember"),
    },
    "dead-bell": {
      name: "Dead Bell",
      phaseTitle: englishPhaseTitle("Dead Bell"),
      awakenedPhaseTitle: englishAwakenedPhaseTitle("Dead Bell"),
    },
    "blood-moon-many-faces": {
      name: "Many-Faced Blood Moon",
      phaseTitle: (phase) => `Final Night · Many-Faced Blood Moon · Aspect ${phase}`,
    },
  },
};

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
