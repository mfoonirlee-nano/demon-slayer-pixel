import type { SpriteSheet } from "../../types/assets";
import type { BinderPhase, BrutePhase, BurrowerPhase, CasterPhase, CrawlerPhase, DuelistPhase, GliderPhase, LeaperPhase, RunnerPhase, SplitterPhase, WardenPhase } from "../../types/game-state";

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
