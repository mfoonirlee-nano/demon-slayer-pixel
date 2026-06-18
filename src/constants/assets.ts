import { PLAYER_ANIMATION_STATES, SKILL_IDS } from "./ids";
import type { PlayerAnimationState, PlayerSheet, Skill, SkillId, SpriteSheet } from "../types/assets";
import type { BinderPhase, BrutePhase, BurrowerPhase, CasterPhase, CrawlerPhase, DuelistPhase, GliderPhase, LeaperPhase, RunnerPhase, SplitterPhase, WardenPhase } from "../types/game-state";

export const SKILLS: Skill[] = [
  {
    id: SKILL_IDS.skill1,
    name: "水龙破",
    description: "向前释放一条水龙冲击，给路径上的敌人造成伤害。",
    typeTag: "line_projectile",
    implemented: true,
    iconSrc: "assets/sprites/skills/skill1/icon.png",
    levelDescriptions: {
      1: "向前释放水龙，造成窄长路径伤害。",
      2: "水龙伤害提升，命中反馈更稳定。",
      3: "水龙伤害进一步提升，直线压制更可靠。",
    },
    src: "assets/sprites/skills/skill1/skill.png",
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
    typeTag: "close_arc",
    implemented: true,
    iconSrc: "assets/sprites/skills/skill2/icon.png",
    levelDescriptions: {
      1: "前方月牙水刃，短距离宽判定。",
      2: "潮刃伤害提升，近身解围更稳定。",
      3: "潮刃伤害进一步提升，贴身爆发更强。",
    },
    src: "assets/sprites/skills/skill2/skill.png",
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
    typeTag: "guard_counter",
    implemented: true,
    iconSrc: "assets/sprites/skills/skill3/icon.png",
    levelDescriptions: {
      1: "展开防护水幕，受击时抵挡并反击近处目标。",
      2: "反击伤害提升，防守收益更高。",
      3: "反击伤害进一步提升，容错收益更高。",
    },
    src: "assets/sprites/skills/skill3/skill.png",
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
  {
    id: SKILL_IDS.dashReposition,
    name: "流步·潮闪",
    description: "短距离踏浪前冲，穿过身前敌人时无敌并造成伤害，结束时向前收刀斩击。",
    typeTag: "dash_reposition",
    implemented: true,
    iconSrc: "assets/sprites/skills/dash_reposition/icon.png",
    levelDescriptions: {
      1: "前冲 92px，穿击身前敌人并短暂无敌。",
      2: "前冲距离提升至 108px，穿击伤害提高。",
      3: "前冲距离提升至 124px，追击和脱困更稳定。",
    },
    src: "assets/sprites/skills/dash_reposition/skill.png",
    frameCount: 5,
    frameW: 480,
    image: null,
    frameH: 360,
    drawScale: 0.42,
    anchorX: 0.45,
    anchorY: 0.9,
    radius: 96,
    enemyBase: 28,
    enemyScale: 36,
    bossBase: 38,
    color: "#7bdcff",
  },
  {
    id: SKILL_IDS.vortexControl,
    name: "回涡·引潮",
    description: "在地面生成短时潮涡，轻微牵引并减速小怪。",
    typeTag: "vortex_control",
    implemented: true,
    iconSrc: "assets/sprites/skills/vortex_control/icon.png",
    levelDescriptions: {
      1: "潮涡持续 54 帧，脚底进入涡圈的小怪被轻微牵引和减速。",
      2: "潮涡持续 66 帧，牵引、减速和持续伤害提高。",
      3: "潮涡持续 78 帧，涡圈范围和控场稳定性进一步提高。",
    },
    src: "assets/sprites/skills/vortex_control/skill.png",
    frameCount: 5,
    frameW: 360,
    image: null,
    frameH: 360,
    drawScale: 0.34,
    anchorX: 0.52,
    radius: 92,
    enemyBase: 18,
    enemyScale: 26,
    bossBase: 24,
    color: "#65d6ff",
  },
  {
    id: SKILL_IDS.armorBreak,
    name: "断浪·裂甲",
    description: "向前飞出压缩潮线，命中后爆裂并施加短时裂甲标记。",
    typeTag: "armor_break",
    implemented: true,
    iconSrc: "assets/sprites/skills/armor_break/icon.png",
    levelDescriptions: {
      1: "潮线命中目标后爆裂并施加短时裂甲。",
      2: "斩击伤害和裂甲持续提高。",
      3: "裂甲前置爆发收益更高，但 Boss 效果仍降低。",
    },
    src: "assets/sprites/skills/armor_break/skill.png",
    frameCount: 5,
    frameW: 360,
    image: null,
    frameH: 360,
    drawScale: 0.34,
    anchorX: 0.46,
    radius: 128,
    enemyBase: 34,
    enemyScale: 42,
    bossBase: 48,
    color: "#b7efff",
  },
  {
    id: SKILL_IDS.antiAirMulti,
    name: "雨线·穿针",
    description: "召来多条细潮线斜落，前方有敌时优先落向目标。",
    typeTag: "anti_air_multi",
    implemented: true,
    iconSrc: "assets/sprites/skills/anti_air_multi/icon.png",
    levelDescriptions: {
      1: "生成 4 条窄潮线，优先落向前方威胁目标。",
      2: "潮线增加至 5 条，目标覆盖更稳定。",
      3: "潮线增加至 6 条，对空和补刀更可靠。",
    },
    src: "assets/sprites/skills/anti_air_multi/skill.png",
    frameCount: 5,
    frameW: 640,
    image: null,
    frameH: 420,
    drawScale: 0.5,
    anchorX: 0.45,
    anchorY: 0.93,
    radius: 150,
    enemyBase: 18,
    enemyScale: 24,
    bossBase: 26,
    color: "#9eeaff",
  },
  {
    id: SKILL_IDS.returningBlade,
    name: "镜潮·返刃",
    description: "发出潮刃后沿路线回收，去程和返程分别可命中。",
    typeTag: "returning_blade",
    implemented: true,
    iconSrc: "assets/sprites/skills/returning_blade/icon.png",
    levelDescriptions: {
      1: "潮刃飞出后返回，站位正确可获得两段命中。",
      2: "飞行距离和命中上限提高。",
      3: "往返路线收益更高，但不自动追踪全场。",
    },
    src: "assets/sprites/skills/returning_blade/skill.png",
    frameCount: 5,
    frameW: 360,
    image: null,
    frameH: 360,
    drawScale: 0.58,
    anchorX: 0.48,
    radius: 150,
    enemyBase: 25,
    enemyScale: 34,
    bossBase: 42,
    color: "#80e2ff",
  },
  {
    id: SKILL_IDS.verticalWave,
    name: "升浪·托月",
    description: "自前方或脚下升起短浪柱，打断贴身和纵向目标。",
    typeTag: "vertical_wave",
    implemented: true,
    iconSrc: "assets/sprites/skills/vertical_wave/icon.png",
    levelDescriptions: {
      1: "升起短浪柱，轻微上抛或打断小怪。",
      2: "浪柱高度和伤害提高。",
      3: "纵向覆盖更稳定，但不长期浮空控场。",
    },
    src: "assets/sprites/skills/vertical_wave/skill.png",
    frameCount: 6,
    frameW: 480,
    image: null,
    frameH: 420,
    drawScale: 0.34,
    anchorX: 0.4,
    anchorY: 0.98,
    radius: 110,
    enemyBase: 30,
    enemyScale: 38,
    bossBase: 44,
    color: "#9be8ff",
  },
];


export const PLAYER_SHEETS: Record<PlayerAnimationState, PlayerSheet> = {
  [PLAYER_ANIMATION_STATES.idle]: {
    src: "assets/sprites/player/player_idle.png",
    frameW: 384,
    frameH: 480,
    count: 8,
    image: null,
    drawW: 96,
    drawH: 120,
    animSpeed: 8,
    anchorY: 0.979,
  },
  [PLAYER_ANIMATION_STATES.run]: {
    src: "assets/sprites/player/player_run.png",
    frameW: 448,
    frameH: 420,
    count: 8,
    image: null,
    drawW: 120,
    drawH: 112,
    animSpeed: 4,
    anchorY: 0.976,
  },
  [PLAYER_ANIMATION_STATES.jump]: {
    src: "assets/sprites/player/player_jump.png",
    frameW: 448,
    frameH: 420,
    count: 6,
    image: null,
    drawW: 124,
    drawH: 116,
    animSpeed: 7,
    anchorY: 0.971,
  },
  [PLAYER_ANIMATION_STATES.attack]: {
    src: "assets/sprites/player/player_attack.png",
    frameW: 640,
    frameH: 480,
    count: 8,
    image: null,
    drawW: 189,
    drawH: 142,
    animSpeed: 3,
    anchorY: 0.979,
  },
  [PLAYER_ANIMATION_STATES.fallAttack]: {
    src: "assets/sprites/player/player_fall_attack.png",
    frameW: 640,
    frameH: 560,
    count: 8,
    image: null,
    drawW: 178,
    drawH: 156,
    animSpeed: 4,
    anchorY: 0.982,
  },
};

export const ENEMY_SHEETS: SpriteSheet[] = [
  {
    src: "assets/sprites/enemies/chaser/chaser.png",
    frameW: 287,
    frameH: 282,
    count: 6,
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
    frameW: 320,
    frameH: 360,
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
  {
    src: "assets/sprites/enemies/glider/glider_hover.png",
    frameW: 360,
    frameH: 240,
    count: 6,
    image: null,
  },
  {
    src: "assets/sprites/enemies/leaper/leaper_stalk.png",
    frameW: 320,
    frameH: 320,
    count: 6,
    image: null,
  },
  {
    src: "assets/sprites/enemies/splitter/splitter_move.png",
    frameW: 288,
    frameH: 320,
    count: 6,
    image: null,
  },
  {
    src: "assets/sprites/enemies/warden/warden_move.png",
    frameW: 320,
    frameH: 360,
    count: 4,
    image: null,
  },
  {
    src: "assets/sprites/enemies/burrower/burrower_move.png",
    frameW: 314,
    frameH: 180,
    count: 6,
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
  guard: {
    src: "assets/sprites/enemies/brute/brute_guard.png",
    frameW: 320,
    frameH: 360,
    count: 4,
    image: null,
  },
  shieldBash: {
    src: "assets/sprites/enemies/brute/brute_shield_bash.png",
    frameW: 320,
    frameH: 360,
    count: 5,
    image: null,
  },
  recover: {
    src: "assets/sprites/enemies/brute/brute_recover.png",
    frameW: 320,
    frameH: 360,
    count: 3,
    image: null,
  },
  shieldBreak: {
    src: "assets/sprites/enemies/brute/brute_shield_break.png",
    frameW: 320,
    frameH: 360,
    count: 4,
    image: null,
  },
  brokenAdvance: {
    src: "assets/sprites/enemies/brute/brute_broken_advance.png",
    frameW: 320,
    frameH: 360,
    count: 6,
    image: null,
  },
  cleave: {
    src: "assets/sprites/enemies/brute/brute_cleave.png",
    frameW: 320,
    frameH: 360,
    count: 5,
    image: null,
  },
  brokenRecover: {
    src: "assets/sprites/enemies/brute/brute_broken_recover.png",
    frameW: 320,
    frameH: 360,
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

export const GLIDER_SHEET_INDEX = 7;

const GLIDER_DIVE_SHEET: SpriteSheet = {
  src: "assets/sprites/enemies/glider/glider_dive.png",
  frameW: 360,
  frameH: 240,
  count: 5,
  image: null,
};

export const GLIDER_SHEETS: Record<GliderPhase, SpriteSheet> = {
  hover: ENEMY_SHEETS[GLIDER_SHEET_INDEX],
  windup: {
    src: "assets/sprites/enemies/glider/glider_windup.png",
    frameW: 360,
    frameH: 240,
    count: 4,
    image: null,
  },
  dive: GLIDER_DIVE_SHEET,
  pass: GLIDER_DIVE_SHEET,
  recover: {
    src: "assets/sprites/enemies/glider/glider_recover.png",
    frameW: 360,
    frameH: 240,
    count: 3,
    image: null,
  },
};

export const LEAPER_SHEET_INDEX = 8;
export const LEAPER_UNLOCK_SECONDS = 35;

export const LEAPER_SHEETS: Record<LeaperPhase, SpriteSheet> = {
  stalk: ENEMY_SHEETS[LEAPER_SHEET_INDEX],
  windup: {
    src: "assets/sprites/enemies/leaper/leaper_windup.png",
    frameW: 320,
    frameH: 320,
    count: 4,
    image: null,
  },
  leap: {
    src: "assets/sprites/enemies/leaper/leaper_leap.png",
    frameW: 320,
    frameH: 320,
    count: 5,
    image: null,
  },
  impact: {
    src: "assets/sprites/enemies/leaper/leaper_impact.png",
    frameW: 320,
    frameH: 320,
    count: 4,
    image: null,
  },
  recover: {
    src: "assets/sprites/enemies/leaper/leaper_recover.png",
    frameW: 320,
    frameH: 320,
    count: 3,
    image: null,
  },
};

export const SPLITTER_SHEET_INDEX = 9;
export const SPLITTER_UNLOCK_SECONDS = 90;

export const SPLITTER_SHEETS: Record<SplitterPhase | "splitlingMove", SpriteSheet> = {
  move: ENEMY_SHEETS[SPLITTER_SHEET_INDEX],
  hit: {
    src: "assets/sprites/enemies/splitter/splitter_hit.png",
    frameW: 288,
    frameH: 320,
    count: 3,
    image: null,
  },
  split: {
    src: "assets/sprites/enemies/splitter/splitter_split.png",
    frameW: 288,
    frameH: 320,
    count: 6,
    image: null,
  },
  birth: {
    src: "assets/sprites/enemies/splitter/splitling_birth.png",
    frameW: 240,
    frameH: 240,
    count: 6,
    image: null,
  },
  splitlingMove: {
    src: "assets/sprites/enemies/splitter/splitling_move.png",
    frameW: 240,
    frameH: 240,
    count: 6,
    image: null,
  },
};

export const WARDEN_SHEET_INDEX = 10;
export const WARDEN_UNLOCK_SECONDS = 120;

export const WARDEN_SHEETS: Record<WardenPhase, SpriteSheet> = {
  move: ENEMY_SHEETS[WARDEN_SHEET_INDEX],
  aura: {
    src: "assets/sprites/enemies/warden/warden_aura.png",
    frameW: 320,
    frameH: 360,
    count: 4,
    image: null,
  },
  hit: {
    src: "assets/sprites/enemies/warden/warden_hit.png",
    frameW: 320,
    frameH: 360,
    count: 3,
    image: null,
  },
};

export const WARDEN_AURA_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/enemies/warden/warden_aura_effect.png",
  frameW: 240,
  frameH: 120,
  count: 8,
  image: null,
};

export const BURROWER_SHEET_INDEX = 11;
export const BURROWER_UNLOCK_SECONDS = 90;

export const BURROWER_SHEETS: Record<BurrowerPhase, SpriteSheet> = {
  move: ENEMY_SHEETS[BURROWER_SHEET_INDEX],
  sink: {
    src: "assets/sprites/enemies/burrower/burrower_sink.png",
    frameW: 314,
    frameH: 180,
    count: 4,
    image: null,
  },
  burrow: {
    src: "assets/sprites/enemies/burrower/burrower_burrow.png",
    frameW: 314,
    frameH: 180,
    count: 6,
    image: null,
  },
  emerge: {
    src: "assets/sprites/enemies/burrower/burrower_emerge.png",
    frameW: 314,
    frameH: 180,
    count: 5,
    image: null,
  },
  recover: {
    src: "assets/sprites/enemies/burrower/burrower_recover.png",
    frameW: 314,
    frameH: 180,
    count: 3,
    image: null,
  },
};

export const ENEMY_REF_DRAW_W = 120;
export const ENEMY_DRAW_SCALE = ENEMY_REF_DRAW_W / ENEMY_SHEETS[1].frameW;

export const SKILL1_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/skill1/effect.png",
  frameW: 480,
  frameH: 160,
  count: 5,
  image: null,
};

export const SKILL1_EFFECT_CONFIG = {
  // draw scale relative to frame height
  drawScale: 0.625,
  // horizontal speed in px/frame
  speed: 8,
  // frame animate speed in game-frames per anim-frame
  frameDuration: 5,
  // last N frames to loop once the initial run ends
  loopFromFrame: 1,
  // damage multiplier relative to player base+bonus attack
  damageMultiplier: 1.2,
  // frames between successive hits on the same target
  hitCooldown: 20,
} as const;

export const SKILL2_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/skill2/effect.png",
  frameW: 540,
  frameH: 420,
  count: 6,
  image: null,
};

export const SKILL2_EFFECT_CONFIG = {
  drawScale: 0.667,
  groundBaselineY: 365,
  speed: 6,
  frameDuration: 4,
  // 3-5 character widths (player w=34), using 4 widths ≈ 136px
  maxTravel: 140,
  damageMultiplier: 1.5,
  hitCooldown: 20,
} as const;

export const SKILL3_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/skill3/effect.png",
  frameW: 420,
  frameH: 320,
  count: 6,
  image: null,
};

export const SKILL3_EFFECT_CONFIG = {
  drawScale: 0.72,
  centerYOffset: 72,
  frameDuration: 6,
  startupFrames: 36,
  barrierFlashFrames: 18,
  barrierFrameDuration: 3,
  barrierDrawScale: 0.58,
  barrierCenterYOffset: 62,
  barrierAlphaMin: 0.35,
  barrierAlphaMax: 0.82,
  rippleWidth: 76,
  rippleHeight: 14,
  ripplePulseSpeed: 0.16,
  ripplePulseWidth: 10,
  ripplePulseHeight: 3,
  rippleYOffset: 4,
  rippleAlphaMin: 0.22,
  rippleAlphaRange: 0.3,
  rippleInnerAlphaScale: 0.66,
  rippleInnerWidthScale: 0.31,
  rippleInnerHeightScale: 0.28,
  maxHits: 3,
  damageMultiplier: 2,
} as const;

export const PLAYER_SKILL_EFFECT_SHEETS: Partial<Record<SkillId, SpriteSheet>> = {
  [SKILL_IDS.dashReposition]: {
    src: "assets/sprites/skills/dash_reposition/effect.png",
    frameW: 360,
    frameH: 120,
    count: 4,
    image: null,
  },
  [SKILL_IDS.vortexControl]: {
    src: "assets/sprites/skills/vortex_control/effect.png",
    frameW: 256,
    frameH: 160,
    count: 6,
    image: null,
  },
  [SKILL_IDS.armorBreak]: {
    src: "assets/sprites/skills/armor_break/effect.png",
    frameW: 220,
    frameH: 160,
    count: 4,
    image: null,
  },
  [SKILL_IDS.antiAirMulti]: {
    src: "assets/sprites/skills/anti_air_multi/effect.png",
    frameW: 360,
    frameH: 320,
    count: 4,
    image: null,
  },
  [SKILL_IDS.returningBlade]: {
    src: "assets/sprites/skills/returning_blade/effect.png",
    frameW: 240,
    frameH: 120,
    count: 4,
    image: null,
  },
  [SKILL_IDS.verticalWave]: {
    src: "assets/sprites/skills/vertical_wave/effect.png",
    frameW: 420,
    frameH: 320,
    count: 7,
    image: null,
  },
};

export const ULTIMATE_SKILL_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/ultimate_skill/skill.png",
  frameW: 400,
  frameH: 496,
  count: 6,
  image: null,
};

