import { PLAYER_ANIMATION_STATES, SKILL_IDS } from "./ids";
import type { PlayerAnimationState, Skill, SpriteSheet } from "../types/assets";

export const SKILLS: Skill[] = [
  {
    id: SKILL_IDS.skill1,
    name: "壹之型",
    src: "assets/sprites/skill1.png",
    frameCount: 5,
    frameW: 800,
    image: null,
    frameH: 420,
    drawScale: 0.247,
    drawAnchorX: 0.15,
    radius: 230,
    enemyBase: 34,
    enemyScale: 42,
    bossBase: 56,
    color: "#7fdfff",
  },
  {
    id: SKILL_IDS.skill2,
    name: "贰之型",
    src: "assets/sprites/skill2.png",
    frameCount: 6,
    frameW: 500,
    image: null,
    frameH: 500,
    drawScale: 0.243,
    radius: 240,
    enemyBase: 37,
    enemyScale: 45,
    bossBase: 62,
    color: "#8edbff",
  },
  {
    id: SKILL_IDS.skill3,
    name: "叁之型",
    src: "assets/sprites/skill3.png",
    frameCount: 5,
    frameW: 540,
    image: null,
    frameH: 470,
    drawScale: 0.256,
    radius: 255,
    enemyBase: 40,
    enemyScale: 48,
    bossBase: 68,
    color: "#9be6ff",
  },
];

const PLAYER_SHEET_FRAME_W = 435;
const PLAYER_SHEET_FRAME_H = 304;

export const PLAYER_SHEETS: Record<PlayerAnimationState, SpriteSheet> = {
  [PLAYER_ANIMATION_STATES.idle]: {
    src: "assets/sprites/player_idle.png",
    frameW: PLAYER_SHEET_FRAME_W,
    frameH: PLAYER_SHEET_FRAME_H,
    count: 2,
    image: null,
  },
  [PLAYER_ANIMATION_STATES.run]: {
    src: "assets/sprites/player_run.png",
    frameW: PLAYER_SHEET_FRAME_W,
    frameH: PLAYER_SHEET_FRAME_H,
    count: 3,
    image: null,
  },
  [PLAYER_ANIMATION_STATES.jump]: {
    src: "assets/sprites/player_jump.png",
    frameW: PLAYER_SHEET_FRAME_W,
    frameH: PLAYER_SHEET_FRAME_H,
    count: 3,
    image: null,
  },
  [PLAYER_ANIMATION_STATES.attack]: {
    src: "assets/sprites/player_attack.png",
    frameW: PLAYER_SHEET_FRAME_W,
    frameH: PLAYER_SHEET_FRAME_H,
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
