import {
  CLOSE_ARC_BASIC_CRESCENT_CONFIG,
  EQUIPMENT_PRIMARY_STAT_BONUS_RATIOS,
  GUARD_COUNTER_EFFECT_CONFIG,
  LINE_PROJECTILE_EFFECT_CONFIG,
  MOON_TIDE_ULTIMATE,
  PLAYER_COMBAT,
  SKILL_IDS,
} from "../constants";
import { CORE_PLAYER_SKILL_EFFECT_CONFIGS } from "../systems/skillCatalog";
import {
  BURST_BLADE_AWAKENED_SLASH_ATTACK_SCALE,
  BURST_BLADE_BOSS_DAMAGE_MULTIPLIER,
  BURST_BLADE_BOSS_HP_RATIO,
  BURST_BLADE_EXECUTE_ATTACK_MULTIPLIER,
  BURST_GARB_INVINCIBLE_FRAMES,
  BURST_GARB_SPEED_MULTIPLIER,
  BURST_GARB_SPEED_TIMER_FRAMES,
  BURST_TALISMAN_COOLDOWN,
  BURST_TALISMAN_RETAIN_RATIO,
  BURST_TALISMAN_SKILL_BOSS_ULTIMATE_GAIN,
  BURST_TALISMAN_ULTIMATE_GAIN,
  FLOW_BLADE_HITS_REQUIRED,
  FLOW_BLADE_SKILL_DAMAGE_MULTIPLIER,
  FLOW_BLADE_SKILL_REFUND,
  FLOW_BLADE_ULTIMATE_GAIN,
  FLOW_GARB_DAMAGE_MULTIPLIER,
  FLOW_GARB_EXTEND_FRAMES,
  FLOW_GARB_SPEED_MULTIPLIER,
  FLOW_GARB_TIMER_FRAMES,
  FLOW_TALISMAN_HIT_THRESHOLD,
  FLOW_TALISMAN_REFUND,
  FLOW_TALISMAN_ULTIMATE_GAIN,
  HUNT_BLADE_DAMAGE_MULTIPLIER,
  HUNT_BLADE_KILLS_REQUIRED,
  HUNT_BLADE_REACH_BONUS,
  HUNT_BLADE_WATER_TIMER_FRAMES,
  HUNT_GARB_GUARD_DAMAGE_MULTIPLIER,
  HUNT_GARB_SPEED_MULTIPLIER,
  HUNT_GARB_TIMER_FRAMES,
  HUNT_KILL_WINDOW,
  HUNT_TALISMAN_COOLDOWN,
  HUNT_TALISMAN_KILLS_REQUIRED,
  HUNT_TALISMAN_SKILL_GAIN,
  HUNT_TALISMAN_ULTIMATE_GAIN,
  LOW_HP_RATIO,
  RISK_BLADE_AWAKENED_SKILL_MULTIPLIER,
  RISK_BLADE_BASIC_DAMAGE_MULTIPLIER,
  RISK_BLADE_SKILL_DAMAGE_MULTIPLIER,
  RISK_GARB_AWAKENED_INVINCIBLE_FRAMES,
  RISK_GARB_DAMAGE_MULTIPLIER,
  RISK_GARB_FINE_INVINCIBLE_BONUS_FRAMES,
  RISK_TALISMAN_SKILL_GAIN,
  RISK_TALISMAN_ULTIMATE_GAIN,
  SHADOWSTEP_BLADE_DAMAGE_MULTIPLIER,
  SHADOWSTEP_BLADE_REACH_BONUS,
  SHADOWSTEP_BLADE_ULTIMATE_GAIN,
  SHADOWSTEP_DISTANCE_REQUIRED,
  SHADOWSTEP_GARB_DAMAGE_MULTIPLIER,
  SHADOWSTEP_GARB_HURT_SPEED_MULTIPLIER,
  SHADOWSTEP_GARB_KNOCKBACK_MULTIPLIER,
  SHADOWSTEP_GARB_MOVING_FRAMES,
  SHADOWSTEP_TALISMAN_COOLDOWN,
  SHADOWSTEP_TALISMAN_RADIUS,
  SHADOWSTEP_TALISMAN_SKILL_GAIN,
  SHADOWSTEP_TALISMAN_ULTIMATE_GAIN,
  TEMPO_BLADE_ATTACK_FRAME_MULTIPLIER,
  TEMPO_BLADE_DAMAGE_MULTIPLIER,
  TEMPO_BLADE_HITS_FOR_NO_PENALTY,
  TEMPO_GARB_KNOCKBACK_MULTIPLIER,
  TEMPO_GARB_RECOVERY_TIMER_FRAMES,
  TEMPO_GARB_SKILL_GAIN,
  TEMPO_GARB_SPEED_MULTIPLIER,
  TEMPO_TALISMAN_AWAKENED_REFUND,
  TEMPO_TALISMAN_SKILL_COST,
  TEMPO_TALISMAN_ULTIMATE_GAIN_MULTIPLIER,
} from "../systems/equipmentTuning";
import {
  ANTI_AIR_MULTI_BONUS_DROP_CONFIG,
  GENERIC_PLAYER_SKILL_TUNING,
  GENERIC_SKILL_DAMAGE_ATTACK_BONUS_SCALE,
  corePlayerSkillGrowth,
  isGenericPlayerSkillId,
  valueForSkillLevel,
} from "../systems/playerSkills";
import { DEFAULT_LANGUAGE, type Language } from "../i18n/language";
import {
  formatRewardUnit,
  rewardLabel,
  rewardValue,
  type RewardLabelKey,
} from "../i18n/rewardMessages";
import type { SkillId } from "../types/assets";
import type {
  EquipmentChoiceState,
  EquipmentTier,
  SkillLevel,
  UltimateLevel,
  UpgradeChoiceState,
} from "../types/game-state";
import { formatPercent, formatSignedPercent } from "../utils";
import { skillPassiveRewardMetric } from "./rewardSkillPassiveMetrics";

