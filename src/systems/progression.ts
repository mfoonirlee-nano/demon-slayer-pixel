import {
  BINDER_SHEET_INDEX,
  BRUTE_SHEET_INDEX,
  BURROWER_SHEET_INDEX,
  CASTER_SHEET_INDEX,
  CRAWLER_SHEET_INDEX,
  DUELIST_SHEET_INDEX,
  GLIDER_SHEET_INDEX,
  LEAPER_SHEET_INDEX,
  MOON_TIDE_ULTIMATE,
  PLAYER_COMBAT,
  PLAYER_DEFAULTS,
  RUNNER_SHEET_INDEX,
  SKILL_IDS,
  SPLITTER_SHEET_INDEX,
  WARDEN_SHEET_INDEX,
} from "../constants";
import type { SkillId } from "../types/assets";
import type {
  EnemyState,
  GameState,
  SkillLevel,
  UltimateLevel,
  UpgradeChoiceState,
} from "../types/game-state";
import { autoEquipLearnedSkill, isSkillLearned, skillLevel } from "./loadout";
import {
  implementedPlayerSkillIds,
  playerSkillDescription,
  playerSkillName,
} from "./skillCatalog";
import {
  corePlayerSkillGrowth,
  isGenericPlayerSkillId,
} from "./playerSkills";
import { syncSkillChargesForEquipment } from "./equipment";

const BASE_XP = 650;
const XP_LINEAR = 45;
const XP_CURVE = 5;
const ATTACK_LINEAR = 1.2;
const ATTACK_CURVE = 1.6;
const HP_LINEAR = 10;
const HP_CURVE = 8;
const SKILL_ENERGY_LINEAR = 10;
const MIN_LEVEL_HEAL = 10;
const LEVEL_HEAL_RATIO = 0.8;
const XP_CURVE_EXPONENT = 1.6;
const SPLITTER_CHILD_XP = 3;
const DEFAULT_ENEMY_XP = 8;
const REGULAR_ELITE_XP_MULTIPLIER = 1.5;
const BOSS_XP_BASE = 90;
const BOSS_XP_PER_KILL = 25;
const MAX_SKILL_LEVEL = 3;
const UPGRADE_CHOICE_COUNT = 3;
const BOSS_ULTIMATE_UNLOCK_DROP_CHANCE = 0.5;

const ENEMY_XP_BY_SHEET_INDEX: Partial<Record<number, number>> = {
  [CRAWLER_SHEET_INDEX]: 8,
  [RUNNER_SHEET_INDEX]: 10,
  [CASTER_SHEET_INDEX]: 14,
  [DUELIST_SHEET_INDEX]: 16,
  [BRUTE_SHEET_INDEX]: 20,
  [BINDER_SHEET_INDEX]: 18,
  [GLIDER_SHEET_INDEX]: 16,
  [LEAPER_SHEET_INDEX]: 18,
  [SPLITTER_SHEET_INDEX]: 16,
  [WARDEN_SHEET_INDEX]: 24,
  [BURROWER_SHEET_INDEX]: 20,
};

type ActiveUltimateLevel = Exclude<UltimateLevel, 0>;

export const INITIAL_SKILL_LEVELS: Partial<Record<SkillId, SkillLevel>> = {
  [SKILL_IDS.lineProjectile]: 1,
  [SKILL_IDS.closeArc]: 1,
  [SKILL_IDS.guardCounter]: 1,
};

export const INITIAL_EQUIPPED_SKILL_IDS: [SkillId | null, SkillId | null, SkillId | null] = [
  SKILL_IDS.lineProjectile,
  SKILL_IDS.closeArc,
  SKILL_IDS.guardCounter,
];

export function xpToNextLevel(level: number) {
  return Math.floor(BASE_XP + XP_LINEAR * level + XP_CURVE * level ** XP_CURVE_EXPONENT);
}

export function baseAttackForLevel(level: number) {
  return Math.floor(
    PLAYER_DEFAULTS.baseAttack
    + ATTACK_LINEAR * (level - 1)
    + ATTACK_CURVE * Math.sqrt(level - 1),
  );
}

