import type { MoonState } from "../moon/types";
import type { SkillId } from "./assets";

export type PlatformStyle = "stone" | "moss" | "shrine" | "ruin";
export type CrystalType = "atk" | "hp";
export type PlatformKind = "normal" | "hover" | "chain";
export type PlatformLayer = "low" | "mid" | "high" | "top";
export type ChaserPhase = "charge" | "reenter";
export type CrawlerPhase = "move" | "windup" | "lunge" | "recover";
export type RunnerPhase = "approach" | "windup" | "dash" | "recover";
export type DuelistPhase = "approach" | "windup" | "slash" | "recover";
export type BrutePhase =
  | "advance"
  | "guard"
  | "shieldBash"
  | "recover"
  | "shieldBreak"
  | "brokenAdvance"
  | "cleave"
  | "brokenRecover";
export type CasterPhase = "move" | "windup" | "cast" | "recover" | "hit";
export type CasterAiPhase = "seekRange" | "windup" | "cast" | "recover";
export type BinderPhase = "move" | "windup" | "cast" | "recover" | "hit";
export type BinderAiPhase = "seekRange" | "windup" | "cast" | "recover";
export type GliderPhase = "hover" | "windup" | "dive" | "pass" | "recover";
export type LeaperPhase = "stalk" | "windup" | "leap" | "impact" | "recover";
export type SplitterPhase = "move" | "hit" | "split" | "birth";
export type WardenPhase = "move" | "aura" | "hit";
export type BurrowerPhase = "move" | "sink" | "burrow" | "emerge" | "recover";
export type BossArchetypeId =
  | "spider-string"
  | "mirror-dream"
  | "lantern-ember"
  | "dead-bell"
  | "blood-moon-many-faces";
export type BossActionState = "move" | "cast" | "windup" | "dash" | "recover";
export type BossSkillEffectKind = "spiderString";
export type BloodMoonEffectKind =
  | "spiderMist"
  | "mirrorFang"
  | "lanternBell"
  | "sixfold"
  | "manyFaces";
export type BossSkillMode =
  | "spiderString"
  | "deadBellSingle"
  | "deadBellDouble"
  | "deadBellCombo"
  | "mirrorShard"
  | "mirrorAfterimage"
  | "mirrorNightmare"
  | "lanternLure"
  | "lanternFireline"
  | "lanternBuff"
  | "lanternAwakenedGrid"
  | "bloodMoonSpiderMist"
  | "bloodMoonMirrorFang"
  | "bloodMoonLanternBell"
  | "bloodMoonSixfold"
  | "bloodMoonManyFaces";
export type ProjectileKind = "boss" | "bossBone" | "casterWisp";
export type MirrorShardKind = "shard" | "nightmare";
export type SkillLevel = 1 | 2 | 3;
export type UltimateLevel = 0 | 1 | 2 | 3;
export type EquipmentSlot = "blade" | "garb" | "talisman";
export type EquipmentFamily = "flow";
export type EquipmentTier = "common" | "fine" | "awakened";
export type EquipmentItemId = "flow_blade" | "flow_garb" | "flow_talisman";
export type UpgradeChoiceType = "unlockSkill" | "upgradeSkill" | "upgradeUltimate";

export type EquipmentItemState = {
  id: EquipmentItemId;
  name: string;
  slot: EquipmentSlot;
  family: EquipmentFamily;
  tier: EquipmentTier;
  summary: string;
  uiTags: string[];
};

export type UpgradeChoiceState = {
  id: string;
  type: UpgradeChoiceType;
  title: string;
  name: string;
  description: string;
  skillId?: SkillId;
  nextLevel?: SkillLevel | UltimateLevel;
};

