export type FrameRange = { x: number; w: number };

export type Skill = {
  id: string;
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

export const WIDTH = 960;
export const HEIGHT = 540;
export const GROUND_Y = HEIGHT - 80;
export const GRAVITY = 0.75;

export const BASIC_ATTACK = {
  damage: 16,
  reach: 64,
  frames: 16,
  color: "#6be0ff",
};

export const SKILLS: Skill[] = [
  {
    id: "skill1",
    name: "壹之型",
    src: "assets/sprites/skill1.png",
    frameCount: 5,
    image: null,
    frameRanges: null,
    frameH: 496,
    drawScale: 0.15,
    radius: 230,
    enemyBase: 34,
    enemyScale: 42,
    bossBase: 56,
    color: "#7fdfff",
  },
  {
    id: "skill2",
    name: "贰之型",
    src: "assets/sprites/skill2.png",
    frameCount: 6,
    image: null,
    frameRanges: null,
    frameH: 496,
    drawScale: 0.15,
    radius: 240,
    enemyBase: 37,
    enemyScale: 45,
    bossBase: 62,
    color: "#8edbff",
  },
  {
    id: "skill3",
    name: "叁之型",
    src: "assets/sprites/skill3.png",
    frameCount: 6,
    image: null,
    frameRanges: null,
    frameH: 496,
    drawScale: 0.15,
    radius: 255,
    enemyBase: 40,
    enemyScale: 48,
    bossBase: 68,
    color: "#9be6ff",
  },
];

export const PLAYER_SHEETS: Record<string, SpriteSheet> = {
  idle: {
    src: "assets/sprites/player_idle.png",
    frameW: 435,
    frameH: 304,
    count: 2,
    image: null,
  },
  run: {
    src: "assets/sprites/player_run.png",
    frameW: 435,
    frameH: 304,
    count: 3,
    image: null,
  },
  jump: {
    src: "assets/sprites/player_jump.png",
    frameW: 435,
    frameH: 304,
    count: 3,
    image: null,
  },
  attack: {
    src: "assets/sprites/player_attack.png",
    frameW: 435,
    frameH: 304,
    count: 3,
    image: null,
  },
};

export const ENEMY_SHEETS: SpriteSheet[] = [
  {
    src: "assets/sprites/enemy_1.png",
    frameW: 287,
    frameH: 282,
    count: 4,
    image: null,
  },
  {
    src: "assets/sprites/enemy_2.png",
    frameW: 314,
    frameH: 145,
    count: 4,
    image: null,
  },
  {
    src: "assets/sprites/enemy_3.png",
    frameW: 233,
    frameH: 250,
    count: 4,
    image: null,
  },
];

export const ENEMY_REF_DRAW_W = 120;
export const ENEMY_DRAW_SCALE = ENEMY_REF_DRAW_W / ENEMY_SHEETS[1].frameW;

export const BOSS_SHEET: SpriteSheet = {
  src: "assets/sprites/boss.png",
  frameW: 350,
  frameH: 419,
  count: 4,
  image: null,
};

