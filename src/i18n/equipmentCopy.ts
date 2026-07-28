import type {
  EquipmentFamily,
  EquipmentItemId,
  EquipmentItemState,
  EquipmentSlot,
  EquipmentTier,
} from "../types/game-state";
import {
  BURST_BLADE_PAIR_RESONANCE_EXECUTE_HP_RATIO,
  BURST_TALISMAN_PAIR_RESONANCE_COOLDOWN_FRAMES,
  EQUIPMENT_PAIR_COOLDOWN_MULTIPLIER,
  EQUIPMENT_PAIR_TRIGGER_REDUCTION,
  FLOW_FULL_HEALTH_REGEN_PER_SECOND,
  FLOW_PAIR_SKILL_ENERGY_REGEN_PER_SECOND,
  FULL_RESONANCE_SKILL_ENERGY_GAIN,
  SHADOWSTEP_FULL_RESONANCE_SKILL_ENERGY_GAIN,
  SHADOWSTEP_PAIR_DODGE_CHANCE,
} from "../constants";
import {
  EQUIPMENT_FAMILY_LABELS as ZH_EQUIPMENT_FAMILY_LABELS,
  EQUIPMENT_PRIMARY_STAT_LABELS as ZH_EQUIPMENT_PRIMARY_STAT_LABELS,
  EQUIPMENT_TIER_LABELS as ZH_EQUIPMENT_TIER_LABELS,
  equipmentItemForTier,
} from "../systems/equipmentCatalog";
import { formatPercent } from "../utils";
import type { Language } from "./language";

const EQUIPMENT_FAMILY_LABELS: Record<Language, Record<EquipmentFamily, string>> = {
  "zh-CN": ZH_EQUIPMENT_FAMILY_LABELS,
  en: {
    flow: "Flow",
    burst: "Burst",
    shadowstep: "Shadowstep",
    hunt: "Hunt",
    risk: "Risk",
    tempo: "Tempo",
  },
};

const EQUIPMENT_FAMILY_MARKS: Record<Language, Record<EquipmentFamily, string>> = {
  "zh-CN": {
    flow: "流",
    burst: "破",
    shadowstep: "影",
    hunt: "猎",
    risk: "残",
    tempo: "奏",
  },
  en: {
    flow: "F",
    burst: "B",
    shadowstep: "S",
    hunt: "H",
    risk: "R",
    tempo: "T",
  },
};

const EQUIPMENT_TIER_LABELS: Record<Language, Record<EquipmentTier, string>> = {
  "zh-CN": ZH_EQUIPMENT_TIER_LABELS,
  en: { common: "Common", fine: "Fine", awakened: "Awakened" },
};

const EQUIPMENT_SLOT_LABELS: Record<Language, Record<EquipmentSlot, string>> = {
  "zh-CN": { blade: "刃器", garb: "衣装", talisman: "饰符" },
  en: { blade: "Blade", garb: "Garb", talisman: "Talisman" },
};

const EQUIPMENT_PRIMARY_STAT_LABELS: Record<Language, Record<EquipmentSlot, string>> = {
  "zh-CN": ZH_EQUIPMENT_PRIMARY_STAT_LABELS,
  en: { blade: "Attack", garb: "Max HP", talisman: "Skill Energy Cap" },
};

export type EquipmentFamilyResonanceCopy = {
  pair: string;
  full: string;
};

const EQUIPMENT_FAMILY_RESONANCE_COPY: Record<
  Language,
  Record<EquipmentFamily, EquipmentFamilyResonanceCopy>
