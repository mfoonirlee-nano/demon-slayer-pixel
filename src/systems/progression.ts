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
  RUNNER_SHEET_INDEX,
  RUN_LEVEL_PACING,
  RUN_LEVEL_REWARD,
  RUN_XP_CURVE,
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
import { syncSkillChargesForEquipment } from "./equipmentResources";
import { equipmentStatBonuses } from "./equipmentStats";
import {
  baseAttackForLevel,
  maxHpForLevel,
  maxSkillChargesForEnergy,
  maxSkillEnergyForLevel,
} from "./playerStatGrowth";

export {
  baseAttackForLevel,
  maxHpForLevel,
  maxSkillChargesForEnergy,
  maxSkillEnergyForLevel,
} from "./playerStatGrowth";

const SPLITTER_CHILD_XP = 3;
const DEFAULT_ENEMY_XP = 8;
const REGULAR_ELITE_XP_MULTIPLIER = 1.5;
const MAX_SKILL_LEVEL = 3;
const UPGRADE_CHOICE_COUNT = 3;
const MAX_UNLEARNED_CHOICE_COUNT = 2;
const ULTIMATE_LEVEL_TWO_REQUIRED_MAXED_SKILLS = 1;
const ULTIMATE_LEVEL_THREE_REQUIRED_MAXED_SKILLS = 3;

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
  if (level === RUN_LEVEL_PACING.initialLevel) return RUN_XP_CURVE.firstLevel;
  return Math.floor(
    RUN_XP_CURVE.base
    + RUN_XP_CURVE.linear * level
    + RUN_XP_CURVE.curve * level ** RUN_XP_CURVE.exponent,
  );
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

export function bossXpForLevelUp(runLevel: number, runXp: number) {
  let projectedLevel = runLevel;
  let projectedXp = runXp;

  // An upgrade choice can already be open when an area hit kills a summon and the Boss together.
  let remainingXp = runXpAfterLevelUp(projectedLevel, projectedXp);
  while (remainingXp !== null) {
    projectedXp = remainingXp;
    projectedLevel += 1;
    remainingXp = runXpAfterLevelUp(projectedLevel, projectedXp);
  }

  return xpToNextLevel(projectedLevel) - projectedXp;
}

export function addRunXp(state: GameState, amount: number) {
  state.player.runXp += Math.max(0, amount);
  processPendingLevelUps(state);
}

function nonBossLevelCap(state: GameState) {
  return RUN_LEVEL_PACING.initialLevel
    + state.bossKills * RUN_LEVEL_PACING.levelsPerAct
    + RUN_LEVEL_PACING.enemyLevelsPerAct;
}

export function nonBossRunXpHeadroom(state: GameState) {
  const levelCap = nonBossLevelCap(state);
  if (state.player.runLevel > levelCap) return 0;

  let projectedLevel = state.player.runLevel;
  let projectedXp = state.player.runXp;
  let headroom = 0;

  while (projectedLevel < levelCap) {
    headroom += Math.max(0, xpToNextLevel(projectedLevel) - projectedXp);
    projectedLevel += 1;
    projectedXp = 0;
  }

  return headroom + Math.max(0, xpToNextLevel(levelCap) - 1 - projectedXp);
}

export function grantNonBossRunXp(state: GameState, amount: number) {
  const granted = Math.min(
    Math.max(0, Math.floor(amount)),
    nonBossRunXpHeadroom(state),
  );
  if (granted > 0) addRunXp(state, granted);
  return granted;
}

