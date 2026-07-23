import type { Language } from "./language";

const ZH_REWARD_LABELS = {
  attack: "攻击力",
  maxHp: "最大生命",
  maxSkillEnergy: "技能能量上限",
  chargedHits: "蓄势命中",
  skillDamage: "技能伤害",
  energyOnHit: "命中返能",
  bossUltimateEnergy: "Boss终能",
  postSkillMoveSpeed: "技能后移速",
  duration: "持续",
  damageTaken: "受伤",
  durationExtension: "续时",
  hitRequirement: "命中要求",
  skillEnergy: "技能能量",
  ultimateEnergy: "终能",
  bossHpThreshold: "Boss血线",
  bossDamage: "Boss伤害",
  basicAttackBoost: "普攻强化",
  bonusSlash: "追加斩击",
  lethalGuard: "致命保护",
  invincibility: "无敌",
  moveSpeed: "移速",
  speedDuration: "移速持续",
  cooldown: "冷却",
  bossSkillHit: "技能命中Boss",
  retainedOnKill: "击杀保留",
  chargeDistance: "蓄势距离",
  basicAttackRange: "普攻范围",
  shadowSlashDamage: "影斩伤害",
  contactDamage: "接触伤害",
  movementCheck: "移动判定",
  knockback: "击退",
  moveSpeedOnHit: "受伤移速",
  triggerRadius: "触发半径",
  killRequirement: "连杀要求",
  basicAttackDamage: "普攻伤害",
  waterBladeDuration: "水刃持续",
  moveSpeedOnKill: "击杀移速",
  killWindow: "连杀窗口",
  guardDamageReduction: "护身减伤",
  lowHpThreshold: "低血线",
  firstSkill: "首次技能",
  hitInvincibility: "受伤无敌",
  bossInvincibility: "Boss无敌",
  atLeast: "至少",
  basicAttackInterval: "普攻间隔",
  hitDamage: "单击伤害",
  penaltyFreeHits: "免罚命中",
  hurtKnockback: "受伤击退",
  skillCost: "技能消耗",
  ultimateGain: "终能获取",
  switchRefund: "换招返能",
  enemyDamage: "小怪伤害",
  impactDamage: "命中伤害",
  strikeCount: "段数",
  maxHits: "最大命中",
  followUpDamage: "后续增伤",
  radius: "范围半径",
  distance: "距离",
  range: "范围",
  bonusRainDrop: "追加雨滴",
  skillKnockback: "技能击退",
  passiveKnockback: "被动击退",
  passiveDamageReduction: "被动减伤",
  travelDistance: "飞行距离",
  effectSize: "效果尺寸",
  basicAttackCrescent: "普攻剑气",
  counterHits: "反击次数",
  guardDuration: "防护时间",
  ultimateDamage: "终式伤害",
  durationTime: "持续时间",
  afterimageChance: "残影率",
} as const;

export type RewardLabelKey = keyof typeof ZH_REWARD_LABELS;

const EN_REWARD_LABELS = {
  attack: "Attack",
  maxHp: "Max HP",
  maxSkillEnergy: "Max Skill Energy",
  chargedHits: "Charged Hits",
  skillDamage: "Skill Damage",
  energyOnHit: "Energy on Hit",
  bossUltimateEnergy: "Boss Ultimate Energy",
  postSkillMoveSpeed: "Post-Skill Move Speed",
  duration: "Duration",
  damageTaken: "Damage Taken",
  durationExtension: "Duration Extension",
  hitRequirement: "Hit Requirement",
  skillEnergy: "Skill Energy",
  ultimateEnergy: "Ultimate Energy",
  bossHpThreshold: "Boss HP Threshold",
  bossDamage: "Boss Damage",
  basicAttackBoost: "Basic Attack Boost",
  bonusSlash: "Bonus Slash",
  lethalGuard: "Lethal Guard",
  invincibility: "Invincibility",
  moveSpeed: "Move Speed",
  speedDuration: "Speed Duration",
  cooldown: "Cooldown",
  bossSkillHit: "Boss Skill Hit",
  retainedOnKill: "Retained on Kill",
  chargeDistance: "Charge Distance",
  basicAttackRange: "Basic Attack Range",
  shadowSlashDamage: "Shadow Slash Damage",
  contactDamage: "Contact Damage",
  movementCheck: "Movement Check",
  knockback: "Knockback",
  moveSpeedOnHit: "Move Speed on Hit",
  triggerRadius: "Trigger Radius",
  killRequirement: "Kill Requirement",
  basicAttackDamage: "Basic Attack Damage",
  waterBladeDuration: "Water Blade Duration",
  moveSpeedOnKill: "Move Speed on Kill",
  killWindow: "Kill Window",
  guardDamageReduction: "Guard Damage Reduction",
  lowHpThreshold: "Low HP Threshold",
  firstSkill: "First Skill",
  hitInvincibility: "Hit Invincibility",
  bossInvincibility: "Boss Invincibility",
  atLeast: "At Least",
  basicAttackInterval: "Basic Attack Interval",
  hitDamage: "Hit Damage",
  penaltyFreeHits: "Penalty-Free Hits",
  hurtKnockback: "Hurt Knockback",
  skillCost: "Skill Cost",
  ultimateGain: "Ultimate Gain",
  switchRefund: "Switch Refund",
  enemyDamage: "Enemy Damage",
  impactDamage: "Hit Damage",
  strikeCount: "Strike Count",
  maxHits: "Max Hits",
  followUpDamage: "Follow-Up Damage",
  radius: "Radius",
  distance: "Distance",
  range: "Range",
  bonusRainDrop: "Bonus Raindrop",
  skillKnockback: "Skill Knockback",
  passiveKnockback: "Passive Knockback",
  passiveDamageReduction: "Passive Damage Reduction",
  travelDistance: "Travel Distance",
  effectSize: "Effect Size",
  basicAttackCrescent: "Basic Attack Crescent",
  counterHits: "Counter Hits",
  guardDuration: "Guard Duration",
  ultimateDamage: "Ultimate Damage",
  durationTime: "Duration",
  afterimageChance: "Afterimage Chance",
} as const satisfies Record<RewardLabelKey, string>;