> = {
  "zh-CN": {
    flow: {
      pair: `2 件：触发门槛 -${EQUIPMENT_PAIR_TRIGGER_REDUCTION}；每秒恢复 ${FLOW_PAIR_SKILL_ENERGY_REGEN_PER_SECOND} 点技能能量。`,
      full: `3 件：核心效果触发额外获得 ${FULL_RESONANCE_SKILL_ENERGY_GAIN} 点技能能量；每秒恢复 ${FLOW_FULL_HEALTH_REGEN_PER_SECOND} 点生命。`,
    },
    burst: {
      pair: `2 件：Boss 斩杀线提高至 ${formatPercent(BURST_BLADE_PAIR_RESONANCE_EXECUTE_HP_RATIO)}；燃魂符冷却降至 ${BURST_TALISMAN_PAIR_RESONANCE_COOLDOWN_FRAMES} 帧。`,
      full: `3 件：燃魂符触发额外获得 ${FULL_RESONANCE_SKILL_ENERGY_GAIN} 点技能能量。`,
    },
    shadowstep: {
      pair: `2 件：拥有 ${formatPercent(SHADOWSTEP_PAIR_DODGE_CHANCE)} 闪避几率。`,
      full: `3 件：触发掠影时额外获得 ${SHADOWSTEP_FULL_RESONANCE_SKILL_ENERGY_GAIN} 点技能能量。`,
    },
    hunt: {
      pair: `2 件：连杀门槛 -${EQUIPMENT_PAIR_TRIGGER_REDUCTION}；连珠符冷却缩短 ${formatPercent(1 - EQUIPMENT_PAIR_COOLDOWN_MULTIPLIER)}。`,
      full: `3 件：连珠符触发额外获得 ${FULL_RESONANCE_SKILL_ENERGY_GAIN} 点技能能量。`,
    },
    risk: {
      pair: "2 件：暂无套装效果。",
      full: `3 件：返魂符触发额外获得 ${FULL_RESONANCE_SKILL_ENERGY_GAIN} 点技能能量。`,
    },
    tempo: {
      pair: "2 件：暂无套装效果。",
      full: "3 件：暂无套装效果。",
    },
  },
  en: {
    flow: {
      pair: `2-piece: Trigger requirements -${EQUIPMENT_PAIR_TRIGGER_REDUCTION}; +${FLOW_PAIR_SKILL_ENERGY_REGEN_PER_SECOND} skill energy/sec.`,
      full: `3-piece: Core triggers +${FULL_RESONANCE_SKILL_ENERGY_GAIN} skill energy; +${FLOW_FULL_HEALTH_REGEN_PER_SECOND} HP/sec.`,
    },
    burst: {
      pair: `2-piece: Execute at ${formatPercent(BURST_BLADE_PAIR_RESONANCE_EXECUTE_HP_RATIO)}; Soulfire cooldown ${BURST_TALISMAN_PAIR_RESONANCE_COOLDOWN_FRAMES} frames.`,
      full: `3-piece: Soulfire triggers +${FULL_RESONANCE_SKILL_ENERGY_GAIN} skill energy.`,
    },
    shadowstep: {
      pair: `2-piece: Gain ${formatPercent(SHADOWSTEP_PAIR_DODGE_CHANCE)} dodge chance.`,
      full: `3-piece: Shadowglide triggers grant +${SHADOWSTEP_FULL_RESONANCE_SKILL_ENERGY_GAIN} skill energy.`,
    },
    hunt: {
      pair: `2-piece: Kill requirements -${EQUIPMENT_PAIR_TRIGGER_REDUCTION}; Chainbead cooldown -${formatPercent(1 - EQUIPMENT_PAIR_COOLDOWN_MULTIPLIER)}.`,
      full: `3-piece: Chainbead triggers grant +${FULL_RESONANCE_SKILL_ENERGY_GAIN} skill energy.`,
    },
    risk: {
      pair: "2-piece: No set bonus.",
      full: `3-piece: Soulreturn triggers grant +${FULL_RESONANCE_SKILL_ENERGY_GAIN} skill energy.`,
    },
    tempo: {
      pair: "2-piece: No set bonus.",
      full: "3-piece: No set bonus.",
    },
  },
};

type EnglishEquipmentItemCopy = {
  name: string;
  tiers: Record<EquipmentTier, { summary: string; tag: string }>;
};

