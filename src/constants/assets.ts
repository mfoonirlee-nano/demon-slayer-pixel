import { PLAYER_ANIMATION_STATES, SKILL_IDS } from "./ids";
import type { PlayerAnimationState, PlayerSheet, Skill, SpriteSheet } from "../types/assets";
import type { BinderPhase, BrutePhase, CasterPhase, CrawlerPhase, DuelistPhase, RunnerPhase } from "../types/game-state";

export const SKILLS: Skill[] = [
  {
    id: SKILL_IDS.skill1,
    name: "水龙破",
    description: "向前释放一条水龙冲击，给路径上的敌人造成伤害。",
    src: "assets/sprites/skills/skill1.png",
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
    name: "打潮刃",
    description: "向前挥出大范围水之呼吸剑气，席卷路径上的敌人。",
    src: "assets/sprites/skills/skill2.png",
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
    name: "静水返",
    description: "展开防护水幕，受到攻击时反击身边的敌人。",
    src: "assets/sprites/skills/skill3.png",
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
    src: "assets/sprites/player/player_idle.png",
    frameW: 320,
    frameH: 380,
    count: 6,
    image: null,
    drawW: 90,
    drawH: 107,
    animSpeed: 8,
  },
  [PLAYER_ANIMATION_STATES.run]: {
    src: "assets/sprites/player/player_run.png",
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
    src: "assets/sprites/player/player_jump.png",
    frameW: 300,
    frameH: 310,
    count: 6,
    image: null,
    drawW: 107,
    drawH: 110,
    animSpeed: 7,
  },
  [PLAYER_ANIMATION_STATES.attack]: {
    src: "assets/sprites/player/player_attack.png",
    frameW: 400,
    frameH: 400,
    count: 6,
    image: null,
    drawW: 146,
    drawH: 146,
    animSpeed: 4,
    // feet sit at 93.8% from sprite top (sprite hangs 9px below reference point)
    anchorY: 0.938,
  },
  [PLAYER_ANIMATION_STATES.fallAttack]: {
    src: "assets/sprites/player/player_fall_attack.png",
    frameW: 400,
    frameH: 400,
    count: 6,
    image: null,
    drawW: 150,
    drawH: 150,
    animSpeed: 4,
    anchorY: 0.88,
  },
};

export const ENEMY_SHEETS: SpriteSheet[] = [
  {
    src: "assets/sprites/enemies/chaser/chaser.png",
    frameW: 287,
    frameH: 282,
    count: 8,
    image: null,
  },
  {
    src: "assets/sprites/enemies/crawler/crawler.png",
    frameW: 314,
    frameH: 145,
    count: 4,
    image: null,
  },
  {
    src: "assets/sprites/enemies/runner/runner_approach.png",
    frameW: 250,
    frameH: 250,
    count: 6,
    image: null,
  },
  {
    src: "assets/sprites/enemies/caster/caster_move.png",
    frameW: 288,
    frameH: 360,
    count: 4,
    image: null,
  },
  {
    src: "assets/sprites/enemies/duelist/duelist.png",
    frameW: 320,
    frameH: 360,
    count: 4,
    image: null,
  },
  {
    src: "assets/sprites/enemies/brute/brute_advance.png",
    frameW: 314,
    frameH: 145,
    count: 6,
    image: null,
  },
  {
    src: "assets/sprites/enemies/binder/binder_move.png",
    frameW: 260,
    frameH: 320,
    count: 4,
    image: null,
  },
];

export const CRAWLER_SHEET_INDEX = 1;

export const CRAWLER_SHEETS: Record<CrawlerPhase, SpriteSheet> = {
  move: ENEMY_SHEETS[CRAWLER_SHEET_INDEX],
  windup: {
    src: "assets/sprites/enemies/crawler/crawler_windup.png",
    frameW: 314,
    frameH: 145,
    count: 4,
    image: null,
  },
  lunge: {
    src: "assets/sprites/enemies/crawler/crawler_lunge.png",
    frameW: 314,
    frameH: 145,
    count: 5,
    image: null,
  },
  recover: {
    src: "assets/sprites/enemies/crawler/crawler_recover.png",
    frameW: 314,
    frameH: 145,
    count: 3,
    image: null,
  },
};

