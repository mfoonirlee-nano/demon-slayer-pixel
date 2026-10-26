import type { SkillId } from "../assets";
import type { BossState, EnemyState } from "./entities";

export type EquipmentReactionTarget = EnemyState | NonNullable<BossState>;

export type EquipmentTideMark = {
  target: EquipmentReactionTarget;
  isBoss: boolean;
  remaining: number;
  skillId: SkillId;
  castId: number;
};

export type EquipmentControlRecord = {
  target: EquipmentReactionTarget;
  isBoss: boolean;
  remaining: number;
};

export type EquipmentReactionEffectKind = "sweep" | "eye" | "rupture" | "surge";

export type EquipmentReactionEffect = {
  kind: EquipmentReactionEffectKind;
  x: number;
  y: number;
  w: number;
  h: number;
  facing: number;
  vx: number;
  elapsed: number;
  life: number;
  maxLife: number;
  damage: number;
  bossDamage: number;
  hitEnemies: EnemyState[];
  hitBoss: BossState | null;
};

export type EquipmentReactionCastRecord = {
  castId: number;
  skillId: SkillId;
  hitTargets: EquipmentReactionTarget[];
  reactionTriggered: boolean;
  eyeTriggered: boolean;
};

export type EquipmentReactionState = {
  revision: number;
  marks: EquipmentTideMark[];
  controls: EquipmentControlRecord[];
  effects: EquipmentReactionEffect[];
  movementDistance: number;
  coverFrames: number;
  castHistory: EquipmentReactionCastRecord[];
  retiredCastId: number;
};
