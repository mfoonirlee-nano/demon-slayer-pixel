import { state } from "./state";
import { ctx } from "./context";
import { WIDTH, HEIGHT, GROUND_Y } from "./constants";
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
const CLOUDS = Array.from({ length: 12 }, (_, i) => ({
  x: i * 150 + (i % 3) * 26,
  y: 34 + (i % 5) * 24,
  w: 44 + (i % 4) * 16,
  h: 14 + (i % 3) * 5,
  layer: 0.55 + (i % 4) * 0.18,
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
  const cloudDrift = elapsed * 10;

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

  for (const c of CLOUDS) {
    const x1 = c.x - cloudDrift * c.layer;
    for (const wrap of [x1, x1 + WIDTH + 220]) {
      ctx.fillStyle = `rgba(172,196,230,${0.12 + c.layer * 0.03})`;
      ctx.fillRect(wrap, c.y, c.w, c.h);
      ctx.fillRect(wrap + c.w * 0.2, c.y - 6, c.w * 0.58, c.h * 0.7);
      ctx.fillRect(wrap + c.w * 0.52, c.y + 2, c.w * 0.42, c.h * 0.65);
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
