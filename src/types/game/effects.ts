import type { PlayerAnimationState, SkillId } from "../assets";
import type {
  ActBand,
  BinderTalismanDebuff,
  BloodMoonEffectKind,
  BossSkillEffectKind,
  MirrorShardKind,
  ProjectileKind,
  SkillLevel,
} from "./domain";
import type { EnemyState } from "./entities";

export type BossSkill1EffectState = {
  kind?: BossSkillEffectKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  frame: number;
  elapsed: number;
  damage: number;
  hitPlayerCd: number;
  warningFrames?: number;
  radius?: number;
  hitDone?: boolean;
};

export type SpiderStringCageSegmentKind = "ground" | "air" | "mixed";

export type SpiderStringCageState = {
  segmentIndex: number;
  safeColumn: number;
  previousSafeColumn: number | null;
  columns: number;
  elapsed: number;
  warningFrames: number;
  hitFrames: number;
  afterFrames: number;
  frame: number;
  damage: number;
  hitPlayer: boolean;
  kind: SpiderStringCageSegmentKind;
};

export type DeadBellWaveState = {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  thickness: number;
  warningFrames: number;
  expandFrames: number;
  delay: number;
  elapsed: number;
  frame: number;
  damage: number;
  hitPlayer: boolean;
};

export type DeadBellBladeState = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  facing: number;
  delay: number;
  elapsed: number;
  frame: number;
  life: number;
  damage: number;
};

export type MirrorShardState = {
  kind: MirrorShardKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: number;
  frame: number;
  elapsed: number;
  life: number;
  damage: number;
  bouncesRemaining: number;
};

export type MirrorAfterimageState = {
  x: number;
  y: number;
  w: number;
  h: number;
  facing: number;
  elapsed: number;
  frame: number;
  life: number;
  maxLife: number;
  spawnAt?: number;
  spawned: boolean;
  damage: number;
};

export type MistBoneSpikeState = {
  x: number;
  y: number;
  w: number;
  h: number;
  delay: number;
  warningFrames: number;
  elapsed: number;
  frame: number;
  life: number;
  damage: number;
  hitPlayer: boolean;
};

export type FangGaleWaveState = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  facing: number;
  warningFrames: number;
  elapsed: number;
  frame: number;
  life: number;
  damage: number;
};

export type LanternEmberLureState = {
  x: number;
  y: number;
  vx: number;
  facing: number;
  elapsed: number;
  frame: number;
  life: number;
};

export type LanternEmberFirelineState = {
  x: number;
  y: number;
  w: number;
  h: number;
  warningFrames: number;
  elapsed: number;
  frame: number;
  life: number;
  damage: number;
  hitPlayer: boolean;
};

export type LanternEmberBuffTetherState = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  facing: number;
  elapsed: number;
  frame: number;
  life: number;
};

export type LanternEmberAwakenedGridState = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  warningFrames: number;
  elapsed: number;
  frame: number;
  life: number;
  damage: number;
  hitPlayerCd: number;
};

export type LanternEmberAshZoneState = {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  elapsed: number;
  frame: number;
  damage: number;
};

export type BloodMoonEffectState = {
  kind: BloodMoonEffectKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  facing: number;
  delay: number;
  warningFrames: number;
  elapsed: number;
  frame: number;
  life: number;
  damage: number;
  hitPlayerCd: number;
  hitDone: boolean;
};

export type BindingZoneState = {
  x: number;
  y: number;
  radius: number;
  elite?: boolean;
  moveScale?: number;
  facing: number;
  debuffs: BinderTalismanDebuff[];
  talismanReleased: boolean;
  life: number;
  maxLife: number;
  elapsed: number;
  frame: number;
};

export type ProjectileState = {
  kind?: ProjectileKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy?: number;
  life: number;
  damage: number;
  ownerId?: number;
  debuffs?: BinderTalismanDebuff[];
  frame?: number;
  elapsed?: number;
  speed?: number;
  trackingFrames?: number;
  turnRate?: number;
  wispStage?: ActBand;
  frameDuration?: number;
};

export type ParticleState = {
  kind?: "leaperRock";
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size?: number;
  fade?: number;
  gravity?: number;
  rotation?: number;
  angularVelocity?: number;
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
  skillId: SkillId;
  scaleIn: number;
  scaleOut: number;
  color: string;
};

export type LineProjectileEffectState = {
  x: number;
  y: number;
  vx: number;
  facing: number;
  frame: number;
  elapsed: number;
  drawScale: number;
  effectLevel: SkillLevel;
  damageMultiplier: number;
  refundedSkillEnergy?: boolean;
};

export type CloseArcEffectState = {
  x: number;
  y: number;
  vx: number;
  facing: number;
  frame: number;
  elapsed: number;
  traveled: number;
  drawScale: number;
  maxTravel: number;
  damageMultiplier: number;
  refundedSkillEnergy?: boolean;
};

export type CloseArcBasicCrescentState = {
  x: number;
  y: number;
  w: number;
  h: number;
  facing: number;
  frame: number;
  elapsed: number;
  life: number;
  maxLife: number;
  drawScale: number;
  damage: number;
  hitEnemies: EnemyState[];
  bossHit: boolean;
};

export type GuardCounterEffectState = {
  elapsed: number;
  frame: number;
  hitsRemaining: number;
  maxHits: number;
  activeFrames: number;
  counterPadding: number;
  damageMultiplier: number;
  barrierFlash: number;
};

export type PlayerSkillEffectPhase = "out" | "return" | "impact";

export type PlayerSkillEffectState = {
  skillId: SkillId;
  kind: "dashSlash" | "vortex" | "armorBreak" | "rainLine" | "returningBlade" | "verticalWave";
  x: number;
  y: number;
  visualY?: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: number;
  elapsed: number;
  frame: number;
  life: number;
  maxLife: number;
  damage: number;
  bossDamage: number;
  hitCooldown: number;
  bossHitCooldown: number;
  damageMultiplier: number;
  phase?: PlayerSkillEffectPhase;
  originX?: number;
  originY?: number;
  maxDistance?: number;
  traveled?: number;
  maxHits?: number;
  hitEnemies: EnemyState[];
  returnHitEnemies?: EnemyState[];
  enemyCooldowns?: Array<{ enemy: EnemyState; frames: number }>;
  bossCooldown?: number;
  refundedSkillEnergy?: boolean;
  refundGroupId?: number;
  visualOnly?: boolean;
  armorBreakDuration?: number;
  armorBreakMultiplier?: number;
  armorBreakBossMultiplier?: number;
  lift?: number;
};

export type UltimateEffectState = {
  x: number;
  y: number;
  facing: number;
  elapsed: number;
  frame: number;
  life: number;
  maxLife: number;
};

export type UltimateTrailState = {
  x: number;
  y: number;
  facing: number;
  life: number;
  maxLife: number;
  width: number;
  height: number;
  phase: number;
};

export type UltimateAfterimageSlashState = {
  x: number;
  y: number;
  w: number;
  h: number;
  facing: number;
  life: number;
  maxLife: number;
  power: number;
};

export type UltimatePlayerGhostAction = "idle" | "move" | "attack" | "skill" | "fallAttack";

export type UltimatePlayerGhostState = {
  source: "player" | "skill";
  animationState?: PlayerAnimationState;
  skillId?: SkillId;
  action: UltimatePlayerGhostAction;
  frame: number;
  x: number;
  y: number;
  w: number;
  h: number;
  facing: number;
  life: number;
  maxLife: number;
  strength: number;
};

export type UltimatePlayerGhostSnapshot = Omit<UltimatePlayerGhostState, "life" | "maxLife" | "strength">;
