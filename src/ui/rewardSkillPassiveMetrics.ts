import {
  ARMOR_BREAK_PASSIVE_CONFIG,
  DASH_REPOSITION_PASSIVE_CONFIG,
  SKILL_IDS,
} from "../constants";
import type { Language } from "../i18n/language";
import { rewardLabel } from "../i18n/rewardMessages";
import type { SkillId } from "../types/assets";
import type { SkillLevel } from "../types/game-state";
import { formatPercent, formatSignedPercent } from "../utils";

export function skillPassiveRewardMetric(
  skillId: SkillId,
  nextLevel: SkillLevel,
  previousLevel: SkillLevel | 0,
  language: Language,
) {
  if (
    skillId === SKILL_IDS.dashReposition
    && unlocksLevel(nextLevel, previousLevel, DASH_REPOSITION_PASSIVE_CONFIG.requiredLevel)
  ) {
    return {
      label: rewardLabel(language, "moveSpeed"),
      value: formatSignedPercent(DASH_REPOSITION_PASSIVE_CONFIG.moveSpeedMultiplier - 1),
      tone: "speed" as const,
    };
  }

  if (
    skillId === SKILL_IDS.armorBreak
    && unlocksLevel(nextLevel, previousLevel, ARMOR_BREAK_PASSIVE_CONFIG.requiredLevel)
  ) {
    return {
      label: rewardLabel(language, "passiveShieldPenetration"),
      value: formatPercent(ARMOR_BREAK_PASSIVE_CONFIG.shieldPenetration),
      tone: "utility" as const,
    };
  }

  return null;
}

function unlocksLevel(
  nextLevel: SkillLevel,
  previousLevel: SkillLevel | 0,
  requiredLevel: number,
) {
  return nextLevel >= requiredLevel && previousLevel < requiredLevel;
}