export const CASTER_SHEET_INDEX = 3;

export const CASTER_SHEETS: Record<CasterPhase, SpriteSheet> = {
  move: ENEMY_SHEETS[CASTER_SHEET_INDEX],
  windup: {
    src: "assets/sprites/enemies/caster/caster_windup.png",
    frameW: 288,
    frameH: 360,
    count: 4,
    image: null,
  },
  cast: {
    src: "assets/sprites/enemies/caster/caster_cast.png",
    frameW: 288,
    frameH: 360,
    count: 4,
    image: null,
  },
  recover: {
    src: "assets/sprites/enemies/caster/caster_recover.png",
    frameW: 288,
    frameH: 360,
    count: 3,
    image: null,
  },
  hit: {
    src: "assets/sprites/enemies/caster/caster_hit.png",
    frameW: 288,
    frameH: 360,
    count: 3,
    image: null,
  },
};

export const CASTER_WISP_SHEET: SpriteSheet = {
  src: "assets/sprites/enemies/caster/caster_wisp.png",
  frameW: 96,
  frameH: 96,
  count: 4,
  image: null,
};

export const DUELIST_SHEET_INDEX = 4;

export const DUELIST_SHEETS: Record<DuelistPhase, SpriteSheet> = {
  approach: ENEMY_SHEETS[DUELIST_SHEET_INDEX],
  windup: {
    src: "assets/sprites/enemies/duelist/duelist_windup.png",
    frameW: 320,
    frameH: 360,
    count: 4,
    image: null,
  },
  slash: {
    src: "assets/sprites/enemies/duelist/duelist_slash.png",
    frameW: 320,
    frameH: 360,
    count: 5,
    image: null,
  },
  recover: {
    src: "assets/sprites/enemies/duelist/duelist_recover.png",
    frameW: 320,
    frameH: 360,
    count: 3,
    image: null,
  },
};

export const BRUTE_SHEET_INDEX = 5;

export const BRUTE_SHEETS: Record<BrutePhase, SpriteSheet> = {
  advance: ENEMY_SHEETS[BRUTE_SHEET_INDEX],
  brace: {
    src: "assets/sprites/enemies/brute/brute_brace.png",
    frameW: 314,
    frameH: 145,
    count: 4,
    image: null,
  },
  stomp: {
    src: "assets/sprites/enemies/brute/brute_stomp.png",
    frameW: 314,
    frameH: 145,
    count: 5,
    image: null,
  },
  recover: {
    src: "assets/sprites/enemies/brute/brute_recover.png",
    frameW: 314,
    frameH: 145,
    count: 3,
    image: null,
  },
};

export const RUNNER_SHEET_INDEX = 2;

export const RUNNER_SHEETS: Record<RunnerPhase, SpriteSheet> = {
  approach: ENEMY_SHEETS[RUNNER_SHEET_INDEX],
  windup: {
    src: "assets/sprites/enemies/runner/runner_windup.png",
    frameW: 250,
    frameH: 250,
    count: 4,
    image: null,
  },
  dash: {
    src: "assets/sprites/enemies/runner/runner_dash.png",
    frameW: 250,
    frameH: 250,
    count: 5,
    image: null,
  },
  recover: {
    src: "assets/sprites/enemies/runner/runner_recover.png",
    frameW: 250,
    frameH: 250,
    count: 3,
    image: null,
  },
};

export const BINDER_SHEET_INDEX = 6;

export const BINDER_SHEETS: Record<BinderPhase, SpriteSheet> = {
  move: ENEMY_SHEETS[BINDER_SHEET_INDEX],
  windup: {
    src: "assets/sprites/enemies/binder/binder_windup.png",
    frameW: 260,
    frameH: 320,
    count: 4,
    image: null,
  },
  cast: {
    src: "assets/sprites/enemies/binder/binder_cast.png",
    frameW: 260,
    frameH: 320,
    count: 4,
    image: null,
  },
  recover: {
    src: "assets/sprites/enemies/binder/binder_recover.png",
    frameW: 260,
    frameH: 320,
    count: 3,
    image: null,
  },
  hit: {
    src: "assets/sprites/enemies/binder/binder_hit.png",
    frameW: 260,
    frameH: 320,
    count: 3,
    image: null,
  },
};

