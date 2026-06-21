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

const BASE_XP = 50;
const XP_LINEAR = 22;
const XP_CURVE = 13;
const ATTACK_LINEAR = 1.2;
const ATTACK_CURVE = 1.6;
const HP_LINEAR = 10;
const HP_CURVE = 8;
const SKILL_ENERGY_LINEAR = 10;
const MIN_LEVEL_HEAL = 10;
const LEVEL_HEAL_RATIO = 0.8;

const SKILL_LEVEL_DAMAGE_MULTIPLIER: Record<SkillLevel, number> = {
  1: 1,
  2: 1.18,
  3: 1.35,
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
  return Math.floor(BASE_XP + XP_LINEAR * level + XP_CURVE * level ** 1.45);
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

export function skillDamageMultiplier(state: GameState, skillId: SkillId) {
  const level = skillLevel(state, skillId);
  return level ? SKILL_LEVEL_DAMAGE_MULTIPLIER[level] : 0;
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
  if (enemy.splitterVariant === "child") return 3;

  switch (enemy.sheetIndex) {
    case CRAWLER_SHEET_INDEX:
      return 8;
    case RUNNER_SHEET_INDEX:
      return 10;
    case CASTER_SHEET_INDEX:
      return 14;
    case DUELIST_SHEET_INDEX:
      return 16;
    case BRUTE_SHEET_INDEX:
      return 20;
    case BINDER_SHEET_INDEX:
      return 18;
    case GLIDER_SHEET_INDEX:
      return 16;
    case LEAPER_SHEET_INDEX:
      return 18;
    case SPLITTER_SHEET_INDEX:
      return 16;
    case WARDEN_SHEET_INDEX:
      return 24;
    case BURROWER_SHEET_INDEX:
      return 20;
    default:
      return 8;
  }
}

export function bossXp(bossKillsBeforeKill: number) {
  return 90 + bossKillsBeforeKill * 25;
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
    const nextLevel = Math.min(3, currentLevel + 1) as SkillLevel;
    state.player.skillLevels[choice.skillId] = nextLevel;
    if (choice.type === "unlockSkill") {
      autoEquipLearnedSkill(state, choice.skillId);
    }
  }

  if (choice.type === "upgradeUltimate") {
    state.player.ultimateLevel = Math.min(3, state.player.ultimateLevel + 1) as UltimateLevel;
  }

  state.pendingUpgradeChoices = [];
  processPendingLevelUps(state);
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
  player.skillCharges = Math.min(
    player.maxSkillCharges,
    Math.floor(player.skillEnergy / PLAYER_COMBAT.skillCastEnergyCost),
  );
  const heal = Math.max(MIN_LEVEL_HEAL, Math.floor((player.maxHp - oldMaxHp) * LEVEL_HEAL_RATIO));
  player.hp = Math.min(player.maxHp, player.hp + heal);
}

function createUpgradeChoices(state: GameState): UpgradeChoiceState[] {
  const nextUltimateLevel = Math.min(3, state.player.ultimateLevel + 1) as UltimateLevel;
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

    if (currentLevel < 3 && isSkillLearned(state, skillId)) {
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

  const ultimateChoice = state.player.ultimateLevel < 3
    ? {
        id: `ultimate-${state.player.runLevel}`,
        type: "upgradeUltimate" as const,
        title: "终式精进",
        name: `终式·月潮无间 ${romanLevel(nextUltimateLevel)}`,
        description: "延长月潮强化时间，提高移动、跳跃、普攻节奏、伤害和残影触发。",
        nextLevel: nextUltimateLevel,
      }
    : null;
  const choices = compactUpgradeChoices([
    unlockChoices.shift(),
    ultimateChoice,
    upgradeChoices.shift(),
  ]);

  for (const choice of [...unlockChoices, ...upgradeChoices]) {
    if (choices.length >= 3) break;
    choices.push(choice);
  }

  return choices;
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
