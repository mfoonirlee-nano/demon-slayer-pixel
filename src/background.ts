import { state } from "./state";
import { ctx } from "./context";
import {
  WIDTH,
  HEIGHT,
  GROUND_Y,
  SKY_SPRITES,
  TREE_SPRITES,
  CLOUDS_SPRITES,
  STONE_TOWER_SPRITES,
  FOREGROUND_SPRITES,
  GROUND_SPRITES,
  MOUNTAIN_SPRITES,
  RUNTIME_CONFIG,
} from "./constants";
import { drawMoon, getMoonSkyColors } from "./moon";

// Mountain parallax layers: farthest = slowest + highest on screen,
// closest = fastest + anchored near the ground.
const MOUNTAIN_LAYERS = [
  { variantIndex: 0, parallax: 0.25, bottom: -140 }, // offsets are from GROUND_Y
  { variantIndex: 1, parallax: 0.5,  bottom: -80 },
  { variantIndex: 2, parallax: 1.0,  bottom: -15 },
];

// Tree sprite pools: left/middle of sheet = living greens + red maples;
// right side = dead / withered trees. Stone towers follow the same
// left-to-right freshness gradient.
const TREE_LUSH_POOL = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const TREE_WITHERED_POOL = [9, 10, 11];
const TOWER_INTACT_POOL = [0, 1, 2, 3, 4, 5, 6];
const TOWER_BROKEN_POOL = [7, 8, 9, 10];

