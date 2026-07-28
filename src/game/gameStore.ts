import { atom } from "jotai";
import { createStore } from "jotai/vanilla";
import { PLAYER_DEFAULTS, RUN_LEVEL_PACING } from "../constants";
import {
  INITIAL_EQUIPPED_SKILL_IDS,
  INITIAL_SKILL_LEVELS,
  maxSkillChargesForEnergy,
  maxSkillEnergyForLevel,
  xpToNextLevel,
} from "../systems/progression";
import type { SkillId } from "../types/assets";
import type {
  ActBand,
  BossArchetypeId,
  EquipmentChoiceState,
  EquipmentItemState,
  EquipmentSlot,
  PlayerStatusSnapshot,
  SkillLevel,
  UltimateLevel,
  UpgradeChoiceState,
} from "../types/game-state";

const initialRunLevel = RUN_LEVEL_PACING.initialLevel;
const initialSkillEnergyMax = maxSkillEnergyForLevel(initialRunLevel);

export type BossSnapshot = {
  id: BossArchetypeId;
  displayName: string;
  phaseTitle: string;
  awakened: boolean;
  hp: number;
  hpMax: number;
  phase: number;
};

export type PlayerSnapshot = {
  hp: number;
  maxHp: number;
  score: number;
  runLevel: number;
  runXp: number;
  xpToNext: number;
  baseAttack: number;
  attackBonus: number;
  totalAttack: number;
  skillEnergy: number;
  skillEnergyMax: number;
  skillCharges: number;
  maxSkillCharges: number;
  skillIndex: number;
  equippedSkillIds: [SkillId | null, SkillId | null, SkillId | null];
  skillLevels: Partial<Record<SkillId, SkillLevel>>;
  ultimateEnergy: number;
  ultimateEnergyMax: number;
  ultimateLevel: UltimateLevel;
  ultimateTimer: number;
  ultimateDuration: number;
  ultimateCastTimer: number;
  ultimateCastDuration: number;
  ultimateReady: boolean;
  statuses: PlayerStatusSnapshot[];
};

export type EquipmentSnapshot = {
  inventory: EquipmentItemState[];
  equipped: Record<EquipmentSlot, EquipmentItemState | null>;
};

export type ActiveOverlay = "none" | "pause" | "upgrade" | "bossEquipment" | "death" | "victory";

export type GameSnapshot = {
  elapsed: number;
  act: number;
  actBand: ActBand;
  bossKills: number;
  threatScalar: number;
  gameOver: boolean;
  runCleared: boolean;
  paused: boolean;
  manualPaused: boolean;
  activeOverlay: ActiveOverlay;
  spritesReady: boolean;
  enemiesCount: number;
  boss: BossSnapshot | null;
  player: PlayerSnapshot;
  equipment: EquipmentSnapshot;
  pendingUpgradeChoices: UpgradeChoiceState[];
  pendingEquipmentChoices: EquipmentChoiceState[];
};

const initialSnapshot: GameSnapshot = {
  elapsed: 0,
  act: 1,
  actBand: "intro",
  bossKills: 0,
  threatScalar: 1,
  gameOver: false,
  runCleared: false,
  paused: false,
  manualPaused: false,
  activeOverlay: "none",
  spritesReady: false,
  enemiesCount: 0,
  boss: null,
  player: {
    hp: PLAYER_DEFAULTS.maxHp,
    maxHp: PLAYER_DEFAULTS.maxHp,
    score: 0,
    runLevel: initialRunLevel,
    runXp: 0,
    xpToNext: xpToNextLevel(initialRunLevel),
    baseAttack: PLAYER_DEFAULTS.baseAttack,
    attackBonus: 0,
    totalAttack: PLAYER_DEFAULTS.baseAttack,
    skillEnergy: 0,
    skillEnergyMax: initialSkillEnergyMax,
    skillCharges: 0,
    maxSkillCharges: maxSkillChargesForEnergy(initialSkillEnergyMax),
    skillIndex: 0,
    equippedSkillIds: [...INITIAL_EQUIPPED_SKILL_IDS],
    skillLevels: { ...INITIAL_SKILL_LEVELS },
    ultimateEnergy: 0,
    ultimateEnergyMax: PLAYER_DEFAULTS.maxUltimateEnergy,
    ultimateLevel: 0,
    ultimateTimer: 0,
    ultimateDuration: 360,
    ultimateCastTimer: 0,
    ultimateCastDuration: 24,
    ultimateReady: false,
    statuses: [],
  },
  equipment: {
    inventory: [],
    equipped: {
      blade: null,
      garb: null,
      talisman: null,
    },
  },
  pendingUpgradeChoices: [],
  pendingEquipmentChoices: [],
};

export const gameStore = createStore();
export const gameSnapshotAtom = atom<GameSnapshot>(initialSnapshot);
export const isCollisionDebugEnabledAtom = atom(false);

export function setGameSnapshot(snapshot: GameSnapshot) {
  gameStore.set(gameSnapshotAtom, snapshot);
}
