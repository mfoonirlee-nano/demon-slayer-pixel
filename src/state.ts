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
    hp: PLAYER_DEFAULTS.maxHp,
    maxHp: PLAYER_DEFAULTS.maxHp,
    invincible: 0,
    attackTimer: 0,
    score: 0,
    baseAttack: PLAYER_DEFAULTS.baseAttack,
    attackBonus: 0,
    skillEnergy: PLAYER_DEFAULTS.maxSkillEnergy,
    skillEnergyMax: PLAYER_DEFAULTS.maxSkillEnergy,
    skillCharges: PLAYER_DEFAULTS.maxSkillCharges,
    maxSkillCharges: PLAYER_DEFAULTS.maxSkillCharges,
    skillIndex: 0,
    skillTimer: 0,
    skillEffectSpawned: false,
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
    pillars: [],
    chests: [],
    skillBursts: [],
    hitBursts: [],
    skill1Effects: [],
    crystals: [],
  };
}

export const state: GameState = createInitialState();

function resetCollection<T>(collection: T[], nextItems: T[] = []) {
  collection.length = 0;
  collection.push(...nextItems);
}

export function resetState() {
  const next = createInitialState();
  state.player = next.player;
  resetCollection(state.enemies, next.enemies);
  resetCollection(state.platforms, next.platforms);
  resetCollection(state.pillars, next.pillars);
  resetCollection(state.chests, next.chests);
  resetCollection(state.crystals, next.crystals);
  resetCollection(state.particles, next.particles);
  resetCollection(state.skillBursts, next.skillBursts);
  resetCollection(state.hitBursts, next.hitBursts);
  resetCollection(state.skill1Effects, next.skill1Effects);
  resetCollection(state.projectiles, next.projectiles);
  state.elapsed = next.elapsed;
  state.spawnTimer = next.spawnTimer;
  state.bossSpawnTimer = next.bossSpawnTimer;
  state.platformSpawnTimer = next.platformSpawnTimer;
  state.boss = next.boss;
  state.gameOver = next.gameOver;
  state.moon = next.moon;
  state.last = next.last;
  // spritesReady is not reset — loaded assets persist across game resets
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
      maxHp: state.player.maxHp,
      score: state.player.score,
      baseAttack: state.player.baseAttack,
      attackBonus: state.player.attackBonus,
      totalAttack: state.player.baseAttack + state.player.attackBonus,
      skillEnergy: state.player.skillEnergy,
      skillEnergyMax: state.player.skillEnergyMax,
      skillCharges: state.player.skillCharges,
      maxSkillCharges: state.player.maxSkillCharges,
      skillIndex: state.player.skillIndex,
    },
  };
}