const EN_EQUIPMENT_COPY: Record<EquipmentItemId, EnglishEquipmentItemCopy> = {
  flow_blade: {
    name: "Flow Blade",
    tiers: {
      common: { summary: "After 4 basic hits, your next skill deals more damage.", tag: "Basic Charge" },
      fine: {
        summary: "After 3 basic hits, empower your next skill; empowered hits refund skill energy.",
        tag: "Surge Refund",
      },
      awakened: {
        summary: "After 3 basic hits, empower your next skill; hitting a Boss also grants ultimate energy.",
        tag: "Final Surge",
      },
    },
  },
  flow_garb: {
    name: "Ripple Garb",
    tiers: {
      common: { summary: "After casting a skill, briefly move faster.", tag: "Skillcast Haste" },
      fine: {
        summary: "After casting a skill, move faster and briefly take slightly less damage.",
        tag: "Mobile Guard",
      },
      awakened: {
        summary: "Gain speed and light damage reduction after a skill; empowered multi-hits extend them.",
        tag: "Surge Extension",
      },
    },
  },
  flow_talisman: {
    name: "Tidecall Talisman",
    tiers: {
      common: {
        summary: "Hitting 2+ targets with a skill refunds a little skill energy.",
        tag: "Multi-Hit Refund",
      },
      fine: {
        summary: "Hitting 2+ targets refunds more skill energy; Boss hits also qualify.",
        tag: "Precise Refund",
      },
      awakened: {
        summary: "Hitting 3+ targets or a Boss refunds skill energy and grants ultimate energy.",
        tag: "Tidecall Finale",
      },
    },
  },
  burst_blade: {
    name: "Moonbreak Blade",
    tiers: {
      common: { summary: "Deal more damage to Bosses below 35% HP.", tag: "Boss Execute" },
      fine: {
        summary: "Deal more damage to low-HP Bosses; first crossing the threshold empowers your next basic.",
        tag: "Execute Strike",
      },
      awakened: {
        summary: "Deal more damage to low-HP Bosses; an ultimate hit adds another slash.",
        tag: "Final Execute",
      },
    },
  },
  burst_garb: {
    name: "Sundered Moon Garb",
    tiers: {
      common: {
        summary: "Once per Boss fight, lethal damage leaves 1 HP and briefly grants invulnerability.",
        tag: "Last-Chance Guard",
      },
      fine: {
        summary: "After lethal guard triggers, briefly move faster.",
        tag: "Escape Surge",
      },
      awakened: {
        summary: "Lethal guard clears hitstun, grants brief invulnerability, and restores one skill bar.",
        tag: "Moonbreak Recovery",
      },
    },
  },
  burst_talisman: {
    name: "Soulfire Talisman",
    tiers: {
      common: {
        summary: "Damaging a Boss grants a little ultimate energy on a short cooldown.",
        tag: "Ultimate Cycle",
      },
      fine: {
        summary: "Damaging a Boss grants ultimate energy; skill hits trigger it once more.",
        tag: "Skill Soulfire",
      },
      awakened: {
        summary: "Damaging a Boss grants ultimate energy; defeating one preserves some for the next act.",
        tag: "Soulfire Reserve",
      },
    },
  },
  shadowstep_blade: {
    name: "Shadowflow Blade",
    tiers: {
      common: {
        summary: "After moving continuously for some distance, your next basic gains reach.",
        tag: "Moving Shadow",
      },
      fine: {
        summary: "Continuous movement primes Shadow Slash with greater reach and damage.",
        tag: "Wide Shadow Slash",
      },
      awakened: {
        summary: "Shadow Slash hits briefly speed its recharge; hitting a Boss grants ultimate energy.",
        tag: "Final Shadow Slash",
      },
    },
  },
  shadowstep_garb: {
    name: "Shadowstep Garb",
    tiers: {
      common: {
        summary: "While moving continuously, take less contact damage; the guard fades when you stop.",
        tag: "Moving Guard",
      },
      fine: {
        summary: "While moving continuously, take less contact damage and slightly less knockback.",
        tag: "Shuttle Poise",
      },
      awakened: {
        summary: "While moving, take less damage and knockback; taking damage briefly boosts speed.",
        tag: "Hit Sprint",
      },
    },
  },
  shadowstep_talisman: {
    name: "Shadowglide Talisman",
    tiers: {
      common: {
        summary: "Passing near an enemy grants a little skill energy on a short cooldown.",
        tag: "Pass-By Refund",
      },
      fine: {
        summary: "Passing near an enemy grants skill energy; gain extra near groups.",
        tag: "Crowd Refund",
      },
      awakened: {
        summary: "Passing near an enemy or Boss grants skill energy; near a Boss also grants ultimate energy.",
        tag: "Final Shadowglide",
      },
    },
  },
  hunt_blade: {
    name: "Huntfang Blade",
    tiers: {
      common: {
        summary: "After several quick mob kills, your next basic attack gains reach.",
        tag: "Kill-Chain Boost",
      },
      fine: {
        summary: "A kill chain makes your next basic attack wider and stronger.",
        tag: "Waterblade Strike",
      },
      awakened: {
        summary: "After a kill chain, basic attacks periodically gain reach and damage for a short time.",
        tag: "Chainhunt Waterblade",
      },
    },
  },
  hunt_garb: {
    name: "Pursuit Garb",
    tiers: {
      common: { summary: "After killing a mob, briefly move faster.", tag: "Kill Haste" },
      fine: {
        summary: "After killing a mob, move faster; a kill chain refreshes the duration.",
        tag: "Chain Sprint",
      },
      awakened: {
        summary: "During a kill chain, move faster and reduce the damage of the next hit.",
        tag: "Hunter's Guard",
      },
    },
  },
  hunt_talisman: {
    name: "Chainbead Talisman",
    tiers: {
      common: { summary: "After 3 quick mob kills, gain skill energy.", tag: "Kill-Chain Energy" },
      fine: {
        summary: "After 3 quick mob kills, gain skill energy and a little ultimate energy.",
        tag: "Kill-Chain Finale",
      },
      awakened: {
        summary: "After 3 quick mob kills, gain skill and ultimate energy; defeating a Boss resets the cooldown.",
        tag: "Chainbead Reset",
      },
    },
  },
  risk_blade: {
    name: "Resolve Blade",
    tiers: {
      common: { summary: "Below 35% HP, basic attacks deal more damage.", tag: "Low-HP Counter" },
      fine: {
        summary: "Below 35% HP, basic attacks and skills deal more damage.",
        tag: "Low-HP Skill",
      },
      awakened: {
        summary: "Below 35% HP, deal more damage; first crossing the threshold empowers your next skill.",
        tag: "Resolve Surge",
      },
    },
  },
  risk_garb: {
    name: "Crimsonweave Garb",
    tiers: {
      common: { summary: "Below 35% HP, take less damage.", tag: "Low-HP Guard" },
      fine: {
        summary: "Below 35% HP, take less damage and gain longer invulnerability after hits.",
        tag: "Low-HP Invulnerability",
      },
      awakened: {
        summary: "Once per Boss fight, dropping below 35% HP clears hitstun and briefly grants invulnerability.",
        tag: "Crimson Lifeline",
      },
    },
  },
  risk_talisman: {
    name: "Soulreturn Talisman",
    tiers: {
      common: { summary: "The first time each act you drop below 35% HP, gain skill energy.", tag: "Near-Death Energy" },
      fine: {
        summary: "The first time each act you drop below 35% HP, gain more skill energy.",
        tag: "Near-Death Refund",
      },
      awakened: {
        summary: "The first time each act below 35% HP, fill at least one skill bar and gain ultimate energy.",
        tag: "Soulreturn Finale",
      },
    },
  },
  tempo_blade: {
    name: "Swiftbeat Blade",
    tiers: {
      common: {
        summary: "Basic attacks animate faster, but each deals slightly less damage.",
        tag: "Rapid Basics",
      },
      fine: {
        summary: "Basic attacks become even faster, with a smaller damage penalty.",
        tag: "Reduced Penalty",
      },
      awakened: {
        summary: "Basic attacks are faster; after consecutive hits, your next basic ignores the penalty.",
        tag: "Beat Break",
      },
    },
  },
  tempo_garb: {
    name: "Swiftwind Garb",
    tiers: {
      common: {
        summary: "Reduce knockback after taking damage, making it easier to reengage.",
        tag: "Knockback Resist",
      },
      fine: {
        summary: "Reduce knockback and briefly move faster after taking damage.",
        tag: "Hit Recovery",
      },
      awakened: {
        summary: "After taking damage, reduce knockback and move faster; avoid another hit to gain skill energy.",
        tag: "Steady Refund",
      },
    },
  },
  tempo_talisman: {
    name: "Beatcall Talisman",
    tiers: {
      common: {
        summary: "Skills cost slightly less, but ultimate energy gain is slightly reduced.",
        tag: "Low-Cost Skills",
      },
      fine: {
        summary: "Skills cost even less, with a smaller ultimate energy penalty.",
        tag: "Lighter Tradeoff",
      },
      awakened: {
        summary: "Skill cost reaches its floor; casting different skills in succession refunds skill energy.",
        tag: "Skill Swap Refund",
      },
    },
  },
};

