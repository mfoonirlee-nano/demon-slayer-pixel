import { MOON_TIDE_ULTIMATE, PLAYER_COMBAT, SKILL_IDS } from "../constants";
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
  GENERIC_PLAYER_SKILL_TUNING,
  GENERIC_SKILL_DAMAGE_ATTACK_BONUS_SCALE,
  corePlayerSkillGrowth,
  isGenericPlayerSkillId,
  valueForSkillLevel,
} from "../systems/playerSkills";
import type { SkillId } from "../types/assets";
import type {
  EquipmentChoiceState,
  EquipmentTier,
  SkillLevel,
  UltimateLevel,
  UpgradeChoiceState,
} from "../types/game-state";

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
const PERCENT_MULTIPLIER = 100;
const MAX_REWARD_LEVEL = 3;
const EQUIPMENT_TIER_ORDER: EquipmentTier[] = ["common", "fine", "awakened"];

export function upgradeRewardMetrics(
  choice: UpgradeChoiceState,
  player: PlayerDamageStats,
): RewardChoiceMetric[] {
  if (choice.type === "upgradeUltimate") {
    return ultimateRewardMetrics(choice);
  }

  if (!choice.skillId) return [];
  const nextLevel = asSkillLevel(choice.nextLevel);
  if (!nextLevel) return [];

  const previousLevel = choice.type === "unlockSkill" ? 0 : asSkillLevel(nextLevel - 1) ?? 0;
  const damageMetrics = skillDamageMetrics(choice.skillId, nextLevel, previousLevel, player);
  return compactMetrics([
    ...damageMetrics,
    ...skillTuningMetrics(choice.skillId, nextLevel, previousLevel),
  ]);
}

