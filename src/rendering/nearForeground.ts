import { state } from "../game/state";
import { ctx } from "./context";
import {
  GROUND_Y,
  NEAR_FOREGROUND_SCROLL_SPEED,
  WIDTH,
  TREE_SPRITES,
  STONE_TOWER_SPRITES,
  STONE_TOWER_SMALL_SPRITES,
  TORII_SPRITES,
  FOREGROUND_SPRITES,
  ACT_OCCLUDER_BOTTOM_GUTTER,
  ACT_OCCLUDER_SPRITES,
  type ActOccluderKind,
} from "../constants";
import { bossApproachGroundTransitionSeconds } from "../systems/runProgression";
import type { EnemySpawnOccluderState, EnemySpawnOccluderSource } from "../types/game-state";
import { drawActLandmarks } from "./actLandmarks";

const NEAR_FOREGROUND_PATTERN_WIDTH = 2688;
const TREE_COUNT = 24;
const TREE_VARIANT_SEED_STEP = 7;
const TREE_VARIANT_SEED_OFFSET = 3;
const TREE_BASE_X_STEP = 112;
const TREE_BASE_X_GROUP_MOD = 3;
const TREE_BASE_X_GROUP_CENTER = 1;
const TREE_BASE_X_GROUP_OFFSET = 28;
const TREE_BOTTOM_OFFSET_BASE = 9;
const TREE_BOTTOM_OFFSET_MOD = 2;
const TREE_BOTTOM_OFFSET_STEP = 6;
const TREE_DRAW_H_BASE = 150;
const TREE_DRAW_H_MOD = 6;
const TREE_DRAW_H_STEP = 22;
const TREE_ALPHA_BASE = 0.86;
const TREE_ALPHA_MOD = 4;
const TREE_ALPHA_STEP = 0.035;
const BOSS_PRELUDE_TORII_VARIANT_SEED = 10;
const BOSS_PRELUDE_TORII_BASE_DRAW_H = 142;
const BOSS_PRELUDE_TORII_SCALE = 2;
export const BOSS_PRELUDE_TORII_DRAW_H = BOSS_PRELUDE_TORII_BASE_DRAW_H * BOSS_PRELUDE_TORII_SCALE;
const BOSS_PRELUDE_TORII_BOTTOM_OFFSET = 8;
const BOSS_PRELUDE_TORII_ALPHA = 1;
const BOSS_PRELUDE_TORII_START_PADDING = 48;
const BOSS_PRELUDE_TORII_EXIT_PADDING = 48;
const NEAR_FOREGROUND_PASS_MIN = -1;
const NEAR_FOREGROUND_PASS_MAX = 1;

const ACT_OCCLUDER_PLACEMENTS: Array<{
  kind: ActOccluderKind;
  baseX: number;
  bottomOffset: number;
}> = [
  { kind: "themed", baseX: 360, bottomOffset: 10 },
  { kind: "generic", baseX: 1325, bottomOffset: 11 },
  { kind: "themed", baseX: 2260, bottomOffset: 9 },
];

const TREE_LINE = Array.from({ length: TREE_COUNT }, (_, i) => ({
  variantSeed: i * TREE_VARIANT_SEED_STEP + TREE_VARIANT_SEED_OFFSET,
  baseX: i * TREE_BASE_X_STEP + ((i % TREE_BASE_X_GROUP_MOD) - TREE_BASE_X_GROUP_CENTER) * TREE_BASE_X_GROUP_OFFSET,
  bottomOffset: TREE_BOTTOM_OFFSET_BASE + (i % TREE_BOTTOM_OFFSET_MOD) * TREE_BOTTOM_OFFSET_STEP,
  drawH: TREE_DRAW_H_BASE + (i % TREE_DRAW_H_MOD) * TREE_DRAW_H_STEP,
  alpha: TREE_ALPHA_BASE + (i % TREE_ALPHA_MOD) * TREE_ALPHA_STEP,
}));

