import { atom } from "jotai";
import { createStore } from "jotai/vanilla";
import { PLAYER_DEFAULTS } from "./constants";
import { maxSkillChargesForEnergy, maxSkillEnergyForLevel } from "./systems/progression";
import type { SkillId } from "./types/assets";
import type {
  EquipmentItemState,
  EquipmentSlot,
  SkillLevel,
  UltimateLevel,
  UpgradeChoiceState,
} from "./types/game-state";

const initialSkillEnergyMax = maxSkillEnergyForLevel(1);

export type BossSnapshot = {
  id: string;
  displayName: string;
  phaseTitle: string;
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
};

export type EquipmentSnapshot = {
  inventory: EquipmentItemState[];
  equipped: Record<EquipmentSlot, EquipmentItemState | null>;
};

export type ActiveOverlay = "none" | "pause" | "upgrade" | "bossEquipment" | "death";

export type GameSnapshot = {
  elapsed: number;
  gameOver: boolean;
  paused: boolean;
  manualPaused: boolean;
  activeOverlay: ActiveOverlay;
  spritesReady: boolean;
  enemiesCount: number;
  boss: BossSnapshot | null;
  player: PlayerSnapshot;
  equipment: EquipmentSnapshot;
  pendingUpgradeChoices: UpgradeChoiceState[];
  pendingEquipmentChoices: EquipmentItemState[];
};

const initialSnapshot: GameSnapshot = {
  elapsed: 0,
  gameOver: false,
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
    runLevel: 1,
    runXp: 0,
    xpToNext: 85,
    baseAttack: PLAYER_DEFAULTS.baseAttack,
    attackBonus: 0,
    totalAttack: PLAYER_DEFAULTS.baseAttack,
    skillEnergy: 0,
    skillEnergyMax: initialSkillEnergyMax,
    skillCharges: 0,
    maxSkillCharges: maxSkillChargesForEnergy(initialSkillEnergyMax),
    skillIndex: 0,
    equippedSkillIds: ["skill1", "skill2", "skill3"],
    skillLevels: {
      skill1: 1,
      skill2: 1,
      skill3: 1,
    },
    ultimateEnergy: 0,
    ultimateEnergyMax: PLAYER_DEFAULTS.maxUltimateEnergy,
    ultimateLevel: 0,
    ultimateTimer: 0,
    ultimateDuration: 360,
    ultimateCastTimer: 0,
    ultimateCastDuration: 24,
    ultimateReady: false,
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

export function setGameSnapshot(snapshot: GameSnapshot) {
  gameStore.set(gameSnapshotAtom, snapshot);
}
