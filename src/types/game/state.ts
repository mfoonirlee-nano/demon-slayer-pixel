import type { MoonState } from "../../moon/types";
import type {
  EnemyId,
  EnemyProfileId,
  EnemyTag,
  EquipmentChoiceState,
  EquipmentInventoryEntry,
  EquipmentItemId,
  EquipmentSlot,
  UpgradeChoiceState,
} from "./domain";
import type {
  BossState,
  EnemyState,
  PlayerState,
  PlatformState,
  ResidualSpiritState,
} from "./entities";
import type {
  HighPlatformTreasureState,
  TreasureChoiceState,
  TreasureDebugState,
  TreasureOpportunityState,
  TreasurePityState,
  TreasureRevealState,
} from "./treasure";
import type {
  BindingZoneState,
  BloodMoonEffectState,
  BossDefeatSplitEffectState,
  BossSkill1EffectState,
  BruteFireballState,
  BruteGuardReflectionState,
  CloseArcBasicCrescentState,
  CloseArcEffectState,
  DeadBellBladeState,
  DeadBellWaveState,
  FangGaleWaveState,
  GuardCounterEffectState,
  HitBurstState,
  HuntBladeReachEffectState,
  LanternEmberAshZoneState,
  LanternEmberAwakenedGridState,
  LanternEmberBuffTetherState,
  LanternEmberFirelineState,
  LanternEmberLureState,
  LineProjectileEffectState,
  MirrorAfterimageState,
  MirrorShardState,
  MistBoneFogState,
  MistBoneSpikeState,
  ParticleState,
  PlayerSkillEffectState,
  ProjectileState,
  SkillBurstState,
  SpiderStringCageState,
  SpiderStringPillarState,
  UltimateAfterimageSlashState,
  UltimateEffectState,
  UltimatePlayerGhostState,
  UltimateTrailState,
} from "./effects";

export type EnemyPoolEntryState = {
  enemyId: EnemyId;
  weight: number;
};

export type WaveEntryRole = "opener" | "pressure" | "support" | "reinforce";
export type SpawnPattern = "left" | "right" | "random_edge" | "opposite_pair" | "same_edge_cluster" | "pincer";

export type WaveEntryRuntimeState = {
  enemyId: EnemyId;
  role: WaveEntryRole;
  elite: boolean;
  count: number;
  remaining: number;
  spawnPattern: SpawnPattern;
  delayAfterPrevious: number;
};

export type EnemyDirectorState = {
  runSeed: number;
  act: number;
  actStartedAt: number;
  elapsedInAct: number;
  runEnemyOrder: EnemyId[];
  unlockedEnemyIds: EnemyId[];
  currentProfile: EnemyProfileId;
  currentPool: EnemyPoolEntryState[];
  featuredTags: EnemyTag[];
  recentEnemyIds: EnemyId[];
  wavesCleared: number;
  awakenedProfileOrder: EnemyProfileId[];
  bossPrelude: null | {
    elapsed: number;
    reinforcementTimer: number;
    reinforcementsSpawned: number;
  };
  wave: null | {
    phase: "prepare" | "spawning" | "breather";
    timer: number;
    entries: WaveEntryRuntimeState[];
    nextEntryIndex: number;
    activeBudget: number;
  };
};

export type GameState = {
  elapsed: number;
  last: number;
  bossKills: number;
  enemyDirector: EnemyDirectorState;
  pendingUpgradeChoices: UpgradeChoiceState[];
  pendingEquipmentChoices: EquipmentChoiceState[];
  pendingTreasureChoices: TreasureChoiceState[];
  treasureOpportunity: TreasureOpportunityState;
  highPlatformTreasure: HighPlatformTreasureState | null;
  treasureReveal: TreasureRevealState | null;
  treasurePity: TreasurePityState;
  treasureDebug: TreasureDebugState | null;
  equipmentInventory: EquipmentInventoryEntry[];
  equippedEquipment: Record<EquipmentSlot, EquipmentItemId | null>;
  pendingVictoryAfterEquipment: boolean;
  platformSpawnTimer: number;
  gameOver: boolean;
  runCleared: boolean;
  boss: BossState;
  bossDefeatSplitEffect: BossDefeatSplitEffectState | null;
  moon: MoonState;
  spritesReady: boolean;
  player: PlayerState;
  residualSpirits: ResidualSpiritState[];
  enemies: EnemyState[];
  particles: ParticleState[];
  projectiles: ProjectileState[];
  bruteFireballs: BruteFireballState[];
  bruteGuardReflections: BruteGuardReflectionState[];
  bindingZones: BindingZoneState[];
  platforms: PlatformState[];
  skillBursts: SkillBurstState[];
  hitBursts: HitBurstState[];
  lineProjectileEffects: LineProjectileEffectState[];
  closeArcEffects: CloseArcEffectState[];
  closeArcBasicCrescents: CloseArcBasicCrescentState[];
  huntBladeReachEffects: HuntBladeReachEffectState[];
  guardCounterEffect: GuardCounterEffectState | null;
  playerSkillEffects: PlayerSkillEffectState[];
  ultimateEffects: UltimateEffectState[];
  ultimateTrails: UltimateTrailState[];
  ultimateAfterimageSlashes: UltimateAfterimageSlashState[];
  ultimatePlayerGhosts: UltimatePlayerGhostState[];
  bossSkill1Effects: BossSkill1EffectState[];
  spiderStringCages: SpiderStringCageState[];
  spiderStringPillars: SpiderStringPillarState[];
  deadBellWaves: DeadBellWaveState[];
  deadBellBlades: DeadBellBladeState[];
  mistBoneFogs: MistBoneFogState[];
  mistBoneSpikes: MistBoneSpikeState[];
  mirrorShards: MirrorShardState[];
  mirrorAfterimages: MirrorAfterimageState[];
  fangGaleWaves: FangGaleWaveState[];
  lanternEmberLures: LanternEmberLureState[];
  lanternEmberFirelines: LanternEmberFirelineState[];
  lanternEmberBuffTethers: LanternEmberBuffTetherState[];
  lanternEmberAwakenedGrids: LanternEmberAwakenedGridState[];
  lanternEmberAshZones: LanternEmberAshZoneState[];
  bloodMoonEffects: BloodMoonEffectState[];
};