export function maxHpForLevel(level: number) {
  return Math.floor(
    PLAYER_DEFAULTS.maxHp
    + HP_LINEAR * (level - 1)
    + HP_CURVE * Math.sqrt(level - 1),
  );
}

export function maxSkillEnergyForLevel(level: number) {
  return PLAYER_DEFAULTS.maxSkillEnergy + SKILL_ENERGY_LINEAR * (level - 1);
}

export function maxSkillChargesForEnergy(skillEnergyMax: number) {
  return Math.max(0, Math.floor(skillEnergyMax / PLAYER_COMBAT.skillCastEnergyCost));
}

export function hasLearnedUltimate(state: GameState) {
  return state.player.ultimateLevel > 0;
}

export function skillDamageMultiplier(state: GameState, skillId: SkillId) {
  const level = skillLevel(state, skillId);
  if (!level) return 0;
  const coreGrowth = corePlayerSkillGrowth(skillId, level);
  if (coreGrowth) return coreGrowth.damageMultiplier;
  if (isGenericPlayerSkillId(skillId)) return 1;
  return 1;
}

export function effectiveUltimateLevel(level: UltimateLevel): ActiveUltimateLevel {
  return level === 0 ? 1 : level;
}

export function moonTideUltimateConfig(level: UltimateLevel) {
  return MOON_TIDE_ULTIMATE[effectiveUltimateLevel(level)];
}

export function ultimateDamageMultiplier(state: GameState) {
  return moonTideUltimateConfig(state.player.ultimateLevel).damageMultiplier;
}

export function enemyXp(enemy: EnemyState) {
  if (enemy.splitterVariant === "child") return SPLITTER_CHILD_XP;
  const baseXp = ENEMY_XP_BY_SHEET_INDEX[enemy.sheetIndex] ?? DEFAULT_ENEMY_XP;
  if (enemy.elite && enemy.spawnSource === "regular") return Math.round(baseXp * REGULAR_ELITE_XP_MULTIPLIER);
  return baseXp;
}

export function bossXp(bossKillsBeforeKill: number) {
  return BOSS_XP_BASE + bossKillsBeforeKill * BOSS_XP_PER_KILL;
}

export function addRunXp(state: GameState, amount: number) {
  state.player.runXp += Math.max(0, amount);
  processPendingLevelUps(state);
}

export function applyUpgradeChoice(state: GameState, index: number) {
  const choice = state.pendingUpgradeChoices[index];
  if (!choice) return false;

  if ((choice.type === "unlockSkill" || choice.type === "upgradeSkill") && choice.skillId) {
    const currentLevel = state.player.skillLevels[choice.skillId] ?? 0;
    const nextLevel = Math.min(MAX_SKILL_LEVEL, currentLevel + 1) as SkillLevel;
    state.player.skillLevels[choice.skillId] = nextLevel;
    if (choice.type === "unlockSkill") {
      autoEquipLearnedSkill(state, choice.skillId);
    }
  }

  if (choice.type === "upgradeUltimate") {
    state.player.ultimateLevel = Math.min(MAX_SKILL_LEVEL, state.player.ultimateLevel + 1) as UltimateLevel;
  }

  state.pendingUpgradeChoices = [];
  processPendingLevelUps(state);
  return true;
}

export function maybeDropBossUltimateUnlock(state: GameState, random = Math.random) {
  if (hasLearnedUltimate(state)) return false;
  if (state.pendingUpgradeChoices.some((choice) => choice.type === "upgradeUltimate")) return false;
  if (random() >= BOSS_ULTIMATE_UNLOCK_DROP_CHANCE) return false;

  state.pendingUpgradeChoices = [
    createUltimateChoice(state, 1),
    ...state.pendingUpgradeChoices,
  ].slice(0, UPGRADE_CHOICE_COUNT);
  return true;
}

export function processPendingLevelUps(state: GameState) {
  if (state.pendingUpgradeChoices.length > 0) return;

  while (state.player.runXp >= xpToNextLevel(state.player.runLevel)) {
    const requiredXp = xpToNextLevel(state.player.runLevel);
    state.player.runXp -= requiredXp;
    applyLevelStatGrowth(state);

    const choices = createUpgradeChoices(state);
    if (choices.length > 0) {
      state.pendingUpgradeChoices = choices;
      return;
    }
  }
}