// Stable, non-uniform hash → produces fixed per-index "randomness".
function seeded(i: number, salt: number): number {
  let x = Math.imul(i + salt, 2654435761);
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

// Scenery wraps over a world span wider than the viewport so the forest
// doesn't feel like a repeating fence.
const SCENERY_SPAN = WIDTH * 2;

const TREES = Array.from({ length: 12 }, (_, i) => ({
  x: seeded(i, 101) * SCENERY_SPAN,
  lushVariant: TREE_LUSH_POOL[Math.floor(seeded(i, 211) * TREE_LUSH_POOL.length)],
  witheredVariant: TREE_WITHERED_POOL[Math.floor(seeded(i, 317) * TREE_WITHERED_POOL.length)],
  scale: 0.5 + seeded(i, 409) * 0.22,
  // Proximity threshold at which this tree swaps to its withered form.
  transitionPoint: 0.15 + seeded(i, 503) * 0.75,
}));

const TOWERS = Array.from({ length: 6 }, (_, i) => ({
  // Offset phase so towers don't sit on top of trees at the same x.
  x: (seeded(i, 131) * SCENERY_SPAN + SCENERY_SPAN * 0.37) % SCENERY_SPAN,
  intactVariant: TOWER_INTACT_POOL[Math.floor(seeded(i, 229) * TOWER_INTACT_POOL.length)],
  brokenVariant: TOWER_BROKEN_POOL[Math.floor(seeded(i, 331) * TOWER_BROKEN_POOL.length)],
  scale: 0.44 + seeded(i, 421) * 0.14,
  transitionPoint: 0.2 + seeded(i, 557) * 0.7,
}));

// Sprite clouds: cycle 3 dedicated cloud variants for variety
const CLOUDS = Array.from({ length: 5 }, (_, i) => ({
  x: i * 260 + (i % 3) * 40,
  y: 28 + (i % 5) * 22,
  scale: 0.55 + (i % 3) * 0.12,
  speed: 6 + (i % 4) * 3,
  variant: i % 3 as 0 | 1 | 2,
}));

// Sprite stars: only small/medium variants (no group), spread across sky
const STARS = Array.from({ length: 9 }, (_, i) => ({
  x: (i * 137 + (i % 5) * 43) % WIDTH,
  y: 18 + (i % 7) * 28,
  scale: (0.18 + (i % 4) * 0.09) * (2 / 3) * 0.5,
  twinkleOffset: (i * 11) % 24,
  variant: i % 2 as 0 | 1, // 0=small, 1=medium
}));
// Flat stone tile patches — sit on the ground plane, drawn before towers.
const FOREGROUND_PATCHES = Array.from({ length: 8 }, (_, i) => ({
  x: i * 135 + (i % 3) * 41,
  variant: i % FOREGROUND_SPRITES.patches.length,
  scale: 0.42 + (i % 3) * 0.07,
}));

// Standalone clutter — rocks, grass, bushes. Drawn in front of lanterns.
const FOREGROUND_DECOR = Array.from({ length: 16 }, (_, i) => ({
  x: i * 68 + (i % 5) * 23,
  variant: i % FOREGROUND_SPRITES.decor.length,
  scale: 0.4 + (i % 4) * 0.06,
}));

export function drawBackground() {
  if (!ctx) return;

  const elapsed = state.elapsed;
  const { nightTop, nightMid, nightLow, upperOverlay, midOverlay } = getMoonSkyColors(state.moon);
  const scrollFar = (elapsed * 8) % WIDTH;
  const scrollMid = (elapsed * 14) % WIDTH;
  const scrollNear = (elapsed * 22) % WIDTH;

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

  // Draw sprite clouds drifting slowly across the sky
  const cloudImg = CLOUDS_SPRITES.image;
  if (cloudImg) {
    for (const c of CLOUDS) {
      const region = CLOUDS_SPRITES.variants[c.variant];
      const drawW = region.sw * c.scale;
      const drawH = region.sh * c.scale;
      const x1 = ((c.x - elapsed * c.speed) % (WIDTH + drawW) + (WIDTH + drawW)) % (WIDTH + drawW) - drawW;
      ctx.save();
      ctx.globalAlpha = 0.78;
      ctx.drawImage(cloudImg, region.sx, region.sy, region.sw, region.sh, x1, c.y, drawW, drawH);
      ctx.restore();
    }
  }

  const mountainImg = MOUNTAIN_SPRITES.image;
  if (mountainImg) {
    for (const layer of MOUNTAIN_LAYERS) {
      const region = MOUNTAIN_SPRITES.variants[layer.variantIndex];
      const tileW = region.sw;
      const tileH = region.sh;
      const y = GROUND_Y + layer.bottom - tileH;
      const offset = ((scrollFar * layer.parallax) % tileW + tileW) % tileW;
      for (let x = -offset; x < WIDTH + tileW; x += tileW) {
        ctx.drawImage(mountainImg, region.sx, region.sy, region.sw, region.sh, x, y, tileW, tileH);
      }
    }
  }

  // Boss proximity drives the lush → withered transition. Zero at game start,
  // ramps to 1 as the boss timer ticks down; pinned at 1 once boss is active.
  const maxTimer = RUNTIME_CONFIG.initialBossSpawnTimer;
  const bossProximity = state.boss
    ? 1
    : Math.max(0, Math.min(1, 1 - state.bossSpawnTimer / maxTimer));

  const sceneryScroll = scrollMid * 0.85;
  const treeImg = TREE_SPRITES.image;
  if (treeImg) {
    for (const t of TREES) {
      const variantIndex = bossProximity >= t.transitionPoint ? t.witheredVariant : t.lushVariant;
      const region = TREE_SPRITES.variants[variantIndex];
      const drawW = region.sw * t.scale;
      const drawH = region.sh * t.scale;
      const y = GROUND_Y - 6 - drawH;
      const wrapped = ((t.x - sceneryScroll) % SCENERY_SPAN + SCENERY_SPAN) % SCENERY_SPAN;
      for (const dx of [wrapped, wrapped - SCENERY_SPAN]) {
        if (dx + drawW < 0 || dx > WIDTH) continue;
        ctx.drawImage(treeImg, region.sx, region.sy, region.sw, region.sh, dx, y, drawW, drawH);
      }
    }
  }

  // Ground plane: tile one of 4 variants, stepping lush → withering → hostile
  // as the boss approaches. Below the tile strip is filled with a dark base
  // so the bottom-of-screen stays opaque if the sprite is shorter than the gap.
  ctx.fillStyle = "#0b1424";
  ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);

  const groundImg = GROUND_SPRITES.image;
  if (groundImg) {
    const groundVariantIndex = bossProximity < 0.33 ? 0 : bossProximity < 0.66 ? 2 : 3;
    const gRegion = GROUND_SPRITES.variants[groundVariantIndex];
    // Match tile width to viewport scale — keep aspect ratio of source region.
    const tileW = gRegion.sw;
    const tileH = gRegion.sh;
    // Anchor top of tile strip slightly above GROUND_Y so grass/ice overlaps
    // the play line, giving a natural "surface" rather than a hard seam.
    const topY = GROUND_Y - 10;
    const offset = ((scrollNear % tileW) + tileW) % tileW;
    for (let x = -offset; x < WIDTH + tileW; x += tileW) {
      ctx.drawImage(groundImg, gRegion.sx, gRegion.sy, gRegion.sw, gRegion.sh, x, topY, tileW, tileH);
    }
  }

  const foregroundImg = FOREGROUND_SPRITES.image;
  if (foregroundImg) {
    for (const p of FOREGROUND_PATCHES) {
      const region = FOREGROUND_SPRITES.patches[p.variant];
      const drawW = region.sw * p.scale;
      const drawH = region.sh * p.scale;
      const span = WIDTH + drawW + 120;
      const raw = (p.x - scrollNear * 0.9) % span;
      const x = (raw + span) % span - drawW;
      const y = GROUND_Y - drawH + 6;
      ctx.drawImage(foregroundImg, region.sx, region.sy, region.sw, region.sh, x, y, drawW, drawH);
    }
  }

  const towerImg = STONE_TOWER_SPRITES.image;
  if (towerImg) {
    for (const tower of TOWERS) {
      const variantIndex = bossProximity >= tower.transitionPoint ? tower.brokenVariant : tower.intactVariant;
      const region = STONE_TOWER_SPRITES.variants[variantIndex];
      const drawW = region.sw * tower.scale;
      const drawH = region.sh * tower.scale;
      const y = GROUND_Y - 4 - drawH;
      const wrapped = ((tower.x - sceneryScroll) % SCENERY_SPAN + SCENERY_SPAN) % SCENERY_SPAN;
      for (const dx of [wrapped, wrapped - SCENERY_SPAN]) {
        if (dx + drawW < 0 || dx > WIDTH) continue;
        ctx.drawImage(towerImg, region.sx, region.sy, region.sw, region.sh, dx, y, drawW, drawH);
      }
    }
  }

  if (foregroundImg) {
    for (const d of FOREGROUND_DECOR) {
      const region = FOREGROUND_SPRITES.decor[d.variant];
      const drawW = region.sw * d.scale;
      const drawH = region.sh * d.scale;
      const span = WIDTH + drawW + 120;
      const raw = (d.x - scrollNear) % span;
      const x = (raw + span) % span - drawW;
      const y = GROUND_Y - 2 - drawH;
      ctx.drawImage(foregroundImg, region.sx, region.sy, region.sw, region.sh, x, y, drawW, drawH);
    }
  }

  ctx.fillStyle = "rgba(180, 210, 255, 0.08)";
  ctx.fillRect(0, GROUND_Y - 50, WIDTH, 20);
  ctx.fillStyle = "rgba(180, 210, 255, 0.12)";
  ctx.fillRect(0, GROUND_Y - 30, WIDTH, 14);
  for (let i = 0; i < 3; i += 1) {
    const fx = ((elapsed * (12 + i * 5)) % (WIDTH + 260)) - 130;
    const fy = 120 + i * 48;
    ctx.fillStyle = "rgba(140,190,255,0.08)";
    ctx.fillRect(fx, fy, 220 + i * 50, 10);
  }
}