export type RewardMetricTone = "damage" | "defense" | "resource" | "range" | "speed" | "utility";

export type RewardChoiceMetric = {
  label: string;
  value: string;
  tone: RewardMetricTone;
};

type PlayerDamageStats = {
  baseAttack: number;
  attackBonus: number;
};

type ActiveUltimateLevel = Exclude<UltimateLevel, 0>;

const MAX_REWARD_METRICS = 4;
const FRAMES_PER_SECOND = 60;
const MAX_REWARD_LEVEL = 3;
const EQUIPMENT_TIER_ORDER: EquipmentTier[] = ["common", "fine", "awakened"];
const EQUIPMENT_PRIMARY_STAT_TONES = {
  blade: "damage",
  garb: "defense",
  talisman: "resource",
} as const satisfies Record<EquipmentChoiceState["slot"], RewardMetricTone>;
const EQUIPMENT_PRIMARY_STAT_LABEL_KEYS = {
  blade: "attack",
  garb: "maxHp",
  talisman: "maxSkillEnergy",
} as const satisfies Record<EquipmentChoiceState["slot"], RewardLabelKey>;

export function upgradeRewardMetrics(
  choice: UpgradeChoiceState,
  player: PlayerDamageStats,
  language: Language = DEFAULT_LANGUAGE,
): RewardChoiceMetric[] {
  if (choice.type === "upgradeUltimate") {
    return ultimateRewardMetrics(choice, language);
  }

  if (!choice.skillId) return [];
  const nextLevel = asSkillLevel(choice.nextLevel);
  if (!nextLevel) return [];

  const previousLevel = choice.type === "unlockSkill" ? 0 : asSkillLevel(nextLevel - 1) ?? 0;
  const damageMetrics = skillDamageMetrics(choice.skillId, nextLevel, previousLevel, player, language);
  return compactMetrics([
    ...damageMetrics,
    ...skillTuningMetrics(choice.skillId, nextLevel, previousLevel, language),
  ]);
}

export function equipmentRewardMetrics(
  choice: EquipmentChoiceState,
  language: Language = DEFAULT_LANGUAGE,
): RewardChoiceMetric[] {
  return compactMetrics([
    equipmentPrimaryStatMetric(choice, language),
    ...equipmentEffectMetrics(choice, language),
  ]);
}