export const ULTIMATE_SKILL_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/ultimate_skill/effect.png",
  frameW: 480,
  frameH: 360,
  count: 8,
  image: null,
};

export const BOSS_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/spider-string/boss.png",
  frameW: 350,
  frameH: 419,
  count: 4,
  image: null,
};

export const BOSS_SKILL1_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/spider-string/boss_skill1.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const BOSS_SKILL1_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/spider-string/boss_skill1_effect.png",
  frameW: 400,
  frameH: 350,
  count: 6,
  image: null,
};

export const DEAD_BELL_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/dead_bell/dead_bell.png",
  frameW: 350,
  frameH: 419,
  count: 4,
  image: null,
};

export const DEAD_BELL_CAST_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/dead_bell/dead_bell_cast.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const DEAD_BELL_WAVE_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/dead_bell/dead_bell_wave.png",
  frameW: 400,
  frameH: 350,
  count: 6,
  image: null,
};

export const DEAD_BELL_BLADE_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/dead_bell/dead_bell_blade.png",
  frameW: 420,
  frameH: 180,
  count: 6,
  image: null,
};

export const LANTERN_EMBER_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/lantern-ember/lantern_ember_move.png",
  frameW: 350,
  frameH: 419,
  count: 4,
  image: null,
};

export const LANTERN_EMBER_SUMMON_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/lantern-ember/lantern_ember_summon.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const LANTERN_EMBER_FIRELINE_CAST_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/lantern-ember/lantern_ember_fireline_cast.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const LANTERN_EMBER_BUFF_CAST_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/lantern-ember/lantern_ember_buff_cast.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const LANTERN_EMBER_DEATH_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/lantern-ember/lantern_ember_death.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const LANTERN_EMBER_LURE_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/lantern-ember/lantern_ember_lure_effect.png",
  frameW: 400,
  frameH: 350,
  count: 6,
  image: null,
};

