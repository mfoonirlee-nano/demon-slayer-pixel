import { SKILLS, SKILL_IDS } from "../constants";
import type { SkillId } from "../types/assets";
import type { SkillLevel } from "../types/game-state";
import type { Language } from "./language";

export type LocalizedSkillCopy = {
  name: string;
  description: string;
  levelDescriptions: Record<SkillLevel, string>;
};

const CHINESE_SKILL_COPY = {
  [SKILL_IDS.lineProjectile]: catalogCopy(SKILL_IDS.lineProjectile),
  [SKILL_IDS.closeArc]: catalogCopy(SKILL_IDS.closeArc),
  [SKILL_IDS.guardCounter]: catalogCopy(SKILL_IDS.guardCounter),
  [SKILL_IDS.dashReposition]: catalogCopy(SKILL_IDS.dashReposition),
  [SKILL_IDS.vortexControl]: catalogCopy(SKILL_IDS.vortexControl),
  [SKILL_IDS.armorBreak]: catalogCopy(SKILL_IDS.armorBreak),
  [SKILL_IDS.antiAirMulti]: catalogCopy(SKILL_IDS.antiAirMulti),
  [SKILL_IDS.returningBlade]: catalogCopy(SKILL_IDS.returningBlade),
  [SKILL_IDS.verticalWave]: catalogCopy(SKILL_IDS.verticalWave),
} satisfies Record<SkillId, LocalizedSkillCopy>;

const ENGLISH_SKILL_COPY = {
  [SKILL_IDS.lineProjectile]: {
    name: "Tidal Dragon: Breakthrough",
    description: "A ranged line attack. Launch a tidal dragon straight ahead to pierce enemy ranks or pressure bosses from safety.",
    levelDescriptions: {
      1: "Launch a tidal dragon forward in a long, narrow line, ideal for focused attacks and piercing groups.",
      2: "Tidal dragon damage +18%. Its longer body makes follow-up hits easier at close range.",
      3: "Tidal dragon damage +35%. Knocks normal enemies back two body lengths; while equipped, other attacks have a 10% chance to trigger the same knockback. Bosses are immune.",
    },
  },
  [SKILL_IDS.closeArc]: {
    name: "Crescent Tideblade",
    description: "A close-range escape skill. Sweep a tideblade forward to clear nearby enemies and relieve pressure at platform edges.",
    levelDescriptions: {
      1: "Sweep a small tideblade forward to quickly clear nearby threats.",
      2: "Tideblade damage +18%. The crescent grows larger and travels farther.",
      3: "Tideblade damage +35%. Reaches full size and adds a brief crescent slash to basic attacks.",
    },
  },
  [SKILL_IDS.guardCounter]: {
    name: "Mirror Tide: Riposte",
    description: "A defensive counter. Once the tide veil forms, it blocks damage and counters nearby targets, so timing matters.",
    levelDescriptions: {
      1: "Once formed, the tide veil guards you and can block and counter up to 3 hits.",
      2: "Counter damage +18%. Guard duration and counter range increase slightly.",
      3: "Counter damage +35%. Counters up to 4 hits. While equipped, damage taken is reduced by 15%-30%, scaling with player level.",
    },
  },
  [SKILL_IDS.dashReposition]: {
    name: "Flowstep: Tideflash",
    description: "A short dash. Surge forward through enemies and finish with a sheathing slash, useful for pursuit or escaping a pincer.",
    levelDescriptions: {
      1: "Dash a short distance, pierce enemies ahead, then finish with a sheathing slash.",
      2: "Dash farther; the sheathing slash gains range and damage, improving pursuit.",
      3: "Further strengthens the dash and sheathing slash while keeping it a short repositioning move.",
    },
  },
  [SKILL_IDS.vortexControl]: {
    name: "Undertow Vortex",
    description: "Crowd control. Create a ground vortex that pulls and slows normal enemies, opening attack windows. Bosses cannot be pulled.",
    levelDescriptions: {
      1: "Create a brief vortex that pulls and slows normal enemies; bosses only take damage.",
      2: "The vortex lasts longer, covers more area, and pulls and slows more strongly.",
      3: "The vortex restrains enemies even more, but still cannot pull bosses.",
    },
  },
  [SKILL_IDS.armorBreak]: {
    name: "Sunderwave: Armor Rend",
    description: "An armor-breaking attack. Fire a tidal line forward; targets hit briefly take more damage from follow-up attacks.",
    levelDescriptions: {
      1: "The tidal line applies Armor Rend on hit, briefly increasing follow-up damage.",
      2: "The tidal line travels farther; Armor Rend lasts longer and increases follow-up damage more.",
      3: "Damage, travel distance, and Armor Rend all improve; Armor Rend is weaker against bosses.",
    },
  },
  [SKILL_IDS.antiAirMulti]: {
    name: "Needle Rain",
    description: "Anti-air pressure. Call down several diagonal tidal lines to strike flying enemies, distant casters, and weakened targets.",
    levelDescriptions: {
      1: "Call down 4 tidal lines to cover targets above and at range.",
      2: "Call down 5 tidal lines, each dealing more damage for denser anti-air coverage.",
      3: "Call down 6 tidal lines. Each cast has a 30% chance to add a raindrop strike dealing 50% skill damage.",
    },
  },
  [SKILL_IDS.returningBlade]: {
    name: "Returning Tideblade",
    description: "Route control. Throw a tideblade that damages on both the outbound and return paths. It retraces its route instead of tracking across the arena.",
    levelDescriptions: {
      1: "The tideblade flies out and returns, hitting up to 2 times and rewarding careful positioning.",
      2: "Travel distance and damage increase, with up to 3 hits.",
      3: "Hits up to 4 times for greater route payoff, but does not track targets across the arena.",
    },
  },
  [SKILL_IDS.verticalWave]: {
    name: "Rising Wave",
    description: "Vertical interrupt. Raise a wave pillar just ahead to catch nearby and airborne targets. It pops them up briefly rather than suspending them.",
    levelDescriptions: {
      1: "Raise a short wave pillar that interrupts nearby and overhead targets with a slight lift.",
      2: "The pillar grows taller and wider, dealing more damage and lifting more strongly.",
      3: "Coverage and damage increase further, but it cannot keep targets airborne for long.",
    },
  },
} satisfies Record<SkillId, LocalizedSkillCopy>;

const LOCALIZED_SKILL_COPY: Record<Language, Record<SkillId, LocalizedSkillCopy>> = {
  "zh-CN": CHINESE_SKILL_COPY,
  en: ENGLISH_SKILL_COPY,
};

const ROMAN_SKILL_LEVEL: Record<SkillLevel, string> = {
  1: "I",
  2: "II",
  3: "III",
};

export function skillCopy(language: Language, skillId: SkillId): LocalizedSkillCopy {
  return LOCALIZED_SKILL_COPY[language][skillId];
}

export function skillName(language: Language, skillId: SkillId, level?: SkillLevel) {
  const name = skillCopy(language, skillId).name;
  return level ? `${name} ${ROMAN_SKILL_LEVEL[level]}` : name;
}

export function skillDescription(language: Language, skillId: SkillId, level: SkillLevel) {
  return skillCopy(language, skillId).levelDescriptions[level];
}

function catalogCopy(skillId: SkillId): LocalizedSkillCopy {
  const skill = SKILLS.find((candidate) => candidate.id === skillId);
  if (!skill) throw new Error(`Missing skill copy for ${skillId}`);

  return {
    name: skill.name,
    description: skill.description,
    levelDescriptions: skill.levelDescriptions,
  };
}