function equipmentEffectMetrics(choice: EquipmentChoiceState, language: Language): RewardChoiceMetric[] {
  const label = (key: RewardLabelKey) => rewardLabel(language, key);
  const frames = (value: number) => formatFrames(value, language);
  switch (choice.id) {
    case "flow_blade":
      return compactMetrics([
        tierTableMetric(choice, label("chargedHits"), FLOW_BLADE_HITS_REQUIRED, (value) => formatRewardUnit(language, "hits", value), "utility"),
        tierTableMetric(choice, label("skillDamage"), FLOW_BLADE_SKILL_DAMAGE_MULTIPLIER, formatMultiplierDelta, "damage"),
        tierAtLeast(choice.tier, "fine") ? metric(label("energyOnHit"), `+${FLOW_BLADE_SKILL_REFUND}`, "resource") : null,
        tierAtLeast(choice.tier, "awakened") ? metric(label("bossUltimateEnergy"), `+${FLOW_BLADE_ULTIMATE_GAIN}`, "resource") : null,
      ]);
    case "flow_garb":
      return compactMetrics([
        metric(label("postSkillMoveSpeed"), formatMultiplierDelta(FLOW_GARB_SPEED_MULTIPLIER), "speed"),
        metric(label("duration"), frames(FLOW_GARB_TIMER_FRAMES), "utility"),
        tierAtLeast(choice.tier, "fine") ? metric(label("damageTaken"), formatMultiplierDelta(FLOW_GARB_DAMAGE_MULTIPLIER), "defense") : null,
        tierAtLeast(choice.tier, "awakened") ? metric(label("durationExtension"), `+${frames(FLOW_GARB_EXTEND_FRAMES)}`, "utility") : null,
      ]);
    case "flow_talisman":
      return compactMetrics([
        tierTableMetric(choice, label("hitRequirement"), FLOW_TALISMAN_HIT_THRESHOLD, (value) => formatRewardUnit(language, "targets", value), "utility"),
        tierTableMetric(choice, label("skillEnergy"), FLOW_TALISMAN_REFUND, (value) => `+${value}`, "resource"),
        tierAtLeast(choice.tier, "awakened") ? metric(label("ultimateEnergy"), `+${FLOW_TALISMAN_ULTIMATE_GAIN}`, "resource") : null,
      ]);
    case "burst_blade":
      return compactMetrics([
        metric(label("bossHpThreshold"), `<=${formatPercent(BURST_BLADE_BOSS_HP_RATIO)}`, "utility"),
        tierTableMetric(choice, label("bossDamage"), BURST_BLADE_BOSS_DAMAGE_MULTIPLIER, formatMultiplierDelta, "damage"),
        tierAtLeast(choice.tier, "fine")
          ? metric(label("basicAttackBoost"), formatMultiplierDelta(BURST_BLADE_EXECUTE_ATTACK_MULTIPLIER), "damage")
          : null,
        tierAtLeast(choice.tier, "awakened")
          ? metric(label("bonusSlash"), formatRewardUnit(language, "attackMultiplier", BURST_BLADE_AWAKENED_SLASH_ATTACK_SCALE), "damage")
          : null,
      ]);
    case "burst_garb":
      return compactMetrics([
        metric(label("lethalGuard"), rewardValue(language, "keepOneHp"), "defense"),
        metric(label("invincibility"), frames(BURST_GARB_INVINCIBLE_FRAMES), "defense"),
        tierAtLeast(choice.tier, "fine") ? metric(label("moveSpeed"), formatMultiplierDelta(BURST_GARB_SPEED_MULTIPLIER), "speed") : null,
        tierAtLeast(choice.tier, "fine") ? metric(label("speedDuration"), frames(BURST_GARB_SPEED_TIMER_FRAMES), "utility") : null,
      ]);
    case "burst_talisman":
      return compactMetrics([
        tierTableMetric(choice, label("bossUltimateEnergy"), BURST_TALISMAN_ULTIMATE_GAIN, (value) => `+${value}`, "resource"),
        metric(label("cooldown"), frames(BURST_TALISMAN_COOLDOWN), "utility"),
        tierAtLeast(choice.tier, "fine")
          ? metric(label("bossSkillHit"), formatRewardUnit(language, "ultimateEnergy", `+${BURST_TALISMAN_SKILL_BOSS_ULTIMATE_GAIN}`), "resource")
          : null,
        tierAtLeast(choice.tier, "awakened")
          ? metric(label("retainedOnKill"), formatPercent(BURST_TALISMAN_RETAIN_RATIO), "resource")
          : null,
      ]);
    case "shadowstep_blade":
      return compactMetrics([
        metric(label("chargeDistance"), `${SHADOWSTEP_DISTANCE_REQUIRED}px`, "utility"),
        tierTableMetric(choice, label("basicAttackRange"), SHADOWSTEP_BLADE_REACH_BONUS, (value) => `+${value}`, "range"),
        tierAtLeast(choice.tier, "fine")
          ? tierTableMetric(choice, label("shadowSlashDamage"), SHADOWSTEP_BLADE_DAMAGE_MULTIPLIER, formatMultiplierDelta, "damage")
          : null,
        tierAtLeast(choice.tier, "awakened")
          ? metric(label("bossUltimateEnergy"), `+${SHADOWSTEP_BLADE_ULTIMATE_GAIN}`, "resource")
          : null,
      ]);
    case "shadowstep_garb":
      return compactMetrics([
        tierTableMetric(choice, label("contactDamage"), SHADOWSTEP_GARB_DAMAGE_MULTIPLIER, formatMultiplierDelta, "defense"),
        metric(label("movementCheck"), formatRewardUnit(language, "frames", SHADOWSTEP_GARB_MOVING_FRAMES), "utility"),
        tierAtLeast(choice.tier, "fine")
          ? metric(label("knockback"), formatMultiplierDelta(SHADOWSTEP_GARB_KNOCKBACK_MULTIPLIER), "defense")
          : null,
        tierAtLeast(choice.tier, "awakened")
          ? metric(label("moveSpeedOnHit"), formatMultiplierDelta(SHADOWSTEP_GARB_HURT_SPEED_MULTIPLIER), "speed")
          : null,
      ]);
    case "shadowstep_talisman":
      return compactMetrics([
        metric(label("triggerRadius"), `${SHADOWSTEP_TALISMAN_RADIUS}px`, "range"),
        tierTableMetric(choice, label("skillEnergy"), SHADOWSTEP_TALISMAN_SKILL_GAIN, (value) => `+${value}`, "resource"),
        metric(label("cooldown"), frames(SHADOWSTEP_TALISMAN_COOLDOWN), "utility"),
        tierAtLeast(choice.tier, "awakened")
          ? metric(label("bossUltimateEnergy"), `+${SHADOWSTEP_TALISMAN_ULTIMATE_GAIN}`, "resource")
          : null,
      ]);
    case "hunt_blade":
      return compactMetrics([
        metric(label("killRequirement"), formatRewardUnit(language, "kills", HUNT_BLADE_KILLS_REQUIRED), "utility"),
        tierTableMetric(choice, label("basicAttackRange"), HUNT_BLADE_REACH_BONUS, (value) => `+${value}`, "range"),
        tierTableMetric(choice, label("basicAttackDamage"), HUNT_BLADE_DAMAGE_MULTIPLIER, formatMultiplierDelta, "damage"),
        tierAtLeast(choice.tier, "awakened") ? metric(label("waterBladeDuration"), frames(HUNT_BLADE_WATER_TIMER_FRAMES), "utility") : null,
      ]);
    case "hunt_garb":
      return compactMetrics([
        tierTableMetric(choice, label("moveSpeedOnKill"), HUNT_GARB_SPEED_MULTIPLIER, formatMultiplierDelta, "speed"),
        metric(label("duration"), frames(HUNT_GARB_TIMER_FRAMES), "utility"),
        metric(label("killWindow"), frames(HUNT_KILL_WINDOW), "utility"),
        tierAtLeast(choice.tier, "awakened")
          ? metric(label("guardDamageReduction"), formatMultiplierDelta(HUNT_GARB_GUARD_DAMAGE_MULTIPLIER), "defense")
          : null,
      ]);
    case "hunt_talisman":
      return compactMetrics([
        metric(label("killRequirement"), formatRewardUnit(language, "kills", HUNT_TALISMAN_KILLS_REQUIRED), "utility"),
        tierTableMetric(choice, label("skillEnergy"), HUNT_TALISMAN_SKILL_GAIN, (value) => `+${value}`, "resource"),
        tierTableMetric(choice, label("ultimateEnergy"), HUNT_TALISMAN_ULTIMATE_GAIN, (value) => `+${value}`, "resource"),
        metric(label("cooldown"), frames(HUNT_TALISMAN_COOLDOWN), "utility"),
      ]);
    case "risk_blade":
      return compactMetrics([
        metric(label("lowHpThreshold"), `<=${formatPercent(LOW_HP_RATIO)}`, "utility"),
        tierTableMetric(choice, label("basicAttackDamage"), RISK_BLADE_BASIC_DAMAGE_MULTIPLIER, formatMultiplierDelta, "damage"),
        tierAtLeast(choice.tier, "fine")
          ? metric(label("skillDamage"), formatMultiplierDelta(RISK_BLADE_SKILL_DAMAGE_MULTIPLIER), "damage")
          : null,
        tierAtLeast(choice.tier, "awakened")
          ? metric(label("firstSkill"), formatMultiplierDelta(RISK_BLADE_AWAKENED_SKILL_MULTIPLIER), "damage")
          : null,
      ]);
    case "risk_garb":
      return compactMetrics([
        metric(label("lowHpThreshold"), `<=${formatPercent(LOW_HP_RATIO)}`, "utility"),
        tierTableMetric(choice, label("damageTaken"), RISK_GARB_DAMAGE_MULTIPLIER, formatMultiplierDelta, "defense"),
        tierAtLeast(choice.tier, "fine")
          ? metric(label("hitInvincibility"), `+${frames(RISK_GARB_FINE_INVINCIBLE_BONUS_FRAMES)}`, "defense")
          : null,
        tierAtLeast(choice.tier, "awakened")
          ? metric(label("bossInvincibility"), frames(RISK_GARB_AWAKENED_INVINCIBLE_FRAMES), "defense")
          : null,
      ]);
    case "risk_talisman":
      return compactMetrics([
        metric(label("lowHpThreshold"), `<=${formatPercent(LOW_HP_RATIO)}`, "utility"),
        tierTableMetric(choice, label("skillEnergy"), RISK_TALISMAN_SKILL_GAIN, (value) => `+${value}`, "resource"),
        tierAtLeast(choice.tier, "awakened") ? metric(label("atLeast"), formatRewardUnit(language, "skillBars", 1), "resource") : null,
        tierAtLeast(choice.tier, "awakened") ? metric(label("ultimateEnergy"), `+${RISK_TALISMAN_ULTIMATE_GAIN}`, "resource") : null,
      ]);
    case "tempo_blade":
      return compactMetrics([
        tierTableMetric(choice, label("basicAttackInterval"), TEMPO_BLADE_ATTACK_FRAME_MULTIPLIER, formatMultiplierDelta, "speed"),
        tierTableMetric(choice, label("hitDamage"), TEMPO_BLADE_DAMAGE_MULTIPLIER, formatMultiplierDelta, "damage"),
        tierAtLeast(choice.tier, "awakened")
          ? metric(label("penaltyFreeHits"), formatRewardUnit(language, "hits", TEMPO_BLADE_HITS_FOR_NO_PENALTY), "utility")
          : null,
      ]);
    case "tempo_garb":
      return compactMetrics([
        tierTableMetric(choice, label("hurtKnockback"), TEMPO_GARB_KNOCKBACK_MULTIPLIER, formatMultiplierDelta, "defense"),
        tierAtLeast(choice.tier, "fine") ? metric(label("moveSpeedOnHit"), formatMultiplierDelta(TEMPO_GARB_SPEED_MULTIPLIER), "speed") : null,
        tierAtLeast(choice.tier, "fine") ? metric(label("duration"), frames(TEMPO_GARB_RECOVERY_TIMER_FRAMES), "utility") : null,
        tierAtLeast(choice.tier, "awakened") ? metric(label("skillEnergy"), `+${TEMPO_GARB_SKILL_GAIN}`, "resource") : null,
      ]);
    case "tempo_talisman":
      return compactMetrics([
        metric(label("skillCost"), skillCostTransition(choice), "resource"),
        tierTableMetric(choice, label("ultimateGain"), TEMPO_TALISMAN_ULTIMATE_GAIN_MULTIPLIER, formatMultiplierDelta, "resource"),
        tierAtLeast(choice.tier, "awakened") ? metric(label("switchRefund"), `+${TEMPO_TALISMAN_AWAKENED_REFUND}`, "resource") : null,
      ]);
    default:
      return [];
  }
}

