import { state } from "../game/state";
import { ctx } from "./context";
import {
  WIDTH,
  HEIGHT,
  GROUND_Y,
  STAR_SPRITES,
  MOUNTAIN_SPRITES,
  GROUND_TILE_SPRITES,
} from "../constants";
import { drawMoon, getMoonSkyColors } from "../moon";
import { drawClouds } from "./clouds";
import { resolveGroundTileRenderPlan } from "./groundTiles";
import { isSkyElementVisible, resolveStarVisibility } from "./skyVisibility";

// Three-plane parallax speeds (pixels per second of elapsed time). Each plane
// scrolls at a different rate so the scene has a true sense of depth.
const PARALLAX_SPEED = {
  background: 4,    // sky elements + far mountain ridge (slowest)
  midground: 12,    // mid/near mountains
};
const STAR_COUNT = 9;
const STAR_X_STEP = 137;
const STAR_X_GROUP_MOD = 5;
const STAR_X_GROUP_OFFSET = 43;
const STAR_Y_TOP = 18;
const STAR_Y_ROW_MOD = 7;
const STAR_Y_ROW_GAP = 28;
const STAR_SCALE_BASE = 0.18;
const STAR_SCALE_STEP_MOD = 4;
const STAR_SCALE_STEP = 0.09;
const STAR_SCALE_RATIO = 0.6666666666666666;
const STAR_TWINKLE_OFFSET_STEP = 11;
const STAR_TWINKLE_OFFSET_MOD = 24;
const SKY_TOP_BAND_HEIGHT = 170;
const SKY_MID_BAND_HEIGHT = 120;
const SKY_LOW_BAND_Y = 290;
const SKY_UPPER_OVERLAY_HEIGHT = 220;
const SKY_MID_OVERLAY_Y = 110;
const SKY_MID_OVERLAY_HEIGHT = 180;
const STAR_TWINKLE_BASE = 0.5;
const STAR_TWINKLE_AMPLITUDE = 0.5;
const STAR_TWINKLE_SPEED = 2.8;
const MIN_VISIBLE_STAR_SIZE = 0.5;
const STAR_ALPHA_SCALE = 0.82;
const STAR_VARIANT_COUNT = STAR_SPRITES.variants.length;

// Mountain sub-parallax: each variant is placed on one of the three planes.
// `plane` picks the scroll speed; `depthMul` lets us further stagger mountains
// within the same plane (e.g. far-back ridge drifts slower than mid-back).
const MOUNTAIN_LAYERS = [
  { variantIndex: 0, plane: "background" as const, depthMul: 1.0, bottom: -100 },
  { variantIndex: 1, plane: "midground"  as const, depthMul: 0.6, bottom: -80  },
  { variantIndex: 2, plane: "midground"  as const, depthMul: 1.0, bottom: -15  },
];

// Sprite stars: spread across the sky from the standalone star sheet.
const STARS = Array.from({ length: STAR_COUNT }, (_, i) => ({
  x: (i * STAR_X_STEP + (i % STAR_X_GROUP_MOD) * STAR_X_GROUP_OFFSET) % WIDTH,
  y: STAR_Y_TOP + (i % STAR_Y_ROW_MOD) * STAR_Y_ROW_GAP,
  scale: (STAR_SCALE_BASE + (i % STAR_SCALE_STEP_MOD) * STAR_SCALE_STEP) * STAR_SCALE_RATIO * 0.5,
  twinkleOffset: (i * STAR_TWINKLE_OFFSET_STEP) % STAR_TWINKLE_OFFSET_MOD,
  variant: i % STAR_VARIANT_COUNT,
}));

type GroundTileLayer = "base" | "occlusion";

function drawGroundTileLayer(layer: GroundTileLayer) {
  if (!ctx) return;

  const tileSize = GROUND_TILE_SPRITES.tileSize;
  const renderPlan = resolveGroundTileRenderPlan({
    elapsed: state.elapsed,
    bossActive: state.boss !== null,
    bossActiveElapsed: state.boss ? Math.max(0, state.elapsed - state.boss.spawnedAt) : null,
    bossKills: state.bossKills,
    bossPreludeElapsed: state.enemyDirector.bossPrelude?.elapsed ?? null,
    act: state.enemyDirector.act,
    elapsedInAct: state.enemyDirector.elapsedInAct,
  });
  const patternLength = renderPlan.pattern.length;
  const patternPixelWidth = patternLength * tileSize;
  const scroll = Math.floor(renderPlan.scrollPixels);
  const offset = ((scroll % patternPixelWidth) + patternPixelWidth) % patternPixelWidth;
  const startCol = Math.floor(offset / tileSize);
  const tileOffset = offset % tileSize;
  const rows = Math.ceil((HEIGHT - GROUND_Y) / tileSize) + 2;

  for (let row = 0; row < rows; row += 1) {
    let x = -tileOffset;
    let col = startCol;
    while (x < WIDTH) {
      const patternIndex = col % patternLength;
      const patternEntry = renderPlan.pattern[patternIndex];
      const setKey = patternEntry.set;
      const tileSet = GROUND_TILE_SPRITES.sets[setKey];
      const image = layer === "occlusion" ? tileSet.occlusionImage : tileSet.image;
      const regions = layer === "occlusion" ? tileSet.occlusionRegions ?? tileSet.regions : tileSet.regions;
      if (!image) {
        x += tileSize;
        col += 1;
        continue;
      }

      const variantIndex = col + row * Math.ceil(WIDTH / tileSize);
      const regionIndex = patternEntry.regionIndex ?? variantIndex % regions.length;
      const region = regions[regionIndex % regions.length];

      ctx.drawImage(
        image,
        region.sx,
        region.sy,
        region.sw,
        region.sh,
        x,
        GROUND_Y + GROUND_TILE_SPRITES.drawOffsetY + row * tileSize - region.surfaceY,
        region.sw,
        region.sh,
      );
      x += tileSize;
      col += 1;
    }
  }
}

