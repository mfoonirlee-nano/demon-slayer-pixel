import { atom } from "jotai";
import { createStore } from "jotai/vanilla";
import { PLAYER_DEFAULTS } from "./constants";

export type BossSnapshot = {
  hp: number;
  hpMax: number;
  phase: number;
};

export type PlayerSnapshot = {
  hp: number;
  maxHp: number;
  score: number;
  baseAttack: number;
  attackBonus: number;
  totalAttack: number;
  skillEnergy: number;
  skillEnergyMax: number;
  skillCharges: number;
  maxSkillCharges: number;
  skillIndex: number;
  ultimateEnergy: number;
  ultimateEnergyMax: number;
  ultimateReady: boolean;
};

export type GameSnapshot = {
  elapsed: number;
  gameOver: boolean;
  paused: boolean;
  spritesReady: boolean;
  enemiesCount: number;
  boss: BossSnapshot | null;
  player: PlayerSnapshot;
};

const initialSnapshot: GameSnapshot = {
  elapsed: 0,
  gameOver: false,
  paused: false,
  spritesReady: false,
  enemiesCount: 0,
  boss: null,
  player: {
    hp: PLAYER_DEFAULTS.maxHp,
    maxHp: PLAYER_DEFAULTS.maxHp,
    score: 0,
    baseAttack: PLAYER_DEFAULTS.baseAttack,
    attackBonus: 0,
    totalAttack: PLAYER_DEFAULTS.baseAttack,
    skillEnergy: 0,
    skillEnergyMax: PLAYER_DEFAULTS.maxSkillEnergy,
    skillCharges: 0,
    maxSkillCharges: PLAYER_DEFAULTS.maxSkillCharges,
    skillIndex: 0,
    ultimateEnergy: 0,
    ultimateEnergyMax: PLAYER_DEFAULTS.maxUltimateEnergy,
    ultimateReady: false,
  },
};

export const gameStore = createStore();
export const gameSnapshotAtom = atom<GameSnapshot>(initialSnapshot);

export function setGameSnapshot(snapshot: GameSnapshot) {
  gameStore.set(gameSnapshotAtom, snapshot);
}