const FOREGROUND_DECOR: Array<{
  variantSeed: number;
  baseX: number;
  bottomOffset: number;
  drawH: number;
  alpha: number;
}> = [
  { variantSeed: 0, baseX: 80, bottomOffset: 9, drawH: 56, alpha: 0.72 },
  { variantSeed: 3, baseX: 335, bottomOffset: 11, drawH: 42, alpha: 0.7 },
  { variantSeed: 5, baseX: 620, bottomOffset: 10, drawH: 58, alpha: 0.72 },
  { variantSeed: 8, baseX: 875, bottomOffset: 12, drawH: 48, alpha: 0.68 },
  { variantSeed: 11, baseX: 1140, bottomOffset: 9, drawH: 52, alpha: 0.7 },
  { variantSeed: 2, baseX: 1395, bottomOffset: 11, drawH: 46, alpha: 0.68 },
  { variantSeed: 6, baseX: 1660, bottomOffset: 9, drawH: 60, alpha: 0.72 },
  { variantSeed: 9, baseX: 1915, bottomOffset: 12, drawH: 50, alpha: 0.68 },
  { variantSeed: 4, baseX: 2185, bottomOffset: 10, drawH: 54, alpha: 0.7 },
  { variantSeed: 10, baseX: 2465, bottomOffset: 11, drawH: 44, alpha: 0.68 },
];

type ForegroundPropSheet = "stoneTower" | "stoneTowerSmall";

const FOREGROUND_PROPS: Array<{
  sheet: ForegroundPropSheet;
  variantSeed: number;
  baseX: number;
  bottomOffset: number;
  drawH: number;
  alpha: number;
}> = [
  { sheet: "stoneTowerSmall", variantSeed: 2, baseX: 180, bottomOffset: 12, drawH: 92, alpha: 0.84 },
  { sheet: "stoneTower", variantSeed: 8, baseX: 690, bottomOffset: 14, drawH: 108, alpha: 0.86 },
  { sheet: "stoneTowerSmall", variantSeed: 6, baseX: 920, bottomOffset: 12, drawH: 98, alpha: 0.82 },
  { sheet: "stoneTower", variantSeed: 3, baseX: 1480, bottomOffset: 14, drawH: 118, alpha: 0.84 },
  { sheet: "stoneTowerSmall", variantSeed: 1, baseX: 1710, bottomOffset: 12, drawH: 88, alpha: 0.8 },
  { sheet: "stoneTower", variantSeed: 11, baseX: 2210, bottomOffset: 13, drawH: 112, alpha: 0.84 },
  { sheet: "stoneTowerSmall", variantSeed: 4, baseX: 2440, bottomOffset: 12, drawH: 94, alpha: 0.8 },
];

export type BossPreludeToriiPlacement = {
  variantIndex: number;
  x: number;
  y: number;
  drawW: number;
  drawH: number;
  alpha: number;
};

export type NearForegroundOccluder = EnemySpawnOccluderState;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function resolveBossPreludeToriiPlacement(input: {
  bossPreludeElapsed: number | null;
  act: number;
}): BossPreludeToriiPlacement | null {
  if (input.bossPreludeElapsed === null || TORII_SPRITES.variants.length === 0) return null;

  const variantIndex = BOSS_PRELUDE_TORII_VARIANT_SEED % TORII_SPRITES.variants.length;
  const region = TORII_SPRITES.variants[variantIndex];
  const drawH = BOSS_PRELUDE_TORII_DRAW_H;
  const drawW = drawH * (region.sw / region.sh);
  const transitionSeconds = bossApproachGroundTransitionSeconds(input.act);
  const progress = transitionSeconds > 0 ? clamp01(input.bossPreludeElapsed / transitionSeconds) : 1;
  const travelDistance = WIDTH + drawW + BOSS_PRELUDE_TORII_START_PADDING + BOSS_PRELUDE_TORII_EXIT_PADDING;

  return {
    variantIndex,
    x: WIDTH + BOSS_PRELUDE_TORII_START_PADDING - travelDistance * progress,
    y: GROUND_Y + BOSS_PRELUDE_TORII_BOTTOM_OFFSET - drawH,
    drawW,
    drawH,
    alpha: BOSS_PRELUDE_TORII_ALPHA,
  };
}