function equipmentPrimaryStatMetric(choice: EquipmentChoiceState, language: Language) {
  const bonuses = EQUIPMENT_PRIMARY_STAT_BONUS_RATIOS[choice.id];
  return tierTableMetric(
    choice,
    rewardLabel(language, EQUIPMENT_PRIMARY_STAT_LABEL_KEYS[choice.slot]),
    bonuses,
    formatSignedPercent,
    EQUIPMENT_PRIMARY_STAT_TONES[choice.slot],
  );
}

function skillDamageMetrics(
  skillId: SkillId,
  nextLevel: SkillLevel,
  previousLevel: SkillLevel | 0,
  player: PlayerDamageStats,
  language: Language,
): RewardChoiceMetric[] {
  const enemyDamage = skillDamage(skillId, nextLevel, player, false);
  const previousEnemyDamage = previousLevel ? skillDamage(skillId, previousLevel, player, false) : null;
  const enemyMetric = metric(
    rewardLabel(language, isGenericPlayerSkillId(skillId) ? "enemyDamage" : "impactDamage"),
    numberTransition(previousEnemyDamage, enemyDamage),
    "damage",
  );

  if (!isGenericPlayerSkillId(skillId)) return [enemyMetric];

  const bossDamage = skillDamage(skillId, nextLevel, player, true);
  const previousBossDamage = previousLevel ? skillDamage(skillId, previousLevel, player, true) : null;
  return [
    enemyMetric,
    metric(rewardLabel(language, "bossDamage"), numberTransition(previousBossDamage, bossDamage), "damage"),
  ];
}