export const BINDER_ZONE_SHEET: SpriteSheet = {
  src: "assets/sprites/enemies/binder/binder_zone.png",
  frameW: 240,
  frameH: 120,
  count: 8,
  image: null,
};

export const BINDER_ZONE_BACK_SHEET: SpriteSheet = {
  src: "assets/sprites/enemies/binder/binder_zone_back.png",
  frameW: 240,
  frameH: 120,
  count: 8,
  image: null,
};

export const BINDER_ZONE_FRONT_SHEET: SpriteSheet = {
  src: "assets/sprites/enemies/binder/binder_zone_front.png",
  frameW: 240,
  frameH: 120,
  count: 8,
  image: null,
};

export const ENEMY_REF_DRAW_W = 120;
export const ENEMY_DRAW_SCALE = ENEMY_REF_DRAW_W / ENEMY_SHEETS[1].frameW;

export const SKILL1_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/skill1_effect.png",
  frameW: 250,
  frameH: 150,
  count: 7,
  image: null,
};

export const SKILL1_EFFECT_CONFIG = {
  // draw scale relative to frame height
  drawScale: 0.66,
  // horizontal speed in px/frame
  speed: 8,
  // frame animate speed in game-frames per anim-frame
  frameDuration: 8,
  // last N frames to loop once the initial run ends
  loopFromFrame: 1,
  // damage multiplier relative to player base+bonus attack
  damageMultiplier: 1.2,
  // frames between successive hits on the same target
  hitCooldown: 20,
} as const;

export const SKILL2_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/skill2_effect.png",
  frameW: 380,
  frameH: 450,
  count: 6,
  image: null,
};

export const SKILL2_EFFECT_CONFIG = {
  drawScale: 0.72,
  speed: 6,
  frameDuration: 4,
  // 3-5 character widths (player w=34), using 4 widths ≈ 136px
  maxTravel: 140,
  damageMultiplier: 1.5,
  hitCooldown: 20,
} as const;

export const SKILL3_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/skill3_effect.png",
  frameW: 400,
  frameH: 300,
  count: 6,
  image: null,
};

export const SKILL3_EFFECT_CONFIG = {
  drawScale: 0.5,
  frameDuration: 6,
  maxHits: 3,
  damageMultiplier: 2,
} as const;

export const ULTIMATE_SKILL_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/ultimate_skill.png",
  frameW: 400,
  frameH: 496,
  count: 6,
  image: null,
};

export const ULTIMATE_SKILL_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/ultimate_skill_effect.png",
  frameW: 432,
  frameH: 496,
  count: 5,
  image: null,
};

export const BOSS_SHEET: SpriteSheet = {
  src: "assets/sprites/enemies/boss/boss.png",
  frameW: 350,
  frameH: 419,
  count: 4,
  image: null,
};

export const BOSS_SKILL1_SHEET: SpriteSheet = {
  src: "assets/sprites/enemies/boss/boss_skill1.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const BOSS_SKILL1_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/enemies/boss/boss_skill1_effect.png",
  frameW: 400,
  frameH: 350,
  count: 6,
  image: null,
};

export const BOSS_SKILL1_CONFIG = {
  castDuration: 54,
  spawnAtFrame: 28,
  castFrameDuration: 9,
  drawW: 280,
  drawH: 280,
  drawBottomPadding: 34,
  drawOffsetX: 80,
  drawOffsetY: 72,
  effectDrawScale: 0.42,
  effectSpawnYOffset: 10,
  effectSpawnXOffset: 18,
  effectSpeed: 16,
  effectGravity: 0.45,
  effectMinTravelFrames: 14,
  effectMaxInitialVy: -22,
  effectMinInitialVy: 6,
  effectFrameDuration: 28,
  damageMultiplier: 2,
  cooldown: 260,
  initialCooldown: 150,
  hitPlayerCooldown: 24,
  hitEnemyCooldown: 18,
  minPhase: 1,
} as const;

type SpriteRegion = { sx: number; sy: number; sw: number; sh: number };
type PlatformSpriteRegion = SpriteRegion & { surfaceY: number };
type GroundTileRegion = SpriteRegion & {
  surfaceY: number;
  fillLeft: number;
  fillRight: number;
  fillTop: number;
  fillBottom: number;
};

