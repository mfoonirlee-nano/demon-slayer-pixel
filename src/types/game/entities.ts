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
  DuelistPhase,
  EnemyAiState,
  EnemyId,
  EnemySpawnSource,
  ActBand,
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
  spriteAct: number | null;
  trim: number;
  notch: number;
  hoverAmplitude: number;
  baseY: number;
  reservedForTreasure?: boolean;
};

export type EnemySpawnOccluderSource =
  | "tree"
  | "decor"
  | "stoneTower"
  | "stoneTowerSmall"
  | "torii"
  | "actProp";

export type EnemySpawnOccluderState = {
  source: EnemySpawnOccluderSource;
  sheetIndex?: number;
  variantIndex: number;
  x: number;
  y: number;
  drawW: number;
  drawH: number;
  alpha: number;
};

export type ResidualSpiritState = {
  x: number;
  y: number;
  amount: number;
  phase: number;
  lifetime: number;
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
  residualSpirit: number;
  residualSpiritHealTimer: number;
  invincible: number;
  attackTimer: number;
  attackDuration: number;
  attackFromRun: boolean;
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
  vortexControlAirJumpsUsed: number;
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
  ultimateDuration: number;
  ultimateCastTimer: number;
  ultimateEffectSpawned: boolean;
  flowBladeHits: number;
  flowBladeSurgeReady: boolean;
  flowBladeSurgeSkillTimer: number;
  flowGarbTimer: number;
  flowGarbDuration: number;
  burstGarbProtectionUsed: boolean;
  burstGarbSpeedTimer: number;
  burstBladeExecuteReady: boolean;
  burstBladeExecuteUsed: boolean;
  burstBladeAwakenedSlashUsed: boolean;
  burstTalismanCooldown: number;
  shadowstepDistance: number;
  shadowstepBladeQuickTimer: number;
  shadowstepBladeReady: boolean;
  shadowstepBladeStrike: boolean;
  shadowstepGarbMovingTimer: number;
  shadowstepGarbHurtSpeedTimer: number;
  shadowstepTalismanCooldown: number;
  huntKillTimer: number;
  huntKillCount: number;
  huntBladeReady: boolean;
  huntBladeStrike: boolean;
  huntBladeWaterTimer: number;
  huntGarbTimer: number;
  huntGarbGuardReady: boolean;
  huntTalismanCooldown: number;
  riskBladeLowHpSkillReady: boolean;
  riskBladeLowHpSkillUsed: boolean;
  riskGarbBossLowHpProtectionUsed: boolean;
  riskTalismanAwakenedTriggered: boolean;
  riskShieldCooldown: number;
  tempoBladeHitCount: number;
  tempoBladeNoPenaltyReady: boolean;
  tempoGarbRecoveryTimer: number;
  tempoGarbRecoverySkillGranted: boolean;
  tempoTalismanLastSkillId: SkillId | null;
  spiderSilkSlowTimer: number;
  binderTalismanSlowTimer: number;
  binderTalismanDamageTimer: number;
  binderTalismanDamageTickTimer: number;
  binderTalismanKeyScrambleTimer: number;
  binderTalismanStunStatusTimer: number;
  binderTalismanStunTimer: number;
  binderTalismanStunCooldown: number;
  runStepDistance: number;
  onPlatform: PlatformState | null;
  skillFlash: number;
  isPlayer: boolean;
};

export type EnemyState = {
  id: EnemyId;
  spawnSource: EnemySpawnSource;
  spawnCost: number;
  growthStage?: ActBand;
  elite?: boolean;
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
  vy?: number;
  onPlatform?: PlatformState | null;
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
  crawlerLeapStartX?: number;
  crawlerLeapStartY?: number;
  crawlerLeapTargetX?: number;
  crawlerLeapTargetY?: number;
  crawlerLeapBaseTargetX?: number;
  runnerPhase?: RunnerPhase;
  runnerTimer?: number;
  runnerWindupStartedAt?: number;
  runnerFacing?: number;
  runnerApproachSpeed?: number;
  runnerDashElapsed?: number;
  runnerDashLandingTimer?: number;
  duelistPhase?: DuelistPhase;
  duelistTimer?: number;
  duelistFacing?: number;
  duelistBaseSpeed?: number;
  duelistSlashHit?: boolean;
  duelistSpinStartX?: number;
  duelistSpinStartY?: number;
  duelistSpinTargetX?: number;
  duelistSpinGroundY?: number;
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
  gliderSonicCooldown?: number;
  leaperPhase?: LeaperPhase;
  leaperTimer?: number;
  leaperPhaseDuration?: number;
  leaperFacing?: number;
  leaperBaseSpeed?: number;
  leaperLandingX?: number;
  leaperLandingY?: number;
  leaperLandingPlatform?: PlatformState | null;
  leaperLandingPlatformOffsetX?: number;
  leaperLeapStartX?: number;
  leaperLeapStartY?: number;
  hasReleasedLeaperSpikes?: boolean;
  leaperImpactHit?: boolean;
  splitterPhase?: SplitterPhase;
  splitterTimer?: number;
  splitterFacing?: number;
  splitterBaseSpeed?: number;
  splitterVariant?: "parent" | "child";
  splitterHasSplit?: boolean;
  wardenPhase?: WardenPhase;
  wardenTimer?: number;
  wardenAuraEndsAt?: number;
  wardenFacing?: number;
  wardenBaseSpeed?: number;
  wardenBuffedFrames?: number;
  wardenAttackDamageScale?: number;
  wardenDamageImmune?: boolean;
  spawnOccluder?: EnemySpawnOccluderState;
  spawnOccluderStartedAt?: number;
  spawnOccluderDirection?: number;
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
  spawnedAt: number;
  comboStep?: number;
  fangPatternPhase?: number;
  phaseShiftTimer?: number;
  spiderStringCageUsed?: boolean;
  spiderStringCageCd?: number;
  mirrorTrueImageShiftPhase?: number;
  mirrorTeleportTargetX?: number;
  mistBonePatternStep?: number;
  lanternPatternStep?: number;
  lanternPatternPhase?: number;
  deadBellReprisalTimer?: number;
  deadBellReprisalHit?: boolean;
  armorBreakTimer?: number;
  armorBreakMultiplier?: number;
} | null;