function skillTuningMetrics(
  skillId: SkillId,
  nextLevel: SkillLevel,
  previousLevel: SkillLevel | 0,
  language: Language,
): RewardChoiceMetric[] {
  const label = (key: RewardLabelKey) => rewardLabel(language, key);
  if (isGenericPlayerSkillId(skillId)) {
    const tuning = GENERIC_PLAYER_SKILL_TUNING[skillId];
    const unlocksBonusRainDrop = skillId === SKILL_IDS.antiAirMulti
      && nextLevel >= ANTI_AIR_MULTI_BONUS_DROP_CONFIG.requiredLevel
      && previousLevel < ANTI_AIR_MULTI_BONUS_DROP_CONFIG.requiredLevel;
    const bonusRainDropValue = `${formatPercent(ANTI_AIR_MULTI_BONUS_DROP_CONFIG.chance)} / ${
      formatRewardUnit(language, "skillDamage", formatPercent(ANTI_AIR_MULTI_BONUS_DROP_CONFIG.damageMultiplier))
    }`;
    return compactMetrics([
      tuning.count ? levelTableMetric(label("strikeCount"), tuning.count, nextLevel, previousLevel, String, "damage") : null,
      unlocksBonusRainDrop ? metric(label("bonusRainDrop"), bonusRainDropValue, "damage") : null,
      skillPassiveRewardMetric(skillId, nextLevel, previousLevel, language),
      tuning.maxHits ? levelTableMetric(label("maxHits"), tuning.maxHits, nextLevel, previousLevel, String, "damage") : null,
      tuning.armorBreakMultiplier
        ? levelTableMetric(label("followUpDamage"), tuning.armorBreakMultiplier, nextLevel, previousLevel, formatMultiplierDelta, "damage")
        : null,
      tuning.radius ? levelTableMetric(label("radius"), tuning.radius, nextLevel, previousLevel, (value) => `${value}px`, "range") : null,
      tuning.distance ? levelTableMetric(label("distance"), tuning.distance, nextLevel, previousLevel, (value) => `${value}px`, "range") : null,
      levelTableMetric(label("range"), tuning.width, nextLevel, previousLevel, (value) => `${value}px`, "range"),
    ]);
  }

  const nextGrowth = corePlayerSkillGrowth(skillId, nextLevel);
  const previousGrowth = previousLevel ? corePlayerSkillGrowth(skillId, previousLevel) : null;
  if (!nextGrowth) return [];

  if (skillId === SKILL_IDS.lineProjectile) {
    const unlocksKnockback = nextLevel >= LINE_PROJECTILE_EFFECT_CONFIG.knockbackRequiredLevel
      && previousLevel < LINE_PROJECTILE_EFFECT_CONFIG.knockbackRequiredLevel;
    return compactMetrics([
      unlocksKnockback
        ? metric(
          label("skillKnockback"),
          formatRewardUnit(language, "bodyWidths", LINE_PROJECTILE_EFFECT_CONFIG.knockbackDistanceTargetWidths),
          "utility",
        )
        : null,
      unlocksKnockback
        ? metric(
          label("passiveKnockback"),
          formatPercent(LINE_PROJECTILE_EFFECT_CONFIG.passiveKnockbackChance),
          "utility",
        )
        : null,
    ]);
  }

  if (skillId === SKILL_IDS.closeArc) {
    const maxDrawScale = CORE_PLAYER_SKILL_EFFECT_CONFIGS[SKILL_IDS.closeArc].drawScale;
    return compactMetrics([
      growthMetric(label("travelDistance"), previousGrowth?.maxTravel, nextGrowth.maxTravel, (value) => `${value}px`, "range"),
      growthMetric(
        label("effectSize"),
        previousGrowth?.drawScale,
        nextGrowth.drawScale,
        (value) => formatPercent(value / maxDrawScale),
        "range",
      ),
      nextLevel >= CLOSE_ARC_BASIC_CRESCENT_CONFIG.requiredSkillLevel
        && previousLevel < CLOSE_ARC_BASIC_CRESCENT_CONFIG.requiredSkillLevel
        ? metric(label("basicAttackCrescent"), rewardValue(language, "unlocked"), "damage")
        : null,
    ]);
  }

  if (skillId === SKILL_IDS.guardCounter) {
    const unlocksDamageReduction = nextLevel
        >= GUARD_COUNTER_EFFECT_CONFIG.damageReductionRequiredLevel
      && previousLevel < GUARD_COUNTER_EFFECT_CONFIG.damageReductionRequiredLevel;
    return compactMetrics([
      growthMetric(label("counterHits"), previousGrowth?.maxHits, nextGrowth.maxHits, String, "damage"),
      growthMetric(label("guardDuration"), previousGrowth?.activeFrames, nextGrowth.activeFrames, (value) => formatFrames(value, language), "defense"),
      unlocksDamageReduction
        ? metric(
          label("passiveDamageReduction"),
          `${formatPercent(GUARD_COUNTER_EFFECT_CONFIG.damageReductionMin)}–${formatPercent(GUARD_COUNTER_EFFECT_CONFIG.damageReductionMax)}`,
          "defense",
        )
        : null,
    ]);
  }

  return [];
}