export function drawGroundTileBase() {
  drawGroundTileLayer("base");
}

export function drawGroundTileOcclusion() {
  drawGroundTileLayer("occlusion");
}

export function drawGroundTiles() {
  drawGroundTileBase();
  drawGroundTileOcclusion();
}

export function drawBackground() {
  if (!ctx) return;

  const elapsed = state.elapsed;
  const { nightTop, nightMid, nightLow, upperOverlay, midOverlay } = getMoonSkyColors(state.moon);

  // Parallax scroll offsets for the remaining background mountain planes.
  const scrollBackground = elapsed * PARALLAX_SPEED.background;
  const scrollMidground  = elapsed * PARALLAX_SPEED.midground;

  ctx.fillStyle = nightTop;
  ctx.fillRect(0, 0, WIDTH, SKY_TOP_BAND_HEIGHT);
  ctx.fillStyle = nightMid;
  ctx.fillRect(0, SKY_TOP_BAND_HEIGHT, WIDTH, SKY_MID_BAND_HEIGHT);
  ctx.fillStyle = nightLow;
  ctx.fillRect(0, SKY_LOW_BAND_Y, WIDTH, GROUND_Y - SKY_LOW_BAND_Y);

  ctx.fillStyle = upperOverlay;
  ctx.fillRect(0, 0, WIDTH, SKY_UPPER_OVERLAY_HEIGHT);
  ctx.fillStyle = midOverlay;
  ctx.fillRect(0, SKY_MID_OVERLAY_Y, WIDTH, SKY_MID_OVERLAY_HEIGHT);

  drawMoon({ elapsed, moon: state.moon });

  // Draw sprite stars with scale-based twinkling; hidden during blood moon
  const spriteImg = STAR_SPRITES.image;
  const bloodLerp = state.moon.bloodLerp;
  if (spriteImg && bloodLerp < 1) {
    const moonVisibility = resolveStarVisibility(state.moon.coverProgress, STARS.length);
    const starVisibility = (1 - bloodLerp) * moonVisibility.alphaScale;
    for (let i = 0; i < STARS.length; i += 1) {
      if (!isSkyElementVisible(i, STARS.length, moonVisibility.visibleCount)) continue;

      const s = STARS[i];
      const region = STAR_SPRITES.variants[s.variant];
      // Scale twinkling: 0 → full size, giving a "blink in and out" effect
      const twinkle = Math.max(
        0,
        STAR_TWINKLE_BASE + STAR_TWINKLE_AMPLITUDE * Math.sin(elapsed * STAR_TWINKLE_SPEED + s.twinkleOffset),
      );
      const drawW = region.sw * s.scale * twinkle;
      const drawH = region.sh * s.scale * twinkle;
      if (drawW < MIN_VISIBLE_STAR_SIZE) continue;
      const cx = s.x + region.sw * s.scale / 2;
      const cy = s.y + region.sh * s.scale / 2;
      ctx.save();
      ctx.globalAlpha = starVisibility * STAR_ALPHA_SCALE;
      ctx.drawImage(spriteImg, region.sx, region.sy, region.sw, region.sh, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
      ctx.restore();
    }
  }

  drawClouds({ elapsed, moon: state.moon });

  // --- Background plane: far ridges, slowest drift ------------------------
  // --- Midground plane: mid + near ridges, tree/tower line ---------------
  // (Mountains span background + midground — each variant declares its plane.)
  const mountainImg = MOUNTAIN_SPRITES.image;
  if (mountainImg) {
    for (const layer of MOUNTAIN_LAYERS) {
      const region = MOUNTAIN_SPRITES.variants[layer.variantIndex];
      const tileW = region.sw;
      const tileH = region.sh;
      const y = GROUND_Y + layer.bottom - tileH;
      const planeScroll = layer.plane === "background" ? scrollBackground : scrollMidground;
      const offset = ((planeScroll * layer.depthMul) % tileW + tileW) % tileW;
      for (let x = -offset; x < WIDTH + tileW; x += tileW) {
        ctx.drawImage(mountainImg, region.sx, region.sy, region.sw, region.sh, x, y, tileW, tileH);
      }
    }
  }

  ctx.fillStyle = "#0b1424";
  ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);
}