export const SKY_SPRITES: {
  src: string;
  image: HTMLImageElement | null;
  moon: SpriteRegion;
  starSmall: SpriteRegion;
  starMedium: SpriteRegion;
  starGroup: SpriteRegion;
} = {
  src: "assets/sprites/background/sky_sprites.png",
  image: null,
  moon: { sx: 35, sy: 37, sw: 321, sh: 322 },
  starSmall: { sx: 107, sy: 635, sw: 57, sh: 56 },
  starMedium: { sx: 409, sy: 564, sw: 207, sh: 214 },
  starGroup: { sx: 790, sy: 544, sw: 309, sh: 286 },
};

export const TREE_SPRITES: {
  sheets: Array<{
    src: string;
    image: HTMLImageElement | null;
    variants: SpriteRegion[];
  }>;
} = {
  sheets: [
    {
      src: "assets/sprites/tree/tree_sprites.png",
      image: null,
      variants: [
        { sx: 36, sy: 18, sw: 318, sh: 350 },
        { sx: 400, sy: 20, sw: 138, sh: 346 },
        { sx: 578, sy: 18, sw: 304, sh: 350 },
        { sx: 914, sy: 62, sw: 300, sh: 305 },
        { sx: 1210, sy: 80, sw: 250, sh: 287 },
        { sx: 1470, sy: 38, sw: 286, sh: 330 },
        { sx: 36, sy: 376, sw: 160, sh: 252 },
        { sx: 232, sy: 376, sw: 214, sh: 252 },
        { sx: 532, sy: 378, sw: 170, sh: 250 },
        { sx: 788, sy: 400, sw: 140, sh: 228 },
        { sx: 960, sy: 388, sw: 320, sh: 240 },
        { sx: 1300, sy: 388, sw: 160, sh: 240 },
        { sx: 1500, sy: 392, sw: 260, sh: 236 },
        { sx: 16, sy: 644, sw: 160, sh: 204 },
        { sx: 210, sy: 646, sw: 170, sh: 202 },
        { sx: 425, sy: 642, sw: 135, sh: 206 },
        { sx: 610, sy: 642, sw: 210, sh: 206 },
        { sx: 855, sy: 676, sw: 280, sh: 172 },
        { sx: 1210, sy: 642, sw: 160, sh: 206 },
        { sx: 1330, sy: 704, sw: 190, sh: 144 },
        { sx: 1555, sy: 655, sw: 170, sh: 193 },
      ],
    },
  ],
};

export const CLOUD_SPRITES: Record<"big" | "small", {
  src: string;
  image: HTMLImageElement | null;
}> = {
  big: {
    src: "assets/sprites/cloud/cloud_big.png",
    image: null,
  },
  small: {
    src: "assets/sprites/cloud/cloud_small.png",
    image: null,
  },
};


export const STONE_TOWER_SPRITES: {
  src: string;
  image: HTMLImageElement | null;
  variants: SpriteRegion[];
} = {
  src: "assets/sprites/background/stone_tower_sprites2.png",
  image: null,
  variants: [
    { sx: 68, sy: 15, sw: 108, sh: 161 },
    { sx: 245, sy: 18, sw: 92, sh: 158 },
    { sx: 407, sy: 15, sw: 93, sh: 161 },
    { sx: 572, sy: 37, sw: 105, sh: 139 },
    { sx: 745, sy: 30, sw: 94, sh: 146 },
    { sx: 904, sy: 32, sw: 92, sh: 144 },
    { sx: 1089, sy: 18, sw: 122, sh: 158 },
    { sx: 1267, sy: 35, sw: 111, sh: 141 },
    { sx: 1441, sy: 27, sw: 73, sh: 149 },
    { sx: 1560, sy: 34, sw: 117, sh: 142 },
    { sx: 1730, sy: 34, sw: 115, sh: 142 },
  ],
};