function skillDamage(
  skillId: SkillId,
  level: SkillLevel,
  player: PlayerDamageStats,
  boss: boolean,
) {
  const attack = player.baseAttack + player.attackBonus;
  if (isGenericPlayerSkillId(skillId)) {
    const tuning = GENERIC_PLAYER_SKILL_TUNING[skillId];
    const table = boss ? tuning.bossDamageMultiplier : tuning.damageMultiplier;
    return attack
      * (1 + player.attackBonus * GENERIC_SKILL_DAMAGE_ATTACK_BONUS_SCALE)
      * valueForSkillLevel(table, level);
  }

  const growth = corePlayerSkillGrowth(skillId, level);
  if (!growth) return attack;
  const config = CORE_PLAYER_SKILL_EFFECT_CONFIGS[skillId as keyof typeof CORE_PLAYER_SKILL_EFFECT_CONFIGS];
  return attack * config.damageMultiplier * growth.damageMultiplier;
}

function ultimateRewardMetrics(choice: UpgradeChoiceState, language: Language): RewardChoiceMetric[] {
  const nextLevel = asActiveUltimateLevel(choice.nextLevel);
  if (!nextLevel) return [];
  const previousLevel = nextLevel > 1 ? (nextLevel - 1) as ActiveUltimateLevel : null;

  return compactMetrics([
    ultimateMetric(rewardLabel(language, "ultimateDamage"), previousLevel, nextLevel, (config) => config.damageMultiplier, formatMultiplierDelta, "damage"),
    ultimateMetric(rewardLabel(language, "durationTime"), previousLevel, nextLevel, (config) => config.durationFrames, (value) => formatFrames(value, language), "utility"),
    ultimateMetric(rewardLabel(language, "basicAttackInterval"), previousLevel, nextLevel, (config) => config.attackFrameMultiplier, formatMultiplierDelta, "speed"),
    ultimateMetric(rewardLabel(language, "afterimageChance"), previousLevel, nextLevel, (config) => config.afterimageChance, formatPercent, "damage"),
  ]);
}

