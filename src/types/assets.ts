export type FrameRange = { x: number; w: number };

export type SkillId = "skill1" | "skill2" | "skill3";

export type PlayerAnimationState = "idle" | "run" | "jump" | "attack";

export type Skill = {
  id: SkillId;
  name: string;
  src: string;
  frameCount: number;
  image: HTMLImageElement | null;
  frameRanges: FrameRange[] | null;
  frameWidths?: number[];
  frameW?: number;
  frameH: number;
  drawScale: number;
  radius: number;
  enemyBase: number;
  enemyScale: number;
  bossBase: number;
  color: string;
};

export type SpriteSheet = {
  src: string;
  frameW: number;
  frameH: number;
  count: number;
  image: HTMLImageElement | null;
};