export const STONE_TOWER_SMALL_SPRITES: {
  src: string;
  image: HTMLImageElement | null;
  variants: SpriteRegion[];
} = {
  src: "assets/sprites/background/stone_tower_sprites.png",
  image: null,
  variants: [
    { sx: 8, sy: 8, sw: 85, sh: 204 },
    { sx: 111, sy: 78, sw: 90, sh: 134 },
    { sx: 217, sy: 25, sw: 75, sh: 187 },
    { sx: 309, sy: 31, sw: 81, sh: 181 },
    { sx: 404, sy: 102, sw: 74, sh: 110 },
    { sx: 493, sy: 43, sw: 84, sh: 169 },
    { sx: 593, sy: 96, sw: 70, sh: 116 },
    { sx: 681, sy: 98, sw: 70, sh: 114 },
  ],
};

export const TORII_SPRITES: {
  src: string;
  image: HTMLImageElement | null;
  variants: SpriteRegion[];
} = {
  src: "assets/sprites/background/torii_sprites.png",
  image: null,
  variants: [
    { sx: 12, sy: 12, sw: 185, sh: 196 },
    { sx: 218, sy: 13, sw: 164, sh: 195 },
    { sx: 405, sy: 24, sw: 137, sh: 184 },
    { sx: 567, sy: 28, sw: 147, sh: 180 },
    { sx: 731, sy: 86, sw: 111, sh: 122 },
    { sx: 862, sy: 35, sw: 122, sh: 173 },
    { sx: 1002, sy: 32, sw: 150, sh: 176 },
    { sx: 1171, sy: 40, sw: 144, sh: 168 },
  ],
};

// 3 mountain range strips (stacked vertically). Index 0 = farthest/smallest,
// index 2 = closest/tallest (has pine silhouettes at base).
export const MOUNTAIN_SPRITES: {
  src: string;
  image: HTMLImageElement | null;
  variants: SpriteRegion[];
} = {
  src: "assets/sprites/background/mountains.png",
  image: null,
  variants: [
    { sx: 14, sy: 82, sw: 1639, sh: 175 },   // far
    { sx: 6, sy: 308, sw: 1659, sh: 223 },   // mid
    { sx: 6, sy: 562, sw: 1660, sh: 318 },   // near (pines at base)
  ],
};

// 4 ground strip variants (stacked vertically). Intended to progress
// lush → withered → frozen as the player nears the boss.
export const GROUND_SPRITES: {
  src: string;
  image: HTMLImageElement | null;
  variants: SpriteRegion[];
} = {
  src: "assets/sprites/background/ground_sprites.png",
  image: null,
  variants: [
    { sx: 82, sy: 137, sw: 1519, sh: 75 },  // grass-topped dirt (lush)
    { sx: 84, sy: 328, sw: 1516, sh: 77 },  // gray stone (barren)
    { sx: 80, sy: 539, sw: 1520, sh: 77 },  // dirt + dead grass (withering)
    { sx: 75, sy: 731, sw: 1524, sh: 83 },  // icy blue (hostile)
  ],
};

