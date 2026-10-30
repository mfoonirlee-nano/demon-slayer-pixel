import type { PlayerAnimationState, SkillId } from "../assets";
import type { SkillLevel } from "./domain";

export type UltimateEffectState = {
  effectLevel?: SkillLevel;
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
  effectLevel?: SkillLevel;
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