function drawRegion(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  region: { sx: number; sy: number; sw: number; sh: number },
  x: number,
  y: number,
  drawH: number,
  alpha: number,
) {
  const drawW = drawH * (region.sw / region.sh);

  context.save();
  context.globalAlpha = alpha;
  context.drawImage(image, region.sx, region.sy, region.sw, region.sh, x, y, drawW, drawH);
  context.restore();
}

function nearForegroundOffset(elapsed: number) {
  const scroll = elapsed * NEAR_FOREGROUND_SCROLL_SPEED;
  return ((scroll % NEAR_FOREGROUND_PATTERN_WIDTH) + NEAR_FOREGROUND_PATTERN_WIDTH) % NEAR_FOREGROUND_PATTERN_WIDTH;
}

function treeDrawHeight(preferredDrawH: number, region: { sh: number }) {
  // Tree frames vary in size; upscaling the smaller frames makes their details blurry.
  return Math.min(preferredDrawH, region.sh);
}

function pushOccluder(
  occluders: NearForegroundOccluder[],
  source: EnemySpawnOccluderSource,
  region: { sw: number; sh: number },
  variantIndex: number,
  x: number,
  y: number,
  drawH: number,
  alpha: number,
  sheetIndex?: number,
) {
  occluders.push({
    source,
    sheetIndex,
    variantIndex,
    x,
    y,
    drawW: drawH * (region.sw / region.sh),
    drawH,
    alpha,
  });
}

function pushTreeOccluders(occluders: NearForegroundOccluder[], pass: number, offset: number) {
  const variants = TREE_SPRITES.sheets.flatMap((sheet, sheetIndex) =>
    sheet.variants.map((region, variantIndex) => ({ sheetIndex, variantIndex, region })),
  );
  if (variants.length === 0) return;

  for (const tree of TREE_LINE) {
    const entry = variants[tree.variantSeed % variants.length];
    const drawH = treeDrawHeight(tree.drawH, entry.region);
    const x = tree.baseX + pass * NEAR_FOREGROUND_PATTERN_WIDTH - offset;
    const y = GROUND_Y + tree.bottomOffset - drawH;
    pushOccluder(
      occluders,
      "tree",
      entry.region,
      entry.variantIndex,
      x,
      y,
      drawH,
      tree.alpha,
      entry.sheetIndex,
    );
  }
}

function pushActPropOccluders(
  occluders: NearForegroundOccluder[],
  act: number,
  pass: number,
  offset: number,
) {
  const entries = ACT_OCCLUDER_SPRITES.map((sprite, sheetIndex) => ({ sprite, sheetIndex }));

  for (const placement of ACT_OCCLUDER_PLACEMENTS) {
    const entry = entries.find(({ sprite }) => (
      sprite.kind === placement.kind && sprite.acts.includes(act)
    ));
    if (!entry) continue;

    const { sprite, sheetIndex } = entry;
    const x = placement.baseX + pass * NEAR_FOREGROUND_PATTERN_WIDTH - offset;
    const bottomGutterDrawH = sprite.drawH * ACT_OCCLUDER_BOTTOM_GUTTER / sprite.sourceH;
    const y = GROUND_Y + placement.bottomOffset - sprite.drawH + bottomGutterDrawH;
    pushOccluder(
      occluders,
      "actProp",
      { sw: sprite.sourceW, sh: sprite.sourceH },
      0,
      x,
      y,
      sprite.drawH,
      sprite.alpha,
      sheetIndex,
    );
  }
}

function pushDecorOccluders(occluders: NearForegroundOccluder[], pass: number, offset: number) {
  if (FOREGROUND_SPRITES.decor.length === 0) return;

  for (const decor of FOREGROUND_DECOR) {
    const variantIndex = decor.variantSeed % FOREGROUND_SPRITES.decor.length;
    const region = FOREGROUND_SPRITES.decor[variantIndex];
    const x = decor.baseX + pass * NEAR_FOREGROUND_PATTERN_WIDTH - offset;
    const y = GROUND_Y + decor.bottomOffset - decor.drawH;
    pushOccluder(occluders, "decor", region, variantIndex, x, y, decor.drawH, decor.alpha);
  }
}