export function equipmentRewardMetrics(choice: EquipmentChoiceState): RewardChoiceMetric[] {
  switch (choice.id) {
    case "flow_blade":
      return compactMetrics([
        tierTableMetric(choice, "蓄势命中", FLOW_BLADE_HITS_REQUIRED, (value) => `${value}次`, "utility"),
        tierTableMetric(choice, "技能伤害", FLOW_BLADE_SKILL_DAMAGE_MULTIPLIER, formatMultiplierDelta, "damage"),
        tierAtLeast(choice.tier, "fine") ? metric("命中返能", `+${FLOW_BLADE_SKILL_REFUND}`, "resource") : null,
        tierAtLeast(choice.tier, "awakened") ? metric("Boss终能", `+${FLOW_BLADE_ULTIMATE_GAIN}`, "resource") : null,
      ]);
    case "flow_garb":
      return compactMetrics([
        metric("技能后移速", formatMultiplierDelta(FLOW_GARB_SPEED_MULTIPLIER), "speed"),
        metric("持续", formatFrames(FLOW_GARB_TIMER_FRAMES), "utility"),
        tierAtLeast(choice.tier, "fine") ? metric("受伤", formatMultiplierDelta(FLOW_GARB_DAMAGE_MULTIPLIER), "defense") : null,
        tierAtLeast(choice.tier, "awakened") ? metric("续时", `+${formatFrames(FLOW_GARB_EXTEND_FRAMES)}`, "utility") : null,
      ]);
    case "flow_talisman":
      return compactMetrics([
        tierTableMetric(choice, "命中要求", FLOW_TALISMAN_HIT_THRESHOLD, (value) => `${value}目标`, "utility"),
        tierTableMetric(choice, "技能能量", FLOW_TALISMAN_REFUND, (value) => `+${value}`, "resource"),
        tierAtLeast(choice.tier, "awakened") ? metric("终能", `+${FLOW_TALISMAN_ULTIMATE_GAIN}`, "resource") : null,
      ]);
    case "burst_blade":
      return compactMetrics([
        metric("Boss血线", `<=${formatPercent(BURST_BLADE_BOSS_HP_RATIO)}`, "utility"),
        tierTableMetric(choice, "Boss伤害", BURST_BLADE_BOSS_DAMAGE_MULTIPLIER, formatMultiplierDelta, "damage"),
        tierAtLeast(choice.tier, "fine")
          ? metric("普攻强化", formatMultiplierDelta(BURST_BLADE_EXECUTE_ATTACK_MULTIPLIER), "damage")
          : null,
        tierAtLeast(choice.tier, "awakened")
          ? metric("追加斩击", `${BURST_BLADE_AWAKENED_SLASH_ATTACK_SCALE}x攻击`, "damage")
          : null,
      ]);
    case "burst_garb":
      return compactMetrics([
        metric("致命保护", "保留1 HP", "defense"),
        metric("无敌", formatFrames(BURST_GARB_INVINCIBLE_FRAMES), "defense"),
        tierAtLeast(choice.tier, "fine") ? metric("移速", formatMultiplierDelta(BURST_GARB_SPEED_MULTIPLIER), "speed") : null,
        tierAtLeast(choice.tier, "fine") ? metric("移速持续", formatFrames(BURST_GARB_SPEED_TIMER_FRAMES), "utility") : null,
      ]);
    case "burst_talisman":
      return compactMetrics([
        tierTableMetric(choice, "Boss终能", BURST_TALISMAN_ULTIMATE_GAIN, (value) => `+${value}`, "resource"),
        metric("冷却", formatFrames(BURST_TALISMAN_COOLDOWN), "utility"),
        tierAtLeast(choice.tier, "fine")
          ? metric("技能命中Boss", `+${BURST_TALISMAN_SKILL_BOSS_ULTIMATE_GAIN}终能`, "resource")
          : null,
        tierAtLeast(choice.tier, "awakened")
          ? metric("击杀保留", formatPercent(BURST_TALISMAN_RETAIN_RATIO), "resource")
          : null,
      ]);
    case "shadowstep_blade":
      return compactMetrics([
        metric("蓄势距离", `${SHADOWSTEP_DISTANCE_REQUIRED}px`, "utility"),
        tierTableMetric(choice, "普攻范围", SHADOWSTEP_BLADE_REACH_BONUS, (value) => `+${value}`, "range"),
        tierAtLeast(choice.tier, "fine")
          ? tierTableMetric(choice, "影斩伤害", SHADOWSTEP_BLADE_DAMAGE_MULTIPLIER, formatMultiplierDelta, "damage")
          : null,
        tierAtLeast(choice.tier, "awakened")
          ? metric("Boss终能", `+${SHADOWSTEP_BLADE_ULTIMATE_GAIN}`, "resource")
          : null,
      ]);
    case "shadowstep_garb":
      return compactMetrics([
        tierTableMetric(choice, "接触伤害", SHADOWSTEP_GARB_DAMAGE_MULTIPLIER, formatMultiplierDelta, "defense"),
        metric("移动判定", `${SHADOWSTEP_GARB_MOVING_FRAMES}帧`, "utility"),
        tierAtLeast(choice.tier, "fine")
          ? metric("击退", formatMultiplierDelta(SHADOWSTEP_GARB_KNOCKBACK_MULTIPLIER), "defense")
          : null,
        tierAtLeast(choice.tier, "awakened")
          ? metric("受伤移速", formatMultiplierDelta(SHADOWSTEP_GARB_HURT_SPEED_MULTIPLIER), "speed")
          : null,
      ]);
    case "shadowstep_talisman":
      return compactMetrics([
        metric("触发半径", `${SHADOWSTEP_TALISMAN_RADIUS}px`, "range"),
        tierTableMetric(choice, "技能能量", SHADOWSTEP_TALISMAN_SKILL_GAIN, (value) => `+${value}`, "resource"),
        metric("冷却", formatFrames(SHADOWSTEP_TALISMAN_COOLDOWN), "utility"),
        tierAtLeast(choice.tier, "awakened")
          ? metric("Boss终能", `+${SHADOWSTEP_TALISMAN_ULTIMATE_GAIN}`, "resource")
          : null,
      ]);
    case "hunt_blade":
      return compactMetrics([
        metric("连杀要求", `${HUNT_BLADE_KILLS_REQUIRED}个`, "utility"),
        tierTableMetric(choice, "普攻范围", HUNT_BLADE_REACH_BONUS, (value) => `+${value}`, "range"),
        tierTableMetric(choice, "普攻伤害", HUNT_BLADE_DAMAGE_MULTIPLIER, formatMultiplierDelta, "damage"),
        tierAtLeast(choice.tier, "awakened") ? metric("水刃持续", formatFrames(HUNT_BLADE_WATER_TIMER_FRAMES), "utility") : null,
      ]);
    case "hunt_garb":
      return compactMetrics([
        tierTableMetric(choice, "击杀移速", HUNT_GARB_SPEED_MULTIPLIER, formatMultiplierDelta, "speed"),
        metric("持续", formatFrames(HUNT_GARB_TIMER_FRAMES), "utility"),
        metric("连杀窗口", formatFrames(HUNT_KILL_WINDOW), "utility"),
        tierAtLeast(choice.tier, "awakened")
          ? metric("护身减伤", formatMultiplierDelta(HUNT_GARB_GUARD_DAMAGE_MULTIPLIER), "defense")
          : null,
      ]);
    case "hunt_talisman":
      return compactMetrics([
        metric("连杀要求", `${HUNT_TALISMAN_KILLS_REQUIRED}个`, "utility"),
        tierTableMetric(choice, "技能能量", HUNT_TALISMAN_SKILL_GAIN, (value) => `+${value}`, "resource"),
        tierTableMetric(choice, "终能", HUNT_TALISMAN_ULTIMATE_GAIN, (value) => `+${value}`, "resource"),
        metric("冷却", formatFrames(HUNT_TALISMAN_COOLDOWN), "utility"),
      ]);
    case "risk_blade":
      return compactMetrics([
        metric("低血线", `<=${formatPercent(LOW_HP_RATIO)}`, "utility"),
        tierTableMetric(choice, "普攻伤害", RISK_BLADE_BASIC_DAMAGE_MULTIPLIER, formatMultiplierDelta, "damage"),
        tierAtLeast(choice.tier, "fine")
          ? metric("技能伤害", formatMultiplierDelta(RISK_BLADE_SKILL_DAMAGE_MULTIPLIER), "damage")
          : null,
        tierAtLeast(choice.tier, "awakened")
          ? metric("首次技能", formatMultiplierDelta(RISK_BLADE_AWAKENED_SKILL_MULTIPLIER), "damage")
          : null,
      ]);
    case "risk_garb":
      return compactMetrics([
        metric("低血线", `<=${formatPercent(LOW_HP_RATIO)}`, "utility"),
        tierTableMetric(choice, "受伤", RISK_GARB_DAMAGE_MULTIPLIER, formatMultiplierDelta, "defense"),
        tierAtLeast(choice.tier, "fine")
          ? metric("受伤无敌", `+${formatFrames(RISK_GARB_FINE_INVINCIBLE_BONUS_FRAMES)}`, "defense")
          : null,
        tierAtLeast(choice.tier, "awakened")
          ? metric("Boss无敌", formatFrames(RISK_GARB_AWAKENED_INVINCIBLE_FRAMES), "defense")
          : null,
      ]);
    case "risk_talisman":
      return compactMetrics([
        metric("低血线", `<=${formatPercent(LOW_HP_RATIO)}`, "utility"),
        tierTableMetric(choice, "技能能量", RISK_TALISMAN_SKILL_GAIN, (value) => `+${value}`, "resource"),
        tierAtLeast(choice.tier, "awakened") ? metric("至少", "1格技能", "resource") : null,
        tierAtLeast(choice.tier, "awakened") ? metric("终能", `+${RISK_TALISMAN_ULTIMATE_GAIN}`, "resource") : null,
      ]);
    case "tempo_blade":
      return compactMetrics([
        tierTableMetric(choice, "普攻间隔", TEMPO_BLADE_ATTACK_FRAME_MULTIPLIER, formatMultiplierDelta, "speed"),
        tierTableMetric(choice, "单击伤害", TEMPO_BLADE_DAMAGE_MULTIPLIER, formatMultiplierDelta, "damage"),
        tierAtLeast(choice.tier, "awakened")
          ? metric("免罚命中", `${TEMPO_BLADE_HITS_FOR_NO_PENALTY}次`, "utility")
          : null,
      ]);
    case "tempo_garb":
      return compactMetrics([
        tierTableMetric(choice, "受伤击退", TEMPO_GARB_KNOCKBACK_MULTIPLIER, formatMultiplierDelta, "defense"),
        tierAtLeast(choice.tier, "fine") ? metric("受伤移速", formatMultiplierDelta(TEMPO_GARB_SPEED_MULTIPLIER), "speed") : null,
        tierAtLeast(choice.tier, "fine") ? metric("持续", formatFrames(TEMPO_GARB_RECOVERY_TIMER_FRAMES), "utility") : null,
        tierAtLeast(choice.tier, "awakened") ? metric("技能能量", `+${TEMPO_GARB_SKILL_GAIN}`, "resource") : null,
      ]);
    case "tempo_talisman":
      return compactMetrics([
        metric("技能消耗", skillCostTransition(choice), "resource"),
        tierTableMetric(choice, "终能获取", TEMPO_TALISMAN_ULTIMATE_GAIN_MULTIPLIER, formatMultiplierDelta, "resource"),
        tierAtLeast(choice.tier, "awakened") ? metric("换招返能", `+${TEMPO_TALISMAN_AWAKENED_REFUND}`, "resource") : null,
      ]);
    default:
      return [];
  }
}

