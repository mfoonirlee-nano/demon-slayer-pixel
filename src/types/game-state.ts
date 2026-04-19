import type { MoonState } from "../moon/types";

export type PlatformStyle = "stone" | "moss" | "shrine" | "ruin";
export type CrystalType = "atk" | "hp";
export type PlatformKind = "normal" | "hover" | "chain";
export type PlatformLayer = "low" | "mid" | "high";

export type PlatformState = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  phase: number;
  style: PlatformStyle;
  kind: PlatformKind;
  trim: number;
  notch: number;
  hoverAmplitude: number;
  baseY: number;
};

export type PillarState = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
};

export type ChestState = {
  platform: PlatformState;
  offsetX: number;
  phase: number;
  collected: boolean;
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
  maxHp: number;
  invincible: number;
  attackTimer: number;
  score: number;
  baseAttack: number;
  attackBonus: number;
  skillEnergy: number;
  skillEnergyMax: number;
  skillCharges: number;
  maxSkillCharges: number;
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
  moon: MoonState;
  spritesReady: boolean;
  player: PlayerState;
  enemies: EnemyState[];
  particles: ParticleState[];
  projectiles: ProjectileState[];
  platforms: PlatformState[];
  pillars: PillarState[];
  chests: ChestState[];
  skillBursts: SkillBurstState[];
  hitBursts: HitBurstState[];
  crystals: CrystalState[];
};
