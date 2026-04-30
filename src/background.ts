import { state } from "./state";
import { ctx } from "./context";
import { WIDTH, HEIGHT, GROUND_Y, SKY_SPRITES } from "./constants";
import { drawMoon, getMoonSkyColors } from "./moon";

const MOUNTAINS = Array.from({ length: 10 }, (_, i) => ({
  x: i * 140,
  w: 150 + (i % 3) * 34,
  h: 90 + (i % 4) * 22,
}));
const TREES = Array.from({ length: 34 }, (_, i) => ({
  x: i * 54 + (i % 3) * 11,
  h: 34 + (i % 6) * 12,
  crownW: 22 + (i % 4) * 5,
  layer: (i % 3) + 1,
}));

// Sprite clouds: alternate between cloud1 and cloud2 for variety
const CLOUDS = Array.from({ length: 5 }, (_, i) => ({
  x: i * 260 + (i % 3) * 40,
  y: 28 + (i % 5) * 22,
  scale: (0.28 + (i % 3) * 0.06) * (2 / 3),
  speed: 6 + (i % 4) * 3,
  variant: i % 2 as 0 | 1,
}));

// Sprite stars: only small/medium variants (no group), spread across sky
const STARS = Array.from({ length: 9 }, (_, i) => ({
  x: (i * 137 + (i % 5) * 43) % WIDTH,
  y: 18 + (i % 7) * 28,
  scale: (0.18 + (i % 4) * 0.09) * (2 / 3) * 0.5,
  twinkleOffset: (i * 11) % 24,
  variant: i % 2 as 0 | 1, // 0=small, 1=medium
}));
const LANTERNS = Array.from({ length: 8 }, (_, i) => ({
  x: i * 170 + 60,
  y: GROUND_Y - 130 - (i % 2) * 18,
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

  // Draw sprite clouds drifting slowly (fallback to invisible rect if image not loaded)
  if (spriteImg) {
    for (const c of CLOUDS) {
      const region = c.variant === 0 ? SKY_SPRITES.cloud1 : SKY_SPRITES.cloud2;
      const drawW = region.sw * c.scale;
      const drawH = region.sh * c.scale;
      const x1 = ((c.x - elapsed * c.speed) % (WIDTH + drawW) + (WIDTH + drawW)) % (WIDTH + drawW) - drawW;
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.drawImage(spriteImg, region.sx, region.sy, region.sw, region.sh, x1, c.y, drawW, drawH);
      ctx.restore();
    }
  }

  for (const m of MOUNTAINS) {
    const x = m.x - scrollFar;
    ctx.fillStyle = "#1d2f4f";
    ctx.fillRect(x, GROUND_Y - 220, m.w, m.h);
    ctx.fillStyle = "#243a5f";
    ctx.fillRect(x + 14, GROUND_Y - 220 + 12, m.w - 28, m.h - 12);
    ctx.fillStyle = "#2c466f";
    ctx.fillRect(x + m.w / 2 - 16, GROUND_Y - 220, 32, 16);
  }

  for (const m of MOUNTAINS) {
    const x = m.x + WIDTH - scrollFar;
    ctx.fillStyle = "#1d2f4f";
    ctx.fillRect(x, GROUND_Y - 220, m.w, m.h);
    ctx.fillStyle = "#243a5f";
    ctx.fillRect(x + 14, GROUND_Y - 220 + 12, m.w - 28, m.h - 12);
    ctx.fillStyle = "#2c466f";
    ctx.fillRect(x + m.w / 2 - 16, GROUND_Y - 220, 32, 16);
  }

  for (const t of TREES) {
    const parallax = 0.45 + t.layer * 0.2;
    const xBase = t.x - scrollMid * parallax;
    for (const wrap of [xBase, xBase + WIDTH + 140]) {
      const y = GROUND_Y - 46 - t.h;
      const trunkW = 6 + t.layer;
      const crownW = t.crownW;
      ctx.fillStyle = "#13253f";
      ctx.fillRect(wrap + crownW * 0.42, y + 18, trunkW, t.h + 8);
      ctx.fillStyle = t.layer === 1 ? "#1a3659" : t.layer === 2 ? "#21426c" : "#2a4f80";
      ctx.fillRect(wrap, y, crownW, 24 + t.layer * 4);
      ctx.fillStyle = "#2e5d8f";
      ctx.fillRect(wrap + 4, y + 3, crownW - 8, 12 + t.layer * 2);
      ctx.fillStyle = "#3b6c9f";
      ctx.fillRect(wrap + 8, y + 7, 6, 3);
    }
  }

  ctx.fillStyle = "#0b1424";
  ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);

  for (let i = -1; i < Math.ceil(WIDTH / 32) + 1; i += 1) {
    const x = i * 32 - (scrollNear % 32);
    ctx.fillStyle = i % 2 === 0 ? "#192f4d" : "#1f3a5f";
    ctx.fillRect(x, GROUND_Y - 14, 24, 14);
    ctx.fillStyle = "#2a4b77";
    ctx.fillRect(x + 4, GROUND_Y - 10, 8, 6);
  }

  for (const lantern of LANTERNS) {
    const x = lantern.x - scrollNear * 0.7;
    const y = lantern.y;
    ctx.fillStyle = "#3b2e25";
    ctx.fillRect(x + 7, y + 20, 2, 34);
    ctx.fillStyle = "#6c4830";
    ctx.fillRect(x, y + 8, 16, 14);
    ctx.fillStyle = "#ffcf75";
    ctx.fillRect(x + 3, y + 11, 10, 8);
    ctx.fillStyle = "#ffe8a7";
    ctx.fillRect(x + 6, y + 13, 4, 4);
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
