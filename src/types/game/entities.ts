import type { SkillId } from "../assets";
import type {
  BinderAiPhase,
  BossActionState,
  BossArchetypeId,
  BossSkillMode,
  BrutePhase,
  BurrowerPhase,
  CasterAiPhase,
  ChaserPhase,
  CrawlerPhase,
  CrystalType,
  DuelistPhase,
  EnemyAiState,
  EnemyId,
  EnemySpawnSource,
  GliderPhase,
  LeaperPhase,
  PlatformKind,
  PlatformStyle,
  RunnerPhase,
  SkillLevel,
  SplitterPhase,
  UltimateLevel,
  WardenPhase,
} from "./domain";

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
  dashReposition: {
    startX: number;
    targetX: number;
    elapsed: number;
    duration: number;
    level: SkillLevel;
    damageMultiplier: number;
    refundGroupId: number;
    facing: number;
    hitEnemies: EnemyState[];
    bossHit: boolean;
  } | null;
  ultimateEnergy: number;
  ultimateEnergyMax: number;
  ultimateLevel: UltimateLevel;
  ultimateTimer: number;
  ultimateCastTimer: number;
  ultimateEffectSpawned: boolean;
  flowBladeHits: number;
  flowBladeSurgeReady: boolean;
  flowGarbTimer: number;
  burstGarbProtectionUsed: boolean;
  burstTalismanCooldown: number;
  shadowstepDistance: number;
  shadowstepBladeReady: boolean;
  shadowstepBladeStrike: boolean;
  shadowstepGarbMovingTimer: number;
  shadowstepTalismanCooldown: number;
  huntKillTimer: number;
  huntKillCount: number;
  huntBladeReady: boolean;
  huntBladeStrike: boolean;
  huntGarbTimer: number;
  huntTalismanCooldown: number;
  riskTalismanTriggered: boolean;
  onPlatform: PlatformState | null;
  skillFlash: number;
  isPlayer: boolean;
};

export type EnemyState = {
  id: EnemyId;
  spawnSource: EnemySpawnSource;
  spawnCost: number;
  aiState: EnemyAiState;
  aiTimer: number;
  targetX?: number;
  targetY?: number;
  attackCd?: number;
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
  comboStep?: number;
  phaseShiftTimer?: number;
  armorBreakTimer?: number;
  armorBreakMultiplier?: number;
} | null;

export type CrystalState = {
  platform: PlatformState;
  offsetX: number;
  type: CrystalType;
  size: number;
  phase: number;
};