export const LANTERN_EMBER_FIRELINE_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/lantern-ember/lantern_ember_fireline.png",
  frameW: 480,
  frameH: 120,
  count: 8,
  image: null,
};

export const LANTERN_EMBER_BUFF_TETHER_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/lantern-ember/lantern_ember_buff_tether.png",
  frameW: 400,
  frameH: 350,
  count: 6,
  image: null,
};

export const LANTERN_EMBER_AWAKENED_GRID_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/lantern-ember/lantern_ember_awakened_grid.png",
  frameW: 480,
  frameH: 180,
  count: 8,
  image: null,
};

export const LANTERN_EMBER_ASH_ZONE_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/lantern-ember/lantern_ember_ash_zone.png",
  frameW: 360,
  frameH: 140,
  count: 8,
  image: null,
};

export const MIRROR_DREAM_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/mirror-dream/mirror_dream.png",
  frameW: 350,
  frameH: 419,
  count: 4,
  image: null,
};

export const MIRROR_DREAM_CAST_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/mirror-dream/mirror_dream_cast.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const MIRROR_SHARD_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/mirror-dream/mirror_shard.png",
  frameW: 400,
  frameH: 350,
  count: 6,
  image: null,
};

export const MIRROR_AFTERIMAGE_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/mirror-dream/mirror_afterimage.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const MIRROR_NIGHTMARE_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/mirror-dream/mirror_nightmare.png",
  frameW: 400,
  frameH: 350,
  count: 6,
  image: null,
};