function ultimateMetric(
  label: string,
  previousLevel: ActiveUltimateLevel | null,
  nextLevel: ActiveUltimateLevel,
  select: (config: typeof MOON_TIDE_ULTIMATE[ActiveUltimateLevel]) => number,
  format: (value: number) => string,
  tone: RewardMetricTone,
) {
  const nextValue = format(select(MOON_TIDE_ULTIMATE[nextLevel]));
  if (!previousLevel) return metric(label, nextValue, tone);
  const previousValue = format(select(MOON_TIDE_ULTIMATE[previousLevel]));
  return metric(label, previousValue === nextValue ? nextValue : `${previousValue} -> ${nextValue}`, tone);
}

function tierTableMetric(
  choice: EquipmentChoiceState,
  label: string,
  table: Record<EquipmentTier, number>,
  format: (value: number) => string,
  tone: RewardMetricTone,
) {
  const currentValue = format(table[choice.tier]);
  const previousTier = previousTierForDisplay(choice);
  if (!previousTier) return metric(label, currentValue, tone);
  const previousValue = format(table[previousTier]);
  return metric(label, previousValue === currentValue ? currentValue : `${previousValue} -> ${currentValue}`, tone);
}

function levelTableMetric(
  label: string,
  table: Record<SkillLevel, number>,
  nextLevel: SkillLevel,
  previousLevel: SkillLevel | 0,
  format: (value: number) => string,
  tone: RewardMetricTone,
) {
  const currentValue = format(valueForSkillLevel(table, nextLevel));
  if (!previousLevel) return metric(label, currentValue, tone);
  const previousValue = format(valueForSkillLevel(table, previousLevel));
  return metric(label, previousValue === currentValue ? currentValue : `${previousValue} -> ${currentValue}`, tone);
}

