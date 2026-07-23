import {
  ARMOR_BREAK_PASSIVE_CONFIG,
  ANTI_AIR_MULTI_BONUS_DROP_CONFIG,
  DASH_REPOSITION_PASSIVE_CONFIG,
  RETURNING_BLADE_WATER_RING_CONFIG,
  SKILL_IDS,
  VERTICAL_WAVE_PILLAR_CONFIG,
  VORTEX_CONTROL_DOUBLE_JUMP_CONFIG,
} from "../constants";
import type { Language } from "../i18n/language";
import { formatRewardUnit, rewardLabel } from "../i18n/rewardMessages";
import type { SkillId } from "../types/assets";
import type { SkillLevel } from "../types/game-state";
import { formatPercent, formatSignedPercent } from "../utils";

export function skillLevelUnlockRewardMetric(
  skillId: SkillId,
  nextLevel: SkillLevel,
  previousLevel: SkillLevel | 0,
  language: Language,
) {
  if (
    skillId === SKILL_IDS.antiAirMulti
    && unlocksLevel(nextLevel, previousLevel, ANTI_AIR_MULTI_BONUS_DROP_CONFIG.requiredLevel)
  ) {
    return {
      label: rewardLabel(language, "bonusRainDrop"),
      value: `${formatPercent(ANTI_AIR_MULTI_BONUS_DROP_CONFIG.chance)} / ${
        skillDamageValue(language, ANTI_AIR_MULTI_BONUS_DROP_CONFIG.damageMultiplier)
      }`,
      tone: "damage" as const,
    };
  }

  if (
    skillId === SKILL_IDS.verticalWave
    && unlocksLevel(nextLevel, previousLevel, VERTICAL_WAVE_PILLAR_CONFIG.requiredLevel)
  ) {
    return {
      label: rewardLabel(language, "bonusWaterPillars"),
      value: `${formatPercent(VERTICAL_WAVE_PILLAR_CONFIG.chance)} / ${
        VERTICAL_WAVE_PILLAR_CONFIG.count
      }×${skillDamageValue(language, VERTICAL_WAVE_PILLAR_CONFIG.damageMultiplier)}`,
      tone: "damage" as const,
    };
  }

  if (
    skillId === SKILL_IDS.returningBlade
    && unlocksLevel(nextLevel, previousLevel, RETURNING_BLADE_WATER_RING_CONFIG.requiredLevel)
  ) {
    return {
      label: rewardLabel(language, "bonusWaterRingSlash"),
      value: `${formatPercent(RETURNING_BLADE_WATER_RING_CONFIG.chance)} / ${
        skillDamageValue(language, RETURNING_BLADE_WATER_RING_CONFIG.damageMultiplier)
      }`,
      tone: "damage" as const,
    };
  }

  if (
    skillId === SKILL_IDS.vortexControl
    && unlocksLevel(nextLevel, previousLevel, VORTEX_CONTROL_DOUBLE_JUMP_CONFIG.requiredLevel)
  ) {
    return {
      label: rewardLabel(language, "extraMidairJump"),
      value: formatRewardUnit(
        language,
        "jumps",
        `+${VORTEX_CONTROL_DOUBLE_JUMP_CONFIG.extraAirJumps}`,
      ),
      tone: "utility" as const,
    };
  }

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

function skillDamageValue(language: Language, multiplier: number) {
  return formatRewardUnit(language, "skillDamage", formatPercent(multiplier));
}

function unlocksLevel(
  nextLevel: SkillLevel,
  previousLevel: SkillLevel | 0,
  requiredLevel: number,
) {
  return nextLevel >= requiredLevel && previousLevel < requiredLevel;
}