export const BLOOD_MOON_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon.png",
  frameW: 350,
  frameH: 419,
  count: 4,
  image: null,
};

export const BLOOD_MOON_PHASE_SHIFT_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_phase_shift.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const BLOOD_MOON_RECOVER_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_recover.png",
  frameW: 400,
  frameH: 400,
  count: 3,
  image: null,
};

export const BLOOD_MOON_DEATH_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_death.png",
  frameW: 400,
  frameH: 419,
  count: 6,
  image: null,
};

export const BLOOD_MOON_SPIDER_MIST_CAST_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_spider_mist_cast.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const BLOOD_MOON_MIRROR_FANG_CAST_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_mirror_fang_cast.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const BLOOD_MOON_LANTERN_BELL_CAST_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_lantern_bell_cast.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const BLOOD_MOON_SIXFOLD_CAST_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_sixfold_cast.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const BLOOD_MOON_MANY_FACES_CAST_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_many_faces_cast.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const BLOOD_MOON_SPIDER_MIST_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_spider_mist_effect.png",
  frameW: 420,
  frameH: 220,
  count: 8,
  image: null,
};

export const BLOOD_MOON_MIRROR_FANG_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_mirror_fang_effect.png",
  frameW: 480,
  frameH: 260,
  count: 6,
  image: null,
};

