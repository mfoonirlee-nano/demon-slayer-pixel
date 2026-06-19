import type { MoonState } from "../../moon/types";
import type {
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
  ParticleState,
  PlayerSkillEffectState,
  ProjectileState,
  SkillBurstState,
  UltimateAfterimageSlashState,
  UltimateEffectState,
  UltimateTrailState,
} from "./effects";

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
  lineProjectileEffects: LineProjectileEffectState[];
  closeArcEffects: CloseArcEffectState[];
  guardCounterEffect: GuardCounterEffectState | null;
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
