import { state } from "./state";
import { ctx } from "./context";
import {
  GROUND_Y,
  TREE_SPRITES,
  STONE_TOWER_SPRITES,
  STONE_TOWER_SMALL_SPRITES,
  TORII_SPRITES,
} from "./constants";

const NEAR_FOREGROUND_SPEED = 18;
const NEAR_FOREGROUND_PATTERN_WIDTH = 1128;

const TREE_LINE = Array.from({ length: 12 }, (_, i) => ({
  variantSeed: i * 7 + 3,
  baseX: i * 122 + ((i % 3) - 1) * 22,
  bottomOffset: 9 + (i % 2) * 6,
  drawH: 150 + (i % 6) * 22,
  alpha: 0.86 + (i % 4) * 0.035,
}));

type ForegroundPropSheet = "stoneTower" | "stoneTowerSmall" | "torii";

const FOREGROUND_PROPS: Array<{
  sheet: ForegroundPropSheet;
  variantSeed: number;
  baseX: number;
  bottomOffset: number;
  drawH: number;
  alpha: number;
}> = [
  { sheet: "stoneTowerSmall", variantSeed: 2, baseX: 210, bottomOffset: 12, drawH: 108, alpha: 0.9 },
  { sheet: "torii", variantSeed: 4, baseX: 560, bottomOffset: 10, drawH: 154, alpha: 0.88 },
  { sheet: "stoneTower", variantSeed: 8, baseX: 930, bottomOffset: 13, drawH: 118, alpha: 0.9 },
];

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
    const drawH = tree.drawH;
    const x = tree.baseX + pass * NEAR_FOREGROUND_PATTERN_WIDTH - offset;
    const y = GROUND_Y + tree.bottomOffset - drawH;

    drawRegion(context, image, region, x, y, drawH, tree.alpha);
  }
}

function drawProps(context: CanvasRenderingContext2D, pass: number, offset: number) {
  const propSheets = {
    stoneTower: STONE_TOWER_SPRITES,
    stoneTowerSmall: STONE_TOWER_SMALL_SPRITES,
    torii: TORII_SPRITES,
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

export function drawNearForeground() {
  const context = ctx;
  if (!context) return;

  const scroll = state.elapsed * NEAR_FOREGROUND_SPEED;
  const offset = ((scroll % NEAR_FOREGROUND_PATTERN_WIDTH) + NEAR_FOREGROUND_PATTERN_WIDTH) % NEAR_FOREGROUND_PATTERN_WIDTH;

  for (let pass = -1; pass <= 1; pass += 1) {
    drawTrees(context, pass, offset);
  }
  for (let pass = -1; pass <= 1; pass += 1) {
    drawProps(context, pass, offset);
  }
}