export const GROUND_TILE_SPRITES: {
  tileSize: number;
  drawOffsetY: number;
  seamOverlap: number;
  grassPerStone: number;
  grass: {
    src: string;
    image: HTMLImageElement | null;
    frontSrc: string;
    frontImage: HTMLImageElement | null;
    regions: GroundTileRegion[];
  };
  stone: {
    src: string;
    image: HTMLImageElement | null;
    frontSrc: string;
    frontImage: HTMLImageElement | null;
    regions: GroundTileRegion[];
  };
} = {
  tileSize: 150,
  drawOffsetY: -10,
  seamOverlap: 52,
  grassPerStone: 3,
  grass: {
    src: "assets/sprites/ground/grass_ground_150_150_base.png",
    image: null,
    frontSrc: "assets/sprites/ground/grass_ground_150_150_front.png",
    frontImage: null,
    regions: [
      { sx: 0, sy: 0, sw: 150, sh: 150, surfaceY: 28, fillLeft: 1, fillRight: 145, fillTop: 18, fillBottom: 139 },
      { sx: 150, sy: 0, sw: 150, sh: 150, surfaceY: 28, fillLeft: 2, fillRight: 141, fillTop: 18, fillBottom: 139 },
      { sx: 300, sy: 0, sw: 150, sh: 150, surfaceY: 28, fillLeft: 9, fillRight: 125, fillTop: 17, fillBottom: 138 },
      { sx: 450, sy: 0, sw: 150, sh: 150, surfaceY: 29, fillLeft: 6, fillRight: 139, fillTop: 0, fillBottom: 141 },
      { sx: 600, sy: 0, sw: 150, sh: 150, surfaceY: 30, fillLeft: 5, fillRight: 142, fillTop: 3, fillBottom: 143 },
      { sx: 750, sy: 0, sw: 150, sh: 150, surfaceY: 32, fillLeft: 4, fillRight: 138, fillTop: 3, fillBottom: 146 },
      { sx: 0, sy: 150, sw: 150, sh: 150, surfaceY: 23, fillLeft: 0, fillRight: 144, fillTop: 14, fillBottom: 136 },
      { sx: 150, sy: 150, sw: 150, sh: 150, surfaceY: 28, fillLeft: 7, fillRight: 144, fillTop: 17, fillBottom: 137 },
      { sx: 300, sy: 150, sw: 150, sh: 150, surfaceY: 28, fillLeft: 19, fillRight: 134, fillTop: 20, fillBottom: 139 },
      { sx: 450, sy: 150, sw: 150, sh: 150, surfaceY: 25, fillLeft: 9, fillRight: 126, fillTop: 15, fillBottom: 136 },
      { sx: 600, sy: 150, sw: 150, sh: 150, surfaceY: 26, fillLeft: 11, fillRight: 136, fillTop: 15, fillBottom: 135 },
      { sx: 750, sy: 150, sw: 150, sh: 150, surfaceY: 30, fillLeft: 8, fillRight: 137, fillTop: 17, fillBottom: 137 },
    ],
  },
  stone: {
    src: "assets/sprites/ground/stone_ground_150_150_base.png",
    image: null,
    frontSrc: "assets/sprites/ground/stone_ground_150_150_front.png",
    frontImage: null,
    regions: [
      { sx: 0, sy: 0, sw: 150, sh: 150, surfaceY: 27, fillLeft: 11, fillRight: 135, fillTop: 10, fillBottom: 139 },
      { sx: 150, sy: 0, sw: 150, sh: 150, surfaceY: 29, fillLeft: 13, fillRight: 131, fillTop: 4, fillBottom: 144 },
      { sx: 300, sy: 0, sw: 150, sh: 150, surfaceY: 30, fillLeft: 12, fillRight: 133, fillTop: 5, fillBottom: 144 },
      { sx: 450, sy: 0, sw: 150, sh: 150, surfaceY: 28, fillLeft: 20, fillRight: 136, fillTop: 18, fillBottom: 140 },
      { sx: 600, sy: 0, sw: 150, sh: 150, surfaceY: 29, fillLeft: 13, fillRight: 127, fillTop: 19, fillBottom: 140 },
      { sx: 750, sy: 0, sw: 150, sh: 150, surfaceY: 29, fillLeft: 3, fillRight: 145, fillTop: 19, fillBottom: 141 },
    ],
  },
};