function pushPropOccluders(occluders: NearForegroundOccluder[], pass: number, offset: number) {
  const propSheets = {
    stoneTower: STONE_TOWER_SPRITES,
    stoneTowerSmall: STONE_TOWER_SMALL_SPRITES,
  };

  for (const prop of FOREGROUND_PROPS) {
    const sheet = propSheets[prop.sheet];
    if (sheet.variants.length === 0) continue;

    const variantIndex = prop.variantSeed % sheet.variants.length;
    const region = sheet.variants[variantIndex];
    const x = prop.baseX + pass * NEAR_FOREGROUND_PATTERN_WIDTH - offset;
    const y = GROUND_Y + prop.bottomOffset - prop.drawH;
    pushOccluder(occluders, prop.sheet, region, variantIndex, x, y, prop.drawH, prop.alpha);
  }
}

export function resolveNearForegroundOccluders(input: {
  elapsed: number;
  bossPreludeElapsed: number | null;
  act: number;
}): NearForegroundOccluder[] {
  const offset = nearForegroundOffset(input.elapsed);
  const occluders: NearForegroundOccluder[] = [];

  for (let pass = NEAR_FOREGROUND_PASS_MIN; pass <= NEAR_FOREGROUND_PASS_MAX; pass += 1) {
    pushTreeOccluders(occluders, pass, offset);
  }
  for (let pass = NEAR_FOREGROUND_PASS_MIN; pass <= NEAR_FOREGROUND_PASS_MAX; pass += 1) {
    pushActPropOccluders(occluders, input.act, pass, offset);
  }
  for (let pass = NEAR_FOREGROUND_PASS_MIN; pass <= NEAR_FOREGROUND_PASS_MAX; pass += 1) {
    pushDecorOccluders(occluders, pass, offset);
  }
  for (let pass = NEAR_FOREGROUND_PASS_MIN; pass <= NEAR_FOREGROUND_PASS_MAX; pass += 1) {
    pushPropOccluders(occluders, pass, offset);
  }

  const torii = resolveBossPreludeToriiPlacement({
    bossPreludeElapsed: input.bossPreludeElapsed,
    act: input.act,
  });
  if (torii) {
    occluders.push({
      source: "torii",
      variantIndex: torii.variantIndex,
      x: torii.x,
      y: torii.y,
      drawW: torii.drawW,
      drawH: torii.drawH,
      alpha: torii.alpha,
    });
  }

  return occluders;
}

function occluderImageAndRegion(occluder: EnemySpawnOccluderState) {
  if (occluder.source === "tree") {
    const sheet = TREE_SPRITES.sheets[occluder.sheetIndex ?? 0];
    return { image: sheet?.image ?? null, region: sheet?.variants[occluder.variantIndex] };
  }
  if (occluder.source === "decor") {
    return {
      image: FOREGROUND_SPRITES.image,
      region: FOREGROUND_SPRITES.decor[occluder.variantIndex],
    };
  }
  if (occluder.source === "stoneTower") {
    return {
      image: STONE_TOWER_SPRITES.image,
      region: STONE_TOWER_SPRITES.variants[occluder.variantIndex],
    };
  }
  if (occluder.source === "stoneTowerSmall") {
    return {
      image: STONE_TOWER_SMALL_SPRITES.image,
      region: STONE_TOWER_SMALL_SPRITES.variants[occluder.variantIndex],
    };
  }
  if (occluder.source === "actProp") {
    const sprite = ACT_OCCLUDER_SPRITES[occluder.sheetIndex ?? 0];
    return {
      image: sprite?.image ?? null,
      region: sprite && {
        sx: 0,
        sy: 0,
        sw: sprite.sourceW,
        sh: sprite.sourceH,
      },
    };
  }
  return {
    image: TORII_SPRITES.image,
    region: TORII_SPRITES.variants[occluder.variantIndex],
  };
}

function drawTrees(context: CanvasRenderingContext2D, pass: number, offset: number) {
  const variants = TREE_SPRITES.sheets.flatMap((sheet) =>
    sheet.variants.map((region) => ({ sheet, region })),
  );
  if (variants.length === 0 || TREE_SPRITES.sheets.every((sheet) => !sheet.image)) return;

  for (const tree of TREE_LINE) {
    const entry = variants[tree.variantSeed % variants.length];
    const image = entry.sheet.image;
    if (!image) continue;

    const { region } = entry;
    const drawH = treeDrawHeight(tree.drawH, region);
    const x = tree.baseX + pass * NEAR_FOREGROUND_PATTERN_WIDTH - offset;
    const y = GROUND_Y + tree.bottomOffset - drawH;

    drawRegion(context, image, region, x, y, drawH, tree.alpha);
  }
}