function growthMetric(
  label: string,
  previousValue: number | undefined,
  nextValue: number | undefined,
  format: (value: number) => string,
  tone: RewardMetricTone,
) {
  if (nextValue === undefined) return null;
  const currentText = format(nextValue);
  if (previousValue === undefined) return metric(label, currentText, tone);
  const previousText = format(previousValue);
  return metric(label, previousText === currentText ? currentText : `${previousText} -> ${currentText}`, tone);
}

function skillCostTransition(choice: EquipmentChoiceState) {
  const nextCost = TEMPO_TALISMAN_SKILL_COST[choice.tier];
  const previousTier = previousTierForDisplay(choice);
  const previousCost = previousTier
    ? TEMPO_TALISMAN_SKILL_COST[previousTier]
    : PLAYER_COMBAT.skillCastEnergyCost;
  return previousCost === nextCost ? `${nextCost}` : `${previousCost} -> ${nextCost}`;
}

function previousTierForDisplay(choice: EquipmentChoiceState) {
  return choice.reason === "tierUpgrade" ? choice.previousTier : null;
}

function tierAtLeast(tier: EquipmentTier, minimum: EquipmentTier) {
  return EQUIPMENT_TIER_ORDER.indexOf(tier) >= EQUIPMENT_TIER_ORDER.indexOf(minimum);
}

function metric(label: string, value: string, tone: RewardMetricTone): RewardChoiceMetric {
  return { label, value, tone };
}

function compactMetrics(metrics: Array<RewardChoiceMetric | null | undefined>) {
  return metrics.filter((candidate): candidate is RewardChoiceMetric => Boolean(candidate)).slice(0, MAX_REWARD_METRICS);
}

function numberTransition(previousValue: number | null, nextValue: number) {
  const nextText = `${Math.round(nextValue)}`;
  if (previousValue === null) return nextText;
  const previousText = `${Math.round(previousValue)}`;
  return previousText === nextText ? nextText : `${previousText} -> ${nextText}`;
}

function formatMultiplierDelta(multiplier: number) {
  return formatSignedPercent(multiplier - 1);
}

function formatFrames(frames: number, language: Language = DEFAULT_LANGUAGE) {
  const seconds = frames / FRAMES_PER_SECOND;
  return formatRewardUnit(language, "seconds", Number.isInteger(seconds) ? seconds : seconds.toFixed(1));
}

function asSkillLevel(level: number | undefined): SkillLevel | null {
  return level === 1 || level === 2 || level === MAX_REWARD_LEVEL ? level : null;
}

function asActiveUltimateLevel(level: number | undefined): ActiveUltimateLevel | null {
  return level === 1 || level === 2 || level === MAX_REWARD_LEVEL ? level : null;
}