export type PlatformState = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  phase: number;
  style: PlatformStyle;
  kind: PlatformKind;
  spriteIndex: number;
  trim: number;
  notch: number;
  hoverAmplitude: number;
  baseY: number;
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
  attackDuration: number;
  fallAttackTimer: number;
  fallAttackRecoveryTimer: number;
  score: number;
  runLevel: number;
  runXp: number;
  baseAttack: number;
  attackBonus: number;
  skillEnergy: number;
  skillEnergyMax: number;
  skillCharges: number;
  maxSkillCharges: number;
  skillIndex: number;
  equippedSkillIds: [SkillId | null, SkillId | null, SkillId | null];
  skillLevels: Partial<Record<SkillId, SkillLevel>>;
  skillTimer: number;
  skillEffectSpawned: boolean;
  skillCastDamageMultiplier: number;
  ultimateEnergy: number;
  ultimateEnergyMax: number;
  ultimateLevel: UltimateLevel;
  ultimateTimer: number;
  ultimateCastTimer: number;
  ultimateEffectSpawned: boolean;
  flowBladeHits: number;
  flowBladeSurgeReady: boolean;
  flowGarbTimer: number;
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
  chaserPhase?: ChaserPhase;
  chaserTimer?: number;
  chaserReenterDuration?: number;
  chaserFacing?: number;
  chaserBaseSpeed?: number;
  crawlerPhase?: CrawlerPhase;
  crawlerTimer?: number;
  crawlerFacing?: number;
  crawlerBaseSpeed?: number;
  crawlerLungeHit?: boolean;
  runnerPhase?: RunnerPhase;
  runnerTimer?: number;
  runnerFacing?: number;
  runnerApproachSpeed?: number;
  duelistPhase?: DuelistPhase;
  duelistTimer?: number;
  duelistFacing?: number;
  duelistBaseSpeed?: number;
  duelistSlashHit?: boolean;
  brutePhase?: BrutePhase;
  bruteTimer?: number;
  bruteFacing?: number;
  bruteBaseSpeed?: number;
  bruteShieldHp?: number;
  bruteShieldBroken?: boolean;
  bruteAttackHit?: boolean;
  casterPhase?: CasterAiPhase;
  casterTimer?: number;
  casterFacing?: number;
  casterBaseSpeed?: number;
  casterCastSpawned?: boolean;
  casterId?: number;
  binderPhase?: BinderAiPhase;
  binderTimer?: number;
  binderFacing?: number;
  binderBaseSpeed?: number;
  binderCastSpawned?: boolean;
  gliderPhase?: GliderPhase;
  gliderTimer?: number;
  gliderFacing?: number;
  gliderBaseSpeed?: number;
  gliderDiveVy?: number;
  leaperPhase?: LeaperPhase;
  leaperTimer?: number;
  leaperPhaseDuration?: number;
  leaperFacing?: number;
  leaperBaseSpeed?: number;
  leaperLandingX?: number;
  leaperLeapStartX?: number;
  leaperLeapStartY?: number;
  leaperImpactHit?: boolean;
  splitterPhase?: SplitterPhase;
  splitterTimer?: number;
  splitterFacing?: number;
  splitterBaseSpeed?: number;
  splitterVariant?: "parent" | "child";
  splitterHasSplit?: boolean;
  wardenPhase?: WardenPhase;
  wardenTimer?: number;
  wardenFacing?: number;
  wardenBaseSpeed?: number;
  wardenBuffedFrames?: number;
  burrowerPhase?: BurrowerPhase;
  burrowerTimer?: number;
  burrowerPhaseDuration?: number;
  burrowerFacing?: number;
  burrowerBaseSpeed?: number;
  burrowerTargetX?: number;
  burrowerBurrowStartX?: number;
  burrowerEmergeHit?: boolean;
  lanternBuffTimer?: number;
  armorBreakTimer?: number;
  armorBreakMultiplier?: number;
};

export type BossState = {
  id: BossArchetypeId;
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
  actionState: BossActionState;
  actionTimer: number;
  facing: number;
  skillCd: number;
  castTimer: number;
  skillEffectSpawned: boolean;
  castFacing: number;
  skillHitDone: boolean;
  skillMode: BossSkillMode;
  recoveryTimer: number;
  awakened: boolean;
  phaseShiftTimer?: number;
  armorBreakTimer?: number;
  armorBreakMultiplier?: number;
} | null;

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
  frame?: number;
  elapsed?: number;
  speed?: number;
  turnRate?: number;
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
  skillId: SkillId;
  scaleIn: number;
  scaleOut: number;
  color: string;
};

export type Skill1EffectState = {
  x: number;
  y: number;
  vx: number;
  facing: number;
  frame: number;
  elapsed: number;
  damageMultiplier: number;
  refundedSkillEnergy?: boolean;
};

export type Skill2EffectState = {
  x: number;
  y: number;
  vx: number;
  facing: number;
  frame: number;
  elapsed: number;
  traveled: number;
  damageMultiplier: number;
  refundedSkillEnergy?: boolean;
};

export type Skill3EffectState = {
  elapsed: number;
  frame: number;
  hitsRemaining: number;
  alpha: number;
  damageMultiplier: number;
};

export type PlayerSkillEffectPhase = "out" | "return";

export type PlayerSkillEffectState = {
  skillId: SkillId;
  kind: "dashSlash" | "vortex" | "armorBreak" | "rainLine" | "returningBlade" | "verticalWave";
  x: number;
  y: number;
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
  bossKills: number;
  pendingUpgradeChoices: UpgradeChoiceState[];
  pendingEquipmentChoices: EquipmentItemState[];
  equipmentInventory: EquipmentItemId[];
  equippedEquipment: Record<EquipmentSlot, EquipmentItemId | null>;
  platformSpawnTimer: number;
  gameOver: boolean;
  boss: BossState;
  moon: MoonState;
  spritesReady: boolean;
  player: PlayerState;
  enemies: EnemyState[];
  particles: ParticleState[];
  projectiles: ProjectileState[];
  bindingZones: BindingZoneState[];
  platforms: PlatformState[];
  chests: ChestState[];
  skillBursts: SkillBurstState[];
  hitBursts: HitBurstState[];
  skill1Effects: Skill1EffectState[];
  skill2Effects: Skill2EffectState[];
  skill3Effect: Skill3EffectState | null;
  playerSkillEffects: PlayerSkillEffectState[];
  ultimateEffects: UltimateEffectState[];
  ultimateTrails: UltimateTrailState[];
  ultimateAfterimageSlashes: UltimateAfterimageSlashState[];
  bossSkill1Effects: BossSkill1EffectState[];
  deadBellWaves: DeadBellWaveState[];
  deadBellBlades: DeadBellBladeState[];
  mirrorShards: MirrorShardState[];
  mirrorAfterimages: MirrorAfterimageState[];
  lanternEmberLures: LanternEmberLureState[];
  lanternEmberFirelines: LanternEmberFirelineState[];
  lanternEmberBuffTethers: LanternEmberBuffTetherState[];
  lanternEmberAwakenedGrids: LanternEmberAwakenedGridState[];
  lanternEmberAshZones: LanternEmberAshZoneState[];
  bloodMoonEffects: BloodMoonEffectState[];
  crystals: CrystalState[];
};
