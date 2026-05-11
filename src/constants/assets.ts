import { PLAYER_ANIMATION_STATES, SKILL_IDS } from "./ids";
import type { PlayerAnimationState, PlayerSheet, Skill, SpriteSheet } from "../types/assets";

export const SKILLS: Skill[] = [
  {
    id: SKILL_IDS.skill1,
    name: "壹之型",
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
    name: "贰之型",
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
    name: "叁之型",
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
    animSpeed: 3,
    // feet sit at 93.8% from sprite top (sprite hangs 9px below reference point)
    anchorY: 0.938,
  },
};

export const ENEMY_SHEETS: SpriteSheet[] = [
  {
    src: "assets/sprites/enemies/enemy_1.png",
    frameW: 287,
    frameH: 282,
    count: 4,
    image: null,
  },
  {
    src: "assets/sprites/enemies/enemy_2.png",
    frameW: 314,
    frameH: 145,
    count: 4,
    image: null,
  },
  {
    src: "assets/sprites/enemies/enemy_3.png",
    frameW: 233,
    frameH: 250,
    count: 4,
    image: null,
  },
];

export const ENEMY_REF_DRAW_W = 120;
export const ENEMY_DRAW_SCALE = ENEMY_REF_DRAW_W / ENEMY_SHEETS[1].frameW;

export const SKILL1_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/skill1_effect.png",
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
  src: "assets/sprites/skills/skill2_effect.png",
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

export const BOSS_SHEET: SpriteSheet = {
  src: "assets/sprites/enemies/boss.png",
  frameW: 350,
  frameH: 419,
  count: 4,
  image: null,
};

export const BOSS_SKILL1_SHEET: SpriteSheet = {
  src: "assets/sprites/enemies/boss_skill1.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const BOSS_SKILL1_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/enemies/boss_skill1_effect.png",
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
  effectSpeed: 20,
  effectGravity: 0.45,
  effectMinTravelFrames: 14,
  effectMaxInitialVy: -22,
  effectMinInitialVy: 6,
  effectFrameDuration: 7,
  damageMultiplier: 2,
  cooldown: 260,
  initialCooldown: 150,
  hitPlayerCooldown: 24,
  hitEnemyCooldown: 18,
  minPhase: 1,
} as const;

type SpriteRegion = { sx: number; sy: number; sw: number; sh: number };

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
  src: string;
  image: HTMLImageElement | null;
  variants: SpriteRegion[];
} = {
  src: "assets/sprites/background/tree_sprites.png",
  image: null,
  variants: [
    { sx: 72, sy: 61, sw: 187, sh: 215 },
    { sx: 271, sy: 103, sw: 139, sh: 173 },
    { sx: 427, sy: 88, sw: 131, sh: 188 },
    { sx: 576, sy: 76, sw: 175, sh: 201 },
    { sx: 765, sy: 77, sw: 169, sh: 200 },
    { sx: 937, sy: 115, sw: 105, sh: 162 },
    { sx: 1070, sy: 130, sw: 107, sh: 144 },
    { sx: 1190, sy: 138, sw: 106, sh: 136 },
    { sx: 1314, sy: 130, sw: 111, sh: 147 },
    { sx: 1471, sy: 97, sw: 120, sh: 180 },
    { sx: 1614, sy: 96, sw: 135, sh: 181 },
    { sx: 1759, sy: 96, sw: 124, sh: 180 },
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
  src: "assets/sprites/background/stone_twoer_sprites.png",
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
    { sx: 14, sy: 82,  sw: 1639, sh: 175 },   // far
    { sx: 6,  sy: 308, sw: 1659, sh: 223 },   // mid
    { sx: 6,  sy: 562, sw: 1660, sh: 318 },   // near (pines at base)
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