const REWARD_LABELS = {
  "zh-CN": ZH_REWARD_LABELS,
  en: EN_REWARD_LABELS,
} satisfies Record<Language, Record<RewardLabelKey, string>>;

const ZH_REWARD_VALUES = {
  keepOneHp: "保留1 HP",
  unlocked: "解锁",
} as const;

export type RewardValueKey = keyof typeof ZH_REWARD_VALUES;

const REWARD_VALUES = {
  "zh-CN": ZH_REWARD_VALUES,
  en: {
    keepOneHp: "Keep 1 HP",
    unlocked: "Unlocked",
  },
} satisfies Record<Language, Record<RewardValueKey, string>>;

export type RewardValueUnit =
  | "seconds"
  | "frames"
  | "hits"
  | "targets"
  | "kills"
  | "bodyWidths"
  | "skillBars"
  | "ultimateEnergy"
  | "attackMultiplier"
  | "skillDamage";

type RewardUnitValue = number | string;
type RewardUnitFormatter = (value: RewardUnitValue) => string;

const REWARD_UNIT_FORMATTERS = {
  "zh-CN": {
    seconds: (value) => `${value}秒`,
    frames: (value) => `${value}帧`,
    hits: (value) => `${value}次`,
    targets: (value) => `${value}目标`,
    kills: (value) => `${value}个`,
    bodyWidths: (value) => `${value}身位`,
    skillBars: (value) => `${value}格技能`,
    ultimateEnergy: (value) => `${value}终能`,
    attackMultiplier: (value) => `${value}x攻击`,
    skillDamage: (value) => `${value}技能伤害`,
  },
  en: {
    seconds: (value) => `${value} ${Number(value) === 1 ? "second" : "seconds"}`,
    frames: (value) => `${value} ${Number(value) === 1 ? "frame" : "frames"}`,
    hits: (value) => `${value} ${Number(value) === 1 ? "hit" : "hits"}`,
    targets: (value) => `${value} ${Number(value) === 1 ? "target" : "targets"}`,
    kills: (value) => `${value} ${Number(value) === 1 ? "kill" : "kills"}`,
    bodyWidths: (value) => `${value} ${Number(value) === 1 ? "body width" : "body widths"}`,
    skillBars: (value) => `${value} ${Number(value) === 1 ? "skill bar" : "skill bars"}`,
    ultimateEnergy: (value) => `${value} ultimate energy`,
    attackMultiplier: (value) => `${value}x Attack`,
    skillDamage: (value) => `${value} skill damage`,
  },
} satisfies Record<Language, Record<RewardValueUnit, RewardUnitFormatter>>;

export function rewardLabel(language: Language, key: RewardLabelKey) {
  return REWARD_LABELS[language][key];
}

export function rewardValue(language: Language, key: RewardValueKey) {
  return REWARD_VALUES[language][key];
}

export function formatRewardUnit(language: Language, unit: RewardValueUnit, value: RewardUnitValue) {
  return REWARD_UNIT_FORMATTERS[language][unit](value);
}
