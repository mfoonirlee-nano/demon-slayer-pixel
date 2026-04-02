import { GROUND_Y, PLAYER_DEFAULTS, RUNTIME_CONFIG } from "./constants";
import type { GameSnapshot } from "./gameStore";
import { createInitialMoonState } from "./moon";
import type { GameState, PlayerState } from "./types/game-state";

export type * from "./types/game-state";

export function createInitialPlayerState(): PlayerState {
  return {
    x: PLAYER_DEFAULTS.x,
    y: GROUND_Y - PLAYER_DEFAULTS.yOffsetFromGround,
    w: PLAYER_DEFAULTS.w,
    h: PLAYER_DEFAULTS.h,
    vx: 0,
    vy: 0,
    speed: PLAYER_DEFAULTS.speed,
    jump: PLAYER_DEFAULTS.jump,
    facing: PLAYER_DEFAULTS.facing,
    hp: PLAYER_DEFAULTS.hp,
    invincible: 0,
    attackTimer: 0,
    score: 0,
    attackBonus: 0,
    skillEnergy: PLAYER_DEFAULTS.skillEnergy,
    skillCharges: PLAYER_DEFAULTS.skillCharges,
    skillIndex: 0,
    skillTimer: 0,
    onPlatform: null,
    skillFlash: 0,
    isPlayer: true,
  };
}

export function createInitialState(): GameState {
  return {
    elapsed: 0,
    last: 0,
    spawnTimer: 0,
    bossSpawnTimer: RUNTIME_CONFIG.initialBossSpawnTimer,
    platformSpawnTimer: 0,
    gameOver: false,
    boss: null,
    moon: createInitialMoonState(),
    spritesReady: false,
    player: createInitialPlayerState(),
    enemies: [],
    particles: [],
    projectiles: [],
    platforms: [],
    skillBursts: [],
    hitBursts: [],
    crystals: [],
  };
}

export const state: GameState = createInitialState();

export function resetState() {
  const next = createInitialState();
  Object.assign(state.player, next.player);
  state.enemies.length = 0;
  state.platforms.length = 0;
  state.crystals.length = 0;
  state.particles.length = 0;
  state.skillBursts.length = 0;
  state.hitBursts.length = 0;
  state.projectiles.length = 0;
  state.elapsed = next.elapsed;
  state.spawnTimer = next.spawnTimer;
  state.bossSpawnTimer = next.bossSpawnTimer;
  state.platformSpawnTimer = next.platformSpawnTimer;
  state.boss = next.boss;
  state.gameOver = next.gameOver;
  state.moon = next.moon;
  state.last = next.last;
  state.spritesReady = next.spritesReady;
}

export function getStateSnapshot(): GameSnapshot {
  return {
    elapsed: state.elapsed,
    gameOver: state.gameOver,
    spritesReady: state.spritesReady,
    enemiesCount: state.enemies.length,
    boss: state.boss
      ? {
          hp: state.boss.hp,
          hpMax: state.boss.hpMax,
          phase: state.boss.phase,
        }
      : null,
    player: {
      hp: state.player.hp,
      score: state.player.score,
      attackBonus: state.player.attackBonus,
      skillEnergy: state.player.skillEnergy,
      skillCharges: state.player.skillCharges,
      skillIndex: state.player.skillIndex,
    },
  };
}
