import { atom } from "jotai";
import { createStore } from "jotai/vanilla";

export type BossSnapshot = {
  hp: number;
  hpMax: number;
  phase: number;
};

export type PlayerSnapshot = {
  hp: number;
  score: number;
  attackBonus: number;
  skillEnergy: number;
  skillCharges: number;
  skillIndex: number;
};

export type GameSnapshot = {
  elapsed: number;
  gameOver: boolean;
  spritesReady: boolean;
  enemiesCount: number;
  boss: BossSnapshot | null;
  player: PlayerSnapshot;
};

const initialSnapshot: GameSnapshot = {
  elapsed: 0,
  gameOver: false,
  spritesReady: false,
  enemiesCount: 0,
  boss: null,
  player: {
    hp: 100,
    score: 0,
    attackBonus: 0,
    skillEnergy: 100,
    skillCharges: 3,
    skillIndex: 0,
  },
};

export const gameStore = createStore();
export const gameSnapshotAtom = atom<GameSnapshot>(initialSnapshot);
export const loadingAtom = atom((get) => !get(gameSnapshotAtom).spritesReady);
export const gameOverAtom = atom((get) => get(gameSnapshotAtom).gameOver);
export const playerHudAtom = atom((get) => get(gameSnapshotAtom).player);
export const bossHudAtom = atom((get) => get(gameSnapshotAtom).boss);
export const elapsedAtom = atom((get) => get(gameSnapshotAtom).elapsed);

export function setGameSnapshot(snapshot: GameSnapshot) {
  gameStore.set(gameSnapshotAtom, snapshot);
}
