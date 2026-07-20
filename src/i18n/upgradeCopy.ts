import type { SkillLevel, UpgradeChoiceState } from "../types/game-state";
import type { Language } from "./language";
import { skillDescription, skillName } from "./skillCopy";

const MAX_SKILL_LEVEL = 3;

export function localizeUpgradeChoice(
  language: Language,
  choice: UpgradeChoiceState,
): UpgradeChoiceState {
  if (language === "zh-CN") return choice;

  const nextLevel = activeLevel(choice.nextLevel);
  if (choice.skillId && nextLevel) {
    return {
      ...choice,
      title: choice.type === "unlockSkill" ? "Learn New Skill" : "Skill Mastery",
      name: skillName(language, choice.skillId, nextLevel),
      description: skillDescription(language, choice.skillId, nextLevel),
    };
  }

  if (choice.type === "upgradeUltimate" && nextLevel) {
    const isUnlock = nextLevel === 1;
    return {
      ...choice,
      title: isUnlock ? "Learn Ultimate" : "Ultimate Mastery",
      name: `Final Art: Endless Moon Tide ${romanLevel(nextLevel)}`,
      description: isUnlock
        ? "Learn Final Art: Endless Moon Tide. When ultimate energy is full, unleash an empowered tide state."
        : "Extend the empowered tide state and improve movement, jumping, basic attacks, damage, and afterimages.",
    };
  }

  return choice;
}

function activeLevel(level: number | undefined): SkillLevel | null {
  return level === 1 || level === 2 || level === MAX_SKILL_LEVEL ? level : null;
}

function romanLevel(level: SkillLevel) {
  if (level === 1) return "I";
  if (level === 2) return "II";
  return "III";
}