export function addEnemyRunXp(state: GameState, amount: number) {
  const levelCap = RUN_LEVEL_PACING.initialLevel
    + state.bossKills * RUN_LEVEL_PACING.levelsPerAct
    + RUN_LEVEL_PACING.enemyLevelsPerAct;
  if (state.player.runLevel >= levelCap) {
    // Normal combat fills the second bar, but the Boss must land the level-up trigger.
    state.player.runXp = Math.min(
      xpToNextLevel(state.player.runLevel) - 1,
      state.player.runXp + Math.max(0, amount),
    );
    return;
  }

  grantNonBossRunXp(state, amount);
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

export function processPendingLevelUps(state: GameState) {
  if (state.pendingUpgradeChoices.length > 0) return;

  while (applyNextRunLevel(state)) {
    const choices = createUpgradeChoices(state);
    if (choices.length > 0) {
      state.pendingUpgradeChoices = choices;
      return;
    }
  }
}

export function settleRunXpWithoutUpgradeChoices(state: GameState) {
  // Victory discards upgrade cards, but same-frame banked XP must still apply its stat growth.
  state.pendingUpgradeChoices = [];
  while (applyNextRunLevel(state)) {
    // Apply every banked stat level without creating rewards after the run has ended.
  }
}

function runXpAfterLevelUp(level: number, runXp: number) {
  const requiredXp = xpToNextLevel(level);
  return runXp >= requiredXp ? runXp - requiredXp : null;
}

function applyNextRunLevel(state: GameState) {
  const remainingXp = runXpAfterLevelUp(
    state.player.runLevel,
    state.player.runXp,
  );
  if (remainingXp === null) return false;

  state.player.runXp = remainingXp;
  applyLevelStatGrowth(state);
  return true;
}

function applyLevelStatGrowth(state: GameState) {
  const player = state.player;
  const oldMaxHp = player.maxHp;
  const oldSkillEnergyMax = player.skillEnergyMax;
  const skillEnergyRatio = oldSkillEnergyMax > 0 ? player.skillEnergy / oldSkillEnergyMax : 0;
  player.runLevel += 1;
  const equipmentBonuses = equipmentStatBonuses(state);
  player.baseAttack = baseAttackForLevel(player.runLevel) + equipmentBonuses.attack;
  player.maxHp = maxHpForLevel(player.runLevel) + equipmentBonuses.maxHp;
  player.skillEnergyMax = maxSkillEnergyForLevel(player.runLevel) + equipmentBonuses.skillEnergyMax;
  player.maxSkillCharges = maxSkillChargesForEnergy(player.skillEnergyMax);
  player.skillEnergy = Math.min(player.skillEnergyMax, Math.round(skillEnergyRatio * player.skillEnergyMax));
  syncSkillChargesForEquipment(state);
  const heal = Math.max(
    RUN_LEVEL_REWARD.minHeal,
    Math.floor((player.maxHp - oldMaxHp) * RUN_LEVEL_REWARD.healRatio),
  );
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

  const ultimateChoice = canOfferUltimateUpgrade(state, nextUltimateLevel)
    ? createUltimateChoice(state, nextUltimateLevel)
    : null;
  const choices: UpgradeChoiceState[] = [];
  const hasUltimate = hasLearnedUltimate(state);
  let unlearnedChoiceCount = 0;
  const addChoice = (choice: UpgradeChoiceState | null | undefined) => {
    if (!choice || choices.length >= UPGRADE_CHOICE_COUNT) return;
    const isUnlearnedChoice = choice.type === "unlockSkill" || (!hasUltimate && choice.type === "upgradeUltimate");
    if (isUnlearnedChoice) {
      if (unlearnedChoiceCount >= MAX_UNLEARNED_CHOICE_COUNT) return;
      unlearnedChoiceCount += 1;
    }
    choices.push(choice);
  };

  if (hasUltimate) {
    addChoice(unlockChoices.shift());
    addChoice(ultimateChoice);
    addChoice(upgradeChoices.shift());
  } else {
    addChoice(createUltimateChoice(state, 1));
    addChoice(upgradeChoices.shift());
    addChoice(unlockChoices.shift());
  }

  for (const choice of [...unlockChoices, ...upgradeChoices]) {
    if (choices.length >= UPGRADE_CHOICE_COUNT) break;
    addChoice(choice);
  }

  return choices;
}

function canOfferUltimateUpgrade(state: GameState, nextLevel: UltimateLevel) {
  if (!hasLearnedUltimate(state) || state.player.ultimateLevel >= MAX_SKILL_LEVEL) return false;

  const maxedSkillCount = levelThreeNormalSkillCount(state);
  if (nextLevel === 2) return maxedSkillCount >= ULTIMATE_LEVEL_TWO_REQUIRED_MAXED_SKILLS;
  if (nextLevel === MAX_SKILL_LEVEL) return maxedSkillCount >= ULTIMATE_LEVEL_THREE_REQUIRED_MAXED_SKILLS;
  return false;
}

function levelThreeNormalSkillCount(state: GameState) {
  return implementedSkillIds().filter((skillId) => (
    (state.player.skillLevels[skillId] ?? 0) >= MAX_SKILL_LEVEL
  )).length;
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

function implementedSkillIds(): SkillId[] {
  return implementedPlayerSkillIds();
}

function romanLevel(level: SkillLevel | UltimateLevel) {
  if (level === 0) return "0";
  if (level === 1) return "I";
  if (level === 2) return "II";
  return "III";
}
