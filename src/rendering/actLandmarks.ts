import {
  ACT_LANDMARK_BOTTOM_GUTTER,
  ACT_LANDMARK_SOURCE_SIZE,
  ACT_LANDMARK_SPRITES,
  GROUND_Y,
  WIDTH,
} from "../constants";
import type { ActLandmarkSprite } from "../constants/assetCatalog/actLandmarks";

const LANDMARK_SCROLL_SPEED = 10;
const LANDMARK_PATTERN_WIDTH = WIDTH;
const LANDMARK_BASE_X = 128;
const LANDMARK_BOTTOM_OFFSET = 6;
const LANDMARK_PASS_MIN = -1;
const LANDMARK_PASS_MAX = 1;

export type ActLandmarkPlacement = {
  sprite: ActLandmarkSprite;
  x: number;
  y: number;
  drawW: number;
  drawH: number;
  alpha: number;
};

function landmarkOffset(elapsed: number) {
  const scroll = elapsed * LANDMARK_SCROLL_SPEED;
  return ((scroll % LANDMARK_PATTERN_WIDTH) + LANDMARK_PATTERN_WIDTH) % LANDMARK_PATTERN_WIDTH;
}

export function resolveActLandmarkPlacements(input: {
  act: number;
  elapsed: number;
}): ActLandmarkPlacement[] {
  const sprite = ACT_LANDMARK_SPRITES[input.act - 1];
  if (!sprite) return [];

  const offset = landmarkOffset(input.elapsed);
  const placements: ActLandmarkPlacement[] = [];

  for (let pass = LANDMARK_PASS_MIN; pass <= LANDMARK_PASS_MAX; pass += 1) {
    const drawH = sprite.drawH;
    const drawW = drawH;
    const x = LANDMARK_BASE_X + pass * LANDMARK_PATTERN_WIDTH - offset;
    if (x + drawW < 0 || x > WIDTH) continue;
    const bottomGutterDrawH = drawH * ACT_LANDMARK_BOTTOM_GUTTER / ACT_LANDMARK_SOURCE_SIZE;

    placements.push({
      sprite,
      x,
      // The source gutter stays transparent while the visible base remains ground-aligned.
      y: GROUND_Y + LANDMARK_BOTTOM_OFFSET - drawH + bottomGutterDrawH,
      drawW,
      drawH,
      alpha: sprite.alpha,
    });
  }

  return placements;
}

export function drawActLandmarks(
  context: CanvasRenderingContext2D,
  input: { act: number; elapsed: number },
) {
  for (const placement of resolveActLandmarkPlacements(input)) {
    const image = placement.sprite.image;
    if (!image) continue;

    context.save();
    context.globalAlpha = placement.alpha;
    context.drawImage(
      image,
      placement.x,
      placement.y,
      placement.drawW,
      placement.drawH,
    );
    context.restore();
  }
}