export type EquipmentItemCopy = {
  name: string;
  summary: string;
  tag: string;
};

export function equipmentFamilyLabel(language: Language, family: EquipmentFamily) {
  return EQUIPMENT_FAMILY_LABELS[language][family];
}

export function equipmentFamilyMark(language: Language, family: EquipmentFamily) {
  return EQUIPMENT_FAMILY_MARKS[language][family];
}

export function equipmentFamilyResonanceCopy(language: Language, family: EquipmentFamily) {
  return EQUIPMENT_FAMILY_RESONANCE_COPY[language][family];
}

export function equipmentTierLabel(language: Language, tier: EquipmentTier) {
  return EQUIPMENT_TIER_LABELS[language][tier];
}

export function equipmentSlotLabel(language: Language, slot: EquipmentSlot) {
  return EQUIPMENT_SLOT_LABELS[language][slot];
}

export function equipmentPrimaryStatLabel(language: Language, slot: EquipmentSlot) {
  return EQUIPMENT_PRIMARY_STAT_LABELS[language][slot];
}

export function equipmentItemCopy(
  language: Language,
  itemId: EquipmentItemId,
  tier: EquipmentTier,
): EquipmentItemCopy {
  if (language === "zh-CN") {
    const item = equipmentItemForTier(itemId, tier);
    return { name: item.name, summary: item.summary, tag: item.uiTags[1] };
  }

  const item = EN_EQUIPMENT_COPY[itemId];
  return { name: item.name, ...item.tiers[tier] };
}

export function localizeEquipmentItem<T extends EquipmentItemState>(language: Language, item: T): T {
  const copy = equipmentItemCopy(language, item.id, item.tier);
  return {
    ...item,
    name: copy.name,
    summary: copy.summary,
    uiTags: [equipmentTierLabel(language, item.tier), copy.tag],
  };
}
