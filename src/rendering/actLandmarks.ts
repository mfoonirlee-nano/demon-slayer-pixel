import {
  ACT_LANDMARK_BOTTOM_GUTTER,
  ACT_LANDMARK_SOURCE_SIZE,
  ACT_LANDMARK_SPRITES,
  GROUND_Y,
  NEAR_FOREGROUND_SCROLL_SPEED,
  WIDTH,
} from "../constants";
import type { ActLandmarkSprite } from "../constants/assetCatalog/actLandmarks";

const LANDMARK_START_PADDING = 48;
const LANDMARK_BOTTOM_OFFSET = 6;

export type ActLandmarkPlacement = {
  sprite: ActLandmarkSprite;
  x: number;
  y: number;
  drawW: number;
  drawH: number;
  alpha: number;
};

export function resolveActLandmarkPlacements(input: {
  act: number;
  elapsedSinceActStart: number;
}): ActLandmarkPlacement[] {
  const sprite = ACT_LANDMARK_SPRITES[input.act - 1];
  if (!sprite) return [];

  const drawH = sprite.drawH;
  const drawW = drawH;
  const x = WIDTH + LANDMARK_START_PADDING - input.elapsedSinceActStart * NEAR_FOREGROUND_SCROLL_SPEED;
  if (x + drawW <= 0 || x >= WIDTH) return [];
  const bottomGutterDrawH = drawH * ACT_LANDMARK_BOTTOM_GUTTER / ACT_LANDMARK_SOURCE_SIZE;

  return [{
    sprite,
    x,
    // The source gutter stays transparent while the visible base remains ground-aligned.
    y: GROUND_Y + LANDMARK_BOTTOM_OFFSET - drawH + bottomGutterDrawH,
    drawW,
    drawH,
    alpha: sprite.alpha,
  }];
}

export function drawActLandmarks(
  context: CanvasRenderingContext2D,
  input: { act: number; elapsedSinceActStart: number },
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