function drawActProps(
  context: CanvasRenderingContext2D,
  act: number,
  pass: number,
  offset: number,
) {
  const occluders: NearForegroundOccluder[] = [];
  pushActPropOccluders(occluders, act, pass, offset);

  for (const occluder of occluders) {
    const { image, region } = occluderImageAndRegion(occluder);
    if (!image || !region) continue;
    drawRegion(context, image, region, occluder.x, occluder.y, occluder.drawH, occluder.alpha);
  }
}

function drawDecor(context: CanvasRenderingContext2D, pass: number, offset: number) {
  const image = FOREGROUND_SPRITES.image;
  if (!image || FOREGROUND_SPRITES.decor.length === 0) return;

  for (const decor of FOREGROUND_DECOR) {
    const region = FOREGROUND_SPRITES.decor[decor.variantSeed % FOREGROUND_SPRITES.decor.length];
    const x = decor.baseX + pass * NEAR_FOREGROUND_PATTERN_WIDTH - offset;
    const y = GROUND_Y + decor.bottomOffset - decor.drawH;

    drawRegion(context, image, region, x, y, decor.drawH, decor.alpha);
  }
}

function drawProps(context: CanvasRenderingContext2D, pass: number, offset: number) {
  const propSheets = {
    stoneTower: STONE_TOWER_SPRITES,
    stoneTowerSmall: STONE_TOWER_SMALL_SPRITES,
  };

  for (const prop of FOREGROUND_PROPS) {
    const sheet = propSheets[prop.sheet];
    const image = sheet.image;
    if (!image || sheet.variants.length === 0) continue;

    const region = sheet.variants[prop.variantSeed % sheet.variants.length];
    const drawH = prop.drawH;
    const x = prop.baseX + pass * NEAR_FOREGROUND_PATTERN_WIDTH - offset;
    const y = GROUND_Y + prop.bottomOffset - drawH;

    drawRegion(context, image, region, x, y, drawH, prop.alpha);
  }
}

function drawBossPreludeTorii(context: CanvasRenderingContext2D) {
  const image = TORII_SPRITES.image;
  if (!image) return;

  const placement = resolveBossPreludeToriiPlacement({
    bossPreludeElapsed: state.enemyDirector.bossPrelude?.elapsed ?? null,
    act: state.enemyDirector.act,
  });
  if (!placement) return;

  const region = TORII_SPRITES.variants[placement.variantIndex];
  drawRegion(context, image, region, placement.x, placement.y, placement.drawH, placement.alpha);
}

export function drawNearForeground() {
  const context = ctx;
  if (!context) return;

  const offset = nearForegroundOffset(state.elapsed);

  for (let pass = NEAR_FOREGROUND_PASS_MIN; pass <= NEAR_FOREGROUND_PASS_MAX; pass += 1) {
    drawTrees(context, pass, offset);
  }
  for (let pass = NEAR_FOREGROUND_PASS_MIN; pass <= NEAR_FOREGROUND_PASS_MAX; pass += 1) {
    drawActProps(context, state.enemyDirector.act, pass, offset);
  }
  // Director elapsedInAct pauses during a Boss fight; the anchored world clock keeps scenery moving.
  drawActLandmarks(context, {
    act: state.enemyDirector.act,
    elapsedSinceActStart: state.elapsed - state.enemyDirector.actStartedAt,
  });
  for (let pass = NEAR_FOREGROUND_PASS_MIN; pass <= NEAR_FOREGROUND_PASS_MAX; pass += 1) {
    drawDecor(context, pass, offset);
  }
  for (let pass = NEAR_FOREGROUND_PASS_MIN; pass <= NEAR_FOREGROUND_PASS_MAX; pass += 1) {
    drawProps(context, pass, offset);
  }
  drawBossPreludeTorii(context);
}