function skillDamageMetrics(
  skillId: SkillId,
  nextLevel: SkillLevel,
  previousLevel: SkillLevel | 0,
  player: PlayerDamageStats,
): RewardChoiceMetric[] {
  const enemyDamage = skillDamage(skillId, nextLevel, player, false);
  const previousEnemyDamage = previousLevel ? skillDamage(skillId, previousLevel, player, false) : null;
  const enemyMetric = metric(
    isGenericPlayerSkillId(skillId) ? "小怪伤害" : "命中伤害",
    numberTransition(previousEnemyDamage, enemyDamage),
    "damage",
  );

  if (!isGenericPlayerSkillId(skillId)) return [enemyMetric];

  const bossDamage = skillDamage(skillId, nextLevel, player, true);
  const previousBossDamage = previousLevel ? skillDamage(skillId, previousLevel, player, true) : null;
  return [
    enemyMetric,
    metric("Boss伤害", numberTransition(previousBossDamage, bossDamage), "damage"),
  ];
}

function skillTuningMetrics(
  skillId: SkillId,
  nextLevel: SkillLevel,
  previousLevel: SkillLevel | 0,
): RewardChoiceMetric[] {
  if (isGenericPlayerSkillId(skillId)) {
    const tuning = GENERIC_PLAYER_SKILL_TUNING[skillId];
    return compactMetrics([
      tuning.count ? levelTableMetric("段数", tuning.count, nextLevel, previousLevel, String, "damage") : null,
      tuning.maxHits ? levelTableMetric("最大命中", tuning.maxHits, nextLevel, previousLevel, String, "damage") : null,
      tuning.armorBreakMultiplier
        ? levelTableMetric("后续增伤", tuning.armorBreakMultiplier, nextLevel, previousLevel, formatMultiplierDelta, "damage")
        : null,
      tuning.radius ? levelTableMetric("范围半径", tuning.radius, nextLevel, previousLevel, (value) => `${value}px`, "range") : null,
      tuning.distance ? levelTableMetric("距离", tuning.distance, nextLevel, previousLevel, (value) => `${value}px`, "range") : null,
      levelTableMetric("范围", tuning.width, nextLevel, previousLevel, (value) => `${value}px`, "range"),
    ]);
  }

  const nextGrowth = corePlayerSkillGrowth(skillId, nextLevel);
  const previousGrowth = previousLevel ? corePlayerSkillGrowth(skillId, previousLevel) : null;
  if (!nextGrowth) return [];

  if (skillId === SKILL_IDS.closeArc) {
    return compactMetrics([
      growthMetric("飞行距离", previousGrowth?.maxTravel, nextGrowth.maxTravel, (value) => `${value}px`, "range"),
    ]);
  }

  if (skillId === SKILL_IDS.guardCounter) {
    return compactMetrics([
      growthMetric("反击次数", previousGrowth?.maxHits, nextGrowth.maxHits, String, "damage"),
      growthMetric("防护时间", previousGrowth?.activeFrames, nextGrowth.activeFrames, formatFrames, "defense"),
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

function ultimateRewardMetrics(choice: UpgradeChoiceState): RewardChoiceMetric[] {
  const nextLevel = asActiveUltimateLevel(choice.nextLevel);
  if (!nextLevel) return [];
  const previousLevel = nextLevel > 1 ? (nextLevel - 1) as ActiveUltimateLevel : null;

  return compactMetrics([
    ultimateMetric("终式伤害", previousLevel, nextLevel, (config) => config.damageMultiplier, formatMultiplierDelta, "damage"),
    ultimateMetric("持续时间", previousLevel, nextLevel, (config) => config.durationFrames, formatFrames, "utility"),
    ultimateMetric("普攻间隔", previousLevel, nextLevel, (config) => config.attackFrameMultiplier, formatMultiplierDelta, "speed"),
    ultimateMetric("残影率", previousLevel, nextLevel, (config) => config.afterimageChance, formatPercent, "damage"),
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

function formatSignedPercent(value: number) {
  const percent = Math.round(value * PERCENT_MULTIPLIER);
  if (percent === 0) return "0%";
  return percent > 0 ? `+${percent}%` : `${percent}%`;
}

function formatPercent(value: number) {
  return `${Math.round(value * PERCENT_MULTIPLIER)}%`;
}

function formatFrames(frames: number) {
  const seconds = frames / FRAMES_PER_SECOND;
  return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)}秒`;
}

function asSkillLevel(level: number | undefined): SkillLevel | null {
  return level === 1 || level === 2 || level === MAX_REWARD_LEVEL ? level : null;
}

function asActiveUltimateLevel(level: number | undefined): ActiveUltimateLevel | null {
  return level === 1 || level === 2 || level === MAX_REWARD_LEVEL ? level : null;
}