export const BLOOD_MOON_LANTERN_BELL_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_lantern_bell_effect.png",
  frameW: 420,
  frameH: 350,
  count: 8,
  image: null,
};

export const BLOOD_MOON_SIXFOLD_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_sixfold_effect.png",
  frameW: 420,
  frameH: 350,
  count: 8,
  image: null,
};

export const BLOOD_MOON_MANY_FACES_EFFECT_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/blood-moon-many-faces/blood_moon_many_faces_effect.png",
  frameW: 480,
  frameH: 420,
  count: 12,
  image: null,
};

export const BLOOD_MOON_CONFIG = {
  castDuration: 72,
  finalCastDuration: 92,
  spawnAtFrame: 34,
  finalSpawnAtFrame: 42,
  castFrameDuration: 9,
  phaseShiftFrames: 42,
  phaseShiftFrameDuration: 7,
  recoveryFrames: 48,
  finalRecoveryFrames: 104,
  recoverFrameDuration: 8,
  initialCooldown: 124,
  skillCooldown: 204,
  finalSkillCooldown: 286,
  drawW: 188,
  drawH: 224,
  castDrawW: 236,
  castDrawH: 236,
  castBottomPadding: 26,
  moveSteeringForce: 0.046,
  phaseSteeringForce: 0.01,
  retreatForce: 0.058,
  drag: 0.91,
  maxVelocityBase: 2.45,
  maxVelocityPhase: 0.24,
  preferredDistance: 190,
  closeDistance: 130,
  summonMaxEnemies: 4,
  spiderMistWarningFrames: 30,
  spiderMistLife: 92,
  spiderMistFrameDuration: 7,
  spiderMistDrawW: 260,
  spiderMistDrawH: 136,
  spiderMistHitW: 190,
  spiderMistHitH: 44,
  spiderMistDamageBase: 9,
  mirrorFangWarningFrames: 22,
  mirrorFangLife: 86,
  mirrorFangFrameDuration: 6,
  mirrorFangDrawW: 250,
  mirrorFangDrawH: 136,
  mirrorFangHitW: 210,
  mirrorFangHitH: 38,
  mirrorFangSpeed: 8.6,
  mirrorFangDamageBase: 10,
  lanternBellLife: 72,
  lanternBellFrameDuration: 7,
  lanternBellDrawW: 240,
  lanternBellDrawH: 200,
  sixfoldLife: 88,
  sixfoldFrameDuration: 7,
  sixfoldDrawW: 250,
  sixfoldDrawH: 208,
  manyFacesDelayFrames: 42,
  manyFacesWarningFrames: 44,
  manyFacesLife: 142,
  manyFacesFrameDuration: 5,
  manyFacesDrawW: 300,
  manyFacesDrawH: 260,
  manyFacesHitW: 220,
  manyFacesHitH: 140,
  manyFacesDamageBase: 13,
  damagePhase: 2,
  hitPlayerCooldown: 24,
} as const;

