import { state } from "./state";
import { ctx } from "./context";
import {
  WIDTH,
  HEIGHT,
  GROUND_Y,
  SKY_SPRITES,
  MOUNTAIN_SPRITES,
  GROUND_TILE_SPRITES,
} from "./constants";
import { drawMoon, getMoonSkyColors } from "./moon";
import { drawClouds } from "./clouds";

// Three-plane parallax speeds (pixels per second of elapsed time). Each plane
// scrolls at a different rate so the scene has a true sense of depth.
const PARALLAX_SPEED = {
  background: 4,    // sky elements + far mountain ridge (slowest)
  midground: 12,    // mid/near mountains
};

// Mountain sub-parallax: each variant is placed on one of the three planes.
// `plane` picks the scroll speed; `depthMul` lets us further stagger mountains
// within the same plane (e.g. far-back ridge drifts slower than mid-back).
const MOUNTAIN_LAYERS = [
  { variantIndex: 0, plane: "background" as const, depthMul: 1.0, bottom: -100 },
  { variantIndex: 1, plane: "midground"  as const, depthMul: 0.6, bottom: -80  },
  { variantIndex: 2, plane: "midground"  as const, depthMul: 1.0, bottom: -15  },
];

// Sprite stars: only small/medium variants (no group), spread across sky
const STARS = Array.from({ length: 9 }, (_, i) => ({
  x: (i * 137 + (i % 5) * 43) % WIDTH,
  y: 18 + (i % 7) * 28,
  scale: (0.18 + (i % 4) * 0.09) * (2 / 3) * 0.5,
  twinkleOffset: (i * 11) % 24,
  variant: i % 2 as 0 | 1, // 0=small, 1=medium
}));

type GroundTileLayer = "base" | "front";

function drawGroundTileLayer(layer: GroundTileLayer) {
  if (!ctx) return;

  const tileSize = GROUND_TILE_SPRITES.tileSize;
  const patternLength = GROUND_TILE_SPRITES.grassPerStone + 1;
  const rows = Math.ceil((HEIGHT - GROUND_Y) / tileSize) + 2;

  for (let row = 0; row < rows; row += 1) {
    let x = 0;
    let col = 0;
    while (x < WIDTH) {
      const isStone = col % patternLength === GROUND_TILE_SPRITES.grassPerStone;
      const tileSet = isStone ? GROUND_TILE_SPRITES.stone : GROUND_TILE_SPRITES.grass;
      const image = layer === "front" ? tileSet.frontImage : tileSet.image;
      if (!image) break;

      const variantIndex = isStone ? Math.floor(col / patternLength) + row : col + row * Math.ceil(WIDTH / tileSize);
      const region = tileSet.regions[variantIndex % tileSet.regions.length];
      const fillWidth = region.fillRight - region.fillLeft + 1;
      const stepWidth = Math.max(1, fillWidth - GROUND_TILE_SPRITES.seamOverlap);

      ctx.drawImage(
        image,
        region.sx,
        region.sy,
        region.sw,
        region.sh,
        x - region.fillLeft,
        GROUND_Y + GROUND_TILE_SPRITES.drawOffsetY + row * tileSize - region.surfaceY,
        region.sw,
        region.sh,
      );
      x += stepWidth;
      col += 1;
    }
  }
}

export function drawGroundTileBase() {
  drawGroundTileLayer("base");
}

export function drawGroundTileFront() {
  drawGroundTileLayer("front");
}

export function drawGroundTiles() {
  drawGroundTileBase();
  drawGroundTileFront();
}

export function drawBackground() {
  if (!ctx) return;

  const elapsed = state.elapsed;
  const { nightTop, nightMid, nightLow, upperOverlay, midOverlay } = getMoonSkyColors(state.moon);

  // Parallax scroll offsets for the remaining background mountain planes.
  const scrollBackground = elapsed * PARALLAX_SPEED.background;
  const scrollMidground  = elapsed * PARALLAX_SPEED.midground;

  ctx.fillStyle = nightTop;
  ctx.fillRect(0, 0, WIDTH, 170);
  ctx.fillStyle = nightMid;
  ctx.fillRect(0, 170, WIDTH, 120);
  ctx.fillStyle = nightLow;
  ctx.fillRect(0, 290, WIDTH, GROUND_Y - 290);

  ctx.fillStyle = upperOverlay;
  ctx.fillRect(0, 0, WIDTH, 220);
  ctx.fillStyle = midOverlay;
  ctx.fillRect(0, 110, WIDTH, 180);

  drawMoon({ elapsed, moon: state.moon });

  // Draw sprite stars with scale-based twinkling; hidden during blood moon
  const spriteImg = SKY_SPRITES.image;
  const bloodLerp = state.moon.bloodLerp;
  if (spriteImg && bloodLerp < 1) {
    const starVisibility = 1 - bloodLerp;
    for (const s of STARS) {
      const region = s.variant === 0 ? SKY_SPRITES.starSmall : SKY_SPRITES.starMedium;
      // Scale twinkling: 0 → full size, giving a "blink in and out" effect
      const twinkle = Math.max(0, 0.5 + 0.5 * Math.sin(elapsed * 2.8 + s.twinkleOffset));
      const drawW = region.sw * s.scale * twinkle;
      const drawH = region.sh * s.scale * twinkle;
      if (drawW < 0.5) continue;
      const cx = s.x + region.sw * s.scale / 2;
      const cy = s.y + region.sh * s.scale / 2;
      ctx.save();
      ctx.globalAlpha = starVisibility * 0.82;
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