function applyLevelStatGrowth(state: GameState) {
  const player = state.player;
  const oldMaxHp = player.maxHp;
  const oldSkillEnergyMax = player.skillEnergyMax;
  const skillEnergyRatio = oldSkillEnergyMax > 0 ? player.skillEnergy / oldSkillEnergyMax : 0;
  player.runLevel += 1;
  player.baseAttack = baseAttackForLevel(player.runLevel);
  player.maxHp = maxHpForLevel(player.runLevel);
  player.skillEnergyMax = maxSkillEnergyForLevel(player.runLevel);
  player.maxSkillCharges = maxSkillChargesForEnergy(player.skillEnergyMax);
  player.skillEnergy = Math.min(player.skillEnergyMax, Math.round(skillEnergyRatio * player.skillEnergyMax));
  syncSkillChargesForEquipment(state);
  const heal = Math.max(MIN_LEVEL_HEAL, Math.floor((player.maxHp - oldMaxHp) * LEVEL_HEAL_RATIO));
  player.hp = Math.min(player.maxHp, player.hp + heal);
}

function createUpgradeChoices(state: GameState): UpgradeChoiceState[] {
  const nextUltimateLevel = Math.min(MAX_SKILL_LEVEL, state.player.ultimateLevel + 1) as UltimateLevel;
  const unlockChoices: UpgradeChoiceState[] = [];
  const upgradeChoices: UpgradeChoiceState[] = [];

  for (const skillId of implementedSkillIds()) {
    const currentLevel = state.player.skillLevels[skillId] ?? 0;
    if (!currentLevel) {
      unlockChoices.push({
        id: `unlock-${skillId}-${state.player.runLevel}`,
        type: "unlockSkill",
        title: "习得新技能",
        name: playerSkillName(skillId, 1),
        description: playerSkillDescription(skillId, 1),
        skillId,
        nextLevel: 1,
      });
      continue;
    }

    if (currentLevel < MAX_SKILL_LEVEL && isSkillLearned(state, skillId)) {
      const nextLevel = (currentLevel + 1) as SkillLevel;
      upgradeChoices.push({
        id: `upgrade-${skillId}-${state.player.runLevel}`,
        type: "upgradeSkill",
        title: "技能精进",
        name: playerSkillName(skillId, nextLevel),
        description: playerSkillDescription(skillId, nextLevel),
        skillId,
        nextLevel,
      });
    }
  }

  const ultimateChoice = hasLearnedUltimate(state) && state.player.ultimateLevel < MAX_SKILL_LEVEL
    ? createUltimateChoice(state, nextUltimateLevel)
    : null;
  const choices = compactUpgradeChoices([
    unlockChoices.shift(),
    ultimateChoice,
    upgradeChoices.shift(),
  ]);

  for (const choice of [...unlockChoices, ...upgradeChoices]) {
    if (choices.length >= UPGRADE_CHOICE_COUNT) break;
    choices.push(choice);
  }

  return choices;
}

function createUltimateChoice(state: GameState, nextLevel: UltimateLevel): UpgradeChoiceState {
  return {
    id: `${state.player.ultimateLevel > 0 ? "ultimate" : "unlock-ultimate"}-${state.player.runLevel}`,
    type: "upgradeUltimate",
    title: state.player.ultimateLevel > 0 ? "终式精进" : "习得终式",
    name: `终式·月潮无间 ${romanLevel(nextLevel)}`,
    description: state.player.ultimateLevel > 0
      ? "延长月潮强化时间，提高移动、跳跃、普攻节奏、伤害和残影触发。"
      : "学会终式·月潮无间。大招能量蓄满后，可释放月潮强化状态。",
    nextLevel,
  };
}

function compactUpgradeChoices(choices: Array<UpgradeChoiceState | null | undefined>) {
  return choices.filter((choice): choice is UpgradeChoiceState => Boolean(choice));
}

function implementedSkillIds(): SkillId[] {
  return implementedPlayerSkillIds();
}

function romanLevel(level: SkillLevel | UltimateLevel) {
  if (level === 0) return "0";
  if (level === 1) return "I";
  if (level === 2) return "II";
  return "III";
}