export const DEAD_BELL_CONFIG = {
  castDuration: 64,
  comboCastDuration: 86,
  spawnAtFrame: 30,
  comboSpawnAtFrame: 34,
  castFrameDuration: 9,
  drawW: 228,
  drawH: 228,
  drawBottomPadding: 26,
  waveDrawYOffset: 70,
  waveWarningFrames: 24,
  waveExpandFrames: 76,
  waveFrameDuration: 10,
  waveStartRadius: 54,
  waveMaxRadius: 390,
  waveThickness: 34,
  delayedWaveFrames: 34,
  bladeWarningFrames: 20,
  bladeFrameDuration: 6,
  bladeDrawW: 270,
  bladeDrawH: 116,
  bladeHitW: 238,
  bladeHitH: 34,
  bladeSpeed: 7.4,
  bladeLife: 120,
  bladeYOffset: 58,
  upperBladeY: 330,
  lowerBladeY: 424,
  damageBase: 11,
  damagePhase: 3,
  skillCooldown: 238,
  comboCooldown: 288,
  initialCooldown: 120,
  recoveryFrames: 46,
} as const;

export const LANTERN_EMBER_CONFIG = {
  castDuration: 62,
  awakenedCastDuration: 76,
  spawnAtFrame: 30,
  awakenedSpawnAtFrame: 36,
  castFrameDuration: 9,
  initialCooldown: 126,
  summonCooldown: 212,
  firelineCooldown: 196,
  buffCooldown: 232,
  awakenedCooldown: 268,
  recoveryFrames: 34,
  drawW: 176,
  drawH: 208,
  castDrawW: 228,
  castDrawH: 228,
  castBottomPadding: 26,
  moveSteeringForce: 0.035,
  phaseSteeringForce: 0.01,
  drag: 0.92,
  maxVelocityBase: 2.05,
  maxVelocityPhase: 0.24,
  summonExtraEnemyPhase: 2,
  summonMaxEnemies: 2,
  lureFrameDuration: 6,
  lureLife: 42,
  lureDrawW: 180,
  lureDrawH: 158,
  lureSpeed: 1.8,
  lureYOffset: 58,
  firelineWarningFrames: 24,
  firelineLife: 104,
  firelineFrameDuration: 7,
  firelineHitW: 260,
  firelinePhaseW: 38,
  firelineHitH: 34,
  firelineDrawH: 84,
  firelineYOffset: 6,
  firelineDamageBase: 10,
  firelineDamagePhase: 3,
  buffRadius: 260,
  buffMaxTargets: 3,
  buffFrames: 300,
  buffSpeedExtraScale: 0.35,
  buffDamageScale: 1.25,
  buffTetherFrameDuration: 5,
  buffTetherLife: 32,
  buffTetherDrawW: 180,
  buffTetherDrawH: 158,
  awakenedGridWarningFrames: 28,
  awakenedGridLife: 124,
  awakenedGridFrameDuration: 6,
  awakenedGridDrawW: 1080,
  awakenedGridDrawH: 135,
  awakenedGridSpeed: 1.18,
  awakenedGridPeriod: 148,
  awakenedGridDangerW: 72,
  awakenedGridHitH: 56,
  awakenedGridDamageBase: 8,
  awakenedGridDamagePhase: 2,
  awakenedGridHitCooldown: 32,
  ashZoneLife: 160,
  ashZoneRadius: 112,
  ashZoneVerticalRadiusScale: 0.52,
  ashZoneMoveScale: 0.62,
  ashZoneFrameDuration: 8,
  ashZoneLoopStartFrame: 2,
  ashZoneDrawWidthScale: 2.42,
  ashZoneDamageFirstFrame: 34,
  ashZoneDamageIntervalFrames: 44,
  ashZoneDamageBase: 2,
  ashZoneDamagePhase: 1,
  ashZoneDamageInvincibleFrames: 10,
} as const;

