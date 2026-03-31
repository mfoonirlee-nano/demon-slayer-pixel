import { GROUND_Y } from "./constants";
import type { GameSnapshot } from "./gameStore";

export type PlatformStyle = "stone" | "moss" | "shrine" | "ruin";
export type CrystalType = "atk" | "hp";

export type PlatformState = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  phase: number;
  style: PlatformStyle;
  trim: number;
  notch: number;
};

export type PlayerState = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  speed: number;
  jump: number;
  facing: number;
  hp: number;
  invincible: number;
  attackTimer: number;
  score: number;
  attackBonus: number;
  skillEnergy: number;
  skillCharges: number;
  skillIndex: number;
  skillTimer: number;
  onPlatform: PlatformState | null;
  skillFlash: number;
  isPlayer: boolean;
};

export type EnemyState = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  hp: number;
  damage: number;
  hitCd: number;
  animSeed: number;
  sheetIndex: number;
};

export type BossState = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  targetX: number;
  entering: boolean;
  hpMax: number;
  hp: number;
  phase: number;
  hitCd: number;
  aiTimer: number;
  jumpCd: number;
  animSeed: number;
} | null;

export type ProjectileState = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  life: number;
  damage: number;
};

export type ParticleState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size?: number;
  fade?: number;
};

export type SparkState = {
  ang: number;
  dist: number;
  speed: number;
  size: number;
};

export type HitBurstState = {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  radius: number;
  grow: number;
  color: string;
  sparks: SparkState[];
};

export type SkillBurstState = {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  frame: number;
  frameCount: number;
  skillIndex: number;
  width: number;
  height: number;
  scaleIn: number;
  scaleOut: number;
  color: string;
};

export type CrystalState = {
  platform: PlatformState;
  offsetX: number;
  type: CrystalType;
  size: number;
  phase: number;
};

export type GameState = {
  elapsed: number;
  last: number;
  spawnTimer: number;
  bossSpawnTimer: number;
  platformSpawnTimer: number;
  gameOver: boolean;
  boss: BossState;
  moonBloodLerp: number;
  spritesReady: boolean;
  player: PlayerState;
  enemies: EnemyState[];
  particles: ParticleState[];
  projectiles: ProjectileState[];
  platforms: PlatformState[];
  skillBursts: SkillBurstState[];
  hitBursts: HitBurstState[];
  crystals: CrystalState[];
};

export function createInitialPlayerState(): PlayerState {
  return {
    x: 140,
    y: GROUND_Y - 56,
    w: 34,
    h: 56,
    vx: 0,
    vy: 0,
    speed: 4,
    jump: 14,
    facing: 1,
    hp: 100,
    invincible: 0,
    attackTimer: 0,
    score: 0,
    attackBonus: 0,
    skillEnergy: 100,
    skillCharges: 3,
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
    bossSpawnTimer: 28,
    platformSpawnTimer: 0,
    gameOver: false,
    boss: null,
    moonBloodLerp: 0,
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
  state.moonBloodLerp = next.moonBloodLerp;
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
