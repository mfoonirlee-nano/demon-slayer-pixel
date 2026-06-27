import type { MoonState } from "../../moon/types";
import type {
  EnemyId,
  EnemyProfileId,
  EnemyTag,
  EquipmentItemId,
  EquipmentItemState,
  EquipmentSlot,
  UpgradeChoiceState,
} from "./domain";
import type {
  BossState,
  ChestState,
  CrystalState,
  EnemyState,
  PlayerState,
  PlatformState,
} from "./entities";
import type {
  BindingZoneState,
  BloodMoonEffectState,
  BossSkill1EffectState,
  CloseArcEffectState,
  DeadBellBladeState,
  DeadBellWaveState,
  FangGaleWaveState,
  GuardCounterEffectState,
  HitBurstState,
  LanternEmberAshZoneState,
  LanternEmberAwakenedGridState,
  LanternEmberBuffTetherState,
  LanternEmberFirelineState,
  LanternEmberLureState,
  LineProjectileEffectState,
  MirrorAfterimageState,
  MirrorShardState,
  MistBoneSpikeState,
  ParticleState,
  PlayerSkillEffectState,
  ProjectileState,
  SkillBurstState,
  SpiderStringCageState,
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
  pendingEquipmentChoices: EquipmentItemState[];
  equipmentInventory: EquipmentItemId[];
  equippedEquipment: Record<EquipmentSlot, EquipmentItemId | null>;
  platformSpawnTimer: number;
  gameOver: boolean;
  runCleared: boolean;
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
  lineProjectileEffects: LineProjectileEffectState[];
  closeArcEffects: CloseArcEffectState[];
  guardCounterEffect: GuardCounterEffectState | null;
  playerSkillEffects: PlayerSkillEffectState[];
  ultimateEffects: UltimateEffectState[];
  ultimateTrails: UltimateTrailState[];
  ultimateAfterimageSlashes: UltimateAfterimageSlashState[];
  ultimatePlayerGhosts: UltimatePlayerGhostState[];
  bossSkill1Effects: BossSkill1EffectState[];
  spiderStringCages: SpiderStringCageState[];
  deadBellWaves: DeadBellWaveState[];
  deadBellBlades: DeadBellBladeState[];
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
  crystals: CrystalState[];
};