export const MIRROR_DREAM_CONFIG = {
  castDuration: 62,
  spawnAtFrame: 30,
  castFrameDuration: 9,
  drawW: 176,
  drawH: 208,
  castDrawW: 228,
  castDrawH: 228,
  castBottomPadding: 26,
  preferredDistance: 210,
  closeDistance: 138,
  steeringForce: 0.052,
  retreatForce: 0.074,
  drag: 0.9,
  maxVelocity: 3.4,
  skillCooldown: 218,
  initialCooldown: 112,
  recoveryFrames: 32,
  shardSpeed: 7.2,
  shardLife: 150,
  shardDrawW: 116,
  shardDrawH: 102,
  shardHitW: 50,
  shardHitH: 28,
  shardFrameDuration: 6,
  nightmareSpeed: 5.8,
  nightmareLife: 104,
  nightmareDrawW: 164,
  nightmareDrawH: 144,
  nightmareHitW: 70,
  nightmareHitH: 36,
  nightmareFrameDuration: 7,
  afterimageDrawW: 220,
  afterimageDrawH: 220,
  afterimageBottomPadding: 22,
  afterimageFrameDuration: 8,
  afterimageLife: 76,
  afterimageAlpha: 0.66,
  teleportPlayerOffset: 148,
  teleportAwayOffset: 236,
  nightmareBaseImages: 2,
  nightmareMaxImages: 4,
  nightmareSpacing: 122,
  nightmareFirstBreakFrame: 20,
  nightmareBreakDelay: 18,
  nightmareBreakFadeFrames: 28,
  damageBase: 10,
  damagePhase: 2,
} as const;

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