export const PLATFORM_SPRITES: {
  src: string;
  image: HTMLImageElement | null;
  drawScale: number;
  regions: PlatformSpriteRegion[];
  chain: number[];
  normal: number[];
  wide: number[];
} = {
  src: "assets/sprites/platform/platform.png",
  image: null,
  drawScale: 0.75,
  regions: [
    { sx: 44, sy: 65, sw: 142, sh: 45, surfaceY: 16 },
    { sx: 210, sy: 58, sw: 212, sh: 54, surfaceY: 19 },
    { sx: 448, sy: 65, sw: 200, sh: 48, surfaceY: 15 },
    { sx: 668, sy: 64, sw: 186, sh: 45, surfaceY: 17 },
    { sx: 887, sy: 74, sw: 60, sh: 36, surfaceY: 10 },
    { sx: 45, sy: 175, sw: 142, sh: 44, surfaceY: 16 },
    { sx: 209, sy: 183, sw: 58, sh: 41, surfaceY: 10 },
    { sx: 295, sy: 184, sw: 73, sh: 40, surfaceY: 11 },
    { sx: 391, sy: 184, sw: 60, sh: 38, surfaceY: 10 },
    { sx: 475, sy: 182, sw: 104, sh: 45, surfaceY: 11 },
    { sx: 598, sy: 182, sw: 56, sh: 40, surfaceY: 11 },
    { sx: 681, sy: 165, sw: 163, sh: 58, surfaceY: 21 },
    { sx: 873, sy: 174, sw: 77, sh: 49, surfaceY: 11 },
    { sx: 48, sy: 279, sw: 74, sh: 45, surfaceY: 14 },
    { sx: 165, sy: 286, sw: 121, sh: 41, surfaceY: 11 },
    { sx: 317, sy: 283, sw: 155, sh: 54, surfaceY: 12 },
    { sx: 523, sy: 270, sw: 81, sh: 56, surfaceY: 15 },
    { sx: 637, sy: 270, sw: 48, sh: 59, surfaceY: 14 },
    { sx: 719, sy: 289, sw: 131, sh: 45, surfaceY: 10 },
    { sx: 886, sy: 286, sw: 60, sh: 42, surfaceY: 10 },
    { sx: 42, sy: 399, sw: 151, sh: 45, surfaceY: 15 },
    { sx: 217, sy: 394, sw: 190, sh: 54, surfaceY: 18 },
    { sx: 430, sy: 398, sw: 145, sh: 48, surfaceY: 15 },
    { sx: 597, sy: 384, sw: 110, sh: 54, surfaceY: 13 },
    { sx: 732, sy: 388, sw: 134, sh: 53, surfaceY: 16 },
    { sx: 889, sy: 401, sw: 61, sh: 38, surfaceY: 14 },
    { sx: 42, sy: 509, sw: 140, sh: 57, surfaceY: 21 },
    { sx: 204, sy: 516, sw: 237, sh: 57, surfaceY: 21 },
    { sx: 466, sy: 509, sw: 404, sh: 54, surfaceY: 22 },
    { sx: 900, sy: 531, sw: 50, sh: 39, surfaceY: 11 },
  ],
  chain: [4, 6, 7, 8, 10, 12, 13, 16, 17, 19, 25, 29],
  normal: [0, 5, 9, 11, 14, 15, 18, 20, 22, 23, 24, 26],
  wide: [1, 2, 3, 21, 27, 28],
};

// Top row: rocks, grass, bushes (standalone clutter)
// Bottom row: stone tile patches (flat ground decorations)
export const FOREGROUND_SPRITES: {
  src: string;
  image: HTMLImageElement | null;
  decor: SpriteRegion[];
  patches: SpriteRegion[];
} = {
  src: "assets/sprites/background/foreground_sprites.png",
  image: null,
  decor: [
    { sx: 56, sy: 16, sw: 137, sh: 96 },
    { sx: 240, sy: 36, sw: 165, sh: 71 },
    { sx: 450, sy: 27, sw: 154, sh: 85 },
    { sx: 651, sy: 34, sw: 84, sh: 78 },
    { sx: 767, sy: 37, sw: 90, sh: 79 },
    { sx: 891, sy: 35, sw: 97, sh: 76 },
    { sx: 1019, sy: 45, sw: 89, sh: 69 },
    { sx: 1183, sy: 49, sw: 94, sh: 63 },
    { sx: 1294, sy: 47, sw: 85, sh: 67 },
    { sx: 1407, sy: 39, sw: 127, sh: 72 },
    { sx: 1575, sy: 42, sw: 125, sh: 72 },
    { sx: 1739, sy: 30, sw: 119, sh: 80 },
  ],
  patches: [
    { sx: 54, sy: 156, sw: 161, sh: 54 },
    { sx: 264, sy: 153, sw: 174, sh: 60 },
    { sx: 488, sy: 152, sw: 208, sh: 61 },
    { sx: 750, sy: 150, sw: 213, sh: 67 },
    { sx: 1016, sy: 144, sw: 198, sh: 69 },
    { sx: 1263, sy: 149, sw: 130, sh: 64 },
    { sx: 1432, sy: 149, sw: 151, sh: 65 },
    { sx: 1619, sy: 152, sw: 104, sh: 58 },
    { sx: 1760, sy: 152, sw: 109, sh: 60 },
  ],
};
