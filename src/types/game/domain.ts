import type { SkillId } from "../assets";

export type PlatformStyle = "stone" | "moss" | "shrine" | "ruin";
export type CrystalType = "atk" | "hp";
export type PlatformKind = "normal" | "hover" | "chain";
export type PlatformLayer = "low" | "mid" | "high" | "top";
export type ChaserPhase = "charge" | "reenter";
export type CrawlerPhase = "move" | "windup" | "lunge" | "leap" | "recover";
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
export type SplitterPhase = "move" | "attack" | "hit" | "split" | "birth";
export type WardenPhase = "move" | "aura" | "hit";
export type BurrowerPhase = "move" | "sink" | "burrow" | "emerge" | "recover";
export type EnemyId =
  | "chaser"
  | "crawler"
  | "runner"
  | "duelist"
  | "caster"
  | "leaper"
  | "glider"
  | "splitter"
  | "brute"
  | "burrower"
  | "binder"
  | "warden";
export type EnemyTag =
  | "baseline"
  | "low"
  | "melee"
  | "fast"
  | "melee_burst"
  | "ranged"
  | "vertical"
  | "burst"
  | "aerial"
  | "swarm"
  | "heavy"
  | "ambush"
  | "control"
  | "support";
export type EnemyProfileId =
  | "basic_intro"
  | "technique_intro"
  | "vertical_intro"
  | "heavy_wall"
  | "ambush_swarm"
  | "control_support"
  | "mixed_pressure"
  | "fast_mix"
  | "vertical_pressure"
  | "chaos_mixed"
  | "final";
export type EnemySpawnSource = "regular" | "boss" | "debug";
export type EnemyAiState = "spawn" | "move" | "windup" | "attack" | "recover" | "dead";
export type ActBand = "intro" | "awakened" | "final";
export type BossArchetypeId =
  | "spider-string"
  | "mist-bone"
  | "mirror-dream"
  | "fang-gale"
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
  | "spiderStringCage"
  | "mistBoneSpike"
  | "mistBoneLine"
  | "mistBoneCage"
  | "deadBellSingle"
  | "deadBellDouble"
  | "deadBellCombo"
  | "deadBellDuet"
  | "mirrorShard"
  | "mirrorAfterimage"
  | "mirrorNightmare"
  | "mirrorTrueImageShift"
  | "fangGaleDash"
  | "fangGaleWave"
  | "fangGaleStorm"
  | "lanternLure"
  | "lanternFireline"
  | "lanternBuff"
  | "lanternAwakenedGrid"
  | "bloodMoonSpiderMist"
  | "bloodMoonMirrorFang"
  | "bloodMoonLanternBell"
  | "bloodMoonSixfold"
  | "bloodMoonManyFaces";
export type ProjectileKind = "bossBone" | "casterWisp";
export type MirrorShardKind = "shard" | "nightmare";
export type SkillLevel = 1 | 2 | 3;
export type UltimateLevel = 0 | 1 | 2 | 3;
export type EquipmentSlot = "blade" | "garb" | "talisman";
export type EquipmentFamily = "flow" | "burst" | "shadowstep" | "hunt" | "risk" | "tempo";
export type EquipmentTier = "common" | "fine" | "awakened";
export type EquipmentItemId =
  | "flow_blade"
  | "flow_garb"
  | "flow_talisman"
  | "burst_blade"
  | "burst_garb"
  | "burst_talisman"
  | "shadowstep_blade"
  | "shadowstep_garb"
  | "shadowstep_talisman"
  | "hunt_blade"
  | "hunt_garb"
  | "hunt_talisman"
  | "risk_blade"
  | "risk_garb"
  | "risk_talisman"
  | "tempo_blade"
  | "tempo_garb"
  | "tempo_talisman";
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
