import { PLAYER_ANIMATION_STATES, SKILL_IDS } from "./ids";
import type { PlayerAnimationState, PlayerSheet, Skill, SpriteSheet } from "../types/assets";

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
    anchorX: 0.15,
    radius: 30,
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
    radius: 30,
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
    radius: 30,
    enemyBase: 40,
    enemyScale: 48,
    bossBase: 68,
    color: "#9be6ff",
  },
];


export const PLAYER_SHEETS: Record<PlayerAnimationState, PlayerSheet> = {
  [PLAYER_ANIMATION_STATES.idle]: {
    src: "assets/sprites/player_idle.png",
    frameW: 320,
    frameH: 380,
    count: 6,
    image: null,
    drawW: 90,
    drawH: 107,
    animSpeed: 8,
  },
  [PLAYER_ANIMATION_STATES.run]: {
    src: "assets/sprites/player_run.png",
    frameW: 320,
    frameH: 430,
    count: 6,
    image: null,
    drawW: 82,
    drawH: 110,
    animSpeed: 5,
    flipX: true,
  },
  [PLAYER_ANIMATION_STATES.jump]: {
    src: "assets/sprites/player_jump.png",
    frameW: 300,
    frameH: 310,
    count: 6,
    image: null,
    drawW: 107,
    drawH: 110,
    animSpeed: 7,
  },
  [PLAYER_ANIMATION_STATES.attack]: {
    src: "assets/sprites/player_attack.png",
    frameW: 400,
    frameH: 400,
    count: 6,
    image: null,
    drawW: 146,
    drawH: 146,
    animSpeed: 3,
    // feet sit at 93.8% from sprite top (sprite hangs 9px below reference point)
    anchorY: 0.938,
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

export const SKILL1_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/skill1_effect.png",
  frameW: 320,
  frameH: 150,
  count: 6,
  image: null,
};

export const SKILL1_EFFECT_CONFIG = {
  // draw scale relative to frame height
  drawScale: 0.66,
  // horizontal speed in px/frame
  speed: 8,
  // frame animate speed in game-frames per anim-frame
  frameDuration: 5,
  // last N frames to loop once the initial run ends
  loopFromFrame: 2,
  // damage multiplier relative to player base+bonus attack
  damageMultiplier: 1.2,
  // frames between successive hits on the same target
  hitCooldown: 20,
} as const;

export const SKILL2_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/skill2_effect.png",
  frameW: 380,
  frameH: 450,
  count: 6,
  image: null,
};

export const SKILL2_EFFECT_CONFIG = {
  drawScale: 0.52,
  speed: 6,
  frameDuration: 4,
  // 3-5 character widths (player w=34), using 4 widths ≈ 136px
  maxTravel: 140,
  damageMultiplier: 1.5,
  hitCooldown: 20,
} as const;

export const BOSS_SHEET: SpriteSheet = {
  src: "assets/sprites/boss.png",
  frameW: 350,
  frameH: 419,
  count: 4,
  image: null,
};

export const SKY_SPRITES: {
  src: string;
  image: HTMLImageElement | null;
  moon: { sx: number; sy: number; sw: number; sh: number };
} = {
  src: "assets/sprites/sky_sprites.png",
  image: null,
  moon: { sx: 35, sy: 37, sw: 321, sh: 322 },
};
